const prisma = require("../config/prisma");
const { canAccessVendor } = require("../utils/helpers");

function mapMenuItem(item) {
  return {
    id: item.id,
    name: item.name,
    price: Number(item.price),
    description: item.description,
    category: item.category,
    imageUrl: item.image ? `/uploads/${item.image}` : null,
    isAvailable: item.isAvailable,
    createdAt: item.createdAt,
  };
}

/**
 * Create menu items for a vendor
 * Accepts array of menu items with optional image files
 */
exports.createMenuItems = async (req, res) => {
  try {
    const vendorId = parseInt(req.params.vendorId, 10);

    if (!canAccessVendor(req.user, vendorId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Verify vendor exists
    const vendor = await prisma.user.findUnique({
      where: { id: vendorId },
      select: { id: true },
    });

    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    // Parse menu items from request
    let itemsData;
    try {
      itemsData = JSON.parse(req.body.menuItems || "[]");
    } catch (error) {
      return res.status(400).json({ error: "Invalid JSON in menuItems" });
    }

    if (!Array.isArray(itemsData) || itemsData.length === 0) {
      return res.status(400).json({
        error: "menuItems must be a non-empty array",
      });
    }

    const validatedItems = [];
    const validationErrors = [];

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

      const imageKey = `image_${index}`;
      const image =
        req.files && req.files[imageKey] && req.files[imageKey][0]
          ? req.files[imageKey][0].filename
          : null;

      if (itemErrors.length > 0) {
        validationErrors.push(
          ...itemErrors.map((err) => `Item ${index + 1}: ${err}`),
        );
      } else {
        validatedItems.push({
          vendorId,
          name: item.name.trim(),
          price: parseFloat(item.price),
          category: item.category.trim(),
          description: item.description ? item.description.trim() : "",
          image,
          isAvailable: true,
        });
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: "Validation failed",
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
      imageUrl: item.image ? `/uploads/${item.image}` : null,
      isAvailable: item.isAvailable,
    }));

    res.status(201).json({
      message: "Menu items created successfully",
      createdItems: itemsResponse,
      count: itemsResponse.length,
    });
  } catch (error) {
    console.error("Error creating menu items:", error);
    res.status(500).json({
      error: "Failed to create menu items",
      details: error.message,
    });
  }
};

/**
 * Get all menu items for a vendor
 */
