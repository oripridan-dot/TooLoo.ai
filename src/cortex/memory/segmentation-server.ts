// @version 2.1.11
#!/usr/bin/env node

/**
 * Segmentation Server (Port 3007)
 * Unified endpoint for conversation segmentation, pattern extraction, and trait aggregation
 *
 * Routes:
 * POST /api/v1/segmentation/analyze - Full analysis pipeline
 * GET /api/v1/segmentation/status - Engine status and health
 * POST /api/v1/segmentation/configure - Update configuration
 */

import express from "express";
import cors from "cors";
import { segment, LABELS } from "../engine/segmenter.js";
import SegmentationUnifier from "../engine/segmentation-unifier.js";
import SemanticSegmentation from "../engine/semantic-segmentation.js";
import { default as SemanticTraitsAnalyzer } from "../engine/semantic-traits-analyzer.js";
import axios from "axios";
import { ServiceFoundation } from "../../lib/service-foundation.js";
import { DistributedTracer } from "../../lib/distributed-tracer.js";

// Initialize service with unified middleware (replaces 25 LOC of boilerplate)
const svc = new ServiceFoundation(
  "segmentation-server",
  process.env.SEGMENTATION_PORT || 3007
);
svc.setupMiddleware();
svc.registerHealthEndpoint();
svc.registerStatusEndpoint();

const app = svc.app;
const PORT = svc.port;

// Initialize distributed tracing (Phase 6C)
const tracer = new DistributedTracer({
  serviceName: "segmentation-server",
  samplingRate: 0.15,
});
svc.environmentHub.registerComponent("tracer", tracer, [
  "observability",
  "tracing",
  "segmentation",
]);

// Initialize engines
const semanticEngine = new SemanticSegmentation();
const SYNAPSE_URL = "http://localhost:3010/api/v1/synapse";

// Context Manager for Rolling Window Buffer
class ContextManager {
  constructor(maxTokens = 120000) {
    // Default large context
    this.maxTokens = maxTokens;
  }

  formatContext(messages, format = "standard") {
    // Simple token estimation (4 chars ~= 1 token)
    let currentTokens = 0;
    const buffer = [];

    // Iterate backwards to keep most recent
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const content = msg.content || "";
      const tokens = content.length / 4;

      if (currentTokens + tokens > this.maxTokens) {
        break;
      }

      buffer.unshift(msg);
      currentTokens += tokens;
    }

    return buffer;
  }
}

const contextManager = new ContextManager();

// Initialize segmentation unifier with available strategies
const unifier = new SegmentationUnifier({
  strategies: {
    "rule-basic": async (messages) => {
      const result = segment(messages);
      return result.segments.map((seg) => ({
        start: 0, // Will be calculated from messageId
        end: messages.length - 1,
        title: seg.label,
        summary: `${seg.label} segment with confidence ${seg.confidence}`,
      }));
    },
    "rule-advanced": async (messages) => {
      // Enhanced rule-based with better boundary detection
      const result = segment(messages, { minScore: 0.4 });
      return result.segments.map((seg) => ({
        start: 0,
        end: messages.length - 1,
        title: seg.label,
        summary: `Advanced ${seg.label} segment`,
      }));
    },
    "semantic-llm": async (messages) => {
      // LLM-powered semantic analysis
      const analysis = await semanticEngine.analyzeConversation(messages);
      return analysis.segments.map((seg) => ({
        start: seg.start,
        end: seg.end,
        title: seg.title,
        summary: seg.summary,
        phase: seg.phase,
        intent: seg.intent,
        emotionalState: seg.emotionalState,
      }));
    },
  },
});

// Pattern extraction (real implementation using frequency analysis)
function extractPatterns(segments, messages) {
  const patterns = [];
  segments.forEach((segment, idx) => {
    const segmentMessages = messages.slice(segment.start, segment.end + 1);
    const texts = segmentMessages.map((m) => m.content || "");
    const combinedText = texts.join(" ").toLowerCase();

    // Calculate real metrics based on content
    const wordCount = combinedText.split(/\s+/).length;
    const uniqueWords = new Set(combinedText.split(/\s+/)).size;

    // Confidence based on segment length and vocabulary richness
    const confidence = Math.min(0.95, 0.5 + Math.min(wordCount, 100) / 200);

    // Frequency based on message count in segment
    const frequency = segmentMessages.length;

    // Recency based on segment position (normalized 0-1)
    const recency = idx / (segments.length || 1);

    // Distinctiveness based on unique word ratio
    const distinctiveness = wordCount > 0 ? uniqueWords / wordCount : 0;

    patterns.push({
      patterns: [segment.title.toLowerCase().replace(/\s+/g, "-")],
      segmentId: `s${idx + 1}`,
      windowStart: segment.start,
      windowEnd: segment.end,
      texts: texts,
      features: { confidence, frequency, recency, distinctiveness },
    });
  });
  return patterns;
}

