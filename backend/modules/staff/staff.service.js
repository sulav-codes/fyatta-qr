const prisma = require("../../config/prisma");
const {
  hashPassword,
  sanitizeUser,
  canAccessVendor,
} = require("../../utils/helpers");
const { ServiceError } = require("../../utils/serviceError");
const { validatePayload } = require("../../utils/serviceValidation");
const staffValidation = require("./staff.validation");

const assertVendorAccess = (user, vendorId, message = "Access denied.") => {
  if (!canAccessVendor(user, vendorId)) {
    throw new ServiceError(message, { status: 403 });
  }
};

const getStaff = async ({ vendorId, user }) => {
  const { vendorId: parsedVendorId } = validatePayload(
    staffValidation.vendorParamsSchema,
    { vendorId },
    { part: "params" },
  );

  assertVendorAccess(
    user,
    parsedVendorId,
    "Access denied. You can only view your own staff members.",
  );

  const staff = await prisma.user.findMany({
    where: {
      vendorId: parsedVendorId,
      role: "staff",
    },
    select: {
      id: true,
      username: true,
      email: true,
      ownerName: true,
      phone: true,
      isActive: true,
      role: true,
      dateJoined: true,
      lastLogin: true,
    },
    orderBy: {
      dateJoined: "desc",
    },
  });

  return {
    success: true,
    staff,
    count: staff.length,
  };
};

const getStaffMember = async ({ vendorId, staffId, user }) => {
  const { vendorId: parsedVendorId, staffId: parsedStaffId } = validatePayload(
    staffValidation.vendorStaffParamsSchema,
    { vendorId, staffId },
    { part: "params" },
  );

  assertVendorAccess(user, parsedVendorId);

  const staff = await prisma.user.findFirst({
    where: {
      id: parsedStaffId,
      vendorId: parsedVendorId,
      role: "staff",
    },
    select: {
      id: true,
      username: true,
      email: true,
      ownerName: true,
      phone: true,
      isActive: true,
      role: true,
      vendorId: true,
      dateJoined: true,
      lastLogin: true,
    },
  });

  if (!staff) {
    throw new ServiceError("Staff member not found", { status: 404 });
  }

  return {
    success: true,
    staff,
  };
};

const createStaff = async ({ vendorId, user, body }) => {
  const { vendorId: parsedVendorId } = validatePayload(
    staffValidation.vendorParamsSchema,
    { vendorId },
    { part: "params" },
  );
  const { username, email, password, ownerName, phone } = validatePayload(
    staffValidation.createStaffBodySchema,
    body || {},
    { part: "body" },
  );

  assertVendorAccess(
    user,
    parsedVendorId,
    "Access denied. You can only create staff for your own restaurant.",
  );

  if (user.role !== "vendor" && user.role !== "admin") {
    throw new ServiceError("Only vendors can create staff members.", {
      status: 403,
    });
  }

  if (!username || !email || !password) {
    throw new ServiceError("Username, email, and password are required", {
      status: 400,
    });
  }

  const trimmedUsername = username.trim();
  const trimmedEmail = email.trim();

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ username: trimmedUsername }, { email: trimmedEmail }],
    },
    select: {
      username: true,
    },
  });

  if (existingUser) {
    throw new ServiceError(
      existingUser.username === trimmedUsername
        ? "Username already exists"
        : "Email already exists",
      { status: 400 },
    );
  }

  const vendor = await prisma.user.findUnique({
    where: { id: parsedVendorId },
    select: {
      restaurantName: true,
      location: true,
    },
  });

  if (!vendor) {
    throw new ServiceError("Vendor not found", { status: 404 });
  }

  const staff = await prisma.user.create({
    data: {
      username: trimmedUsername,
      email: trimmedEmail,
      password: await hashPassword(password),
      ownerName: ownerName || username,
      phone: phone || null,
      role: "staff",
      vendorId: parsedVendorId,
      restaurantName: vendor.restaurantName,
      location: vendor.location,
      isActive: true,
      isStaff: true,
      isSuperuser: false,
    },
  });

  return {
    success: true,
    message: "Staff member created successfully",
    staff: sanitizeUser(staff),
  };
};

