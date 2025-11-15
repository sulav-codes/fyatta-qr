const express = require("express");
const router = express.Router();
const { tables, users } = require("../models/index");

// Call waiter endpoint
router.post("/call-waiter", async (req, res) => {
  try {
    const { vendor_id, table_identifier, table_name } = req.body;

    console.log("[Waiter Call] Request received:", {
      vendor_id,
      table_identifier,
      table_name,
    });

    if (!vendor_id || !table_identifier) {
      return res.status(400).json({
        success: false,
        message: "Vendor ID and table identifier are required",
      });
    }

    // Get vendor details
    const vendor = await users.findByPk(vendor_id, {
      attributes: ["id", "email", "restaurantName"],
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    // Get table details
    const table = await tables.findOne({
      where: {
        vendorId: vendor_id,
        qrCode: table_identifier,
      },
      attributes: ["id", "name"],
    });

    const tableName = table ? table.name : table_name || "Unknown Table";

    // Create notification record
    const timestamp = new Date().toISOString();
    const notificationData = {
      vendor_id: vendor.id,
      table_identifier: table_identifier,
      table_name: tableName,
      timestamp: timestamp,
      type: "waiter_call",
    };

    // Emit socket notification to vendor if socket.io is available
    try {
      const io = req.app.get("io");
      if (io) {
        io.emit(`vendor-${vendor_id}`, {
          type: "waiter_call",
          data: notificationData,
          message: `Customer at ${tableName} is calling for assistance`,
        });
        console.log(
          `[Waiter Call] Socket notification sent to vendor-${vendor_id}`
        );
      } else {
        console.warn(
          "[Waiter Call] Socket.io not available, notification not sent via socket"
        );
      }
    } catch (socketError) {
      console.error("[Waiter Call] Socket error:", socketError);
      // Continue even if socket fails
    }

    console.log(
      `[Waiter Call] ${tableName} called waiter at ${vendor.restaurant_name}`
    );

    return res.status(200).json({
      success: true,
      message: "Waiter has been notified",
      data: notificationData,
    });
  } catch (error) {
    console.error("Error calling waiter:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to call waiter",
      error: error.message,
    });
  }
});

module.exports = router;
