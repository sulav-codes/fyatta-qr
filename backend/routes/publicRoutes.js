const express = require("express");
const router = express.Router();
const { tables, users, menuItems, orders } = require("../models/index");
const { Op } = require("sequelize");

/**
 * Get public menu for a vendor (no authentication required)
 */
router.get("/public-menu/:vendorId/", async (req, res) => {
  try {
    const { vendorId } = req.params;

    // Get vendor info
    const vendor = await users.findByPk(vendorId, {
      attributes: [
        "id",
        "restaurantName",
        "ownerName",
        "email",
        "phone",
        "location",
        "openingTime",
        "closingTime",
        "description",
        "logo",
      ],
    });

    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    // Get all available menu items grouped by category
    const items = await menuItems.findAll({
      where: {
        vendorId,
        isAvailable: true,
      },
      order: [
        ["category", "ASC"],
        ["name", "ASC"],
      ],
    });

    // Group items by category
    const categoriesMap = {};
    items.forEach((item) => {
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
        price: item.price,
        category: item.category,
        image_url: item.image ? `/uploads/${item.image}` : null,
        is_available: item.isAvailable,
      });
    });

    const categories = Object.values(categoriesMap);

    res.status(200).json({
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
        logo: vendor.logo,
      },
      categories,
    });
  } catch (error) {
    console.error("Error fetching public menu:", error);
    res.status(500).json({
      error: "Failed to fetch menu",
      details: error.message,
    });
  }
});

/**
 * Get public table status (no authentication required)
 */
router.get("/public-table/:vendorId/:tableIdentifier/", async (req, res) => {
  try {
    const { vendorId, tableIdentifier } = req.params;

    // Find table by QR code identifier
    const table = await tables.findOne({
      where: {
        vendorId,
        qrCode: tableIdentifier,
      },
    });

    if (!table) {
      return res.status(404).json({ error: "Table not found" });
    }

    // Check for active orders at this table
    const activeOrder = await orders.findOne({
      where: {
        tableId: table.id,
        status: {
          [Op.in]: ["pending", "accepted", "confirmed", "preparing"],
        },
      },
      order: [["created_at", "DESC"]],
    });

    res.status(200).json({
      table_id: table.id,
      name: table.name,
      qr_code: table.qrCode,
      is_active: table.isActive,
      vendor_id: table.vendorId,
      has_active_order: activeOrder !== null,
      active_order_id: activeOrder ? activeOrder.id : null,
    });
  } catch (error) {
    console.error("Error fetching table status:", error);
    res.status(500).json({
      error: "Failed to fetch table status",
      details: error.message,
    });
  }
});

module.exports = router;
