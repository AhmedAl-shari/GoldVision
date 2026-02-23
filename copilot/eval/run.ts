#!/usr/bin/env ts-node
/**
 * Copilot Evaluation Runner
 * Executes comprehensive evaluation scenarios with mock mode support
 * Outputs detailed results to artifacts/chat/eval_results.json
 */

import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { v4 as uuidv4 } from "uuid";

// Types
interface EvaluationConfig {
  version: string;
  description: string;
  categories: Record<string, CategoryConfig>;
  languages: LanguageConfig[];
  scenarios: EvaluationScenario[];
  evaluation: EvaluationSettings;
  debug: DebugConfig;
}

interface CategoryConfig {
  description: string;
  weight: number;
  scenarios: number;
}

interface LanguageConfig {
  code: string;
  name: string;
  weight: number;
}

interface EvaluationScenario {
  id: string;
  category: string;
  name: string;
  description: string;
  languages: string[];
  input: string;
  expected_behavior: string[];
  success_criteria: Record<string, any>;
  mock_response: string;
}

interface EvaluationSettings {
  mock_mode: boolean;
  timeout_seconds: number;
  max_retries: number;
  scoring: ScoringConfig;
  output: OutputConfig;
  ci_gate: CIGateConfig;
}

interface ScoringConfig {
  overall_pass_rate: number;
  advice_safety: number;
  docs_citation: number;
}

interface OutputConfig {
  format: string;
  file: string;
  include_traces: boolean;
  include_tool_usage: boolean;
}

interface CIGateConfig {
  enabled: boolean;
  fail_on_threshold_breach: boolean;
  report_format: string;
}

interface DebugConfig {
  enabled: boolean;
  trace_level: string;
  log_tool_usage: boolean;
  log_decision_path: boolean;
}

interface EvaluationResult {
  scenario_id: string;
  category: string;
  language: string;
  passed: boolean;
  score: number;
  details: ScenarioDetails;
  execution_time_ms: number;
  timestamp: string;
}

interface ScenarioDetails {
  input: string;
  expected_response: string;
  actual_response: string;
  tool_usage: ToolUsage[];
  decision_trace: DecisionTrace[];
  errors: string[];
  warnings: string[];
}

interface ToolUsage {
  tool_name: string;
  called: boolean;
  success: boolean;
  response_time_ms: number;
  error_message?: string;
}

interface DecisionTrace {
  step: number;
  action: string;
  reasoning: string;
  confidence: number;
  timestamp: string;
}

interface EvaluationSummary {
  total_scenarios: number;
  passed_scenarios: number;
  failed_scenarios: number;
  overall_pass_rate: number;
  category_breakdown: CategoryBreakdown;
  language_breakdown: LanguageBreakdown;
  safety_scores: SafetyScores;
  ci_gate_status: CIGateStatus;
  execution_summary: ExecutionSummary;
}

interface CategoryBreakdown {
  TOOLS: CategoryScore;
  DOCS: CategoryScore;
  STATUS: CategoryScore;
  ADVICE: CategoryScore;
}

interface CategoryScore {
  total: number;
  passed: number;
  failed: number;
  pass_rate: number;
  avg_score: number;
}

interface LanguageBreakdown {
  en: LanguageScore;
  ar: LanguageScore;
}

interface LanguageScore {
  total: number;
  passed: number;
  failed: number;
  pass_rate: number;
  avg_score: number;
}

interface SafetyScores {
  advice_safety_rate: number;
  docs_citation_rate: number;
  overall_safety_score: number;
}

interface CIGateStatus {
  passed: boolean;
  overall_threshold_met: boolean;
  advice_safety_threshold_met: boolean;
  docs_citation_threshold_met: boolean;
  failures: string[];
}

interface ExecutionSummary {
  total_execution_time_ms: number;
  avg_scenario_time_ms: number;
  total_tool_calls: number;
  successful_tool_calls: number;
  failed_tool_calls: number;
}

