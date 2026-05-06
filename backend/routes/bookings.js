const express = require("express");
const router = express.Router();

const {
  createBooking,
  getBookingsByUserId
} = require("../controllers/bookingsController");

router.get("/user/:usersId", getBookingsByUserId);
router.post("/", createBooking);

module.exports = router;