#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const archiver = require("archiver");

const ARTIFACTS_DIR = path.join(__dirname, "..", "artifacts");
const EVIDENCE_DIR = path.join(ARTIFACTS_DIR, "evidence_v1");
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Ensure directories exist
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function runTests() {
  console.log("🧪 Running full test suite...");
  
  try {
    // Run frontend tests
    console.log("  📱 Running frontend tests...");
    execSync("npm -C frontend run test", { stdio: "pipe" });
    
    // Run E2E tests
    console.log("  🎭 Running E2E tests...");
    execSync("npm -C frontend run e2e:ci", { stdio: "pipe" });
    
    // Run accessibility tests
    console.log("  ♿ Running accessibility tests...");
    execSync("npm -C frontend run test:a11y:ci", { stdio: "pipe" });
    
    console.log("✅ All tests passed!");
  } catch (error) {
    console.error("❌ Tests failed:", error.message);
    throw error;
  }
}

async function runLighthouse() {
  console.log("🔍 Running Lighthouse CI...");
  
  try {
    execSync("npm run test:lighthouse", { stdio: "pipe" });
    console.log("✅ Lighthouse CI passed!");
  } catch (error) {
    console.error("❌ Lighthouse CI failed:", error.message);
    throw error;
  }
}

async function runCopilotEval() {
  console.log("🤖 Running Copilot evaluation...");
  
  try {
    execSync("npm run copilot:eval:ci", { stdio: "pipe" });
    console.log("✅ Copilot evaluation passed!");
  } catch (error) {
    console.warn("⚠️  Copilot evaluation failed (non-blocking):", error.message);
  }
}

