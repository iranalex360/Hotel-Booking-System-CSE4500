const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query } = require("../db");
const { JWT_SECRET } = require("../middleware/authMiddleware");

function determineRole(email) {
  if (!email) return "user";
  const cleanEmail = email.toLowerCase().trim();
  if (cleanEmail.includes("admin") || cleanEmail.endsWith("@admin.com")) {
    return "admin";
  }
  return "user";
}

async function registerUser(req, res) {
  try {
    const { full_name, email, password, phone } = req.body;

    if (!full_name || !email || !password || !phone) {
      return res.status(400).json({ message: "Please fill in all fields." });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters."
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if email already exists
    const existingUser = await query(
      "SELECT users_id FROM users WHERE LOWER(email) = $1",
      [cleanEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    // Get next ID
    const idResult = await query(
      "SELECT COALESCE(MAX(users_id), 0) + 1 AS next_id FROM users"
    );
    const nextUserId = idResult.rows[0].next_id;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const role = determineRole(cleanEmail);

    await query(
      `
      INSERT INTO users (users_id, full_name, email, password, phone, email_verified)
      VALUES ($1, $2, $3, $4, $5, TRUE)
      `,
      [nextUserId, full_name, cleanEmail, hashedPassword, phone]
    );

    // Sign JWT token
    const token = jwt.sign(
      { users_id: nextUserId, email: cleanEmail, role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      message: "Account created successfully.",
      token,
      user: {
        users_id: nextUserId,
        full_name,
        email: cleanEmail,
        phone,
        role
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

    const cleanEmail = email.toLowerCase().trim();

    const result = await query(
      `
      SELECT users_id, full_name, email, password, phone
      FROM users
      WHERE LOWER(email) = $1
      `,
      [cleanEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const user = result.rows[0];
    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const role = determineRole(user.email);

    // Sign JWT token
    const token = jwt.sign(
      { users_id: user.users_id, email: user.email, role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      message: "Signed in successfully.",
      token,
      user: {
        users_id: user.users_id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role
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