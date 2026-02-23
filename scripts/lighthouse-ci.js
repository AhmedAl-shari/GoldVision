#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.BASE_URL || "http://localhost:5173";
const ARTIFACTS_DIR = path.join(__dirname, "..", "artifacts");
const LIGHTHOUSE_DIR = path.join(ARTIFACTS_DIR, "lighthouse");

// Ensure artifacts directory exists
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}
if (!fs.existsSync(LIGHTHOUSE_DIR)) {
  fs.mkdirSync(LIGHTHOUSE_DIR, { recursive: true });
}

const PAGES = [
  { name: "home", url: "/", budget: { performance: 80, accessibility: 90 } },
  {
    name: "dashboard",
    url: "/dashboard",
    budget: { performance: 80, accessibility: 90 },
  },
  {
    name: "trends",
    url: "/trends",
    budget: { performance: 80, accessibility: 90 },
  },
  {
    name: "news",
    url: "/news",
    budget: { performance: 80, accessibility: 90 },
  },
  {
    name: "alerts",
    url: "/alerts",
    budget: { performance: 80, accessibility: 90 },
  },
  {
    name: "calculator",
    url: "/calculator",
    budget: { performance: 80, accessibility: 90 },
  },
  {
    name: "admin",
    url: "/admin",
    budget: { performance: 80, accessibility: 90 },
  },
];

const DEVICES = ["desktop", "mobile"];

function runLighthouse(url, name, device) {
  const outputFile = path.join(LIGHTHOUSE_DIR, `${name}-${device}.json`);
  const htmlFile = path.join(LIGHTHOUSE_DIR, `${name}-${device}.html`);

  console.log(`🔍 Running Lighthouse on ${name} (${device})...`);

  try {
    const command =
      `npx lighthouse "${BASE_URL}${url}" ` +
      `--output=json,html ` +
      `--output-path="${outputFile.replace(".json", "")}" ` +
      `--chrome-flags="--headless --no-sandbox --disable-gpu" ` +
      `--only-categories=performance,accessibility,best-practices,seo ` +
      `--form-factor=${device} ` +
      `--throttling-method=simulate ` +
      `--quiet`;

    execSync(command, { stdio: "pipe" });

    // Read and parse results
    const results = JSON.parse(fs.readFileSync(outputFile, "utf8"));

    return {
      name,
      device,
      url,
      performance: Math.round(results.categories.performance.score * 100),
      accessibility: Math.round(results.categories.accessibility.score * 100),
      bestPractices: Math.round(
        results.categories["best-practices"].score * 100
      ),
      seo: Math.round(results.categories.seo.score * 100),
      budget: PAGES.find((p) => p.name === name)?.budget || {
        performance: 80,
        accessibility: 90,
      },
      passed: true,
    };
  } catch (error) {
    console.error(
      `❌ Lighthouse failed for ${name} (${device}):`,
      error.message
    );
    return {
      name,
      device,
      url,
      performance: 0,
      accessibility: 0,
      bestPractices: 0,
      seo: 0,
      budget: PAGES.find((p) => p.name === name)?.budget || {
        performance: 80,
        accessibility: 90,
      },
      passed: false,
      error: error.message,
    };
  }
}

function checkBudget(results) {
  const failures = [];

  results.forEach((result) => {
    if (result.performance < result.budget.performance) {
      failures.push(
        `${result.name} (${result.device}): Performance ${result.performance} < ${result.budget.performance}`
      );
    }
    if (result.accessibility < result.budget.accessibility) {
      failures.push(
        `${result.name} (${result.device}): Accessibility ${result.accessibility} < ${result.budget.accessibility}`
      );
    }
  });

  return failures;
}

function generateReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    summary: {
      totalPages: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length,
      averagePerformance: Math.round(
        results.reduce((sum, r) => sum + r.performance, 0) / results.length
      ),
      averageAccessibility: Math.round(
        results.reduce((sum, r) => sum + r.accessibility, 0) / results.length
      ),
      averageBestPractices: Math.round(
        results.reduce((sum, r) => sum + r.bestPractices, 0) / results.length
      ),
      averageSeo: Math.round(
        results.reduce((sum, r) => sum + r.seo, 0) / results.length
      ),
    },
    results,
  };

  const reportFile = path.join(LIGHTHOUSE_DIR, "lighthouse-report.json");
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

  return report;
}

function printSummary(report) {
  console.log("\n📊 Lighthouse CI Summary");
  console.log("═".repeat(50));
  console.log(`📅 Timestamp: ${report.timestamp}`);
  console.log(`🌐 Base URL: ${report.baseUrl}`);
  console.log(`📄 Total Pages: ${report.summary.totalPages}`);
  console.log(`✅ Passed: ${report.summary.passed}`);
  console.log(`❌ Failed: ${report.summary.failed}`);
  console.log("\n📈 Average Scores:");
  console.log(`   Performance: ${report.summary.averagePerformance}/100`);
  console.log(`   Accessibility: ${report.summary.averageAccessibility}/100`);
  console.log(`   Best Practices: ${report.summary.averageBestPractices}/100`);
  console.log(`   SEO: ${report.summary.averageSeo}/100`);

  console.log("\n📋 Page Results:");
  report.results.forEach((result) => {
    const status = result.passed ? "✅" : "❌";
    console.log(
      `   ${status} ${result.name} (${result.device}): P${result.performance} A${result.accessibility} BP${result.bestPractices} SEO${result.seo}`
    );
  });
}

async function main() {
  console.log("🚀 Starting Lighthouse CI...\n");

  // Check if services are running
  try {
    execSync(`curl -s ${BASE_URL} > /dev/null`, { stdio: "pipe" });
  } catch (error) {
    console.error(`❌ Frontend not accessible at ${BASE_URL}`);
    console.error("Please start the frontend with: npm run dev:front");
    process.exit(1);
  }

  const allResults = [];

  // Run Lighthouse for each page and device combination
  for (const page of PAGES) {
    for (const device of DEVICES) {
      const result = runLighthouse(page.url, page.name, device);
      allResults.push(result);
    }
  }

  // Generate report
  const report = generateReport(allResults);

  // Check budgets
  const budgetFailures = checkBudget(allResults);

  // Print summary
  printSummary(report);

  // Check if any tests failed
  const hasFailures =
    allResults.some((r) => !r.passed) || budgetFailures.length > 0;

  if (budgetFailures.length > 0) {
    console.log("\n⚠️  Budget Failures:");
    budgetFailures.forEach((failure) => console.log(`   ${failure}`));
  }

  if (hasFailures) {
    console.log("\n❌ Lighthouse CI failed!");
    process.exit(1);
  } else {
    console.log("\n✅ Lighthouse CI passed!");
    process.exit(0);
  }
}

main().catch((error) => {
  console.error("❌ Lighthouse CI error:", error);
  process.exit(1);
});
