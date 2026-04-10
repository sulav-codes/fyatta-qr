const menuService = require("./menu.service");
const { sendControllerError } = require("../../utils/controllerError");

exports.createMenuItems = async (req, res) => {
  try {
    const response = await menuService.createMenuItems({
      vendorId: req.params.vendorId,
      user: req.user,
      body: req.body,
      files: req.files,
    });

    res.status(201).json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Error creating menu items:",
      fallbackMessage: "Failed to create menu items",
    });
  }
};

exports.getMenuItems = async (req, res) => {
  try {
    const response = await menuService.getMenuItems({
      vendorId: req.params.vendorId,
      user: req.user,
    });

    res.status(200).json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Error fetching menu items:",
      fallbackMessage: "Failed to fetch menu items",
    });
  }
};

exports.getMenuItemsByCategory = async (req, res) => {
  try {
    const response = await menuService.getMenuItemsByCategory({
      vendorId: req.params.vendorId,
      user: req.user,
    });

    res.status(200).json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Error fetching menu items by category:",
      fallbackMessage: "Failed to fetch menu items",
    });
  }
};

exports.getMenuItem = async (req, res) => {
  try {
    const response = await menuService.getMenuItem({
      vendorId: req.params.vendorId,
      itemId: req.params.itemId,
      user: req.user,
    });

    res.status(200).json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Error fetching menu item:",
      fallbackMessage: "Failed to fetch menu item",
    });
  }
};

exports.updateMenuItem = async (req, res) => {
  try {
    const response = await menuService.updateMenuItem({
      vendorId: req.params.vendorId,
      itemId: req.params.itemId,
      user: req.user,
      body: req.body,
      file: req.file,
    });

    res.status(200).json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Error updating menu item:",
      fallbackMessage: "Failed to update menu item",
    });
  }
};

exports.deleteMenuItem = async (req, res) => {
  try {
    const response = await menuService.deleteMenuItem({
      vendorId: req.params.vendorId,
      itemId: req.params.itemId,
      user: req.user,
    });

    res.status(200).json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Error deleting menu item:",
      fallbackMessage: "Failed to delete menu item",
    });
  }
};

exports.getPublicMenu = async (req, res) => {
  try {
    const response = await menuService.getPublicMenu({
      vendorId: req.params.vendorId,
    });

    res.status(200).json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Error fetching public menu:",
      fallbackMessage: "Failed to fetch menu",
    });
  }
};

exports.toggleAvailability = async (req, res) => {
  try {
    const response = await menuService.toggleAvailability({
      vendorId: req.params.vendorId,
      itemId: req.params.itemId,
      user: req.user,
    });

    res.status(200).json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Error toggling menu item availability:",
      fallbackMessage: "Failed to toggle availability",
    });
  }
};

module.exports = exports;
