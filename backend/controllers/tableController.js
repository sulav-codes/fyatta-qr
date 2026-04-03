const prisma = require("../config/prisma");
const { v4: uuidv4 } = require("uuid");
const { canAccessVendor } = require("../utils/helpers");

//Get all tables for a vendor
exports.getTables = async (req, res) => {
  try {
    const vendorId = parseInt(req.params.vendorId, 10);

    // Check authorization
    if (!canAccessVendor(req.user, vendorId)) {
      return res.status(403).json({
        error: "You do not have permission to access this data",
      });
    }

    // Get all tables for this vendor
    const vendorTables = await prisma.table.findMany({
      where: { vendorId },
      orderBy: { name: "asc" },
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

//Create a new table for a vendor
exports.createTable = async (req, res) => {
  try {
    const vendorId = parseInt(req.params.vendorId, 10);
    const { name } = req.body;

    // Check authorization
    if (!canAccessVendor(req.user, vendorId)) {
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
    const existingTable = await prisma.table.findUnique({
      where: {
        vendorId_name: {
          vendorId,
          name: name.trim(),
        },
      },
    });

    if (existingTable) {
      return res.status(400).json({
        error: "A table with this name already exists",
      });
    }

    // Create the table
    const table = await prisma.table.create({
      data: {
        vendorId,
        name: name.trim(),
        qrCode: uuidv4(),
      },
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

//Update a table's name
exports.updateTable = async (req, res) => {
  try {
    const vendorId = parseInt(req.params.vendorId, 10);
    const tableId = parseInt(req.params.tableId, 10);
    const { name, isActive } = req.body;

    // Check authorization
    if (!canAccessVendor(req.user, vendorId)) {
      return res.status(403).json({
        error: "You do not have permission to perform this action",
      });
    }

    // Find the table
    const table = await prisma.table.findFirst({
      where: {
        id: tableId,
        vendorId,
      },
    });

    if (!table) {
      return res.status(404).json({
        error: "Table not found",
      });
    }

    // Update fields
    const updates = {};
    if (name) {
      // Check if new name already exists for this vendor (excluding current table)
      const existingTable = await prisma.table.findFirst({
        where: {
          vendorId,
          name: name.trim(),
          NOT: {
            id: tableId,
          },
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

    const updatedTable = await prisma.table.update({
      where: { id: tableId },
      data: updates,
    });

    res.status(200).json({
      message: "Table updated successfully",
      table: {
        id: updatedTable.id,
        name: updatedTable.name,
        qrCode: updatedTable.qrCode,
        isActive: updatedTable.isActive,
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

//Delete a table
exports.deleteTable = async (req, res) => {
  try {
    const vendorId = parseInt(req.params.vendorId, 10);
    const tableId = parseInt(req.params.tableId, 10);

    // Check authorization
    if (!canAccessVendor(req.user, vendorId)) {
      return res.status(403).json({
        error: "You do not have permission to perform this action",
      });
    }

    // Find the table
    const table = await prisma.table.findFirst({
      where: {
        id: tableId,
        vendorId,
      },
    });

    if (!table) {
      return res.status(404).json({
        error: "Table not found",
      });
    }

    // Delete the table
    await prisma.table.delete({
      where: { id: tableId },
    });

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

//Regenerate a table's QR code
exports.regenerateQRCode = async (req, res) => {
  try {
    const vendorId = parseInt(req.params.vendorId, 10);
    const tableId = parseInt(req.params.tableId, 10);

    // Check authorization
    if (!canAccessVendor(req.user, vendorId)) {
      return res.status(403).json({
        error: "You do not have permission to perform this action",
      });
    }

    // Find the table
    const table = await prisma.table.findFirst({
      where: {
        id: tableId,
        vendorId,
      },
    });

    if (!table) {
      return res.status(404).json({
        error: "Table not found",
      });
    }

    // Regenerate QR code with new UUID
    const newQrCode = uuidv4();
    const updatedTable = await prisma.table.update({
      where: { id: tableId },
      data: { qrCode: newQrCode },
    });

    res.status(200).json({
      message: "QR code regenerated successfully",
      table: {
        id: updatedTable.id,
        name: updatedTable.name,
        qrCode: updatedTable.qrCode,
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

//Get table status (for checking active and available tables)
exports.getTableStatus = async (req, res) => {
  try {
    const vendorId = parseInt(req.params.vendorId, 10);
    const { tableIdentifier } = req.params;

    // Validate inputs
    if (!vendorId || !tableIdentifier) {
      return res.status(400).json({
        error: "Missing required parameters",
      });
    }

    // Find table by QR code
    const table = await prisma.table.findFirst({
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
    const activeOrder = await prisma.order.findFirst({
      where: {
        tableId: table.id,
        status: {
          in: ["pending", "accepted", "confirmed", "preparing"],
        },
      },
    });

    const response = {
      tableId: table.id,
      name: table.name,
      qrCode: table.qrCode,
      isActive: table.isActive,
      vendorId: table.vendorId,
      hasActiveOrder: activeOrder !== null,
      activeOrderId: activeOrder ? activeOrder.id : null,
    };

    // Emit socket event for table status check
    const io = req.app.get("io");
    if (io) {
      io.to(`table-${table.vendorId}-${table.name}`).emit(
        "table-status-update",
        response,
      );
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("Error in getTableStatus:", error);
    res.status(500).json({
      error: "An error occurred while checking table status",
      details: error.message,
    });
  }
};

// Get table details with current orders
exports.getTableDetails = async (req, res) => {
  try {
    const vendorId = parseInt(req.params.vendorId, 10);
    const tableId = parseInt(req.params.tableId, 10);

    // Check authorization
    if (!canAccessVendor(req.user, vendorId)) {
      return res.status(403).json({
        error: "You do not have permission to access this data",
      });
    }

    // Find the table with active orders
    const table = await prisma.table.findFirst({
      where: {
        id: tableId,
        vendorId,
      },
      include: {
        orders: {
          where: {
            status: {
              in: ["pending", "accepted", "confirmed", "preparing"],
            },
          },
        },
      },
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
