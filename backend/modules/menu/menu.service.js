import prisma from "../../config/prisma.js";
import logger from "../../config/logger.js";
import { canAccessVendor } from "../../utils/helpers.js";
import { ServiceError } from "../../utils/serviceError.js";
import { validatePayload } from "../../utils/serviceValidation.js";
import * as menuValidation from "./menu.validation.js";
import {
  uploadImage,
  deleteImage,
  getPublicUrl,
} from "../../config/supabaseStorage.js";

const MAX_MENU_ITEMS_PER_REQUEST = (() => {
  const parsed = Number.parseInt(
    process.env.MAX_MENU_ITEMS_PER_REQUEST || "50",
    10,
  );
  return Number.isNaN(parsed) || parsed < 1 ? 50 : parsed;
})();
const MAX_MENU_IMAGE_BYTES = 300 * 1024;

const assertVendorAccess = (user, vendorId) => {
  if (!canAccessVendor(user, vendorId)) {
    throw new ServiceError("Unauthorized", { status: 403 });
  }
};

const assertVendorExists = async (vendorId) => {
  const vendor = await prisma.user.findUnique({
    where: { id: vendorId },
    select: { id: true },
  });

  if (!vendor) {
    throw new ServiceError("Vendor not found", { status: 404 });
  }
};

const mapMenuItem = (item) => {
  return {
    id: item.id,
    name: item.name,
    price: Number(item.price),
    description: item.description,
    category: item.category,
    imageUrl: getPublicUrl(item.image) ?? item.image ?? null,
    isAvailable: item.isAvailable,
    createdAt: item.createdAt,
  };
};

const parseMenuItemsInput = (menuItemsRaw) => {
  let itemsData;

  try {
    itemsData = JSON.parse(menuItemsRaw || "[]");
  } catch (error) {
    throw new ServiceError("Invalid JSON in menuItems", { status: 400 });
  }

  if (!Array.isArray(itemsData) || itemsData.length === 0) {
    throw new ServiceError("menuItems must be a non-empty array", {
      status: 400,
    });
  }

  if (itemsData.length > MAX_MENU_ITEMS_PER_REQUEST) {
    throw new ServiceError("Too many menu items", {
      status: 400,
      details: `Maximum ${MAX_MENU_ITEMS_PER_REQUEST} items are allowed per request`,
    });
  }

  return itemsData;
};

const mapImagesToItemIndexes = ({ files, imageIndexesRaw, itemsLength }) => {
  const uploadedImages = Array.isArray(files) ? files : [];
  const imageIndexes = Array.isArray(imageIndexesRaw)
    ? imageIndexesRaw
    : imageIndexesRaw !== undefined
      ? [imageIndexesRaw]
      : [];

  if (uploadedImages.length !== imageIndexes.length) {
    throw new ServiceError("Invalid image payload", {
      status: 400,
      details: "Each uploaded image must have a matching imageIndexes value",
    });
  }

  if (uploadedImages.length > MAX_MENU_ITEMS_PER_REQUEST) {
    throw new ServiceError("Too many images", {
      status: 400,
      details: `Maximum ${MAX_MENU_ITEMS_PER_REQUEST} images are allowed per request`,
    });
  }

  const imageByItemIndex = new Map();

  for (let i = 0; i < uploadedImages.length; i++) {
    const index = Number.parseInt(String(imageIndexes[i]), 10);

    if (Number.isNaN(index) || index < 0 || index >= itemsLength) {
      throw new ServiceError("Invalid image index", {
        status: 400,
        details: `imageIndexes[${i}] is out of range`,
      });
    }

    if (imageByItemIndex.has(index)) {
      throw new ServiceError("Invalid image payload", {
        status: 400,
        details: `Duplicate image index for item ${index + 1}`,
      });
    }

    imageByItemIndex.set(index, uploadedImages[i]);
  }

  return imageByItemIndex;
};

