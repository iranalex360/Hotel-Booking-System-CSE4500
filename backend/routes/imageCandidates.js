const express = require("express");
const router = express.Router();

const {
  getImageCandidates,
  saveSelectedHotelImage,
  fillAllHotelImages
} = require("../controllers/imageCandidatesController");

router.post("/", getImageCandidates);
router.post("/hotels/:id/save", saveSelectedHotelImage);
router.post("/fill-all", fillAllHotelImages);

module.exports = router;