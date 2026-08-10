const { query } = require("../db");

async function forceVerifyAllUsers() {
  try {
    await query("UPDATE users SET email_verified = TRUE WHERE email_verified IS NULL OR email_verified = FALSE;");
    console.log("✓ Updated all users in Supabase PostgreSQL to email_verified = TRUE");
    process.exit(0);
  } catch (err) {
    console.error("Error updating users:", err);
    process.exit(1);
  }
}

forceVerifyAllUsers();
