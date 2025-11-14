const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const menuController = require("../controllers/menuController");

// All menu routes require authentication
router.use(authenticate);

// Menu items routes for a vendor
router.post("/vendors/:vendorId/menu", menuController.createMenuItems);
router.get("/vendors/:vendorId/menu", menuController.getMenuItems);
router.get(
  "/vendors/:vendorId/menu/categories",
  menuController.getMenuItemsByCategory
);

// Individual menu item routes
router.put("/vendors/:vendorId/menu/:itemId", menuController.updateMenuItem);
router.delete("/vendors/:vendorId/menu/:itemId", menuController.deleteMenuItem);
router.patch(
  "/vendors/:vendorId/menu/:itemId/toggle",
  menuController.toggleAvailability
);

module.exports = router;
