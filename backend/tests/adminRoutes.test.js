const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const adminRoutes = require("../routes/adminRoutes");
const { JWT_SECRET } = require("../middleware/authMiddleware");

const app = express();
app.use(cookieParser());
app.use("/admin", adminRoutes);

describe("Commercial Admin Server Routes Protection", () => {
  it("should reject unauthenticated access to /admin/hotels with redirect to /auth.html", async () => {
    const res = await request(app).get("/admin/hotels");
    expect(res.status).toBe(302);
    expect(res.header.location).toContain("/auth.html");
  });

  it("should reject non-admin users with 403 Forbidden", async () => {
    const userToken = jwt.sign(
      { users_id: 50, email: "user@checkin.com", role: "user" },
      JWT_SECRET
    );

    const res = await request(app)
      .get("/admin/hotels")
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(403);
    expect(res.text).toContain("403 Access Denied");
  });

  it("should allow authenticated admin users to access /admin/hotels", async () => {
    const adminToken = jwt.sign(
      { users_id: 1, email: "admin@checkin.com", role: "admin" },
      JWT_SECRET
    );

    const res = await request(app)
      .get("/admin/hotels")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.text).toContain("Add Hotel Images | Admin Dashboard");
  });
});
