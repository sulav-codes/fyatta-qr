const prisma = require("../../config/prisma");
const { v4: uuidv4 } = require("uuid");
const {
  emitOrderCreated,
  emitOrderStatusChanged,
  emitOrderStatusUpdate,
  emitDeliveryIssue,
  emitOrderVerified,
  emitVendorNotification,
} = require("../../sockets/order.socket");
const { ServiceError } = require("../../utils/serviceError");
const { validatePayload } = require("../../utils/serviceValidation");
const orderValidation = require("./order.validation");

const VALID_ORDER_STATUSES = [
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

const INVOICE_CREATE_MAX_RETRIES = 5;

const parsePositiveInt = (value, fieldName) => {
  const parsed = Number.parseInt(String(value), 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    throw new ServiceError(`Invalid ${fieldName}`, { status: 400 });
  }

  return parsed;
};

const resolveRequesterVendorId = (user) => {
  if (user.role === "staff") {
    if (!user.vendorId) {
      throw new ServiceError(
        "Staff user not properly configured - missing vendorId",
        {
          status: 403,
        },
      );
    }

    return user.vendorId;
  }

  return user.id;
};

const assertVendorAccess = (user, vendorId) => {
  const effectiveVendorId = resolveRequesterVendorId(user);

  if (effectiveVendorId !== vendorId && user.role !== "admin") {
    throw new ServiceError("Unauthorized", { status: 403 });
  }
};

const getTimeElapsed = (createdAt) => {
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
};

const generateInvoiceNumber = () => {
  return `INV-${uuidv4().toUpperCase()}`;
};

const isInvoiceUniqueConstraintError = (error) => {
  if (error?.code !== "P2002") {
    return false;
  }

  const target = error?.meta?.target;
  if (Array.isArray(target)) {
    return target.some((field) =>
      String(field).toLowerCase().includes("invoice"),
    );
  }

  return String(target || "")
    .toLowerCase()
    .includes("invoice");
};

const createOrderWithUniqueInvoice = async (
  orderData,
  prismaClient = prisma,
) => {
  for (let attempt = 1; attempt <= INVOICE_CREATE_MAX_RETRIES; attempt += 1) {
    const invoiceNo = generateInvoiceNumber();

    try {
      const order = await prismaClient.order.create({
        data: {
          ...orderData,
          invoiceNo,
        },
      });

      return { order, invoiceNo };
    } catch (error) {
      if (
        !isInvoiceUniqueConstraintError(error) ||
        attempt === INVOICE_CREATE_MAX_RETRIES
      ) {
        throw error;
      }
    }
  }

  throw new ServiceError("Failed to generate unique invoice number", {
    status: 500,
  });
};

const getOrders = async ({ vendorId, user }) => {
  const { vendorId: parsedVendorId } = validatePayload(
    orderValidation.vendorParamsSchema,
    { vendorId },
    { part: "params" },
  );

  assertVendorAccess(user, parsedVendorId);

  const vendorOrders = await prisma.order.findMany({
    where: { vendorId: parsedVendorId },
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
      timeElapsed: getTimeElapsed(createdAt),
      items: order.items.map((item) => ({
        id: item.id,
        name: item.menuItem ? item.menuItem.name : "Deleted Item",
        price: Number(item.price),
        quantity: item.quantity,
      })),
      customerVerified: order.deliveryVerified,
      verificationTimestamp: order.deliveryVerifiedAt,
      deliveryIssueReported: order.issueReported,
      issueReportTimestamp: order.issueReportedAt,
      issueDescription: order.issueDescription,
    };
  });

  return {
    orders: ordersData,
    count: ordersData.length,
  };
};

const resolveOrderItems = async ({ rawItems, vendorId }) => {
  const menuItemIds = rawItems
    .map((item) => Number.parseInt(String(item?.id), 10))
    .filter((id) => !Number.isNaN(id));

  if (menuItemIds.length === 0) {
    return [];
  }

  const menuItems = await prisma.menuItem.findMany({
    where: {
      id: { in: menuItemIds },
      vendorId,
    },
    select: {
      id: true,
      name: true,
      price: true,
    },
  });

  const menuItemById = new Map(
    menuItems.map((menuItem) => [menuItem.id, menuItem]),
  );

  return rawItems.reduce((acc, itemData) => {
    const menuItemId = Number.parseInt(String(itemData?.id), 10);
    const menuItem = menuItemById.get(menuItemId);

    if (!menuItem) {
      return acc;
    }

    const quantity = Number.parseInt(String(itemData.quantity || 1), 10);
    acc.push({
      menuItem,
      quantity: Number.isNaN(quantity) || quantity < 1 ? 1 : quantity,
    });

    return acc;
  }, []);
};

