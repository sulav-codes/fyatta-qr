const { v4: uuidv4 } = require("uuid");
const prisma = require("../../config/prisma");
const { canAccessVendor } = require("../../utils/helpers");
const { ServiceError } = require("../../utils/serviceError");

const parsePositiveInt = (value, fieldName) => {
  const parsed = Number.parseInt(String(value), 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    throw new ServiceError(`Invalid ${fieldName}`, { status: 400 });
  }
  return parsed;
};

const assertVendorAccess = (user, vendorId, message) => {
  if (!canAccessVendor(user, vendorId)) {
    throw new ServiceError(message, { status: 403 });
  }
};

const parseBoolean = (value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") {
      return true;
    }

    if (normalized === "false" || normalized === "0") {
      return false;
    }
  }

  return Boolean(value);
};

const getTables = async ({ vendorId, user }) => {
  const parsedVendorId = parsePositiveInt(vendorId, "vendor ID");

  assertVendorAccess(
    user,
    parsedVendorId,
    "You do not have permission to access this data",
  );

  const vendorTables = await prisma.table.findMany({
    where: { vendorId: parsedVendorId },
    orderBy: { name: "asc" },
  });

  return {
    tables: vendorTables.map((table) => ({
      id: table.id,
      name: table.name,
      qrCode: table.qrCode,
      isActive: table.isActive,
      createdAt: table.createdAt,
    })),
  };
};

const createTable = async ({ vendorId, user, body }) => {
  const parsedVendorId = parsePositiveInt(vendorId, "vendor ID");

  assertVendorAccess(
    user,
    parsedVendorId,
    "You do not have permission to perform this action",
  );

  const name = body?.name?.trim();
  if (!name) {
    throw new ServiceError("Table name is required", { status: 400 });
  }

  const existingTable = await prisma.table.findUnique({
    where: {
      vendorId_name: {
        vendorId: parsedVendorId,
        name,
      },
    },
  });

  if (existingTable) {
    throw new ServiceError("A table with this name already exists", {
      status: 400,
    });
  }

  const table = await prisma.table.create({
    data: {
      vendorId: parsedVendorId,
      name,
      qrCode: uuidv4(),
    },
  });

  return {
    message: "Table created successfully",
    table: {
      id: table.id,
      name: table.name,
      qrCode: table.qrCode,
      createdAt: table.createdAt,
    },
  };
};

const updateTable = async ({ vendorId, tableId, user, body }) => {
  const parsedVendorId = parsePositiveInt(vendorId, "vendor ID");
  const parsedTableId = parsePositiveInt(tableId, "table ID");

  assertVendorAccess(
    user,
    parsedVendorId,
    "You do not have permission to perform this action",
  );

  const table = await prisma.table.findFirst({
    where: {
      id: parsedTableId,
      vendorId: parsedVendorId,
    },
  });

  if (!table) {
    throw new ServiceError("Table not found", { status: 404 });
  }

  const updates = {};

  if (body?.name !== undefined) {
    const nextName = String(body.name || "").trim();
    if (!nextName) {
      throw new ServiceError("Table name is required", { status: 400 });
    }

    const existingTable = await prisma.table.findFirst({
      where: {
        vendorId: parsedVendorId,
        name: nextName,
        NOT: {
          id: parsedTableId,
        },
      },
    });

    if (existingTable) {
      throw new ServiceError("A table with this name already exists", {
        status: 400,
      });
    }

    updates.name = nextName;
  }

  if (body?.isActive !== undefined) {
    updates.isActive = parseBoolean(body.isActive);
  }

  const updatedTable = await prisma.table.update({
    where: { id: parsedTableId },
    data: updates,
  });

  return {
    message: "Table updated successfully",
    table: {
      id: updatedTable.id,
      name: updatedTable.name,
      qrCode: updatedTable.qrCode,
      isActive: updatedTable.isActive,
    },
  };
};

const deleteTable = async ({ vendorId, tableId, user }) => {
  const parsedVendorId = parsePositiveInt(vendorId, "vendor ID");
  const parsedTableId = parsePositiveInt(tableId, "table ID");

  assertVendorAccess(
    user,
    parsedVendorId,
    "You do not have permission to perform this action",
  );

  const table = await prisma.table.findFirst({
    where: {
      id: parsedTableId,
      vendorId: parsedVendorId,
    },
    select: { id: true },
  });

  if (!table) {
    throw new ServiceError("Table not found", { status: 404 });
  }

  await prisma.table.delete({
    where: { id: parsedTableId },
  });

  return {
    message: "Table deleted successfully",
  };
};

const regenerateQRCode = async ({ vendorId, tableId, user }) => {
  const parsedVendorId = parsePositiveInt(vendorId, "vendor ID");
  const parsedTableId = parsePositiveInt(tableId, "table ID");

  assertVendorAccess(
    user,
    parsedVendorId,
    "You do not have permission to perform this action",
  );

  const table = await prisma.table.findFirst({
    where: {
      id: parsedTableId,
      vendorId: parsedVendorId,
    },
    select: { id: true },
  });

  if (!table) {
    throw new ServiceError("Table not found", { status: 404 });
  }

  const updatedTable = await prisma.table.update({
    where: { id: parsedTableId },
    data: { qrCode: uuidv4() },
  });

  return {
    message: "QR code regenerated successfully",
    table: {
      id: updatedTable.id,
      name: updatedTable.name,
      qrCode: updatedTable.qrCode,
    },
  };
};

const getTableStatus = async ({ vendorId, tableIdentifier }) => {
  const parsedVendorId = parsePositiveInt(vendorId, "vendor ID");

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      String(tableIdentifier || ""),
    );

  if (!isUuid) {
    throw new ServiceError("Table not found", { status: 404 });
  }

  const table = await prisma.table.findFirst({
    where: {
      vendorId: parsedVendorId,
      qrCode: tableIdentifier,
    },
  });

  if (!table) {
    throw new ServiceError("Table not found", { status: 404 });
  }

  const activeOrder = await prisma.order.findFirst({
    where: {
      tableId: table.id,
      status: {
        in: ["pending", "accepted", "confirmed", "preparing"],
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    table_id: table.id,
    name: table.name,
    qr_code: table.qrCode,
    is_active: table.isActive,
    vendor_id: table.vendorId,
    has_active_order: activeOrder !== null,
    active_order_id: activeOrder ? activeOrder.id : null,
  };
};

const getTableDetails = async ({ vendorId, tableId, user }) => {
  const parsedVendorId = parsePositiveInt(vendorId, "vendor ID");
  const parsedTableId = parsePositiveInt(tableId, "table ID");

  assertVendorAccess(
    user,
    parsedVendorId,
    "You do not have permission to access this data",
  );

  const table = await prisma.table.findFirst({
    where: {
      id: parsedTableId,
      vendorId: parsedVendorId,
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
    throw new ServiceError("Table not found", { status: 404 });
  }

  return {
    id: table.id,
    name: table.name,
    qrCode: table.qrCode,
    isActive: table.isActive,
    createdAt: table.createdAt,
    activeOrders: table.orders || [],
  };
};

module.exports = {
  getTables,
  createTable,
  updateTable,
  deleteTable,
  regenerateQRCode,
  getTableStatus,
  getTableDetails,
};
