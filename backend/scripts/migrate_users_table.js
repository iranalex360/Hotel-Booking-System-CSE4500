const { query } = require("../db");

async function migrateUsersTable() {
  console.log("Migrating PostgreSQL users table for Email Verification & Google Auth...");
  try {
    // Add email_verified column if missing
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
    `);
    console.log("✓ Added 'email_verified' column.");

    // Add verification_code column if missing
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS verification_code VARCHAR(10) DEFAULT NULL;
    `);
    console.log("✓ Added 'verification_code' column.");

    // Mark pre-existing users as email_verified = true so current accounts continue working uninterrupted
    await query(`
      UPDATE users 
      SET email_verified = TRUE 
      WHERE email_verified IS NULL OR email_verified = FALSE;
    `);
    console.log("✓ Updated pre-existing user records to email_verified = TRUE.");

    console.log("\n🎉 Database Migration Successful!\n");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration Error:", err);
    process.exit(1);
  }
}

migrateUsersTable();
