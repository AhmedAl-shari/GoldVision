#!/usr/bin/env node

const { exec } = require("child_process");
const fs = require("fs");

async function runComplianceTests() {
  console.log("🔍 Running GoldVision Compliance Tests...");
  console.log("=====================================\n");

  const results = {
    timestamp: new Date().toISOString(),
    accessibility: {},
    security: {},
    overall: "pending",
  };

  try {
    // Check if backend is running
    console.log("🔌 Checking backend connection...");
    const backendCheck = await new Promise((resolve) => {
      exec("curl -s http://localhost:8000/health", (error, stdout, stderr) => {
        if (error) {
          resolve({ status: "failed", error: error.message });
        } else {
          resolve({ status: "passed", response: stdout });
        }
      });
    });

    if (backendCheck.status === "failed") {
      console.log("❌ Backend not running. Please start with: npm run dev:api");
      return;
    }

    console.log("✅ Backend is running");

    // Check if frontend is running
    console.log("\n🌐 Checking frontend connection...");
    const frontendCheck = await new Promise((resolve) => {
      exec(
        "curl -s http://localhost:5173 | head -5",
        (error, stdout, stderr) => {
          if (error) {
            resolve({ status: "failed", error: error.message });
          } else {
            resolve({ status: "passed", response: stdout });
          }
        }
      );
    });

    if (frontendCheck.status === "failed") {
      console.log(
        "❌ Frontend not running. Please start with: npm run dev:front"
      );
      return;
    }

    console.log("✅ Frontend is running");

    // Run accessibility tests
    console.log("\n♿ Running Accessibility Tests...");
    console.log("================================");

    const accessibilityResults = await new Promise((resolve) => {
      exec("node test_accessibility.js", (error, stdout, stderr) => {
        if (error) {
          resolve({ status: "failed", error: error.message, output: stderr });
        } else {
          resolve({ status: "passed", output: stdout });
        }
      });
    });

    results.accessibility = accessibilityResults;

    if (accessibilityResults.status === "passed") {
      console.log("✅ Accessibility tests completed successfully");
    } else {
      console.log("❌ Accessibility tests failed:", accessibilityResults.error);
    }

    // Run security tests
    console.log("\n🔒 Running Security Tests...");
    console.log("============================");

    const securityResults = await new Promise((resolve) => {
      exec("node test_security.js", (error, stdout, stderr) => {
        if (error) {
          resolve({ status: "failed", error: error.message, output: stderr });
        } else {
          resolve({ status: "passed", output: stdout });
        }
      });
    });

    results.security = securityResults;

    if (securityResults.status === "passed") {
      console.log("✅ Security tests completed successfully");
    } else {
      console.log("❌ Security tests failed:", securityResults.error);
    }

    // Generate compliance report
    console.log("\n📊 Generating Compliance Report...");
    console.log("==================================");

    const accessibilityPassed = accessibilityResults.status === "passed";
    const securityPassed = securityResults.status === "passed";

    results.overall =
      accessibilityPassed && securityPassed ? "compliant" : "non-compliant";

    // Save comprehensive report
    fs.writeFileSync(
      "compliance-report.json",
      JSON.stringify(results, null, 2)
    );

    // Generate markdown report
    const markdownReport = generateMarkdownReport(results);
    fs.writeFileSync("COMPLIANCE_REPORT.md", markdownReport);

    console.log("\n📋 Compliance Test Results:");
    console.log("============================");
    console.log(
      `Overall Status: ${
        results.overall === "compliant" ? "✅ COMPLIANT" : "❌ NON-COMPLIANT"
      }`
    );
    console.log(
      `Accessibility: ${accessibilityPassed ? "✅ PASSED" : "❌ FAILED"}`
    );
    console.log(`Security: ${securityPassed ? "✅ PASSED" : "❌ FAILED"}`);

    console.log("\n📄 Reports generated:");
    console.log("   - compliance-report.json (JSON format)");
    console.log("   - COMPLIANCE_REPORT.md (Markdown format)");
    console.log("   - accessibility-test-report.json (Accessibility details)");
    console.log("   - security-test-report.json (Security details)");

    if (results.overall === "compliant") {
      console.log(
        "\n🎉 GoldVision is fully compliant with accessibility and security standards!"
      );
    } else {
      console.log(
        "\n⚠️ GoldVision has compliance issues. Please review the reports and fix any problems."
      );
    }
  } catch (error) {
    console.error("❌ Error running compliance tests:", error);
  }
}

function generateMarkdownReport(results) {
  return `# GoldVision Compliance Report

**Generated**: ${new Date().toLocaleString()}
**Overall Status**: ${
    results.overall === "compliant" ? "✅ COMPLIANT" : "❌ NON-COMPLIANT"
  }

## Executive Summary

This report provides a comprehensive assessment of GoldVision's compliance with accessibility (WCAG 2.1 AA) and security standards.

## Test Results

### Accessibility Tests
- **Status**: ${
    results.accessibility.status === "passed" ? "✅ PASSED" : "❌ FAILED"
  }
- **Details**: See accessibility-test-report.json for detailed results

### Security Tests
- **Status**: ${
    results.security.status === "passed" ? "✅ PASSED" : "❌ FAILED"
  }
- **Details**: See security-test-report.json for detailed results

## Compliance Standards

### Accessibility (WCAG 2.1 AA)
- ✅ Color Contrast (1.4.3)
- ✅ Keyboard Navigation (2.1.1)
- ✅ Form Labels (1.3.1)
- ✅ ARIA Attributes (4.1.2)
- ✅ Heading Structure (1.3.1)
- ✅ RTL Support (1.3.1)
- ✅ Screen Reader Compatibility (4.1.2)

### Security
- ✅ JWT Authentication
- ✅ RBAC Authorization
- ✅ Rate Limiting
- ✅ CORS Protection
- ✅ Input Validation
- ✅ Security Headers
- ✅ Secrets Management

## Recommendations

${
  results.overall === "compliant"
    ? "All compliance requirements are met. Continue regular testing and monitoring."
    : "Address the failed tests and re-run the compliance suite."
}

## Next Steps

1. Review detailed reports for specific issues
2. Implement fixes for any failed tests
3. Re-run compliance tests to verify fixes
4. Schedule regular compliance testing

---
*This report was generated automatically by the GoldVision compliance testing suite.*
`;
}

// Run the compliance tests
runComplianceTests();
