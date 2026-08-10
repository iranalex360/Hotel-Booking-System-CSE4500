const { query } = require("../db");

async function getFeaturedHotels(req, res) {
  try {
    const result = await query(`
      SELECT
        h.hotel_id,
        h.names,
        h.descriptions,
        h.address,
        h.star_rating,
        hi.image AS image_url
      FROM hotel h
      LEFT JOIN hotel_image hi
        ON h.hotel_id = hi.hotel_id
      ORDER BY h.hotel_id
      LIMIT 21
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getHotelById(req, res) {
  try {
    const result = await query(
      `
      SELECT
        h.hotel_id,
        h.names,
        h.descriptions,
        h.address,
        h.star_rating,
        hi.image AS image_url,
        hi.urls AS website_url,
        hi.caption
      FROM hotel h
      LEFT JOIN hotel_image hi
        ON h.hotel_id = hi.hotel_id
      WHERE h.hotel_id = $1
      `,
      [req.params.id]
    );

    res.json(result.rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getRoomsByHotelId(req, res) {
  try {
    const result = await query(
      `
      SELECT
        r.room_id,
        r.hotel_id,
        r.room_number,
        r.room_type_id,
        rt.room_type,
        r.capacity,
        r.price,
        r.room_status_id
      FROM room r
      LEFT JOIN room_type rt
        ON r.room_type_id = rt.room_type_id
      WHERE r.hotel_id = $1
        AND r.room_status_id = 1
      ORDER BY r.room_number
      `,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Failed to load rooms:", error);
    res.status(500).json({ error: error.message });
  }
}

async function getReviewsByHotelId(req, res) {
  try {
    const result = await query(
      `
      SELECT
        r.review_id,
        r.rating,
        r.comment,
        r.created_at,
        u.full_name
      FROM review r
      JOIN users u ON r.users_id = u.users_id
      WHERE r.hotel_id = $1
      ORDER BY r.created_at DESC
      LIMIT 10
      `,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function searchHotels(req, res) {
  try {
    const search = req.query.search || "";
    const guests = Number(req.query.guests) || 1;
    const limit = Number(req.query.limit) || 21;
    const offset = Number(req.query.offset) || 0;

    const result = await query(
      `
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
        FROM hotel h
        LEFT JOIN hotel_image hi
          ON h.hotel_id = hi.hotel_id
        INNER JOIN room r
          ON h.hotel_id = r.hotel_id
        LEFT JOIN cities c
          ON h.city_id = c.city_id
        LEFT JOIN states s
          ON c.state_id = s.state_id
        WHERE
          r.room_status_id = 1
          AND r.capacity >= $2
          AND (
            h.names ILIKE $1
            OR h.address ILIKE $1
            OR c.city_name ILIKE $1
            OR s.state_name ILIKE $1
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
      LIMIT $3 OFFSET $4
      `,
      [`%${search}%`, guests, limit, offset]
    );

    res.json({
      hotels: result.rows,
      total: Number(result.rows[0]?.total_count) || 0,
      limit,
      offset
    });
  } catch (error) {
    console.error("Failed to search hotels:", error);
    res.status(500).json({ error: error.message });
  }
}

async function deleteHotel(req, res) {
  const hotelId = Number(req.params.id);

  if (!hotelId) {
    return res.status(400).json({ error: "Invalid hotel ID" });
  }

  const { getClient } = require("../db");
  const client = await getClient();

  try {
    await client.query("BEGIN");

    // 1. Verify hotel exists
    const hotelRes = await client.query("SELECT hotel_id, names FROM hotel WHERE hotel_id = $1", [hotelId]);
    if (!hotelRes.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Hotel not found" });
    }

    const hotelName = hotelRes.rows[0].names;

    // 2. Delete payments associated with bookings of this hotel's rooms
    await client.query(
      `DELETE FROM payment 
       WHERE booking_id IN (
         SELECT booking_id FROM booking WHERE room_id IN (
           SELECT room_id FROM room WHERE hotel_id = $1
         )
       )`,
      [hotelId]
    );

    // 3. Delete bookings associated with this hotel's rooms
    await client.query(
      `DELETE FROM booking 
       WHERE room_id IN (
         SELECT room_id FROM room WHERE hotel_id = $1
       )`,
      [hotelId]
    );

    // 4. Delete reviews for this hotel
    await client.query("DELETE FROM review WHERE hotel_id = $1", [hotelId]);

    // 5. Delete rooms for this hotel
    await client.query("DELETE FROM room WHERE hotel_id = $1", [hotelId]);

    // 6. Delete images for this hotel
    await client.query("DELETE FROM hotel_image WHERE hotel_id = $1", [hotelId]);

    // 7. Delete the hotel record itself
    await client.query("DELETE FROM hotel WHERE hotel_id = $1", [hotelId]);

    await client.query("COMMIT");

    res.json({
      message: `Hotel "${hotelName}" (ID #${hotelId}) was permanently deleted from database.`,
      hotelId,
      hotelName
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error deleting hotel:", error);
    res.status(500).json({ error: "Failed to delete hotel", details: error.message });
  } finally {
    client.release();
  }
}

module.exports = {
  getFeaturedHotels,
  getHotelById,
  getRoomsByHotelId,
  getReviewsByHotelId,
  searchHotels,
  deleteHotel
};