exports.getMenuItems = async (req, res) => {
  try {
    const vendorId = parseInt(req.params.vendorId, 10);

    if (!canAccessVendor(req.user, vendorId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const vendor = await prisma.user.findUnique({
      where: { id: vendorId },
      select: { id: true },
    });

    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    const items = await prisma.menuItem.findMany({
      where: { vendorId },
      orderBy: { createdAt: "desc" },
    });

    const itemsData = items.map(mapMenuItem);

    res.status(200).json({
      menuItems: itemsData,
      count: itemsData.length,
    });
  } catch (error) {
    console.error("Error fetching menu items:", error);
    res.status(500).json({
      error: "Failed to fetch menu items",
      details: error.message,
    });
  }
};

/**
 * Get menu items grouped by category
 */
exports.getMenuItemsByCategory = async (req, res) => {
  try {
    const vendorId = parseInt(req.params.vendorId, 10);

    if (!canAccessVendor(req.user, vendorId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const items = await prisma.menuItem.findMany({
      where: { vendorId },
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
        imageUrl: item.image ? `/uploads/${item.image}` : null,
        isAvailable: item.isAvailable,
      });
    }

    const formattedCategories = Object.keys(categories).map((name) => ({
      name,
      items: categories[name],
    }));

    res.status(200).json({
      categories: formattedCategories,
      totalItems: items.length,
    });
  } catch (error) {
    console.error("Error fetching menu items by category:", error);
    res.status(500).json({
      error: "Failed to fetch menu items",
      details: error.message,
    });
  }
};

/**
 * Get a single menu item by ID
 */
exports.getMenuItem = async (req, res) => {
  try {
    const vendorId = parseInt(req.params.vendorId, 10);
    const itemId = parseInt(req.params.itemId, 10);

    if (!canAccessVendor(req.user, vendorId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const item = await prisma.menuItem.findFirst({
      where: { id: itemId, vendorId },
    });

    if (!item) {
      return res.status(404).json({ error: "Menu item not found" });
    }

    res.status(200).json({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      description: item.description,
      category: item.category,
      imageUrl: item.image ? `/uploads/${item.image}` : null,
      isAvailable: item.isAvailable,
    });
  } catch (error) {
    console.error("Error fetching menu item:", error);
    res.status(500).json({
      error: "Failed to fetch menu item",
      details: error.message,
    });
  }
};

/**
 * Update a menu item
 */
exports.updateMenuItem = async (req, res) => {
  try {
    const vendorId = parseInt(req.params.vendorId, 10);
    const itemId = parseInt(req.params.itemId, 10);

    if (!canAccessVendor(req.user, vendorId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const item = await prisma.menuItem.findFirst({
      where: { id: itemId, vendorId },
    });

    if (!item) {
      return res.status(404).json({ error: "Menu item not found" });
    }

    const updates = {};
    if (req.body.name) updates.name = req.body.name.trim();
    if (req.body.price) updates.price = parseFloat(req.body.price);
    if (req.body.category) updates.category = req.body.category.trim();

    if (req.body.description !== undefined) {
      updates.description = req.body.description
        ? req.body.description.trim()
        : "";
    }

    if (req.body.isAvailable !== undefined) {
      updates.isAvailable =
        req.body.isAvailable === true ||
        req.body.isAvailable === "true" ||
        req.body.isAvailable === 1;
    }

    if (req.file) updates.image = req.file.filename;

    const updated = await prisma.menuItem.update({
      where: { id: itemId },
      data: updates,
    });

    res.status(200).json({
      message: "Menu item updated successfully",
      item: {
        id: updated.id,
        name: updated.name,
        price: Number(updated.price),
        category: updated.category,
        description: updated.description,
        imageUrl: updated.image ? `/uploads/${updated.image}` : null,
        isAvailable: updated.isAvailable,
      },
    });
  } catch (error) {
    console.error("Error updating menu item:", error);
    res.status(500).json({
      error: "Failed to update menu item",
      details: error.message,
    });
  }
};

/**
 * Delete a menu item
 */
exports.deleteMenuItem = async (req, res) => {
  try {
    const vendorId = parseInt(req.params.vendorId, 10);
    const itemId = parseInt(req.params.itemId, 10);

    if (!canAccessVendor(req.user, vendorId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const item = await prisma.menuItem.findFirst({
      where: { id: itemId, vendorId },
      select: { id: true },
    });

    if (!item) {
      return res.status(404).json({ error: "Menu item not found" });
    }

    await prisma.menuItem.delete({ where: { id: itemId } });

    res.status(200).json({
      message: "Menu item deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting menu item:", error);
    res.status(500).json({
      error: "Failed to delete menu item",
      details: error.message,
    });
  }
};

/**
 * Toggle menu item availability
 */
exports.toggleAvailability = async (req, res) => {
  try {
    const vendorId = parseInt(req.params.vendorId, 10);
    const itemId = parseInt(req.params.itemId, 10);

    if (!canAccessVendor(req.user, vendorId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const item = await prisma.menuItem.findFirst({
      where: { id: itemId, vendorId },
      select: { id: true, isAvailable: true },
    });

    if (!item) {
      return res.status(404).json({ error: "Menu item not found" });
    }

    const nextAvailability = !item.isAvailable;
    await prisma.menuItem.update({
      where: { id: itemId },
      data: { isAvailable: nextAvailability },
    });

    res.status(200).json({
      message: `Menu item ${nextAvailability ? "enabled" : "disabled"}`,
      isAvailable: nextAvailability,
    });
  } catch (error) {
    console.error("Error toggling menu item availability:", error);
    res.status(500).json({
      error: "Failed to toggle availability",
      details: error.message,
    });
  }
};