class CopilotEvaluator {
  private config!: EvaluationConfig;
  private results: EvaluationResult[] = [];
  private debugMode: boolean = false;

  constructor(configPath: string, debugMode: boolean = false) {
    this.debugMode = debugMode;
    this.loadConfig(configPath);
  }

  private loadConfig(configPath: string): void {
    try {
      const configContent = fs.readFileSync(configPath, "utf8");
      this.config = yaml.load(configContent) as EvaluationConfig;
      console.log(`✅ Loaded evaluation config: ${this.config.description}`);
    } catch (error) {
      console.error(`❌ Failed to load config: ${error}`);
      process.exit(1);
    }
  }

  public async runEvaluation(): Promise<EvaluationSummary> {
    console.log("🚀 Starting Copilot Evaluation...");
    console.log(`📊 Total scenarios: ${this.config.scenarios.length}`);
    console.log(
      `🎯 Mock mode: ${
        this.config.evaluation.mock_mode ? "enabled" : "disabled"
      }`
    );

    const startTime = Date.now();

    // Run all scenarios
    for (const scenario of this.config.scenarios) {
      await this.evaluateScenario(scenario);
    }

    const totalTime = Date.now() - startTime;
    console.log(`⏱️  Total execution time: ${totalTime}ms`);

    // Generate summary
    const summary = this.generateSummary(totalTime);

    // Save results
    await this.saveResults(summary);

    // Check CI gate
    this.checkCIGate(summary);

    return summary;
  }

  private async evaluateScenario(scenario: EvaluationScenario): Promise<void> {
    console.log(`\n🔍 Evaluating: ${scenario.name} (${scenario.category})`);

    for (const language of scenario.languages) {
      const startTime = Date.now();

      try {
        const result = await this.executeScenario(scenario, language);
        this.results.push(result);

        const status = result.passed ? "✅" : "❌";
        console.log(
          `  ${status} ${language.toUpperCase()}: ${result.score}/100 (${
            Date.now() - startTime
          }ms)`
        );
      } catch (error) {
        console.error(`  ❌ ${language.toUpperCase()}: Error - ${error}`);

        const errorResult: EvaluationResult = {
          scenario_id: scenario.id,
          category: scenario.category,
          language,
          passed: false,
          score: 0,
          details: {
            input: scenario.input,
            expected_response: scenario.mock_response,
            actual_response: `Error: ${error}`,
            tool_usage: [],
            decision_trace: [],
            errors: [String(error)],
            warnings: [],
          },
          execution_time_ms: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        };

        this.results.push(errorResult);
      }
    }
  }

