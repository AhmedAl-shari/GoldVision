#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");

// Test configuration
const TESTS_DIR = path.join(__dirname, "security");
const SECURITY_TEST = path.join(TESTS_DIR, "security-test-suite.js");
const CHAOS_TEST = path.join(TESTS_DIR, "chaos-test-suite.js");

class TestRunner {
  constructor() {
    this.results = [];
  }

  async runTest(name, testFile) {
    console.log(`\n🧪 Running ${name}...`);
    console.log("=".repeat(50));

    return new Promise((resolve) => {
      const child = spawn("node", [testFile], {
        stdio: "inherit",
        cwd: process.cwd(),
      });

      child.on("close", (code) => {
        const result = {
          name,
          status: code === 0 ? "PASS" : "FAIL",
          exitCode: code,
        };

        this.results.push(result);

        if (code === 0) {
          console.log(`✅ ${name} completed successfully`);
        } else {
          console.log(`❌ ${name} failed with exit code ${code}`);
        }

        resolve(result);
      });

      child.on("error", (error) => {
        console.error(`Error running ${name}:`, error);
        this.results.push({
          name,
          status: "FAIL",
          error: error.message,
        });
        resolve();
      });
    });
  }

  async runAllTests() {
    console.log("🔒 Starting Security & Resilience Test Suite");
    console.log("=".repeat(60));
    console.log("This will test:");
    console.log("  - Rate limiting and security measures");
    console.log("  - Circuit breakers and timeout handling");
    console.log("  - API key management and error handling");
    console.log("  - Image proxy and CSP compliance");
    console.log("  - Chaos testing and system resilience");
    console.log("=".repeat(60));

    // Run security tests
    await this.runTest("Security Test Suite", SECURITY_TEST);

    // Wait a moment between test suites
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Run chaos tests
    await this.runTest("Chaos Test Suite", CHAOS_TEST);

    this.printSummary();
  }

  printSummary() {
    const totalTests = this.results.length;
    const passedTests = this.results.filter((r) => r.status === "PASS").length;
    const failedTests = this.results.filter((r) => r.status === "FAIL").length;

    console.log("\n" + "=".repeat(60));
    console.log("🔒 Security & Resilience Test Summary");
    console.log("=".repeat(60));
    console.log(`Total Test Suites: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(
      `Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`
    );

    if (failedTests > 0) {
      console.log("\n❌ Failed Test Suites:");
      this.results
        .filter((r) => r.status === "FAIL")
        .forEach((r) => {
          console.log(`  - ${r.name}`);
          if (r.error) {
            console.log(`    Error: ${r.error}`);
          }
          if (r.exitCode !== undefined) {
            console.log(`    Exit Code: ${r.exitCode}`);
          }
        });
    }

    console.log("\n📊 Detailed Results:");
    this.results.forEach((r) => {
      const status = r.status === "PASS" ? "✅" : "❌";
      console.log(`  ${status} ${r.name}`);
    });

    console.log("\n" + "=".repeat(60));

    if (failedTests === 0) {
      console.log("🎉 All security and resilience tests passed!");
      console.log("✅ System is secure and resilient.");
    } else {
      console.log("⚠️  Some security tests failed.");
      console.log("🔍 Review the failed tests and fix the issues.");
    }

    console.log("\n📋 Next Steps:");
    console.log("  1. Review any failed tests");
    console.log(
      "  2. Check Prometheus metrics at http://127.0.0.1:8000/metrics"
    );
    console.log("  3. Monitor system logs for security events");
    console.log("  4. Run tests regularly to ensure system resilience");
  }
}

// Main execution
async function main() {
  const runner = new TestRunner();

  try {
    await runner.runAllTests();

    // Exit with appropriate code
    const failedTests = runner.results.filter(
      (r) => r.status === "FAIL"
    ).length;
    process.exit(failedTests > 0 ? 1 : 0);
  } catch (error) {
    console.error("Test runner failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = TestRunner;
