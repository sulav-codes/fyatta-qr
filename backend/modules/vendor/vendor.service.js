import prisma from "../../config/prisma.js";
import logger from "../../config/logger.js";
import { canAccessVendor } from "../../utils/helpers.js";
import { ServiceError } from "../../utils/serviceError.js";
import { validatePayload } from "../../utils/serviceValidation.js";
import * as vendorValidation from "./vendor.validation.js";
import {
  uploadImage,
  deleteImage,
  getPublicUrl,
} from "../../config/supabaseStorage.js";

const parseLimit = (value, fallback = 10, max = 100) => {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, max);
};
const MAX_LOGO_IMAGE_BYTES = 80 * 1024;

const assertVendorAccess = (user, vendorId, message = "Unauthorized") => {
  if (!canAccessVendor(user, vendorId)) {
    throw new ServiceError(message, { status: 403 });
  }
};

const getProfile = async ({ vendorId, user }) => {
  const { vendorId: parsedVendorId } = validatePayload(
    vendorValidation.vendorParamsSchema,
    { vendorId },
    { part: "params" },
  );

  assertVendorAccess(
    user,
    parsedVendorId,
    "You do not have permission to access this data",
  );

  const vendor = await prisma.user.findUnique({
    where: { id: parsedVendorId },
  });

  if (!vendor) {
    throw new ServiceError("Vendor not found", { status: 404 });
  }

  return {
    id: vendor.id,
    username: vendor.username,
    email: vendor.email,
    restaurantName: vendor.restaurantName,
    ownerName: vendor.ownerName,
    phone: vendor.phone,
    location: vendor.location,
    description: vendor.description,
    openingTime: vendor.openingTime,
    closingTime: vendor.closingTime,
    logo: getPublicUrl(vendor.logo) ?? vendor.logo ?? null,
  };
};

const updateProfile = async ({ vendorId, user, body, file }) => {
  const { vendorId: parsedVendorId } = validatePayload(
    vendorValidation.vendorParamsSchema,
    { vendorId },
    { part: "params" },
  );
  const validatedBody = validatePayload(
    vendorValidation.updateProfileBodySchema,
    body || {},
    { part: "body", prefs: { allowUnknown: false } },
  );

  assertVendorAccess(
    user,
    parsedVendorId,
    "You do not have permission to update this data",
  );

  const vendor = await prisma.user.findUnique({
    where: { id: parsedVendorId },
    select: { id: true, logo: true },
  });

  if (!vendor) {
    throw new ServiceError("Vendor not found", { status: 404 });
  }

  const restaurantNameInput =
    validatedBody?.restaurantName ?? validatedBody?.restaurant_name;
  const ownerNameInput = validatedBody?.ownerName ?? validatedBody?.owner_name;
  const openingTimeInput =
    validatedBody?.openingTime ?? validatedBody?.opening_time;
  const closingTimeInput =
    validatedBody?.closingTime ?? validatedBody?.closing_time;

  const updates = {};

  if (restaurantNameInput) {
    updates.restaurantName = restaurantNameInput.trim();
  }

  if (ownerNameInput !== undefined) {
    updates.ownerName = ownerNameInput ? ownerNameInput.trim() : null;
  }

  if (validatedBody?.phone !== undefined) {
    updates.phone = validatedBody.phone ? validatedBody.phone.trim() : null;
  }

  if (validatedBody?.location) {
    updates.location = validatedBody.location.trim();
  }

  if (validatedBody?.description !== undefined) {
    updates.description = validatedBody.description
      ? validatedBody.description.trim()
      : null;
  }

  if (openingTimeInput !== undefined) {
    updates.openingTime = openingTimeInput || null;
  }

  if (closingTimeInput !== undefined) {
    updates.closingTime = closingTimeInput || null;
  }

  if (validatedBody?.email) {
    const existingUser = await prisma.user.findFirst({
      where: {
        email: validatedBody.email,
        NOT: {
          id: parsedVendorId,
        },
      },
      select: { id: true },
    });

    if (existingUser) {
      throw new ServiceError(
        "This email is already in use by another account",
        {
          status: 400,
        },
      );
    }

    updates.email = validatedBody.email.trim();
  }

  const shouldRemoveLogo = validatedBody.removeLogo === true && !file;
  if (shouldRemoveLogo) {
    updates.logo = null;
  }

  if (Object.keys(updates).length === 0) {
    throw new ServiceError("No valid fields were provided for update", {
      status: 400,
    });
  }

  let uploadedLogo = null;

  try {
    if (file) {
      uploadedLogo = await uploadImage(
        file.buffer,
        file.originalname,
        file.mimetype,
        {
          folderPath: `vendors/${parsedVendorId}/logo`,
          maxBytes: MAX_LOGO_IMAGE_BYTES,
        },
      );
      updates.logo = uploadedLogo.publicUrl;
    }

    const updatedUser = await prisma.user.update({
      where: { id: parsedVendorId },
      data: updates,
    });

    if ((uploadedLogo || shouldRemoveLogo) && vendor.logo) {
      await deleteImage(vendor.logo).catch((err) => {
        logger.warn("Failed to delete old vendor logo from Supabase", {
          logo: vendor.logo,
          error: err.message,
        });
      });
    }

    return {
      message: "Vendor details updated successfully",
      logo: getPublicUrl(updatedUser.logo) ?? updatedUser.logo ?? null,
    };
  } catch (error) {
    if (uploadedLogo) {
      await deleteImage(uploadedLogo.publicUrl).catch((cleanupError) => {
        logger.warn("Failed to clean up new vendor logo after update error", {
          error: cleanupError.message,
        });
      });
    }

    throw error;
  }
};

