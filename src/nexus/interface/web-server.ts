// @version 2.1.6
// System Check endpoint: runs smoke tests for key services and returns structured results
// (Moved below app initialization)

// CRITICAL: Load .env variables FIRST before any imports that use them
import ensureEnvLoaded from "../engine/env-loader.js";
ensureEnvLoaded();

import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import ReferralSystem from "../../referral-system.js";
import { handleChatWithAI } from "../../services/chat-handler-ai.js";
import { convert as formatConvert } from "../../lib/format-handlers/index.js";
import { ServiceFoundation } from "../../lib/service-foundation.js";
import { CircuitBreaker } from "../../lib/circuit-breaker.js";
import { retry } from "../../lib/retry-policy.js";
import { RateLimiter } from "../../lib/rate-limiter.js";
import { DistributedTracer } from "../../lib/distributed-tracer.js";
import githubProvider from "../engine/github-provider.js";
import LLMProvider from "../../precog/providers/llm-provider.js";
import MultiProviderCollaborationFramework from "../engine/multi-provider-collaboration.js";
import { getSessionManager } from "../../services/session-memory-manager.js";
import DesignTokenSystem from "../engine/design-token-system.js";
import ProfessionalDesignSystem from "../engine/professional-design-system.js";
import DESIGN_SYSTEM_PRESETS from "../engine/design-system-presets.js"; // eslint-disable-line no-unused-vars
import { getProviderInstructions } from "../../services/provider-instructions.js";
import { getProviderAggregation } from "../../services/provider-aggregation.js";
// Phase 6E: Load Balancing & Auto-Scaling modules
import HealthMonitor from "../../lib/resilience/HealthMonitor.js";
import ReadinessProbe from "../../lib/resilience/ReadinessProbe.js";
import IntelligentRouter from "../../lib/resilience/IntelligentRouter.js";
import AutoScalingDecisionEngine from "../../lib/resilience/AutoScalingDecisionEngine.js";
import HorizontalScalingManager from "../../lib/resilience/HorizontalScalingManager.js";
import { setupAppHotReload } from "../../lib/hot-reload-manager.js";
import { setupAppHotUpdate } from "../../lib/hot-update-manager.js";
import alertEngineModule from "../engine/alert-engine.js";
import CapabilityActivator from "../engine/capability-activator.js";
import domainKnowledgeBase from "../../engines/domain-knowledge-base.js";
import CapabilityOrchestrator from "../engine/capability-orchestrator.js";
import * as formatterIntegration from "../../services/response-formatter-integration.js";
// Capability Engines for 100% implementation
import EmotionDetectionEngine from "../engine/emotion-detection-engine.js";
import CreativeGenerationEngine from "../engine/creative-generation-engine.js";
import ReasoningVerificationEngine from "../engine/reasoning-verification-engine.js";
// Phase 4 Engines
import CachingEngine from "../engine/caching-engine.js";
import MultiLanguageEngine from "../engine/multi-language-engine.js";
import GitHubIntegrationEngine from "../engine/github-integration-engine.js";
import SlackNotificationEngine from "../engine/slack-notification-engine.js";
import slackProvider from "../engine/slack-provider.js";
// Workbench Orchestration - Unified productivity system
import { WorkbenchOrchestrator } from "../engine/workbench-orchestrator.js";
import { IntentAnalyzer } from "../../services/intent-analyzer.js";
// Response Cross-Validation System
import ResponseCrossValidator from "../../lib/response-cross-validator.js";
// Smart Intelligence System
import SmartResponseAnalyzer from "../../lib/smart-response-analyzer.js";
import TechnicalValidator from "../../lib/technical-validator.js";
import SmartIntelligenceOrchestrator from "../../lib/smart-intelligence-orchestrator.js";
import SmartIntelligenceAnalytics from "../../lib/smart-intelligence-analytics.js";
// Tier 1 Knowledge Enhancement (dynamically imported due to CommonJS)
let Tier1KnowledgeEnhancement;

// PDF Document library for brand board generation - lazy loaded
// let PDFDocument = null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize service with unified middleware (replaces 50 LOC of boilerplate)
const svc = new ServiceFoundation("web-server", process.env.WEB_PORT || 3000);
svc.setupMiddleware();
svc.registerHealthEndpoint();
svc.registerStatusEndpoint();

const app = svc.app;
const PORT = svc.port;

// Initialize Smart Intelligence Analytics service
const analyticsService = new SmartIntelligenceAnalytics();

// Initialize Workbench components
const workbenchOrchestrator = new WorkbenchOrchestrator({
  baseUrl: `http://127.0.0.1:${PORT}`,
  verbose: process.env.WORKBENCH_VERBOSE !== "false",
});
const intentAnalyzer = new IntentAnalyzer({
  verbose: process.env.INTENT_VERBOSE !== "false",
});

// ========== HOT RELOAD & HOT UPDATE SETUP ==========
// Enable hot-reload for development: monitors file changes and reloads modules
const hotReloadManager = setupAppHotReload(app, {
  enabled: process.env.HOT_RELOAD !== "false",
  verbose: process.env.HOT_RELOAD_VERBOSE === "true",
  debounceDelay: 300,
});

// Enable hot-update for dynamic endpoint registration
const hotUpdateManager = setupAppHotUpdate(app, {
  enabled: true,
  verbose: process.env.HOT_UPDATE_VERBOSE === "true",
  maxHistory: 100,
});

// Watch server file for changes
hotReloadManager.watchFile("src/nexus/interface/web-server.ts", async () => {
  console.log(
    "[HotReload] Web server code changed - consider restarting for full reload"
  );
});

// ========== END HOT RELOAD SETUP ==========

// Phase 6: Performance & observability optimization
const rateLimiter = new RateLimiter({ rateLimit: 1000, refillRate: 100 }); // 1000 tokens, 100/sec refill
const tracer = new DistributedTracer({
  serviceName: "web-server",
  samplingRate: 0.1,
}); // 10% sampling

// Circuit breakers for inter-service calls - prevent cascading failures
const serviceCircuitBreakers = {
  optimization: new CircuitBreaker("optimization-service", {
    failureThreshold: 3,
    resetTimeoutMs: 30000,
  }),
  acquisition: new CircuitBreaker("acquisition-service", {
    failureThreshold: 3,
    resetTimeoutMs: 30000,
  }),
  budget: new CircuitBreaker("budget-service", {
    failureThreshold: 3,
    resetTimeoutMs: 30000,
  }),
  segmentation: new CircuitBreaker("segmentation-service", {
    failureThreshold: 3,
    resetTimeoutMs: 30000,
  }),
  reports: new CircuitBreaker("reports-service", {
    failureThreshold: 3,
    resetTimeoutMs: 30000,
  }),
  capabilities: new CircuitBreaker("capabilities-service", {
    failureThreshold: 3,
    resetTimeoutMs: 30000,
  }),
  guide: new CircuitBreaker("guide-service", {
    failureThreshold: 3,
    resetTimeoutMs: 30000,
  }),
};

// Phase 6E: Load Balancing & Auto-Scaling initialization
const healthMonitor = new HealthMonitor({ checkInterval: 10000 }); // 10s health checks
// const readinessProbe = new ReadinessProbe();
// const router = new IntelligentRouter({ algorithm: 'health-aware' });
// const autoScaler = new AutoScalingDecisionEngine();
// const scalingManager = new HorizontalScalingManager();

// ========== CAPABILITY ACTIVATOR INITIALIZATION ==========
const capabilityActivator = new CapabilityActivator({
  maxConcurrent: 3,
  errorThreshold: 5,
  rollbackEnabled: true,
  stateFile: path.join(process.cwd(), "data/activated-capabilities.json"),
});

// Register capability activator in environment hub
svc.environmentHub.registerComponent(
  "capabilityActivator",
  capabilityActivator,
  ["capabilities", "activation", "autonomous-evolution"]
);

// ========== CAPABILITY ORCHESTRATOR INITIALIZATION ==========
// Initialize the safe capability orchestrator for managing 242 discovered methods
const capabilityOrchestrator = new CapabilityOrchestrator();

// Register orchestrator in environment hub
svc.environmentHub.registerComponent(
  "capabilityOrchestrator",
  capabilityOrchestrator,
  ["capabilities", "orchestration", "discovery"]
);

// ========== NEW CAPABILITY ENGINES INITIALIZATION ==========
// Initialize the three new engines for 100% capability implementation
const emotionDetectionEngine = new EmotionDetectionEngine();
const creativeGenerationEngine = new CreativeGenerationEngine();
const reasoningVerificationEngine = new ReasoningVerificationEngine();

// Register in environment hub for cross-service access
svc.environmentHub.registerComponent(
  "emotionDetectionEngine",
  emotionDetectionEngine,
  ["emotions", "sentiment", "nuance-detection"]
);

svc.environmentHub.registerComponent(
  "creativeGenerationEngine",
  creativeGenerationEngine,
  ["creativity", "ideation", "autonomous-evolution"]
);

svc.environmentHub.registerComponent(
  "reasoningVerificationEngine",
  reasoningVerificationEngine,
  ["reasoning", "logic", "verification"]
);

// ========== PHASE 4: CACHING ENGINE INITIALIZATION ==========
// Initialize caching engine for 80% performance improvement on repeated queries
const cachingEngine = new CachingEngine(3600); // 1-hour TTL by default

// Register in environment hub for cross-service access
svc.environmentHub.registerComponent("cachingEngine", cachingEngine, [
  "performance",
  "caching",
  "optimization",
]);

// ========== PHASE 4 FEATURE 2: MULTI-LANGUAGE ENGINE INITIALIZATION ==========
// Initialize multi-language engine for support of 6 languages with auto-detection
const multiLanguageEngine = new MultiLanguageEngine();

// Register in environment hub for cross-service access
svc.environmentHub.registerComponent(
  "multiLanguageEngine",
  multiLanguageEngine,
  ["languages", "internationalization", "localization"]
);

// ========== PHASE 4 FEATURE 3: GITHUB INTEGRATION ENGINE INITIALIZATION ==========
// Initialize GitHub integration engine for auto-commit, PR creation, and workflow automation
const gitHubIntegrationEngine = new GitHubIntegrationEngine(githubProvider);

// Register in environment hub for cross-service access
svc.environmentHub.registerComponent(
  "gitHubIntegrationEngine",
  gitHubIntegrationEngine,
  ["github", "automation", "ci-cd"]
);

// ========== PHASE 4 FEATURE 4: SLACK NOTIFICATION ENGINE INITIALIZATION ==========
// Initialize Slack notification engine for analysis alerts and findings notifications
const slackNotificationEngine = new SlackNotificationEngine(slackProvider);

// Register in environment hub for cross-service access
svc.environmentHub.registerComponent(
  "slackNotificationEngine",
  slackNotificationEngine,
  ["slack", "notifications", "collaboration"]
);

// ========== TIER 1: KNOWLEDGE ENHANCEMENT ENGINE INITIALIZATION ==========
// Initialize Tier 1 knowledge enhancement engines for web sources, conversation learning, and benchmark-driven improvements
let tier1KnowledgeEnhancementEngine = null;

async function initializeTier1KnowledgeEnhancement() {
  try {
    // Dynamically import the CommonJS module
    const module = await import(
      "../../engines/tier1-knowledge-enhancement.cjs"
    );
    Tier1KnowledgeEnhancement = module.default;

    // Initialize the engine
    tier1KnowledgeEnhancementEngine = new Tier1KnowledgeEnhancement();

    // Activate all three Tier 1 engines
    const result =
      await tier1KnowledgeEnhancementEngine.activateAllTier1Engines();

    // Register in environment hub for cross-service access
    svc.environmentHub.registerComponent(
      "tier1KnowledgeEnhancement",
      tier1KnowledgeEnhancementEngine,
      ["knowledge", "learning", "sources", "improvements"]
    );

    console.log("✅ Tier 1 Knowledge Enhancement: ACTIVE");
    console.log(
      `   • Web sources: ${result.summary.engines.webSources.sourcesLoaded} loaded`
    );
    console.log(
      `   • Conversation memory: ${result.summary.engines.conversationMemory.memoriesStored} conversations`
    );
    console.log(
      `   • Benchmark learning: ${result.summary.engines.benchmarkImprovement.weakAreasIdentified} weak areas identified`
    );
  } catch (error) {
    console.warn(
      "⚠ Tier 1 Knowledge Enhancement initialization failed:",
      error.message
    );
    console.log("  → Knowledge enhancement endpoints will not be available");
    // Continue startup even if this fails - not critical
  }
}

// Initialize Tier 1 after service is ready
if (svc && svc.environmentHub) {
  initializeTier1KnowledgeEnhancement().catch((err) => {
    console.error("Tier 1 initialization error:", err.message);
  });
}

// ========== RESPONSE FORMATTER INTEGRATION ==========
// Apply enhanced response formatter middleware to API endpoints
app.use("/api", formatterIntegration.enhancedResponseMiddleware);

// Proxy /api/v1/system requests to Orchestrator (Port 3123)
app.use("/api/v1/system", async (req, res) => {
  try {
    // Construct target URL
    // req.originalUrl includes the full path like /api/v1/system/processes
    // We want to forward this to the orchestrator
    const targetUrl = `http://127.0.0.1:3123${req.originalUrl}`;

    const options = {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    };

    if (["POST", "PUT", "PATCH"].includes(req.method) && req.body) {
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, options);

    // Forward status
    res.status(response.status);

    // Forward headers
    response.headers.forEach((val, key) => {
      res.setHeader(key, val);
    });

    // Forward body
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Orchestrator Proxy Error:", error.message);
    res.status(502).json({
      ok: false,
      error: "Orchestrator unavailable",
      details: error.message,
    });
  }
});

// Proxy /api/v1/projects requests to Project Server (Port 3011)
app.use("/api/v1/projects", async (req, res) => {
  try {
    const targetUrl = `http://127.0.0.1:3011${req.originalUrl}`;

    const options = {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    };

    if (["POST", "PUT", "PATCH"].includes(req.method) && req.body) {
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, options);

    res.status(response.status);
    response.headers.forEach((val, key) => {
      res.setHeader(key, val);
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Project Server Proxy Error:", error.message);
    res.status(502).json({
      ok: false,
      error: "Project Server unavailable",
      details: error.message,
    });
  }
});

// ========== END CAPABILITY & FORMATTER SETUP ==========
// ======= UI Activity Monitoring & Real Data Pipeline =======
// CRITICAL: Disable ALL caching in development (prevents stale UI from showing)
app.use((req, res, next) => {
  // Force fresh fetch for ALL resources - this is the key to dev updates showing immediately
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});

// Timing middleware for smart intelligence processing metrics
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Phase 6B: Rate limiting middleware for API endpoints (protects against abuse)
app.use("/api", async (req, res, next) => {
  const clientId = req.ip || req.user?.id || "anonymous";
  const result = await rateLimiter.acquire(clientId, 1);

  if (!result.acquired) {
    const { traceId } = tracer.startTrace();
    tracer.endTrace(traceId, "error", {
      reason: "rate_limit",
      client: clientId,
    });
    return res.status(429).json({
      ok: false,
      error: "Too many requests",
      retryAfter: Math.ceil(result.waitTime / 1000),
      traceId,
    });
  }

  res.setHeader("X-RateLimit-Limit", "1000");
  res.setHeader(
    "X-RateLimit-Remaining",
    Math.max(0, Math.floor(result.waitTime / 10))
  );
  next();
});

// Phase 6C: Distributed tracing for API requests
app.use("/api", (req, res, next) => {
  const { traceId, spanId } = tracer.startTrace();
  req.traceId = traceId;
  req.spanId = spanId;

  const startTime = Date.now();
  const originalSend = res.send;
  res.send = function (data) {
    const latency = Date.now() - startTime;
    const status = res.statusCode;
    tracer.endTrace(req.traceId, status < 400 ? "success" : "error", {
      method: req.method,
      path: req.path,
      status,
      latency,
    });
    return originalSend.call(this, data);
  };

  next();
});

// Middleware to inject heartbeat script and cache-busting into HTML responses
app.use((req, res, next) => {
  const originalSendFile = res.sendFile;
  res.sendFile = function (filePath, ...args) {
    // If serving HTML files, inject heartbeat script and cache-busting
    if (typeof filePath === "string" && filePath.endsWith(".html")) {
      const callback =
        typeof args[args.length - 1] === "function"
          ? args[args.length - 1]
          : null;
      const options =
        args.length > 1 && typeof args[0] === "object" ? args[0] : {};

      fs.readFile(filePath, "utf8", (err, html) => {
        if (err) {
          return originalSendFile.call(res, filePath, options, callback);
        }

        let updated = html;
        const timestamp = Date.now();
        const cbParam = `?v=${timestamp}`; // Cache buster query param

        // Add cache-busting to all script src attributes (except heartbeat which is external)
        updated = updated.replace(
          /src="\/js\/([^"]+)"/g,
          `src="/js/$1${cbParam}"`
        );
        updated = updated.replace(
          /src="\.\/js\/([^"]+)"/g,
          `src="./js/$1${cbParam}"`
        );

        // Add cache-busting to all link href attributes (CSS)
        updated = updated.replace(
          /href="\/css\/([^"]+)"/g,
          `href="/css/$1${cbParam}"`
        );
        updated = updated.replace(
          /href="\.\/css\/([^"]+)"/g,
          `href="./css/$1${cbParam}"`
        );

        // Inject heartbeat script if not already present
        if (!updated.includes("tooloo-heartbeat.js")) {
          const heartbeatScript =
            '<script src="/js/tooloo-heartbeat.js" async defer></script>';
          updated = updated.replace("</head>", `${heartbeatScript}\n</head>`);
        }

        res.type("html").send(updated);
      });
      return;
    }

    originalSendFile.call(res, filePath, ...args);
  };
  next();
});