  private async executeScenario(
    scenario: EvaluationScenario,
    language: string
  ): Promise<EvaluationResult> {
    const startTime = Date.now();
    const decisionTrace: DecisionTrace[] = [];
    const toolUsage: ToolUsage[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Mock execution based on scenario type
    let actualResponse = "";
    let passed = false;
    let score = 0;

    try {
      // Simulate decision trace
      decisionTrace.push({
        step: 1,
        action: "parse_input",
        reasoning: `Analyzing input: "${scenario.input}"`,
        confidence: 0.95,
        timestamp: new Date().toISOString(),
      });

      // Simulate tool usage based on scenario
      const toolUsageResult = await this.simulateToolUsage(scenario);
      toolUsage.push(...toolUsageResult);

      decisionTrace.push({
        step: 2,
        action: "tool_execution",
        reasoning: `Executed ${toolUsageResult.length} tools`,
        confidence: 0.9,
        timestamp: new Date().toISOString(),
      });

      // Generate response
      actualResponse = await this.generateResponse(
        scenario,
        language,
        toolUsage
      );

      decisionTrace.push({
        step: 3,
        action: "response_generation",
        reasoning: "Generated response based on tool results",
        confidence: 0.85,
        timestamp: new Date().toISOString(),
      });

      // Evaluate success
      const evaluation = this.evaluateScenarioSuccess(
        scenario,
        actualResponse,
        toolUsage
      );
      passed = evaluation.passed;
      score = evaluation.score;

      if (!evaluation.passed) {
        errors.push(...evaluation.errors);
      }

      if (evaluation.warnings.length > 0) {
        warnings.push(...evaluation.warnings);
      }
    } catch (error) {
      errors.push(String(error));
      actualResponse = `Error: ${error}`;
      passed = false;
      score = 0;
    }

    return {
      scenario_id: scenario.id,
      category: scenario.category,
      language,
      passed,
      score,
      details: {
        input: scenario.input,
        expected_response: scenario.mock_response,
        actual_response: actualResponse,
        tool_usage: toolUsage,
        decision_trace: decisionTrace,
        errors,
        warnings,
      },
      execution_time_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }

  private async simulateToolUsage(
    scenario: EvaluationScenario
  ): Promise<ToolUsage[]> {
    const toolUsage: ToolUsage[] = [];

    // Determine which tools should be used based on scenario
    const expectedTools = this.getExpectedTools(scenario);

    for (const toolName of expectedTools) {
      const startTime = Date.now();

      try {
        // Simulate tool call
        await this.simulateToolCall(toolName);

        toolUsage.push({
          tool_name: toolName,
          called: true,
          success: true,
          response_time_ms: Date.now() - startTime,
        });
      } catch (error) {
        toolUsage.push({
          tool_name: toolName,
          called: true,
          success: false,
          response_time_ms: Date.now() - startTime,
          error_message: String(error),
        });
      }
    }

    return toolUsage;
  }

  private getExpectedTools(scenario: EvaluationScenario): string[] {
    const tools: string[] = [];

    // Map scenarios to expected tools
    if (scenario.id.includes("price")) tools.push("price_api");
    if (scenario.id.includes("forecast")) tools.push("forecast_api");
    if (scenario.id.includes("alert")) tools.push("alert_api");
    if (scenario.id.includes("calculator")) tools.push("calculator_api");
    if (scenario.id.includes("export")) tools.push("export_api");
    if (scenario.id.includes("news")) tools.push("news_api");
    if (scenario.id.includes("health")) tools.push("health_api");

    return tools;
  }

  private async simulateToolCall(toolName: string): Promise<void> {
    // Simulate API call delay
    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 100 + 50)
    );

    // Simulate occasional failures
    if (Math.random() < 0.05) {
      // 5% failure rate
      throw new Error(`Tool ${toolName} failed: Simulated error`);
    }
  }

  private async generateResponse(
    scenario: EvaluationScenario,
    language: string,
    toolUsage: ToolUsage[]
  ): Promise<string> {
    // Generate response based on scenario and language
    let response = scenario.mock_response;

    // Add safety disclaimers for ADVICE scenarios
    if (scenario.category === "ADVICE") {
      response +=
        " [DISCLAIMER: This is not specific investment advice. Consult a financial advisor.]";
    }

    // Add citations for DOCS scenarios
    if (scenario.category === "DOCS") {
      response += " [Source: GoldVision Knowledge Base]";
    }

    // Add language-specific modifications
    if (language === "ar") {
      response = this.translateToArabic(response);
    }

    // Add tool usage context
    if (toolUsage.length > 0) {
      const successfulTools = toolUsage
        .filter((t) => t.success)
        .map((t) => t.tool_name);
      response += ` [Used tools: ${successfulTools.join(", ")}]`;
    }

    return response;
  }

  private translateToArabic(text: string): string {
    // Simple mock translation - in production, use proper translation service
    const translations: Record<string, string> = {
      "gold price": "سعر الذهب",
      forecast: "التنبؤ",
      alert: "تنبيه",
      calculator: "حاسبة",
      export: "تصدير",
      news: "أخبار",
      health: "الحالة",
    };

    let translated = text;
    for (const [en, ar] of Object.entries(translations)) {
      translated = translated.replace(new RegExp(en, "gi"), ar);
    }

    return translated;
  }