const updateStaff = async ({ vendorId, staffId, user, body }) => {
  const { vendorId: parsedVendorId, staffId: parsedStaffId } = validatePayload(
    staffValidation.vendorStaffParamsSchema,
    { vendorId, staffId },
    { part: "params" },
  );
  body = validatePayload(staffValidation.updateStaffBodySchema, body || {}, {
    part: "body",
  });

  assertVendorAccess(user, parsedVendorId);

  const staff = await prisma.user.findFirst({
    where: {
      id: parsedStaffId,
      vendorId: parsedVendorId,
      role: "staff",
    },
    select: {
      id: true,
    },
  });

  if (!staff) {
    throw new ServiceError("Staff member not found", { status: 404 });
  }

  const { username, email, ownerName, phone, isActive, password } = body || {};
  const trimmedUsername = username !== undefined ? username.trim() : undefined;
  const trimmedEmail = email !== undefined ? email.trim() : undefined;

  if (trimmedUsername || trimmedEmail) {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(trimmedUsername ? [{ username: trimmedUsername }] : []),
          ...(trimmedEmail ? [{ email: trimmedEmail }] : []),
        ],
        NOT: {
          id: parsedStaffId,
        },
      },
      select: {
        username: true,
      },
    });

    if (existingUser) {
      throw new ServiceError(
        existingUser.username === trimmedUsername
          ? "Username already exists"
          : "Email already exists",
        { status: 400 },
      );
    }
  }

  const updateData = {};
  if (trimmedUsername !== undefined) updateData.username = trimmedUsername;
  if (trimmedEmail !== undefined) updateData.email = trimmedEmail;
  if (ownerName !== undefined) updateData.ownerName = ownerName;
  if (phone !== undefined) updateData.phone = phone;
  if (isActive !== undefined) updateData.isActive = isActive;

  if (password !== undefined) {
    updateData.password = await hashPassword(password);
  }

  const updatedStaff = await prisma.user.update({
    where: { id: parsedStaffId },
    data: updateData,
  });

  return {
    success: true,
    message: "Staff member updated successfully",
    staff: sanitizeUser(updatedStaff),
  };
};

const deleteStaff = async ({ vendorId, staffId, user }) => {
  const { vendorId: parsedVendorId, staffId: parsedStaffId } = validatePayload(
    staffValidation.vendorStaffParamsSchema,
    { vendorId, staffId },
    { part: "params" },
  );

  assertVendorAccess(user, parsedVendorId);

  const staff = await prisma.user.findFirst({
    where: {
      id: parsedStaffId,
      vendorId: parsedVendorId,
      role: "staff",
    },
    select: { id: true },
  });

  if (!staff) {
    throw new ServiceError("Staff member not found", { status: 404 });
  }

  await prisma.user.delete({
    where: { id: parsedStaffId },
  });

  return {
    success: true,
    message: "Staff member deleted successfully",
  };
};

const toggleStaffStatus = async ({ vendorId, staffId, user }) => {
  const { vendorId: parsedVendorId, staffId: parsedStaffId } = validatePayload(
    staffValidation.vendorStaffParamsSchema,
    { vendorId, staffId },
    { part: "params" },
  );

  assertVendorAccess(user, parsedVendorId);

  const staff = await prisma.user.findFirst({
    where: {
      id: parsedStaffId,
      vendorId: parsedVendorId,
      role: "staff",
    },
    select: {
      id: true,
      isActive: true,
    },
  });

  if (!staff) {
    throw new ServiceError("Staff member not found", { status: 404 });
  }

  const updatedStaff = await prisma.user.update({
    where: { id: parsedStaffId },
    data: {
      isActive: !staff.isActive,
    },
  });

  return {
    success: true,
    message: `Staff member ${updatedStaff.isActive ? "activated" : "deactivated"} successfully`,
    staff: sanitizeUser(updatedStaff),
  };
};

module.exports = {
  getStaff,
  getStaffMember,
  createStaff,
  updateStaff,
  deleteStaff,
  toggleStaffStatus,
};
