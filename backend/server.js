const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const hotelsRoutes = require("./routes/hotels");
const bookingsRoutes = require("./routes/bookings");
const imageCandidatesRoutes = require("./routes/imageCandidates");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.send("API is running");
});

app.use("/api/hotels", hotelsRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/image-candidates", imageCandidatesRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});