const createCustomerOrder = async ({ body }) => {
  const validatedBody = validatePayload(
    orderValidation.createCustomerOrderBodySchema,
    body || {},
    { part: "body", prefs: { allowUnknown: true } },
  );
  const vendorId = parsePositiveInt(validatedBody.vendor_id, "vendor ID");
  const tableIdentifier = validatedBody.table_identifier || null;
  const orderItemsData = Array.isArray(validatedBody.items)
    ? validatedBody.items
    : [];

  if (orderItemsData.length === 0) {
    throw new ServiceError("Vendor ID and order items are required", {
      status: 400,
    });
  }

  const vendor = await prisma.user.findUnique({
    where: { id: vendorId },
    select: { id: true, restaurantName: true },
  });

  if (!vendor) {
    throw new ServiceError("Vendor not found", { status: 404 });
  }

  let table = null;
  if (tableIdentifier) {
    table = await prisma.table.findFirst({
      where: {
        vendorId,
        OR: [{ qrCode: tableIdentifier }, { name: tableIdentifier }],
      },
      select: {
        id: true,
        name: true,
        qrCode: true,
      },
    });
  }

  const validItems = await resolveOrderItems({
    rawItems: orderItemsData,
    vendorId,
  });

  if (validItems.length === 0) {
    throw new ServiceError("No valid menu items found", { status: 400 });
  }

  const calculatedTotal = validItems.reduce((sum, { menuItem, quantity }) => {
    return sum + Number(menuItem.price) * quantity;
  }, 0);

  const { order, invoiceNo } = await createOrderWithUniqueInvoice({
    vendorId,
    tableId: table ? table.id : null,
    tableIdentifier: tableIdentifier || null,
    status: "pending",
    totalAmount: calculatedTotal,
    paymentStatus: "pending",
    paymentMethod: "cash",
  });

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

  const itemsForNotification = validItems.map(({ menuItem, quantity }) => ({
    name: menuItem.name,
    quantity,
    price: Number(menuItem.price),
  }));

  emitOrderCreated(vendorId, {
    orderId: order.id,
    status: order.status,
    totalAmount: Number(order.totalAmount),
    tableIdentifier: table ? table.name : tableIdentifier,
    tableName: table ? table.name : null,
  });

  emitVendorNotification(vendorId, {
    id: `order-${order.id}-created`,
    type: "order",
    title: "New Order Received",
    message: `New order #${order.id} from ${table ? table.name : "customer"}`,
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
    emitOrderStatusUpdate(vendorId, table.qrCode, {
      orderId: order.id,
      status: order.status,
    });
  }

  return {
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
  };
};

const createOrder = async ({ body, user }) => {
  const validatedBody = validatePayload(
    orderValidation.createOrderBodySchema,
    body || {},
    { part: "body", prefs: { allowUnknown: true } },
  );
  const parsedVendorId = parsePositiveInt(validatedBody.vendorId, "vendor ID");

  assertVendorAccess(user, parsedVendorId);

  const orderItemsData = Array.isArray(validatedBody.items)
    ? validatedBody.items
    : [];
  if (orderItemsData.length === 0) {
    throw new ServiceError("Vendor ID and order items are required", {
      status: 400,
    });
  }

  let table = null;
  if (validatedBody?.tableId) {
    const parsedTableId = parsePositiveInt(validatedBody.tableId, "table ID");

    table = await prisma.table.findFirst({
      where: {
        id: parsedTableId,
        vendorId: parsedVendorId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!table) {
      throw new ServiceError("Table not found", { status: 404 });
    }
  }

  const validItems = await resolveOrderItems({
    rawItems: orderItemsData,
    vendorId: parsedVendorId,
  });

  if (validItems.length === 0) {
    throw new ServiceError("No valid menu items found", { status: 400 });
  }

  const calculatedTotal = validItems.reduce((sum, { menuItem, quantity }) => {
    return sum + Number(menuItem.price) * quantity;
  }, 0);

  const order = await prisma.$transaction(async (tx) => {
    const { order: createdOrder } = await createOrderWithUniqueInvoice(
      {
        vendorId: parsedVendorId,
        tableId: table ? table.id : null,
        tableIdentifier: table ? table.name : null,
        status: "pending",
        totalAmount: calculatedTotal,
        paymentStatus: "pending",
        paymentMethod: "cash",
      },
      tx,
    );

    await tx.orderItem.createMany({
      data: validItems.map(({ menuItem, quantity }) => ({
        orderId: createdOrder.id,
        menuItemId: menuItem.id,
        quantity,
        price: menuItem.price,
      })),
    });

    return createdOrder;
  });

  emitOrderCreated(parsedVendorId, {
    orderId: order.id,
    status: order.status,
    totalAmount: calculatedTotal,
    tableIdentifier: table ? table.name : null,
  });

  const now = new Date().toISOString();
  emitVendorNotification(parsedVendorId, {
    id: `order-${order.id}-created`,
    type: "order",
    title: "New Order Received",
    message: `New order #${order.id} from ${table ? table.name : "customer"}`,
    timestamp: now,
    created_at: now,
    read: false,
    data: {
      order_id: order.id,
      table_name: table ? table.name : null,
      total_amount: calculatedTotal,
      status: order.status,
    },
  });

  if (table) {
    emitOrderStatusUpdate(parsedVendorId, table.name, {
      orderId: order.id,
      status: order.status,
    });
  }

  return {
    orderId: order.id,
    tableId: table ? table.id : null,
    tableName: table ? table.name : null,
    message: "Order created successfully",
  };
};

const updateOrderStatus = async ({ orderId, body, user }) => {
  const { orderId: parsedOrderId } = validatePayload(
    orderValidation.orderParamsSchema,
    { orderId },
    { part: "params" },
  );
  const { status: newStatus } = validatePayload(
    orderValidation.updateOrderStatusBodySchema,
    body || {},
    { part: "body" },
  );

  const order = await prisma.order.findUnique({
    where: { id: parsedOrderId },
    include: {
      vendor: {
        select: { id: true },
      },
    },
  });

  if (!order) {
    throw new ServiceError("Order not found", { status: 404 });
  }

  assertVendorAccess(user, order.vendorId);

  if (!VALID_ORDER_STATUSES.includes(newStatus)) {
    throw new ServiceError("Invalid status", {
      status: 400,
      details: { validStatuses: VALID_ORDER_STATUSES },
    });
  }

  const oldStatus = order.status;

  await prisma.order.update({
    where: { id: parsedOrderId },
    data: { status: newStatus },
  });

  emitOrderStatusChanged(order.vendorId, {
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
    emitVendorNotification(order.vendorId, {
      id: `order-${order.id}-${newStatus}`,
      type: "order",
      title: `Order #${order.id} ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
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
    emitOrderStatusUpdate(order.vendorId, order.tableIdentifier, {
      orderId: order.id,
      status: newStatus,
    });
  }

  return {
    message: "Order status updated successfully",
    orderId: order.id,
    oldStatus,
    newStatus,
  };
};

const getOrderDetails = async ({ orderId, user }) => {
  const { orderId: parsedOrderId } = validatePayload(
    orderValidation.orderParamsSchema,
    { orderId },
    { part: "params" },
  );

  const order = await prisma.order.findUnique({
    where: { id: parsedOrderId },
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
    throw new ServiceError("Order not found", { status: 404 });
  }

  if (user) {
    assertVendorAccess(user, order.vendorId);
  }

  return {
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
    customerVerified: order.deliveryVerified,
    verificationTimestamp: order.deliveryVerifiedAt,
    deliveryIssueReported: order.issueReported,
    issueDescription: order.issueDescription,
    issueResolved: order.issueResolved,
    resolutionMessage: order.resolutionMessage,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
};

const getCustomerOrderDetails = async ({ orderId }) => {
  const { orderId: parsedOrderId } = validatePayload(
    orderValidation.orderParamsSchema,
    { orderId },
    { part: "params" },
  );

  const order = await prisma.order.findUnique({
    where: { id: parsedOrderId },
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
    throw new ServiceError("Order not found", { status: 404 });
  }

  return {
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
  };
};

const updatePaymentStatus = async ({ orderId, body, user }) => {
  const { orderId: parsedOrderId } = validatePayload(
    orderValidation.orderParamsSchema,
    { orderId },
    { part: "params" },
  );
  const validatedBody = validatePayload(
    orderValidation.updatePaymentStatusBodySchema,
    body || {},
    { part: "body" },
  );

  const order = await prisma.order.findUnique({
    where: { id: parsedOrderId },
    select: {
      id: true,
      vendorId: true,
    },
  });

  if (!order) {
    throw new ServiceError("Order not found", { status: 404 });
  }

  assertVendorAccess(user, order.vendorId);

  const updates = {};
  if (validatedBody?.paymentStatus)
    updates.paymentStatus = validatedBody.paymentStatus;
  if (validatedBody?.paymentMethod)
    updates.paymentMethod = validatedBody.paymentMethod;
  if (validatedBody?.transactionId)
    updates.transactionId = validatedBody.transactionId;

  const updated = await prisma.order.update({
    where: { id: parsedOrderId },
    data: updates,
  });

  return {
    message: "Payment status updated successfully",
    orderId: updated.id,
    paymentStatus: updated.paymentStatus,
    paymentMethod: updated.paymentMethod,
    transactionId: updated.transactionId,
  };
};

const reportDeliveryIssue = async ({ orderId, body }) => {
  const { orderId: parsedOrderId } = validatePayload(
    orderValidation.orderParamsSchema,
    { orderId },
    { part: "params" },
  );
  const validatedBody = validatePayload(
    orderValidation.reportDeliveryIssueBodySchema,
    body || {},
    { part: "body", prefs: { allowUnknown: true } },
  );
  const issueDescription =
    validatedBody?.issueDescription || "Customer reported not receiving order";

  const order = await prisma.order.findUnique({
    where: { id: parsedOrderId },
    select: {
      id: true,
      vendorId: true,
    },
  });

  if (!order) {
    throw new ServiceError("Order not found", { status: 404 });
  }

  const updated = await prisma.order.update({
    where: { id: parsedOrderId },
    data: {
      issueReported: true,
      issueReportedAt: new Date(),
      issueDescription,
    },
  });

  emitDeliveryIssue(order.vendorId, {
    orderId: order.id,
    issueDescription,
    issueReportTimestamp: updated.issueReportedAt,
  });

  emitVendorNotification(order.vendorId, {
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

  return {
    message: "Delivery issue reported successfully",
    orderId: order.id,
  };
};

const resolveDeliveryIssue = async ({ orderId, body, user }) => {
  const { orderId: parsedOrderId } = validatePayload(
    orderValidation.orderParamsSchema,
    { orderId },
    { part: "params" },
  );
  const validatedBody = validatePayload(
    orderValidation.resolveDeliveryIssueBodySchema,
    body || {},
    { part: "body", prefs: { allowUnknown: true } },
  );
  const resolutionMessage =
    validatedBody?.resolutionMessage || "Issue has been resolved";

  const order = await prisma.order.findUnique({
    where: { id: parsedOrderId },
    select: {
      id: true,
      vendorId: true,
    },
  });

  if (!order) {
    throw new ServiceError("Order not found", { status: 404 });
  }

  assertVendorAccess(user, order.vendorId);

  await prisma.order.update({
    where: { id: parsedOrderId },
    data: {
      issueResolved: true,
      issueResolutionTimestamp: new Date(),
      resolutionMessage,
    },
  });

  return {
    message: "Delivery issue resolved successfully",
    orderId: order.id,
  };
};

const verifyDelivery = async ({ orderId }) => {
  const { orderId: parsedOrderId } = validatePayload(
    orderValidation.orderParamsSchema,
    { orderId },
    { part: "params" },
  );

  const order = await prisma.order.findUnique({
    where: { id: parsedOrderId },
    select: {
      id: true,
      vendorId: true,
    },
  });

  if (!order) {
    throw new ServiceError("Order not found", { status: 404 });
  }

  const updated = await prisma.order.update({
    where: { id: parsedOrderId },
    data: {
      deliveryVerified: true,
      deliveryVerifiedAt: new Date(),
    },
  });

  emitOrderVerified(order.vendorId, {
    orderId: order.id,
    verificationTimestamp: updated.deliveryVerifiedAt,
  });

  emitVendorNotification(order.vendorId, {
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

  return {
    message: "Order delivery verified successfully",
    orderId: order.id,
  };
};

module.exports = {
  getOrders,
  createCustomerOrder,
  createOrder,
  updateOrderStatus,
  getOrderDetails,
  getCustomerOrderDetails,
  updatePaymentStatus,
  reportDeliveryIssue,
  resolveDeliveryIssue,
  verifyDelivery,
};
