// @version 2.1.11
/**
 * WORKBENCH ORCHESTRATOR
 * ======================
 *
 * Core engine that coordinates all TooLoo.ai services into a unified
 * productivity system. Routes work requests through intelligent service
 * pipelines to deliver coherent, actionable results.
 *
 * Architecture:
 * 1. Analyze Intent → Determine what the user wants
 * 2. Build Pipeline → Select which services to coordinate
 * 3. Execute Parallel → Run independent services concurrently
 * 4. Synthesize Results → Combine outputs into coherent response
 * 5. Post-Process → Commit to GitHub if needed, create artifacts
 */

import fetch from "node-fetch";
import LLMProvider from "../../precog/providers/llm-provider.js";

export class WorkbenchOrchestrator {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || "http://127.0.0.1:3000";
    this.timeout = options.timeout || 30000;
    this.verbose = options.verbose !== false;
    this.llmProvider = new LLMProvider();

    // Service registry with health status
    this.services = {
      segmentation: {
        port: 3007,
        path: "/api/v1/segmentation",
        status: "unknown",
      },
      training: { port: 3001, path: "/api/v1/training", status: "unknown" },
      meta: { port: 3002, path: "/api/v1/meta", status: "unknown" },
      budget: { port: 3003, path: "/api/v1/providers", status: "unknown" },
      coach: { port: 3004, path: "/api/v1/coach", status: "unknown" },
      product: { port: 3006, path: "/api/v1/product", status: "unknown" },
      reports: { port: 3008, path: "/api/v1/reports", status: "unknown" },
      capabilities: {
        port: 3009,
        path: "/api/v1/capabilities",
        status: "unknown",
      },
    };

    // Intent classification patterns
    this.intentPatterns = {
      analysis: {
        keywords: [
          "analyze",
          "understand",
          "breakdown",
          "examine",
          "segment",
          "pattern",
          "trend",
        ],
        services: ["segmentation", "meta", "reports"],
        description: "Understanding current state and finding insights",
      },
      improvement: {
        keywords: [
          "improve",
          "optimize",
          "enhance",
          "better",
          "faster",
          "increase",
          "boost",
        ],
        services: ["meta", "training", "coach", "reports"],
        description: "Finding and implementing improvements",
      },
      creation: {
        keywords: [
          "create",
          "generate",
          "build",
          "write",
          "design",
          "spec",
          "document",
        ],
        services: ["product", "training", "reports"],
        description: "Creating new artifacts and deliverables",
      },
      prediction: {
        keywords: [
          "predict",
          "next",
          "what",
          "future",
          "should",
          "recommend",
          "suggest",
        ],
        services: ["meta", "coach", "training"],
        description: "Predicting outcomes and recommending actions",
      },
      learning: {
        keywords: [
          "learn",
          "teach",
          "skill",
          "master",
          "understand",
          "training",
          "course",
        ],
        services: ["training", "coach", "meta"],
        description: "Structured learning and skill development",
      },
    };