const getDashboardStats = async ({ vendorId, user }) => {
  const { vendorId: parsedVendorId } = validatePayload(
    vendorValidation.vendorParamsSchema,
    { vendorId },
    { part: "params" },
  );

  assertVendorAccess(user, parsedVendorId);

  const vendor = await prisma.user.findUnique({
    where: { id: parsedVendorId },
    select: { id: true },
  });

  if (!vendor) {
    throw new ServiceError("Vendor not found", { status: 404 });
  }

  const [
    totalOrders,
    activeItems,
    totalTables,
    pendingOrders,
    completedPaidRevenue,
  ] = await Promise.all([
    prisma.order.count({ where: { vendorId: parsedVendorId } }),
    prisma.menuItem.count({
      where: {
        vendorId: parsedVendorId,
        isAvailable: true,
      },
    }),
    prisma.table.count({
      where: {
        vendorId: parsedVendorId,
        isActive: true,
      },
    }),
    prisma.order.count({
      where: {
        vendorId: parsedVendorId,
        status: {
          in: ["pending", "accepted", "confirmed"],
        },
      },
    }),
    prisma.order.aggregate({
      where: {
        vendorId: parsedVendorId,
        status: "completed",
        paymentStatus: "paid",
      },
      _sum: {
        totalAmount: true,
      },
    }),
  ]);

  return {
    totalOrders,
    activeItems,
    totalTables,
    totalRevenue: parseFloat(
      Number(completedPaidRevenue._sum.totalAmount || 0).toFixed(2),
    ),
    pendingOrders,
  };
};

