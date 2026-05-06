const { getConnection, sql } = require("../db");

async function createBooking(req, res) {
  try {
    const {
      users_id,
      room_id,
      check_in_date,
      check_out_date,
      guest_count
    } = req.body;

    if (!users_id || !room_id || !check_in_date || !check_out_date || !guest_count) {
      return res.status(400).json({
        message: "Missing booking information."
      });
    }

    const checkIn = new Date(check_in_date);
    const checkOut = new Date(check_out_date);

    if (checkOut <= checkIn) {
      return res.status(400).json({
        message: "Check-out date must be after check-in date."
      });
    }

    const pool = await getConnection();

    const request = pool.request();

    request.input("usersId", sql.Int, users_id);
    request.input("roomId", sql.Int, room_id);
    request.input("checkInDate", sql.DateTime, checkIn);
    request.input("checkOutDate", sql.DateTime, checkOut);
    request.input("guestCount", sql.Int, guest_count);

    const result = await request.query(`
      DECLARE @RoomPrice DECIMAL(10, 2);
      DECLARE @RoomCapacity INT;
      DECLARE @Nights INT;
      DECLARE @TotalPrice DECIMAL(10, 2);
      DECLARE @NewBookingId INT;

      SELECT
        @RoomPrice = price,
        @RoomCapacity = capacity
      FROM dbo.room
      WHERE room_id = @roomId
        AND room_status_id = 1;

      IF @RoomPrice IS NULL
      BEGIN
        THROW 50001, 'Room is not available.', 1;
      END;

      IF @guestCount > @RoomCapacity
      BEGIN
        THROW 50002, 'Guest count is higher than room capacity.', 1;
      END;

      IF EXISTS (
        SELECT 1
        FROM dbo.booking b
        WHERE b.room_id = @roomId
          AND b.check_in_date < @checkOutDate
          AND b.check_out_date > @checkInDate
          AND b.booking_status_id <> 3
      )
      BEGIN
        THROW 50003, 'This room is already booked for those dates.', 1;
      END;

      SET @Nights = DATEDIFF(DAY, @checkInDate, @checkOutDate);
      SET @TotalPrice = @RoomPrice * @Nights * @guestCount;

      SELECT @NewBookingId = ISNULL(MAX(booking_id), 0) + 1
      FROM dbo.booking;

      INSERT INTO dbo.booking (
        booking_id,
        users_id,
        room_id,
        check_in_date,
        check_out_date,
        total_price,
        booking_status_id,
        guest_count
      )
      VALUES (
        @NewBookingId,
        @usersId,
        @roomId,
        @checkInDate,
        @checkOutDate,
        @TotalPrice,
        1,
        @guestCount
      );

      SELECT
        @NewBookingId AS booking_id,
        @TotalPrice AS total_price,
        @Nights AS nights;
    `);

    res.status(201).json({
      message: "Booking created successfully",
      booking: result.recordset[0]
    });
  } catch (error) {
    console.error("Failed to create booking:", error);

    res.status(500).json({
      message: error.message || "Failed to create booking."
    });
  }
}
async function getBookingsByUserId(req, res) {
  try {
    const usersId = Number(req.params.usersId);

    if (!usersId) {
      return res.status(400).json({
        message: "Invalid user id."
      });
    }

    const pool = await getConnection();

    const result = await pool
      .request()
      .input("usersId", sql.Int, usersId)
      .query(`
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
            WHEN b.check_out_date >= CAST(GETDATE() AS DATE) THEN 'current'
            ELSE 'previous'
          END AS booking_group,

          CASE
            WHEN EXISTS (
              SELECT 1
              FROM dbo.review rv
              WHERE rv.users_id = b.users_id
                AND rv.hotel_id = h.hotel_id
            )
            THEN 1
            ELSE 0
          END AS has_review

        FROM dbo.booking b
        INNER JOIN dbo.room r
          ON b.room_id = r.room_id
        LEFT JOIN dbo.room_type rt
          ON r.room_type_id = rt.room_type_id
        INNER JOIN dbo.hotel h
          ON r.hotel_id = h.hotel_id
        LEFT JOIN dbo.hotel_image hi
          ON h.hotel_id = hi.hotel_id
        LEFT JOIN dbo.booking_status bs
          ON b.booking_status_id = bs.booking_status_id
        WHERE b.users_id = @usersId
        ORDER BY b.check_in_date DESC;
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error("Failed to load user bookings:", error);

    res.status(500).json({
      message: error.message || "Failed to load bookings."
    });
  }
}

module.exports = {
  createBooking,
  getBookingsByUserId
};