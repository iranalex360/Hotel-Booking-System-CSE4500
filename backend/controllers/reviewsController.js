const { query } = require("../db");

async function createReview(req, res) {
  try {
    const { users_id, hotel_id, rating, comment } = req.body;

    if (!users_id || !hotel_id || !rating || !comment) {
      return res.status(400).json({ message: "Missing review information." });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        message: "Rating must be between 1 and 5."
      });
    }

    // Check user actually stayed at this hotel
    const stayedAtHotel = await query(
      `
      SELECT b.booking_id
      FROM booking b
      INNER JOIN room r ON b.room_id = r.room_id
      WHERE b.users_id = $1
        AND r.hotel_id = $2
        AND b.check_out_date < NOW()
      LIMIT 1
      `,
      [users_id, hotel_id]
    );

    if (stayedAtHotel.rows.length === 0) {
      return res.status(403).json({
        message: "You can only review hotels after completing a stay."
      });
    }

    // Check for existing review
    const existingReview = await query(
      `
      SELECT review_id
      FROM review
      WHERE users_id = $1
        AND hotel_id = $2
      `,
      [users_id, hotel_id]
    );

    if (existingReview.rows.length > 0) {
      return res.status(409).json({
        message: "You have already reviewed this hotel."
      });
    }

    // Get next review ID
    const idResult = await query(
      "SELECT COALESCE(MAX(review_id), 0) + 1 AS next_id FROM review"
    );
    const nextReviewId = idResult.rows[0].next_id;

    // Insert review
    await query(
      `
      INSERT INTO review (review_id, users_id, hotel_id, rating, comment, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      `,
      [nextReviewId, users_id, hotel_id, rating, comment]
    );

    res.status(201).json({
      message: "Review submitted successfully.",
      review_id: nextReviewId
    });
  } catch (error) {
    console.error("Failed to create review:", error);
    res.status(500).json({
      message: error.message || "Failed to create review."
    });
  }
}

module.exports = {
  createReview
};