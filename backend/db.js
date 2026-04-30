const sql = require("mssql/msnodesqlv8");
require("dotenv").config();

const connectionString = `
Driver={ODBC Driver 17 for SQL Server};
Server=${process.env.DB_SERVER}\\${process.env.DB_INSTANCE};
Database=${process.env.DB_DATABASE};
Trusted_Connection=Yes;
`;

let pool;

async function getConnection() {
  try {
    if (pool) return pool;

    pool = await sql.connect({
      connectionString,
      options: {
        trustServerCertificate: true
      }
    });

    console.log("Connected to SQL Server");
    return pool;
  } catch (error) {
    console.error("Database connection failed:", error);
    throw error;
  }
}

module.exports = { sql, getConnection };