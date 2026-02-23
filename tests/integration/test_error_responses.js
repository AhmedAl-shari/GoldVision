/**
 * Test suite for RFC 7807 error response standardization
 */

const request = require("supertest");
const app = require("./express-backend-enhanced");
const {
  createStandardError,
  createValidationError,
  createRateLimitError,
  createAuthError,
  createAuthorizationError,
  createNotFoundError,
  createInternalError,
} = require("./src/utils/errorResponse");

describe("Error Response Standardization", () => {
  let server;

  beforeAll(() => {
    server = app.listen(0);
  });

  afterAll(() => {
    server.close();
  });

  describe("RFC 7807 Compliance", () => {
    test("400 Bad Request should return RFC 7807 format", async () => {
      const response = await request(app)
        .post("/forecast")
        .send({ invalid: "data" });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("type");
      expect(response.body).toHaveProperty("title");
      expect(response.body).toHaveProperty("status", 400);
      expect(response.body).toHaveProperty("detail");
      expect(response.body).toHaveProperty("instance");
      expect(response.body).toHaveProperty("request_id");
    });

    test("401 Unauthorized should return RFC 7807 format", async () => {
      const response = await request(app).get("/admin/data-source");

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("type");
      expect(response.body).toHaveProperty("title");
      expect(response.body).toHaveProperty("status", 401);
      expect(response.body).toHaveProperty("detail");
      expect(response.body).toHaveProperty("instance");
    });

    test("403 Forbidden should return RFC 7807 format", async () => {
      const response = await request(app)
        .get("/admin/data-source")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty("type");
      expect(response.body).toHaveProperty("title");
      expect(response.body).toHaveProperty("status", 403);
      expect(response.body).toHaveProperty("detail");
      expect(response.body).toHaveProperty("instance");
    });

    test("404 Not Found should return RFC 7807 format", async () => {
      const response = await request(app).get("/nonexistent-endpoint");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("type");
      expect(response.body).toHaveProperty("title");
      expect(response.body).toHaveProperty("status", 404);
      expect(response.body).toHaveProperty("detail");
      expect(response.body).toHaveProperty("instance");
    });

    test("422 Validation Error should return RFC 7807 format", async () => {
      const response = await request(app)
        .post("/prices/ingest")
        .set("Authorization", "Bearer admin-token")
        .send({ invalid: "data" });

      expect(response.status).toBe(422);
      expect(response.body).toHaveProperty("type");
      expect(response.body).toHaveProperty("title");
      expect(response.body).toHaveProperty("status", 422);
      expect(response.body).toHaveProperty("detail");
      expect(response.body).toHaveProperty("instance");
      expect(response.body).toHaveProperty("errors");
      expect(Array.isArray(response.body.errors)).toBe(true);
    });

    test("429 Rate Limited should return RFC 7807 format", async () => {
      // Make multiple requests to trigger rate limiting
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post("/auth/login")
          .send({ email: "test", password: "test" });
      }

      const response = await request(app)
        .post("/auth/login")
        .send({ email: "test", password: "test" });

      expect(response.status).toBe(429);
      expect(response.body).toHaveProperty("type");
      expect(response.body).toHaveProperty("title");
      expect(response.body).toHaveProperty("status", 429);
      expect(response.body).toHaveProperty("detail");
      expect(response.body).toHaveProperty("instance");
      expect(response.body).toHaveProperty("retry_after");
    });
  });

  describe("Error Response Utility Functions", () => {
    test("createStandardError should create proper error format", () => {
      const error = createStandardError(400, "Test error", "/test", "req-123");

      expect(error).toHaveProperty("type");
      expect(error).toHaveProperty("title", "Bad Request");
      expect(error).toHaveProperty("status", 400);
      expect(error).toHaveProperty("detail", "Test error");
      expect(error).toHaveProperty("instance", "/test");
      expect(error).toHaveProperty("request_id", "req-123");
    });

    test("createValidationError should create validation error format", () => {
      const validationErrors = [
        {
          errorCode: "REQUIRED",
          message: "Field is required",
          path: "email",
          value: null,
        },
      ];
      const error = createValidationError(validationErrors, "/test", "req-123");

      expect(error).toHaveProperty("type");
      expect(error).toHaveProperty("title", "Validation Error");
      expect(error).toHaveProperty("status", 422);
      expect(error).toHaveProperty("detail", "Request validation failed");
      expect(error).toHaveProperty("instance", "/test");
      expect(error).toHaveProperty("request_id", "req-123");
      expect(error).toHaveProperty("errors");
      expect(Array.isArray(error.errors)).toBe(true);
      expect(error.errors[0]).toHaveProperty("code", "REQUIRED");
      expect(error.errors[0]).toHaveProperty("message", "Field is required");
      expect(error.errors[0]).toHaveProperty("path", "email");
      expect(error.errors[0]).toHaveProperty("value", null);
    });

    test("createRateLimitError should create rate limit error format", () => {
      const error = createRateLimitError(
        "Too many requests",
        60,
        "/test",
        "req-123"
      );

      expect(error).toHaveProperty("type");
      expect(error).toHaveProperty("title", "Too Many Requests");
      expect(error).toHaveProperty("status", 429);
      expect(error).toHaveProperty("detail", "Too many requests");
      expect(error).toHaveProperty("instance", "/test");
      expect(error).toHaveProperty("request_id", "req-123");
      expect(error).toHaveProperty("retry_after", 60);
    });

    test("createAuthError should create authentication error format", () => {
      const error = createAuthError("Invalid credentials", "/test", "req-123");

      expect(error).toHaveProperty("type");
      expect(error).toHaveProperty("title", "Unauthorized");
      expect(error).toHaveProperty("status", 401);
      expect(error).toHaveProperty("detail", "Invalid credentials");
      expect(error).toHaveProperty("instance", "/test");
      expect(error).toHaveProperty("request_id", "req-123");
    });

    test("createAuthorizationError should create authorization error format", () => {
      const error = createAuthorizationError(
        "Access denied",
        "/test",
        "req-123"
      );

      expect(error).toHaveProperty("type");
      expect(error).toHaveProperty("title", "Forbidden");
      expect(error).toHaveProperty("status", 403);
      expect(error).toHaveProperty("detail", "Access denied");
      expect(error).toHaveProperty("instance", "/test");
      expect(error).toHaveProperty("request_id", "req-123");
    });

    test("createNotFoundError should create not found error format", () => {
      const error = createNotFoundError(
        "Resource not found",
        "/test",
        "req-123"
      );

      expect(error).toHaveProperty("type");
      expect(error).toHaveProperty("title", "Not Found");
      expect(error).toHaveProperty("status", 404);
      expect(error).toHaveProperty("detail", "Resource not found");
      expect(error).toHaveProperty("instance", "/test");
      expect(error).toHaveProperty("request_id", "req-123");
    });

    test("createInternalError should create internal error format", () => {
      const error = createInternalError(
        "Internal server error",
        "/test",
        "req-123"
      );

      expect(error).toHaveProperty("type");
      expect(error).toHaveProperty("title", "Internal Server Error");
      expect(error).toHaveProperty("status", 500);
      expect(error).toHaveProperty("detail", "Internal server error");
      expect(error).toHaveProperty("instance", "/test");
      expect(error).toHaveProperty("request_id", "req-123");
    });
  });

  describe("Error Response Headers", () => {
    test("Error responses should include proper content-type header", async () => {
      const response = await request(app).get("/nonexistent-endpoint");

      expect(response.status).toBe(404);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });

    test("Rate limit responses should include Retry-After header", async () => {
      // Make multiple requests to trigger rate limiting
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post("/auth/login")
          .send({ email: "test", password: "test" });
      }

      const response = await request(app)
        .post("/auth/login")
        .send({ email: "test", password: "test" });

      expect(response.status).toBe(429);
      expect(response.headers["retry-after"]).toBeDefined();
    });
  });

  describe("Error Response Consistency", () => {
    test("All error responses should have consistent structure", async () => {
      const endpoints = [
        { method: "get", path: "/nonexistent", expectedStatus: 404 },
        { method: "post", path: "/auth/login", body: {}, expectedStatus: 400 },
        { method: "get", path: "/admin/data-source", expectedStatus: 401 },
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          [endpoint.method](endpoint.path)
          .send(endpoint.body || {});

        expect(response.status).toBe(endpoint.expectedStatus);
        expect(response.body).toHaveProperty("type");
        expect(response.body).toHaveProperty("title");
        expect(response.body).toHaveProperty("status");
        expect(response.body).toHaveProperty("detail");
        expect(response.body).toHaveProperty("instance");
      }
    });
  });
});

// Run tests if called directly
if (require.main === module) {
  const { execSync } = require("child_process");

  console.log("🧪 Running Error Response Tests...");
  console.log("=====================================");

  try {
    execSync("npm test test_error_responses.js", { stdio: "inherit" });
    console.log("✅ All error response tests passed!");
  } catch (error) {
    console.error("❌ Error response tests failed:", error.message);
    process.exit(1);
  }
}
