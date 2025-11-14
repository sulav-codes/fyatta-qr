const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const menuController = require("../controllers/menuController");
const upload = require("../middleware/multerConfig");

// All menu routes require authentication
router.use(authenticate);

// Menu items routes for a vendor
router.post(
  "/vendors/:vendorId/menu",
  upload.fields([
    { name: "image_0", maxCount: 1 },
    { name: "image_1", maxCount: 1 },
    { name: "image_2", maxCount: 1 },
    { name: "image_3", maxCount: 1 },
    { name: "image_4", maxCount: 1 },
    { name: "image_5", maxCount: 1 },
    { name: "image_6", maxCount: 1 },
    { name: "image_7", maxCount: 1 },
    { name: "image_8", maxCount: 1 },
    { name: "image_9", maxCount: 1 },
  ]),
  menuController.createMenuItems
);
router.get("/vendors/:vendorId/menu", menuController.getMenuItems);
router.get(
  "/vendors/:vendorId/menu/categories",
  menuController.getMenuItemsByCategory
);

// Individual menu item routes
router.get("/vendors/:vendorId/menu/:itemId", menuController.getMenuItem);
router.put(
  "/vendors/:vendorId/menu/:itemId",
  upload.single("image"),
  menuController.updateMenuItem
);
router.delete("/vendors/:vendorId/menu/:itemId", menuController.deleteMenuItem);
router.patch(
  "/vendors/:vendorId/menu/:itemId/toggle",
  menuController.toggleAvailability
);

module.exports = router;
