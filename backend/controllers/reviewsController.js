const { getConnection, sql } = require("../db");

async function createReview(req, res) {
  try {
    const {
      users_id,
      hotel_id,
      rating,
      comment
    } = req.body;

    if (!users_id || !hotel_id || !rating || !comment) {
      return res.status(400).json({
        message: "Missing review information."
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        message: "Rating must be between 1 and 5."
      });
    }

    const pool = await getConnection();

    const stayedAtHotel = await pool
      .request()
      .input("usersId", sql.Int, users_id)
      .input("hotelId", sql.Int, hotel_id)
      .query(`
        SELECT TOP 1
          b.booking_id
        FROM dbo.booking b
        INNER JOIN dbo.room r
          ON b.room_id = r.room_id
        WHERE b.users_id = @usersId
          AND r.hotel_id = @hotelId
          AND b.check_out_date < GETDATE();
      `);

    if (stayedAtHotel.recordset.length === 0) {
      return res.status(403).json({
        message: "You can only review hotels after completing a stay."
      });
    }

    const existingReview = await pool
      .request()
      .input("usersId", sql.Int, users_id)
      .input("hotelId", sql.Int, hotel_id)
      .query(`
        SELECT review_id
        FROM dbo.review
        WHERE users_id = @usersId
          AND hotel_id = @hotelId;
      `);

    if (existingReview.recordset.length > 0) {
      return res.status(409).json({
        message: "You have already reviewed this hotel."
      });
    }

    const idResult = await pool.request().query(`
      SELECT ISNULL(MAX(review_id), 0) + 1 AS nextReviewId
      FROM dbo.review;
    `);

    const nextReviewId = idResult.recordset[0].nextReviewId;

    await pool
      .request()
      .input("reviewId", sql.Int, nextReviewId)
      .input("usersId", sql.Int, users_id)
      .input("hotelId", sql.Int, hotel_id)
      .input("rating", sql.Int, rating)
      .input("comment", sql.VarChar(sql.MAX), comment)
      .query(`
        INSERT INTO dbo.review (
          review_id,
          users_id,
          hotel_id,
          rating,
          comment,
          created_at
        )
        VALUES (
          @reviewId,
          @usersId,
          @hotelId,
          @rating,
          @comment,
          GETDATE()
        );
      `);

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