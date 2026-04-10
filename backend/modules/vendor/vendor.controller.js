const vendorService = require("./vendor.service");
const { sendControllerError } = require("../../utils/controllerError");

exports.getProfile = async (req, res) => {
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

exports.updateProfile = async (req, res) => {
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

exports.getDashboardStats = async (req, res) => {
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

exports.getSalesReport = async (req, res) => {
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

exports.getPopularItems = async (req, res) => {
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

exports.getRecentOrders = async (req, res) => {
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

module.exports = exports;
