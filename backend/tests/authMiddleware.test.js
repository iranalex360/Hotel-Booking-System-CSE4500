const jwt = require("jsonwebtoken");
const { authMiddleware, optionalAuthMiddleware, JWT_SECRET } = require("../middleware/authMiddleware");

describe("authMiddleware Unit Tests", () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  test("1. Reject request with missing Authorization header", () => {
    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: "Authentication required"
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test("2. Reject request with malformed Bearer token", () => {
    req.headers.authorization = "Basic 12345";
    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: "Authentication required"
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test("3. Reject request with invalid/tampered JWT token", () => {
    req.headers.authorization = "Bearer invalid_token_string";
    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: "Invalid or expired token"
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test("4. Accept valid JWT token and attach req.user context", () => {
    const payload = { users_id: 10, email: "user@example.com", role: "user" };
    const validToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

    req.headers.authorization = `Bearer ${validToken}`;
    authMiddleware(req, res, next);

    expect(req.user).toBeDefined();
    expect(req.user.users_id).toBe(10);
    expect(req.user.email).toBe("user@example.com");
    expect(req.user.role).toBe("user");
    expect(next).toHaveBeenCalled();
  });

  test("5. optionalAuthMiddleware passes request even without token", () => {
    optionalAuthMiddleware(req, res, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  test("6. optionalAuthMiddleware attaches user if valid token is provided", () => {
    const payload = { users_id: 99, email: "admin@example.com", role: "admin" };
    const validToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

    req.headers.authorization = `Bearer ${validToken}`;
    optionalAuthMiddleware(req, res, next);

    expect(req.user).toBeDefined();
    expect(req.user.role).toBe("admin");
    expect(next).toHaveBeenCalled();
  });
});
