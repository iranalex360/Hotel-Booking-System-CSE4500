const { getClient } = require("../db");
require("dotenv").config();

// Get SerpApi key from environment or command line parameter
const SERPAPI_KEY = process.env.SERPAPI_KEY || process.argv[2];

if (!SERPAPI_KEY) {
  console.error("\n❌ Error: Missing SERPAPI_KEY!");
  console.error("Please add SERPAPI_KEY=your_key_here to backend/.env or run:");
  console.error("  node scripts/importSerpApiHotels.js YOUR_API_KEY\n");
  process.exit(1);
}

/**
 * Fetches real hotels from SerpApi (Google Hotels Engine) for a specific city and inserts into PostgreSQL database.
 * @param {string} cityName - Name of city to search
 * @param {number} stateId - State ID from 'states' table
 * @param {number} maxPages - Number of pages to fetch (1 page = ~20 hotels, 2 pages = ~40 hotels, etc.)
 */
async function fetchAndInsertHotelsForCity(cityName, stateId = 6, maxPages = 2) {
  console.log(`\n============================================================`);
  console.log(`🔍 Searching Google Hotels via SerpApi for: "${cityName}" (${maxPages} pages)`);
  console.log(`============================================================`);

  const checkIn = "2026-09-01";
  const checkOut = "2026-09-05";

  let pageToken = null;
  let allProperties = [];

  // Loop through pages using SerpApi's next_page_token
  for (let page = 1; page <= maxPages; page++) {
    let url = `https://serpapi.com/search.json?engine=google_hotels&q=hotels+in+${encodeURIComponent(cityName)}&check_in_date=${checkIn}&check_out_date=${checkOut}&currency=USD&gl=us&hl=en&api_key=${SERPAPI_KEY}`;
    
    if (pageToken) {
      url += `&next_page_token=${encodeURIComponent(pageToken)}`;
    }

    console.log(`   Fetching Page ${page} of ${maxPages}...`);

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        console.error(`❌ SerpApi Error for ${cityName} (Page ${page}):`, data.error);
        break;
      }

      const properties = data.properties || [];
      allProperties.push(...properties);
      console.log(`   + Page ${page} returned ${properties.length} hotels.`);

      // Check if there is a next page token
      pageToken = data.serpapi_pagination?.next_page_token || null;
      if (!pageToken) {
        console.log(`   No more pages available for ${cityName}.`);
        break;
      }
    } catch (apiErr) {
      console.error(`❌ Network error on Page ${page}:`, apiErr);
      break;
    }
  }

  console.log(`✅ Total hotels collected for ${cityName}: ${allProperties.length}`);

  if (allProperties.length === 0) return;

  const client = await getClient();

  try {
    await client.query("BEGIN");

    // 1. Ensure City exists in 'cities' table
    let cityId;
    const cityCheck = await client.query(
      "SELECT city_id FROM cities WHERE LOWER(city_name) = LOWER($1) LIMIT 1",
      [cityName]
    );

    if (cityCheck.rows.length > 0) {
      cityId = cityCheck.rows[0].city_id;
    } else {
      const nextCityIdRes = await client.query(
        "SELECT COALESCE(MAX(city_id), 0) + 1 AS next_id FROM cities"
      );
      cityId = nextCityIdRes.rows[0].next_id;
      await client.query(
        "INSERT INTO cities (city_id, city_name, state_id) VALUES ($1, $2, $3)",
        [cityId, cityName, stateId]
      );
      console.log(`  + Created city entry "${cityName}" (city_id: ${cityId})`);
    }

    let importedCount = 0;

    for (const item of allProperties) {
      const name = item.name;
      if (!name) continue;

      // Check if hotel already exists by name to avoid duplicate entries
      const existingHotel = await client.query(
        "SELECT hotel_id FROM hotel WHERE LOWER(names) = LOWER($1) LIMIT 1",
        [name]
      );
      if (existingHotel.rows.length > 0) {
        console.log(`  - Skipping existing hotel: "${name}"`);
        continue;
      }

      const description = item.description || (item.nearby_places ? `Located near ${item.nearby_places[0]?.name || cityName}.` : `Situated in ${cityName}.`);
      const starRating = item.extracted_hotel_class || Math.round(item.overall_rating || 4);
      const address = `${name}, ${cityName}`;
      const price = item.rate_per_night?.extracted_lowest || item.rate_per_night?.extracted_before_taxes_fees || 120;
      
      const mainImage = item.images?.[0]?.original_image || item.images?.[0]?.thumbnail || null;
      const hotelLink = item.link || "https://google.com/travel/hotels";
      const amenitiesCaption = item.amenities ? item.amenities.join(" • ") : "Free Wi-Fi • Air conditioning";

      // Generate next Hotel ID
      const nextHotelIdRes = await client.query(
        "SELECT COALESCE(MAX(hotel_id), 0) + 1 AS next_id FROM hotel"
      );
      const hotelId = nextHotelIdRes.rows[0].next_id;

      // Insert into 'hotel'
      await client.query(
        `INSERT INTO hotel (hotel_id, names, descriptions, address, city_id, star_rating)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [hotelId, name, description, address, cityId, Math.min(5, Math.max(1, starRating))]
      );

      // Insert into 'hotel_image'
      if (mainImage) {
        const nextImgIdRes = await client.query(
          "SELECT COALESCE(MAX(image_id), 0) + 1 AS next_id FROM hotel_image"
        );
        const imageId = nextImgIdRes.rows[0].next_id;

        await client.query(
          `INSERT INTO hotel_image (image_id, hotel_id, urls, caption, image)
           VALUES ($1, $2, $3, $4, $5)`,
          [imageId, hotelId, hotelLink, amenitiesCaption, mainImage]
        );
      }

      // Insert rooms for this hotel into 'room'
      const nextRoomIdRes = await client.query(
        "SELECT COALESCE(MAX(room_id), 0) + 1 AS next_id FROM room"
      );
      let roomId = nextRoomIdRes.rows[0].next_id;

      // Room 1: Standard Room
      await client.query(
        `INSERT INTO room (room_id, hotel_id, room_number, room_type_id, capacity, price, room_status_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [roomId, hotelId, 101, 2, 2, price, 1] // room_type_id 2 = Standard room, room_status_id 1 = Clean
      );

      // Room 2: Deluxe Room (+50% price boost)
      await client.query(
        `INSERT INTO room (room_id, hotel_id, room_number, room_type_id, capacity, price, room_status_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [roomId + 1, hotelId, 102, 1, 4, Math.round(price * 1.50), 1] // room_type_id 1 = Deluxe Room
      );

      importedCount++;
      console.log(`  [${importedCount}] Added: "${name}" ($${price}/night)`);
    }

    await client.query("COMMIT");
    console.log(`\n🎉 Successfully imported ${importedCount} hotels for ${cityName}!`);

  } catch (dbError) {
    await client.query("ROLLBACK");
    console.error(`❌ Database Error for ${cityName}:`, dbError);
  } finally {
    client.release();
  }
}

/**
 * Main Execution: Imports hotels for target cities with pagination
 */
async function main() {
  // Set how many pages to fetch per city (1 page = ~20 hotels, 2 pages = ~40 hotels, 3 pages = ~60 hotels)
  const PAGES_PER_CITY = 2; 

  const citiesToImport = [
    { name: "Los Angeles", stateId: 6 },
    { name: "New York", stateId: 35 }
  ];

  for (const city of citiesToImport) {
    await fetchAndInsertHotelsForCity(city.name, city.stateId, PAGES_PER_CITY);
  }

  console.log("\n============================================================");
  console.log("✨ ALL IMPORTS COMPLETE FOR TARGET CITIES! ✨");
  console.log("============================================================\n");
}

main();
