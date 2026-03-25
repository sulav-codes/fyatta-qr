const prisma = require("../config/prisma");
const { canAccessVendor } = require("../utils/helpers");

/**
 * Get vendor profile details
 */
exports.getProfile = async (req, res) => {
  try {
    const vendorId = parseInt(req.params.vendorId, 10);

    // Check authorization
    if (!canAccessVendor(req.user, vendorId)) {
      return res.status(403).json({
        error: "You do not have permission to access this data",
      });
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: vendorId },
    });

    if (!user) {
      return res.status(404).json({
        error: "Vendor not found",
      });
    }

    // Prepare user data (password excluded)
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      restaurantName: user.restaurantName,
      ownerName: user.ownerName,
      phone: user.phone,
      location: user.location,
      description: user.description,
      openingTime: user.openingTime,
      closingTime: user.closingTime,
      logo: user.logo ? `/uploads/${user.logo}` : null,
    };

    res.status(200).json(userData);
  } catch (error) {
    console.error("Error in getProfile:", error);
    res.status(500).json({
      error: "An error occurred while retrieving vendor data",
      details: error.message,
    });
  }
};

/**
 * Update vendor profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const vendorId = parseInt(req.params.vendorId, 10);

    // Check authorization
    if (!canAccessVendor(req.user, vendorId)) {
      return res.status(403).json({
        error: "You do not have permission to update this data",
      });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: vendorId },
    });

    if (!user) {
      return res.status(404).json({
        error: "Vendor not found",
      });
    }

    // Prepare updates
    const updates = {};

    if (req.body.restaurantName) {
      updates.restaurantName = req.body.restaurantName.trim();
    }

    if (req.body.ownerName !== undefined) {
      updates.ownerName = req.body.ownerName ? req.body.ownerName.trim() : null;
    }

    if (req.body.phone !== undefined) {
      updates.phone = req.body.phone ? req.body.phone.trim() : null;
    }

    if (req.body.location) {
      updates.location = req.body.location.trim();
    }

    if (req.body.description !== undefined) {
      updates.description = req.body.description
        ? req.body.description.trim()
        : null;
    }

    if (req.body.openingTime !== undefined) {
      updates.openingTime = req.body.openingTime || null;
    }

    if (req.body.closingTime !== undefined) {
      updates.closingTime = req.body.closingTime || null;
    }

    // Handle email update with uniqueness check
    if (req.body.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: req.body.email,
          NOT: {
            id: vendorId,
          },
        },
      });

      if (existingUser) {
        return res.status(400).json({
          error: "This email is already in use by another account",
        });
      }

      updates.email = req.body.email.trim();
    }

    // Handle logo file upload
    if (req.file) {
      updates.logo = req.file.path;
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: vendorId },
      data: updates,
    });

    const responseData = {
      message: "Vendor details updated successfully",
      logo: updatedUser.logo ? `/uploads/${updatedUser.logo}` : null,
    };

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Error in updateProfile:", error);
    res.status(500).json({
      error: "An error occurred while updating vendor data",
      details: error.message,
    });
  }
};

/**
 * Get dashboard statistics
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const vendorId = parseInt(req.params.vendorId, 10);

    // Check authorization
    if (!canAccessVendor(req.user, vendorId)) {
      return res.status(403).json({
        error: "Unauthorized",
      });
    }

    // Verify vendor exists
    const vendor = await prisma.user.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      return res.status(404).json({
        error: "Vendor not found",
      });
    }

    // Get total orders
    const totalOrders = await prisma.order.count({
      where: { vendorId },
    });

    // Get active menu items
    const activeItems = await prisma.menuItem.count({
      where: {
        vendorId,
        isAvailable: true,
      },
    });

    // Calculate total revenue (completed orders with paid status)
    const revenueOrders = await prisma.order.findMany({
      where: {
        vendorId,
        status: "completed",
        paymentStatus: "paid",
      },
      select: {
        totalAmount: true,
      },
    });

    const totalRevenue = revenueOrders.reduce((sum, order) => {
      return sum + Number(order.totalAmount || 0);
    }, 0);

    // Get total active tables
    const totalTables = await prisma.table.count({
      where: {
        vendorId,
        isActive: true,
      },
    });

    // Get pending orders count
    const pendingOrders = await prisma.order.count({
      where: {
        vendorId,
        status: {
          in: ["pending", "accepted", "confirmed"],
        },
      },
    });

    res.status(200).json({
      totalOrders,
      activeItems,
      totalTables,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      pendingOrders,
    });
  } catch (error) {
    console.error("Error in getDashboardStats:", error);
    res.status(500).json({
      error: "An unexpected error occurred. Please try again.",
      details: error.message,
    });
  }
};

/**
 * Get sales report
 */
