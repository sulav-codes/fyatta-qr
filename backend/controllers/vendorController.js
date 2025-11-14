const {
  users,
  orders,
  menuItems,
  tables,
  orderItems,
} = require("../models/index");
const { Op } = require("sequelize");
const sequelize = require("../models/index").sequelize;

/**
 * Get vendor profile details
 */
exports.getProfile = async (req, res) => {
  try {
    const { vendorId } = req.params;

    // Check authorization
    if (req.user.id !== parseInt(vendorId) && !req.user.isStaff) {
      return res.status(403).json({
        error: "You do not have permission to access this data",
      });
    }

    // Get user details
    const user = await users.findByPk(vendorId);

    if (!user) {
      return res.status(404).json({
        error: "Vendor not found",
      });
    }

    // Prepare user data (password excluded by model's toJSON)
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
    const { vendorId } = req.params;

    // Check authorization
    if (req.user.id !== parseInt(vendorId) && !req.user.isStaff) {
      return res.status(403).json({
        error: "You do not have permission to update this data",
      });
    }

    // Get user
    const user = await users.findByPk(vendorId);
    if (!user) {
      return res.status(404).json({
        error: "Vendor not found",
      });
    }

    // Prepare updates
    const updates = {};

    if (req.body.restaurantName)
      updates.restaurantName = req.body.restaurantName.trim();
    if (req.body.ownerName !== undefined)
      updates.ownerName = req.body.ownerName ? req.body.ownerName.trim() : null;
    if (req.body.phone !== undefined)
      updates.phone = req.body.phone ? req.body.phone.trim() : null;
    if (req.body.location) updates.location = req.body.location.trim();
    if (req.body.description !== undefined)
      updates.description = req.body.description
        ? req.body.description.trim()
        : null;
    if (req.body.openingTime !== undefined)
      updates.openingTime = req.body.openingTime || null;
    if (req.body.closingTime !== undefined)
      updates.closingTime = req.body.closingTime || null;

    // Handle email update with uniqueness check
    if (req.body.email) {
      const existingUser = await users.findOne({
        where: {
          email: req.body.email,
          id: { [Op.ne]: vendorId },
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
    await user.update(updates);

    const responseData = {
      message: "Vendor details updated successfully",
      logo: user.logo ? `/uploads/${user.logo}` : null,
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
    const { vendorId } = req.params;

    // Check authorization
    if (req.user.id !== parseInt(vendorId) && !req.user.isStaff) {
      return res.status(403).json({
        error: "Unauthorized",
      });
    }

    // Verify vendor exists
    const vendor = await users.findByPk(vendorId);
    if (!vendor) {
      return res.status(404).json({
        error: "Vendor not found",
      });
    }

    // Get total orders
    const totalOrders = await orders.count({
      where: { vendorId },
    });

    // Get active menu items
    const activeItems = await menuItems.count({
      where: {
        vendorId,
        isAvailable: true,
      },
    });

    // Calculate total revenue
    const revenueResult = await orders.sum("totalAmount", {
      where: {
        vendorId,
        status: "completed",
        paymentStatus: "paid",
      },
    });

    const totalRevenue = revenueResult || 0;

    // Get total active tables
    const totalTables = await tables.count({
      where: {
        vendorId,
        isActive: true,
      },
    });

    // Get pending orders count
    const pendingOrders = await orders.count({
      where: {
        vendorId,
        status: {
          [Op.in]: ["pending", "accepted", "confirmed"],
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
    const { vendorId } = req.params;
    const { timeframe = "week" } = req.query; // day, week, month, year

    // Check authorization
    if (req.user.id !== parseInt(vendorId) && !req.user.isStaff) {
      return res.status(403).json({
        error: "Unauthorized",
      });
    }

    // Calculate date range based on timeframe
    const now = new Date();
    let startDate;

    switch (timeframe) {
      case "day":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case "week":
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case "month":
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case "year":
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 7));
    }

    // Get sales data
    const salesData = await orders.findAll({
      where: {
        vendorId,
        status: "completed",
        paymentStatus: "paid",
        createdAt: {
          [Op.gte]: startDate,
        },
      },
      attributes: [
        [sequelize.fn("DATE", sequelize.col("created_at")), "date"],
        [sequelize.fn("COUNT", sequelize.col("id")), "orderCount"],
        [sequelize.fn("SUM", sequelize.col("total_amount")), "revenue"],
      ],
      group: [sequelize.fn("DATE", sequelize.col("created_at"))],
      order: [[sequelize.fn("DATE", sequelize.col("created_at")), "ASC"]],
      raw: true,
    });

    // Calculate totals
    const totalRevenue = salesData.reduce(
      (sum, day) => sum + parseFloat(day.revenue || 0),
      0
    );
    const totalOrders = salesData.reduce(
      (sum, day) => sum + parseInt(day.orderCount || 0),
      0
    );

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
    const { vendorId } = req.params;
    const { limit = 10 } = req.query;

    // Check authorization
    if (req.user.id !== parseInt(vendorId) && !req.user.isStaff) {
      return res.status(403).json({
        error: "Unauthorized",
      });
    }

    // Get popular items based on order frequency
    const popularItems = await orderItems.findAll({
      attributes: [
        "menuItemId",
        [sequelize.fn("COUNT", sequelize.col("order_item.id")), "orderCount"],
        [
          sequelize.fn("SUM", sequelize.col("order_item.quantity")),
          "totalQuantity",
        ],
        [
          sequelize.fn(
            "SUM",
            sequelize.literal("order_item.price * order_item.quantity")
          ),
          "totalRevenue",
        ],
      ],
      include: [
        {
          model: menuItems,
          as: "menuItem",
          attributes: ["id", "name", "category", "price"],
          where: { vendorId },
        },
        {
          model: orders,
          as: "order",
          attributes: [],
          where: {
            status: "completed",
            paymentStatus: "paid",
          },
        },
      ],
      group: ["menuItemId", "menuItem.id"],
      order: [[sequelize.literal("orderCount"), "DESC"]],
      limit: parseInt(limit),
      raw: false,
    });

    const itemsData = popularItems.map((item) => ({
      id: item.menuItem.id,
      name: item.menuItem.name,
      category: item.menuItem.category,
      price: item.menuItem.price,
      orderCount: parseInt(item.get("orderCount")),
      totalQuantity: parseInt(item.get("totalQuantity")),
      totalRevenue: parseFloat(parseFloat(item.get("totalRevenue")).toFixed(2)),
    }));

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
    const { vendorId } = req.params;
    const { limit = 10 } = req.query;

    // Check authorization
    if (req.user.id !== parseInt(vendorId) && !req.user.isStaff) {
      return res.status(403).json({
        error: "Unauthorized",
      });
    }

    // Get recent orders
    const recentOrders = await orders.findAll({
      where: { vendorId },
      include: [
        {
          model: tables,
          as: "table",
          attributes: ["id", "name"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
    });

    const ordersData = recentOrders.map((order) => ({
      id: order.id,
      orderId: `ORD${String(order.id).padStart(3, "0")}`,
      status: order.status,
      totalAmount: order.totalAmount,
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
