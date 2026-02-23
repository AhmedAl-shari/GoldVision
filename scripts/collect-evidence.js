#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const archiver = require("archiver");
const axios = require("axios");

const ARTIFACTS_DIR = path.join(__dirname, "..", "artifacts");
const EVIDENCE_DIR = path.join(ARTIFACTS_DIR, "evidence_rc1");
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Ensure directories exist
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function collectMetrics() {
  console.log("📊 Collecting Prometheus metrics...");

  try {
    const response = await axios.get(`${BACKEND_URL}/metrics`);
    const metricsFile = path.join(EVIDENCE_DIR, "prometheus-metrics.txt");
    fs.writeFileSync(metricsFile, response.data);
    console.log(`✅ Metrics saved to ${metricsFile}`);
  } catch (error) {
    console.error("❌ Failed to collect metrics:", error.message);
  }
}

async function collectLogs() {
  console.log("📝 Collecting application logs...");

  try {
    // Get recent logs from the backend
    const logsFile = path.join(EVIDENCE_DIR, "app-logs.txt");
    const logContent = `# GoldVision Application Logs
# Generated: ${new Date().toISOString()}
# Backend URL: ${BACKEND_URL}

# Health Check
${await axios
  .get(`${BACKEND_URL}/health`)
  .then((r) => JSON.stringify(r.data, null, 2))
  .catch((e) => `Error: ${e.message}`)}

# Ready Check
${await axios
  .get(`${BACKEND_URL}/ready`)
  .then((r) => JSON.stringify(r.data, null, 2))
  .catch((e) => `Error: ${e.message}`)}

# Live Check
${await axios
  .get(`${BACKEND_URL}/live`)
  .then((r) => JSON.stringify(r.data, null, 2))
  .catch((e) => `Error: ${e.message}`)}

# Metrics JSON
${await axios
  .get(`${BACKEND_URL}/metrics/json`)
  .then((r) => JSON.stringify(r.data, null, 2))
  .catch((e) => `Error: ${e.message}`)}
`;

    fs.writeFileSync(logsFile, logContent);
    console.log(`✅ Logs saved to ${logsFile}`);
  } catch (error) {
    console.error("❌ Failed to collect logs:", error.message);
  }
}

async function collectBacktestData() {
  console.log("📈 Collecting backtest data...");

  try {
    // Check if backtest files exist
    const backtestFiles = ["backtest_results.csv", "backtest_summary.csv"];

    for (const file of backtestFiles) {
      const sourcePath = path.join(__dirname, "..", file);
      if (fs.existsSync(sourcePath)) {
        const destPath = path.join(EVIDENCE_DIR, file);
        fs.copyFileSync(sourcePath, destPath);
        console.log(`✅ Copied ${file}`);
      }
    }
  } catch (error) {
    console.error("❌ Failed to collect backtest data:", error.message);
  }
}

async function collectCopilotEval() {
  console.log("🤖 Collecting Copilot evaluation results...");

  try {
    const evalDir = path.join(__dirname, "..", "artifacts", "chat");
    if (fs.existsSync(evalDir)) {
      const destDir = path.join(EVIDENCE_DIR, "copilot-eval");
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      // Copy evaluation files
      const files = fs.readdirSync(evalDir);
      for (const file of files) {
        if (file.endsWith(".json") || file.endsWith(".md")) {
          const sourcePath = path.join(evalDir, file);
          const destPath = path.join(destDir, file);
          fs.copyFileSync(sourcePath, destPath);
          console.log(`✅ Copied ${file}`);
        }
      }
    }
  } catch (error) {
    console.error("❌ Failed to collect Copilot eval:", error.message);
  }
}

async function collectLighthouseReports() {
  console.log("🔍 Collecting Lighthouse reports...");

  try {
    const lighthouseDir = path.join(ARTIFACTS_DIR, "lighthouse");
    if (fs.existsSync(lighthouseDir)) {
      const destDir = path.join(EVIDENCE_DIR, "lighthouse");
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      // Copy all lighthouse files
      const files = fs.readdirSync(lighthouseDir);
      for (const file of files) {
        const sourcePath = path.join(lighthouseDir, file);
        const destPath = path.join(destDir, file);
        fs.copyFileSync(sourcePath, destPath);
        console.log(`✅ Copied ${file}`);
      }
    }
  } catch (error) {
    console.error("❌ Failed to collect Lighthouse reports:", error.message);
  }
}

async function collectPlaywrightReports() {
  console.log("🎭 Collecting Playwright reports...");

  try {
    const playwrightDir = path.join(
      __dirname,
      "..",
      "frontend",
      "playwright-report"
    );
    if (fs.existsSync(playwrightDir)) {
      const destDir = path.join(EVIDENCE_DIR, "playwright");
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      // Copy playwright report files
      const files = fs.readdirSync(playwrightDir);
      for (const file of files) {
        const sourcePath = path.join(playwrightDir, file);
        const destPath = path.join(destDir, file);
        if (fs.statSync(sourcePath).isDirectory()) {
          // Copy directory recursively
          execSync(`cp -r "${sourcePath}" "${destPath}"`);
        } else {
          fs.copyFileSync(sourcePath, destPath);
        }
        console.log(`✅ Copied ${file}`);
      }
    }
  } catch (error) {
    console.error("❌ Failed to collect Playwright reports:", error.message);
  }
}

