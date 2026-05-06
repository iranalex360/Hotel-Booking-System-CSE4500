const express = require("express");

const {
  getHotelsForImagePicker,
  saveSelectedHotelImage
} = require("../controllers/imageCandidatesController");

const router = express.Router();

router.get("/hotels", getHotelsForImagePicker);

router.post("/hotels/:id/save", saveSelectedHotelImage);

module.exports = router;