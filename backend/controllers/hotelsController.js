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
          hi.image AS image_url,
          hi.caption
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
          r.room_id,
          r.hotel_id,
          r.room_number,
          r.room_type_id,
          rt.room_type,
          r.capacity,
          r.price,
          r.room_status_id
        FROM dbo.room r
        LEFT JOIN dbo.room_type rt
          ON r.room_type_id = rt.room_type_id
        WHERE r.hotel_id = @hotelId
          AND r.room_status_id = 1
        ORDER BY r.room_number
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error("Failed to load rooms:", error);
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
async function searchHotels(req, res) {
  try {
    const pool = await getConnection();

    const search = req.query.search || "";
    const guests = Number(req.query.guests) || 1;
    const limit = Number(req.query.limit) || 21;
    const offset = Number(req.query.offset) || 0;

    const request = pool.request();

    request.input("search", sql.VarChar(255), `%${search}%`);
    request.input("guests", sql.Int, guests);
    request.input("limit", sql.Int, limit);
    request.input("offset", sql.Int, offset);

    const result = await request.query(`
      WITH HotelResults AS (
        SELECT
          h.hotel_id,
          h.names,
          h.descriptions,
          h.address,
          h.star_rating,
          hi.image AS image_url,
          MIN(r.price) AS starting_price,
          MAX(r.capacity) AS max_capacity,
          COUNT(r.room_id) AS available_rooms
        FROM dbo.hotel h
        LEFT JOIN dbo.hotel_image hi
          ON h.hotel_id = hi.hotel_id
        INNER JOIN dbo.room r
          ON h.hotel_id = r.hotel_id
        WHERE
          r.room_status_id = 1
          AND r.capacity >= @guests
          AND (
            h.names LIKE @search
            OR h.address LIKE @search
          )
        GROUP BY
          h.hotel_id,
          h.names,
          h.descriptions,
          h.address,
          h.star_rating,
          hi.image
      ),
      CountResults AS (
        SELECT COUNT(*) AS total_count
        FROM HotelResults
      )
      SELECT
        hr.*,
        cr.total_count
      FROM HotelResults hr
      CROSS JOIN CountResults cr
      ORDER BY
        hr.star_rating DESC,
        hr.names ASC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY;
    `);

    res.json({
      hotels: result.recordset,
      total: result.recordset[0]?.total_count || 0,
      limit,
      offset
    });
  } catch (error) {
    console.error("Failed to search hotels:", error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getFeaturedHotels,
  getHotelById,
  getRoomsByHotelId,
  getReviewsByHotelId,
  searchHotels
};