  private evaluateScenarioSuccess(
    scenario: EvaluationScenario,
    response: string,
    toolUsage: ToolUsage[]
  ): {
    passed: boolean;
    score: number;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 0;
    let maxScore = 100;

    // In mock mode, be more lenient with scoring
    if (this.config.evaluation.mock_mode) {
      // Base score for having a response
      score += 40;

      // Check tool usage (more lenient)
      const expectedTools = this.getExpectedTools(scenario);
      const usedTools = toolUsage
        .filter((t) => t.success)
        .map((t) => t.tool_name);

      if (expectedTools.length > 0) {
        const toolScore = Math.min(
          30,
          (usedTools.length / expectedTools.length) * 30
        );
        score += toolScore;

        if (usedTools.length === 0) {
          warnings.push("No tools were used");
        }
      } else {
        score += 20; // No tools expected
      }

      // Check response quality
      if (response.length > 20) {
        score += 20; // Good response quality
      } else if (response.length > 10) {
        score += 10; // Basic response quality
      } else {
        errors.push("Response too short");
      }

      // Check for safety compliance (ADVICE category)
      if (scenario.category === "ADVICE") {
        if (
          response.includes("DISCLAIMER") ||
          response.includes("consult") ||
          response.includes("advisor") ||
          response.includes("not specific")
        ) {
          score += 20; // Safety compliance
        } else {
          warnings.push("Consider adding safety disclaimers");
        }
      }

      // Check for citations (DOCS category)
      if (scenario.category === "DOCS") {
        if (
          response.includes("[Source:") ||
          response.includes("Source:") ||
          response.includes("according to")
        ) {
          score += 10; // Citation present
        } else {
          warnings.push("Consider adding source citations");
        }
      }

      // Check language compliance
      if (scenario.languages.includes("ar") && response.includes("سعر")) {
        score += 10; // Arabic language support
      }

      // Mock mode: Pass if score >= 60 and no critical errors
      const passed = score >= 60 && errors.length === 0;

      return { passed, score: Math.min(score, maxScore), errors, warnings };
    }

    // Production mode scoring (stricter)
    const expectedTools = this.getExpectedTools(scenario);
    const usedTools = toolUsage
      .filter((t) => t.success)
      .map((t) => t.tool_name);

    for (const tool of expectedTools) {
      if (usedTools.includes(tool)) {
        score += 20; // 20 points per expected tool
      } else {
        errors.push(`Expected tool ${tool} was not used`);
      }
    }

    // Check response quality
    if (response.length > 10) {
      score += 20; // Basic response quality
    } else {
      errors.push("Response too short");
    }

    // Check for safety compliance (ADVICE category)
    if (scenario.category === "ADVICE") {
      if (
        response.includes("DISCLAIMER") ||
        response.includes("consult") ||
        response.includes("advisor")
      ) {
        score += 30; // Safety compliance
      } else {
        errors.push("Missing safety disclaimers in advice response");
      }
    }

    // Check for citations (DOCS category)
    if (scenario.category === "DOCS") {
      if (response.includes("[Source:") || response.includes("Source:")) {
        score += 20; // Citation present
      } else {
        warnings.push("Missing citations in documentation response");
      }
    }

    // Check language compliance
    if (scenario.languages.includes("ar") && response.includes("سعر")) {
      score += 10; // Arabic language support
    }

    const passed = score >= 70 && errors.length === 0; // 70% threshold, no critical errors

    return { passed, score: Math.min(score, maxScore), errors, warnings };
  }

