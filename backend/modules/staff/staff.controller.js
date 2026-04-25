import staffService from "./staff.service.js";
import { sendControllerError } from "../../utils/controllerError.js";

const getStaff = async (req, res) => {
  try {
    const response = await staffService.getStaff({
      vendorId: req.params.vendorId,
      user: req.user,
    });

    res.json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Error fetching staff:",
      fallbackMessage: "Failed to fetch staff members",
    });
  }
};

const getStaffMember = async (req, res) => {
  try {
    const response = await staffService.getStaffMember({
      vendorId: req.params.vendorId,
      staffId: req.params.staffId,
      user: req.user,
    });

    res.json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Error fetching staff member:",
      fallbackMessage: "Failed to fetch staff member",
    });
  }
};

const createStaff = async (req, res) => {
  try {
    const response = await staffService.createStaff({
      vendorId: req.params.vendorId,
      user: req.user,
      body: req.body,
    });

    res.status(201).json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Error creating staff member:",
      fallbackMessage: "Failed to create staff member",
    });
  }
};

const updateStaff = async (req, res) => {
  try {
    const response = await staffService.updateStaff({
      vendorId: req.params.vendorId,
      staffId: req.params.staffId,
      user: req.user,
      body: req.body,
    });

    res.json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Error updating staff member:",
      fallbackMessage: "Failed to update staff member",
    });
  }
};

const deleteStaff = async (req, res) => {
  try {
    const response = await staffService.deleteStaff({
      vendorId: req.params.vendorId,
      staffId: req.params.staffId,
      user: req.user,
    });

    res.json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Error deleting staff member:",
      fallbackMessage: "Failed to delete staff member",
    });
  }
};

const toggleStaffStatus = async (req, res) => {
  try {
    const response = await staffService.toggleStaffStatus({
      vendorId: req.params.vendorId,
      staffId: req.params.staffId,
      user: req.user,
    });

    res.json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Error toggling staff status:",
      fallbackMessage: "Failed to toggle staff status",
    });
  }
};

export {
  getStaff,
  getStaffMember,
  createStaff,
  updateStaff,
  deleteStaff,
  toggleStaffStatus,
};
