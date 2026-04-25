import vendorService from "./vendor.service.js";
import { sendControllerError } from "../../utils/controllerError.js";

const getProfile = async (req, res) => {
  try {
    const response = await vendorService.getProfile({
      vendorId: req.params.vendorId,
      user: req.user,
    });

    res.status(200).json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Error in getProfile:",
      fallbackMessage: "An error occurred while retrieving vendor data",
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const response = await vendorService.updateProfile({
      vendorId: req.params.vendorId,
      user: req.user,
      body: req.body,
      file: req.file,
    });

    res.status(200).json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Error in updateProfile:",
      fallbackMessage: "An error occurred while updating vendor data",
    });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const response = await vendorService.getDashboardStats({
      vendorId: req.params.vendorId,
      user: req.user,
    });

    res.status(200).json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Error in getDashboardStats:",
      fallbackMessage: "An unexpected error occurred. Please try again.",
    });
  }
};

const getSalesReport = async (req, res) => {
  try {
    const response = await vendorService.getSalesReport({
      vendorId: req.params.vendorId,
      user: req.user,
      query: req.query,
    });

    res.status(200).json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Error in getSalesReport:",
      fallbackMessage: "Failed to generate sales report",
    });
  }
};

const getPopularItems = async (req, res) => {
  try {
    const response = await vendorService.getPopularItems({
      vendorId: req.params.vendorId,
      user: req.user,
      query: req.query,
    });

    res.status(200).json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Error in getPopularItems:",
      fallbackMessage: "Failed to retrieve popular items",
    });
  }
};

const getRecentOrders = async (req, res) => {
  try {
    const response = await vendorService.getRecentOrders({
      vendorId: req.params.vendorId,
      user: req.user,
      query: req.query,
    });

    res.status(200).json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Error in getRecentOrders:",
      fallbackMessage: "Failed to retrieve recent orders",
    });
  }
};

export {
  getProfile,
  updateProfile,
  getDashboardStats,
  getSalesReport,
  getPopularItems,
  getRecentOrders,
};
