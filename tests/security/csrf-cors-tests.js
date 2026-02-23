const axios = require("axios");
const assert = require("assert");

const BASE_URL = "http://localhost:8000";

describe("Security Tests", () => {
  let authToken = null;
  let csrfToken = null;
  let sessionId = null;

  before(async () => {
    // Login to get authentication
    try {
      const loginResponse = await axios.post(
        `${BASE_URL}/auth/login`,
        {
          email: "demo@goldvision.com",
          password: "demo123",
        },
        {
          withCredentials: true,
        }
      );

      authToken = loginResponse.data.access_token;
      csrfToken = loginResponse.data.csrf_token;
      sessionId = loginResponse.data.session_id;
    } catch (error) {
      console.error("Login failed:", error.message);
      throw error;
    }
  });

  describe("CSRF Protection", () => {
    it("should allow POST requests with valid CSRF token", async () => {
      try {
        const response = await axios.post(
          `${BASE_URL}/alerts`,
          {
            rule_type: "price_alert",
            threshold: 2000,
            direction: "above",
            asset: "XAU",
            currency: "USD",
          },
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
              "X-CSRF-Token": csrfToken,
              "X-Session-ID": sessionId,
            },
            withCredentials: true,
          }
        );

        assert.strictEqual(response.status, 200);
        console.log("✅ CSRF happy path test passed");
      } catch (error) {
        console.error("CSRF happy path test failed:", error.response?.data);
        throw error;
      }
    });

    it("should block POST requests without CSRF token", async () => {
      try {
        await axios.post(
          `${BASE_URL}/alerts`,
          {
            rule_type: "price_alert",
            threshold: 2000,
            direction: "above",
            asset: "XAU",
            currency: "USD",
          },
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
              "X-Session-ID": sessionId,
            },
            withCredentials: true,
          }
        );

        assert.fail("Request should have been blocked");
      } catch (error) {
        assert.strictEqual(error.response?.status, 403);
        assert.strictEqual(error.response?.data?.detail, "Invalid CSRF token");
        console.log("✅ CSRF protection test passed");
      }
    });

    it("should block POST requests with invalid CSRF token", async () => {
      try {
        await axios.post(
          `${BASE_URL}/alerts`,
          {
            rule_type: "price_alert",
            threshold: 2000,
            direction: "above",
            asset: "XAU",
            currency: "USD",
          },
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
              "X-CSRF-Token": "invalid-token",
              "X-Session-ID": sessionId,
            },
            withCredentials: true,
          }
        );

        assert.fail("Request should have been blocked");
      } catch (error) {
        assert.strictEqual(error.response?.status, 403);
        assert.strictEqual(error.response?.data?.detail, "Invalid CSRF token");
        console.log("✅ CSRF invalid token test passed");
      }
    });
  });

  describe("CORS Protection", () => {
    it("should allow requests from localhost:5173", async () => {
      try {
        const response = await axios.get(`${BASE_URL}/health`, {
          headers: {
            Origin: "http://localhost:5173",
          },
        });

        assert.strictEqual(response.status, 200);
        assert.strictEqual(
          response.headers["access-control-allow-origin"],
          "http://localhost:5173"
        );
        console.log("✅ CORS localhost test passed");
      } catch (error) {
        console.error("CORS localhost test failed:", error.response?.data);
        throw error;
      }
    });

    it("should block requests from unauthorized origins", async () => {
      try {
        await axios.get(`${BASE_URL}/health`, {
          headers: {
            Origin: "https://malicious.com",
          },
        });

        assert.fail("Request should have been blocked");
      } catch (error) {
        assert(
          error.message.includes("CORS") ||
            error.message.includes("Not allowed")
        );
        console.log("✅ CORS unauthorized origin test passed");
      }
    });

    it("should allow requests with no origin (mobile apps)", async () => {
      try {
        const response = await axios.get(`${BASE_URL}/health`);

        assert.strictEqual(response.status, 200);
        console.log("✅ CORS no origin test passed");
      } catch (error) {
        console.error("CORS no origin test failed:", error.response?.data);
        throw error;
      }
    });
  });

  describe("Rate Limiting", () => {
    it("should enforce rate limits on forecast endpoint", async () => {
      const requests = [];

      // Make 35 requests (limit is 30/min)
      for (let i = 0; i < 35; i++) {
        requests.push(
          axios
            .post(
              `${BASE_URL}/forecast`,
              {
                horizon_days: 7,
              },
              {
                headers: {
                  Authorization: `Bearer ${authToken}`,
                  "X-CSRF-Token": csrfToken,
                  "X-Session-ID": sessionId,
                },
                withCredentials: true,
              }
            )
            .catch((error) => error.response)
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter((r) => r?.status === 429);

      assert(
        rateLimitedResponses.length > 0,
        "Should have some rate limited responses"
      );
      console.log(
        `✅ Rate limiting test passed - ${rateLimitedResponses.length} requests were rate limited`
      );
    });
  });

  describe("Cookie Security", () => {
    it("should set httpOnly cookies on login", async () => {
      try {
        const response = await axios.post(
          `${BASE_URL}/auth/login`,
          {
            email: "demo@goldvision.com",
            password: "demo123",
          },
          {
            withCredentials: true,
          }
        );

        const setCookieHeaders = response.headers["set-cookie"];
        assert(setCookieHeaders, "Should have set-cookie headers");

        const authCookie = setCookieHeaders.find((cookie) =>
          cookie.includes("auth_token")
        );
        const csrfCookie = setCookieHeaders.find((cookie) =>
          cookie.includes("csrf_token")
        );

        assert(authCookie, "Should have auth_token cookie");
        assert(csrfCookie, "Should have csrf_token cookie");
        assert(
          authCookie.includes("HttpOnly"),
          "auth_token should be httpOnly"
        );
        assert(
          !csrfCookie.includes("HttpOnly"),
          "csrf_token should not be httpOnly"
        );

        console.log("✅ Cookie security test passed");
      } catch (error) {
        console.error("Cookie security test failed:", error.response?.data);
        throw error;
      }
    });
  });
});

// Run tests if called directly
if (require.main === module) {
  const runTests = async () => {
    try {
      await require("mocha").run();
      console.log("🎉 All security tests passed!");
      process.exit(0);
    } catch (error) {
      console.error("❌ Security tests failed:", error.message);
      process.exit(1);
    }
  };

  runTests();
}
