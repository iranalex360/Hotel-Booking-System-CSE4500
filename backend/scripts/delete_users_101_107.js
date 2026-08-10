const { getClient } = require("../db");

async function deleteUsersRange() {
  const client = await getClient();
  const startId = 101;
  const endId = 107;

  console.log(`Starting deletion for users_id from ${startId} to ${endId}...`);

  try {
    await client.query("BEGIN");

    // 1. Delete payment records associated with bookings for these users
    const paymentResult = await client.query(
      `
      DELETE FROM payment
      WHERE booking_id IN (
        SELECT booking_id FROM booking WHERE users_id BETWEEN $1 AND $2
      )
      `,
      [startId, endId]
    );
    console.log(`✓ Deleted ${paymentResult.rowCount} payment records.`);

    // 2. Delete booking records for these users
    const bookingResult = await client.query(
      "DELETE FROM booking WHERE users_id BETWEEN $1 AND $2",
      [startId, endId]
    );
    console.log(`✓ Deleted ${bookingResult.rowCount} booking records.`);

    // 3. Delete reviews for these users
    const reviewResult = await client.query(
      "DELETE FROM review WHERE users_id BETWEEN $1 AND $2",
      [startId, endId]
    );
    console.log(`✓ Deleted ${reviewResult.rowCount} review records.`);

    // 4. Delete the user records from users table
    const usersResult = await client.query(
      "DELETE FROM users WHERE users_id BETWEEN $1 AND $2",
      [startId, endId]
    );
    console.log(`✓ Deleted ${usersResult.rowCount} user records from users table.`);

    await client.query("COMMIT");
    console.log(`\n🎉 Successfully deleted all user data for users_id ${startId} through ${endId}!\n`);
    process.exit(0);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Deletion failed:", error);
    process.exit(1);
  } finally {
    client.release();
  }
}

deleteUsersRange();