async function collectScreenshots() {
  console.log("📸 Collecting screenshots...");

  try {
    const screenshotsDir = path.join(EVIDENCE_DIR, "screenshots");
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    // Take screenshots of key pages
    const pages = [
      { name: "home", url: "/" },
      { name: "dashboard", url: "/dashboard" },
      { name: "trends", url: "/trends" },
      { name: "news", url: "/news" },
      { name: "alerts", url: "/alerts" },
    ];

    for (const page of pages) {
      try {
        const screenshotFile = path.join(screenshotsDir, `${page.name}.png`);
        const command = `npx playwright screenshot "${FRONTEND_URL}${page.url}" "${screenshotFile}"`;
        execSync(command, { stdio: "pipe" });
        console.log(`✅ Screenshot: ${page.name}`);
      } catch (error) {
        console.log(`⚠️  Screenshot failed for ${page.name}: ${error.message}`);
      }
    }
  } catch (error) {
    console.error("❌ Failed to collect screenshots:", error.message);
  }
}

async function generateEvidenceIndex() {
  console.log("📋 Generating evidence index...");

  const indexContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GoldVision RC1 Evidence Pack</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 40px; line-height: 1.6; }
    .header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 2rem; border-radius: 8px; margin-bottom: 2rem; }
    .section { margin: 2rem 0; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 8px; }
    .file-list { list-style: none; padding: 0; }
    .file-list li { padding: 0.5rem; border-bottom: 1px solid #f3f4f6; }
    .file-list li:last-child { border-bottom: none; }
    .file-list a { text-decoration: none; color: #1e40af; }
    .file-list a:hover { text-decoration: underline; }
    .status { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.875rem; }
    .status.success { background: #dcfce7; color: #166534; }
    .status.warning { background: #fef3c7; color: #92400e; }
    .status.error { background: #fee2e2; color: #991b1b; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚀 GoldVision Release Candidate 1</h1>
    <p>Evidence Pack - Generated ${new Date().toISOString()}</p>
  </div>

  <div class="section">
    <h2>📊 System Metrics</h2>
    <ul class="file-list">
      <li><a href="prometheus-metrics.txt">Prometheus Metrics</a> - Raw metrics data</li>
      <li><a href="app-logs.txt">Application Logs</a> - Health checks and system status</li>
    </ul>
  </div>

  <div class="section">
    <h2>📈 Performance Data</h2>
    <ul class="file-list">
      <li><a href="backtest_results.csv">Backtest Results</a> - Historical performance data</li>
      <li><a href="backtest_summary.csv">Backtest Summary</a> - Performance summary</li>
    </ul>
  </div>

  <div class="section">
    <h2>🤖 AI Evaluation</h2>
    <ul class="file-list">
      <li><a href="copilot-eval/">Copilot Evaluation</a> - AI assistant performance metrics</li>
    </ul>
  </div>

  <div class="section">
    <h2>🔍 Quality Assurance</h2>
    <ul class="file-list">
      <li><a href="lighthouse/">Lighthouse Reports</a> - Performance, accessibility, and SEO audits</li>
      <li><a href="playwright/">Playwright Reports</a> - End-to-end test results</li>
    </ul>
  </div>

  <div class="section">
    <h2>📸 Visual Evidence</h2>
    <ul class="file-list">
      <li><a href="screenshots/">Screenshots</a> - Visual captures of key pages</li>
    </ul>
  </div>

  <div class="section">
    <h2>📋 Release Information</h2>
    <ul>
      <li><strong>Version:</strong> 1.0.0-rc.1</li>
      <li><strong>Build Time:</strong> ${new Date().toISOString()}</li>
      <li><strong>Frontend URL:</strong> ${FRONTEND_URL}</li>
      <li><strong>Backend URL:</strong> ${BACKEND_URL}</li>
    </ul>
  </div>
</body>
</html>`;

  const indexFile = path.join(EVIDENCE_DIR, "index.html");
  fs.writeFileSync(indexFile, indexContent);
  console.log(`✅ Evidence index generated: ${indexFile}`);
}

async function createEvidenceZip() {
  console.log("📦 Creating evidence archive...");

  const zipFile = path.join(ARTIFACTS_DIR, "evidence_rc1.zip");
  const output = fs.createWriteStream(zipFile);
  const archive = archiver("zip", { zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on("close", () => {
      console.log(
        `✅ Evidence archive created: ${zipFile} (${archive.pointer()} bytes)`
      );
      resolve();
    });

    archive.on("error", (err) => {
      console.error("❌ Archive error:", err);
      reject(err);
    });

    archive.pipe(output);
    archive.directory(EVIDENCE_DIR, false);
    archive.finalize();
  });
}

async function main() {
  console.log("🚀 Collecting GoldVision RC1 Evidence Pack...\n");

  try {
    await collectMetrics();
    await collectLogs();
    await collectBacktestData();
    await collectCopilotEval();
    await collectLighthouseReports();
    await collectPlaywrightReports();
    await collectScreenshots();
    await generateEvidenceIndex();
    await createEvidenceZip();

    console.log("\n🎉 Evidence collection completed successfully!");
    console.log(`📁 Evidence directory: ${EVIDENCE_DIR}`);
    console.log(`📦 Archive: ${path.join(ARTIFACTS_DIR, "evidence_rc1.zip")}`);
  } catch (error) {
    console.error("❌ Evidence collection failed:", error);
    process.exit(1);
  }
}

main();