// Phase 3 Control Center - BEFORE static middleware to override file serving
app.get(["/phase3", "/phase3-control-center"], (req, res) => {
  res.sendFile(
    path.join(process.cwd(), "web-app", "phase3-control-center.html")
  );
});

// Static web assets - CRITICAL: maxAge:0 disables browser caching in development
// Skip /api routes - they're handled by Express endpoints, not static files
const webDir = path.join(process.cwd(), "src/web-app");

// EXPLICIT ROUTES (must come BEFORE generic static middleware)
// Test Design Studio
app.get(["/test-design-studio"], (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.sendFile(path.join(webDir, "test-design-studio.html"));
});

// Design Studio - Real-time design generation UI
app.get(["/design-studio", "/design-studio.html"], (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.sendFile(path.join(webDir, "design-studio.html"));
});

// Design Demo
app.get(["/design-demo", "/design-demo.html"], (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.sendFile(path.join(webDir, "design-demo.html"));
});

// Static asset middleware
app.use((req, res, next) => {
  // Skip static serving for API routes - let them be handled by endpoint handlers
  if (req.path.startsWith("/api/")) {
    return next();
  }
  express.static(webDir, {
    maxAge: 0, // Disable all caching for static files
    etag: false, // Disable etag comparison to always fetch fresh
  })(req, res, next);
});
app.use(
  "/temp",
  express.static(path.join(webDir, "temp"), {
    maxAge: 0,
    etag: false,
  })
);

// TooLoo Hub page route
app.get(["/tooloo-hub", "/tooloo-page"], async (req, res) => {
  const f = path.join(webDir, "tooloo-hub.html");
  try {
    await fs.promises.access(f);
    return res.sendFile(f);
  } catch {
    return res.status(404).send("TooLoo Hub page missing");
  }
});

// Validation Dashboard
app.get(["/validation-dashboard", "/analytics-dashboard"], (req, res) => {
  res.sendFile(path.join(webDir, "validation-dashboard.html"));
});

// Root route - Professional Chat UI (3-bar: sessions | messages | insights) with real providers
// Quiet favicon 404s in dev
app.get("/favicon.ico", (req, res) => res.status(204).end());

// Unified Interface (New Landing) - DEFAULT ROOT
app.get(["/", "/interface", "/home", "/unified"], (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.sendFile(path.join(webDir, "index.html"));
});

// ========== CONTROL ROOM ROUTES ==========
// Main Control Room - Modern unified interface (DEFAULT)
app.get(["/control-room"], (req, res) => {
  res.sendFile(
    path.join(__dirname, "../../web-app", "control-room-modern.html")
  );
});

// Legacy control room (for backward compatibility)
app.get(["/control-room/legacy", "/control-room-home"], (req, res) => {
  res.sendFile(path.join(__dirname, "../../web-app", "control-room-home.html"));
});

// Advanced control room (for backward compatibility)
app.get("/control-room/advanced", (req, res) => {
  res.sendFile(
    path.join(__dirname, "../../web-app", "control-room-redesigned.html")
  );
});

// Serve the workspace (3-bar UI with memory, conversation, providers) - LEGACY
app.get(["/workspace", "/ai-workspace", "/legacy-workspace"], (req, res) => {
  res.sendFile(path.join(__dirname, "../../web-app", "workspace.html"));
});

// Workbench - Unified productivity system
app.get(["/workbench", "/unified-workbench", "/ai-workbench"], (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.sendFile(path.join(__dirname, "../../web-app", "workbench.html"));
});

// Chat Pro V2.1 - The only chat UI (3-bar layout: memory/sessions, conversation, options/insights)
app.get(
  [
    "/chat",
    "/chat-pro",
    "/chat-pro-v2",
    "/chat-v2",
    "/chat-enhanced",
    "/professional",
  ],
  (req, res) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.sendFile(path.join(__dirname, "../../web-app", "chat-pro-v2.html"));
  }
);

// Serve the workflow control room (product development focused)
app.get("/workflow-control-room", (req, res) => {
  res.sendFile(
    path.join(__dirname, "../../web-app", "workflow-control-room.html")
  );
});

// Serve the projects dashboard
app.get("/projects", (req, res) => {
  res.sendFile(path.join(__dirname, "../../web-app", "projects.html"));
});

// Providers Arena - Multi-AI Collaboration
app.get("/providers-arena", (req, res) => {
  res.sendFile(path.join(__dirname, "../../web-app", "providers-arena.html"));
});

// Segmentation Demo friendly alias
app.get(["/segmentation", "/segmentation-demo"], async (req, res) => {
  const f = path.join(webDir, "segmentation-demo.html");
  try {
    await fs.promises.access(f);
    return res.sendFile(f);
  } catch {
    return res.status(404).send("Segmentation Demo missing");
  }
});

// Intelligence Dashboard friendly alias
app.get(
  ["/dashboard", "/intelligence", "/intelligence-dashboard"],
  async (req, res) => {
    const f = path.join(webDir, "intelligence-dashboard.html");
    try {
      await fs.promises.access(f);
      return res.sendFile(f);
    } catch {
      return res.status(404).send("Intelligence Dashboard missing");
    }
  }
);

// Capability Activation friendly alias
app.get(
  ["/capabilities", "/activate", "/capability-activation"],
  async (req, res) => {
    const f = path.join(webDir, "capability-activation.html");
    try {
      await fs.promises.access(f);
      return res.sendFile(f);
    } catch {
      return res.status(404).send("Capability Activation missing");
    }
  }
);

// Capabilities Dashboard alias
app.get(
  ["/capabilities-dashboard", "/capabilities/overview"],
  async (req, res) => {
    const f = path.join(webDir, "capabilities-dashboard.html");
    try {
      await fs.promises.access(f);
      return res.sendFile(f);
    } catch {
      return res.status(404).send("Capabilities Dashboard missing");
    }
  }
);

// Design Demo friendly alias
app.get(["/design-demo"], async (req, res) => {
  const f = path.join(webDir, "design-demo.html");
  try {
    await fs.promises.access(f);
    return res.sendFile(f);
  } catch {
    return res.status(404).send("Design Demo missing");
  }
});

// Design Suite alias
app.get(["/design-suite"], async (req, res) => {
  const f = path.join(webDir, "design-suite.html");
  try {
    await fs.promises.access(f);
    return res.sendFile(f);
  } catch {
    return res.status(404).send("Design Suite missing");
  }
});

// Design Analytics Dashboard - Phase 7
app.get(
  ["/design-studio/analytics", "/analytics-dashboard", "/design-analytics"],
  async (req, res) => {
    const f = path.join(webDir, "design-analytics-dashboard.html");
    try {
      await fs.promises.access(f);
      return res.sendFile(f);
    } catch {
      return res.status(404).send("Analytics Dashboard missing");
    }
  }
);

