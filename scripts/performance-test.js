#!/usr/bin/env node

const axios = require("axios");
const fs = require("fs");
const path = require("path");

const BASE_URL = "http://127.0.0.1:8000";

async function runPerformanceTest(requests = 50, outputFile = null) {
  console.log(`🚀 Running performance test with ${requests} requests...`);

  const results = [];
  const startTime = Date.now();

  for (let i = 0; i < requests; i++) {
    const requestStart = Date.now();

    try {
      const response = await axios.post(
        `${BASE_URL}/forecast`,
        {
          horizon_days: 30,
        },
        {
          timeout: 10000,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const requestEnd = Date.now();
      const duration = requestEnd - requestStart;

      results.push({
        success: true,
        duration,
        status: response.status,
        requestNumber: i + 1,
      });

      console.log(`✅ Request ${i + 1}/${requests}: ${duration}ms`);
    } catch (error) {
      const requestEnd = Date.now();
      const duration = requestEnd - requestStart;

      results.push({
        success: false,
        duration,
        status: error.response?.status || 0,
        error: error.message,
        requestNumber: i + 1,
      });

      console.log(
        `❌ Request ${i + 1}/${requests}: ${duration}ms - ${error.message}`
      );
    }

    // Small delay to prevent overwhelming the server
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  const totalTime = Date.now() - startTime;
  const successfulRequests = results.filter((r) => r.success);
  const failedRequests = results.filter((r) => !r.success);

  // Calculate percentiles
  const durations = successfulRequests
    .map((r) => r.duration)
    .sort((a, b) => a - b);
  const p50 = durations[Math.floor(durations.length * 0.5)];
  const p95 = durations[Math.floor(durations.length * 0.95)];
  const p99 = durations[Math.floor(durations.length * 0.99)];

  const avgDuration =
    durations.reduce((sum, d) => sum + d, 0) / durations.length;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);

  const report = {
    test_info: {
      total_requests: requests,
      successful_requests: successfulRequests.length,
      failed_requests: failedRequests.length,
      success_rate:
        ((successfulRequests.length / requests) * 100).toFixed(2) + "%",
      total_time_ms: totalTime,
      requests_per_second: (requests / (totalTime / 1000)).toFixed(2),
    },
    performance_metrics: {
      avg_duration_ms: Math.round(avgDuration),
      min_duration_ms: minDuration,
      max_duration_ms: maxDuration,
      p50_duration_ms: p50,
      p95_duration_ms: p95,
      p99_duration_ms: p99,
    },
    thresholds: {
      p95_threshold_ms: 800,
      p95_passed: p95 <= 800,
      recommendation:
        p95 <= 800
          ? "Performance is within acceptable limits"
          : "Performance exceeds threshold - consider optimization",
    },
    timestamp: new Date().toISOString(),
  };

  // Print summary
  console.log("\n📊 Performance Test Results");
  console.log("=".repeat(50));
  console.log(`Total Requests: ${requests}`);
  console.log(`Successful: ${successfulRequests.length}`);
  console.log(`Failed: ${failedRequests.length}`);
  console.log(`Success Rate: ${report.test_info.success_rate}`);
  console.log(`Requests/sec: ${report.test_info.requests_per_second}`);
  console.log(`\nDuration Metrics:`);
  console.log(`  Average: ${report.performance_metrics.avg_duration_ms}ms`);
  console.log(`  P50: ${report.performance_metrics.p50_duration_ms}ms`);
  console.log(`  P95: ${report.performance_metrics.p95_duration_ms}ms`);
  console.log(`  P99: ${report.performance_metrics.p99_duration_ms}ms`);
  console.log(`\nThreshold Check:`);
  console.log(`  P95 Threshold: ${report.thresholds.p95_threshold_ms}ms`);
  console.log(
    `  Status: ${report.thresholds.p95_passed ? "✅ PASSED" : "❌ FAILED"}`
  );
  console.log(`  Recommendation: ${report.thresholds.recommendation}`);

  // Save report
  if (outputFile) {
    const outputPath = path.resolve(outputFile);
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to: ${outputPath}`);
  }

  // Exit with error code if threshold exceeded
  if (!report.thresholds.p95_passed) {
    console.log("\n❌ Performance test failed - P95 exceeds threshold");
    process.exit(1);
  } else {
    console.log("\n✅ Performance test passed");
    process.exit(0);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
let requests = 50;
let outputFile = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--requests" && args[i + 1]) {
    requests = parseInt(args[i + 1]);
    i++;
  } else if (args[i] === "--output" && args[i + 1]) {
    outputFile = args[i + 1];
    i++;
  }
}

// Run the test
runPerformanceTest(requests, outputFile).catch((error) => {
  console.error("❌ Performance test failed:", error.message);
  process.exit(1);
});
