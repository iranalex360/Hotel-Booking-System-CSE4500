const express = require("express");
const router = express.Router();

const {
  createBooking,
  getBookingsByUserId,
  getBookingById
} = require("../controllers/bookingsController");

const { optionalAuthMiddleware } = require("../middleware/authMiddleware");

// Routes
router.get("/user/:usersId", optionalAuthMiddleware, getBookingsByUserId);
router.get("/:bookingId", optionalAuthMiddleware, getBookingById);
router.post("/", optionalAuthMiddleware, createBooking);

module.exports = router;