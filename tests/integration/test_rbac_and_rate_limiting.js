#!/usr/bin/env node
/**
 * RBAC and Rate Limiting Tests for GoldVision API
 */

const axios = require("axios");

const BASE_URL = "http://127.0.0.1:8000";

async function testTokenReuseRejection() {
  console.log("🔐 Testing token reuse rejection...");

  try {
    // Login to get tokens
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: "demo@goldvision.com",
      password: "demo123",
    });

    const { access_token, refresh_token } = loginResponse.data;
    console.log("  ✅ Login successful");

    // Use the access token
    const adminResponse = await axios.get(`${BASE_URL}/admin/metrics`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    console.log("  ✅ Admin access with fresh token successful");

    // Refresh the token
    const refreshResponse = await axios.post(`${BASE_URL}/auth/refresh`, {
      refresh_token,
    });
    console.log("  ✅ Token refresh successful");

    // Try to use the old access token (should fail)
    try {
      await axios.get(`${BASE_URL}/admin/metrics`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      console.log("  ❌ Old token should have been rejected");
    } catch (error) {
      if (error.response?.status === 401) {
        console.log("  ✅ Old token correctly rejected");
      } else {
        console.log("  ❌ Unexpected error:", error.message);
      }
    }

    // Try to use the old refresh token (should fail)
    try {
      await axios.post(`${BASE_URL}/auth/refresh`, {
        refresh_token,
      });
      console.log("  ❌ Old refresh token should have been rejected");
    } catch (error) {
      if (error.response?.status === 401) {
        console.log("  ✅ Old refresh token correctly rejected");
      } else {
        console.log("  ❌ Unexpected error:", error.message);
      }
    }
  } catch (error) {
    console.log("  ❌ Test failed:", error.message);
  }
}

async function testRateLimiting() {
  console.log("\n🚦 Testing rate limiting...");

  const promises = [];

  // Make 6 login attempts rapidly (limit is 5)
  for (let i = 0; i < 6; i++) {
    promises.push(
      axios
        .post(`${BASE_URL}/auth/login`, {
          email: "demo@goldvision.com",
          password: "wrongpassword", // Use wrong password to trigger rate limiting
        })
        .catch((error) => ({ error }))
    );
  }

  const results = await Promise.all(promises);

  let successCount = 0;
  let rateLimitedCount = 0;

  results.forEach((result, index) => {
    if (result.error) {
      if (result.error.response?.status === 429) {
        rateLimitedCount++;
        console.log(`  ✅ Request ${index + 1}: Rate limited (429)`);
      } else if (result.error.response?.status === 401) {
        successCount++;
        console.log(`  ✅ Request ${index + 1}: Invalid credentials (401)`);
      } else {
        console.log(
          `  ❌ Request ${index + 1}: Unexpected error:`,
          result.error.message
        );
      }
    } else {
      successCount++;
      console.log(`  ❌ Request ${index + 1}: Should have failed`);
    }
  });

  console.log(
    `  📊 Results: ${successCount} auth failures, ${rateLimitedCount} rate limited`
  );

  if (rateLimitedCount > 0) {
    console.log("  ✅ Rate limiting working correctly");
  } else {
    console.log("  ❌ Rate limiting not working");
  }
}

async function testRBAC() {
  console.log("\n🔒 Testing RBAC...");

  try {
    // Test without authentication
    try {
      await axios.post(`${BASE_URL}/prices/ingest`, {
        rows: [{ ds: "2025-01-01", price: 2000 }],
      });
      console.log("  ❌ Unauthenticated request should have failed");
    } catch (error) {
      if (error.response?.status === 401) {
        console.log("  ✅ Unauthenticated request correctly rejected");
      } else {
        console.log("  ❌ Unexpected error:", error.message);
      }
    }

    // Wait a bit to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Test with authentication
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: "demo@goldvision.com",
      password: "demo123",
    });

    const { access_token } = loginResponse.data;

    const ingestResponse = await axios.post(
      `${BASE_URL}/prices/ingest`,
      {
        rows: [{ ds: "2025-01-01", price: 2000 }],
      },
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    if (ingestResponse.status === 200) {
      console.log("  ✅ Authenticated request successful");
    } else {
      console.log("  ❌ Authenticated request failed");
    }
  } catch (error) {
    if (error.response?.status === 429) {
      console.log("  ⚠️  RBAC test skipped due to rate limiting");
    } else {
      console.log("  ❌ RBAC test failed:", error.message);
    }
  }
}

async function runAllTests() {
  console.log("🧪 Running RBAC and Rate Limiting Tests");
  console.log("=" * 50);

  await testTokenReuseRejection();
  await testRateLimiting();
  await testRBAC();

  console.log("\n✅ All tests completed!");
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testTokenReuseRejection,
  testRateLimiting,
  testRBAC,
  runAllTests,
};
