const { getConnection, sql } = require("../db");

async function getHotelsForImagePicker(req, res) {
  try {
    const pool = await getConnection();

    const result = await pool.request().query(`
      SELECT
        h.hotel_id,
        h.names,
        h.address,
        existing.image
      FROM dbo.hotel h
      OUTER APPLY (
        SELECT TOP 1 hi.image
        FROM dbo.hotel_image hi
        WHERE hi.hotel_id = h.hotel_id
        ORDER BY hi.image_id
      ) existing
      ORDER BY h.hotel_id
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to fetch hotels",
      details: error.message
    });
  }
}

async function saveSelectedHotelImage(req, res) {
  try {
    const hotelId = Number(req.params.id);
    const { imageUrl } = req.body;

    if (!hotelId || !imageUrl || String(imageUrl).trim() === "") {
      return res.status(400).json({
        error: "hotelId and imageUrl are required"
      });
    }

    const cleanImageUrl = String(imageUrl).trim();

    const pool = await getConnection();

    const hotelResult = await pool
      .request()
      .input("hotel_id", sql.Int, hotelId)
      .query(`
        SELECT hotel_id, names
        FROM dbo.hotel
        WHERE hotel_id = @hotel_id
      `);

    if (!hotelResult.recordset.length) {
      return res.status(404).json({
        error: "Hotel not found"
      });
    }

    const hotel = hotelResult.recordset[0];

    const imageResult = await pool
      .request()
      .input("hotel_id", sql.Int, hotelId)
      .query(`
        SELECT TOP 1 image_id
        FROM dbo.hotel_image
        WHERE hotel_id = @hotel_id
        ORDER BY image_id
      `);

    if (imageResult.recordset.length) {
      const imageId = imageResult.recordset[0].image_id;

      await pool
        .request()
        .input("image_id", sql.Int, imageId)
        .input("imageUrl", sql.VarChar(sql.MAX), cleanImageUrl)
        .query(`
          UPDATE dbo.hotel_image
          SET image = @imageUrl
          WHERE image_id = @image_id
        `);

      return res.json({
        message: "Image updated successfully",
        action: "updated",
        hotelId,
        hotelName: hotel.names,
        imageId,
        imageUrl: cleanImageUrl
      });
    }

    const insertResult = await pool
      .request()
      .input("hotel_id", sql.Int, hotelId)
      .input("imageUrl", sql.VarChar(sql.MAX), cleanImageUrl)
      .query(`
        INSERT INTO dbo.hotel_image (image_id, hotel_id, urls, caption, image)
        OUTPUT INSERTED.image_id
        SELECT
          ISNULL(MAX(image_id), 0) + 1,
          @hotel_id,
          NULL,
          NULL,
          @imageUrl
        FROM dbo.hotel_image
      `);

    res.json({
      message: "Image inserted successfully",
      action: "inserted",
      hotelId,
      hotelName: hotel.names,
      imageId: insertResult.recordset[0].image_id,
      imageUrl: cleanImageUrl
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to save image",
      details: error.message
    });
  }
}

module.exports = {
  getHotelsForImagePicker,
  saveSelectedHotelImage
};