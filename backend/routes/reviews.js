const express = require("express");
const router = express.Router();

const {
  createReview
} = require("../controllers/reviewsController");

router.post("/", createReview);

module.exports = router;