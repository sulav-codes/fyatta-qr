import notificationService from "./notification.service.js";
import { isServiceError } from "../../utils/serviceError.js";
import logger from "../../config/logger.js";

const callWaiter = async (req, res) => {
  try {
    const response = await notificationService.callWaiter({
      body: req.body,
    });

    res.status(200).json(response);
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }

    logger.error("Error calling waiter", {
      module: "notification-controller",
      error,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to call waiter",
    });
  }
};

export { callWaiter };
