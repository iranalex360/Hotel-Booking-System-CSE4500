const { query } = require("../db");

async function getHotelsForImagePicker(req, res) {
  try {
    const result = await query(`
      SELECT
        h.hotel_id,
        h.names,
        h.address,
        existing.image,
        existing.urls
      FROM hotel h
      LEFT JOIN LATERAL (
        SELECT hi.image, hi.urls
        FROM hotel_image hi
        WHERE hi.hotel_id = h.hotel_id
        ORDER BY hi.image_id
        LIMIT 1
      ) existing ON true
      ORDER BY h.hotel_id
    `);

    res.json(result.rows);
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
    const { imageUrl, websiteUrl } = req.body;

    const cleanImageUrl = imageUrl !== undefined && imageUrl !== null ? String(imageUrl).trim() : null;
    const cleanWebsiteUrl = websiteUrl !== undefined && websiteUrl !== null ? String(websiteUrl).trim() : null;

    if (!hotelId || (cleanImageUrl === null && cleanWebsiteUrl === null)) {
      return res.status(400).json({
        error: "hotelId and at least one of imageUrl or websiteUrl are required"
      });
    }

    // Verify hotel exists
    const hotelResult = await query(
      "SELECT hotel_id, names FROM hotel WHERE hotel_id = $1",
      [hotelId]
    );

    if (!hotelResult.rows.length) {
      return res.status(404).json({ error: "Hotel not found" });
    }

    const hotel = hotelResult.rows[0];

    // Check if image/urls row already exists for this hotel
    const imageResult = await query(
      `
      SELECT image_id, image, urls
      FROM hotel_image
      WHERE hotel_id = $1
      ORDER BY image_id
      LIMIT 1
      `,
      [hotelId]
    );

    if (imageResult.rows.length) {
      const existing = imageResult.rows[0];
      const imageId = existing.image_id;
      const finalImage = cleanImageUrl !== null ? cleanImageUrl : existing.image;
      const finalWebsite = cleanWebsiteUrl !== null ? cleanWebsiteUrl : existing.urls;

      await query(
        "UPDATE hotel_image SET image = $1, urls = $2 WHERE image_id = $3",
        [finalImage, finalWebsite, imageId]
      );

      return res.json({
        message: "Hotel website & image updated successfully",
        action: "updated",
        hotelId,
        hotelName: hotel.names,
        imageId,
        imageUrl: finalImage,
        websiteUrl: finalWebsite
      });
    }

    // Insert new image row
    const nextIdResult = await query(
      "SELECT COALESCE(MAX(image_id), 0) + 1 AS next_id FROM hotel_image"
    );
    const nextImageId = nextIdResult.rows[0].next_id;

    await query(
      `
      INSERT INTO hotel_image (image_id, hotel_id, urls, caption, image)
      VALUES ($1, $2, $3, NULL, $4)
      `,
      [nextImageId, hotelId, cleanWebsiteUrl, cleanImageUrl]
    );

    res.json({
      message: "Hotel website & image inserted successfully",
      action: "inserted",
      hotelId,
      hotelName: hotel.names,
      imageId: nextImageId,
      imageUrl: cleanImageUrl,
      websiteUrl: cleanWebsiteUrl
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to save hotel data",
      details: error.message
    });
  }
}

module.exports = {
  getHotelsForImagePicker,
  saveSelectedHotelImage
};