const express = require("express");
const router = express.Router();

const {
  createBooking,
  getBookingsByUserId
} = require("../controllers/bookingsController");

const { optionalAuthMiddleware } = require("../middleware/authMiddleware");

// Use optionalAuthMiddleware so token is extracted if provided, maintaining backward compatibility
router.get("/user/:usersId", optionalAuthMiddleware, getBookingsByUserId);
router.post("/", optionalAuthMiddleware, createBooking);

module.exports = router;