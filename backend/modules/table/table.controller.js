const tableService = require("./table.service");
const { sendControllerError } = require("../../utils/controllerError");

exports.getTables = async (req, res) => {
  try {
    const response = await tableService.getTables({
      vendorId: req.params.vendorId,
      user: req.user,
    });

    res.status(200).json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Error in getTables:",
      fallbackMessage: "An error occurred while retrieving tables",
    });
  }
};

exports.createTable = async (req, res) => {
  try {
    const response = await tableService.createTable({
      vendorId: req.params.vendorId,
      user: req.user,
      body: req.body,
    });

    res.status(201).json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Error in createTable:",
      fallbackMessage: "An error occurred while creating the table",
    });
  }
};

exports.updateTable = async (req, res) => {
  try {
    const response = await tableService.updateTable({
      vendorId: req.params.vendorId,
      tableId: req.params.tableId,
      user: req.user,
      body: req.body,
    });

    res.status(200).json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Error in updateTable:",
      fallbackMessage: "An error occurred while updating the table",
    });
  }
};

exports.deleteTable = async (req, res) => {
  try {
    const response = await tableService.deleteTable({
      vendorId: req.params.vendorId,
      tableId: req.params.tableId,
      user: req.user,
    });

    res.status(200).json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Error in deleteTable:",
      fallbackMessage: "An error occurred while deleting the table",
    });
  }
};

exports.regenerateQRCode = async (req, res) => {
  try {
    const response = await tableService.regenerateQRCode({
      vendorId: req.params.vendorId,
      tableId: req.params.tableId,
      user: req.user,
    });

    res.status(200).json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Error in regenerateQRCode:",
      fallbackMessage: "An error occurred while regenerating the QR code",
    });
  }
};

exports.getTableStatus = async (req, res) => {
  try {
    const response = await tableService.getTableStatus({
      vendorId: req.params.vendorId,
      tableIdentifier: req.params.tableIdentifier,
    });

    res.status(200).json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Error fetching table status:",
      fallbackMessage: "Failed to fetch table status",
    });
  }
};

exports.getTableDetails = async (req, res) => {
  try {
    const response = await tableService.getTableDetails({
      vendorId: req.params.vendorId,
      tableId: req.params.tableId,
      user: req.user,
    });

    res.status(200).json(response);
  } catch (error) {
    sendControllerError(res, error, {
      logPrefix: "Error in getTableDetails:",
      fallbackMessage: "An error occurred while retrieving table details",
    });
  }
};

module.exports = exports;
