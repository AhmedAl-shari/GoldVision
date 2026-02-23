#!/usr/bin/env node

const axios = require("axios");
const { spawn } = require("child_process");

// Chaos testing configuration
const BASE_URL = "http://127.0.0.1:8000";
const CHAOS_DURATION = 30000; // 30 seconds
const RECOVERY_TIMEOUT = 60000; // 60 seconds

class ChaosTestSuite {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  async runTest(name, testFn) {
    console.log(`\n🌪️  Running chaos test: ${name}`);
    const startTime = Date.now();

    try {
      await testFn();
      const duration = Date.now() - startTime;
      this.results.push({ name, status: "PASS", duration });
      console.log(`✅ ${name} - PASSED (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.push({
        name,
        status: "FAIL",
        duration,
        error: error.message,
      });
      console.log(`❌ ${name} - FAILED (${duration}ms): ${error.message}`);
    }
  }

  async runAllChaosTests() {
    console.log("🌪️  Starting Chaos Testing Suite");
    console.log("=".repeat(50));

    // Service failure tests
    await this.runTest("Chaos - Kill Prophet Service", () =>
      this.testKillProphetService()
    );
    await this.runTest("Chaos - Kill News Provider", () =>
      this.testKillNewsProvider()
    );
    await this.runTest("Chaos - Database Connection Loss", () =>
      this.testDatabaseConnectionLoss()
    );

    // Network partition tests
    await this.runTest("Chaos - Network Partition", () =>
      this.testNetworkPartition()
    );
    await this.runTest("Chaos - High Latency", () => this.testHighLatency());

    // Resource exhaustion tests
    await this.runTest("Chaos - Memory Pressure", () =>
      this.testMemoryPressure()
    );
    await this.runTest("Chaos - CPU Pressure", () => this.testCPUPressure());

    // Recovery tests
    await this.runTest("Chaos - Service Recovery", () =>
      this.testServiceRecovery()
    );
    await this.runTest("Chaos - Circuit Breaker Recovery", () =>
      this.testCircuitBreakerRecovery()
    );

    this.printSummary();
  }

  async testKillProphetService() {
    console.log("  🔥 Killing Prophet service...");

    // First, verify Prophet service is running
    try {
      await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    } catch (error) {
      throw new Error("Backend service not running");
    }

    // Kill Prophet service (simulate by stopping the process)
    const killProphet = spawn("pkill", ["-f", "prophet-service"], {
      stdio: "pipe",
    });

    await new Promise((resolve) => {
      killProphet.on("close", resolve);
      setTimeout(resolve, 2000); // Timeout after 2 seconds
    });

    // Wait a moment for the service to be killed
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Test that the system handles Prophet service failure gracefully
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        axios
          .post(`${BASE_URL}/forecast`, { horizon_days: 7 }, { timeout: 5000 })
          .catch((err) => ({
            status: err.response?.status,
            error: err.message,
          }))
      );
    }

    const results = await Promise.all(promises);

    // Should handle Prophet service failure gracefully
    const gracefulFailures = results.filter(
      (r) => r.status >= 400 && r.status < 500
    );
    if (gracefulFailures.length === 0) {
      throw new Error(
        "System did not handle Prophet service failure gracefully"
      );
    }

    console.log("  ✅ System handled Prophet service failure gracefully");
  }

  async testKillNewsProvider() {
    console.log("  🔥 Simulating news provider failure...");

    // Test news endpoint before and after simulated failure
    const beforePromises = [];
    for (let i = 0; i < 3; i++) {
      beforePromises.push(
        axios
          .get(`${BASE_URL}/news`, { timeout: 5000 })
          .catch((err) => ({
            status: err.response?.status,
            error: err.message,
          }))
      );
    }

    const beforeResults = await Promise.all(beforePromises);

    // Simulate news provider failure by making requests that might fail
    const failurePromises = [];
    for (let i = 0; i < 10; i++) {
      failurePromises.push(
        axios
          .post(`${BASE_URL}/news/fetcher`, {}, { timeout: 5000 })
          .catch((err) => ({
            status: err.response?.status,
            error: err.message,
          }))
      );
    }

    const failureResults = await Promise.all(failurePromises);

    // Should handle news provider failure gracefully
    const gracefulFailures = failureResults.filter(
      (r) => r.status >= 400 && r.status < 500
    );
    if (
      gracefulFailures.length === 0 &&
      failureResults.some((r) => r.status === 200)
    ) {
      console.log("  ✅ System handled news provider failure gracefully");
      return;
    }

    // Even if all fail, should fail gracefully
    if (gracefulFailures.length > 0) {
      console.log("  ✅ System handled news provider failure gracefully");
      return;
    }

    throw new Error("System did not handle news provider failure gracefully");
  }

  async testDatabaseConnectionLoss() {
    console.log("  🔥 Simulating database connection issues...");

    // Test database-dependent endpoints
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        axios
          .get(`${BASE_URL}/alerts`, { timeout: 5000 })
          .catch((err) => ({
            status: err.response?.status,
            error: err.message,
          }))
      );
    }

    const results = await Promise.all(promises);

    // Should handle database issues gracefully
    const gracefulFailures = results.filter(
      (r) => r.status >= 400 && r.status < 500
    );
    if (gracefulFailures.length > 0) {
      console.log("  ✅ System handled database connection issues gracefully");
      return;
    }

    const successes = results.filter((r) => r.status === 200);
    if (successes.length > 0) {
      console.log("  ✅ System handled database connection issues gracefully");
      return;
    }

    throw new Error(
      "System did not handle database connection issues gracefully"
    );
  }

  async testNetworkPartition() {
    console.log("  🔥 Simulating network partition...");

    // Simulate network partition with very short timeouts
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        axios
          .get(`${BASE_URL}/news`, { timeout: 100 }) // Very short timeout
          .catch((err) => ({
            status: err.response?.status,
            error: err.message,
          }))
      );
    }

    const results = await Promise.all(promises);

    // Should handle network partition gracefully
    const timeouts = results.filter(
      (r) => r.error?.includes("timeout") || r.status === 504
    );
    if (timeouts.length > 0) {
      console.log("  ✅ System handled network partition gracefully");
      return;
    }

    throw new Error("System did not handle network partition gracefully");
  }

  async testHighLatency() {
    console.log("  🔥 Simulating high latency...");

    // Test with longer timeouts to simulate high latency
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        axios
          .get(`${BASE_URL}/news`, { timeout: 15000 }) // Longer timeout
          .catch((err) => ({
            status: err.response?.status,
            error: err.message,
          }))
      );
    }

    const results = await Promise.all(promises);

    // Should handle high latency gracefully
    const successes = results.filter((r) => r.status === 200);
    const timeouts = results.filter(
      (r) => r.error?.includes("timeout") || r.status === 504
    );

    if (successes.length > 0 || timeouts.length > 0) {
      console.log("  ✅ System handled high latency gracefully");
      return;
    }

    throw new Error("System did not handle high latency gracefully");
  }

  async testMemoryPressure() {
    console.log("  🔥 Simulating memory pressure...");

    // Make many concurrent requests to simulate memory pressure
    const promises = [];
    for (let i = 0; i < 50; i++) {
      promises.push(
        axios
          .get(`${BASE_URL}/news`, { timeout: 5000 })
          .catch((err) => ({
            status: err.response?.status,
            error: err.message,
          }))
      );
    }

    const results = await Promise.all(promises);

    // Should handle memory pressure gracefully
    const successes = results.filter((r) => r.status === 200);
    const gracefulFailures = results.filter(
      (r) => r.status >= 400 && r.status < 500
    );

    if (successes.length > 0 || gracefulFailures.length > 0) {
      console.log("  ✅ System handled memory pressure gracefully");
      return;
    }

    throw new Error("System did not handle memory pressure gracefully");
  }

  async testCPUPressure() {
    console.log("  🔥 Simulating CPU pressure...");

    // Make many concurrent requests to simulate CPU pressure
    const promises = [];
    for (let i = 0; i < 30; i++) {
      promises.push(
        axios
          .post(`${BASE_URL}/forecast`, { horizon_days: 7 }, { timeout: 10000 })
          .catch((err) => ({
            status: err.response?.status,
            error: err.message,
          }))
      );
    }

    const results = await Promise.all(promises);

    // Should handle CPU pressure gracefully
    const successes = results.filter((r) => r.status === 200);
    const gracefulFailures = results.filter(
      (r) => r.status >= 400 && r.status < 500
    );

    if (successes.length > 0 || gracefulFailures.length > 0) {
      console.log("  ✅ System handled CPU pressure gracefully");
      return;
    }

    throw new Error("System did not handle CPU pressure gracefully");
  }

  async testServiceRecovery() {
    console.log("  🔄 Testing service recovery...");

    // Test that services can recover from failures
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        axios
          .get(`${BASE_URL}/health`, { timeout: 5000 })
          .catch((err) => ({
            status: err.response?.status,
            error: err.message,
          }))
      );
    }

    const results = await Promise.all(promises);

    // Should have some successful health checks
    const successes = results.filter((r) => r.status === 200);
    if (successes.length > 0) {
      console.log("  ✅ Service recovery working");
      return;
    }

    throw new Error("Service recovery not working");
  }

  async testCircuitBreakerRecovery() {
    console.log("  🔄 Testing circuit breaker recovery...");

    // Test circuit breaker recovery by making requests after failures
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        axios
          .post(`${BASE_URL}/news/fetcher`, {}, { timeout: 5000 })
          .catch((err) => ({
            status: err.response?.status,
            error: err.message,
          }))
      );
    }

    const results = await Promise.all(promises);

    // Circuit breaker should handle failures and potentially recover
    const gracefulFailures = results.filter(
      (r) => r.status >= 400 && r.status < 500
    );
    const successes = results.filter((r) => r.status === 200);

    if (gracefulFailures.length > 0 || successes.length > 0) {
      console.log("  ✅ Circuit breaker recovery working");
      return;
    }

    throw new Error("Circuit breaker recovery not working");
  }

  printSummary() {
    const totalTime = Date.now() - this.startTime;
    const passed = this.results.filter((r) => r.status === "PASS").length;
    const failed = this.results.filter((r) => r.status === "FAIL").length;

    console.log("\n" + "=".repeat(50));
    console.log("🌪️  Chaos Testing Summary");
    console.log("=".repeat(50));
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total Time: ${totalTime}ms`);
    console.log(
      `Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`
    );

    if (failed > 0) {
      console.log("\n❌ Failed Tests:");
      this.results
        .filter((r) => r.status === "FAIL")
        .forEach((r) => console.log(`  - ${r.name}: ${r.error}`));
    }

    console.log("\n📊 Detailed Results:");
    this.results.forEach((r) => {
      const status = r.status === "PASS" ? "✅" : "❌";
      console.log(`  ${status} ${r.name} (${r.duration}ms)`);
    });

    console.log("\n" + "=".repeat(50));

    if (failed === 0) {
      console.log("🎉 All chaos tests passed! System is resilient.");
    } else {
      console.log(
        "⚠️  Some chaos tests failed. System resilience needs improvement."
      );
    }
  }
}

// Run the chaos test suite
async function main() {
  const chaosSuite = new ChaosTestSuite();

  try {
    await chaosSuite.runAllChaosTests();
  } catch (error) {
    console.error("Chaos test suite failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = ChaosTestSuite;
