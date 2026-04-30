const { fetchImageCandidates } = require("../services/imageCandidateService");
const { getConnection, sql } = require("../db");

async function getImageCandidates(req, res) {
  try {
    const websiteUrl = req.body?.websiteUrl;

    if (!websiteUrl) {
      return res.status(400).json({ error: "websiteUrl is required" });
    }

    const candidates = await fetchImageCandidates(websiteUrl);

    res.json({
      websiteUrl,
      candidates
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      error: "Failed to fetch image candidates",
      details: error.message
    });
  }
}

async function saveSelectedHotelImage(req, res) {
  try {
    const hotelId = Number(req.params.id);
    const { imageUrl } = req.body;

    if (!hotelId || !imageUrl) {
      return res.status(400).json({ error: "hotelId and imageUrl are required" });
    }

    const pool = await getConnection();

    await pool
      .request()
      .input("hotel_id", sql.Int, hotelId)
      .input("imageUrl", sql.VarChar(sql.MAX), imageUrl)
      .query(`
        UPDATE dbo.hotel_image
        SET image = @imageUrl
        WHERE hotel_id = @hotel_id
      `);

    res.status(200).json({
      message: "Image saved to image column",
      hotelId,
      imageUrl
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      error: "Failed to save image",
      details: error.message
    });
  }
}

async function fillAllHotelImages(req, res) {
  try {
    const pool = await getConnection();

    const rowsResult = await pool.request().query(`
      SELECT hi.image_id, hi.hotel_id, hi.urls, hi.image, hi.caption, h.names
      FROM dbo.hotel_image hi
      JOIN dbo.hotel h ON hi.hotel_id = h.hotel_id
      WHERE hi.urls IS NOT NULL
        AND LTRIM(RTRIM(hi.urls)) <> ''
    `);

    const rows = rowsResult.recordset;
    const results = [];

    for (const row of rows) {
      try {
        if (row.image && String(row.image).trim() !== "") {
          results.push({
            image_id: row.image_id,
            hotel_id: row.hotel_id,
            hotel_name: row.names,
            status: "skipped",
            reason: "Image already exists in image column"
          });
          continue;
        }

        const sourceUrl = row.urls;
        const candidates = await fetchImageCandidates(sourceUrl);

        if (!candidates.length) {
          results.push({
            image_id: row.image_id,
            hotel_id: row.hotel_id,
            hotel_name: row.names,
            status: "no-image-found"
          });
          continue;
        }

        const topChoice = candidates[0];

        await pool
          .request()
          .input("image_id", sql.Int, row.image_id)
          .input("imageUrl", sql.VarChar(sql.MAX), topChoice.url)
          .query(`
            UPDATE dbo.hotel_image
            SET image = @imageUrl
            WHERE image_id = @image_id
          `);

        results.push({
          image_id: row.image_id,
          hotel_id: row.hotel_id,
          hotel_name: row.names,
          status: "updated",
          sourceUrl,
          imageUrl: topChoice.url,
          source: topChoice.source,
          score: topChoice.score
        });
      } catch (rowError) {
        results.push({
          image_id: row.image_id,
          hotel_id: row.hotel_id,
          hotel_name: row.names,
          status: "error",
          error: rowError.message
        });
      }
    }

    res.json({
      message: "Finished processing hotel images",
      total: rows.length,
      results
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      error: "Failed to process hotel images",
      details: error.message
    });
  }
}

module.exports = {
  getImageCandidates,
  saveSelectedHotelImage,
  fillAllHotelImages
};