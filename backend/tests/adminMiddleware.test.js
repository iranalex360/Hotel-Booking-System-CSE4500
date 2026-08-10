const adminMiddleware = require("../middleware/adminMiddleware");

describe("adminMiddleware Unit Tests", () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  test("1. Reject unauthenticated request (no req.user)", () => {
    adminMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: "Authentication required"
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test("2. Reject regular user (role = 'user')", () => {
    req.user = { users_id: 5, email: "guest@example.com", role: "user" };

    adminMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: "Access denied"
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test("3. Allow admin user (role = 'admin')", () => {
    req.user = { users_id: 1, email: "admin@hotel.com", role: "admin" };

    adminMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
