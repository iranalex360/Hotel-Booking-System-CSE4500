const { getConnection, sql } = require("../db");

async function createBooking(req, res) {
  try {
    const {
      users_id,
      room_id,
      check_in_date,
      check_out_date,
      total_price,
      booking_status_id
    } = req.body;

    const pool = await getConnection();

    const idResult = await pool.request().query(`
      SELECT ISNULL(MAX(booking_id), 0) + 1 AS nextBookingId
      FROM dbo.booking
    `);

    const nextBookingId = idResult.recordset[0].nextBookingId;

    await pool
      .request()
      .input("booking_id", sql.Int, nextBookingId)
      .input("users_id", sql.Int, users_id)
      .input("room_id", sql.Int, room_id)
      .input("check_in_date", sql.DateTime, check_in_date)
      .input("check_out_date", sql.DateTime, check_out_date)
      .input("total_price", sql.Decimal(10, 2), total_price)
      .input("booking_status_id", sql.Int, booking_status_id)
      .query(`
        INSERT INTO dbo.booking
        (
          booking_id,
          users_id,
          room_id,
          check_in_date,
          check_out_date,
          total_price,
          booking_status_id
        )
        VALUES
        (
          @booking_id,
          @users_id,
          @room_id,
          @check_in_date,
          @check_out_date,
          @total_price,
          @booking_status_id
        )
      `);

    res.status(201).json({
      message: "Booking created successfully",
      booking_id: nextBookingId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  createBooking
};