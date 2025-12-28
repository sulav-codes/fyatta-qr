const { users } = require("../models/index");
const { Op } = require("sequelize");

/**
 * Get all staff members for a vendor
 */
const getStaff = async (req, res) => {
  try {
    const { vendorId } = req.params;

    // Ensure user can only access their own staff
    if (req.user.id !== parseInt(vendorId) && req.user.role !== "admin") {
      return res.status(403).json({
        error: "Access denied. You can only view your own staff members.",
      });
    }

    const staff = await users.findAll({
      where: {
        vendorId: vendorId,
        role: "staff",
      },
      attributes: [
        "id",
        "username",
        "email",
        "ownerName",
        "phone",
        "isActive",
        "role",
        "dateJoined",
        "lastLogin",
      ],
      order: [["dateJoined", "DESC"]],
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
    if (req.user.id !== parseInt(vendorId) && req.user.role !== "admin") {
      return res.status(403).json({
        error: "Access denied.",
      });
    }

    const staff = await users.findOne({
      where: {
        id: staffId,
        vendorId: vendorId,
        role: "staff",
      },
      attributes: [
        "id",
        "username",
        "email",
        "ownerName",
        "phone",
        "isActive",
        "role",
        "vendorId",
        "dateJoined",
        "lastLogin",
      ],
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
    if (req.user.id !== parseInt(vendorId) && req.user.role !== "admin") {
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
    const existingUser = await users.findOne({
      where: {
        [Op.or]: [{ username }, { email }],
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

    // Get vendor details to use as defaults
    const vendor = await users.findByPk(vendorId);
    if (!vendor) {
      return res.status(404).json({
        error: "Vendor not found",
      });
    }

    // Create staff member
    const staff = await users.create({
      username,
      email,
      password, // Will be hashed by beforeCreate hook
      ownerName: ownerName || username,
      phone,
      role: "staff",
      vendorId: vendorId,
      restaurantName: vendor.restaurantName,
      location: vendor.location,
      isActive: true,
      isStaff: true,
      isSuperuser: false,
    });

    // Remove password from response
    const staffData = staff.toJSON();

    res.status(201).json({
      success: true,
      message: "Staff member created successfully",
      staff: staffData,
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
    if (req.user.id !== parseInt(vendorId) && req.user.role !== "admin") {
      return res.status(403).json({
        error: "Access denied.",
      });
    }

    // Find staff member
    const staff = await users.findOne({
      where: {
        id: staffId,
        vendorId: vendorId,
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
      const existingUser = await users.findOne({
        where: {
          [Op.or]: [
            ...(username ? [{ username }] : []),
            ...(email ? [{ email }] : []),
          ],
          id: { [Op.ne]: staffId },
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

    // Update staff member
    const updateData = {};
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (ownerName !== undefined) updateData.ownerName = ownerName;
    if (phone !== undefined) updateData.phone = phone;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password !== undefined) updateData.password = password; // Will be hashed by beforeUpdate hook

    await staff.update(updateData);

    res.json({
      success: true,
      message: "Staff member updated successfully",
      staff: staff.toJSON(),
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
    if (req.user.id !== parseInt(vendorId) && req.user.role !== "admin") {
      return res.status(403).json({
        error: "Access denied.",
      });
    }

    // Find and delete staff member
    const staff = await users.findOne({
      where: {
        id: staffId,
        vendorId: vendorId,
        role: "staff",
      },
    });

    if (!staff) {
      return res.status(404).json({
        error: "Staff member not found",
      });
    }

    await staff.destroy();

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
    if (req.user.id !== parseInt(vendorId) && req.user.role !== "admin") {
      return res.status(403).json({
        error: "Access denied.",
      });
    }

    const staff = await users.findOne({
      where: {
        id: staffId,
        vendorId: vendorId,
        role: "staff",
      },
    });

    if (!staff) {
      return res.status(404).json({
        error: "Staff member not found",
      });
    }

    await staff.update({
      isActive: !staff.isActive,
    });

    res.json({
      success: true,
      message: `Staff member ${
        staff.isActive ? "activated" : "deactivated"
      } successfully`,
      staff: staff.toJSON(),
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
