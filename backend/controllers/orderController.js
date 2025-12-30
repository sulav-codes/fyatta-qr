const {
  orders,
  orderItems,
  menuItems,
  tables,
  users,
} = require("../models/index");
const { Op } = require("sequelize");

/**
 * Get all orders for a vendor
 */
exports.getOrders = async (req, res) => {
  try {
    const { vendorId } = req.params;

    // Check authorization - vendors can only access their own data, staff can only access their vendor's data
    let effectiveVendorId;
    if (req.user.role === "staff") {
      effectiveVendorId = req.user.vendorId;
      // If staff doesn't have vendorId set, they can't access any vendor data
      if (!effectiveVendorId) {
        return res
          .status(403)
          .json({
            error: "Staff user not properly configured - missing vendorId",
          });
      }
    } else {
      effectiveVendorId = req.user.id;
    }

    if (effectiveVendorId !== parseInt(vendorId) && req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Verify vendor exists
    const vendor = await users.findByPk(vendorId);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    // Get all orders for this vendor with related data
    const vendorOrders = await orders.findAll({
      where: { vendorId },
      include: [
        {
          model: tables,
          as: "table",
          attributes: ["id", "name", "qrCode"],
        },
        {
          model: orderItems,
          as: "items",
          include: [
            {
              model: menuItems,
              as: "menuItem",
              attributes: ["id", "name"],
            },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    const ordersData = vendorOrders.map((order) => {
      const timeElapsed = getTimeElapsed(order.createdAt || order.created_at);
      const tableName = order.table
        ? order.table.name
        : order.tableIdentifier || "Unknown";

      return {
        id: order.id,
        orderId: `ORD${String(order.id).padStart(3, "0")}`,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        totalAmount: order.totalAmount,
        tableName: tableName,
        tableId: order.table ? order.table.id : null,
        tableIdentifier: order.tableIdentifier,
        qrCode: order.table ? order.table.qrCode : order.tableIdentifier,
        invoiceNo: order.invoiceNo,
        createdAt:
          order.createdAt || order.created_at || order.dataValues?.created_at,
        timestamp:
          order.createdAt || order.created_at || order.dataValues?.created_at,
        timeElapsed: timeElapsed,
        items: order.items.map((item) => ({
          id: item.id,
          name: item.menuItem ? item.menuItem.name : "Deleted Item",
          price: item.price,
          quantity: item.quantity,
        })),
        customerVerified: order.customerVerified,
        verificationTimestamp: order.verificationTimestamp,
        deliveryIssueReported: order.deliveryIssueReported,
        issueReportTimestamp: order.issueReportTimestamp,
        issueDescription: order.issueDescription,
      };
    });

    console.log(`[getOrders] Returning ${ordersData.length} orders`);
    res.status(200).json({
      orders: ordersData,
      count: ordersData.length,
    });
  } catch (error) {
    console.error("[getOrders] Error fetching orders:", error);
    console.error("[getOrders] Error stack:", error.stack);
    res.status(500).json({
      error: "Failed to fetch orders",
      details: error.message,
    });
  }
};

/**
 * Create a new order from customer (public endpoint)
 */
exports.createCustomerOrder = async (req, res) => {
  try {
    const { vendor_id, table_identifier, items: orderItemsData } = req.body;

    // Validate required fields
    if (!vendor_id || !orderItemsData || orderItemsData.length === 0) {
      return res.status(400).json({
        error: "Vendor ID and order items are required",
      });
    }

    // Verify vendor exists
    const vendor = await users.findByPk(vendor_id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    // Find table by QR code/identifier if provided
    let table = null;
    if (table_identifier) {
      table = await tables.findOne({
        where: {
          vendorId: vendor_id,
          [Op.or]: [{ qrCode: table_identifier }, { name: table_identifier }],
        },
      });
      console.log(
        "[createCustomerOrder] Table lookup result:",
        table ? table.name : "not found"
      );
    }

    // Calculate total from items
    let calculatedTotal = 0;
    const validItems = [];

    for (const itemData of orderItemsData) {
      const menuItem = await menuItems.findByPk(itemData.id);
      if (menuItem) {
        const quantity = itemData.quantity || 1;
        calculatedTotal += parseFloat(menuItem.price) * quantity;
        validItems.push({
          menuItem,
          quantity,
        });
      }
    }

    if (validItems.length === 0) {
      return res.status(400).json({ error: "No valid menu items found" });
    }

    // Generate invoice number
    const invoiceNo = await generateInvoiceNumber();

    // Create order
    const order = await orders.create({
      vendorId: vendor_id,
      tableId: table ? table.id : null,
      tableIdentifier: table_identifier || null,
      status: "pending",
      totalAmount: calculatedTotal,
      invoiceNo,
      paymentStatus: "pending",
      paymentMethod: "cash",
    });

    console.log("[createCustomerOrder] Order created:", order.id);

    // Create order items
    for (const { menuItem, quantity } of validItems) {
      await orderItems.create({
        orderId: order.id,
        menuItemId: menuItem.id,
        quantity,
        price: menuItem.price,
      });
    }

    console.log("[createCustomerOrder] Order items created");

    // Fetch the created order with items for notification
    const orderWithItems = await orders.findByPk(order.id, {
      include: [
        {
          model: orderItems,
          as: "items",
          include: [
            {
              model: menuItems,
              as: "menuItem",
              attributes: ["id", "name"],
            },
          ],
        },
      ],
    });

    // Prepare items array for notification
    const itemsForNotification = orderWithItems.items.map((item) => ({
      name: item.menuItem ? item.menuItem.name : "Unknown Item",
      quantity: item.quantity,
      price: item.price,
    }));

    // Emit socket event for new order
    const io = req.app.get("io");
    if (io) {
      // Emit order created event to vendor
      io.to(`vendor-${vendor_id}`).emit("order-created", {
        orderId: order.id,
        status: order.status,
        totalAmount: order.totalAmount,
        tableIdentifier: table ? table.name : table_identifier,
        tableName: table ? table.name : null,
      });

      // Emit notification to vendor
      io.to(`vendor-${vendor_id}`).emit("notification", {
        id: `order-${order.id}-created`,
        type: "order",
        title: "New Order Received",
        message: `New order #${order.id} from ${
          table ? table.name : "customer"
        }`,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        read: false,
        data: {
          order_id: order.id,
          table_name: table ? table.name : null,
          total_amount: order.totalAmount,
          status: order.status,
          items: itemsForNotification,
        },
      });

      // Emit to table room if exists
      if (table) {
        io.to(`table-${vendor_id}-${table.qrCode}`).emit(
          "order-status-update",
          {
            orderId: order.id,
            status: order.status,
          }
        );
      }
    }

    res.status(201).json({
      order_id: order.id,
      order: {
        id: order.id,
        status: order.status,
        total: calculatedTotal.toFixed(2),
        table_name: table ? table.name : null,
        invoice_no: invoiceNo,
      },
      table_id: table ? table.id : null,
      table_name: table ? table.name : null,
      message: "Order created successfully",
    });
  } catch (error) {
    console.error("Error creating customer order:", error);
    res.status(500).json({
      error: "Failed to create order",
      details: error.message,
    });
  }
};

/**
 * Create a new order
 */
exports.createOrder = async (req, res) => {
  try {
    const { vendorId, tableId, items: orderItemsData, totalAmount } = req.body;

    // Validate required fields
    if (!vendorId || !orderItemsData || orderItemsData.length === 0) {
      return res.status(400).json({
        error: "Vendor ID and order items are required",
      });
    }

    // Verify vendor exists
    const vendor = await users.findByPk(vendorId);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    // Find table if tableId provided
    let table = null;
    if (tableId) {
      table = await tables.findOne({
        where: { id: tableId, vendorId },
      });
      if (!table) {
        return res.status(404).json({ error: "Table not found" });
      }
    }

    // Generate invoice number
    const invoiceNo = await generateInvoiceNumber();

    // Create order
    const order = await orders.create({
      vendorId,
      tableId: table ? table.id : null,
      tableIdentifier: table ? table.name : null,
      status: "pending",
      totalAmount: totalAmount || 0,
      invoiceNo,
      paymentStatus: "pending",
      paymentMethod: "cash",
    });

    // Create order items
    let calculatedTotal = 0;
    for (const itemData of orderItemsData) {
      const menuItem = await menuItems.findByPk(itemData.id);
      if (menuItem) {
        await orderItems.create({
          orderId: order.id,
          menuItemId: menuItem.id,
          quantity: itemData.quantity || 1,
          price: menuItem.price,
        });
        calculatedTotal += menuItem.price * (itemData.quantity || 1);
      }
    }

    // Update total amount if not provided
    if (!totalAmount) {
      await order.update({ totalAmount: calculatedTotal });
    }

    // Emit socket event for new order
    const io = req.app.get("io");
    if (io) {
      // Emit order created event
      io.to(`vendor-${vendorId}`).emit("order-created", {
        orderId: order.id,
        status: order.status,
        totalAmount: order.totalAmount,
        tableIdentifier: table ? table.name : null,
      });

      // Emit notification to vendor
      io.to(`vendor-${vendorId}`).emit("notification", {
        id: `order-${order.id}-created`,
        type: "order",
        title: "New Order Received",
        message: `New order #${order.id} from ${
          table ? table.name : "customer"
        }`,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        read: false,
        data: {
          order_id: order.id,
          table_name: table ? table.name : null,
          total_amount: order.totalAmount,
          status: order.status,
        },
      });

      if (table) {
        io.to(`table-${vendorId}-${table.name}`).emit("order-status-update", {
          orderId: order.id,
          status: order.status,
        });
      }
    }

    res.status(201).json({
      orderId: order.id,
      tableId: table ? table.id : null,
      tableName: table ? table.name : null,
      message: "Order created successfully",
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      error: "Failed to create order",
      details: error.message,
    });
  }
};

/**
 * Update order status
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status: newStatus } = req.body;

    // Check authorization
    const order = await orders.findByPk(orderId, {
      include: [{ model: users, as: "vendor" }],
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check authorization - vendors can only access their own data, staff can only access their vendor's data
    const effectiveVendorId =
      req.user.role === "staff" ? req.user.vendorId : req.user.id;
    if (effectiveVendorId !== order.vendorId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Validate status
    const validStatuses = [
      "pending",
      "accepted",
      "confirmed",
      "rejected",
      "preparing",
      "ready",
      "delivered",
      "completed",
      "cancelled",
    ];

    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({
        error: "Invalid status",
        validStatuses,
      });
    }

    const oldStatus = order.status;
    await order.update({ status: newStatus });

    // Emit socket event for status update
    const io = req.app.get("io");
    if (io) {
      // Notify vendor
      io.to(`vendor-${order.vendorId}`).emit("order-status-changed", {
        orderId: order.id,
        oldStatus,
        newStatus,
      });

      // Emit notification for significant status changes
      const notificationMessages = {
        accepted: "Order has been accepted",
        rejected: "Order has been rejected",
        preparing: "Order is being prepared",
        ready: "Order is ready for pickup",
        delivered: "Order has been delivered",
        completed: "Order is completed",
        cancelled: "Order has been cancelled",
      };

      if (notificationMessages[newStatus]) {
        io.to(`vendor-${order.vendorId}`).emit("notification", {
          id: `order-${order.id}-${newStatus}`,
          type: "order",
          title: `Order #${order.id} ${
            newStatus.charAt(0).toUpperCase() + newStatus.slice(1)
          }`,
          message: notificationMessages[newStatus],
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString(),
          read: false,
          data: {
            order_id: order.id,
            old_status: oldStatus,
            new_status: newStatus,
          },
        });
      }

      // Notify customer at table
      if (order.tableIdentifier) {
        io.to(`table-${order.vendorId}-${order.tableIdentifier}`).emit(
          "order-status-update",
          {
            orderId: order.id,
            status: newStatus,
          }
        );
      }
    }

    res.status(200).json({
      message: "Order status updated successfully",
      orderId: order.id,
      oldStatus,
      newStatus,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({
      error: "Failed to update order status",
      details: error.message,
    });
  }
};

/**
 * Get order details
 */
exports.getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await orders.findByPk(orderId, {
      include: [
        {
          model: tables,
          as: "table",
          attributes: ["id", "name", "qrCode"],
        },
        {
          model: orderItems,
          as: "items",
          include: [
            {
              model: menuItems,
              as: "menuItem",
              attributes: ["id", "name", "category", "price"],
            },
          ],
        },
        {
          model: users,
          as: "vendor",
          attributes: ["id", "restaurantName", "ownerName"],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check authorization - only if user is authenticated
    if (req.user) {
      const effectiveVendorId =
        req.user.role === "staff" ? req.user.vendorId : req.user.id;
      if (effectiveVendorId !== order.vendorId && req.user.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized" });
      }
    }

    res.status(200).json({
      id: order.id,
      orderId: `ORD${String(order.id).padStart(3, "0")}`,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      totalAmount: order.totalAmount,
      invoiceNo: order.invoiceNo,
      transactionId: order.transactionId,
      table: order.table,
      vendor: order.vendor,
      items: order.items.map((item) => ({
        id: item.id,
        name: item.menuItem ? item.menuItem.name : "Deleted Item",
        category: item.menuItem ? item.menuItem.category : null,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
      })),
      customerVerified: order.customerVerified,
      verificationTimestamp: order.verificationTimestamp,
      deliveryIssueReported: order.deliveryIssueReported,
      issueDescription: order.issueDescription,
      issueResolved: order.issueResolved,
      resolutionMessage: order.resolutionMessage,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({
      error: "Failed to fetch order details",
      details: error.message,
    });
  }
};

/**
 * Get customer order details (public endpoint)
 */
exports.getCustomerOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await orders.findByPk(orderId, {
      include: [
        {
          model: tables,
          as: "table",
          attributes: ["id", "name", "qrCode"],
        },
        {
          model: users,
          as: "vendor",
          attributes: ["id", "restaurantName"],
        },
        {
          model: orderItems,
          as: "items",
          include: [
            {
              model: menuItems,
              as: "menuItem",
              attributes: ["id", "name", "category", "price"],
            },
          ],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.status(200).json({
      id: order.id,
      invoice_no: order.invoiceNo,
      status: order.status,
      payment_status: order.paymentStatus,
      payment_method: order.paymentMethod,
      total_amount: order.totalAmount,
      table_name: order.table ? order.table.name : order.tableIdentifier,
      table_identifier: order.tableIdentifier,
      vendor_id: order.vendorId,
      vendor_name: order.vendor ? order.vendor.restaurantName : null,
      transaction_id: order.transactionId,
      created_at: order.createdAt,
      items: order.items.map((item) => ({
        id: item.id,
        name: item.menuItem ? item.menuItem.name : "Deleted Item",
        price: item.price,
        quantity: item.quantity,
      })),
    });
  } catch (error) {
    console.error("Error fetching customer order details:", error);
    res.status(500).json({
      error: "Failed to fetch order details",
      details: error.message,
    });
  }
};

/**
 * Update payment status
 */
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentStatus, paymentMethod, transactionId } = req.body;

    const order = await orders.findByPk(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check authorization - vendors can only access their own data, staff can only access their vendor's data
    const effectiveVendorId =
      req.user.role === "staff" ? req.user.vendorId : req.user.id;
    if (effectiveVendorId !== order.vendorId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const updates = {};
    if (paymentStatus) updates.paymentStatus = paymentStatus;
    if (paymentMethod) updates.paymentMethod = paymentMethod;
    if (transactionId) updates.transactionId = transactionId;

    await order.update(updates);

    res.status(200).json({
      message: "Payment status updated successfully",
      orderId: order.id,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      transactionId: order.transactionId,
    });
  } catch (error) {
    console.error("Error updating payment status:", error);
    res.status(500).json({
      error: "Failed to update payment status",
      details: error.message,
    });
  }
};

/**
 * Report delivery issue
 */
exports.reportDeliveryIssue = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { issueDescription } = req.body;

    const order = await orders.findByPk(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    await order.update({
      deliveryIssueReported: true,
      issueReportTimestamp: new Date(),
      issueDescription:
        issueDescription || "Customer reported not receiving order",
    });

    // Emit socket event to vendor
    const io = req.app.get("io");
    if (io) {
      io.to(`vendor-${order.vendorId}`).emit("delivery-issue", {
        orderId: order.id,
        issueDescription:
          issueDescription || "Customer reported not receiving order",
        issueReportTimestamp: order.issueReportTimestamp,
      });

      io.to(`vendor-${order.vendorId}`).emit("notification", {
        id: `order-${order.id}-issue`,
        type: "issue",
        title: "Delivery Issue Reported",
        message: `Customer reported issue with order #${order.id}`,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        read: false,
        data: {
          order_id: order.id,
          issue_description: issueDescription,
        },
      });
    }

    res.status(200).json({
      message: "Delivery issue reported successfully",
      orderId: order.id,
    });
  } catch (error) {
    console.error("Error reporting delivery issue:", error);
    res.status(500).json({
      error: "Failed to report delivery issue",
      details: error.message,
    });
  }
};

/**
 * Resolve delivery issue
 */
exports.resolveDeliveryIssue = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { resolutionMessage } = req.body;

    const order = await orders.findByPk(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check authorization - vendors can only access their own data, staff can only access their vendor's data
    const effectiveVendorId =
      req.user.role === "staff" ? req.user.vendorId : req.user.id;
    if (effectiveVendorId !== order.vendorId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await order.update({
      issueResolved: true,
      issueResolutionTimestamp: new Date(),
      resolutionMessage: resolutionMessage || "Issue has been resolved",
    });

    res.status(200).json({
      message: "Delivery issue resolved successfully",
      orderId: order.id,
    });
  } catch (error) {
    console.error("Error resolving delivery issue:", error);
    res.status(500).json({
      error: "Failed to resolve delivery issue",
      details: error.message,
    });
  }
};

/**
 * Verify order delivery by customer
 */
exports.verifyDelivery = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await orders.findByPk(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    await order.update({
      customerVerified: true,
      verificationTimestamp: new Date(),
    });

    // Emit socket event to vendor
    const io = req.app.get("io");
    if (io) {
      io.to(`vendor-${order.vendorId}`).emit("order-verified", {
        orderId: order.id,
        verificationTimestamp: order.verificationTimestamp,
      });

      io.to(`vendor-${order.vendorId}`).emit("notification", {
        id: `order-${order.id}-verified`,
        type: "verification",
        title: "Order Verified",
        message: `Customer verified delivery of order #${order.id}`,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        read: false,
        data: {
          order_id: order.id,
        },
      });
    }

    res.status(200).json({
      message: "Order delivery verified successfully",
      orderId: order.id,
    });
  } catch (error) {
    console.error("Error verifying delivery:", error);
    res.status(500).json({
      error: "Failed to verify delivery",
      details: error.message,
    });
  }
};

// Helper functions

/**
 * Calculate time elapsed since order creation
 */
function getTimeElapsed(createdAt) {
  const now = new Date();
  const diffMs = now - new Date(createdAt);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  } else if (diffMins > 0) {
    return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
  } else {
    return "Just now";
  }
}

/**
 * Generate unique invoice number
 */
async function generateInvoiceNumber() {
  const lastOrder = await orders.findOne({
    order: [["id", "DESC"]],
  });

  const nextId = lastOrder ? lastOrder.id + 1 : 1;
  return `INV-${String(nextId).padStart(6, "0")}`;
}

module.exports = exports;
