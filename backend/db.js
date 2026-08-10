const { Pool } = require("pg");
require("dotenv").config();

let poolConfig;

if (process.env.DATABASE_URL) {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  };
} else {
  poolConfig = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 6543,
    database: process.env.DB_DATABASE || "postgres",
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
  };
}

const pool = new Pool(poolConfig);

pool.on("connect", () => {
  console.log("Connected to PostgreSQL (Supabase)");
});

pool.on("error", (err) => {
  console.error("Unexpected database error:", err);
});

// Simple query helper — returns a pg result object (use result.rows)
async function query(text, params) {
  const result = await pool.query(text, params);
  return result;
}

// For transactions — caller must release the client
async function getClient() {
  return pool.connect();
}

module.exports = { query, getClient };