const { tables, orders, users } = require("../models/index");
const { v4: uuidv4 } = require("uuid");

/**
 * Get all tables for a vendor
 */
exports.getTables = async (req, res) => {
  try {
    const { vendorId } = req.params;

    // Check authorization
    if (req.user.id !== parseInt(vendorId) && !req.user.isStaff) {
      return res.status(403).json({
        error: "You do not have permission to access this data",
      });
    }

    // Get all tables for this vendor
    const vendorTables = await tables.findAll({
      where: { vendorId },
      order: [["name", "ASC"]],
    });

    const tablesData = vendorTables.map((table) => ({
      id: table.id,
      name: table.name,
      qrCode: table.qrCode,
      isActive: table.isActive,
      createdAt: table.createdAt,
    }));

    res.status(200).json({
      tables: tablesData,
    });
  } catch (error) {
    console.error("Error in getTables:", error);
    res.status(500).json({
      error: "An error occurred while retrieving tables",
      details: error.message,
    });
  }
};

/**
 * Create a new table for a vendor
 */
exports.createTable = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { name } = req.body;

    // Check authorization
    if (req.user.id !== parseInt(vendorId) && !req.user.isStaff) {
      return res.status(403).json({
        error: "You do not have permission to perform this action",
      });
    }

    // Validate table name
    if (!name || name.trim() === "") {
      return res.status(400).json({
        error: "Table name is required",
      });
    }

    // Check if table name already exists for this vendor
    const existingTable = await tables.findOne({
      where: { vendorId, name: name.trim() },
    });

    if (existingTable) {
      return res.status(400).json({
        error: "A table with this name already exists",
      });
    }

    // Create the table
    const table = await tables.create({
      vendorId,
      name: name.trim(),
    });

    res.status(201).json({
      message: "Table created successfully",
      table: {
        id: table.id,
        name: table.name,
        qrCode: table.qrCode,
        createdAt: table.createdAt,
      },
    });
  } catch (error) {
    console.error("Error in createTable:", error);
    res.status(500).json({
      error: "An error occurred while creating the table",
      details: error.message,
    });
  }
};

/**
 * Update a table's name
 */
exports.updateTable = async (req, res) => {
  try {
    const { vendorId, tableId } = req.params;
    const { name, isActive } = req.body;

    // Check authorization
    if (req.user.id !== parseInt(vendorId) && !req.user.isStaff) {
      return res.status(403).json({
        error: "You do not have permission to perform this action",
      });
    }

    // Find the table
    const table = await tables.findOne({
      where: { id: tableId, vendorId },
    });

    if (!table) {
      return res.status(404).json({
        error: "Table not found",
      });
    }

    // Update fields
    const updates = {};
    if (name) {
      // Check if new name already exists for this vendor
      const existingTable = await tables.findOne({
        where: {
          vendorId,
          name: name.trim(),
          id: { [require("sequelize").Op.ne]: tableId },
        },
      });

      if (existingTable) {
        return res.status(400).json({
          error: "A table with this name already exists",
        });
      }

      updates.name = name.trim();
    }

    if (isActive !== undefined) {
      updates.isActive = isActive;
    }

    await table.update(updates);

    res.status(200).json({
      message: "Table updated successfully",
      table: {
        id: table.id,
        name: table.name,
        qrCode: table.qrCode,
        isActive: table.isActive,
      },
    });
  } catch (error) {
    console.error("Error in updateTable:", error);
    res.status(500).json({
      error: "An error occurred while updating the table",
      details: error.message,
    });
  }
};

/**
 * Delete a table
 */