const getSalesReport = async ({ vendorId, user, query }) => {
  const { vendorId: parsedVendorId } = validatePayload(
    vendorValidation.vendorParamsSchema,
    { vendorId },
    { part: "params" },
  );
  const validatedQuery = validatePayload(
    vendorValidation.salesReportQuerySchema,
    query || {},
    { part: "query", prefs: { allowUnknown: true } },
  );
  const timeframe = validatedQuery?.timeframe || "week";

  assertVendorAccess(user, parsedVendorId);

  const now = new Date();
  const startDate = new Date();

  switch (timeframe) {
    case "day":
      startDate.setHours(0, 0, 0, 0);
      break;
    case "week":
      startDate.setDate(now.getDate() - 7);
      break;
    case "month":
      startDate.setMonth(now.getMonth() - 1);
      break;
    case "year":
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setDate(now.getDate() - 7);
  }

  const completedOrders = await prisma.order.findMany({
    where: {
      vendorId: parsedVendorId,
      status: "completed",
      createdAt: {
        gte: startDate,
      },
    },
    select: {
      id: true,
      totalAmount: true,
      createdAt: true,
    },
  });

  const totalRevenue = completedOrders.reduce((sum, order) => {
    return sum + Number(order.totalAmount || 0);
  }, 0);

  const salesByDate = {};

  for (const order of completedOrders) {
    const dateStr = order.createdAt.toISOString().split("T")[0];
    if (!salesByDate[dateStr]) {
      salesByDate[dateStr] = {
        date: dateStr,
        orderCount: 0,
        revenue: 0,
      };
    }

    salesByDate[dateStr].orderCount += 1;
    salesByDate[dateStr].revenue += Number(order.totalAmount || 0);
  }

  const salesData = Object.values(salesByDate)
    .map((item) => ({
      ...item,
      revenue: parseFloat(item.revenue.toFixed(2)),
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return {
    timeframe,
    startDate,
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    totalOrders: completedOrders.length,
    salesData,
  };
};

const getPopularItems = async ({ vendorId, user, query }) => {
  const { vendorId: parsedVendorId } = validatePayload(
    vendorValidation.vendorParamsSchema,
    { vendorId },
    { part: "params" },
  );
  const validatedQuery = validatePayload(
    vendorValidation.paginationQuerySchema,
    query || {},
    { part: "query", prefs: { allowUnknown: true } },
  );
  const limit = parseLimit(validatedQuery?.limit);

  assertVendorAccess(user, parsedVendorId);

  const allMenuItems = await prisma.menuItem.findMany({
    where: { vendorId: parsedVendorId },
    select: {
      id: true,
      name: true,
      category: true,
      price: true,
    },
  });

  if (allMenuItems.length === 0) {
    return {
      popularItems: [],
    };
  }

  const allOrderItems = await prisma.orderItem.findMany({
    where: {
      order: {
        vendorId: parsedVendorId,
        status: "completed",
      },
    },
    select: {
      menuItemId: true,
      quantity: true,
      price: true,
    },
  });

  const itemStats = {};
  for (const orderItem of allOrderItems) {
    const menuItemId = orderItem.menuItemId;
    if (!itemStats[menuItemId]) {
      itemStats[menuItemId] = {
        orderCount: 0,
        totalQuantity: 0,
        totalRevenue: 0,
      };
    }

    itemStats[menuItemId].orderCount += 1;
    itemStats[menuItemId].totalQuantity += orderItem.quantity || 0;
    itemStats[menuItemId].totalRevenue +=
      Number(orderItem.price || 0) * orderItem.quantity;
  }

  return {
    popularItems: allMenuItems
      .map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        price: Number(item.price),
        orderCount: itemStats[item.id]?.orderCount || 0,
        totalQuantity: itemStats[item.id]?.totalQuantity || 0,
        totalRevenue: parseFloat(
          (itemStats[item.id]?.totalRevenue || 0).toFixed(2),
        ),
      }))
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, limit),
  };
};

const getRecentOrders = async ({ vendorId, user, query }) => {
  const { vendorId: parsedVendorId } = validatePayload(
    vendorValidation.vendorParamsSchema,
    { vendorId },
    { part: "params" },
  );
  const validatedQuery = validatePayload(
    vendorValidation.paginationQuerySchema,
    query || {},
    { part: "query", prefs: { allowUnknown: true } },
  );
  const limit = parseLimit(validatedQuery?.limit);

  assertVendorAccess(user, parsedVendorId);

  const recentOrders = await prisma.order.findMany({
    where: { vendorId: parsedVendorId },
    include: {
      table: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });

  return {
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      orderId: `ORD${String(order.id).padStart(3, "0")}`,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      tableName: order.table ? order.table.name : order.tableIdentifier,
      createdAt: order.createdAt,
      paymentStatus: order.paymentStatus,
    })),
  };
};

export default {
  getProfile,
  updateProfile,
  getDashboardStats,
  getSalesReport,
  getPopularItems,
  getRecentOrders,
};
