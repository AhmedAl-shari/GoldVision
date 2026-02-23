#!/usr/bin/env node

/**
 * Bundle size analysis script
 * Analyzes the production build and reports bundle sizes
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DIST_DIR = join(__dirname, "../dist");
const MAX_CHUNK_SIZE = 500 * 1024; // 500KB
const MAX_TOTAL_SIZE = 2 * 1024 * 1024; // 2MB

/**
 * Formats bytes to human-readable size
 */
function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Gets file size
 */
function getFileSize(filePath) {
  try {
    const stats = statSync(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

/**
 * Recursively gets all files in a directory
 */
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = join(dirPath, file);
    if (statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

/**
 * Analyzes bundle sizes
 */
function analyzeBundle() {
  console.log("📦 Analyzing bundle sizes...\n");

  if (!statSync(DIST_DIR).isDirectory()) {
    console.error("❌ dist directory not found. Run 'npm run build' first.");
    process.exit(1);
  }

  const files = getAllFiles(DIST_DIR);
  const jsFiles = files.filter((f) => f.endsWith(".js"));
  const cssFiles = files.filter((f) => f.endsWith(".css"));
  const assetFiles = files.filter(
    (f) => !f.endsWith(".js") && !f.endsWith(".css") && !f.endsWith(".html")
  );

  let totalJsSize = 0;
  let totalCssSize = 0;
  let totalAssetSize = 0;

  console.log("📄 JavaScript Files:");
  console.log("─".repeat(60));
  const jsSizes = jsFiles
    .map((file) => {
      const size = getFileSize(file);
      totalJsSize += size;
      return { file: file.replace(DIST_DIR + "/", ""), size };
    })
    .sort((a, b) => b.size - a.size);

  jsSizes.forEach(({ file, size }) => {
    const formatted = formatBytes(size);
    const warning = size > MAX_CHUNK_SIZE ? "⚠️ " : "  ";
    console.log(`${warning}${formatted.padEnd(12)} ${file}`);
  });

  console.log("\n🎨 CSS Files:");
  console.log("─".repeat(60));
  const cssSizes = cssFiles
    .map((file) => {
      const size = getFileSize(file);
      totalCssSize += size;
      return { file: file.replace(DIST_DIR + "/", ""), size };
    })
    .sort((a, b) => b.size - a.size);

  cssSizes.forEach(({ file, size }) => {
    const formatted = formatBytes(size);
    console.log(`  ${formatted.padEnd(12)} ${file}`);
  });

  console.log("\n🖼️  Assets:");
  console.log("─".repeat(60));
  assetFiles.forEach((file) => {
    const size = getFileSize(file);
    totalAssetSize += size;
    const formatted = formatBytes(size);
    const fileName = file.replace(DIST_DIR + "/", "");
    console.log(`  ${formatted.padEnd(12)} ${fileName}`);
  });

  const totalSize = totalJsSize + totalCssSize + totalAssetSize;

  console.log("\n📊 Summary:");
  console.log("─".repeat(60));
  console.log(`  JavaScript: ${formatBytes(totalJsSize)}`);
  console.log(`  CSS:        ${formatBytes(totalCssSize)}`);
  console.log(`  Assets:     ${formatBytes(totalAssetSize)}`);
  console.log(`  Total:      ${formatBytes(totalSize)}`);

  // Check for warnings
  const largeChunks = jsSizes.filter((f) => f.size > MAX_CHUNK_SIZE);
  if (largeChunks.length > 0) {
    console.log("\n⚠️  Warning: Large chunks detected:");
    largeChunks.forEach(({ file, size }) => {
      console.log(`  - ${file}: ${formatBytes(size)}`);
    });
    console.log("\n💡 Consider code splitting for better performance.");
  }

  if (totalSize > MAX_TOTAL_SIZE) {
    console.log(
      `\n⚠️  Warning: Total bundle size (${formatBytes(
        totalSize
      )}) exceeds recommended limit (${formatBytes(MAX_TOTAL_SIZE)})`
    );
  } else {
    console.log("\n✅ Bundle size is within recommended limits.");
  }

  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalJs: totalJsSize,
      totalCss: totalCssSize,
      totalAssets: totalAssetSize,
      total: totalSize,
    },
    chunks: jsSizes,
    css: cssSizes,
    warnings: {
      largeChunks: largeChunks.length,
      exceedsLimit: totalSize > MAX_TOTAL_SIZE,
    },
  };

  const reportPath = join(__dirname, "../artifacts/bundle-analysis.json");
  const fs = await import("fs/promises");
  await fs.mkdir(join(__dirname, "../artifacts"), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Report saved to: ${reportPath}`);
}

analyzeBundle().catch((error) => {
  console.error("❌ Error analyzing bundle:", error);
  process.exit(1);
});


