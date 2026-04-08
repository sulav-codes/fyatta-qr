const express = require("express");
const router = express.Router();
const prisma = require("../../config/prisma");

//Get public menu for a vendor (no authentication required)
router.get("/public-menu/:vendorId/", async (req, res) => {
  try {
    const vendorId = parseInt(req.params.vendorId, 10);

    // Get vendor info
    const vendor = await prisma.user.findUnique({
      where: { id: vendorId },
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
      return res.status(404).json({ error: "Vendor not found" });
    }

    // Get all available menu items grouped by category
    const items = await prisma.menuItem.findMany({
      where: {
        vendorId,
        isAvailable: true,
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
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
        price: Number(item.price),
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

//Get public table status (no authentication required)
router.get("/public-table/:vendorId/:tableIdentifier/", async (req, res) => {
  try {
    const vendorId = parseInt(req.params.vendorId, 10);
    const { tableIdentifier } = req.params;

    // Find table by QR code identifier
    const table = await prisma.table.findFirst({
      where: {
        vendorId,
        qrCode: tableIdentifier,
      },
    });

    if (!table) {
      return res.status(404).json({ error: "Table not found" });
    }

    // Check for active orders at this table
    const activeOrder = await prisma.order.findFirst({
      where: {
        tableId: table.id,
        status: {
          in: ["pending", "accepted", "confirmed", "preparing"],
        },
      },
      orderBy: { createdAt: "desc" },
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
