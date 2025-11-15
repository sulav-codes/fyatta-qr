const express = require("express");
const router = express.Router();
const db = require("../config/dbConfig");

// Call waiter endpoint
router.post("/call-waiter", async (req, res) => {
  try {
    const { vendor_id, table_identifier, table_name } = req.body;

    if (!vendor_id || !table_identifier) {
      return res.status(400).json({
        success: false,
        message: "Vendor ID and table identifier are required",
      });
    }

    // Get vendor details
    const [vendors] = await db.execute(
      "SELECT id, email, restaurant_name FROM vendor_vendor WHERE id = ?",
      [vendor_id]
    );

    if (vendors.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const vendor = vendors[0];

    // Get table details
    const [tables] = await db.execute(
      "SELECT id, name FROM vendor_table WHERE vendor_id = ? AND qr_code = ?",
      [vendor_id, table_identifier]
    );

    const tableName = tables.length > 0 ? tables[0].name : table_name;

    // Create notification record
    const timestamp = new Date().toISOString();
    const notificationData = {
      vendor_id: vendor.id,
      table_identifier: table_identifier,
      table_name: tableName,
      timestamp: timestamp,
      type: "waiter_call",
    };

    // Emit socket notification to vendor
    const io = req.app.get("io");
    io.emit(`vendor-${vendor_id}`, {
      type: "waiter_call",
      data: notificationData,
      message: `Customer at ${tableName} is calling for assistance`,
    });

    console.log(
      `[Waiter Call] ${tableName} called waiter at ${vendor.restaurant_name}`
    );

    res.status(200).json({
      success: true,
      message: "Waiter has been notified",
      data: notificationData,
    });
  } catch (error) {
    console.error("Error calling waiter:", error);
    res.status(500).json({
      success: false,
      message: "Failed to call waiter",
      error: error.message,
    });
  }
});

module.exports = router;
