const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middlewares/auth.middleware");
const menuController = require("./menu.controller");
const upload = require("../../middlewares/multerConfig");

const MAX_MENU_ITEMS_PER_REQUEST = (() => {
  const parsed = Number.parseInt(
    process.env.MAX_MENU_ITEMS_PER_REQUEST || "50",
    10,
  );
  return Number.isNaN(parsed) || parsed < 1 ? 50 : parsed;
})();

// All menu routes require authentication
router.use(authenticate);

// Menu items routes for a vendor
router.post(
  "/vendors/:vendorId/menu",
  upload.array("images", MAX_MENU_ITEMS_PER_REQUEST),
  menuController.createMenuItems,
);
router.get("/vendors/:vendorId/menu", menuController.getMenuItems);
router.get(
  "/vendors/:vendorId/menu/categories",
  menuController.getMenuItemsByCategory,
);

// Individual menu item routes
router.get("/vendors/:vendorId/menu/:itemId", menuController.getMenuItem);
router.put(
  "/vendors/:vendorId/menu/:itemId",
  upload.single("image"),
  menuController.updateMenuItem,
);
router.delete("/vendors/:vendorId/menu/:itemId", menuController.deleteMenuItem);
router.patch(
  "/vendors/:vendorId/menu/:itemId/toggle",
  menuController.toggleAvailability,
);

module.exports = router;
