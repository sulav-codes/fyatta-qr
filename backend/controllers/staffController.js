const prisma = require("../config/prisma");
const {
  hashPassword,
  sanitizeUser,
  canAccessVendor,
} = require("../utils/helpers");

/**
 * Get all staff members for a vendor
 */
const getStaff = async (req, res) => {
  try {
    const { vendorId } = req.params;

    // Ensure user can only access their own staff
    if (!canAccessVendor(req.user, vendorId)) {
      return res.status(403).json({
        error: "Access denied. You can only view your own staff members.",
      });
    }

    const staff = await prisma.user.findMany({
      where: {
        vendorId: parseInt(vendorId),
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

    res.json({
      success: true,
      staff,
      count: staff.length,
    });
  } catch (error) {
    console.error("Error fetching staff:", error);
    res.status(500).json({
      error: "Failed to fetch staff members",
      details: error.message,
    });
  }
};

/**
 * Get single staff member details
 */
const getStaffMember = async (req, res) => {
  try {
    const { vendorId, staffId } = req.params;

    // Ensure user can only access their own staff
    if (!canAccessVendor(req.user, vendorId)) {
      return res.status(403).json({
        error: "Access denied.",
      });
    }

    const staff = await prisma.user.findFirst({
      where: {
        id: parseInt(staffId),
        vendorId: parseInt(vendorId),
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
      return res.status(404).json({
        error: "Staff member not found",
      });
    }

    res.json({
      success: true,
      staff,
    });
  } catch (error) {
    console.error("Error fetching staff member:", error);
    res.status(500).json({
      error: "Failed to fetch staff member",
      details: error.message,
    });
  }
};

/**
 * Create a new staff member
 */
const createStaff = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { username, email, password, ownerName, phone } = req.body;

    // Ensure user can only create staff for themselves
    if (!canAccessVendor(req.user, vendorId)) {
      return res.status(403).json({
        error:
          "Access denied. You can only create staff for your own restaurant.",
      });
    }

    // Ensure requesting user is a vendor
    if (req.user.role !== "vendor" && req.user.role !== "admin") {
      return res.status(403).json({
        error: "Only vendors can create staff members.",
      });
    }

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        error: "Username, email, and password are required",
      });
    }

    // Check if username or email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username: username.trim() }, { email: email.trim() }],
      },
    });

    if (existingUser) {
      return res.status(400).json({
        error:
          existingUser.username === username.trim()
            ? "Username already exists"
            : "Email already exists",
      });
    }

    // Get vendor details to use as defaults
    const vendor = await prisma.user.findUnique({
      where: { id: parseInt(vendorId) },
    });

    if (!vendor) {
      return res.status(404).json({
        error: "Vendor not found",
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create staff member
    const staff = await prisma.user.create({
      data: {
        username: username.trim(),
        email: email.trim(),
        password: hashedPassword,
        ownerName: ownerName || username,
        phone: phone || null,
        role: "staff",
        vendorId: parseInt(vendorId),
        restaurantName: vendor.restaurantName,
        location: vendor.location,
        isActive: true,
        isStaff: true,
        isSuperuser: false,
      },
    });

    res.status(201).json({
      success: true,
      message: "Staff member created successfully",
      staff: sanitizeUser(staff),
    });
  } catch (error) {
    console.error("Error creating staff member:", error);
    res.status(500).json({
      error: "Failed to create staff member",
      details: error.message,
    });
  }
};

/**
 * Update a staff member
 */
const updateStaff = async (req, res) => {
  try {
    const { vendorId, staffId } = req.params;
    const { username, email, ownerName, phone, isActive, password } = req.body;

    // Ensure user can only update their own staff
    if (!canAccessVendor(req.user, vendorId)) {
      return res.status(403).json({
        error: "Access denied.",
      });
    }

    // Find staff member
    const staff = await prisma.user.findFirst({
      where: {
        id: parseInt(staffId),
        vendorId: parseInt(vendorId),
        role: "staff",
      },
    });

    if (!staff) {
      return res.status(404).json({
        error: "Staff member not found",
      });
    }

    // Check for duplicate username/email (excluding current staff)
    if (username || email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            ...(username ? [{ username: username.trim() }] : []),
            ...(email ? [{ email: email.trim() }] : []),
          ],
          NOT: {
            id: parseInt(staffId),
          },
        },
      });

      if (existingUser) {
        return res.status(400).json({
          error:
            existingUser.username === username
              ? "Username already exists"
              : "Email already exists",
        });
      }
    }

    // Build update data
    const updateData = {};
    if (username !== undefined) updateData.username = username.trim();
    if (email !== undefined) updateData.email = email.trim();
    if (ownerName !== undefined) updateData.ownerName = ownerName;
    if (phone !== undefined) updateData.phone = phone;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password !== undefined) {
      updateData.password = await hashPassword(password);
    }

    // Update staff member
    const updatedStaff = await prisma.user.update({
      where: { id: parseInt(staffId) },
      data: updateData,
    });

    res.json({
      success: true,
      message: "Staff member updated successfully",
      staff: sanitizeUser(updatedStaff),
    });
  } catch (error) {
    console.error("Error updating staff member:", error);
    res.status(500).json({
      error: "Failed to update staff member",
      details: error.message,
    });
  }
};

/**
 * Delete a staff member
 */
const deleteStaff = async (req, res) => {
  try {
    const { vendorId, staffId } = req.params;

    // Ensure user can only delete their own staff
    if (!canAccessVendor(req.user, vendorId)) {
      return res.status(403).json({
        error: "Access denied.",
      });
    }

    // Find and delete staff member
    const staff = await prisma.user.findFirst({
      where: {
        id: parseInt(staffId),
        vendorId: parseInt(vendorId),
        role: "staff",
      },
    });

    if (!staff) {
      return res.status(404).json({
        error: "Staff member not found",
      });
    }

    await prisma.user.delete({
      where: { id: parseInt(staffId) },
    });

    res.json({
      success: true,
      message: "Staff member deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting staff member:", error);
    res.status(500).json({
      error: "Failed to delete staff member",
      details: error.message,
    });
  }
};

/**
 * Toggle staff member active status
 */
const toggleStaffStatus = async (req, res) => {
  try {
    const { vendorId, staffId } = req.params;

    // Ensure user can only update their own staff
    if (!canAccessVendor(req.user, vendorId)) {
      return res.status(403).json({
        error: "Access denied.",
      });
    }

    const staff = await prisma.user.findFirst({
      where: {
        id: parseInt(staffId),
        vendorId: parseInt(vendorId),
        role: "staff",
      },
    });

    if (!staff) {
      return res.status(404).json({
        error: "Staff member not found",
      });
    }

    const updatedStaff = await prisma.user.update({
      where: { id: parseInt(staffId) },
      data: {
        isActive: !staff.isActive,
      },
    });

    res.json({
      success: true,
      message: `Staff member ${
        updatedStaff.isActive ? "activated" : "deactivated"
      } successfully`,
      staff: sanitizeUser(updatedStaff),
    });
  } catch (error) {
    console.error("Error toggling staff status:", error);
    res.status(500).json({
      error: "Failed to toggle staff status",
      details: error.message,
    });
  }
};

module.exports = {
  getStaff,
  getStaffMember,
  createStaff,
  updateStaff,
  deleteStaff,
  toggleStaffStatus,
};
