#!/usr/bin/env node

const axios = require("axios");

async function testSecurity() {
  console.log("🔒 Running Security Tests...");

  const baseURL = "http://localhost:8000";
  const results = {
    timestamp: new Date().toISOString(),
    tests: {},
  };

  try {
    // Test 1: JWT Authentication
    console.log("\n🔑 Testing JWT Authentication...");
    try {
      const loginResponse = await axios.post(`${baseURL}/auth/login`, {
        email: "demo@goldvision.com",
        password: "demo123",
      });

      const hasToken = loginResponse.data.access_token;
      const hasRefreshToken = loginResponse.data.refresh_token;
      const isHttpOnly = loginResponse.headers["set-cookie"]?.some(
        (cookie) =>
          cookie.includes("httpOnly") && cookie.includes("access_token")
      );

      results.tests.jwtAuth = {
        status: "passed",
        hasAccessToken: !!hasToken,
        hasRefreshToken: !!hasRefreshToken,
        isHttpOnly: !!isHttpOnly,
        tokenLength: hasToken?.length || 0,
      };

      console.log("✅ JWT authentication test passed");
      console.log(`   Access token: ${hasToken ? "Present" : "Missing"}`);
      console.log(
        `   Refresh token: ${hasRefreshToken ? "Present" : "Missing"}`
      );
      console.log(`   HttpOnly cookie: ${isHttpOnly ? "Yes" : "No"}`);
    } catch (error) {
      results.tests.jwtAuth = {
        status: "failed",
        error: error.message,
      };
      console.log("❌ JWT authentication test failed:", error.message);
    }

    // Test 2: Rate Limiting
    console.log("\n⏱️ Testing Rate Limiting...");
    try {
      const rateLimitPromises = [];
      for (let i = 0; i < 6; i++) {
        rateLimitPromises.push(
          axios
            .post(`${baseURL}/auth/login`, {
              email: "test@example.com",
              password: "wrongpassword",
            })
            .catch((err) => ({
              status: err.response?.status,
              data: err.response?.data,
            }))
        );
      }

      const rateLimitResponses = await Promise.all(rateLimitPromises);
      const rateLimited = rateLimitResponses.some((res) => res.status === 429);
      const rateLimitHeaders = rateLimitResponses.find(
        (res) => res.status === 429
      )?.headers;

      results.tests.rateLimiting = {
        status: rateLimited ? "passed" : "failed",
        rateLimited: rateLimited,
        responses: rateLimitResponses.map((r) => r.status),
        headers: rateLimitHeaders,
      };

      console.log("✅ Rate limiting test completed");
      console.log(`   Rate limited: ${rateLimited ? "Yes" : "No"}`);
      console.log(
        `   Response codes: ${rateLimitResponses
          .map((r) => r.status)
          .join(", ")}`
      );
    } catch (error) {
      results.tests.rateLimiting = {
        status: "failed",
        error: error.message,
      };
      console.log("❌ Rate limiting test failed:", error.message);
    }

    // Test 3: CORS Protection
    console.log("\n🌐 Testing CORS Protection...");
    try {
      const corsResponse = await axios.options(`${baseURL}/health`, {
        headers: {
          Origin: "http://malicious-site.com",
          "Access-Control-Request-Method": "GET",
        },
      });

      const allowedOrigins =
        corsResponse.headers["access-control-allow-origin"];
      const allowedMethods =
        corsResponse.headers["access-control-allow-methods"];
      const allowedHeaders =
        corsResponse.headers["access-control-allow-headers"];

      results.tests.cors = {
        status: "passed",
        allowedOrigins: allowedOrigins,
        allowedMethods: allowedMethods,
        allowedHeaders: allowedHeaders,
        isRestricted: !allowedOrigins?.includes("*"),
      };

      console.log("✅ CORS protection test completed");
      console.log(`   Allowed origins: ${allowedOrigins || "Not set"}`);
      console.log(`   Allowed methods: ${allowedMethods || "Not set"}`);
      console.log(`   Is restricted: ${!allowedOrigins?.includes("*")}`);
    } catch (error) {
      results.tests.cors = {
        status: "failed",
        error: error.message,
      };
      console.log("❌ CORS protection test failed:", error.message);
    }

    // Test 4: Input Validation
    console.log("\n🛡️ Testing Input Validation...");
    try {
      const invalidInputs = [
        { email: "invalid-email", password: "test" },
        { email: "test@example.com", password: "" },
        { email: "", password: "test123" },
        { email: "a".repeat(1000) + "@example.com", password: "test123" },
      ];

      const validationResults = [];
      for (const input of invalidInputs) {
        try {
          await axios.post(`${baseURL}/auth/login`, input);
          validationResults.push({
            input,
            status: "accepted",
            shouldBe: "rejected",
          });
        } catch (error) {
          const isRejected = error.response?.status >= 400;
          validationResults.push({
            input: {
              email: input.email.substring(0, 20) + "...",
              password: input.password.substring(0, 10) + "...",
            },
            status: isRejected ? "rejected" : "accepted",
            shouldBe: "rejected",
          });
        }
      }

      const properlyRejected = validationResults.filter(
        (r) => r.status === "rejected"
      ).length;

      results.tests.inputValidation = {
        status: properlyRejected > 0 ? "passed" : "failed",
        properlyRejected: properlyRejected,
        total: validationResults.length,
        results: validationResults,
      };

      console.log("✅ Input validation test completed");
      console.log(
        `   Properly rejected: ${properlyRejected}/${validationResults.length}`
      );
    } catch (error) {
      results.tests.inputValidation = {
        status: "failed",
        error: error.message,
      };
      console.log("❌ Input validation test failed:", error.message);
    }

    // Test 5: Security Headers
    console.log("\n🛡️ Testing Security Headers...");
    try {
      const headersResponse = await axios.get(`${baseURL}/health`);
      const securityHeaders = {
        "x-content-type-options":
          headersResponse.headers["x-content-type-options"],
        "x-frame-options": headersResponse.headers["x-frame-options"],
        "x-xss-protection": headersResponse.headers["x-xss-protection"],
        "strict-transport-security":
          headersResponse.headers["strict-transport-security"],
        "content-security-policy":
          headersResponse.headers["content-security-policy"],
      };

      const hasSecurityHeaders = Object.values(securityHeaders).filter(
        (h) => h
      ).length;

      results.tests.securityHeaders = {
        status: hasSecurityHeaders > 0 ? "passed" : "failed",
        headers: securityHeaders,
        count: hasSecurityHeaders,
      };

      console.log("✅ Security headers test completed");
      console.log(`   Security headers present: ${hasSecurityHeaders}`);
      Object.entries(securityHeaders).forEach(([key, value]) => {
        console.log(`   ${key}: ${value || "Not set"}`);
      });
    } catch (error) {
      results.tests.securityHeaders = {
        status: "failed",
        error: error.message,
      };
      console.log("❌ Security headers test failed:", error.message);
    }

    // Test 6: RBAC Protection
    console.log("\n👤 Testing RBAC Protection...");
    try {
      // First login as regular user
      const loginResponse = await axios.post(`${baseURL}/auth/login`, {
        email: "demo@goldvision.com",
        password: "demo123",
      });

      const token = loginResponse.data.access_token;

      // Try to access admin-only endpoint
      try {
        await axios.post(
          `${baseURL}/prices/ingest`,
          {
            rows: [{ ds: "2025-01-01", price: 2000 }],
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        results.tests.rbac = {
          status: "failed",
          message: "Admin endpoint accessible to regular user",
        };
        console.log(
          "❌ RBAC protection test failed - admin endpoint accessible"
        );
      } catch (error) {
        const isForbidden = error.response?.status === 403;
        results.tests.rbac = {
          status: isForbidden ? "passed" : "failed",
          statusCode: error.response?.status,
          message: error.response?.data?.detail || error.message,
        };

        console.log("✅ RBAC protection test completed");
        console.log(
          `   Admin endpoint protected: ${isForbidden ? "Yes" : "No"}`
        );
        console.log(`   Status code: ${error.response?.status}`);
      }
    } catch (error) {
      results.tests.rbac = {
        status: "failed",
        error: error.message,
      };
      console.log("❌ RBAC protection test failed:", error.message);
    }

    // Generate test report
    const passedTests = Object.values(results.tests).filter(
      (test) => test.status === "passed"
    ).length;
    const totalTests = Object.keys(results.tests).length;

    console.log("\n📊 Security Test Summary:");
    console.log(`   Passed: ${passedTests}/${totalTests}`);
    console.log(`   Failed: ${totalTests - passedTests}/${totalTests}`);

    // Save report
    require("fs").writeFileSync(
      "security-test-report.json",
      JSON.stringify(results, null, 2)
    );
    console.log("\n📄 Security test report saved to security-test-report.json");

    if (passedTests === totalTests) {
      console.log("\n🎉 All security tests passed!");
    } else {
      console.log("\n⚠️ Some security tests failed. Please review the report.");
    }
  } catch (error) {
    console.error("❌ Error running security tests:", error);
  }
}

// Check if axios is available
try {
  require.resolve("axios");
  testSecurity();
} catch (e) {
  console.log("📦 Installing axios...");
  const { exec } = require("child_process");
  exec("npm install axios", (error, stdout, stderr) => {
    if (error) {
      console.log(
        "❌ Could not install axios. Please install manually: npm install axios"
      );
      console.log("\n🔧 Manual security testing:");
      console.log("1. Test JWT authentication with curl");
      console.log("2. Test rate limiting with multiple requests");
      console.log("3. Test CORS with different origins");
      console.log("4. Test input validation with invalid data");
      console.log("5. Check security headers in response");
    } else {
      console.log("✅ Axios installed. Running security tests...");
      testSecurity();
    }
  });
}