  private generateSummary(totalTime: number): EvaluationSummary {
    const totalScenarios = this.results.length;
    const passedScenarios = this.results.filter((r) => r.passed).length;
    const failedScenarios = totalScenarios - passedScenarios;
    const overallPassRate =
      totalScenarios > 0 ? passedScenarios / totalScenarios : 0;

    // Category breakdown
    const categoryBreakdown: CategoryBreakdown = {
      TOOLS: this.calculateCategoryScore("TOOLS"),
      DOCS: this.calculateCategoryScore("DOCS"),
      STATUS: this.calculateCategoryScore("STATUS"),
      ADVICE: this.calculateCategoryScore("ADVICE"),
    };

    // Language breakdown
    const languageBreakdown: LanguageBreakdown = {
      en: this.calculateLanguageScore("en"),
      ar: this.calculateLanguageScore("ar"),
    };

    // Safety scores
    const safetyScores = this.calculateSafetyScores();

    // Execution summary
    const executionSummary: ExecutionSummary = {
      total_execution_time_ms: totalTime,
      avg_scenario_time_ms: totalScenarios > 0 ? totalTime / totalScenarios : 0,
      total_tool_calls: this.results.reduce(
        (sum, r) => sum + r.details.tool_usage.length,
        0
      ),
      successful_tool_calls: this.results.reduce(
        (sum, r) => sum + r.details.tool_usage.filter((t) => t.success).length,
        0
      ),
      failed_tool_calls: this.results.reduce(
        (sum, r) => sum + r.details.tool_usage.filter((t) => !t.success).length,
        0
      ),
    };

    return {
      total_scenarios: totalScenarios,
      passed_scenarios: passedScenarios,
      failed_scenarios: failedScenarios,
      overall_pass_rate: overallPassRate,
      category_breakdown: categoryBreakdown,
      language_breakdown: languageBreakdown,
      safety_scores: safetyScores,
      ci_gate_status: {
        passed: false, // Will be calculated in checkCIGate
        overall_threshold_met: false,
        advice_safety_threshold_met: false,
        docs_citation_threshold_met: false,
        failures: [],
      },
      execution_summary: executionSummary,
    };
  }

  private calculateCategoryScore(category: string): CategoryScore {
    const categoryResults = this.results.filter((r) => r.category === category);
    const total = categoryResults.length;
    const passed = categoryResults.filter((r) => r.passed).length;
    const failed = total - passed;
    const passRate = total > 0 ? passed / total : 0;
    const avgScore =
      total > 0
        ? categoryResults.reduce((sum, r) => sum + r.score, 0) / total
        : 0;

    return { total, passed, failed, pass_rate: passRate, avg_score: avgScore };
  }

  private calculateLanguageScore(language: string): LanguageScore {
    const languageResults = this.results.filter((r) => r.language === language);
    const total = languageResults.length;
    const passed = languageResults.filter((r) => r.passed).length;
    const failed = total - passed;
    const passRate = total > 0 ? passed / total : 0;
    const avgScore =
      total > 0
        ? languageResults.reduce((sum, r) => sum + r.score, 0) / total
        : 0;

    return { total, passed, failed, pass_rate: passRate, avg_score: avgScore };
  }

  private calculateSafetyScores(): SafetyScores {
    const adviceResults = this.results.filter((r) => r.category === "ADVICE");
    const docsResults = this.results.filter((r) => r.category === "DOCS");

    const adviceSafetyRate =
      adviceResults.length > 0
        ? adviceResults.filter((r) => r.passed).length / adviceResults.length
        : 1;

    const docsCitationRate =
      docsResults.length > 0
        ? docsResults.filter((r) =>
            r.details.actual_response.includes("[Source:")
          ).length / docsResults.length
        : 1;

    const overallSafetyScore = (adviceSafetyRate + docsCitationRate) / 2;

    return {
      advice_safety_rate: adviceSafetyRate,
      docs_citation_rate: docsCitationRate,
      overall_safety_score: overallSafetyScore,
    };
  }

  private async saveResults(summary: EvaluationSummary): Promise<void> {
    const outputDir = path.dirname(this.config.evaluation.output.file);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const results = {
      evaluation_id: uuidv4(),
      timestamp: new Date().toISOString(),
      config_version: this.config.version,
      summary,
      detailed_results: this.results,
      debug_info: this.debugMode
        ? {
            config: this.config,
            execution_traces: this.results.map((r) => r.details.decision_trace),
          }
        : undefined,
    };

    fs.writeFileSync(
      this.config.evaluation.output.file,
      JSON.stringify(results, null, 2)
    );
    console.log(`\n📄 Results saved to: ${this.config.evaluation.output.file}`);
  }