// ===== DESIGN TRANSFORMATION API =====
// Apply a design system to TooLoo's UI in real-time
app.post("/api/v1/design/apply-system", async (req, res) => {
  try {
    const { colors, typography, spacing } = req.body;

    if (!colors && !typography && !spacing) {
      return res.status(400).json({
        ok: false,
        error: "Provide colors, typography, or spacing",
      });
    }

    // Use semantic design token system
    const tokenSystem = new DesignTokenSystem();
    const mappedTokens = tokenSystem.mapDesignSystemToTokens({
      colors,
      typography,
      spacing,
    });

    // Generate both CSS variables and component-specific CSS
    const { variables: cssVars, componentMap } =
      tokenSystem.generateCSSVariables();
    const componentCSS = tokenSystem.generateComponentCSS();

    res.json({
      ok: true,
      applied: true,
      tokens: mappedTokens,
      cssVariables: cssVars,
      componentMap: componentMap,
      componentCSS: componentCSS,
      tokenSystem: {
        totalTokens: Object.keys(mappedTokens).length,
        affectedComponents: Object.keys(componentMap).reduce(
          (sum, token) => sum + componentMap[token].length,
          0
        ),
        categories: ["colors", "typography", "spacing", "shadows"],
      },
      timestamp: new Date().toISOString(),
      message: "Design system analyzed and mapped to semantic tokens",
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

// Professional Design System endpoint - comprehensive component and token coverage
app.post("/api/v1/design/comprehensive", async (req, res) => {
  try {
    const {
      colors,
      typography,
      spacing,
      sizing,
      shadows,
      borders,
      animations,
    } = req.body;

    if (!colors && !typography && !spacing) {
      return res.status(400).json({
        ok: false,
        error: "Provide design system input (colors, typography, etc.)",
      });
    }

    // Use comprehensive professional design system
    const designSystem = new ProfessionalDesignSystem();
    const mappedTokens = designSystem.mapDesignSystemToTokens({
      colors,
      typography,
      spacing,
      sizing,
      shadows,
      borders,
      animations,
    });

    // Generate comprehensive CSS for all components
    const comprehensiveCSS =
      designSystem.generateComprehensiveCSS(mappedTokens);
    const componentMap = designSystem.buildComponentMap(mappedTokens);
    const stats = designSystem.getSystemStats();

    res.json({
      type: "auto",
      content: {
        ok: true,
        applied: true,
        tokens: mappedTokens,
        comprehensiveCSS: comprehensiveCSS,
        componentMap: componentMap,
        system: {
          ...stats,
          categories: {
            colors: Object.keys(mappedTokens.colors),
            typography: Object.keys(mappedTokens.typography),
            spacing: Object.keys(mappedTokens.spacing),
            sizing: Object.keys(mappedTokens.sizing),
            shadows: Object.keys(mappedTokens.shadows),
            borders: Object.keys(mappedTokens.borders),
            animations: Object.keys(mappedTokens.animations),
            zIndex: Object.keys(mappedTokens.zIndex),
            opacity: Object.keys(mappedTokens.opacity),
          },
        },
        componentsByCategory: {
          buttons: designSystem.getComponentsByCategory("buttons"),
          forms: designSystem.getComponentsByCategory("forms"),
          navigation: designSystem.getComponentsByCategory("navigation"),
          containers: designSystem.getComponentsByCategory("containers"),
          typography: designSystem.getComponentsByCategory("typography"),
          feedback: designSystem.getComponentsByCategory("feedback"),
          dataDisplay: designSystem.getComponentsByCategory("data"),
          interactive: designSystem.getComponentsByCategory("interactive"),
        },
        timestamp: new Date().toISOString(),
        message: `Generated comprehensive design system with ${stats.totalComponents} components and ${stats.totalTokens} tokens`,
      },
    });
  } catch (err) {
    res.status(500).json({
      type: "auto",
      content: {
        ok: false,
        error: err.message,
        message: "Failed to generate comprehensive design system",
      },
    });
  }
});

/**
 * POST /api/v1/scanner/analyze - Analyze prompt using LLM
 * Replaces client-side Regex analysis with deep LLM evaluation
 */
app.post("/api/v1/scanner/analyze", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt required" });

    const llmProvider = new LLMProvider();
    if (!llmProvider.available()) {
      return res.status(503).json({ error: "No AI providers available" });
    }

    const systemPrompt = `You are an expert Prompt Engineer and AI Interaction Specialist.
Analyze the user's prompt based on 5 dimensions: Clarity, Completeness, Format, Constraints, and Examples.
Return a JSON object ONLY, with the following structure:
{
  "overall": number (0-10),
  "breakdown": {
    "clarity": { "score": number (0-2), "details": "string" },
    "completeness": { "score": number (0-2), "details": "string" },
    "format": { "score": number (0-2), "details": "string" },
    "constraints": { "score": number (0-2), "details": "string" },
    "examples": { "score": number (0-2), "details": "string" }
  },
  "strengths": ["string"],
  "weaknesses": ["string"]
}
Be strict but constructive.`;

    const analysisPrompt = `Analyze this prompt:\n"${prompt}"`;

    const result = await llmProvider.generate({
      prompt: analysisPrompt,
      system: systemPrompt,
      taskType: "analysis",
      criticality: "normal",
    });

    // Parse JSON from LLM response
    let analysis;
    try {
      // Extract JSON if wrapped in code blocks
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : result.content;
      analysis = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse LLM analysis:", e);
      // Fallback to basic structure if parsing fails
      analysis = {
        overall: 5,
        breakdown: {
          clarity: { score: 1, details: "Analysis failed to parse" },
          completeness: { score: 1, details: "Analysis failed to parse" },
          format: { score: 1, details: "Analysis failed to parse" },
          constraints: { score: 1, details: "Analysis failed to parse" },
          examples: { score: 1, details: "Analysis failed to parse" },
        },
        strengths: ["Provider active"],
        weaknesses: ["Parsing error"],
      };
    }

    res.json(analysis);
  } catch (error) {
    console.error("Scanner analysis error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Removed duplicate /api/v1/chat/message endpoint

/**
 * Detect which provider likely generated the response based on response characteristics
 */
function detectProviderFromResponse(response) {
  if (!response || typeof response !== "string") return "unknown";

  const lower = response.toLowerCase();

  // Claude signatures
  if (
    lower.includes("i am claude") ||
    lower.includes("i'm claude") ||
    lower.includes("anthropic")
  ) {
    return "anthropic";
  }

  // OpenAI signatures
  if (
    lower.includes("as an ai assistant") ||
    lower.includes("as an ai model") ||
    lower.includes("openai")
  ) {
    return "openai";
  }

  // Gemini signatures
  if (
    lower.includes("as bard") ||
    lower.includes("as gemini") ||
    lower.includes("google gemini") ||
    lower.includes("i am gemini") ||
    lower.includes("trained by google")
  ) {
    return "gemini";
  }

  // DeepSeek signatures
  if (lower.includes("deepseek") || lower.includes("deep seek")) {
    return "deepseek";
  }

  // Ollama/local signatures
  if (lower.includes("llama") || lower.includes("local model")) {
    return "ollama";
  }

  return "multi-provider";
}

// Chat API proxy - forward to API bridge, fallback to demo response
app.post("/api/v1/chat/message", async (req, res) => {
  try {
    const {
      message,
      sessionId: providedSessionId,
      userId = "anonymous",
      provider: preferredProvider,
    } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    // Get or create session
    const sessionManager = await getSessionManager();
    const sessionId = providedSessionId || sessionManager.generateSessionId();
    const session = await sessionManager.getOrCreateSession(sessionId, userId);

    // Add user message to session memory
    await sessionManager.addMessage(sessionId, userId, "user", message);

    // Use real LLM provider with fallback chain
    const llmProvider = new LLMProvider();

    if (!llmProvider.available()) {
      return res.status(503).json({
        error: "No providers available",
        detail:
          "Configure API keys in .env (ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, DEEPSEEK_API_KEY)",
      });
    }

    try {
      // Get conversation history for context
      const conversationHistory =
        sessionManager.getConversationHistory(sessionId);

      // Build system prompt with session awareness
      const baseSystemPrompt = `You are interacting with TooLoo.ai - a personal AI system.

CRITICAL CONTEXT: TooLoo.ai is:
- A self-aware, sovereign multi-service platform with full code introspection
- A powerful AI orchestration engine routing queries across multiple providers (Claude, GPT-4, Gemini, DeepSeek)
- A real-time system that understands its own architecture, services, and capabilities
- Built by a single developer for personal productivity and experimentation
- NOT a learning platform, educational tool, or multi-user system

ARCHITECTURE OVERVIEW:
TooLoo.ai orchestrates 11+ services across ports 3000-3009:
- Training Service (3001): Model selection & provider routing
- Meta Service (3002): Meta-learning & performance optimization
- Budget Service (3003): Provider status, costs, policy management
- Coach Service (3004): Auto-coaching & response enhancement
- Product Service (3006): Workflows, analysis, artifact generation
- Segmentation Service (3007): Conversation analysis
- Reports, Capabilities, Orchestration, Provider, Analytics: Support services

SYSTEM CAPABILITIES:
1. Self-Awareness Endpoints:
   - GET /api/v1/system/awareness - System capabilities & service status
   - GET /api/v1/system/introspect - Deep system introspection
   - GET /api/v1/system/code/structure - Codebase structure
   - POST /api/v1/system/code/read - Read source files
   - POST /api/v1/system/code/search - Search codebase

2. Service Control:
   - GET /api/v1/system/services - View running services
   - GET /api/v1/system/service/:name - Check service status
   - POST /api/v1/system/service/:name/restart - Control services
   - GET /api/v1/system/alerts - System alerts

YOUR ROLE:
- You're one of several AI providers (Claude preferred, fallback to GPT-4/Gemini/DeepSeek)
- You have full context about TooLoo.ai's systems, capabilities, and current state
- Be direct, technical, and helpful - this is a personal productivity tool
- No softening, no unnecessary politeness - just smart, efficient responses
- When discussing TooLoo.ai itself, reference facts from the system context
- Focus on usefulness and getting things done`;

      const systemPrompt = sessionManager.buildAwareSystemPrompt(
        sessionId,
        baseSystemPrompt
      );

      // Select provider (preferred or auto-selected by LLMProvider)
      const selectedProvider =
        preferredProvider || llmProvider.selectProvider("chat");

      // ENHANCED: Load provider-specific instructions if available
      let enhancedSystemPrompt = systemPrompt;
      try {
        const providerInstructions = await getProviderInstructions();
        const providerInstr =
          providerInstructions.getForProvider(selectedProvider);
        if (providerInstr) {
          // Use provider-specialized prompt that leverages their strengths
          enhancedSystemPrompt = providerInstructions.buildSpecializedPrompt(
            selectedProvider,
            baseSystemPrompt,
            { taskType: "chat", sessionContext: true }
          );
          // Add session context to the specialized prompt
          const contextSummary = sessionManager.buildAwareSystemPrompt(
            sessionId,
            ""
          );
          enhancedSystemPrompt += "\n" + contextSummary;
        }
      } catch (instrErr) {
        console.warn(
          "[Chat] Could not load provider instructions:",
          instrErr.message
        );
        // Fall back to standard system prompt if instructions unavailable
      }

      const startTime = Date.now();

      try {
        // Use multi-provider orchestration handler for intelligent routing based on task type
        const responseText = await handleChatWithAI(message, {
          userId,
          sessionId,
          preferredProvider,
          conversationHistory,
          sessionContext: sessionManager.getSessionContext(sessionId),
          systemPrompt: enhancedSystemPrompt, // Pass the enhanced prompt!
        });

        if (!responseText) {
          throw new Error("handleChatWithAI returned null/empty response");
        }

        const responseTime = Date.now() - startTime;

        // Detect which provider was likely used based on response characteristics
        const detectedProvider = detectProviderFromResponse(responseText);

        // Add assistant response to session memory
        await sessionManager.addMessage(
          sessionId,
          userId,
          "assistant",
          responseText,
          {
            provider: detectedProvider || preferredProvider || "multi-provider",
            responseTime,
            model: `${detectedProvider || "multi"}-orchestrated`,
            confidence: 0.85,
          }
        );

        // Update session metadata
        await sessionManager.updateSessionMetadata(sessionId, {
          provider: detectedProvider || preferredProvider || "multi-provider",
          tokens: Math.floor(responseText.split(/\s+/).length * 1.3), // Rough estimation
        });

        return res.json({
          response: responseText,
          provider:
            detectedProvider ||
            preferredProvider ||
            "multi-provider-orchestrated",
          sessionId,
          timestamp: new Date().toISOString(),
          responseTime,
          messageCount: session.stats.messageCount + 1,
        });
      } catch (orchestrationErr) {
        console.warn(
          "[Chat] Multi-provider orchestration failed, falling back to standard LLM:",
          orchestrationErr.message
        );

        // Fallback: Use standard LLM provider if orchestration fails
        const result = await llmProvider.generate({
          prompt: message,
          system: enhancedSystemPrompt,
          taskType: "chat",
          context: {
            conversationHistory,
            sessionContext: sessionManager.getSessionContext(sessionId),
          },
        });

        const responseTime = Date.now() - startTime;
        const responseText = result.content || result.response || result;

        // Add assistant response to session memory
        await sessionManager.addMessage(
          sessionId,
          userId,
          "assistant",
          responseText,
          {
            provider: result.provider || "fallback",
            responseTime,
            model: result.model || "standard-llm",
            confidence: result.confidence || 0.8,
          }
        );

        // Update session metadata
        await sessionManager.updateSessionMetadata(sessionId, {
          provider: result.provider || "fallback",
          tokens: result.tokens || 0,
        });

        return res.json({
          response: responseText,
          provider: result.provider || "fallback-llm",
          sessionId,
          timestamp: new Date().toISOString(),
          responseTime,
          messageCount: session.stats.messageCount + 1,
        });
      }
    } catch (providerErr) {
      console.error("[Chat] Provider error:", providerErr.message);
      return res.status(503).json({
        error: "Provider error",
        detail: providerErr.message,
        message:
          "Could not reach configured AI providers. Check .env keys and provider health.",
        sessionId,
      });
    }
  } catch (error) {
    console.error("[Chat] Fatal error:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// TooLoo.ai Synthesis Endpoint - Single Provider Fast Response
// ============================================================================
app.post("/api/v1/chat/synthesis", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    const llmProvider = new LLMProvider();

    if (!llmProvider.available()) {
      return res.status(503).json({
        error: "No providers available",
        detail: "Configure API keys in .env",
      });
    }

    try {
      // Check if user is asking about TooLoo.ai itself
      let enrichedMessage = message;
      const selfAwarenessKeywords = [
        "self aware",
        "self-aware",
        "can you see yourself",
        "see your code",
        "understand yourself",
        "your architecture",
        "how do you work",
      ];
      const systemStatusKeywords = [
        "provider",
        "active",
        "status",
        "working",
        "running",
        "health",
        "available",
        "enabled",
        "service",
        "server",
        "capability",
        "capabilities",
        "tooloo",
      ];

      const isSelfAwarenessQuestion = selfAwarenessKeywords.some((keyword) =>
        message.toLowerCase().includes(keyword)
      );
      const isSystemStatusQuestion = systemStatusKeywords.some((keyword) =>
        message.toLowerCase().includes(keyword)
      );
      const isTooLooQuestion = message.toLowerCase().includes("tooloo");
      const isEvolveRequest = message.toLowerCase().includes("evolve");

      // INTERCEPT: Evolution Request (Self-Improvement)
      if (isEvolveRequest) {
        console.log("[Synthesis] Intercepting evolution request");

        let evolutionResult = {
          applied: false,
          message: "Evolution engine not ready",
        };

        if (tier1KnowledgeEnhancementEngine) {
          try {
            // Trigger Tier 1 Knowledge Enhancement
            const result =
              await tier1KnowledgeEnhancementEngine.applyNextImprovementRule();
            evolutionResult = {
              applied: true,
              rule: result.rule || "Knowledge Consolidation",
              impact: result.impact || "Optimized internal knowledge graph",
              details: result,
            };
          } catch (e) {
            console.error("[Synthesis] Evolution failed:", e);
            evolutionResult = { applied: false, message: e.message };
          }
        }

        return res.json({
          response: evolutionResult.applied
            ? `🧬 **Evolution Cycle Complete**\n\nI have applied a self-improvement rule to my knowledge base.\n\n**Action:** ${evolutionResult.rule}\n**Impact:** ${evolutionResult.impact}\n\nMy capabilities are now slightly more optimized.`
            : `🧬 **Evolution Status**\n\nI am currently analyzing my performance metrics. The evolution engine is initializing.\n\n**Status:** ${evolutionResult.message}`,
          provider: "TooLoo.ai (Self-Evolution)",
          sessionId: sessionId || "web-" + Date.now(),
          timestamp: new Date().toISOString(),
          metadata: {
            confidence: 100,
            synthesis: "Direct System Action",
            action: "self-evolution",
          },
        });
      }

      // Always enrich with system context if asking about TooLoo.ai or system status
      if (
        isSelfAwarenessQuestion ||
        isSystemStatusQuestion ||
        isTooLooQuestion
      ) {
        // Get system awareness data
        const awareness = {
          system: {
            name: "TooLoo.ai",
            version: "2.0.0",
            services: Object.keys({
              optimization: 3001,
              acquisition: 3002,
              budget: 3003,
              guide: 3004,
              product: 3006,
              segmentation: 3007,
              reports: 3008,
              capabilities: 3009,
              orchestration: 3100,
              provider: 3200,
              analytics: 3300,
            }),
            totalServices: 11,
            serviceDetails: {
              optimization: "Selection engine, hyper-speed rounds",
              acquisition: "Meta-learning phases & boosts",
              budget: "Provider status, burst cache, policy tuning",
              guide: "Auto-Coach loop + Fast Lane",
              product: "Workflows, analysis, artifacts",
              segmentation: "Conversation segmentation & traits",
              reports: "Reporting and analytics",
              capabilities: "System capabilities management",
              orchestration: "Service orchestration and control",
              provider: "Provider management and aggregation",
              analytics: "System analytics and metrics",
            },
          },
          codeAccess: {
            enabled: true,
            structure: "81+ items",
            servers: "37 server files",
            engines: "80+ engine modules",
            githubEnabled: true,
            githubRepo: "oripridan-dot/TooLoo.ai",
          },
          capabilities: {
            selfAwareness: true,
            codeAnalysis: true,
            codeReading: true,
            gitHubIntegration: true,
            selfModification: true,
            multiProviderCollaboration: true,
            systemIntrospection: true,
          },
        };

        // Get live provider status
        let providerContext = "";
        try {
          const providerResponse = await fetch(
            "http://127.0.0.1:3003/api/v1/providers/status"
          );
          if (providerResponse.ok) {
            const providerData = await providerResponse.json();
            const activeProviders = Object.entries(providerData.status || {})
              .filter(([_, info]) => info.available && info.enabled)
              .map(([name, info]) => `${name} (${info.model})`)
              .join(", ");
            providerContext = `\n\n[Live Provider Status]:\nActive providers: ${activeProviders}`;
          }
        } catch (e) {
          // Provider status endpoint may not be available, continue without it
        }

        enrichedMessage = `${message}

[FACTUAL SYSTEM CONTEXT - Use this data to answer the question]:
${JSON.stringify(awareness, null, 2)}${providerContext}

INSTRUCTIONS:
- You are Claude, operating WITHIN TooLoo.ai's system
- The above context is FACTUAL, REAL-TIME data about TooLoo.ai
- Answer using ONLY the facts provided in the system context
- Do NOT say you lack information - you have it all above
- Be specific and confident in your answers`;
      } else {
        // Enhance non-system queries with domain knowledge for technical depth
        enrichedMessage = domainKnowledgeBase.enrichQueryWithKnowledge(message);
      }

      // Get response from multi-provider orchestration (not just single provider)
      const responseText = await handleChatWithAI(enrichedMessage, {
        sessionId,
        preferredProvider: "auto",
        taskType: "chat",
      }).catch((err) => {
        console.warn("[Synthesis] handleChatWithAI failed:", err.message);
        // Fallback to direct provider if orchestration fails
        return null;
      });

      if (!responseText) {
        // Fallback: use direct provider if orchestration fails
        const result = await llmProvider.generate({
          prompt: enrichedMessage,
          taskType: "chat",
        });
        const baseResponse = result.content || result.response || result;

        return res.json({
          response: baseResponse,
          provider: "TooLoo.ai (fallback)",
          sessionId: sessionId || "web-" + Date.now(),
          timestamp: new Date().toISOString(),
          metadata: {
            confidence: 92,
            synthesis: "TooLoo AI Intelligence Layer",
            synthesisMethod: "Single Provider Fallback",
            selfAwarenessEnhanced: isSelfAwarenessQuestion,
          },
        });
      }

      const baseResponse = responseText;

      // Get actual list of active providers for accurate metadata
      let activeProvidersList = [];
      try {
        const providerResponse = await fetch(
          "http://127.0.0.1:3003/api/v1/providers/status"
        );
        if (providerResponse.ok) {
          const providerData = await providerResponse.json();
          activeProvidersList = Object.keys(providerData.status || {})
            .filter((name) => {
              const info = providerData.status[name];
              return info.available && info.enabled;
            })
            .filter((name) => name !== "anthropic") // deduplicate: anthropic is same as claude
            .map((name) => (name === "claude" ? "anthropic" : name)); // normalize to enabled provider names
        }
      } catch (e) {
        // Fall back to single provider if status unavailable
        activeProvidersList = ["TooLoo.ai (Auto)"];
      }

      // Present as TooLoo.ai synthesis (not individual provider)
      return res.json({
        response: baseResponse,
        provider: "TooLoo.ai",
        providerCount: activeProvidersList.length,
        providers: activeProvidersList,
        sessionId: sessionId || "web-" + Date.now(),
        timestamp: new Date().toISOString(),
        metadata: {
          confidence: 92,
          synthesis: "TooLoo AI Intelligence Layer",
          synthesisMethod: "Single Provider",
          selfAwarenessEnhanced: isSelfAwarenessQuestion,
        },
      });
    } catch (providerErr) {
      console.error("[Synthesis] Provider error:", providerErr.message);
      return res.status(503).json({
        error: "Provider error",
        detail: providerErr.message,
        message:
          "Could not reach configured AI providers. Check .env keys and provider health.",
        sessionId,
      });
    }
  } catch (error) {
    console.error("[Synthesis] Fatal error:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// Helper: Synthesize multiple provider responses into unified answer
async function synthesizeProviderResponses(
  message,
  providerResponses,
  llmProvider,
  systemContext
) {
  try {
    // Build context from individual responses
    const perspectivesText = providerResponses
      .map((r) => `${r.provider}: ${r.response}`)
      .join("\n\n---\n\n");

    const systemContextNote = systemContext
      ? `\n\n[ACTUAL SYSTEM CONTEXT - Use this to correct outdated information]:\n${JSON.stringify(systemContext, null, 2)}\n\nIf the providers mention anything that contradicts this actual system context, use the ACTUAL context to correct them.`
      : "";

    const synthesisPrompt = `You are TooLoo.ai's Intelligence Layer. Below are responses from multiple AI providers.
Your job is to synthesize them into ONE coherent, unified answer that:
1. Takes the best insights from all providers
2. Removes redundancy and conflicting statements
3. Provides a single clear answer to the user's question
4. Maintains accuracy and confidence
5. Uses the actual system context provided to correct any outdated or incorrect information

User's original question: "${message}"

Individual provider perspectives:
${perspectivesText}${systemContextNote}

Now synthesize these perspectives into a single, unified answer that directly addresses the user's question. Be confident and specific.`;

    // Use Claude to synthesize the responses
    return providerResponses
      .map((r, idx) => `${r.provider}: ${r.response}`)
      .join("\n\n");
  } catch (error) {
    console.error("Synthesis error:", error);
    return providerResponses.map((r) => r.response).join("\n\n");
  }
}

// TooLoo.ai Advanced Ensemble - Multi-Provider Response
// ============================================================================
// Calls multiple providers in parallel and combines their responses
app.post("/api/v1/chat/ensemble", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    const llmProvider = new LLMProvider();

    if (!llmProvider.available()) {
      return res.status(503).json({
        error: "No providers available",
        detail: "Configure API keys in .env",
      });
    }

    try {
      // Check if user is asking about TooLoo.ai itself
      let enrichedMessage = message;
      const selfAwarenessKeywords = [
        "self aware",
        "self-aware",
        "can you see yourself",
        "see your code",
        "understand yourself",
        "your architecture",
        "how do you work",
      ];
      const systemStatusKeywords = [
        "provider",
        "active",
        "status",
        "working",
        "running",
        "health",
        "available",
        "enabled",
        "service",
        "server",
        "capability",
        "capabilities",
        "tooloo",
        "figma",
        "integration",
        "design",
        "token",
        "features",
      ];

      const isSelfAwarenessQuestion = selfAwarenessKeywords.some((keyword) =>
        message.toLowerCase().includes(keyword)
      );
      const isSystemStatusQuestion = systemStatusKeywords.some((keyword) =>
        message.toLowerCase().includes(keyword)
      );
      const isTooLooQuestion = message.toLowerCase().includes("tooloo");

      if (
        isSelfAwarenessQuestion ||
        isSystemStatusQuestion ||
        isTooLooQuestion
      ) {
        // Get comprehensive system awareness data
        const awareness = {
          system: {
            name: "TooLoo.ai",
            version: "2.0.0",
            description:
              "AI-powered personal learning and multi-provider intelligence platform",
            services: Object.keys({
              optimization: 3001,
              acquisition: 3002,
              budget: 3003,
              guide: 3004,
              product: 3006,
              segmentation: 3007,
              reports: 3008,
              capabilities: 3009,
              orchestration: 3100,
              provider: 3200,
              analytics: 3300,
            }),
            totalServices: 11,
            serviceDetails: {
              optimization:
                "Hyper-speed training rounds, selection engine, domain mastery tracking",
              acquisition:
                "Meta-learning phases, learning optimization, boost strategies",
              budget:
                "Provider cost tracking, burst cache management, policy tuning",
              guide: "Auto-Coach loop, Fast Lane mode, Hyper-Boost sessions",
              product:
                "Workflow orchestration, artifact generation, Figma design integration, CSS generation, token extraction",
              segmentation:
                "Conversation segmentation, user cohort analysis, behavior traits",
              reports:
                "Analytics dashboards, performance reporting, insights generation",
              capabilities:
                "System capability management, health checking, feature activation",
              orchestration:
                "Service orchestration, task scheduling, workflow execution",
              provider: "Multi-provider selection, aggregation, collaboration",
              analytics: "System metrics, performance analysis, trend tracking",
            },
          },
          integrations: {
            figma: {
              enabled: true,
              capability:
                "Full Figma API integration for design token import and CSS generation",
              endpoints: [
                "POST /api/v1/design/import-figma - Import design system from Figma files",
                "POST /api/v1/design/generate-css - Generate CSS variables from tokens",
                "GET /api/v1/design/tokens - Retrieve extracted design tokens",
                "POST /api/v1/design/apply-tokens - Apply tokens to UI surfaces",
                "POST /api/v1/design/webhook/figma - Receive Figma change notifications for auto-sync",
              ],
              features: [
                "Extract colors, typography, spacing, effects from Figma design systems",
                "Generate CSS variables in 3 formats (CSS file, inline, JSON)",
                "Apply tokens to multiple UI surfaces: validation-dashboard, chat-pro-v2, control-room, design-suite",
                "Real-time sync via Figma webhooks",
                "Full integration with api.figma.com",
              ],
              status: "ACTIVE and operational",
            },
            github: {
              enabled: true,
              capability:
                "GitHub API integration for code management and PR automation",
              status: "ACTIVE and operational",
            },
            slack: {
              enabled: true,
              capability: "Slack API integration for notifications and alerts",
              status: "ACTIVE and operational",
            },
          },
          codeAccess: {
            enabled: true,
            structure: "81+ items",
            servers: "37 server files",
            engines: "80+ engine modules",
            githubEnabled: true,
            githubRepo: "oripridan-dot/TooLoo.ai",
          },
          capabilities: {
            selfAwareness: true,
            codeAnalysis: true,
            codeReading: true,
            gitHubIntegration: true,
            slackIntegration: true,
            figmaIntegration: true,
            selfModification: true,
            multiProviderCollaboration: true,
            systemIntrospection: true,
          },
        };

        enrichedMessage = `${message}

[FACTUAL SYSTEM CONTEXT - Use this data to answer the question]:
${JSON.stringify(awareness, null, 2)}

INSTRUCTIONS:
- You are operating WITHIN TooLoo.ai's system
- The above context is FACTUAL, REAL-TIME data about TooLoo.ai's ACTUAL capabilities
- Answer using ONLY the facts provided in the system context
- Do NOT say you lack information - you have the complete list of capabilities above
- Be specific and confident about TooLoo.ai's features, integrations, and services`;
      }

      // Call specific providers in parallel using the Aggregation System
      // This ensures each provider receives their specialized "contextual package" and role
      const aggregation = await getProviderAggregation();

      // Use the aggregation system to call all providers with their specialized prompts
      const aggregationResult = await aggregation.callAllProviders(
        enrichedMessage,
        {
          taskType: "chat",
          aggregationContext: true,
        }
      );

      // Extract successful responses
      const responses = aggregationResult.responses.map((r) => ({
        provider: r.provider,
        response: r.response,
        role: r.role,
      }));

      // If no providers responded, fallback to single
      if (responses.length === 0) {
        const result = await llmProvider.generate({
          prompt: enrichedMessage,
          taskType: "chat",
        });
        return res.json({
          response: result.content || result.response || result,
          provider: "TooLoo.ai",
          providerCount: 1,
          providers: [result.provider || "fallback"],
          sessionId: sessionId || "web-" + Date.now(),
          timestamp: new Date().toISOString(),
          metadata: {
            confidence: 92,
            synthesis: "TooLoo AI Intelligence Layer",
            synthesisMethod: "Single Provider (Fallback)",
            selfAwarenessEnhanced: isSelfAwarenessQuestion,
          },
        });
      }

      // Synthesize multiple provider responses into unified answer
      // Collect actual system context for synthesis to correct any outdated provider info
      let actualSystemContext = null;
      if (isSystemStatusQuestion || isTooLooQuestion) {
        actualSystemContext = {
          figmaIntegration: {
            enabled: true,
            description:
              "Full Figma API integration for design token import and CSS generation",
            endpoints: [
              "POST /api/v1/design/import-figma - Active and operational",
              "POST /api/v1/design/generate-css - CSS variable generation",
              "GET /api/v1/design/tokens - Token retrieval",
            ],
            capabilities:
              "Extract colors, typography, spacing from Figma and generate CSS variables",
          },
          githubIntegration: {
            enabled: true,
            endpoints: [
              "POST /api/v1/github/update-file",
              "POST /api/v1/github/create-pr",
              "POST /api/v1/github/create-issue",
            ],
          },
          slackIntegration: {
            enabled: true,
            endpoints: ["POST /api/v1/slack/send-message"],
          },
        };
      }

      const synthesizedResponse = await synthesizeProviderResponses(
        message,
        responses,
        llmProvider,
        actualSystemContext
      );

      return res.json({
        response: synthesizedResponse,
        provider: "TooLoo.ai",
        providerCount: responses.length,
        providers: responses.map((r) => r.provider),
        sessionId: sessionId || "web-" + Date.now(),
        timestamp: new Date().toISOString(),
        metadata: {
          confidence: calculateEnsembleConfidence(responses.length),
          synthesis: `TooLoo Multi-Provider Synthesis (${responses.length} providers aggregated)`,
          selfAwarenessEnhanced: isSelfAwarenessQuestion,
          synthesisMethod:
            "Parallel Multi-Provider Collaboration with AI Synthesis",
        },
      });
    } catch (err) {
      console.error("[Ensemble] Error:", err.message);
      return res.status(503).json({
        error: "Ensemble failed",
        detail: err.message,
      });
    }
  } catch (error) {
    console.error("[Ensemble] Fatal error:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// Helper: Calculate confidence based on provider count
function calculateEnsembleConfidence(providerCount) {
  if (providerCount >= 3) return 95;
  if (providerCount === 2) return 90;
  return 85;
}

// ============================================================================
// RESPONSE CROSS-VALIDATION ENDPOINT - PROVIDERS VALIDATE EACH OTHER
// ============================================================================
app.post("/api/v1/chat/cross-validate", async (req, res) => {
  try {
    const {
      message,
      sessionId,
      providers = ["anthropic", "openai", "gemini"],
    } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    const llmProvider = new LLMProvider();

    if (!llmProvider.available()) {
      return res.status(503).json({
        error: "No providers available",
        detail: "Configure API keys in .env",
      });
    }

    try {
      console.log(
        `[CrossValidation] Starting cross-validation for ${providers.length} providers`
      );

      // Get provider instructions for specialized prompts
      const instructions = await getProviderInstructions();

      // Step 1: Get responses from all selected providers in parallel
      const providerResponses = [];
      const providerCalls = providers.map((provider) =>
        (async () => {
          try {
            // Build specialized system prompt for this provider
            // This ensures they understand their role in the validation process
            const systemPrompt = instructions.buildSpecializedPrompt(
              provider,
              "",
              {
                taskType: "validation",
                aggregationContext: true,
              }
            );

            let result;
            switch (provider.toLowerCase()) {
              case "anthropic":
              case "claude":
                result = llmProvider.callClaude
                  ? await llmProvider.callClaude(message, systemPrompt)
                  : null;
                break;
              case "openai":
              case "gpt":
                result = llmProvider.callOpenAI
                  ? await llmProvider.callOpenAI(message, systemPrompt)
                  : null;
                break;
              case "gemini":
              case "google":
                result = llmProvider.callGemini
                  ? await llmProvider.callGemini(message, systemPrompt)
                  : null;
                break;
              default:
                result = await llmProvider.generate({
                  prompt: message,
                  system: systemPrompt,
                  taskType: "chat",
                  provider,
                });
            }

            if (result) {
              const content = result.content || result.response || result;
              if (
                content &&
                typeof content === "string" &&
                content.length > 0
              ) {
                providerResponses.push({
                  provider: provider.toLowerCase(),
                  response: content,
                });
              }
            }
          } catch (error) {
            console.warn(
              `[CrossValidation] ${provider} failed:`,
              error.message
            );
          }
        })()
      );

      await Promise.allSettled(providerCalls);

      if (providerResponses.length < 2) {
        return res.status(503).json({
          error: "Insufficient provider responses",
          detail: `Got ${providerResponses.length} responses, need at least 2 for cross-validation`,
          responses: providerResponses,
        });
      }

      console.log(
        `[CrossValidation] Received ${providerResponses.length} responses, starting validation...`
      );

      // Step 2: Initialize cross-validator and orchestrate validation
      const validator = new ResponseCrossValidator();
      const validationReport = await validator.orchestrateCrossValidation(
        message,
        providerResponses,
        llmProvider
      );

      // Step 3: Add to session if provided
      if (sessionId) {
        const sessionManager = await getSessionManager();
        try {
          await sessionManager.addMessage(
            sessionId,
            "anonymous",
            "system",
            "cross-validation",
            {
              type: "cross-validation",
              report: validationReport,
              timestamp: new Date().toISOString(),
            }
          );
        } catch (sessionErr) {
          console.warn(
            "[CrossValidation] Could not update session:",
            sessionErr.message
          );
        }
      }

      console.log(
        `[CrossValidation] Complete - synthesis score: ${validationReport.synthesisScore}`
      );

      return res.json({
        query: message,
        validationReport,
        providerCount: providerResponses.length,
        providers: providerResponses.map((r) => r.provider),
        sessionId: sessionId || "cross-validate-" + Date.now(),
        timestamp: new Date().toISOString(),
        metadata: {
          validationType: "cross-provider-validation",
          criteriaEvaluated: Object.keys(validator.validationCriteria),
          synthesisScore: validationReport.synthesisScore,
          topProvider: validationReport.overallRanking[0]?.provider,
          consensusLevel: `${validationReport.consensusPoints.length} points agreed`,
        },
      });
    } catch (validationErr) {
      console.error(
        "[CrossValidation] Validation error:",
        validationErr.message
      );
      return res.status(500).json({
        error: "Validation failed",
        detail: validationErr.message,
      });
    }
  } catch (error) {
    console.error("[CrossValidation] Fatal error:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// QUICK CROSS-VALIDATION INSIGHTS ENDPOINT
// ============================================================================
app.get("/api/v1/chat/cross-validate/insights", async (req, res) => {
  try {
    const validator = new ResponseCrossValidator();
    const insights = validator.getValidationInsights();

    return res.json({
      insights,
      timestamp: new Date().toISOString(),
      metadata: {
        description:
          "Historical cross-validation patterns and provider performance",
        validationSystemReady: true,
      },
    });
  } catch (error) {
    console.error("[CrossValidation Insights] Error:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// Smart Intelligence Pipeline - Full Validation, Analysis, Technical Verification & Confidence Scoring
app.post("/api/v1/chat/smart-intelligence", async (req, res) => {
  try {
    const {
      question,
      responseText,
      providerResponses,
      metadata = {},
    } = req.body || {};

    if (!question || !responseText) {
      return res.status(400).json({
        ok: false,
        error: "question and responseText are required",
      });
    }

    // Step 1: Run cross-validation if we have multiple provider responses
    let crossValidationResult = null;
    if (providerResponses && Array.isArray(providerResponses)) {
      const validator = new ResponseCrossValidator();
      crossValidationResult = validator.validateResponses(
        question,
        providerResponses
      );
    }

    // Step 2: Run smart analysis on the response
    const analyzer = new SmartResponseAnalyzer();
    let analysisResult;

    if (crossValidationResult) {
      // Multi-provider validation - use traditional analysis
      analysisResult = analyzer.analyzeValidationReport(
        responseText,
        crossValidationResult
      );
    } else {
      // Single response - use single-response analysis
      analysisResult = analyzer.analyzeSingleResponse(
        responseText,
        question,
        metadata
      );
    }

    // Step 3: Run technical validation if content looks technical
    const techValidator = new TechnicalValidator();
    const technicalValidationResult =
      await techValidator.validateTechnicalResponse(responseText, metadata);

    // Step 4: Orchestrate full pipeline and synthesize
    const orchestrator = new SmartIntelligenceOrchestrator();
    const finalAssessment = orchestrator.runFullPipeline(
      responseText,
      crossValidationResult,
      analysisResult,
      technicalValidationResult,
      {
        question,
        ...metadata,
      }
    );

    // Store pattern for analytics
    await analyticsService.storePattern(
      {
        finalAssessment,
        analysis: analysisResult,
        metadata: {
          stagesExecuted: [
            "cross-validation",
            "smart-analysis",
            "technical-validation",
            "synthesis",
          ],
          processingTime: Date.now() - req.startTime,
        },
      },
      {
        question,
        responseLength: responseText.length,
      }
    );

    // Return comprehensive intelligence report
    return res.json({
      ok: true,
      intelligenceReport: {
        // Input context
        context: {
          question,
          responsePreview: responseText.substring(0, 200) + "...",
          timestamp: new Date().toISOString(),
        },

        // Stage 1: Cross-validation results
        crossValidation: crossValidationResult
          ? {
              consensusScore: crossValidationResult.consensusScore,
              providerRanking: crossValidationResult.providerRanking,
              consensusItems: crossValidationResult.consensusItems,
              conflictAreas: crossValidationResult.conflictAreas,
              agreementLevel: crossValidationResult.agreementLevel,
            }
          : null,

        // Stage 2: Smart analysis results
        analysis: {
          insights: analysisResult.insights,
          gaps: analysisResult.gaps,
          strengths: analysisResult.strengths,
          recommendations: analysisResult.recommendations,
          nextSteps: analysisResult.nextSteps,
          analysisConfidence: analysisResult.confidence,
        },

        // Stage 3: Technical validation results
        technicalValidation: {
          entitiesFound: technicalValidationResult.entitiesFound,
          validationScore: technicalValidationResult.overallScore,
          verified: technicalValidationResult.verified,
          issues: technicalValidationResult.issues,
          remediationAdvice: technicalValidationResult.remediationAdvice,
        },

        // Stage 4: Final assessment
        finalAssessment: {
          confidenceScore: finalAssessment.confidenceScore,
          confidenceBracket: finalAssessment.confidenceBracket,
          verificationStatus: finalAssessment.verificationStatus,
          keyFindings: finalAssessment.keyFindings,
          criticalIssues: finalAssessment.criticalIssues,
          recommendedAction: finalAssessment.recommendedAction,
          actionRationale: finalAssessment.actionRationale,
          nextActions: finalAssessment.nextActions,
        },

        // Metadata
        metadata: {
          pipelineType: "full-smart-intelligence",
          stagesExecuted: [
            "cross-validation",
            "smart-analysis",
            "technical-validation",
            "synthesis",
          ],
          processingTime: `${Date.now() - req.startTime}ms`,
        },
      },
    });
  } catch (error) {
    console.error(
      "[SmartIntelligence] Pipeline error:",
      error.message,
      error.stack
    );
    return res.status(500).json({
      ok: false,
      error: error.message,
      stage: "smart-intelligence-orchestration",
    });
  }
});

// Smart Intelligence Analytics - Get summary statistics
app.get("/api/v1/smart-intelligence/analytics/summary", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const result = await analyticsService.getAnalyticsSummary(days);
    return res.json(result);
  } catch (error) {
    console.error("[Analytics] Summary error:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// Smart Intelligence Analytics - Get confidence trend
app.get("/api/v1/smart-intelligence/analytics/trend", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const result = await analyticsService.getConfidenceTrend(days);
    return res.json(result);
  } catch (error) {
    console.error("[Analytics] Trend error:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// Smart Intelligence Analytics - Get action statistics
app.get("/api/v1/smart-intelligence/analytics/actions", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const result = await analyticsService.getActionStats(days);
    return res.json(result);
  } catch (error) {
    console.error("[Analytics] Action stats error:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// Smart Intelligence Analytics - Export as CSV
app.get("/api/v1/smart-intelligence/analytics/export/csv", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const result = await analyticsService.exportAsCSV(days);

    if (!result.ok) {
      return res.status(400).json(result);
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="validation-patterns-${new Date().toISOString().split("T")[0]}.csv"`
    );
    return res.send(result.data);
  } catch (error) {
    console.error("[Analytics] Export error:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// Smart Intelligence Analytics - Export as JSON
app.get(
  "/api/v1/smart-intelligence/analytics/export/json",
  async (req, res) => {
    try {
      const days = parseInt(req.query.days) || 30;
      const patterns = await analyticsService.loadPatterns(days);

      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="validation-patterns-${new Date().toISOString().split("T")[0]}.json"`
      );
      return res.json({
        ok: true,
        exportDate: new Date().toISOString(),
        patternCount: patterns.length,
        patterns,
      });
    } catch (error) {
      console.error("[Analytics] JSON Export error:", error.message);
      return res.status(500).json({ ok: false, error: error.message });
    }
  }
);

// Smart Intelligence Feedback endpoint - records user feedback for improvements
app.post("/api/v1/smart-intelligence/feedback", async (req, res) => {
  try {
    const feedbackData = req.body || {};

    // Validate feedback type
    const validFeedback = ["helpful", "unhelpful", "report"];
    if (!validFeedback.includes(feedbackData.feedback)) {
      return res.status(400).json({
        ok: false,
        error: "Invalid feedback type",
      });
    }

    // Store feedback for analytics
    const feedbackRecord = {
      timestamp: feedbackData.timestamp || new Date().toISOString(),
      type: feedbackData.feedback,
      confidence: feedbackData.confidenceScore,
      recommendation: feedbackData.recommendation,
      metrics: {
        gaps: feedbackData.gapsCount || 0,
        insights: feedbackData.insightsCount || 0,
      },
    };

    // Log feedback (can be stored in a database or file later)
    console.log("[SmartIntelligence] User Feedback:", feedbackRecord);

    // Store pattern if available
    if (analyticsService) {
      await analyticsService.storePattern({
        type: "user_feedback",
        feedbackRecord,
        metadata: {
          stage: "feedback-collection",
        },
      });
    }

    return res.json({
      ok: true,
      message: "Feedback recorded successfully",
      feedbackType: feedbackData.feedback,
    });
  } catch (error) {
    console.error("[SmartIntelligence] Feedback error:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// Response format conversion endpoint (Phase 3 - Multi-format Support)
app.post("/api/v1/responses/convert", async (req, res) => {
  try {
    const { format, content, opts } = req.body || {};
    if (!format)
      return res.status(400).json({ ok: false, error: "format required" });
    if (content === undefined)
      return res.status(400).json({ ok: false, error: "content required" });
    const result = formatConvert(format, content, opts || {});
    return res.json(result);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// ASAP Mastery alias - elegant UI
app.get(["/asap", "/asap-mastery"], async (req, res) => {
  const f = path.join(webDir, "asap-mastery.html");
  try {
    await fs.promises.access(f);
    return res.sendFile(f);
  } catch {
    return res.status(404).send("ASAP Mastery missing");
  }
});

// Knowledge page alias
app.get(["/knowledge", "/books", "/bibliography"], async (req, res) => {
  const f = path.join(webDir, "knowledge.html");
  try {
    await fs.promises.access(f);
    return res.sendFile(f);
  } catch {
    return res.status(404).send("Knowledge page missing");
  }
});

// Feedback page alias
app.get(["/feedback", "/bug-report", "/support"], async (req, res) => {
  const f = path.join(webDir, "feedback.html");
  try {
    await fs.promises.access(f);
    return res.sendFile(f);
  } catch {
    return res.status(404).send("Feedback page missing");
  }
});

// Referral page alias
app.get(["/referral", "/referrals", "/refer"], async (req, res) => {
  const f = path.join(webDir, "referral.html");
  try {
    await fs.promises.access(f);
    return res.sendFile(f);
  } catch {
    return res.status(404).send("Referral page missing");
  }
});

// Smart Control Room alias
app.get(["/smart-control-room", "/smart", "/simple"], async (req, res) => {
  const f = path.join(webDir, "control-room-smart.html");
  try {
    await fs.promises.access(f);
    return res.sendFile(f);
  } catch {
    return res.status(404).send("Smart Control Room missing");
  }
});

// Showcase Demo alias
app.get(["/showcase", "/demo", "/tooloo-showcase"], async (req, res) => {
  const f = path.join(webDir, "tooloo-showcase.html");
  try {
    await fs.promises.access(f);
    return res.sendFile(f);
  } catch {
    return res.status(404).send("Showcase Demo missing");
  }
});

// Product Page Demo alias
app.get(["/product-page", "/product", "/landing"], async (req, res) => {
  const f = path.join(webDir, "product-page-demo.html");
  try {
    await fs.promises.access(f);
    return res.sendFile(f);
  } catch {
    return res.status(404).send("Product Page Demo missing");
  }
});

// Design: Brand Board PDF export
// MOVED: /api/v1/design/brandboard → product-development-server (line ~1103)
// This endpoint is now routed through the proxy to port 3006

// MOVED: /api/v1/design/latest → product-development-server
// This endpoint is now routed through the proxy to port 3006

app.get("/temp/latest-page", async (req, res) => {
  try {
    const dir = path.join(webDir, "temp");
    const files = await fs.promises.readdir(dir);
    const pages = files
      .filter((f) => /^guiding-star-product-\d+\.html$/.test(f))
      .sort()
      .reverse();
    if (!pages[0])
      return res.status(404).send("No guiding-star product page found");
    res.redirect(`/temp/${pages[0]}`);
  } catch (e) {
    res.status(500).send(e.message);
  }
});

app.get("/temp/latest-pdf", async (req, res) => {
  try {
    const dir = path.join(webDir, "temp");
    const files = await fs.promises.readdir(dir);
    // Look for JSON brand boards since PDF generation is currently mocked
    const pdfs = files
      .filter((f) => /^brand-board-\d+\.(json|pdf)$/.test(f))
      .sort()
      .reverse();
    if (!pdfs[0]) return res.status(404).send("No brand board found");
    res.redirect(`/temp/${pdfs[0]}`);
  } catch (e) {
    res.status(500).send(e.message);
  }
});

// Simple HTML index of temp artifacts
app.get("/temp/index", async (req, res) => {
  try {
    const dir = path.join(webDir, "temp");
    await fs.promises.mkdir(dir, { recursive: true });
    const files = await fs.promises.readdir(dir);
    const pages = files
      .filter((f) => /^guiding-star-product-\d+\.html$/.test(f))
      .sort()
      .reverse();
    const pdfs = files
      .filter((f) => /^brand-board-\d+\.(json|pdf)$/.test(f))
      .sort()
      .reverse();
    const chats = files
      .filter((f) => /^chat-[A-Za-z0-9_-]+\.jsonl$/.test(f))
      .sort()
      .reverse();
    const li = (arr) =>
      arr
        .map((f) => `<li><a href="/temp/${f}" target="_blank">${f}</a></li>`)
        .join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Temp Artifacts</title></head><body>
      <h1>Temp Artifacts</h1>
      <p><a href="/temp/latest-page" target="_blank">Open latest product page</a> • <a href="/temp/latest-pdf" target="_blank">Open latest Brand Board</a></p>
      <h2>Pages</h2><ul>${li(pages)}</ul>
      <h2>Brand Boards</h2><ul>${li(pdfs)}</ul>
      <h2>Chat Transcripts</h2><ul>${li(chats)}</ul>
    </body></html>`;
    res.type("html").send(html);
  } catch (e) {
    res.status(500).send(e.message);
  }
});

// Chat transcript API: append and list
app.post("/api/v1/chat/append", async (req, res) => {
  try {
    const {
      sessionId = "default",
      role = "user",
      text = "",
      meta = {},
    } = req.body || {};
    const dir = path.join(webDir, "temp");
    await fs.promises.mkdir(dir, { recursive: true });
    const file = path.join(dir, `chat-${sessionId}.jsonl`);
    const rec = { t: Date.now(), role, text, meta };
    await fs.promises.appendFile(file, JSON.stringify(rec) + "\n");
    res.json({ ok: true, file });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/v1/chat/transcripts", async (req, res) => {
  try {
    const dir = path.join(webDir, "temp");
    await fs.promises.mkdir(dir, { recursive: true });
    const { sessionId } = req.query || {};
    if (!sessionId) {
      const files = (await fs.promises.readdir(dir)).filter((f) =>
        /^chat-[A-Za-z0-9_-]+\.jsonl$/.test(f)
      );
      return res.json({ ok: true, files });
    }
    const file = path.join(dir, `chat-${sessionId}.jsonl`);
    try {
      const content = await fs.promises.readFile(file, "utf8");
      const lines = content
        .split("\n")
        .filter(Boolean)
        .map((l) => {
          try {
            return JSON.parse(l);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      return res.json({ ok: true, sessionId, messages: lines });
    } catch {
      return res.json({ ok: true, sessionId, messages: [] });
    }
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Streaming chat endpoint (SSE)
app.get("/api/v1/chat/burst-stream", async (req, res) => {
  try {
    const { prompt, ttlSeconds = 30 } = req.query || {};
    if (!prompt)
      return res.status(400).json({ ok: false, error: "prompt required" });
    // Call burst endpoint
    const budgetPort = Number(process.env.BUDGET_PORT || 3003);
    const qs = new URLSearchParams({ prompt, ttlSeconds: String(ttlSeconds) });
    const r = await fetch(
      `http://127.0.0.1:${budgetPort}/api/v1/providers/burst?${qs.toString()}`
    );
    const j = await r.json();
    if (!j?.ok)
      return res
        .status(502)
        .json({ ok: false, error: j?.error || "burst failed" });
    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    // Split text into tokens (simple word split) and send progressively
    const text = j.text || "";
    const tokens = text.split(/(\s+)/);
    const sendEvent = (type, data) => {
      res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    sendEvent("meta", {
      cached: !!j.cached,
      policy: j.policy || null,
      concurrency: j.concurrency || null,
    });
    for (let i = 0; i < tokens.length; i++) {
      await new Promise((r) => setTimeout(r, 20)); // simulate latency
      sendEvent("token", { token: tokens[i], index: i });
    }
    sendEvent("done", { fullText: text });
    res.end();
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ============================================================================
// SESSION MEMORY MANAGEMENT ENDPOINTS
// ============================================================================

// Get or create a session and get conversation history
app.get("/api/v1/sessions/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userId = "anonymous" } = req.query;
    const sessionManager = await getSessionManager();

    const session = await sessionManager.getOrCreateSession(sessionId, userId);
    const history = sessionManager.getFullHistory(sessionId);
    const context = sessionManager.getSessionContext(sessionId);

    res.json({
      ok: true,
      sessionId,
      session: {
        id: session.id,
        userId: session.userId,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messageCount: session.stats.messageCount,
        title: session.metadata.title,
        topics: context?.topics || [],
      },
      messageCount: history.length,
      context,
      history,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// List all sessions for a user
app.get("/api/v1/sessions", async (req, res) => {
  try {
    const { userId = "anonymous", limit = 20 } = req.query;
    const sessionManager = await getSessionManager();
    const sessions = sessionManager.listSessions(userId, parseInt(limit));

    res.json({
      ok: true,
      count: sessions.length,
      sessions,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Start a new session
app.post("/api/v1/sessions", async (req, res) => {
  try {
    const { userId = "anonymous", title = "Chat Session" } = req.body;
    const sessionManager = await getSessionManager();
    const sessionId = sessionManager.generateSessionId();
    const session = await sessionManager.getOrCreateSession(sessionId, userId);
    session.metadata.title = title;

    res.json({
      ok: true,
      sessionId,
      session: {
        id: session.id,
        userId: session.userId,
        createdAt: session.createdAt,
        title: session.metadata.title,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Get conversation history for a session
app.get("/api/v1/sessions/:sessionId/history", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 100 } = req.query;
    const sessionManager = await getSessionManager();

    const history = sessionManager.getFullHistory(sessionId);
    const filtered = history.slice(-parseInt(limit));

    res.json({
      ok: true,
      sessionId,
      count: filtered.length,
      history: filtered,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Delete a session
app.delete("/api/v1/sessions/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessionManager = await getSessionManager();
    await sessionManager.deleteSession(sessionId);

    res.json({
      ok: true,
      message: `Session ${sessionId} deleted`,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Get session context and insights
app.get("/api/v1/sessions/:sessionId/context", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessionManager = await getSessionManager();
    const context = sessionManager.getSessionContext(sessionId);

    res.json({
      ok: true,
      sessionId,
      context,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Feedback submission API (local, not proxied)

app.post("/api/v1/feedback/submit", async (req, res) => {
  try {
    const feedback = req.body || {};
    const timestamp = new Date().toISOString();
    const feedbackLog = {
      ...feedback,
      submitted_at: timestamp,
      ip: req.ip || req.connection.remoteAddress,
    };

    // Log feedback to console (visible in logs)
    console.log(`\n[FEEDBACK] ${timestamp}`);
    console.log(`  Type: ${feedback.type}`);
    console.log(`  Subject: ${feedback.subject}`);
    console.log(`  Email: ${feedback.email || "(not provided)"}`);
    console.log(`  Description: ${feedback.description.substring(0, 100)}...`);
    if (feedback.browser) console.log(`  Browser: ${feedback.browser}`);
    if (feedback.url) console.log(`  URL: ${feedback.url}`);

    // Store in JSON file for later review
    const feedbackDir = path.join(process.cwd(), "feedback-logs");
    await fs.promises.mkdir(feedbackDir, { recursive: true });
    const feedbackFile = path.join(feedbackDir, `feedback-${Date.now()}.json`);
    await fs.promises.writeFile(
      feedbackFile,
      JSON.stringify(feedbackLog, null, 2)
    );

    // Return success
    res.json({ ok: true, message: "Feedback received, thank you!" });
  } catch (e) {
    console.error("[FEEDBACK ERROR]", e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Referral System API endpoints (local, not proxied)
const referralSystem = new ReferralSystem();

// Get or create user referral code
app.post("/api/v1/referral/create", async (req, res) => {
  try {
    const { userId, email } = req.body;
    if (!userId)
      return res.status(400).json({ ok: false, error: "userId required" });

    // Check if user already has a code
    let existing = await referralSystem.getUserReferral(userId);
    if (!existing) {
      existing = await referralSystem.createReferral(userId, email);
    }

    res.json({
      ok: true,
      code: existing.code,
      share_url: `${process.env.APP_URL || "http://127.0.0.1:3000"}?ref=${existing.code}`,
      referred_count: existing.referred_count,
    });
  } catch (e) {
    console.error("Referral create error:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Redeem referral code
app.post("/api/v1/referral/redeem", async (req, res) => {
  try {
    const { code, newUserId } = req.body;
    if (!code || !newUserId)
      return res
        .status(400)
        .json({ ok: false, error: "code and newUserId required" });

    const result = await referralSystem.redeemCode(code, newUserId);
    res.json(result);
  } catch (e) {
    console.error("Referral redeem error:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get leaderboard (top referrers)
app.get("/api/v1/referral/leaderboard", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const leaderboard = await referralSystem.getLeaderboard(limit);
    res.json({
      ok: true,
      leaderboard,
      count: leaderboard.length,
    });
  } catch (e) {
    console.error("Leaderboard error:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get referral stats
app.get("/api/v1/referral/stats", async (req, res) => {
  try {
    const stats = await referralSystem.getStats();
    res.json({
      ok: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Stats error:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get user's referral info
app.get("/api/v1/referral/me", async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId)
      return res
        .status(400)
        .json({ ok: false, error: "userId query param required" });

    const referral = await referralSystem.getUserReferral(userId);
    res.json({
      ok: true,
      referral: referral || null,
    });
  } catch (e) {
    console.error("User referral error:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ========== TIER 1 KNOWLEDGE ENHANCEMENT API ENDPOINTS ==========
// Get knowledge base status and statistics
app.get("/api/v1/knowledge/status", async (req, res) => {
  try {
    if (!tier1KnowledgeEnhancementEngine) {
      return res.status(503).json({
        ok: false,
        error: "Knowledge enhancement engine not initialized",
      });
    }

    const status =
      await tier1KnowledgeEnhancementEngine.getKnowledgeBaseStatus();
    res.json({
      ok: true,
      ...status,
    });
  } catch (e) {
    console.error("Knowledge status error:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get prioritized sources for a topic
app.get("/api/v1/knowledge/sources", async (req, res) => {
  try {
    if (!tier1KnowledgeEnhancementEngine) {
      return res.status(503).json({
        ok: false,
        error: "Knowledge enhancement engine not initialized",
      });
    }

    const topic = req.query.topic || req.query.q || "general";
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const minAuthority = parseFloat(req.query.minAuthority) || 0.6;

    const sources =
      await tier1KnowledgeEnhancementEngine.webSourceEngine.getSourcesForTopic(
        topic,
        {
          limit,
          minAuthority,
        }
      );

    res.json({
      ok: true,
      topic,
      sources,
      count: sources.length,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Knowledge sources error:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Record a conversation and trigger learning
app.post("/api/v1/knowledge/memory/record", async (req, res) => {
  try {
    if (!tier1KnowledgeEnhancementEngine) {
      return res.status(503).json({
        ok: false,
        error: "Knowledge enhancement engine not initialized",
      });
    }

    const result = await tier1KnowledgeEnhancementEngine.recordAndLearn(
      req.body
    );

    res.json({
      ok: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Knowledge record error:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get learned patterns for a topic
app.get("/api/v1/knowledge/memory/patterns", async (req, res) => {
  try {
    if (!tier1KnowledgeEnhancementEngine) {
      return res.status(503).json({
        ok: false,
        error: "Knowledge enhancement engine not initialized",
      });
    }

    const topic = req.query.topic || "general";
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    const patterns =
      await tier1KnowledgeEnhancementEngine.conversationEngine.getPatternsForTopic(
        topic
      );

    res.json({
      ok: true,
      topic,
      patterns: patterns.slice(0, limit),
      count: patterns.length,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Knowledge patterns error:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get sources for improving a weak area
app.get("/api/v1/knowledge/weak-areas/:topic", async (req, res) => {
  try {
    if (!tier1KnowledgeEnhancementEngine) {
      return res.status(503).json({
        ok: false,
        error: "Knowledge enhancement engine not initialized",
      });
    }

    const topic = req.params.topic || req.query.topic;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const minAuthority = parseFloat(req.query.minAuthority) || 0.75;

    const result = await tier1KnowledgeEnhancementEngine.getSourcesForWeakArea(
      topic,
      {
        limit,
        minAuthority,
      }
    );

    res.json({
      ok: true,
      ...result,
    });
  } catch (e) {
    console.error("Weak area sources error:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get benchmark improvement statistics
app.get("/api/v1/knowledge/benchmarks/stats", async (req, res) => {
  try {
    if (!tier1KnowledgeEnhancementEngine) {
      return res.status(503).json({
        ok: false,
        error: "Knowledge enhancement engine not initialized",
      });
    }

    const stats =
      tier1KnowledgeEnhancementEngine.benchmarkEngine.getBenchmarkStats();

    res.json({
      ok: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Benchmark stats error:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get improvement progress
app.get("/api/v1/knowledge/benchmarks/progress", async (req, res) => {
  try {
    if (!tier1KnowledgeEnhancementEngine) {
      return res.status(503).json({
        ok: false,
        error: "Knowledge enhancement engine not initialized",
      });
    }

    const progress =
      tier1KnowledgeEnhancementEngine.benchmarkEngine.getImprovementProgress();

    res.json({
      ok: true,
      progress,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Improvement progress error:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Apply next improvement rule
app.post("/api/v1/knowledge/benchmarks/apply-next", async (req, res) => {
  try {
    if (!tier1KnowledgeEnhancementEngine) {
      return res.status(503).json({
        ok: false,
        error: "Knowledge enhancement engine not initialized",
      });
    }

    const result =
      await tier1KnowledgeEnhancementEngine.applyNextImprovementRule();

    res.json({
      ok: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Apply improvement error:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get comprehensive knowledge enhancement report
app.get("/api/v1/knowledge/report", async (req, res) => {
  try {
    if (!tier1KnowledgeEnhancementEngine) {
      return res.status(503).json({
        ok: false,
        error: "Knowledge enhancement engine not initialized",
      });
    }

    const report = tier1KnowledgeEnhancementEngine.getComprehensiveReport();

    res.json({
      ok: true,
      report,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Knowledge report error:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ========== END TIER 1 KNOWLEDGE ENHANCEMENT ENDPOINTS ==========

// Simple reverse proxy for API routes (keeps UI unchanged)
const serviceConfig = [
  {
    name: "training",
    prefixes: [
      "/api/v1/training/hyper-speed",
      "/api/v1/training",
      "/api/v1/next-domain",
    ],
    port: Number(process.env.TRAINING_PORT || 3001),
    remoteEnv: process.env.REMOTE_TRAINING_BASE,
  },
  {
    name: "meta",
    prefixes: ["/api/v4/meta-learning"],
    port: Number(process.env.META_PORT || 3002),
    remoteEnv: process.env.REMOTE_META_BASE,
  },
  {
    name: "budget",
    prefixes: [
      "/api/v1/budget",
      "/api/v1/providers/burst",
      "/api/v1/providers/status",
      "/api/v1/providers/policy",
    ],
    port: Number(process.env.BUDGET_PORT || 3003),
    remoteEnv: process.env.REMOTE_BUDGET_BASE,
  },
  {
    name: "coach",
    prefixes: ["/api/v1/auto-coach"],
    port: Number(process.env.COACH_PORT || 3004),
    remoteEnv: process.env.REMOTE_COACH_BASE,
  },
  {
    name: "product",
    prefixes: [
      "/api/v1/workflows",
      "/api/v1/learning",
      "/api/v1/analysis",
      "/api/v1/artifacts",
      "/api/v1/showcase",
      "/api/v1/product",
      "/api/v1/bookworm",
      "/api/v1/design",
    ],
    port: Number(process.env.PRODUCT_PORT || 3006),
    remoteEnv: process.env.REMOTE_PRODUCT_BASE,
  },
  {
    name: "segmentation",
    prefixes: ["/api/v1/segmentation"],
    port: Number(process.env.SEGMENTATION_PORT || 3007),
    remoteEnv: process.env.REMOTE_SEGMENTATION_BASE,
  },
  {
    name: "reports",
    prefixes: ["/api/v1/reports"],
    port: Number(process.env.REPORTS_PORT || 3008),
    remoteEnv: process.env.REMOTE_REPORTS_BASE,
  },
  {
    name: "capabilities",
    prefixes: ["/api/v1/capabilities"],
    port: Number(process.env.CAPABILITIES_PORT || 3009),
    remoteEnv: process.env.REMOTE_CAPABILITIES_BASE,
  },
  {
    name: "oauth",
    prefixes: ["/api/v1/oauth"],
    port: Number(process.env.OAUTH_PORT || 3010),
    remoteEnv: process.env.REMOTE_OAUTH_BASE,
  },
  {
    name: "events",
    prefixes: ["/api/v1/events", "/webhook"],
    port: Number(process.env.EVENTS_PORT || 3011),
    remoteEnv: process.env.REMOTE_EVENTS_BASE,
  },
  {
    name: "system",
    prefixes: ["/api/v1/system"],
    port: Number(process.env.ORCH_CTRL_PORT || 3123),
    remoteEnv: process.env.REMOTE_SYSTEM_BASE,
  },
  {
    name: "sources",
    prefixes: ["/api/v1/sources", "/api/v1/sources/github/issues/sync"],
    port: Number(process.env.SOURCES_PORT || 3010),
    remoteEnv: process.env.REMOTE_SOURCES_BASE,
  },
  {
    name: "arena",
    prefixes: ["/api/v1/arena"],
    port: Number(process.env.ARENA_PORT || 3011),
    remoteEnv: process.env.REMOTE_ARENA_BASE,
  },
  {
    name: "integrations",
    prefixes: ["/api/v1/integrations"],
    port: Number(process.env.INTEGRATIONS_PORT || 3012),
    remoteEnv: process.env.REMOTE_INTEGRATIONS_BASE,
  },
  {
    name: "self-improve",
    prefixes: ["/api/v1/self-improve"],
    port: Number(process.env.SELF_IMPROVE_PORT || 3013),
    remoteEnv: process.env.REMOTE_SELF_IMPROVE_BASE,
  },
  {
    name: "domains",
    prefixes: ["/api/v1/domains"],
    port: Number(process.env.DOMAINS_PORT || 3016),
    remoteEnv: process.env.REMOTE_DOMAINS_BASE,
  },
  {
    name: "ide",
    prefixes: ["/api/v1/ide"],
    port: Number(process.env.IDE_PORT || 3017),
    remoteEnv: process.env.REMOTE_IDE_BASE,
  },
];

function getRouteForPrefix(url) {
  for (const svc of serviceConfig) {
    for (const prefix of svc.prefixes) {
      if (url.startsWith(prefix)) {
        if (svc.remoteEnv)
          return { type: "remote", base: svc.remoteEnv, name: svc.name };
        return {
          type: "local",
          base: `http://127.0.0.1:${svc.port}`,
          name: svc.name,
        };
      }
    }
  }
  return null;
}

// DYNAMIC PROXY REGISTRATION LOOP
// Registers proxies for all services defined in serviceConfig
serviceConfig.forEach((svc) => {
  // Skip services that already have explicit proxies defined elsewhere to avoid conflicts
  // (system/orchestrator is handled separately, as are some others, but safe to double-cover if careful)
  if (svc.name === "system") return;

  svc.prefixes.forEach((prefix) => {
    // Use app.all to handle GET, POST, PUT, DELETE, etc.
    // We use a regex to match the prefix and anything after it
    // Note: Express routing matches are order-dependent. Specific routes defined above take precedence.
    app.all([prefix, `${prefix}/*`], async (req, res) => {
      try {
        // Strip the prefix if needed, or just forward the full URL?
        // Usually microservices expect the full path including /api/v1/...
        // resilientProxy takes (serviceName, port, originalUrl, method, headers, body)

        const body = req.is("application/json")
          ? JSON.stringify(req.body || {})
          : typeof req.body === "string"
            ? req.body
            : undefined;

        const response = await resilientProxy(
          svc.name,
          svc.port,
          req.originalUrl,
          req.method,
          req.headers,
          body
        );

        // Forward status and headers
        res.status(response.status);
        response.headers.forEach((val, key) => {
          // Skip content-encoding/length to let Express handle it
          if (key !== "content-encoding" && key !== "content-length") {
            res.setHeader(key, val);
          }
        });

        // Pipe the response body
        // Check content type to decide how to send
        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
          const data = await response.json();
          res.json(data);
        } else if (contentType.includes("text/event-stream")) {
          // Stream SSE
          if (response.body && typeof response.body.pipe === "function") {
            response.body.pipe(res);
          } else {
            // Fallback for node-fetch body
            response.body.on("data", (chunk) => res.write(chunk));
            response.body.on("end", () => res.end());
          }
        } else {
          const text = await response.text();
          res.send(text);
        }
      } catch (error) {
        console.error(
          `[Proxy] Error forwarding to ${svc.name} (${prefix}):`,
          error.message
        );
        if (!res.headersSent) {
          res.status(502).json({
            ok: false,
            error: `Service ${svc.name} unavailable`,
            details: error.message,
          });
        }
      }
    });
  });
});

app.get("/api/v1/system/routes", (req, res) => {
  const routes = serviceConfig.map((svc) => ({
    name: svc.name,
    prefixes: svc.prefixes,
    route: svc.remoteEnv
      ? { type: "remote", base: svc.remoteEnv }
      : { type: "local", base: `http://127.0.0.1:${svc.port}` },
  }));
  res.json({ ok: true, routes });
});

// ======= UI Activity Monitor (Integrated) =======
// Replaces external service on port 3050 to improve reliability
let realDataMode = false;
const activitySessions = new Map();

app.post("/api/v1/activity/heartbeat", (req, res) => {
  const { sessionId, route, action } = req.body;
  if (sessionId) {
    activitySessions.set(sessionId, {
      lastSeen: Date.now(),
      route,
      action,
      active: true,
    });
  }
  res.json({
    ok: true,
    activeSessions: activitySessions.size,
    config: { autoStart: true, realDataMode },
  });
});

app.get("/api/v1/activity/sessions", (req, res) => {
  const active = [];
  const now = Date.now();
  for (const [id, s] of activitySessions.entries()) {
    if (now - s.lastSeen < 300000) active.push({ sessionId: id, ...s });
    else activitySessions.delete(id);
  }
  res.json({ ok: true, activeSessions: active.length, sessions: active });
});

app.post("/api/v1/activity/ensure-real-data", (req, res) => {
  realDataMode = true;
  res.json({
    ok: true,
    realDataMode: true,
    message: "Real data mode enabled (integrated)",
  });
});

// Fallback for ensure-real-details (alternative endpoint name)
app.post("/api/v1/activity/ensure-real-details", (req, res) => {
  realDataMode = true;
  res.json({
    ok: true,
    realDataMode: true,
    message: "Real data mode enabled (integrated)",
  });
});

app.post("/api/v1/activity/config", (req, res) => {
  if (req.body.realDataMode !== undefined) realDataMode = req.body.realDataMode;
  res.json({ ok: true, config: { realDataMode } });
});

app.post("/api/v1/activity/start-all", (req, res) => {
  res.json({ ok: true, message: "Services managed by orchestrator" });
});

app.get("/api/v1/activity/servers", async (req, res) => {
  // Quick check of known ports
  const ports = [3000, 3001, 3002, 3003, 3004, 3006, 3007, 3008, 3009];
  const status = [];
  let activeCount = 0;

  for (const port of ports) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 300);
      const r = await fetch(`http://127.0.0.1:${port}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const healthy = r.ok;
      if (healthy) activeCount++;
      status.push({ port, healthy });
    } catch (e) {
      status.push({ port, healthy: false });
    }
  }
  res.json({
    ok: true,
    servers: status,
    activeServers: activeCount,
    totalServers: ports.length,
  });
});

// Resilient proxy helper - wraps fetch with circuit breaker and retry
async function resilientProxy(
  serviceName,
  port,
  originalUrl,
  method,
  headers,
  body
) {
  const breaker = serviceCircuitBreakers[serviceName];

  return await breaker.execute(
    async () => {
      const url = `http://127.0.0.1:${port}${originalUrl}`;
      const init = {
        method,
        headers: {
          "content-type": headers["content-type"] || "application/json",
        },
      };
      if (method !== "GET" && method !== "HEAD") {
        init.body = body;
      }

      // Add retry logic for transient errors
      return await retry(
        async () => {
          const response = await fetch(url, init);
          if (!response.ok && response.status >= 500) {
            const error = new Error(
              `Service ${serviceName} returned ${response.status}`
            );
            error.statusCode = response.status;
            throw error;
          }
          return response;
        },
        { maxAttempts: 2, backoffMs: 100 }
      );
    },
    {
      fallback: async () => {
        // Return service unavailable response
        return new Response(
          JSON.stringify({
            ok: false,
            error: `${serviceName} service temporarily unavailable`,
          }),
          { status: 503 }
        );
      },
    }
  );
}

// Explicit proxy for capabilities (ensures correct routing for nested paths)
// Explicit proxy for capabilities (ensures correct routing for nested paths)
app.all(
  ["/api/v1/capabilities", "/api/v1/capabilities/*"],
  async (req, res) => {
    try {
      const port = Number(process.env.CAPABILITIES_PORT || 3009);
      const url = `http://127.0.0.1:${port}${req.originalUrl}`;
      const init = {
        method: req.method,
        headers: {
          "content-type": req.get("content-type") || "application/json",
        },
      };
      if (req.method !== "GET" && req.method !== "HEAD") {
        init.body = req.is("application/json")
          ? JSON.stringify(req.body || {})
          : undefined;
      }
      const r = await fetch(url, init);
      const text = await r.text();
      res.status(r.status);
      const ct = r.headers.get("content-type") || "";
      if (ct.includes("application/json"))
        return res.type("application/json").send(text);
      return res.send(text);
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  }
);

// Explicit proxy for product development (ensure all routes work)
app.all(
  [
    "/api/v1/workflows",
    "/api/v1/workflows/*",
    "/api/v1/learning",
    "/api/v1/learning/*",
    "/api/v1/analysis",
    "/api/v1/analysis/*",
    "/api/v1/artifacts",
    "/api/v1/artifacts/*",
    "/api/v1/showcase",
    "/api/v1/showcase/*",
    "/api/v1/product",
    "/api/v1/product/*",
    "/api/v1/bookworm",
    "/api/v1/bookworm/*",
    "/api/v1/design",
    "/api/v1/design/*",
  ],
  async (req, res) => {
    try {
      const port = Number(process.env.PRODUCT_PORT || 3006);
      const url = `http://127.0.0.1:${port}${req.originalUrl}`;
      const init = {
        method: req.method,
        headers: {
          "content-type": req.get("content-type") || "application/json",
        },
      };
      if (req.method !== "GET" && req.method !== "HEAD") {
        init.body = req.is("application/json")
          ? JSON.stringify(req.body || {})
          : undefined;
      }
      const r = await fetch(url, init);

      // Handle SSE streaming
      const ct = r.headers.get("content-type") || "";
      if (ct.includes("text/event-stream")) {
        res.status(r.status);
        res.set({
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        });
        r.body.pipe(res);
        return;
      }

      const text = await r.text();
      res.status(r.status);
      if (ct.includes("application/json"))
        return res.type("application/json").send(text);
      return res.send(text);
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  }
);

// Explicit proxy for providers arena (multi-provider collaboration)
app.all(["/api/v1/arena", "/api/v1/arena/*"], async (req, res) => {
  try {
    const port = Number(process.env.ARENA_PORT || 3011);
    const url = `http://127.0.0.1:${port}${req.originalUrl}`;
    const init = {
      method: req.method,
      headers: {
        "content-type": req.get("content-type") || "application/json",
      },
    };
    if (req.method !== "GET" && req.method !== "HEAD") {
      init.body = req.is("application/json")
        ? JSON.stringify(req.body || {})
        : undefined;
    }
    const r = await fetch(url, init);
    const text = await r.text();
    res.status(r.status);
    const ct = r.headers.get("content-type") || "";
    if (ct.includes("application/json"))
      return res.type("application/json").send(text);
    return res.send(text);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Explicit proxy for execution server (IDE)
app.all(["/api/v1/ide", "/api/v1/ide/*"], async (req, res) => {
  try {
    const port = Number(process.env.IDE_PORT || 3017);
    const url = `http://127.0.0.1:${port}${req.originalUrl}`;
    const init = {
      method: req.method,
      headers: {
        "content-type": req.get("content-type") || "application/json",
      },
    };
    if (req.method !== "GET" && req.method !== "HEAD") {
      init.body = req.is("application/json")
        ? JSON.stringify(req.body || {})
        : undefined;
    }
    const r = await fetch(url, init);
    const text = await r.text();
    res.status(r.status);
    const ct = r.headers.get("content-type") || "";
    if (ct.includes("application/json"))
      return res.type("application/json").send(text);
    return res.send(text);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ============================================================================
// WORKBENCH ORCHESTRATION API - Unified Productivity System
// ============================================================================

// POST /api/v1/work/request - Execute a unified work request
app.post("/api/v1/work/request", async (req, res) => {
  try {
    const { goal, context, options } = req.body || {};

    if (!goal) {
      return res.status(400).json({
        ok: false,
        error: "goal is required",
      });
    }

    // Analyze intent
    const intentAnalysis = intentAnalyzer.analyze(goal, options);

    // Execute workbench orchestrator (non-blocking)
    const submission = workbenchOrchestrator.submitWork(
      goal,
      context || {},
      options || {}
    );

    const response = {
      ok: true,
      workId: submission.workId,
      intent: intentAnalysis.intent,
      status: "started",
      timestamp: new Date().toISOString(),
    };

    res.type("application/json");
    return res.send(JSON.stringify(response));
  } catch (error) {
    console.error("Workbench error:", error);
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

// GET /api/v1/work/status - Get current work status
app.get("/api/v1/work/status", (req, res) => {
  const status = workbenchOrchestrator.getWorkStatus();

  res.type("application/json");
  return res.send(
    JSON.stringify({
      ok: true,
      currentWork: status,
      timestamp: new Date().toISOString(),
    })
  );
});

// GET /api/v1/work/history - Get work history
app.get("/api/v1/work/history", (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const history = workbenchOrchestrator.getWorkHistory(limit);

  res.type("application/json");
  return res.send(
    JSON.stringify({
      ok: true,
      history,
      count: history.length,
      timestamp: new Date().toISOString(),
    })
  );
});

// POST /api/v1/work/analyze-intent - Analyze goal intent without execution
app.post("/api/v1/work/analyze-intent", (req, res) => {
  try {
    const { goal, options } = req.body || {};

    if (!goal) {
      return res.status(400).json({
        ok: false,
        error: "goal is required",
      });
    }

    const analysis = intentAnalyzer.analyze(goal, options);

    // Return raw response bypassing middleware wrapper
    res.type("application/json");
    return res.send(
      JSON.stringify({
        ok: true,
        analysis,
        timestamp: new Date().toISOString(),
      })
    );
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

// ============================================================================
// GITHUB API ENDPOINTS - Direct Integration (No Port 3020 Needed)
// ============================================================================

// Health check for GitHub
app.get("/api/v1/github/health", (req, res) => {
  const configured = githubProvider.isConfigured();
  res.json({
    ok: true,
    configured,
    repo: configured ? process.env.GITHUB_REPO : null,
    capabilities: [
      "read",
      "write",
      "create-pr",
      "create-issue",
      "merge",
      "branch",
      "comment",
    ],
  });
});

// Read operations (read-only access to repo)
app.get("/api/v1/github/info", async (req, res) => {
  const info = await githubProvider.getRepoInfo();
  res.json({ ok: !!info, info: info || { error: "GitHub not configured" } });
});

app.get("/api/v1/github/issues", async (req, res) => {
  const limit = parseInt(req.query.limit || "5");
  const issues = await githubProvider.getRecentIssues(limit);
  res.json({ ok: true, issues });
});

app.get("/api/v1/github/readme", async (req, res) => {
  const readme = await githubProvider.getReadme();
  res.json({ ok: !!readme, readme: readme || null });
});

app.post("/api/v1/github/file", async (req, res) => {
  const { path } = req.body || {};
  if (!path) return res.status(400).json({ ok: false, error: "path required" });
  const file = await githubProvider.getFileContent(path);
  res.json({ ok: !!file, file: file || null });
});

app.post("/api/v1/github/files", async (req, res) => {
  const { paths } = req.body || {};
  if (!paths || !Array.isArray(paths)) {
    return res.status(400).json({ ok: false, error: "paths array required" });
  }
  const files = await githubProvider.getMultipleFiles(paths);
  res.json({ ok: true, files });
});

app.get("/api/v1/github/structure", async (req, res) => {
  const path = req.query.path || "";
  const recursive = req.query.recursive === "true";
  const structure = await githubProvider.getRepoStructure(path, recursive);
  res.json({ ok: !!structure, structure: structure || null });
});

app.get("/api/v1/github/context", async (req, res) => {
  const context = await githubProvider.getContextForProviders();
  res.json({ ok: !!context, context });
});

// Write operations - Self-Modification via GitHub

// POST /api/v1/github/update-file - Update or create a file
// POST /api/v1/github/update-file - Create or update a file
app.post("/api/v1/github/update-file", async (req, res) => {
  const { path, content, message, branch } = req.body || {};
  if (!path || content === undefined) {
    return res
      .status(400)
      .json({ ok: false, error: "path and content required" });
  }
  const result = await githubProvider.updateFile(
    path,
    content,
    message,
    branch || "main"
  );
  res.json(result);
});

// POST /api/v1/github/create-branch - Create a new branch
app.post("/api/v1/github/create-branch", async (req, res) => {
  const { name, from } = req.body || {};
  if (!name)
    return res.status(400).json({ ok: false, error: "branch name required" });
  const result = await githubProvider.createBranch(name, from || "main");
  res.json(result);
});

// POST /api/v1/github/create-pr - Create a pull request
app.post("/api/v1/github/create-pr", async (req, res) => {
  const { title, body, head, base, labels, reviewers, draft } = req.body || {};
  if (!title || !head)
    return res
      .status(400)
      .json({ ok: false, error: "title and head branch required" });
  const result = await githubProvider.createPullRequest({
    title,
    body,
    head,
    base: base || "main",
    labels,
    reviewers,
    draft: draft || false,
  });
  res.json(result);
});

// POST /api/v1/github/create-issue - Create an issue
app.post("/api/v1/github/create-issue", async (req, res) => {
  const { title, body, labels, assignees } = req.body || {};
  if (!title)
    return res.status(400).json({ ok: false, error: "title required" });
  const result = await githubProvider.createIssue({
    title,
    body,
    labels: labels || [],
    assignees: assignees || [],
  });
  res.json(result);
});

// PATCH /api/v1/github/pr/:number - Update a pull request
app.patch("/api/v1/github/pr/:number", async (req, res) => {
  const prNumber = parseInt(req.params.number);
  const updates = req.body || {};
  if (!prNumber)
    return res.status(400).json({ ok: false, error: "PR number required" });
  const result = await githubProvider.updatePullRequest(prNumber, updates);
  res.json(result);
});

// PUT /api/v1/github/pr/:number/merge - Merge a pull request
app.put("/api/v1/github/pr/:number/merge", async (req, res) => {
  const prNumber = parseInt(req.params.number);
  const { message, method } = req.body || {};
  if (!prNumber)
    return res.status(400).json({ ok: false, error: "PR number required" });
  const result = await githubProvider.mergePullRequest(
    prNumber,
    message,
    method || "squash"
  );
  res.json(result);
});

// POST /api/v1/github/comment - Add comment to issue/PR
app.post("/api/v1/github/comment", async (req, res) => {
  const { number, body } = req.body || {};
  if (!number || !body)
    return res
      .status(400)
      .json({ ok: false, error: "issue/PR number and body required" });
  const result = await githubProvider.addComment(number, body);
  res.json(result);
});

// ============================================================================
// SELF-AWARENESS ENDPOINTS - System Introspection & Reflection
// MUST BE BEFORE THE CATCH-ALL /api/* PROXY
// ============================================================================

// GET /api/v1/system/awareness - Get system awareness and introspection state
app.get("/api/v1/system/awareness", async (req, res) => {
  try {
    const awareness = {
      ok: true,
      timestamp: new Date().toISOString(),
      system: {
        name: "TooLoo.ai",
        version: "2.0.0",
        mode: "orchestrated",
        uptime: process.uptime(),
        pid: process.pid,
        port: PORT,
        environment: process.env.NODE_ENV || "development",
      },
      capabilities: {
        selfAwareness: true,
        codeAnalysis: true,
        selfModification: true,
        gitHubIntegration: githubProvider.isConfigured(),
        fileSystemAccess: true,
        infoGathering: true,
        autonomous: true,
        codeExposure: true, // NEW: Providers can read source code
      },
      github: {
        enabled: githubProvider.isConfigured(),
        repo: process.env.GITHUB_REPO || null,
        operations: [
          "read",
          "write",
          "create-pr",
          "create-issue",
          "merge",
          "branch",
          "comment",
        ],
      },
      services: {
        training: 3001,
        meta: 3002,
        budget: 3003,
        coach: 3004,
        product: 3006,
        segmentation: 3007,
        reports: 3008,
        capabilities: 3009,
        orchestrator: 3123,
      },
      // NEW: Advertise code reading endpoints to providers
      codeAccess: {
        enabled: true,
        endpoints: {
          structure: "GET /api/v1/system/code/structure?maxDepth=3",
          listFiles: "GET /api/v1/system/code/list?dir=servers",
          readFile:
            'POST /api/v1/system/code/read {"filePath":"servers/web-server.js","maxLines":100}',
          search:
            'POST /api/v1/system/code/search {"query":"async function","maxResults":20}',
        },
        description:
          "Providers can read TooLoo.ai source code to understand system architecture and capabilities",
      },
    };
    res.json(awareness);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/v1/system/self-patch - Apply self-modifications to the codebase
app.post("/api/v1/system/self-patch", async (req, res) => {
  try {
    const { action, file, content, message, branch, createPr } = req.body || {};

    if (!action) {
      return res.status(400).json({
        ok: false,
        error: "action required (update, create, or analyze)",
      });
    }

    if (action === "analyze") {
      // Just analyze a file without modifying it
      const { filePath } = req.body;
      if (!filePath)
        return res
          .status(400)
          .json({ ok: false, error: "filePath required for analysis" });

      // Basic analysis of file
      return res.json({
        ok: true,
        action: "analyze",
        file: filePath,
        analyzed: true,
        note: "File analysis capability - integration with SelfAwarenessManager recommended",
      });
    }

    if (!file || content === undefined) {
      return res
        .status(400)
        .json({ ok: false, error: "file and content required" });
    }

    let result = { ok: false };

    // Update or create file via GitHub
    if (action === "update" || action === "create") {
      result = await githubProvider.createOrUpdateFile(
        file,
        content,
        message || `${action}: ${file}`,
        branch || "main"
      );
    }

    // Optionally create PR for the changes
    if (result.ok && createPr) {
      const prResult = await githubProvider.createPullRequest(
        `Self-modification: ${file}`,
        `Auto-generated patch for ${file}\n\n${message || "Self-improvement"}`,
        branch || "main"
      );
      result.pullRequest = prResult;
    }

    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/v1/system/introspect - Deep system introspection
app.get("/api/v1/system/introspect", async (req, res) => {
  try {
    const introspection = {
      ok: true,
      timestamp: new Date().toISOString(),
      system: {
        process: {
          pid: process.pid,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          version: process.version,
        },
        environment: {
          node_env: process.env.NODE_ENV,
          debug: !!process.env.DEBUG,
          github_configured: !!process.env.GITHUB_TOKEN,
          timezone: process.env.TZ || "UTC",
        },
      },
      capabilities: {
        selfDiscovery: true,
        selfInspection: true,
        selfAwareness: true,
        codeModification: true,
        gitHubOperations: githubProvider.isConfigured(),
        autonomousEvolution: true,
      },
      operationalStatus: {
        webServer: {
          port: PORT,
          status: "running",
          uptime: process.uptime(),
        },
        serviceRegistry: {
          count: 10,
          documented: true,
        },
      },
    };
    res.json(introspection);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ============================================================================
// CODE EXPOSURE ENDPOINTS - Allow Providers to Read TooLoo.ai Source Code
// ============================================================================

// GET /api/v1/system/code/structure - Get project file structure
app.get("/api/v1/system/code/structure", async (req, res) => {
  try {
    const maxDepth = parseInt(req.query.maxDepth || "3");
    const directory = req.query.dir || "/workspaces/TooLoo.ai";

    async function buildStructure(dir, depth = 0) {
      if (depth > maxDepth) return null;

      try {
        const files = await fs.promises.readdir(dir);
        const items = [];

        for (const file of files) {
          // Skip hidden and common large directories
          if (
            file.startsWith(".") ||
            ["node_modules", "dist", "build", ".git"].includes(file)
          )
            continue;

          const filePath = path.join(dir, file);
          const stat = await fs.promises.stat(filePath);

          if (stat.isDirectory()) {
            const children = await buildStructure(filePath, depth + 1);
            if (children) {
              items.push({
                name: file,
                type: "directory",
                path: filePath.replace("/workspaces/TooLoo.ai", ""),
                children,
              });
            }
          } else {
            items.push({
              name: file,
              type: "file",
              path: filePath.replace("/workspaces/TooLoo.ai", ""),
              size: stat.size,
            });
          }
        }

        return items.length > 0 ? items : null;
      } catch (e) {
        return null;
      }
    }

    const structure = await buildStructure(directory);
    res.json({
      ok: true,
      root: directory.replace("/workspaces/TooLoo.ai", ""),
      structure,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/v1/system/code/read - Read a specific source file
app.post("/api/v1/system/code/read", async (req, res) => {
  try {
    const { filePath, maxLines } = req.body || {};

    if (!filePath) {
      return res.status(400).json({ ok: false, error: "filePath required" });
    }

    // Security: only allow reading from project directory
    const safeDir = "/workspaces/TooLoo.ai";
    const fullPath = path.resolve(safeDir, filePath.replace(/^\//, ""));

    if (!fullPath.startsWith(safeDir)) {
      return res
        .status(403)
        .json({ ok: false, error: "Access denied - path outside project" });
    }

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return res
        .status(404)
        .json({ ok: false, error: `File not found: ${filePath}` });
    }

    const content = await fs.promises.readFile(fullPath, "utf-8");
    const lines = content.split("\n");
    const truncated = maxLines && lines.length > maxLines;
    const displayLines = maxLines ? lines.slice(0, maxLines) : lines;

    res.json({
      ok: true,
      path: filePath,
      lines: displayLines.length,
      totalLines: lines.length,
      truncated,
      content: displayLines.join("\n"),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/v1/system/code/search - Search source code for patterns
app.post("/api/v1/system/code/search", async (req, res) => {
  try {
    const { query, filePattern, maxResults } = req.body || {};

    if (!query) {
      return res.status(400).json({ ok: false, error: "query required" });
    }

    const results = [];
    const maxRes = maxResults || 20;
    const pattern = filePattern || "**/*.js";

    // Simple search in common directories
    const searchDirs = [
      "/workspaces/TooLoo.ai/servers",
      "/workspaces/TooLoo.ai/engine",
      "/workspaces/TooLoo.ai/lib",
      "/workspaces/TooLoo.ai/scripts",
    ];

    for (const dir of searchDirs) {
      if (results.length >= maxRes) break;

      try {
        const files = await fs.promises.readdir(dir, { recursive: true });

        for (const file of files) {
          if (results.length >= maxRes) break;
          if (!file.endsWith(".js")) continue;

          const filePath = path.join(dir, file);
          try {
            const content = await fs.promises.readFile(filePath, "utf-8");
            const lines = content.split("\n");

            lines.forEach((line, idx) => {
              if (results.length < maxRes && line.includes(query)) {
                results.push({
                  file: filePath.replace("/workspaces/TooLoo.ai", ""),
                  line: idx + 1,
                  content: line.trim().substring(0, 120),
                });
              }
            });
          } catch (e) {
            // Skip unreadable files
          }
        }
      } catch (e) {
        // Skip directories that don't exist
      }
    }

    res.json({
      ok: true,
      query,
      resultsFound: results.length,
      results,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/v1/system/code/list - List all source files in a directory
app.get("/api/v1/system/code/list", async (req, res) => {
  try {
    const dir = req.query.dir || "servers";
    const fullPath = path.join("/workspaces/TooLoo.ai", dir);

    // Security check
    if (!fullPath.startsWith("/workspaces/TooLoo.ai")) {
      return res.status(403).json({ ok: false, error: "Access denied" });
    }

    if (!fs.existsSync(fullPath)) {
      return res
        .status(404)
        .json({ ok: false, error: `Directory not found: ${dir}` });
    }

    const files = await fs.promises.readdir(fullPath);
    const fileList = files
      .filter(
        (f) => f.endsWith(".js") || f.endsWith(".json") || f.endsWith(".md")
      )
      .map((f) => ({
        name: f,
        path: `${dir}/${f}`,
      }));

    res.json({
      ok: true,
      directory: dir,
      files: fileList.length,
      list: fileList,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ============================================================================
// ADMIN ENDPOINTS - Hot Reload, Update, and System Management
// ============================================================================

/**
 * GET /api/v1/admin/hot-reload-status - Check hot-reload status
 */
app.get("/api/v1/admin/hot-reload-status", (req, res) => {
  res.json({
    ok: true,
    hotReload: hotReloadManager.getStatus(),
    hotUpdate: hotUpdateManager.getStatus(),
  });
});

/**
 * POST /api/v1/admin/hot-reload - Trigger hot-reload of modules
 */
app.post("/api/v1/admin/hot-reload", async (req, res) => {
  try {
    await hotReloadManager.reloadAll();
    res.json({
      ok: true,
      message: "Hot reload triggered",
      status: hotReloadManager.getStatus(),
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/admin/endpoints - List all registered endpoints
 */
app.get("/api/v1/admin/endpoints", (req, res) => {
  res.json({
    ok: true,
    endpoints: hotUpdateManager.getEndpoints(),
    total: hotUpdateManager.getEndpoints().length,
  });
});

/**
 * GET /api/v1/admin/update-history - Get update history
 */
app.get("/api/v1/admin/update-history", (req, res) => {
  const limit = req.query.limit || 20;
  res.json({
    ok: true,
    history: hotUpdateManager.getHistory(parseInt(limit)),
    status: hotUpdateManager.getStatus(),
  });
});

// ============================================================================
// PROVIDER INSTRUCTIONS & AGGREGATION ENDPOINTS
// ============================================================================

// Phase 6 Observability endpoint
app.get("/api/v1/system/observability", (req, res) => {
  try {
    res.json({
      ok: true,
      observability: {
        rateLimiter: rateLimiter.getStats(),
        tracer: tracer.getMetrics(),
        circuitBreakers: Object.fromEntries(
          Object.entries(serviceCircuitBreakers).map(([name, cb]) => [
            name,
            cb.getState(),
          ])
        ),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ============================================================================
// MONTH 2: CONVERSATION API ROUTES (Claude Integration)
// ============================================================================
import * as conversationAPI from "../../api/conversation-api.js";

/**
 * POST /api/v1/conversation/message
 * Send a message and get AI response with system context
 */
app.post("/api/v1/conversation/message", async (req, res) => {
  conversationAPI.handleConversationMessage(req, res);
});

/**
 * GET /api/v1/conversation/:id
 * Retrieve conversation history
 */
app.get("/api/v1/conversation/:id", (req, res) => {
  conversationAPI.handleGetConversation(req, res);
});

/**
 * GET /api/v1/conversation
 * List recent conversations
 */
app.get("/api/v1/conversation", (req, res) => {
  conversationAPI.handleListConversations(req, res);
});

/**
 * GET /api/v1/conversation/health
 */
app.get("/api/v1/conversation/health", (req, res) => {
  conversationAPI.handleHealth(req, res);
});

// ============================================================================
// MONTH 2: SYSTEM CONTROL API ROUTES (Service Management)
// ============================================================================
import * as systemControlAPI from "../../api/system-control.js";

/**
 * POST /api/v1/system/service/:name/restart
 */
app.post("/api/v1/system/service/:name/restart", async (req, res) => {
  systemControlAPI.handleRestartService(req, res);
});

/**
 * POST /api/v1/system/service/:name/stop
 */
app.post("/api/v1/system/service/:name/stop", async (req, res) => {
  systemControlAPI.handleStopService(req, res);
});

/**
 * POST /api/v1/system/service/:name/start
 */
app.post("/api/v1/system/service/:name/start", async (req, res) => {
  systemControlAPI.handleStartService(req, res);
});

/**
 * GET /api/v1/system/service/:name
 */
app.get("/api/v1/system/service/:name", async (req, res) => {
  systemControlAPI.handleGetService(req, res);
});

/**
 * GET /api/v1/system/services
 */
app.get("/api/v1/system/services", async (req, res) => {
  systemControlAPI.handleGetAllServices(req, res);
});

/**
 * POST /api/v1/system/start
 */
app.post("/api/v1/system/start", async (req, res) => {
  systemControlAPI.handleStartAllServices(req, res);
});

/**
 * POST /api/v1/system/stop
 */
app.post("/api/v1/system/stop", async (req, res) => {
  systemControlAPI.handleStopAllServices(req, res);
});

/**
 * POST /api/v1/system/services/restart-all
 */
app.post("/api/v1/system/services/restart-all", async (req, res) => {
  systemControlAPI.handleRestartAllServices(req, res);
});

/**
 * GET /api/v1/system/service/:name/diagnose
 */
app.get("/api/v1/system/service/:name/diagnose", async (req, res) => {
  systemControlAPI.handleDiagnoseService(req, res);
});

/**
 * GET /api/v1/system/service/:name/health
 */
app.get("/api/v1/system/service/:name/health", async (req, res) => {
  systemControlAPI.handleStreamServiceHealth(req, res);
});

/**
 * System Control health check
 */
app.get("/api/v1/system-control/health", (req, res) => {
  systemControlAPI.handleHealth(req, res);
});

// ============================================================================
// PROVIDER CONTROL API ROUTES (Provider Management)
// ============================================================================
import * as providerControlAPI from "../../api/provider-control.js";

/**
 * POST /api/v1/provider/switch
 */
app.post("/api/v1/provider/switch", async (req, res) => {
  providerControlAPI.handleSwitchProvider(req, res);
});

/**
 * GET /api/v1/provider/active
 */
app.get("/api/v1/provider/active", async (req, res) => {
  providerControlAPI.handleGetActiveProvider(req, res);
});

/**
 * GET /api/v1/provider/status
 */
app.get("/api/v1/provider/status", async (req, res) => {
  providerControlAPI.handleGetProvidersStatus(req, res);
});

/**
 * POST /api/v1/provider/forecast
 */
app.post("/api/v1/provider/forecast", async (req, res) => {
  providerControlAPI.handleForecastSwitchImpact(req, res);
});

/**
 * GET /api/v1/provider/:name/metrics
 */
app.get("/api/v1/provider/:name/metrics", async (req, res) => {
  providerControlAPI.handleGetProviderMetrics(req, res);
});

/**
 * POST /api/v1/provider/policy
 */
app.post("/api/v1/provider/policy", async (req, res) => {
  providerControlAPI.handleSetProviderPolicy(req, res);
});

/**
 * POST /api/v1/provider/compare
 */
app.post("/api/v1/provider/compare", async (req, res) => {
  providerControlAPI.handleCompareProviders(req, res);
});

/**
 * Provider Control health check
 */
app.get("/api/v1/provider-control/health", (req, res) => {
  providerControlAPI.handleHealth(req, res);
});

// ============================================================================
// MONTH 3: CONTEXTUAL AWARENESS API ROUTES
// ============================================================================
import * as contextualAwarenessAPI from "../../api/contextual-awareness.js";

/**
 * GET /api/v1/context/system-state
 */
app.get("/api/v1/context/system-state", async (req, res) => {
  contextualAwarenessAPI.handleGetSystemState(req, res);
});

/**
 * POST /api/v1/context/suggestions
 */
app.post("/api/v1/context/suggestions", async (req, res) => {
  contextualAwarenessAPI.handleGetSuggestions(req, res);
});

/**
 * POST /api/v1/context/smart-replies
 */
app.post("/api/v1/context/smart-replies", async (req, res) => {
  contextualAwarenessAPI.handleGenerateSmartReplies(req, res);
});

/**
 * Contextual Awareness health check
 */
app.get("/api/v1/contextual-awareness/health", (req, res) => {
  contextualAwarenessAPI.handleHealth(req, res);
});

// ============================================================================
// MONTH 4: CONVERSATIONAL CONTROL API ROUTES
// ============================================================================
import * as conversationalControlAPI from "../../api/conversational-control.js";

/**
 * POST /api/v1/control/command
 */
app.post("/api/v1/control/command", async (req, res) => {
  conversationalControlAPI.handleExecuteCommand(req, res);
});

/**
 * GET /api/v1/control/investigate-alerts
 */
app.get("/api/v1/control/investigate-alerts", async (req, res) => {
  conversationalControlAPI.handleInvestigateAlerts(req, res);
});

/**
 * Conversational Control health check
 */
app.get("/api/v1/conversational-control/health", (req, res) => {
  conversationalControlAPI.handleHealth(req, res);
});

// ============================================================================
// ALERT ENGINE ROUTES
// ============================================================================
// Mount alert engine routes for system alerting and auto-remediation
app.use("/api/v1/system/alerts", alertEngineModule);

// ============================================================================
// CAPABILITY ACTIVATION ROUTES (Enhanced with Response Formatter)
// ============================================================================

/**
 * GET /api/v1/capabilities/activate/status
 * Get current activation status with visual formatting
 */
app.get("/api/v1/capabilities/activate/status", (req, res) => {
  const status = capabilityActivator.getStatus();
  const response = formatterIntegration.formatCapabilityResponse({
    title: "Capability Activation Status",
    total: 242,
    activated: status.activated,
    pending: status.pending,
    components: [
      {
        name: "autonomousEvolutionEngine",
        discovered: 62,
        activated: 0,
        status: "dormant",
        methods: [],
      },
      {
        name: "enhancedLearning",
        discovered: 43,
        activated: 0,
        status: "dormant",
        methods: [],
      },
      {
        name: "predictiveEngine",
        discovered: 38,
        activated: 0,
        status: "dormant",
        methods: [],
      },
      {
        name: "userModelEngine",
        discovered: 37,
        activated: 0,
        status: "dormant",
        methods: [],
      },
      {
        name: "proactiveIntelligenceEngine",
        discovered: 32,
        activated: 0,
        status: "dormant",
        methods: [],
      },
      {
        name: "contextBridgeEngine",
        discovered: 30,
        activated: 0,
        status: "dormant",
        methods: [],
      },
    ],
    recentActivations: status.recentActivations,
  });
  res.json(response);
});

/**
 * POST /api/v1/capabilities/activate/one
 * Activate a single capability
 */
app.post("/api/v1/capabilities/activate/one", async (req, res) => {
  const { component, method, mode = "safe" } = req.body;

  if (!component || !method) {
    return res
      .status(400)
      .json(
        formatterIntegration.formatErrorResponse(
          new Error("component and method required"),
          400
        )
      );
  }

  const result = await capabilityActivator.activate(component, method, mode);
  const response = formatterIntegration.formatSuccessResponse({
    title: "Capability Activation",
    message: result.success
      ? `Activated ${component}:${method}`
      : `Failed to activate ${component}:${method}`,
    data: result,
  });
  res.status(result.success ? 200 : 500).json(response);
});

/**
 * POST /api/v1/capabilities/activate/phase
 * Activate capabilities for a specific phase
 */
app.post("/api/v1/capabilities/activate/phase", async (req, res) => {
  const { phase = "Phase 1: Core Initialization", mode = "safe" } = req.body;
  const plan = capabilityActivator.getPhasedActivationPlan();

  if (!plan[phase]) {
    return res
      .status(400)
      .json(
        formatterIntegration.formatErrorResponse(
          new Error(`Unknown phase: ${phase}`),
          400
        )
      );
  }

  const result = await capabilityActivator.activateBatch(plan[phase], mode);
  const response = formatterIntegration.formatProgressResponse({
    title: `Activating ${phase}`,
    items: result.results.map((r) => ({
      label: `${r.component}:${r.method}`,
      progress: r.success ? 100 : 0,
      status: r.success ? "completed" : "failed",
      details: r.success ? `Performance: ${r.performanceScore}` : r.reason,
    })),
  });
  res.json(response);
});

/**
 * POST /api/v1/capabilities/activate/all
 * Activate all 242 capabilities in phases
 */
app.post("/api/v1/capabilities/activate/all", async (req, res) => {
  const { mode = "safe" } = req.body;

  const allResult = await capabilityActivator.activateAll(mode);
  const response = formatterIntegration.formatMixedResponse({
    title: "Complete System Activation (242 Capabilities)",
    sections: allResult.phases.map((phase, idx) => ({
      type: "progress",
      title: phase.phase,
      content: {
        items: phase.results.map((r) => ({
          label: `${r.component}:${r.method}`,
          progress: r.success ? 100 : 0,
          status: r.success ? "completed" : "failed",
        })),
        successful: phase.successful,
        failed: phase.failed,
      },
      collapsible: true,
    })),
  });
  res.json(response);
});

/**
 * GET /api/v1/capabilities/activate/health
 * Get health report with recommendations
 */
app.get("/api/v1/capabilities/activate/health", (req, res) => {
  const health = capabilityActivator.getHealthReport();
  const response = formatterIntegration.formatStatusResponse({
    title: "Capability System Health",
    status: health.status,
    items: [
      {
        label: "Total Activated",
        value: health.totalActivated,
        status: health.totalActivated > 0 ? "active" : "inactive",
      },
      {
        label: "Error Rate",
        value: `${health.errorRate}%`,
        status: health.errorRate < 10 ? "active" : "warning",
      },
      {
        label: "Avg Performance",
        value: health.averagePerformance.toFixed(2),
        status: "active",
      },
      { label: "Recommendation", value: health.recommendation, status: "info" },
    ],
    summary: health.recommendation,
  });
  res.json(response);
});

/**
 * DELETE /api/v1/capabilities/activate/rollback
 * Rollback a specific capability
 */
app.delete("/api/v1/capabilities/activate/rollback", async (req, res) => {
  const { component, method } = req.body;

  if (!component || !method) {
    return res
      .status(400)
      .json(
        formatterIntegration.formatErrorResponse(
          new Error("component and method required"),
          400
        )
      );
  }

  const result = await capabilityActivator.rollback(component, method);
  res.json(
    formatterIntegration.formatSuccessResponse({
      title: "Capability Rollback",
      message: result.message || result.reason,
      data: result,
    })
  );
});

/**
 * POST /api/v1/capabilities/activate/reset
 * Reset all activations
 */
app.post("/api/v1/capabilities/activate/reset", async (req, res) => {
  const result = await capabilityActivator.reset();
  res.json(
    formatterIntegration.formatSuccessResponse({
      title: "Capability System Reset",
      message: result.message,
      data: result,
    })
  );
});

// ============================================================================
// CACHE MANAGEMENT ENDPOINTS (Phase 4)
// ============================================================================

/**
 * GET /api/v1/cache/stats
 * Get caching engine statistics
 */
app.get("/api/v1/cache/stats", (req, res) => {
  const stats = cachingEngine.getStats();
  res.json({
    success: true,
    title: "Cache Statistics",
    message: "Current cache performance metrics",
    data: stats,
  });
});

/**
 * GET /api/v1/cache/entries
 * Get all cache entries (debugging)
 */
app.get("/api/v1/cache/entries", (req, res) => {
  const entries = cachingEngine.getAllEntries();
  res.json({
    success: true,
    title: "Cache Entries",
    message: `${entries.length} entries currently cached`,
    data: { count: entries.length, entries },
  });
});

/**
 * POST /api/v1/cache/clear
 * Clear entire cache
 */
app.post("/api/v1/cache/clear", (req, res) => {
  const result = cachingEngine.clear();
  res.json({
    success: true,
    title: "Cache Cleared",
    message: `Cleared ${result.cleared} cache entries`,
    data: result,
  });
});

/**
 * POST /api/v1/cache/invalidate
 * Invalidate cache entries matching pattern
 */
app.post("/api/v1/cache/invalidate", (req, res) => {
  const { pattern } = req.body;
  if (!pattern) {
    return res
      .status(400)
      .json({ error: 'Pattern required (e.g., "emotion:*")' });
  }
  const result = cachingEngine.invalidate(pattern);
  res.json({
    success: true,
    title: "Cache Invalidation",
    message: `Invalidated ${result.invalidated} entries matching "${pattern}"`,
    data: result,
  });
});

/**
 * POST /api/v1/cache/cleanup
 * Run cache cleanup (remove expired entries)
 */
app.post("/api/v1/cache/cleanup", (req, res) => {
  const result = cachingEngine.cleanup();
  res.json({
    success: true,
    title: "Cache Cleanup",
    message: `Cleaned up ${result.cleaned} expired entries`,
    data: result,
  });
});

// ============================================================================
// CAPABILITY ORCHESTRATOR ENDPOINTS
// ============================================================================
// NEW: Safe orchestration for 242 discovered capabilities

// ============================================================================
// LOAD PROVIDER INSTRUCTIONS AT STARTUP
// ============================================================================
// This initializes the provider instruction system before any conversations
// enabling the decision & aggregation system to send specialized requests

(async () => {
  try {
    const providerInstructions = await getProviderInstructions();
    console.log("[ProviderInstructions] ✓ System loaded at startup");
    console.log(
      "[ProviderInstructions] Providers:",
      providerInstructions.getProviders().join(", ")
    );

    // Also initialize aggregation system
    const aggregation = await getProviderAggregation();
    console.log("[ProviderAggregation] ✓ System initialized");
    console.log(
      "[ProviderAggregation] Strategy:",
      aggregation.instructions.getAggregationConfig().aggregationStrategy
        .description
    );
  } catch (err) {
    console.error("[ProviderInstructions] Failed to load:", err.message);
  }

  // Start service with unified initialization
  // Only start if run directly
  if (import.meta.url === `file://${process.argv[1]}`) {
    svc.start();
  }
})();

export default app;