async function collectMetrics() {
  console.log("📊 Collecting Prometheus metrics...");

  try {
    const axios = require("axios");
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
    const axios = require("axios");
    const logsFile = path.join(EVIDENCE_DIR, "app-logs.txt");
    const logContent = `# GoldVision v1.0.0 Application Logs
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
        console.log(`✅ Copied Lighthouse report: ${file}`);
      }
    } else {
      console.warn("⚠️  Lighthouse reports directory not found.");
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
        fs.copyFileSync(sourcePath, destPath);
        console.log(`✅ Copied Playwright report file: ${file}`);
      }
    } else {
      console.warn("⚠️  Playwright reports directory not found.");
    }
  } catch (error) {
    console.error("❌ Failed to collect Playwright reports:", error.message);
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
          console.log(`✅ Copied Copilot eval file: ${file}`);
        }
      }
    } else {
      console.warn("⚠️  Copilot evaluation directory not found.");
    }
  } catch (error) {
    console.error("❌ Failed to collect Copilot eval:", error.message);
  }
}

async function generateEvidenceIndex() {
  console.log("📋 Generating evidence index...");

  const indexContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GoldVision v1.0.0 Evidence Pack</title>
    <style>
        body { font-family: sans-serif; line-height: 1.6; margin: 20px; background-color: #f4f4f4; color: #333; }
        .container { max-width: 900px; margin: auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1, h2 { color: #0056b3; }
        ul { list-style-type: none; padding: 0; }
        li { margin-bottom: 10px; }
        a { color: #007bff; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .section { margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
        .section:last-child { border-bottom: none; }
        .badge { background: #28a745; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.8em; }
    </style>
</head>
<body>
    <div class="container">
        <h1>GoldVision v1.0.0 Evidence Pack <span class="badge">PRODUCTION RELEASE</span></h1>
        <p>Generated on: ${new Date().toISOString()}</p>
        <p>This package contains all collected artifacts for the GoldVision v1.0.0 production release.</p>

        <div class="section">
            <h2>📊 Metrics & Logs</h2>
            <ul>
                <li><a href="prometheus-metrics.txt">Prometheus Metrics Snapshot</a></li>
                <li><a href="app-logs.txt">Application Logs & Health Checks</a></li>
            </ul>
        </div>

        <div class="section">
            <h2>🔍 Quality Assurance Reports</h2>
            <ul>
                <li><a href="lighthouse/lighthouse-report.json">Lighthouse CI Report (JSON)</a></li>
                <li><a href="lighthouse/home-desktop.html">Lighthouse: Home (Desktop)</a></li>
                <li><a href="lighthouse/home-mobile.html">Lighthouse: Home (Mobile)</a></li>
                <li><a href="lighthouse/dashboard-desktop.html">Lighthouse: Dashboard (Desktop)</a></li>
                <li><a href="lighthouse/dashboard-mobile.html">Lighthouse: Dashboard (Mobile)</a></li>
                <li><a href="lighthouse/trends-desktop.html">Lighthouse: Trends (Desktop)</a></li>
                <li><a href="lighthouse/trends-mobile.html">Lighthouse: Trends (Mobile)</a></li>
                <li><a href="lighthouse/news-desktop.html">Lighthouse: News (Desktop)</a></li>
                <li><a href="lighthouse/news-mobile.html">Lighthouse: News (Mobile)</a></li>
                <li><a href="playwright/index.html">Playwright HTML Report</a></li>
            </ul>
        </div>

        <div class="section">
            <h2>🤖 AI Evaluation</h2>
            <ul>
                <li><a href="copilot-eval/eval_results.json">Copilot Evaluation Results (JSON)</a></li>
                <li><a href="copilot-eval/eval_report.md">Copilot Evaluation Report (Markdown)</a></li>
            </ul>
        </div>

        <div class="section">
            <h2>📄 Documentation</h2>
            <ul>
                <li><a href="../../README.md">README.md</a></li>
                <li><a href="../../CHANGELOG.md">CHANGELOG.md</a></li>
                <li><a href="../../docs/API.md">API Documentation</a></li>
                <li><a href="../../docs/ARCHITECTURE.md">Architecture Documentation</a></li>
            </ul>
        </div>
    </div>
</body>
</html>`;

  const indexFile = path.join(EVIDENCE_DIR, "index.html");
  fs.writeFileSync(indexFile, indexContent);
  console.log(`✅ Evidence index generated: ${indexFile}`);
}

async function createEvidenceZip() {
  console.log("📦 Creating evidence archive...");

  const zipFile = path.join(ARTIFACTS_DIR, "evidence_v1.zip");
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

async function buildProduction() {
  console.log("🏗️  Building production bundles...");
  
  try {
    // Build frontend
    console.log("  📱 Building frontend...");
    execSync("npm -C frontend run build", { stdio: "pipe" });
    
    // Verify build
    const distDir = path.join(__dirname, "..", "frontend", "dist");
    if (!fs.existsSync(distDir)) {
      throw new Error("Frontend build failed - dist directory not found");
    }
    
    console.log("✅ Production build completed!");
  } catch (error) {
    console.error("❌ Production build failed:", error.message);
    throw error;
  }
}

async function main() {
  console.log("🚀 GoldVision v1.0.0 Release Process");
  console.log("=====================================\n");

  try {
    // Step 1: Generate changelog
    console.log("📝 Step 1: Generating changelog...");
    execSync("node scripts/generate-final-changelog.js", { stdio: "pipe" });
    
    // Step 2: Build production
    await buildProduction();
    
    // Step 3: Run tests
    await runTests();
    
    // Step 4: Run Lighthouse
    await runLighthouse();
    
    // Step 5: Run Copilot evaluation
    await runCopilotEval();
    
    // Step 6: Collect evidence
    await collectMetrics();
    await collectLogs();
    await collectLighthouseReports();
    await collectPlaywrightReports();
    await collectCopilotEval();
    await generateEvidenceIndex();
    await createEvidenceZip();

    console.log("\n🎉 GoldVision v1.0.0 Release Complete!");
    console.log("=====================================");
    console.log(`📦 Evidence package: ${path.join(ARTIFACTS_DIR, "evidence_v1.zip")}`);
    console.log(`📄 Changelog: ${path.join(__dirname, "..", "CHANGELOG.md")}`);
    console.log("\n🌐 Public URLs:");
    console.log(`   Frontend: ${FRONTEND_URL}`);
    console.log(`   Backend: ${BACKEND_URL}`);
    console.log(`   API Docs: ${BACKEND_URL}/docs`);
    console.log(`   Metrics: ${BACKEND_URL}/metrics`);
    
  } catch (error) {
    console.error("❌ Release process failed:", error.message);
    process.exit(1);
  }
}

main();
