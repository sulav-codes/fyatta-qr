const prisma = require("../../config/prisma");

//Get all orders for a vendor
exports.getOrders = async (req, res) => {
  try {
    const vendorId = parseInt(req.params.vendorId, 10);

    let effectiveVendorId;
    if (req.user.role === "staff") {
      effectiveVendorId = req.user.vendorId;
      if (!effectiveVendorId) {
        return res.status(403).json({
          error: "Staff user not properly configured - missing vendorId",
        });
      }
    } else {
      effectiveVendorId = req.user.id;
    }

    if (effectiveVendorId !== vendorId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const vendor = await prisma.user.findUnique({
      where: { id: vendorId },
      select: { id: true },
    });

    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    const vendorOrders = await prisma.order.findMany({
      where: { vendorId },
      include: {
        table: {
          select: {
            id: true,
            name: true,
            qrCode: true,
          },
        },
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const ordersData = vendorOrders.map((order) => {
      const createdAt = order.createdAt;
      const timeElapsed = getTimeElapsed(createdAt);
      const tableName = order.table
        ? order.table.name
        : order.tableIdentifier || "Unknown";

      return {
        id: order.id,
        orderId: `ORD${String(order.id).padStart(3, "0")}`,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        totalAmount: Number(order.totalAmount),
        tableName,
        tableId: order.table ? order.table.id : null,
        tableIdentifier: order.tableIdentifier,
        qrCode: order.table ? order.table.qrCode : order.tableIdentifier,
        invoiceNo: order.invoiceNo,
        createdAt,
        timestamp: createdAt,
        timeElapsed,
        items: order.items.map((item) => ({
          id: item.id,
          name: item.menuItem ? item.menuItem.name : "Deleted Item",
          price: Number(item.price),
          quantity: item.quantity,
        })),
        // Backward-compatible response keys
        customerVerified: order.deliveryVerified,
        verificationTimestamp: order.deliveryVerifiedAt,
        deliveryIssueReported: order.issueReported,
        issueReportTimestamp: order.issueReportedAt,
        issueDescription: order.issueDescription,
      };
    });

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

//Create a new order from customer (public endpoint)
exports.createCustomerOrder = async (req, res) => {
  try {
    const { vendor_id, table_identifier, items: orderItemsData } = req.body;

    if (!vendor_id || !orderItemsData || orderItemsData.length === 0) {
      return res.status(400).json({
        error: "Vendor ID and order items are required",
      });
    }

    const vendorId = parseInt(vendor_id, 10);

    const vendor = await prisma.user.findUnique({
      where: { id: vendorId },
      select: { id: true, restaurantName: true },
    });

    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    let table = null;
    if (table_identifier) {
      table = await prisma.table.findFirst({
        where: {
          vendorId,
          OR: [{ qrCode: table_identifier }, { name: table_identifier }],
        },
      });
      console.log(
        "[createCustomerOrder] Table lookup result:",
        table ? table.name : "not found",
      );
    }

    let calculatedTotal = 0;
    const validItems = [];

    for (const itemData of orderItemsData) {
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: parseInt(itemData.id, 10) },
      });

      if (menuItem) {
        const quantity = itemData.quantity || 1;
        calculatedTotal += Number(menuItem.price) * quantity;
        validItems.push({ menuItem, quantity });
      }
    }

    if (validItems.length === 0) {
      return res.status(400).json({ error: "No valid menu items found" });
    }

    const invoiceNo = await generateInvoiceNumber();

    const order = await prisma.order.create({
      data: {
        vendorId,
        tableId: table ? table.id : null,
        tableIdentifier: table_identifier || null,
        status: "pending",
        totalAmount: calculatedTotal,
        invoiceNo,
        paymentStatus: "pending",
        paymentMethod: "cash",
      },
    });

    console.log("[createCustomerOrder] Order created:", order.id);

    await prisma.$transaction(
      validItems.map(({ menuItem, quantity }) =>
        prisma.orderItem.create({
          data: {
            orderId: order.id,
            menuItemId: menuItem.id,
            quantity,
            price: menuItem.price,
          },
        }),
      ),
    );

    console.log("[createCustomerOrder] Order items created");

    const orderWithItems = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        items: {
          include: {
            menuItem: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    const itemsForNotification = (orderWithItems?.items || []).map((item) => ({
      name: item.menuItem ? item.menuItem.name : "Unknown Item",
      quantity: item.quantity,
      price: Number(item.price),
    }));

    const io = req.app.get("io");
    if (io) {
      io.to(`vendor-${vendorId}`).emit("order-created", {
        orderId: order.id,
        status: order.status,
        totalAmount: Number(order.totalAmount),
        tableIdentifier: table ? table.name : table_identifier,
        tableName: table ? table.name : null,
      });

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
          total_amount: Number(order.totalAmount),
          status: order.status,
          items: itemsForNotification,
        },
      });

      if (table) {
        io.to(`table-${vendorId}-${table.qrCode}`).emit("order-status-update", {
          orderId: order.id,
          status: order.status,
        });
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

//Create a new order
exports.createOrder = async (req, res) => {
  try {
    const { vendorId, tableId, items: orderItemsData, totalAmount } = req.body;

    if (!vendorId || !orderItemsData || orderItemsData.length === 0) {
      return res.status(400).json({
        error: "Vendor ID and order items are required",
      });
    }

    const parsedVendorId = parseInt(vendorId, 10);

    const vendor = await prisma.user.findUnique({
      where: { id: parsedVendorId },
      select: { id: true },
    });

    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    let table = null;
    if (tableId) {
      table = await prisma.table.findFirst({
        where: {
          id: parseInt(tableId, 10),
          vendorId: parsedVendorId,
        },
      });

      if (!table) {
        return res.status(404).json({ error: "Table not found" });
      }
    }

    const invoiceNo = await generateInvoiceNumber();

    const order = await prisma.order.create({
      data: {
        vendorId: parsedVendorId,
        tableId: table ? table.id : null,
        tableIdentifier: table ? table.name : null,
        status: "pending",
        totalAmount: totalAmount || 0,
        invoiceNo,
        paymentStatus: "pending",
        paymentMethod: "cash",
      },
    });

    let calculatedTotal = 0;

    for (const itemData of orderItemsData) {
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: parseInt(itemData.id, 10) },
      });

      if (menuItem) {
        const quantity = itemData.quantity || 1;
        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            menuItemId: menuItem.id,
            quantity,
            price: menuItem.price,
          },
        });
        calculatedTotal += Number(menuItem.price) * quantity;
      }
    }

    if (!totalAmount) {
      await prisma.order.update({
        where: { id: order.id },
        data: { totalAmount: calculatedTotal },
      });
    }

    const io = req.app.get("io");
    if (io) {
      io.to(`vendor-${parsedVendorId}`).emit("order-created", {
        orderId: order.id,
        status: order.status,
        totalAmount: totalAmount || calculatedTotal,
        tableIdentifier: table ? table.name : null,
      });

      io.to(`vendor-${parsedVendorId}`).emit("notification", {
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
          total_amount: totalAmount || calculatedTotal,
          status: order.status,
        },
      });

      if (table) {
        io.to(`table-${parsedVendorId}-${table.name}`).emit(
          "order-status-update",
          {
            orderId: order.id,
            status: order.status,
          },
        );
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

//Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);
    const { status: newStatus } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        vendor: {
          select: { id: true },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const effectiveVendorId =
      req.user.role === "staff" ? req.user.vendorId : req.user.id;

    if (effectiveVendorId !== order.vendorId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

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

    await prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus },
    });

    const io = req.app.get("io");
    if (io) {
      io.to(`vendor-${order.vendorId}`).emit("order-status-changed", {
        orderId: order.id,
        oldStatus,
        newStatus,
      });

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

      if (order.tableIdentifier) {
        io.to(`table-${order.vendorId}-${order.tableIdentifier}`).emit(
          "order-status-update",
          {
            orderId: order.id,
            status: newStatus,
          },
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

//Get order details
exports.getOrderDetails = async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        table: {
          select: {
            id: true,
            name: true,
            qrCode: true,
          },
        },
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                category: true,
                price: true,
              },
            },
          },
        },
        vendor: {
          select: {
            id: true,
            restaurantName: true,
            ownerName: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

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
      totalAmount: Number(order.totalAmount),
      invoiceNo: order.invoiceNo,
      transactionId: order.transactionId,
      table: order.table,
      vendor: order.vendor,
      items: order.items.map((item) => ({
        id: item.id,
        name: item.menuItem ? item.menuItem.name : "Deleted Item",
        category: item.menuItem ? item.menuItem.category : null,
        price: Number(item.price),
        quantity: item.quantity,
        subtotal: Number(item.price) * item.quantity,
      })),
      // Backward-compatible response keys
      customerVerified: order.deliveryVerified,
      verificationTimestamp: order.deliveryVerifiedAt,
      deliveryIssueReported: order.issueReported,
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

//Get customer order details (public endpoint)
exports.getCustomerOrderDetails = async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        table: {
          select: {
            id: true,
            name: true,
            qrCode: true,
          },
        },
        vendor: {
          select: {
            id: true,
            restaurantName: true,
          },
        },
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                category: true,
                price: true,
              },
            },
          },
        },
      },
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
      total_amount: Number(order.totalAmount),
      table_name: order.table ? order.table.name : order.tableIdentifier,
      table_identifier: order.tableIdentifier,
      vendor_id: order.vendorId,
      vendor_name: order.vendor ? order.vendor.restaurantName : null,
      transaction_id: order.transactionId,
      created_at: order.createdAt,
      items: order.items.map((item) => ({
        id: item.id,
        name: item.menuItem ? item.menuItem.name : "Deleted Item",
        price: Number(item.price),
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

//Update payment status
exports.updatePaymentStatus = async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);
    const { paymentStatus, paymentMethod, transactionId } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const effectiveVendorId =
      req.user.role === "staff" ? req.user.vendorId : req.user.id;

    if (effectiveVendorId !== order.vendorId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const updates = {};
    if (paymentStatus) updates.paymentStatus = paymentStatus;
    if (paymentMethod) updates.paymentMethod = paymentMethod;
    if (transactionId) updates.transactionId = transactionId;

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: updates,
    });

    res.status(200).json({
      message: "Payment status updated successfully",
      orderId: updated.id,
      paymentStatus: updated.paymentStatus,
      paymentMethod: updated.paymentMethod,
      transactionId: updated.transactionId,
    });
  } catch (error) {
    console.error("Error updating payment status:", error);
    res.status(500).json({
      error: "Failed to update payment status",
      details: error.message,
    });
  }
};

