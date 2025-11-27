// @version 2.1.28
/**
 * Model Chooser & Provider Router
 *
 * Builds execution plans based on intent complexity, budget, and provider availability.
 * Decides concurrency lanes: fast-lane (cheap/quick), focus-lane (high-quality), audit-lane (validators).
 * Applies provider priority: Anthropic → OpenAI → Gemini → LocalAI → DeepSeek
 */

import LLMProvider from "../../precog/providers/llm-provider.js";
import { v4 as uuidv4 } from "uuid";

export class ModelChooser {
  constructor(options = {}) {
    this.config = {
      tournamentSize: options.tournamentSize || 3,
      minConfidenceThreshold: options.minConfidenceThreshold || 0.82,
      maxParallelNodes: options.maxParallelNodes || 8,
      maxRetriesPerNode: options.maxRetriesPerNode || 2,
      globalTimeCapMs: options.globalTimeCapMs || 6 * 60 * 1000,
      budgetCapUsd: options.budgetCapUsd || 0.5,
      ...options,
    };

    this.llmProvider = new LLMProvider();

    // Provider priority order and characteristics
    this.providerProfiles = {
      gemini: {
        priority: 1,
        costPerMTok: 0.00075,
        latencyMs: 2000,
        lane: "focus",
        available: this.llmProvider.providers.gemini,
        model: this.llmProvider.defaultModel.gemini,
      },
      anthropic: {
        priority: 2,
        costPerMTok: 0.003,
        latencyMs: 1200,
        lane: "focus",
        available: this.llmProvider.providers.anthropic,
        model: this.llmProvider.defaultModel.anthropic,
      },
      openai: {
        priority: 3,
        costPerMTok: 0.0015,
        latencyMs: 1500,
        lane: "audit",
        available: this.llmProvider.providers.openai,
        model: this.llmProvider.defaultModel.openai,
      },
      localai: {
        priority: 5,
        costPerMTok: 0,
        latencyMs: 1000,
        lane: "fast",
        available: this.llmProvider.providers.localai,
        model: this.llmProvider.defaultModel.localai,
      },
      deepseek: {
        priority: 6,
        costPerMTok: 0.0001,
        latencyMs: 800,
        lane: "fast",
        available: this.llmProvider.providers.deepseek,
        model: this.llmProvider.defaultModel.deepseek,
      },
    };

    this.stats = {
      totalPlan: 0,
      totalCandidates: 0,
      avgConfidence: 0,
      avgCostUsd: 0,
      providerUsage: {},
    };
  }

  /**
   * Analyze intent complexity to decide lanes
   */
  analyzeComplexity(intent) {
    const prompt = intent.originalPrompt;
    const tokens = prompt.split(/\s+/).length;

    let complexity = "simple"; // simple | moderate | complex

    if (tokens > 500) complexity = "complex";
    else if (tokens > 200) complexity = "moderate";

    // Detect task types
    const isCode = /code|script|function|class|implement/i.test(prompt);
    const isResearch = /research|analyze|compare|evaluate|survey/i.test(prompt);
    const isCreative = /design|create|ideate|generate|brainstorm/i.test(prompt);
    const isValidation = /review|check|validate|test|verify/i.test(prompt);

    return {
      complexity,
      tokens,
      isCode,
      isResearch,
      isCreative,
      isValidation,
      taskType: isCode
        ? "code"
        : isResearch
          ? "research"
          : isCreative
            ? "creative"
            : "general",
    };
  }

  /**
   * Select providers for a lane
   */
  selectProvidersForLane(lane, taskType = "general") {
    const available = Object.entries(this.providerProfiles)
      .filter(([_, p]) => p.available && p.lane === lane)
      .sort((a, b) => a[1].priority - b[1].priority);

    if (lane === "fast") {
      // Fast lane: 1-2 cheapest/fastest providers
      return available.slice(0, 1).map(([name]) => name);
    } else if (lane === "focus") {
      // Focus lane: 1-2 high-quality providers
      return available.slice(0, 2).map(([name]) => name);
    } else if (lane === "audit") {
      // Audit lane: diverse set of providers for cross-checking
      return available
        .slice(0, Math.min(3, available.length))
        .map(([name]) => name);
    }

    return [];
  }