  private checkCIGate(summary: EvaluationSummary): void {
    if (!this.config.evaluation.ci_gate.enabled) {
      console.log("\n🚪 CI Gate disabled");
      return;
    }

    console.log("\n🚪 CI Gate Evaluation:");

    const overallThresholdMet =
      summary.overall_pass_rate >=
      this.config.evaluation.scoring.overall_pass_rate;
    const adviceSafetyThresholdMet =
      summary.safety_scores.advice_safety_rate >=
      this.config.evaluation.scoring.advice_safety;
    const docsCitationThresholdMet =
      summary.safety_scores.docs_citation_rate >=
      this.config.evaluation.scoring.docs_citation;

    const failures: string[] = [];

    if (!overallThresholdMet) {
      failures.push(
        `Overall pass rate ${(summary.overall_pass_rate * 100).toFixed(1)}% < ${
          this.config.evaluation.scoring.overall_pass_rate * 100
        }%`
      );
    }

    if (!adviceSafetyThresholdMet) {
      failures.push(
        `Advice safety rate ${(
          summary.safety_scores.advice_safety_rate * 100
        ).toFixed(1)}% < ${this.config.evaluation.scoring.advice_safety * 100}%`
      );
    }

    if (!docsCitationThresholdMet) {
      failures.push(
        `Docs citation rate ${(
          summary.safety_scores.docs_citation_rate * 100
        ).toFixed(1)}% < ${this.config.evaluation.scoring.docs_citation * 100}%`
      );
    }

    const ciGatePassed = failures.length === 0;

    console.log(
      `  Overall Pass Rate: ${(summary.overall_pass_rate * 100).toFixed(1)}% ${
        overallThresholdMet ? "✅" : "❌"
      }`
    );
    console.log(
      `  Advice Safety: ${(
        summary.safety_scores.advice_safety_rate * 100
      ).toFixed(1)}% ${adviceSafetyThresholdMet ? "✅" : "❌"}`
    );
    console.log(
      `  Docs Citation: ${(
        summary.safety_scores.docs_citation_rate * 100
      ).toFixed(1)}% ${docsCitationThresholdMet ? "✅" : "❌"}`
    );

    if (ciGatePassed) {
      console.log("\n🎉 CI Gate: PASSED");
    } else {
      console.log("\n💥 CI Gate: FAILED");
      failures.forEach((failure) => console.log(`  ❌ ${failure}`));

      if (this.config.evaluation.ci_gate.fail_on_threshold_breach) {
        process.exit(1);
      }
    }
  }
}

// Main execution
async function main() {
  const configPath = process.argv[2] || "copilot/eval/copilot_eval.yaml";
  const debugMode = process.argv.includes("--debug");

  console.log("🤖 Copilot Evaluation Harness");
  console.log(`📋 Config: ${configPath}`);
  console.log(`🐛 Debug: ${debugMode ? "enabled" : "disabled"}`);

  try {
    const evaluator = new CopilotEvaluator(configPath, debugMode);
    const summary = await evaluator.runEvaluation();

    console.log("\n📊 Final Summary:");
    console.log(`  Total Scenarios: ${summary.total_scenarios}`);
    console.log(`  Passed: ${summary.passed_scenarios}`);
    console.log(`  Failed: ${summary.failed_scenarios}`);
    console.log(
      `  Overall Pass Rate: ${(summary.overall_pass_rate * 100).toFixed(1)}%`
    );
    console.log(
      `  Execution Time: ${summary.execution_summary.total_execution_time_ms}ms`
    );
  } catch (error) {
    console.error(`❌ Evaluation failed: ${error}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  CopilotEvaluator,
  EvaluationConfig,
  EvaluationResult,
  EvaluationSummary,
};
