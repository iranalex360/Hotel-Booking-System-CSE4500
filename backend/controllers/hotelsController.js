const { getConnection, sql } = require("../db");

async function getFeaturedHotels(req, res) {
  try {
    const pool = await getConnection();

    const result = await pool.request().query(`
      SELECT TOP 21
        h.hotel_id,
        h.names,
        h.descriptions,
        h.address,
        h.star_rating,
        hi.image AS image_url
      FROM dbo.hotel h
      LEFT JOIN dbo.hotel_image hi
        ON h.hotel_id = hi.hotel_id
      ORDER BY h.hotel_id
    `);

    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getHotelById(req, res) {
  try {
    const pool = await getConnection();

    const result = await pool
      .request()
      .input("hotelId", sql.Int, req.params.id)
      .query(`
        SELECT
          h.hotel_id,
          h.names,
          h.descriptions,
          h.address,
          h.star_rating,
          hi.image AS image_url
        FROM dbo.hotel h
        LEFT JOIN dbo.hotel_image hi
          ON h.hotel_id = hi.hotel_id
        WHERE h.hotel_id = @hotelId
      `);

    res.json(result.recordset[0] || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getRoomsByHotelId(req, res) {
  try {
    const pool = await getConnection();

    const result = await pool
      .request()
      .input("hotelId", sql.Int, req.params.id)
      .query(`
        SELECT
          room_id,
          hotel_id,
          room_number,
          room_type_id,
          capacity,
          price,
          room_status_id
        FROM dbo.room
        WHERE hotel_id = @hotelId
        ORDER BY room_number
      `);

    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getReviewsByHotelId(req, res) {
  try {
    const pool = await getConnection();

    const result = await pool
      .request()
      .input("hotelId", sql.Int, req.params.id)
      .query(`
        SELECT TOP 10
          r.review_id,
          r.rating,
          r.comment,
          r.created_at,
          u.full_name
        FROM dbo.review r
        JOIN dbo.users u ON r.users_id = u.users_id
        WHERE r.hotel_id = @hotelId
        ORDER BY r.created_at DESC
      `);

    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getFeaturedHotels,
  getHotelById,
  getRoomsByHotelId,
  getReviewsByHotelId
};