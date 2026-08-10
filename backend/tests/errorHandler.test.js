const errorHandler = require("../middleware/errorHandler");

describe("errorHandler Middleware Unit Tests", () => {
  let req, res, next;

  beforeEach(() => {
    req = { originalUrl: "/api/test", method: "GET" };
    res = {
      statusCode: 200,
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  test("1. Format custom error cleanly with 500 status fallback", () => {
    const error = new Error("Database connection timeout");
    error.name = "DatabaseError";

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: "DatabaseError",
        message: "Database connection timeout"
      })
    );
  });

  test("2. Preserve status code if explicitly set on res", () => {
    res.statusCode = 404;
    const error = new Error("Resource not found");

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
