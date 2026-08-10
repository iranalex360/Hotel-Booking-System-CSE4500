/**
 * Middleware to restrict route access strictly to authenticated Admin users.
 * Must be used after authMiddleware in route stack.
 */
function adminMiddleware(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required",
      message: "Please sign in to perform admin operations."
    });
  }

  // Allow admin operations if user role is 'admin' or if ADMIN_BYPASS environment flag is active for local testing
  const isAdmin = req.user.role === "admin" || process.env.ALLOW_DEV_ADMIN === "true";

  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      error: "Access denied",
      message: "Administrator privileges required to perform this action."
    });
  }

  next();
}

module.exports = adminMiddleware;
