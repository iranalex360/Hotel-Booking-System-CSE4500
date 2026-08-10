const { getClient } = require("../db");

async function createBooking(req, res) {
  // Use authenticated user ID from JWT token if available, fallback to body
  const authenticatedUserId = req.user ? req.user.users_id : Number(req.body.users_id);

  const {
    room_id,
    check_in_date,
    check_out_date,
    guest_count
  } = req.body;

  if (!authenticatedUserId || !room_id || !check_in_date || !check_out_date || !guest_count) {
    return res.status(400).json({ message: "Missing booking information." });
  }

  const checkIn = new Date(check_in_date);
  const checkOut = new Date(check_out_date);

  if (checkOut <= checkIn) {
    return res.status(400).json({
      message: "Check-out date must be after check-in date."
    });
  }

  const client = await getClient();

  try {
    await client.query("BEGIN");

    // 1. Check room availability and get price/capacity
    const roomResult = await client.query(
      `
      SELECT price, capacity
      FROM room
      WHERE room_id = $1
        AND room_status_id = 1
      `,
      [room_id]
    );

    if (roomResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Room is not available." });
    }

    const { price, capacity } = roomResult.rows[0];

    if (guest_count > capacity) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Guest count is higher than room capacity."
      });
    }

    // 2. Check for conflicting bookings
    const conflictResult = await client.query(
      `
      SELECT 1
      FROM booking
      WHERE room_id = $1
        AND check_in_date < $3
        AND check_out_date > $2
        AND booking_status_id <> 3
      `,
      [room_id, checkIn, checkOut]
    );

    if (conflictResult.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        message: "This room is already booked for those dates."
      });
    }

    // 3. Calculate totals
    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    );
    const totalPrice = price * nights;

    // 4. Get next booking ID
    const idResult = await client.query(
      "SELECT COALESCE(MAX(booking_id), 0) + 1 AS next_id FROM booking"
    );
    const newBookingId = idResult.rows[0].next_id;

    // 5. Insert the booking
    await client.query(
      `
      INSERT INTO booking (
        booking_id,
        users_id,
        room_id,
        check_in_date,
        check_out_date,
        total_price,
        booking_status_id,
        guest_count
      )
      VALUES ($1, $2, $3, $4, $5, $6, 1, $7)
      `,
      [newBookingId, authenticatedUserId, room_id, checkIn, checkOut, totalPrice, guest_count]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "Booking created successfully",
      booking: {
        booking_id: newBookingId,
        total_price: totalPrice,
        nights
      }
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to create booking:", error);
    res.status(500).json({
      message: error.message || "Failed to create booking."
    });
  } finally {
    client.release();
  }
}

async function getBookingsByUserId(req, res) {
  try {
    const usersId = Number(req.params.usersId);

    // If authenticated user is present, ensure they only view their own bookings unless admin
    if (req.user && req.user.role !== "admin" && req.user.users_id !== usersId) {
      return res.status(403).json({
        message: "Access denied. You can only view your own bookings."
      });
    }

    if (!usersId) {
      return res.status(400).json({ message: "Invalid user id." });
    }

    const { query } = require("../db");

    const result = await query(
      `
      SELECT
        b.booking_id,
        b.users_id,
        b.room_id,
        b.check_in_date,
        b.check_out_date,
        b.total_price,
        b.booking_status_id,
        b.guest_count,

        r.room_number,
        r.capacity,
        r.price AS room_price,
        rt.room_type,

        h.hotel_id,
        h.names AS hotel_name,
        h.address AS hotel_address,
        h.star_rating,

        hi.image AS image_url,

        bs.booking_status,

        CASE
          WHEN b.check_out_date >= CURRENT_DATE THEN 'current'
          ELSE 'previous'
        END AS booking_group,

        CASE
          WHEN EXISTS (
            SELECT 1
            FROM review rv
            WHERE rv.users_id = b.users_id
              AND rv.hotel_id = h.hotel_id
          )
          THEN 1
          ELSE 0
        END AS has_review

      FROM booking b
      INNER JOIN room r
        ON b.room_id = r.room_id
      LEFT JOIN room_type rt
        ON r.room_type_id = rt.room_type_id
      INNER JOIN hotel h
        ON r.hotel_id = h.hotel_id
      LEFT JOIN hotel_image hi
        ON h.hotel_id = hi.hotel_id
      LEFT JOIN booking_status bs
        ON b.booking_status_id = bs.booking_status_id
      WHERE b.users_id = $1
      ORDER BY b.check_in_date DESC
      `,
      [usersId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Failed to load user bookings:", error);
    res.status(500).json({
      message: error.message || "Failed to load bookings."
    });
  } finally {
    client.release();
  }
}

async function getBookingById(req, res) {
  const { bookingId } = req.params;
  const client = await getClient();

  try {
    const result = await client.query(
      `
      SELECT
        b.booking_id,
        b.users_id,
        b.room_id,
        b.check_in_date,
        b.check_out_date,
        b.total_price,
        b.guest_count,
        r.price AS price_per_night,
        COALESCE(rt.room_type, 'Standard Room') AS room_type_name,
        h.hotel_id,
        h.names AS hotel_name,
        h.address AS hotel_address,
        h.star_rating,
        hi.image AS hotel_image
      FROM booking b
      INNER JOIN room r ON b.room_id = r.room_id
      LEFT JOIN room_type rt ON r.room_type_id = rt.room_type_id
      INNER JOIN hotel h ON r.hotel_id = h.hotel_id
      LEFT JOIN hotel_image hi ON h.hotel_id = hi.hotel_id
      WHERE b.booking_id = $1
      `,
      [bookingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Booking not found." });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Failed to load booking details:", error);
    res.status(500).json({ message: "Failed to load booking details." });
  } finally {
    client.release();
  }
}

module.exports = {
  createBooking,
  getBookingsByUserId,
  getBookingById
};