// Trait aggregation (LEGACY HEURISTIC - Deprecated)
// NOTE: This is a heuristic approximation for MVP compatibility.
// Real semantic analysis is performed by SemanticTraitsAnalyzer below.
function aggregateTraits(patternCandidates) {
  const traits = {
    decisionCompression: 0,
    riskDiscipline: 0,
    trustPriority: 0,
    structureExpectation: 0,
  };

  const mappings = {
    "decision-compression": "decisionCompression",
    authorization: "decisionCompression",
    "option-framing": "decisionCompression",
    "risk-enumeration": "riskDiscipline",
    "mitigation-plan": "riskDiscipline",
    "pivot-question": "riskDiscipline",
    "privacy-principle": "trustPriority",
    "profile-delivery": "structureExpectation",
    "format-convention": "structureExpectation",
  };

  patternCandidates.forEach((candidate) => {
    candidate.patterns.forEach((pattern) => {
      const traitKey = mappings[pattern];
      if (traitKey && candidate.features) {
        const weight =
          candidate.features.confidence *
          Math.log(1 + candidate.features.frequency);
        traits[traitKey] = Math.min(1, traits[traitKey] + weight * 0.2);
      }
    });
  });

  return traits;
}

// Routes

// Context Serialization Endpoint (Rolling Window Buffer)
app.post("/api/v1/segmentation/context", (req, res) => {
  try {
    const { messages, maxTokens } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res
        .status(400)
        .json({ ok: false, error: "messages array required" });
    }

    // Update limit if provided
    if (maxTokens) contextManager.maxTokens = maxTokens;

    const context = contextManager.formatContext(messages);

    res.json({
      ok: true,
      context,
      meta: {
        originalCount: messages.length,
        includedCount: context.length,
        estimatedTokens: JSON.stringify(context).length / 4,
      },
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Health endpoint is provided by ServiceFoundation
app.get("/api/v1/segmentation/status", (req, res) => {
  try {
    const status = unifier.getStatus();
    res.json({
      ok: true,
      engine: "segmentation-unified",
      version: "1.0.0",
      ...status,
      labels: Object.values(LABELS),
      components: {
        segmenter: "active",
        patternExtractor: "mock-mvp",
        traitAggregator: "mock-mvp",
        unifier: "active",
      },
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/segmentation/configure", (req, res) => {
  try {
    const config = unifier.saveConfig(req.body);
    res.json({ ok: true, config });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/segmentation/analyze", async (req, res) => {
  try {
    const { messages, options = {} } = req.body;

    if (!Array.isArray(messages)) {
      return res
        .status(400)
        .json({ ok: false, error: "messages must be an array" });
    }

    // Transform messages to expected format if needed
    const formattedMessages = messages.map((msg, idx) => ({
      id: msg.id || `msg_${idx}`,
      author: msg.author || "user",
      content: msg.content || msg.text || "",
      index: idx,
    }));

    // Step 1: Segmentation
    const segments = await unifier.segment(formattedMessages, options);

    // Step 2: Pattern Extraction
    const patternCandidates = extractPatterns(segments, formattedMessages);

    // Step 3: Trait Aggregation (legacy - maintains backward compatibility)
    const traitVector = aggregateTraits(patternCandidates);

    // Step 4: Semantic Trait Analysis (NEW - enhanced with 16 traits)
    const semanticTraits =
      await SemanticTraitsAnalyzer.analyzeTraits(formattedMessages);

    // Response
    res.json({
      ok: true,
      analysis: {
        segments,
        patternCandidates,
        traitVector, // Legacy traits (4 traits)
        semanticTraits, // Enhanced traits (16 traits with confidence scoring)
        metadata: {
          totalMessages: formattedMessages.length,
          totalSegments: segments.length,
          totalPatterns: patternCandidates.length,
          strategy: unifier.config.mode,
          enhancedTraitsAvailable: true,
          traitCount: Object.keys(semanticTraits.traits || {}).length,
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Demo endpoint with sample data
app.get("/api/v1/segmentation/demo", async (req, res) => {
  const sampleMessages = [
    {
      content:
        "Let's analyze the ceiling for this project. What's the right path forward?",
      author: "user",
    },
    {
      content:
        "I see three main risks we need to enumerate: technical debt, timeline, and resource constraints.",
      author: "assistant",
    },
    {
      content:
        "For mitigation sequence: 1→ technical audit, 2→ timeline buffer, 3→ resource reallocation.",
      author: "assistant",
    },
    {
      content:
        "Profile: You prefer structured, privacy-first solutions with clear decision points.",
      author: "assistant",
    },
    {
      content: "Proceed with the technical audit as the first step.",
      author: "user",
    },
  ];

  try {
    const analysis = await new Promise((resolve) => {
      // Simulate the analysis
      setTimeout(() => {
        const segments = [
          {
            start: 0,
            end: 0,
            title: "Pivot Question",
            summary: "Initial direction assessment",
          },
          {
            start: 1,
            end: 1,
            title: "Risk Enumeration",
            summary: "Identifying key project risks",
          },
          {
            start: 2,
            end: 2,
            title: "Mitigation Plan",
            summary: "Structured mitigation approach",
          },
          {
            start: 3,
            end: 3,
            title: "Profile Delivery",
            summary: "User cognitive profile",
          },
          {
            start: 4,
            end: 4,
            title: "Authorization",
            summary: "Decision to proceed",
          },
        ];

        const patterns = extractPatterns(segments, sampleMessages);
        const traits = aggregateTraits(patterns);

        resolve({
          segments,
          patternCandidates: patterns,
          traitVector: traits,
          metadata: {
            totalMessages: sampleMessages.length,
            totalSegments: segments.length,
            totalPatterns: patterns.length,
            strategy: "rule-basic",
            timestamp: new Date().toISOString(),
          },
        });
      }, 100);
    });

    res.json({ ok: true, analysis });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Phase 2: Cohort Discovery Endpoint
// POST /api/v1/segmentation/cohorts
// Input: { userConversationMap: { userId: [conversations] } }
// Output: Array of cohorts with traits and user assignments
app.post("/api/v1/segmentation/cohorts", async (req, res) => {
  try {
    const { userConversationMap } = req.body;

    if (!userConversationMap || typeof userConversationMap !== "object") {
      return res.status(400).json({
        ok: false,
        error: "Missing or invalid userConversationMap",
      });
    }

    // Dynamically import cohort analyzer
    const cohortAnalyzer = await import("../engine/cohort-analyzer.js");

    const cohorts = await cohortAnalyzer.discoverCohorts(userConversationMap);

    res.json({
      ok: true,
      cohorts,
      metadata: {
        totalCohorts: cohorts.length,
        totalUsers: Object.keys(userConversationMap).length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[segmentation] Cohort discovery error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /api/v1/segmentation/cohorts
// Retrieve persisted cohorts from Phase 2 infrastructure
app.get("/api/v1/segmentation/cohorts", async (req, res) => {
  try {
    const cohortAnalyzer = await import("../engine/cohort-analyzer.js");
    const allCohorts = await cohortAnalyzer.getAllCohorts();

    res.json({
      ok: true,
      cohorts: allCohorts,
      metadata: {
        totalCohorts: allCohorts.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[segmentation] Cohort retrieval error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /api/v1/segmentation/cohorts/:userId
// Get the cohort for a specific user
app.get("/api/v1/segmentation/cohorts/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const cohortAnalyzer = await import("../engine/cohort-analyzer.js");
    const userCohort = await cohortAnalyzer.getUserCohort(userId);

    if (!userCohort) {
      return res.status(404).json({
        ok: false,
        error: `User ${userId} not assigned to any cohort`,
      });
    }

    res.json({
      ok: true,
      cohort: userCohort,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[segmentation] User cohort lookup error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Memory Synthesis Layer: Context Resonance
app.post("/api/v1/segmentation/resonance", async (req, res) => {
  try {
    const { context, traits } = req.body;
    const response = await axios.post(`${SYNAPSE_URL}/resonance`, {
      context,
      limit: 5,
    });
    res.json({ ok: true, narrative: response.data.data });
  } catch (error) {
    console.error("Synapse Resonance Error:", error.message);
    // Fallback for now
    res.json({ ok: true, narrative: [] });
  }
});

app.post("/api/v1/segmentation/store", async (req, res) => {
  try {
    const { segment } = req.body;
    if (!segment)
      return res.status(400).json({ ok: false, error: "Segment required" });

    await axios.post(`${SYNAPSE_URL}/memory`, {
      content: segment.summary || segment.title,
      type: "conversation",
      tags: [segment.title],
    });
    res.json({ ok: true });
  } catch (error) {
    console.error("Synapse Store Error:", error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Observability endpoint (Phase 6C)
app.get("/api/v1/system/observability", (req, res) => {
  res.json({
    service: "segmentation-server",
    tracer: tracer.getMetrics(),
    circuitBreakers: svc.getCircuitBreakerStatus(),
  });
});

// Start server with unified initialization
svc.start();

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🧩 Segmentation Server shutting down...");
  process.exit(0);
});