exports.deleteTable = async (req, res) => {
  try {
    const { vendorId, tableId } = req.params;

    // Check authorization
    if (req.user.id !== parseInt(vendorId) && !req.user.isStaff) {
      return res.status(403).json({
        error: "You do not have permission to perform this action",
      });
    }

    // Find the table
    const table = await tables.findOne({
      where: { id: tableId, vendorId },
    });

    if (!table) {
      return res.status(404).json({
        error: "Table not found",
      });
    }

    // Delete the table
    await table.destroy();

    res.status(200).json({
      message: "Table deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteTable:", error);
    res.status(500).json({
      error: "An error occurred while deleting the table",
      details: error.message,
    });
  }
};

/**
 * Regenerate a table's QR code
 */
exports.regenerateQRCode = async (req, res) => {
  try {
    const { vendorId, tableId } = req.params;

    // Check authorization
    if (req.user.id !== parseInt(vendorId) && !req.user.isStaff) {
      return res.status(403).json({
        error: "You do not have permission to perform this action",
      });
    }

    // Find the table
    const table = await tables.findOne({
      where: { id: tableId, vendorId },
    });

    if (!table) {
      return res.status(404).json({
        error: "Table not found",
      });
    }

    // Regenerate QR code using model method
    const newQrCode = await table.regenerateQrCode();

    res.status(200).json({
      message: "QR code regenerated successfully",
      table: {
        id: table.id,
        name: table.name,
        qrCode: newQrCode,
      },
    });
  } catch (error) {
    console.error("Error in regenerateQRCode:", error);
    res.status(500).json({
      error: "An error occurred while regenerating the QR code",
      details: error.message,
    });
  }
};

/**
 * Get table status (public endpoint - no auth required)
 * Used to check if a table is active and available
 */
exports.getTableStatus = async (req, res) => {
  try {
    const { vendorId, tableIdentifier } = req.params;

    // Validate inputs
    if (!vendorId || !tableIdentifier) {
      return res.status(400).json({
        error: "Missing required parameters",
      });
    }

    // Find table by QR code
    const table = await tables.findOne({
      where: {
        vendorId,
        qrCode: tableIdentifier,
      },
    });

    if (!table) {
      return res.status(404).json({
        error: "Table not found",
      });
    }

    // Check for active orders at this table
    const activeOrder = await orders.findOne({
      where: {
        tableId: table.id,
        status: {
          [require("sequelize").Op.in]: [
            "pending",
            "accepted",
            "confirmed",
            "preparing",
          ],
        },
      },
    });

    res.status(200).json({
      tableId: table.id,
      name: table.name,
      qrCode: table.qrCode,
      isActive: table.isActive,
      vendorId: table.vendorId,
      hasActiveOrder: activeOrder !== null,
      activeOrderId: activeOrder ? activeOrder.id : null,
    });
  } catch (error) {
    console.error("Error in getTableStatus:", error);
    res.status(500).json({
      error: "An error occurred while checking table status",
      details: error.message,
    });
  }
};

/**
 * Get table details with current orders
 */
exports.getTableDetails = async (req, res) => {
  try {
    const { vendorId, tableId } = req.params;

    // Check authorization
    if (req.user.id !== parseInt(vendorId) && !req.user.isStaff) {
      return res.status(403).json({
        error: "You do not have permission to access this data",
      });
    }

    // Find the table
    const table = await tables.findOne({
      where: { id: tableId, vendorId },
      include: [
        {
          model: orders,
          as: "orders",
          where: {
            status: {
              [require("sequelize").Op.in]: [
                "pending",
                "accepted",
                "confirmed",
                "preparing",
              ],
            },
          },
          required: false,
        },
      ],
    });

    if (!table) {
      return res.status(404).json({
        error: "Table not found",
      });
    }

    res.status(200).json({
      id: table.id,
      name: table.name,
      qrCode: table.qrCode,
      isActive: table.isActive,
      createdAt: table.createdAt,
      activeOrders: table.orders || [],
    });
  } catch (error) {
    console.error("Error in getTableDetails:", error);
    res.status(500).json({
      error: "An error occurred while retrieving table details",
      details: error.message,
    });
  }
};

module.exports = exports;
