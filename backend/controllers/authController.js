const bcrypt = require("bcryptjs");
const { getConnection, sql } = require("../db");

async function registerUser(req, res) {
  try {
    const { full_name, email, password, phone } = req.body;

    if (!full_name || !email || !password || !phone) {
      return res.status(400).json({
        message: "Please fill in all fields."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters."
      });
    }

    const pool = await getConnection();

    const existingUser = await pool
      .request()
      .input("email", sql.VarChar(255), email)
      .query(`
        SELECT users_id
        FROM dbo.users
        WHERE email = @email
      `);

    if (existingUser.recordset.length > 0) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    const idResult = await pool.request().query(`
      SELECT ISNULL(MAX(users_id), 0) + 1 AS nextUserId
      FROM dbo.users
    `);

    const nextUserId = idResult.recordset[0].nextUserId;

    const hashedPassword = await bcrypt.hash(password, 10);
    const passwordBuffer = Buffer.from(hashedPassword, "utf8");

    await pool
      .request()
      .input("users_id", sql.Int, nextUserId)
      .input("full_name", sql.VarChar(255), full_name)
      .input("email", sql.VarChar(255), email)
      .input("password", sql.VarBinary(sql.MAX), passwordBuffer)
      .input("phone", sql.VarChar(50), phone)
      .query(`
        INSERT INTO dbo.users (
          users_id,
          full_name,
          email,
          password,
          phone
        )
        VALUES (
          @users_id,
          @full_name,
          @email,
          @password,
          @phone
        )
      `);

    res.status(201).json({
      message: "Account created successfully.",
      user: {
        users_id: nextUserId,
        full_name,
        email,
        phone
      }
    });
  } catch (error) {
    console.error("Register error:", error);

    res.status(500).json({
      message: error.message || "Failed to create account."
    });
  }
}

async function loginUser(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Please enter your email and password."
      });
    }

    const pool = await getConnection();

    const result = await pool
      .request()
      .input("email", sql.VarChar(255), email)
      .query(`
        SELECT
          users_id,
          full_name,
          email,
          password,
          phone
        FROM dbo.users
        WHERE email = @email
      `);

    if (result.recordset.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const user = result.recordset[0];

    const storedPassword = Buffer.isBuffer(user.password)
      ? user.password.toString("utf8")
      : String(user.password);

    const passwordMatches = await bcrypt.compare(password, storedPassword);

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    res.json({
      message: "Signed in successfully.",
      user: {
        users_id: user.users_id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: error.message || "Failed to sign in."
    });
  }
}

module.exports = {
  registerUser,
  loginUser
};