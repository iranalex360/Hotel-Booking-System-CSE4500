const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const hotelsRoutes = require("./routes/hotels");
const bookingsRoutes = require("./routes/bookings");
const imageCandidatesRoutes = require("./routes/imageCandidates");
const authRoutes = require("./routes/auth");
const reviewsRoutes = require("./routes/reviews");
const adminRoutes = require("./routes/adminRoutes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled for local dev script/asset compatibility
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: false
  })
);

// Silence Chrome DevTools internal probe request
app.get("/.well-known/appspecific/com.chrome.devtools.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.status(200).json({});
});

// Enable Cookie Parser, CORS and JSON parsing
app.use(cookieParser());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// General API Rate Limiting (300 requests per 15 mins)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, error: "TooManyRequests", message: "Too many requests, please try again later." }
});

// Stricter Rate Limiting for Auth routes (25 attempts per 15 mins)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  message: { success: false, error: "TooManyRequests", message: "Too many authentication attempts. Please try again later." }
});

app.use("/api/", apiLimiter);
app.use("/api/auth/", authLimiter);

// Protected Commercial Admin Routes (Server-Side Auth Guarded)
app.use("/admin", adminRoutes);

// Serve Frontend Static Files
app.use(express.static(path.join(__dirname, "../frontend/src")));
app.use("/dist", express.static(path.join(__dirname, "../frontend/dist")));
app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Register API Routes
app.use("/api/hotels", hotelsRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/image-candidates", imageCandidatesRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/reviews", reviewsRoutes);

// Register Centralized Error Handling Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});