exports.getSalesReport = async (req, res) => {
  try {
    const vendorId = parseInt(req.params.vendorId, 10);
    const { timeframe = "week" } = req.query;

    // Check authorization
    if (!canAccessVendor(req.user, vendorId)) {
      return res.status(403).json({
        error: "Unauthorized",
      });
    }

    // Calculate date range based on timeframe
    const now = new Date();
    let startDate = new Date();

    switch (timeframe) {
      case "day":
        startDate.setHours(0, 0, 0, 0);
        break;
      case "week":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "year":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    // Get completed orders for this vendor
    const completedOrders = await prisma.order.findMany({
      where: {
        vendorId,
        status: "completed",
      },
      select: {
        id: true,
        totalAmount: true,
        createdAt: true,
      },
    });

    // Filter by date and calculate totals
    const filteredOrders = completedOrders.filter((order) => {
      return order.createdAt >= startDate;
    });

    const totalRevenue = filteredOrders.reduce((sum, order) => {
      return sum + Number(order.totalAmount || 0);
    }, 0);

    const totalOrders = filteredOrders.length;

    // Group by date for salesData
    const salesByDate = {};
    filteredOrders.forEach((order) => {
      const dateStr = order.createdAt.toISOString().split("T")[0];
      if (!salesByDate[dateStr]) {
        salesByDate[dateStr] = { date: dateStr, orderCount: 0, revenue: 0 };
      }
      salesByDate[dateStr].orderCount++;
      salesByDate[dateStr].revenue += Number(order.totalAmount || 0);
    });

    const salesData = Object.values(salesByDate)
      .map((item) => ({
        ...item,
        revenue: parseFloat(item.revenue.toFixed(2)),
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    res.status(200).json({
      timeframe,
      startDate,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalOrders,
      salesData,
    });
  } catch (error) {
    console.error("Error in getSalesReport:", error);
    res.status(500).json({
      error: "Failed to generate sales report",
      details: error.message,
    });
  }
};

/**
 * Get popular menu items
 */
exports.getPopularItems = async (req, res) => {
  try {
    const vendorId = parseInt(req.params.vendorId, 10);
    const limit = Math.min(parseInt(req.query.limit || 10), 100);

    // Check authorization
    if (!canAccessVendor(req.user, vendorId)) {
      return res.status(403).json({
        error: "Unauthorized",
      });
    }

    // Get all menu items for this vendor
    const allMenuItems = await prisma.menuItem.findMany({
      where: { vendorId },
      select: {
        id: true,
        name: true,
        category: true,
        price: true,
      },
    });

    if (allMenuItems.length === 0) {
      return res.status(200).json({
        popularItems: [],
      });
    }

    // Get order items for completed orders only
    const allOrderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          vendorId,
          status: "completed",
        },
      },
      select: {
        menuItemId: true,
        quantity: true,
        price: true,
      },
    });

    // Calculate popularity for each menu item
    const itemStats = {};
    allOrderItems.forEach((orderItem) => {
      const menuItemId = orderItem.menuItemId;
      if (!itemStats[menuItemId]) {
        itemStats[menuItemId] = {
          orderCount: 0,
          totalQuantity: 0,
          totalRevenue: 0,
        };
      }
      itemStats[menuItemId].orderCount++;
      itemStats[menuItemId].totalQuantity += orderItem.quantity || 0;
      itemStats[menuItemId].totalRevenue +=
        Number(orderItem.price || 0) * orderItem.quantity;
    });

    // Merge with menu items and sort by popularity
    const itemsData = allMenuItems
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
      .slice(0, limit);

    res.status(200).json({
      popularItems: itemsData,
    });
  } catch (error) {
    console.error("Error in getPopularItems:", error);
    res.status(500).json({
      error: "Failed to retrieve popular items",
      details: error.message,
    });
  }
};

/**
 * Get recent orders
 */
exports.getRecentOrders = async (req, res) => {
  try {
    const vendorId = parseInt(req.params.vendorId, 10);
    const limit = Math.min(parseInt(req.query.limit || 10), 100);

    // Check authorization
    if (!canAccessVendor(req.user, vendorId)) {
      return res.status(403).json({
        error: "Unauthorized",
      });
    }

    // Get recent orders
    const recentOrders = await prisma.order.findMany({
      where: { vendorId },
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

    const ordersData = recentOrders.map((order) => ({
      id: order.id,
      orderId: `ORD${String(order.id).padStart(3, "0")}`,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      tableName: order.table ? order.table.name : order.tableIdentifier,
      createdAt: order.createdAt,
      paymentStatus: order.paymentStatus,
    }));

    res.status(200).json({
      recentOrders: ordersData,
    });
  } catch (error) {
    console.error("Error in getRecentOrders:", error);
    res.status(500).json({
      error: "Failed to retrieve recent orders",
      details: error.message,
    });
  }
};

module.exports = exports;
