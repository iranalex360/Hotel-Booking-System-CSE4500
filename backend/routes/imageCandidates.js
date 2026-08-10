const express = require("express");

const {
  getHotelsForImagePicker,
  saveSelectedHotelImage
} = require("../controllers/imageCandidatesController");

const { optionalAuthMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/hotels", optionalAuthMiddleware, getHotelsForImagePicker);
router.post("/hotels/:id/save", optionalAuthMiddleware, saveSelectedHotelImage);

module.exports = router;