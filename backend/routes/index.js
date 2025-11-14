const express = require("express");
const router = express.Router();

router.use("/", require("./authRoutes"));
router.use("/users", require("./userRoutes"));
router.use("/professionals", require("./professionalRoutes"));
router.use("/bookings", require("./bookingRoutes"));
router.use(
  "/submitted-professionals",
  require("./submittedProfessionalRoutes")
);

module.exports = router;