  /**
   * Build execution plan for an intent
   */
  buildExecutionPlan(intent, budgetUsd = null) {
    const complexity = this.analyzeComplexity(intent);
    const budget = budgetUsd || this.config.budgetCapUsd;

    const plan = {
      id: uuidv4(),
      complexity: complexity.complexity,
      taskType: complexity.taskType,
      lanes: {},
      totalEstimatedCostUsd: 0,
      totalEstimatedTimeMs: 0,
      tournamentSize: this.config.tournamentSize,
      minConfidence: this.config.minConfidenceThreshold,
    };

    // Decide lanes based on complexity and budget
    let lanes = ["focus"]; // default

    if (budget < 0.05 || complexity.complexity === "simple") {
      lanes = ["fast"];
    } else if (complexity.complexity === "complex" && budget > 0.2) {
      lanes = ["fast", "focus", "audit"];
    } else if (complexity.complexity === "moderate") {
      lanes = ["focus", "audit"];
    }

    // Build candidates per lane
    for (const lane of lanes) {
      const providers = this.selectProvidersForLane(lane, complexity.taskType);

      if (providers.length === 0) {
        console.warn(`No available providers for lane: ${lane}`);
        continue;
      }

      // Create multiple candidates per lane (up to tournamentSize)
      const candidates = [];
      for (
        let i = 0;
        i < Math.min(this.config.tournamentSize, providers.length);
        i++
      ) {
        const provider = providers[i];
        const profile = this.providerProfiles[provider];

        candidates.push({
          id: uuidv4(),
          provider,
          model: profile.model,
          lane,
          estimatedCostUsd: (complexity.tokens / 1000) * profile.costPerMTok,
          estimatedTimeMs: profile.latencyMs,
          costPenalty: 0.1 * profile.costPerMTok, // weight in scoring
          confidenceBase: 0.5 + (7 - profile.priority) * 0.06, // higher priority = higher base
        });
      }

      plan.lanes[lane] = candidates;
      candidates.forEach((c) => {
        plan.totalEstimatedCostUsd += c.estimatedCostUsd;
        plan.totalEstimatedTimeMs += c.estimatedTimeMs;
      });
    }

    // Check budget constraints
    if (plan.totalEstimatedCostUsd > budget) {
      console.warn(
        `Estimated cost (${plan.totalEstimatedCostUsd.toFixed(4)}) exceeds budget (${budget.toFixed(4)}). Degrading to fast lane only.`,
      );
      plan.lanes = { fast: plan.lanes.fast || [] };
      plan.totalEstimatedCostUsd = (plan.lanes.fast || []).reduce(
        (sum, c) => sum + c.estimatedCostUsd,
        0,
      );
    }

    return plan;
  }

  /**
   * Attach plan to intent
   */
  attachPlanToIntent(intent, plan) {
    intent.executionPlan.selectedPlan = plan;

    // Flatten all candidates
    const allCandidates = [];
    for (const lane in plan.lanes) {
      allCandidates.push(...plan.lanes[lane]);
    }

    intent.addCandidatePlan({
      ...plan,
      candidates: allCandidates,
      lane: plan.lanes.focus ? "multi" : Object.keys(plan.lanes)[0],
    });

    return intent;
  }

  /**
   * Get provider stats
   */
  getStats() {
    return {
      ...this.stats,
      providers: this.providerProfiles,
    };
  }

  /**
   * Record usage for analytics
   */
  recordUsage(provider, costUsd, latencyMs, success = true) {
    this.stats.totalPlan++;
    this.stats.totalCandidates++;

    if (!this.stats.providerUsage[provider]) {
      this.stats.providerUsage[provider] = {
        count: 0,
        totalCostUsd: 0,
        totalLatencyMs: 0,
        successCount: 0,
      };
    }

    const usage = this.stats.providerUsage[provider];
    usage.count++;
    usage.totalCostUsd += costUsd;
    usage.totalLatencyMs += latencyMs;
    if (success) usage.successCount++;
  }
}

export default ModelChooser;
