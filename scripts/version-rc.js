#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const RC_VERSION = "1.0.0-rc.1";

function updatePackageJson(filePath, version) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(filePath, "utf8"));
    packageJson.version = version;
    fs.writeFileSync(filePath, JSON.stringify(packageJson, null, 2) + "\n");
    console.log(`✅ Updated ${filePath} to version ${version}`);
  } catch (error) {
    console.error(`❌ Failed to update ${filePath}:`, error.message);
    process.exit(1);
  }
}

function updateBackendVersion() {
  const backendFile = path.join(__dirname, "..", "express-backend-enhanced.js");
  try {
    let content = fs.readFileSync(backendFile, "utf8");

    // Update version in the app.get("/health") endpoint
    content = content.replace(/version:\s*"[^"]*"/, `version: "${RC_VERSION}"`);

    fs.writeFileSync(backendFile, content);
    console.log(`✅ Updated backend version to ${RC_VERSION}`);
  } catch (error) {
    console.error(`❌ Failed to update backend version:`, error.message);
    process.exit(1);
  }
}

function updateProphetVersion() {
  const prophetFile = path.join(__dirname, "..", "prophet-service", "main.py");
  try {
    let content = fs.readFileSync(prophetFile, "utf8");

    // Update version in the health endpoint
    content = content.replace(
      /"version":\s*"[^"]*"/,
      `"version": "${RC_VERSION}"`
    );

    fs.writeFileSync(prophetFile, content);
    console.log(`✅ Updated Prophet service version to ${RC_VERSION}`);
  } catch (error) {
    console.error(`❌ Failed to update Prophet version:`, error.message);
    process.exit(1);
  }
}

function main() {
  console.log(`🚀 Bumping version to ${RC_VERSION}...\n`);

  // Update frontend package.json
  const frontendPackageJson = path.join(
    __dirname,
    "..",
    "frontend",
    "package.json"
  );
  if (fs.existsSync(frontendPackageJson)) {
    updatePackageJson(frontendPackageJson, RC_VERSION);
  }

  // Update root package.json
  const rootPackageJson = path.join(__dirname, "..", "package.json");
  updatePackageJson(rootPackageJson, RC_VERSION);

  // Update backend version
  updateBackendVersion();

  // Update Prophet service version
  updateProphetVersion();

  console.log(`\n🎉 Successfully bumped version to ${RC_VERSION}`);
  console.log("\nNext steps:");
  console.log("1. Run: npm run changelog");
  console.log(
    '2. Commit changes: git add . && git commit -m "chore: bump version to 1.0.0-rc.1"'
  );
  console.log('3. Create tag: git tag -a v1.0.0-rc.1 -m "Release Candidate 1"');
  console.log("4. Push: git push origin release/rc1 --tags");
}

main();
