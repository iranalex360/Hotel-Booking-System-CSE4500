const express = require("express");
const router = express.Router();

const {
  getFeaturedHotels,
  getHotelById,
  getRoomsByHotelId,
  getReviewsByHotelId
} = require("../controllers/hotelsController");

router.get("/", getFeaturedHotels);
router.get("/:id", getHotelById);
router.get("/:id/rooms", getRoomsByHotelId);
router.get("/:id/reviews", getReviewsByHotelId);

module.exports = router;