    this.workLog = [];
    this.currentWork = null;
  }

  /**
   * Main entry point: Execute a work request
   * Returns workId immediately and runs execution in background
   */
  submitWork(goal, context = {}, options = {}) {
    const workId = this.generateWorkId();
    this.currentWork = {
      id: workId,
      goal,
      context,
      startTime: Date.now(),
      status: "analyzing",
      stages: [],
      logs: [],
    };

    // Run execution in background
    this.executeWorkRequest(workId, goal, context, options).catch((err) => {
      this.log(`❌ Background execution failed: ${err.message}`);
    });

    return { workId, status: "started" };
  }

  /**
   * Internal execution logic
   */
  async executeWorkRequest(workId, goal, context = {}, options = {}) {
    this.log(`🎯 Work Request Started: "${goal}"`);

    try {
      // Stage 1: Analyze Intent
      this.log("📊 Stage 1: Analyzing intent...");
      const intent = await this.analyzeIntent(goal, context);
      this.recordStage("intent_analysis", intent);
      await this.delay(500);

      // Stage 2: Build Pipeline
      this.log("🔧 Stage 2: Building service pipeline...");
      const pipeline = this.buildPipeline(intent, options);
      this.recordStage("pipeline_build", pipeline);
      await this.delay(500);

      // Stage 3: Check Service Health
      this.log("🏥 Stage 3: Checking service health...");
      await this.checkServicesHealth(pipeline.services);
      await this.delay(300);

      // Stage 4: Execute Services in Parallel
      this.log(
        `⚡ Stage 4: Executing ${pipeline.services.length} services in parallel...`
      );
      const serviceResults = await this.executeServices(
        pipeline,
        goal,
        context
      );
      this.recordStage("service_execution", serviceResults);
      await this.delay(500);

      // Stage 5: Synthesize Results
      this.log("🧩 Stage 5: Synthesizing results...");
      const synthesized = await this.synthesizeResults(serviceResults, intent);
      this.recordStage("synthesis", synthesized);
      await this.delay(300);

      // Stage 6: Post-Process (GitHub, artifacts, etc)
      this.log("📝 Stage 6: Post-processing...");
      const output = await this.postProcess(synthesized, options);
      this.recordStage("post_process", output);

      if (this.currentWork && this.currentWork.id === workId) {
        this.currentWork.status = "complete";
        this.currentWork.endTime = Date.now();
        this.currentWork.result = output;
        this.workLog.push(this.currentWork);
      }

      this.log(`✅ Work complete`);
      return output;
    } catch (error) {
      if (this.currentWork && this.currentWork.id === workId) {
        this.currentWork.status = "error";
        this.currentWork.error = error.message;
        this.workLog.push(this.currentWork);
      }
      this.log(`❌ Work failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze the intent of the work request using LLM
   */
  async analyzeIntent(goal, context = {}) {
    this.log(`Analyzing intent for: "${goal}"`);

    const prompt = `
      Analyze the following user goal and context to determine the intent, confidence, and suggested services.
      
      Goal: "${goal}"
      Context: ${JSON.stringify(context)}
      
      Available Services:
      - segmentation: Analyze text/data for traits and patterns
      - training: Learning and skill development
      - meta: Meta-learning and optimization
      - budget: Resource and provider management
      - coach: Guidance and improvement suggestions
      - product: Create artifacts, workflows, and designs
      - reports: Generate summaries and reports
      - capabilities: System capabilities and self-awareness
      
      Return a JSON object with:
      {
        "type": "analysis" | "improvement" | "creation" | "prediction" | "learning" | "other",
        "confidence": number (0-100),
        "description": "Short description of intent",
        "suggestedServices": ["service1", "service2"],
        "reasoning": "Why these services were chosen"
      }
    `;

    try {
      const result = await this.llmProvider.generate({
        prompt,
        system:
          "You are the Intent Analyzer for the TooLoo.ai Workbench. Output valid JSON only.",
        taskType: "analysis",
        criticality: "normal",
      });

      // Parse JSON from result.content (handle potential markdown blocks)
      const jsonStr = result.content.replace(/```json\n?|\n?```/g, "").trim();
      const analysis = JSON.parse(jsonStr);

      this.log(
        `  Intent: ${analysis.type} (confidence: ${analysis.confidence})`
      );
      return { ...analysis, goal, context };
    } catch (error) {
      this.log(
        `  ⚠️ LLM Analysis failed, falling back to regex: ${error.message}`
      );
      return this.analyzeIntentFallback(goal, context);
    }
  }

  /**
   * Fallback: Analyze the intent of the work request using regex
   */
  async analyzeIntentFallback(goal, context = {}) {
    const goalLower = goal.toLowerCase();

    // Score each intent type
    const scores = {};
    for (const [intentType, config] of Object.entries(this.intentPatterns)) {
      let score = 0;
      for (const keyword of config.keywords) {
        if (goalLower.includes(keyword)) score += 10;
      }
      scores[intentType] = score;
    }

    // Find best match
    const topIntent = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    const intentType = topIntent[0];
    const intentConfig = this.intentPatterns[intentType];

    this.log(
      `  Intent (Fallback): ${intentType} (confidence: ${topIntent[1]}/100)`
    );

    return {
      type: intentType,
      confidence: topIntent[1],
      description: intentConfig.description,
      suggestedServices: intentConfig.services,
      goal,
      context,
    };
  }

  /**
   * Build a service pipeline based on intent
   */
  buildPipeline(intent, options = {}) {
    const services = options.services || intent.suggestedServices;
    const quality = options.quality || "standard";
    const priority = options.priority || "balanced";

    // Determine execution strategy
    const strategy = {
      parallel: ["segmentation", "training", "budget"], // Can run in parallel
      sequential: ["meta", "product", "coach"], // Run after parallel
      final: ["reports"], // Aggregates everything
    };

    // Build execution order
    const pipeline = {
      intent: intent.type,
      services: services.filter((s) => this.services[s]),
      quality,
      priority,
      executionOrder: this.buildExecutionOrder(services, strategy),
      options: {
        timeout: options.timeout || 30000,
        retries: options.retries || 1,
        fallback: options.fallback !== false,
      },
    };

    this.log(`  Services: ${pipeline.services.join(", ")}`);
    this.log(
      `  Execution Order: ${pipeline.executionOrder.map((phase) => `[${phase.join(",")}]`).join(" → ")}`
    );

    return pipeline;
  }

  /**
   * Determine execution order (parallelization where possible)
   */
  buildExecutionOrder(services, strategy) {
    const order = [];
    const processed = new Set();

    // Phase 1: Independent services (can run in parallel)
    const phase1 = services.filter(
      (s) => strategy.parallel.includes(s) && !processed.has(s)
    );
    if (phase1.length > 0) {
      order.push(phase1);
      phase1.forEach((s) => processed.add(s));
    }

    // Phase 2: Dependent services (can run in parallel after phase 1)
    const phase2 = services.filter(
      (s) => strategy.sequential.includes(s) && !processed.has(s)
    );
    if (phase2.length > 0) {
      order.push(phase2);
      phase2.forEach((s) => processed.add(s));
    }

    // Phase 3: Aggregation services
    const phase3 = services.filter(
      (s) => strategy.final.includes(s) && !processed.has(s)
    );
    if (phase3.length > 0) {
      order.push(phase3);
      phase3.forEach((s) => processed.add(s));
    }

    // Phase 4: Any remaining
    const phase4 = services.filter((s) => !processed.has(s));
    if (phase4.length > 0) {
      order.push(phase4);
    }

    return order;
  }

  /**
   * Check health of required services
   */
  async checkServicesHealth(services) {
    const checks = services.map(async (service) => {
      try {
        const response = await fetch(
          `${this.baseUrl}${this.services[service].path}/health`,
          {
            timeout: 5000,
          }
        );
        const status = response.ok ? "healthy" : "degraded";
        this.services[service].status = status;
        return { service, status };
      } catch (error) {
        this.services[service].status = "unreachable";
        return { service, status: "unreachable" };
      }
    });

    const results = await Promise.all(checks);
    results.forEach((r) => {
      this.log(`  ${r.service}: ${r.status}`);
    });

    return results;
  }

  /**
   * Execute services in parallel phases
   */
  async executeServices(pipeline, goal, context) {
    const results = {};

    for (
      let phaseIdx = 0;
      phaseIdx < pipeline.executionOrder.length;
      phaseIdx++
    ) {
      const phase = pipeline.executionOrder[phaseIdx];
      this.log(`  Phase ${phaseIdx + 1}: Executing ${phase.join(", ")}...`);

      // Execute all services in phase in parallel
      const phasePromises = phase.map(async (service) => {
        try {
          const result = await this.executeService(
            service,
            goal,
            context,
            results
          );
          results[service] = result;
          return { service, status: "success" };
        } catch (error) {
          this.log(`    ⚠️  ${service} failed: ${error.message}`);
          results[service] = { error: error.message };
          return { service, status: "failed" };
        }
      });

      const phaseResults = await Promise.all(phasePromises);
      const successful = phaseResults.filter(
        (r) => r.status === "success"
      ).length;
      this.log(
        `  Phase complete: ${successful}/${phase.length} services successful`
      );
    }

    return results;
  }

  /**
   * Execute a single service
   */
  async executeService(service, goal, context, previousResults) {
    const config = this.services[service];
    const endpoint = `${this.baseUrl}${config.path}`;

    // Prepare request based on service type
    const payload = this.prepareServicePayload(
      service,
      goal,
      context,
      previousResults
    );

    const response = await fetch(`${endpoint}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      timeout: this.timeout,
    });

    if (!response.ok) {
      throw new Error(`Service ${service} returned ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Prepare payload for each service type
   */
  prepareServicePayload(service, goal, context, previousResults) {
    const payloads = {
      segmentation: {
        action: "analyze",
        text: goal,
        extractTraits: true,
        mode: "deep",
      },
      training: {
        action: "overview",
        context: goal,
      },
      meta: {
        action: "analyze",
        goal,
        context,
        priorResults: previousResults.segmentation,
      },
      budget: {
        action: "status",
      },
      coach: {
        action: "analyze",
        goal,
        context,
        priorAnalysis: previousResults.meta,
      },
      product: {
        action: "analyze",
        goal,
        context,
      },
      reports: {
        action: "synthesize",
        goal,
        results: previousResults,
        format: "comprehensive",
      },
      capabilities: {
        action: "status",
      },
    };

    return payloads[service] || { action: "analyze", goal, context };
  }

  /**
   * Synthesize results from all services into coherent output
   */
  async synthesizeResults(serviceResults, intent) {
    const synthesis = {
      intent: intent.type,
      timestamp: new Date().toISOString(),
      summary: "",
      findings: [],
      recommendations: [],
      nextSteps: [],
      artifacts: [],
    };

    // Extract insights from each service
    if (serviceResults.segmentation?.ok) {
      synthesis.findings.push({
        source: "segmentation",
        data: serviceResults.segmentation.segments,
        insights: serviceResults.segmentation.insights,
      });
    }

    if (serviceResults.meta?.ok) {
      synthesis.findings.push({
        source: "meta",
        patterns: serviceResults.meta.patterns,
        opportunities: serviceResults.meta.opportunities,
      });
    }

    if (serviceResults.coach?.suggestions) {
      synthesis.recommendations.push(...serviceResults.coach.suggestions);
      synthesis.nextSteps.push(...(serviceResults.coach.actions || []));
    }

    if (serviceResults.product?.artifacts) {
      synthesis.artifacts.push(...serviceResults.product.artifacts);
    }

    if (serviceResults.reports?.summary) {
      synthesis.summary = serviceResults.reports.summary;
    }

    // Generate actionable summary using LLM
    try {
      const prompt = `
        Synthesize the following service results into a coherent, actionable summary.
        
        Intent: ${intent.type}
        Goal: "${intent.goal}"
        
        Service Results:
        ${JSON.stringify(serviceResults, null, 2)}
        
        Provide a JSON object with:
        {
          "summary": "Executive summary of findings",
          "keyInsights": ["insight 1", "insight 2"],
          "recommendations": ["rec 1", "rec 2"],
          "nextSteps": ["step 1", "step 2"]
        }
      `;

      const result = await this.llmProvider.generate({
        prompt,
        system:
          "You are the Synthesis Engine for TooLoo.ai. Consolidate technical results into clear, actionable insights.",
        taskType: "analysis",
        criticality: "normal",
      });

      const jsonStr = result.content.replace(/```json\n?|\n?```/g, "").trim();
      const aiSynthesis = JSON.parse(jsonStr);

      synthesis.summary = aiSynthesis.summary;
      synthesis.findings.push(
        ...(aiSynthesis.keyInsights || []).map((i) => ({
          source: "ai-synthesis",
          insights: [i],
        }))
      );
      synthesis.recommendations = [
        ...new Set([
          ...synthesis.recommendations,
          ...(aiSynthesis.recommendations || []),
        ]),
      ];
      synthesis.nextSteps = [
        ...new Set([...synthesis.nextSteps, ...(aiSynthesis.nextSteps || [])]),
      ];
      synthesis.actionable = this.generateActionableSummary(synthesis);
    } catch (error) {
      this.log(
        `  ⚠️ LLM Synthesis failed, using basic aggregation: ${error.message}`
      );
      synthesis.actionable = this.generateActionableSummary(synthesis);
    }

    return synthesis;
  }

  /**
   * Generate concise, actionable summary from findings
   */
  generateActionableSummary(synthesis) {
    const summaryParts = [];

    // Key findings
    if (synthesis.findings.length > 0) {
      summaryParts.push(`Found ${synthesis.findings.length} key insights`);
    }

    // Top recommendations
    if (synthesis.recommendations.length > 0) {
      const topRecs = synthesis.recommendations.slice(0, 3);
      summaryParts.push(`Top recommendations: ${topRecs.join(", ")}`);
    }

    // Next actions
    if (synthesis.nextSteps.length > 0) {
      summaryParts.push(
        `Action items: ${synthesis.nextSteps.slice(0, 3).join("; ")}`
      );
    }

    return summaryParts.join(". ");
  }

  /**
   * Post-process results (GitHub, artifacts, etc)
   */
  async postProcess(synthesized, options = {}) {
    const output = {
      ...synthesized,
      githubInfo: null,
      artifacts: synthesized.artifacts || [],
    };

    // Commit to GitHub if requested
    if (options.commitToGithub) {
      try {
        const commitResult = await this.commitToGithub(synthesized, options);
        output.githubInfo = commitResult;
      } catch (error) {
        this.log(`⚠️  GitHub commit failed: ${error.message}`);
      }
    }

    // Create PR if requested
    if (options.createPR && output.githubInfo) {
      try {
        const prResult = await this.createPullRequest(
          output.githubInfo,
          synthesized
        );
        output.pullRequest = prResult;
      } catch (error) {
        this.log(`⚠️  PR creation failed: ${error.message}`);
      }
    }

    return output;
  }

  /**
   * Commit results to GitHub
   */
  async commitToGithub(synthesized, options = {}) {
    const content = JSON.stringify(synthesized, null, 2);
    const filename = `work-results/${Date.now()}-${synthesized.intent}.json`;
    const message =
      options.message || `Workbench: ${synthesized.intent} analysis`;

    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/github/update-file`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: filename,
            content,
            message,
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        this.log(`✅ Committed to GitHub: ${filename}`);
        return result;
      }
    } catch (error) {
      this.log(`❌ GitHub commit error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a pull request with results
   */
  async createPullRequest(githubInfo, synthesized) {
    try {
      const branchName = `workbench/${synthesized.intent}/${Date.now()}`;
      const response = await fetch(`${this.baseUrl}/api/v1/github/create-pr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Workbench: ${synthesized.intent} analysis`,
          body: synthesized.actionable,
          head: branchName,
          base: "main",
        }),
      });

      if (response.ok) {
        const result = await response.json();
        this.log(`✅ Created PR: ${result.html_url}`);
        return result;
      }
    } catch (error) {
      this.log(`❌ PR creation error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Record work stage in history
   */
  recordStage(stageName, data) {
    if (!this.currentWork) return;
    this.currentWork.stages.push({
      name: stageName,
      timestamp: Date.now(),
      data,
    });
  }

  /**
   * Get current work status
   */
  getWorkStatus() {
    return this.currentWork;
  }

  /**
   * Get work history
   */
  getWorkHistory(limit = 10) {
    return this.workLog.slice(-limit).reverse();
  }

  /**
   * Generate work ID
   */
  generateWorkId() {
    return `work_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Logging helper
   */
  log(message) {
    if (this.verbose) {
      console.log(`[Workbench] ${message}`);
    }
    if (this.currentWork) {
      if (!this.currentWork.logs) this.currentWork.logs = [];
      this.currentWork.logs.push({ timestamp: Date.now(), message });
    }
  }

  /**
   * Helper: Delay for visualization purposes
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default new WorkbenchOrchestrator();