//Report delivery issue
exports.reportDeliveryIssue = async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);
    const { issueDescription } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        issueReported: true,
        issueReportedAt: new Date(),
        issueDescription:
          issueDescription || "Customer reported not receiving order",
      },
    });

    const io = req.app.get("io");
    if (io) {
      io.to(`vendor-${order.vendorId}`).emit("delivery-issue", {
        orderId: order.id,
        issueDescription:
          issueDescription || "Customer reported not receiving order",
        issueReportTimestamp: updated.issueReportedAt,
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

//Resolve delivery issue
exports.resolveDeliveryIssue = async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);
    const { resolutionMessage } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const effectiveVendorId =
      req.user.role === "staff" ? req.user.vendorId : req.user.id;

    if (effectiveVendorId !== order.vendorId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        issueResolved: true,
        issueResolutionTimestamp: new Date(),
        resolutionMessage: resolutionMessage || "Issue has been resolved",
      },
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

//Verify order delivery by customer
exports.verifyDelivery = async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        deliveryVerified: true,
        deliveryVerifiedAt: new Date(),
      },
    });

    const io = req.app.get("io");
    if (io) {
      io.to(`vendor-${order.vendorId}`).emit("order-verified", {
        orderId: order.id,
        verificationTimestamp: updated.deliveryVerifiedAt,
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

function getTimeElapsed(createdAt) {
  const now = new Date();
  const diffMs = now - new Date(createdAt);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  }
  if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  }
  if (diffMins > 0) {
    return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
  }
  return "Just now";
}

async function generateInvoiceNumber() {
  const lastOrder = await prisma.order.findFirst({
    orderBy: { id: "desc" },
    select: { id: true },
  });

  const nextId = lastOrder ? lastOrder.id + 1 : 1;
  return `INV-${String(nextId).padStart(6, "0")}`;
}
