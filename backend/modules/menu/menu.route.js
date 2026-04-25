import { Router } from "express";
import authMiddleware from "../../middlewares/auth.middleware.js";
import validateMiddleware from "../../middlewares/validate.middleware.js";
import * as menuController from "./menu.controller.js";
import * as menuValidation from "./menu.validation.js";
import upload from "../../middlewares/multerConfig.js";

const router = Router();
const { authenticate } = authMiddleware;
const { validate } = validateMiddleware;

const MAX_MENU_ITEMS_PER_REQUEST = (() => {
  const parsed = Number.parseInt(
    process.env.MAX_MENU_ITEMS_PER_REQUEST || "50",
    10,
  );
  return Number.isNaN(parsed) || parsed < 1 ? 50 : parsed;
})();

// Public route - no auth required
router.get(
  "/public-menu/:vendorId/",
  validate({ params: menuValidation.vendorParamsSchema }),
  menuController.getPublicMenu,
);

// Menu items routes for a vendor
router.post(
  "/vendors/:vendorId/menu",
  authenticate,
  upload.array("images", MAX_MENU_ITEMS_PER_REQUEST),
  validate({
    params: menuValidation.vendorParamsSchema,
    body: menuValidation.createMenuItemsBodySchema,
  }),
  menuController.createMenuItems,
);
router.get(
  "/vendors/:vendorId/menu",
  authenticate,
  validate({ params: menuValidation.vendorParamsSchema }),
  menuController.getMenuItems,
);
router.get(
  "/vendors/:vendorId/menu/categories",
  authenticate,
  validate({ params: menuValidation.vendorParamsSchema }),
  menuController.getMenuItemsByCategory,
);

// Individual menu item routes
router.get(
  "/vendors/:vendorId/menu/:itemId",
  authenticate,
  validate({ params: menuValidation.vendorItemParamsSchema }),
  menuController.getMenuItem,
);
router.put(
  "/vendors/:vendorId/menu/:itemId",
  authenticate,
  upload.single("image"),
  validate({
    params: menuValidation.vendorItemParamsSchema,
    body: menuValidation.updateMenuItemBodySchema,
  }),
  menuController.updateMenuItem,
);
router.delete(
  "/vendors/:vendorId/menu/:itemId",
  authenticate,
  validate({ params: menuValidation.vendorItemParamsSchema }),
  menuController.deleteMenuItem,
);
router.patch(
  "/vendors/:vendorId/menu/:itemId/toggle",
  authenticate,
  validate({ params: menuValidation.vendorItemParamsSchema }),
  menuController.toggleAvailability,
);

export default router;
