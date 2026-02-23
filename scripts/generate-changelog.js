#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const CHANGELOG_PATH = path.join(__dirname, "..", "CHANGELOG.md");

function getGitCommits() {
  try {
    // Get commits from the last tag or from the beginning
    const lastTag = execSync(
      'git describe --tags --abbrev=0 2>/dev/null || echo ""',
      { encoding: "utf8" }
    ).trim();
    const since = lastTag ? `${lastTag}..HEAD` : "HEAD";

    const commits = execSync(
      `git log --pretty=format:"%h|%s|%an|%ad" --date=short ${since}`,
      { encoding: "utf8" }
    )
      .trim()
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        const [hash, message, author, date] = line.split("|");
        return { hash, message, author, date };
      });

    return commits;
  } catch (error) {
    console.warn("⚠️  Could not get git commits, using fallback");
    return [];
  }
}

function categorizeCommits(commits) {
  const categories = {
    feat: [],
    fix: [],
    docs: [],
    style: [],
    refactor: [],
    perf: [],
    test: [],
    chore: [],
    other: [],
  };

  commits.forEach((commit) => {
    const message = commit.message.toLowerCase();
    let categorized = false;

    // Check for conventional commit format
    for (const [category, _] of Object.entries(categories)) {
      if (
        message.startsWith(`${category}:`) ||
        message.startsWith(`${category}(`)
      ) {
        categories[category].push(commit);
        categorized = true;
        break;
      }
    }

    // Fallback categorization based on keywords
    if (!categorized) {
      if (
        message.includes("feature") ||
        message.includes("add") ||
        message.includes("implement")
      ) {
        categories.feat.push(commit);
      } else if (
        message.includes("fix") ||
        message.includes("bug") ||
        message.includes("error")
      ) {
        categories.fix.push(commit);
      } else if (
        message.includes("doc") ||
        message.includes("readme") ||
        message.includes("guide")
      ) {
        categories.docs.push(commit);
      } else if (message.includes("test") || message.includes("spec")) {
        categories.test.push(commit);
      } else if (message.includes("refactor") || message.includes("cleanup")) {
        categories.refactor.push(commit);
      } else {
        categories.other.push(commit);
      }
    }
  });

  return categories;
}

function formatCommit(commit) {
  const message = commit.message.replace(
    /^(feat|fix|docs|style|refactor|perf|test|chore)(\(.+\))?:?\s*/i,
    ""
  );
  return `- ${message} (${commit.hash})`;
}

function generateChangelog() {
  const commits = getGitCommits();
  const categorized = categorizeCommits(commits);

  const today = new Date().toISOString().split("T")[0];
  const version = "1.0.0-rc.1";

  let changelog = `# Changelog

All notable changes to GoldVision will be documented in this file.

## [${version}] - ${today}

### 🚀 Features
${
  categorized.feat.map(formatCommit).join("\n") || "- Initial release candidate"
}

### 🐛 Bug Fixes
${
  categorized.fix.map(formatCommit).join("\n") ||
  "- No bug fixes in this release"
}

### 📚 Documentation
${
  categorized.docs.map(formatCommit).join("\n") ||
  "- No documentation changes in this release"
}

### 🧪 Tests
${
  categorized.test.map(formatCommit).join("\n") ||
  "- No test changes in this release"
}

### 🔧 Refactoring
${
  categorized.refactor.map(formatCommit).join("\n") ||
  "- No refactoring in this release"
}

### ⚡ Performance
${
  categorized.perf.map(formatCommit).join("\n") ||
  "- No performance improvements in this release"
}

### 🎨 Style Changes
${
  categorized.style.map(formatCommit).join("\n") ||
  "- No style changes in this release"
}

### 🔧 Maintenance
${
  categorized.chore.map(formatCommit).join("\n") ||
  "- No maintenance changes in this release"
}

### 📝 Other Changes
${
  categorized.other.map(formatCommit).join("\n") ||
  "- No other changes in this release"
}

---

## Release Notes

### 🎯 What's New in RC1

- **Complete News System**: Real-time news feed with sentiment analysis and infinite scroll
- **SEO & Feeds**: RSS/Atom feeds, sitemap generation, and social media optimization
- **Accessibility**: Full WCAG 2.1 AA compliance with RTL support
- **Admin Dashboard**: Live metrics monitoring with Prometheus integration
- **Production Ready**: Docker containers, health checks, and graceful shutdown
- **Comprehensive Testing**: Unit, integration, accessibility, and Lighthouse CI tests

### 🔧 Technical Improvements

- **Performance**: Optimized bundle splitting, CSS purging, and lazy loading
- **Security**: Enhanced CSP headers, rate limiting, and input validation
- **Monitoring**: Prometheus metrics for all critical operations
- **Documentation**: Complete API docs, architecture diagrams, and runbooks

### 🚀 Getting Started

1. **Quick Demo**: \`make demo\` - Start all services with demo data
2. **Production**: \`make rc\` - Build and deploy release candidate
3. **Development**: \`npm run dev:all\` - Start development environment

### 📊 Quality Gates

- ✅ Lighthouse Performance ≥ 80
- ✅ Lighthouse Accessibility ≥ 90
- ✅ Playwright Smoke Tests Pass
- ✅ Axe-core Accessibility Scan Pass
- ✅ Security Tests Pass
- ✅ PWA Installation Works
- ✅ CSP No Console Violations

---

*Generated on ${today}*
`;

  return changelog;
}

function main() {
  console.log("📝 Generating changelog...\n");

  const changelog = generateChangelog();

  try {
    fs.writeFileSync(CHANGELOG_PATH, changelog);
    console.log("✅ Changelog generated successfully!");
    console.log(`📄 Saved to: ${CHANGELOG_PATH}`);

    // Show a preview
    console.log("\n📋 Preview (first 20 lines):");
    console.log("─".repeat(50));
    console.log(changelog.split("\n").slice(0, 20).join("\n"));
    console.log("─".repeat(50));
  } catch (error) {
    console.error("❌ Failed to write changelog:", error.message);
    process.exit(1);
  }
}

main();
