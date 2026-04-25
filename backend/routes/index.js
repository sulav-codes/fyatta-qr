import { Router } from "express";
import authRoute from "../modules/auth/auth.route.js";
import notificationRoute from "../modules/notification/notification.route.js";
import paymentRoute from "../modules/payment/payment.route.js";
import orderRoute from "../modules/order/order.route.js";
import staffRoute from "../modules/staff/staff.route.js";
import vendorRoute from "../modules/vendor/vendor.route.js";
import menuRoute from "../modules/menu/menu.route.js";
import tableRoute from "../modules/table/table.route.js";

const router = Router();

// Import all route modules
router.use("/auth", authRoute);

// PUBLIC routes (no authentication required)
router.use("/api", notificationRoute);
router.use("/api/payment", paymentRoute);
router.use("/api", orderRoute);

// PROTECTED routes (require authentication)
router.use("/api", staffRoute);
router.use("/api", vendorRoute);
router.use("/api", menuRoute);
router.use("/api", tableRoute);

export default router;
