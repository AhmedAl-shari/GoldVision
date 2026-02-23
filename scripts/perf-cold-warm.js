#!/usr/bin/env node

const axios = require("axios");
const fs = require("fs");
const path = require("path");

const API_BASE = "http://localhost:8000";
const RESULTS_FILE = "artifacts/perf_cold_warm_summary.txt";

// Performance test configuration
const COLD_RUNS = 10;
const WARM_RUNS = 20;
const HORIZON_DAYS = 30;

async function login() {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: "demo@goldvision.com",
      password: "demo123",
    });
    return response.data.access_token;
  } catch (error) {
    console.error("Login failed:", error.message);
    process.exit(1);
  }
}

async function makeForecastRequest(token, forceCold = false) {
  const startTime = Date.now();

  try {
    const response = await axios.post(
      `${API_BASE}/forecast`,
      {
        horizon_days: HORIZON_DAYS,
        force_cold: forceCold,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const latency = Date.now() - startTime;
    return { success: true, latency, status: response.status };
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      success: false,
      latency,
      status: error.response?.status || 500,
      error: error.message,
    };
  }
}

function calculatePercentiles(values, percentiles = [50, 95]) {
  const sorted = values.sort((a, b) => a - b);
  const results = {};

  percentiles.forEach((p) => {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    results[`p${p}`] = sorted[Math.max(0, index)];
  });

  return results;
}

async function runColdTests(token) {
  console.log(`🔥 Running ${COLD_RUNS} cold tests (cache miss)...`);
  const coldLatencies = [];

  for (let i = 0; i < COLD_RUNS; i++) {
    process.stdout.write(`  Cold test ${i + 1}/${COLD_RUNS}... `);

    const result = await makeForecastRequest(token, true);

    if (result.success) {
      coldLatencies.push(result.latency);
      console.log(`${result.latency}ms ✅`);
    } else {
      console.log(`FAILED (${result.status}) ❌`);
    }

    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return coldLatencies;
}

async function runWarmTests(token) {
  console.log(`\n⚡ Running ${WARM_RUNS} warm tests (cache hit)...`);
  const warmLatencies = [];

  for (let i = 0; i < WARM_RUNS; i++) {
    process.stdout.write(`  Warm test ${i + 1}/${WARM_RUNS}... `);

    const result = await makeForecastRequest(token, false);

    if (result.success) {
      warmLatencies.push(result.latency);
      console.log(`${result.latency}ms ✅`);
    } else {
      console.log(`FAILED (${result.status}) ❌`);
    }

    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return warmLatencies;
}

function generateReport(coldLatencies, warmLatencies) {
  const coldStats = calculatePercentiles(coldLatencies);
  const warmStats = calculatePercentiles(warmLatencies);

  const report = `
Performance Test Report - Cold vs Warm Forecast Latency
=======================================================

Test Configuration:
- Cold runs: ${COLD_RUNS} (force_cold=true, cache miss)
- Warm runs: ${WARM_RUNS} (cache hit)
- Horizon days: ${HORIZON_DAYS}
- Test time: ${new Date().toISOString()}

Cold Performance (Cache Miss):
- Successful requests: ${coldLatencies.length}/${COLD_RUNS}
- P50 latency: ${coldStats.p50}ms
- P95 latency: ${coldStats.p95}ms
- Min latency: ${Math.min(...coldLatencies)}ms
- Max latency: ${Math.max(...coldLatencies)}ms
- Average latency: ${Math.round(
    coldLatencies.reduce((a, b) => a + b, 0) / coldLatencies.length
  )}ms

Warm Performance (Cache Hit):
- Successful requests: ${warmLatencies.length}/${WARM_RUNS}
- P50 latency: ${warmStats.p50}ms
- P95 latency: ${warmStats.p95}ms
- Min latency: ${Math.min(...warmLatencies)}ms
- Max latency: ${Math.max(...warmLatencies)}ms
- Average latency: ${Math.round(
    warmLatencies.reduce((a, b) => a + b, 0) / warmLatencies.length
  )}ms

Performance Budgets:
- Cold P95 < 2000ms: ${coldStats.p95 < 2000 ? "✅ PASS" : "❌ FAIL"} (${
    coldStats.p95
  }ms)
- Warm P95 < 100ms: ${warmStats.p95 < 100 ? "✅ PASS" : "❌ FAIL"} (${
    warmStats.p95
  }ms)

Cache Effectiveness:
- Speedup factor: ${Math.round(
    coldStats.p50 / warmStats.p50
  )}x faster (warm vs cold P50)
- Cache hit ratio: ${Math.round(
    (warmLatencies.length / (coldLatencies.length + warmLatencies.length)) * 100
  )}%

Raw Data:
Cold latencies (ms): ${coldLatencies.join(", ")}
Warm latencies (ms): ${warmLatencies.join(", ")}
`;

  return report;
}

async function main() {
  console.log("🚀 Starting Cold/Warm Performance Test\n");

  // Ensure artifacts directory exists
  const artifactsDir = path.dirname(RESULTS_FILE);
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  try {
    // Login to get token
    console.log("🔐 Logging in...");
    const token = await login();
    console.log("✅ Login successful\n");

    // Run cold tests
    const coldLatencies = await runColdTests(token);

    // Run warm tests
    const warmLatencies = await runWarmTests(token);

    // Generate report
    console.log("\n📊 Generating performance report...");
    const report = generateReport(coldLatencies, warmLatencies);

    // Save report
    fs.writeFileSync(RESULTS_FILE, report);
    console.log(`✅ Report saved to ${RESULTS_FILE}`);

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("PERFORMANCE SUMMARY");
    console.log("=".repeat(60));

    const coldStats = calculatePercentiles(coldLatencies);
    const warmStats = calculatePercentiles(warmLatencies);

    console.log(`Cold P50: ${coldStats.p50}ms, P95: ${coldStats.p95}ms`);
    console.log(`Warm P50: ${warmStats.p50}ms, P95: ${warmStats.p95}ms`);
    console.log(`Speedup: ${Math.round(coldStats.p50 / warmStats.p50)}x`);

    // Check budgets
    const coldBudgetPass = coldStats.p95 < 2000;
    const warmBudgetPass = warmStats.p95 < 100;

    console.log(`\nBudget Status:`);
    console.log(`Cold P95 < 2000ms: ${coldBudgetPass ? "✅ PASS" : "❌ FAIL"}`);
    console.log(`Warm P95 < 100ms: ${warmBudgetPass ? "✅ PASS" : "❌ FAIL"}`);

    if (!coldBudgetPass || !warmBudgetPass) {
      console.log("\n⚠️  Performance budgets exceeded!");
      process.exit(1);
    } else {
      console.log("\n🎉 All performance budgets met!");
    }
  } catch (error) {
    console.error("❌ Performance test failed:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runColdTests, runWarmTests, calculatePercentiles };
