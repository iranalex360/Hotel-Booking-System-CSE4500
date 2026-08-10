const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "hotel_booking_default_secret_key_2026";

/**
 * Extracts JWT token from Authorization header, cookies, or query parameters.
 */
function extractToken(req) {
  // 1. Check Authorization Header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }

  // 2. Check HTTP Cookie
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }

  // 3. Check Query Parameter
  if (req.query && req.query.token) {
    return req.query.token;
  }

  return null;
}

/**
 * Middleware to authenticate requests using JWT tokens.
 */
function authMiddleware(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Authentication required",
      message: "Please sign in to access this resource."
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      users_id: decoded.users_id,
      email: decoded.email,
      role: decoded.role || "user"
    };
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: "Invalid or expired token",
      message: "Your session has expired. Please sign in again."
    });
  }
}

/**
 * Optional authentication middleware that attaches user info if valid token is provided.
 */
function optionalAuthMiddleware(req, res, next) {
  const token = extractToken(req);

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = {
        users_id: decoded.users_id,
        email: decoded.email,
        role: decoded.role || "user"
      };
    } catch (e) {
      // Ignore invalid token for optional auth
    }
  }
  next();
}

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  JWT_SECRET
};