const createMenuItems = async ({ vendorId, user, body, files }) => {
  const { vendorId: parsedVendorId } = validatePayload(
    menuValidation.vendorParamsSchema,
    { vendorId },
    { part: "params" },
  );
  const validatedBody = validatePayload(
    menuValidation.createMenuItemsBodySchema,
    body || {},
    { part: "body", prefs: { allowUnknown: true } },
  );

  assertVendorAccess(user, parsedVendorId);
  await assertVendorExists(parsedVendorId);

  const itemsData = parseMenuItemsInput(validatedBody.menuItems);
  const imageByItemIndex = mapImagesToItemIndexes({
    files,
    imageIndexesRaw: validatedBody.imageIndexes,
    itemsLength: itemsData.length,
  });

  const validatedItems = [];
  const validationErrors = [];
  const uploadedImages = [];

  try {
    for (let index = 0; index < itemsData.length; index++) {
      const item = itemsData[index] || {};
      const itemErrors = [];

      if (!item.name || item.name.trim() === "") {
        itemErrors.push("Name is required");
      } else if (item.name.length > 100) {
        itemErrors.push("Name too long (max 100 characters)");
      }

      if (
        item.price === undefined ||
        item.price === null ||
        item.price === ""
      ) {
        itemErrors.push("Price is required");
      } else if (isNaN(item.price) || parseFloat(item.price) <= 0) {
        itemErrors.push("Price must be greater than 0");
      } else if (parseFloat(item.price) > 99999.99) {
        itemErrors.push("Price too high (max 99999.99)");
      }

      if (!item.category || item.category.trim() === "") {
        itemErrors.push("Category is required");
      } else if (item.category.length > 50) {
        itemErrors.push("Category too long (max 50 characters)");
      }

      if (item.description && item.description.length > 1000) {
        itemErrors.push("Description too long (max 1000 characters)");
      }

      if (itemErrors.length > 0) {
        validationErrors.push(
          ...itemErrors.map((err) => `Item ${index + 1}: ${err}`),
        );
        continue;
      }

      const rawFile = imageByItemIndex.get(index) || null;
      let image = null;

      if (rawFile) {
        const uploaded = await uploadImage(
          rawFile.buffer,
          rawFile.originalname,
          rawFile.mimetype,
          {
            folderPath: `vendors/${parsedVendorId}/menu`,
            maxBytes: MAX_MENU_IMAGE_BYTES,
          },
        );
        uploadedImages.push(uploaded);
        image = uploaded.publicUrl;
      }

      validatedItems.push({
        vendorId: parsedVendorId,
        name: item.name.trim(),
        price: parseFloat(item.price),
        category: item.category.trim(),
        description: item.description ? item.description.trim() : "",
        image,
        isAvailable: true,
      });
    }

    if (validationErrors.length > 0) {
      throw new ServiceError("Validation failed", {
        status: 400,
        details: validationErrors,
      });
    }

    const createdItems = await prisma.$transaction(
      validatedItems.map((data) => prisma.menuItem.create({ data })),
    );

    const itemsResponse = createdItems.map((item) => ({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      description: item.description,
      category: item.category,
      imageUrl: getPublicUrl(item.image) ?? item.image ?? null,
      isAvailable: item.isAvailable,
    }));

    return {
      message: "Menu items created successfully",
      createdItems: itemsResponse,
      count: itemsResponse.length,
    };
  } catch (error) {
    await Promise.all(
      uploadedImages.map((asset) => deleteImage(asset.publicUrl)),
    ).catch((cleanupError) => {
      logger.warn("Failed to clean up uploaded menu images after failure", {
        error: cleanupError.message,
      });
    });

    throw error;
  }
};

const getMenuItems = async ({ vendorId, user }) => {
  const { vendorId: parsedVendorId } = validatePayload(
    menuValidation.vendorParamsSchema,
    { vendorId },
    { part: "params" },
  );

  assertVendorAccess(user, parsedVendorId);
  await assertVendorExists(parsedVendorId);

  const items = await prisma.menuItem.findMany({
    where: { vendorId: parsedVendorId },
    orderBy: { createdAt: "desc" },
  });

  const itemsData = items.map(mapMenuItem);

  return {
    menuItems: itemsData,
    count: itemsData.length,
  };
};

