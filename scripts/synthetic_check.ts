#!/usr/bin/env tsx

import axios from "axios";
import fs from "fs";
import path from "path";

interface SyntheticCheckResult {
  timestamp: string;
  endpoint: string;
  status: "success" | "failure";
  responseTime: number;
  statusCode?: number;
  error?: string;
}

interface SyntheticReport {
  timestamp: string;
  duration: number;
  checks: SyntheticCheckResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    avgResponseTime: number;
  };
}

class SyntheticMonitor {
  private baseUrl: string;
  private results: SyntheticCheckResult[] = [];

  constructor(baseUrl: string = "http://localhost:8000") {
    this.baseUrl = baseUrl;
  }

  async checkEndpoint(
    endpoint: string,
    expectedStatus: number = 200
  ): Promise<SyntheticCheckResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        timeout: 10000,
        validateStatus: () => true, // Don't throw on any status code
      });

      const responseTime = Date.now() - startTime;
      const isSuccess = response.status === expectedStatus;

      const result: SyntheticCheckResult = {
        timestamp,
        endpoint,
        status: isSuccess ? "success" : "failure",
        responseTime,
        statusCode: response.status,
        error: isSuccess
          ? undefined
          : `Expected ${expectedStatus}, got ${response.status}`,
      };

      this.results.push(result);
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const result: SyntheticCheckResult = {
        timestamp,
        endpoint,
        status: "failure",
        responseTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };

      this.results.push(result);
      return result;
    }
  }

  async runChecks(): Promise<SyntheticReport> {
    const startTime = Date.now();
    console.log("🔍 Starting synthetic monitoring checks...");

    // Health check
    console.log("  ✓ Checking /health endpoint...");
    await this.checkEndpoint("/health");

    // Readiness check
    console.log("  ✓ Checking /readyz endpoint...");
    await this.checkEndpoint("/readyz");

    // Liveness check
    console.log("  ✓ Checking /livez endpoint...");
    await this.checkEndpoint("/livez");

    // Forecast endpoint (this might take longer)
    console.log("  ✓ Checking /forecast endpoint...");
    await this.checkEndpoint("/forecast", 200);

    // News endpoint
    console.log("  ✓ Checking /news/aggregate endpoint...");
    await this.checkEndpoint("/news/aggregate");

    // Prices endpoint
    console.log("  ✓ Checking /prices endpoint...");
    await this.checkEndpoint("/prices");

    // Metrics endpoint
    console.log("  ✓ Checking /metrics endpoint...");
    await this.checkEndpoint("/metrics");

    const duration = Date.now() - startTime;
    const successful = this.results.filter(
      (r) => r.status === "success"
    ).length;
    const failed = this.results.filter((r) => r.status === "failure").length;
    const avgResponseTime =
      this.results.reduce((sum, r) => sum + r.responseTime, 0) /
      this.results.length;

    const report: SyntheticReport = {
      timestamp: new Date().toISOString(),
      duration,
      checks: this.results,
      summary: {
        total: this.results.length,
        successful,
        failed,
        avgResponseTime: Math.round(avgResponseTime),
      },
    };

    console.log(`✅ Synthetic checks completed in ${duration}ms`);
    console.log(
      `   📊 Results: ${successful}/${this.results.length} successful`
    );
    console.log(
      `   ⏱️  Average response time: ${Math.round(avgResponseTime)}ms`
    );

    return report;
  }

  async saveReport(report: SyntheticReport): Promise<void> {
    const artifactsDir = path.join(process.cwd(), "artifacts", "synthetic");

    // Ensure artifacts directory exists
    if (!fs.existsSync(artifactsDir)) {
      fs.mkdirSync(artifactsDir, { recursive: true });
    }

    // Save detailed report
    const reportFile = path.join(
      artifactsDir,
      `synthetic-report-${Date.now()}.json`
    );
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    // Save summary for quick access
    const summaryFile = path.join(artifactsDir, "latest-summary.json");
    fs.writeFileSync(
      summaryFile,
      JSON.stringify(
        {
          timestamp: report.timestamp,
          summary: report.summary,
          duration: report.duration,
        },
        null,
        2
      )
    );

    // Append to historical log
    const logFile = path.join(artifactsDir, "synthetic-history.jsonl");
    const logEntry = JSON.stringify({
      timestamp: report.timestamp,
      summary: report.summary,
      duration: report.duration,
    });
    fs.appendFileSync(logFile, logEntry + "\n");

    console.log(`📁 Report saved to: ${reportFile}`);
    console.log(`📊 Summary saved to: ${summaryFile}`);
  }

  printDetailedReport(report: SyntheticReport): void {
    console.log("\n📋 Detailed Synthetic Check Report");
    console.log("=====================================");
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(`Duration: ${report.duration}ms`);
    console.log(`Total Checks: ${report.summary.total}`);
    console.log(`Successful: ${report.summary.successful}`);
    console.log(`Failed: ${report.summary.failed}`);
    console.log(`Average Response Time: ${report.summary.avgResponseTime}ms`);
    console.log("\n📊 Individual Check Results:");

    report.checks.forEach((check, index) => {
      const status = check.status === "success" ? "✅" : "❌";
      const statusCode = check.statusCode ? ` (${check.statusCode})` : "";
      const error = check.error ? ` - ${check.error}` : "";

      console.log(
        `  ${index + 1}. ${status} ${check.endpoint}${statusCode} - ${
          check.responseTime
        }ms${error}`
      );
    });

    if (report.summary.failed > 0) {
      console.log("\n⚠️  Failed Checks:");
      report.checks
        .filter((check) => check.status === "failure")
        .forEach((check) => {
          console.log(`  ❌ ${check.endpoint}: ${check.error}`);
        });
    }
  }
}

async function main() {
  const baseUrl = process.env.GOLDVISION_URL || "http://localhost:8000";
  const monitor = new SyntheticMonitor(baseUrl);

  try {
    const report = await monitor.runChecks();
    await monitor.saveReport(report);
    monitor.printDetailedReport(report);

    // Exit with error code if any checks failed
    if (report.summary.failed > 0) {
      console.log(
        `\n❌ ${report.summary.failed} checks failed. Exiting with error code.`
      );
      process.exit(1);
    } else {
      console.log("\n✅ All synthetic checks passed!");
      process.exit(0);
    }
  } catch (error) {
    console.error("💥 Synthetic monitoring failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { SyntheticMonitor, SyntheticCheckResult, SyntheticReport };
