const express = require("express");
const router = express.Router();

const {
  getFeaturedHotels,
  getHotelById,
  getRoomsByHotelId,
  getReviewsByHotelId,
  searchHotels,
  deleteHotel
} = require("../controllers/hotelsController");

const { optionalAuthMiddleware } = require("../middleware/authMiddleware");

router.get("/", getFeaturedHotels);
router.get("/search/all", searchHotels);
router.get("/:id", getHotelById);
router.get("/:id/rooms", getRoomsByHotelId);
router.get("/:id/reviews", getReviewsByHotelId);
router.delete("/:id", optionalAuthMiddleware, deleteHotel);

module.exports = router;