const getMenuItemsByCategory = async ({ vendorId, user }) => {
  const { vendorId: parsedVendorId } = validatePayload(
    menuValidation.vendorParamsSchema,
    { vendorId },
    { part: "params" },
  );

  assertVendorAccess(user, parsedVendorId);

  const items = await prisma.menuItem.findMany({
    where: { vendorId: parsedVendorId },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const categories = {};

  for (const item of items) {
    const category = item.category;

    if (!categories[category]) {
      categories[category] = [];
    }

    categories[category].push({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      description: item.description || "",
      category: item.category,
      imageUrl: getPublicUrl(item.image) ?? item.image ?? null,
      isAvailable: item.isAvailable,
    });
  }

  const formattedCategories = Object.keys(categories).map((name) => ({
    name,
    items: categories[name],
  }));

  return {
    categories: formattedCategories,
    totalItems: items.length,
  };
};

const getMenuItem = async ({ vendorId, itemId, user }) => {
  const { vendorId: parsedVendorId, itemId: parsedItemId } = validatePayload(
    menuValidation.vendorItemParamsSchema,
    { vendorId, itemId },
    { part: "params" },
  );

  assertVendorAccess(user, parsedVendorId);

  const item = await prisma.menuItem.findFirst({
    where: { id: parsedItemId, vendorId: parsedVendorId },
  });

  if (!item) {
    throw new ServiceError("Menu item not found", { status: 404 });
  }

  return {
    id: item.id,
    name: item.name,
    price: Number(item.price),
    description: item.description,
    category: item.category,
    imageUrl: getPublicUrl(item.image) ?? item.image ?? null,
    isAvailable: item.isAvailable,
  };
};

const updateMenuItem = async ({ vendorId, itemId, user, body, file }) => {
  const { vendorId: parsedVendorId, itemId: parsedItemId } = validatePayload(
    menuValidation.vendorItemParamsSchema,
    { vendorId, itemId },
    { part: "params" },
  );
  const validatedBody = validatePayload(
    menuValidation.updateMenuItemBodySchema,
    body || {},
    { part: "body" },
  );

  assertVendorAccess(user, parsedVendorId);

  const item = await prisma.menuItem.findFirst({
    where: { id: parsedItemId, vendorId: parsedVendorId },
    select: { id: true, image: true },
  });

  if (!item) {
    throw new ServiceError("Menu item not found", { status: 404 });
  }

  const updates = {};

  if (validatedBody?.name) updates.name = validatedBody.name.trim();
  if (validatedBody?.price) updates.price = parseFloat(validatedBody.price);
  if (validatedBody?.category) updates.category = validatedBody.category.trim();

  if (validatedBody?.description !== undefined) {
    updates.description = validatedBody.description
      ? validatedBody.description.trim()
      : "";
  }

  if (validatedBody?.isAvailable !== undefined) {
    updates.isAvailable =
      validatedBody.isAvailable === true ||
      validatedBody.isAvailable === "true" ||
      validatedBody.isAvailable === 1;
  }

  const shouldRemoveImage = validatedBody.removeImage === true && !file;
  if (shouldRemoveImage) {
    updates.image = null;
  }

  let uploadedImage = null;

  try {
    if (file) {
      uploadedImage = await uploadImage(
        file.buffer,
        file.originalname,
        file.mimetype,
        {
          folderPath: `vendors/${parsedVendorId}/menu`,
          maxBytes: MAX_MENU_IMAGE_BYTES,
        },
      );
      updates.image = uploadedImage.publicUrl;
    }

    const updated = await prisma.menuItem.update({
      where: { id: parsedItemId },
      data: updates,
    });

    if ((uploadedImage || shouldRemoveImage) && item.image) {
      await deleteImage(item.image).catch((err) => {
        logger.warn("Failed to delete old image from Supabase", {
          image: item.image,
          error: err.message,
        });
      });
    }

    return {
      message: "Menu item updated successfully",
      item: {
        id: updated.id,
        name: updated.name,
        price: Number(updated.price),
        category: updated.category,
        description: updated.description,
        imageUrl: getPublicUrl(updated.image) ?? updated.image ?? null,
        isAvailable: updated.isAvailable,
      },
    };
  } catch (error) {
    if (uploadedImage) {
      await deleteImage(uploadedImage.publicUrl).catch((cleanupError) => {
        logger.warn("Failed to clean up new menu image after update error", {
          error: cleanupError.message,
        });
      });
    }

    throw error;
  }
};

const deleteMenuItem = async ({ vendorId, itemId, user }) => {
  const { vendorId: parsedVendorId, itemId: parsedItemId } = validatePayload(
    menuValidation.vendorItemParamsSchema,
    { vendorId, itemId },
    { part: "params" },
  );

  assertVendorAccess(user, parsedVendorId);

  const item = await prisma.menuItem.findFirst({
    where: { id: parsedItemId, vendorId: parsedVendorId },
    select: { id: true, image: true },
  });

  if (!item) {
    throw new ServiceError("Menu item not found", { status: 404 });
  }

  await prisma.menuItem.delete({ where: { id: parsedItemId } });

  // Clean up image from Supabase after successful DB delete
  if (item.image) {
    await deleteImage(item.image).catch((err) => {
      logger.warn("Failed to delete image from Supabase", {
        image: item.image,
        error: err.message,
      });
    });
  }

  return {
    message: "Menu item deleted successfully",
  };
};

const getPublicMenu = async ({ vendorId }) => {
  const { vendorId: parsedVendorId } = validatePayload(
    menuValidation.vendorParamsSchema,
    { vendorId },
    { part: "params" },
  );

  const vendor = await prisma.user.findUnique({
    where: { id: parsedVendorId },
    select: {
      id: true,
      restaurantName: true,
      ownerName: true,
      email: true,
      phone: true,
      location: true,
      openingTime: true,
      closingTime: true,
      description: true,
      logo: true,
    },
  });

  if (!vendor) {
    throw new ServiceError("Vendor not found", { status: 404 });
  }

  const items = await prisma.menuItem.findMany({
    where: {
      vendorId: parsedVendorId,
      isAvailable: true,
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const categoriesMap = {};

  for (const item of items) {
    const category = item.category || "Other";

    if (!categoriesMap[category]) {
      categoriesMap[category] = {
        name: category,
        items: [],
      };
    }

    categoriesMap[category].items.push({
      id: item.id,
      name: item.name,
      description: item.description,
      price: Number(item.price),
      category: item.category,
      image_url: getPublicUrl(item.image) ?? item.image ?? null,
      is_available: item.isAvailable,
    });
  }

  return {
    vendor_info: {
      id: vendor.id,
      restaurant_name: vendor.restaurantName,
      owner_name: vendor.ownerName,
      email: vendor.email,
      phone: vendor.phone,
      location: vendor.location,
      opening_time: vendor.openingTime,
      closing_time: vendor.closingTime,
      description: vendor.description,
      logo: getPublicUrl(vendor.logo) ?? vendor.logo ?? null,
    },
    categories: Object.values(categoriesMap),
  };
};

const toggleAvailability = async ({ vendorId, itemId, user }) => {
  const { vendorId: parsedVendorId, itemId: parsedItemId } = validatePayload(
    menuValidation.vendorItemParamsSchema,
    { vendorId, itemId },
    { part: "params" },
  );

  assertVendorAccess(user, parsedVendorId);

  const item = await prisma.menuItem.findFirst({
    where: { id: parsedItemId, vendorId: parsedVendorId },
    select: { id: true, isAvailable: true },
  });

  if (!item) {
    throw new ServiceError("Menu item not found", { status: 404 });
  }

  const nextAvailability = !item.isAvailable;

  await prisma.menuItem.update({
    where: { id: parsedItemId },
    data: { isAvailable: nextAvailability },
  });

  return {
    message: `Menu item ${nextAvailability ? "enabled" : "disabled"}`,
    isAvailable: nextAvailability,
  };
};

export default {
  createMenuItems,
  getMenuItems,
  getMenuItemsByCategory,
  getMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getPublicMenu,
  toggleAvailability,
};
