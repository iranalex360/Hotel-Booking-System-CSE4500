const express = require("express");
const path = require("path");
const jwt = require("jsonwebtoken");

const { JWT_SECRET } = require("../middleware/authMiddleware");

const router = express.Router();

function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  if (req.query && req.query.token) {
    return req.query.token;
  }
  return null;
}

// Custom Admin Page Middleware that redirects to auth page if unauthenticated
function adminPageAuthGuard(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.redirect("/auth.html?redirect=" + encodeURIComponent(req.originalUrl));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      users_id: decoded.users_id,
      email: decoded.email,
      role: decoded.role || "user"
    };

    if (req.user.role !== "admin") {
      return res.status(403).send(`
        <!DOCTYPE html>
        <html>
        <head><title>403 Forbidden</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #dc2626;">403 Access Denied</h1>
          <p>You must be signed in as an Administrator to access this page.</p>
          <a href="/auth.html" style="color: #0284c7; font-weight: bold;">Sign In as Admin</a>
        </body>
        </html>
      `);
    }

    next();
  } catch (error) {
    return res.redirect("/auth.html?redirect=" + encodeURIComponent(req.originalUrl));
  }
}

/**
 * GET /admin/hotels
 * Serves private backend/admin/add-hotel-image.html
 */
router.get("/hotels", adminPageAuthGuard, (req, res) => {
  res.sendFile(path.join(__dirname, "../admin/add-hotel-image.html"));
});

/**
 * GET /admin/picker
 * Serves private backend/admin/admin-images.html
 */
router.get("/picker", adminPageAuthGuard, (req, res) => {
  res.sendFile(path.join(__dirname, "../admin/admin-images.html"));
});

module.exports = router;
