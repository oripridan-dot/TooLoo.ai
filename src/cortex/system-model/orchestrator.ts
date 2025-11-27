#!/usr/bin/env node
// @version 2.1.28

/**
 * TooLoo.ai Orchestrator v5 (TypeScript Optimized)
 * High-performance, parallel-capable service orchestration.
 */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Resolve to workspace root (assuming src/cortex/system-model/orchestrator.ts)
const PROJECT_ROOT = path.resolve(__dirname, "../../..");

// ============================================================================
// SERVICE REGISTRY (Trinity Architecture)
// ============================================================================

interface Service {
  id: string;
  name: string;
  file: string;
  ports: number[];
  primaryPort: number;
  envVars: Record<string, string>;
  priority: number;
  healthEndpoint: string;
  timeout: number;
  dependencies: string[];
}

const SERVICE_REGISTRY: Service[] = [
  // --- NEXUS (Interface) ---
  {
    id: "web-interface",
    name: "web-server",
    file: "src/nexus/interface/web-server.ts",
    ports: [3000],
    primaryPort: 3000,
    envVars: { WEB_PORT: "3000" },
    priority: 1,
    healthEndpoint: "/health",
    timeout: 60000,
    dependencies: [],
  },
  {
    id: "reports",
    name: "reports-server",
    file: "src/nexus/interface/reports-server.ts",
    ports: [3008],
    primaryPort: 3008,
    envVars: { REPORTS_PORT: "3008" },
    priority: 2,
    healthEndpoint: "/health",
    timeout: 60000,
    dependencies: ["web-interface"],
  },
  {
    id: "projects",
    name: "project-server",
    file: "src/legacy_migration/servers/project-server.ts",
    ports: [3011],
    primaryPort: 3011,
    envVars: { PROJECT_SERVER_PORT: "3011" },
    priority: 2,
    healthEndpoint: "/health",
    timeout: 60000,
    dependencies: [],
  },

  // --- PRECOG (Resources & Prediction) ---
  {
    id: "budget",
    name: "budget-server",
    file: "src/precog/oracle/budget-server.ts",
    ports: [3003],
    primaryPort: 3003,
    envVars: { BUDGET_PORT: "3003" },
    priority: 2,
    healthEndpoint: "/health",
    timeout: 60000,
    dependencies: [],
  },
  {
    id: "training",
    name: "training-server",
    // Note: training-server was moved to src/precog/training/ but might be named differently or inside a legacy wrapper?
    // Checking previous moves: mv src/servers/training-server.ts ... src/precog/training/
    file: "src/precog/training/training-server.ts",
    ports: [3001],
    primaryPort: 3001,
    envVars: { TRAINING_PORT: "3001" },
    priority: 3,
    healthEndpoint: "/health",
    timeout: 60000,
    dependencies: [],
  },

  // --- CORTEX (Logic & Memory) ---
  {
    id: "capabilities",
    name: "capabilities-server",
    file: "src/cortex/system-model/capabilities-server.ts",
    ports: [3009],
    primaryPort: 3009,
    envVars: { CAPABILITIES_PORT: "3009" },
    priority: 1,
    healthEndpoint: "/health",
    timeout: 60000,
    dependencies: [],
  },
  {
    id: "planning",
    name: "product-development-server",
    file: "src/cortex/planning/product-development-server.ts",
    ports: [3006],
    primaryPort: 3006,
    envVars: { PRODUCT_PORT: "3006" },
    priority: 3,
    healthEndpoint: "/health",
    timeout: 60000,
    dependencies: ["capabilities"],
  },
  {
    id: "memory",
    name: "segmentation-server",
    file: "src/cortex/memory/segmentation-server.ts",
    ports: [3007],
    primaryPort: 3007,
    envVars: { SEGMENTATION_PORT: "3007" },
    priority: 2,
    healthEndpoint: "/health",
    timeout: 60000,
    dependencies: [],
  },
];

// ============================================================================
// UTILITIES
// ============================================================================

async function checkHealth(service: Service) {
  try {
    const url = `http://127.0.0.1:${service.primaryPort}${service.healthEndpoint}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    return response.status === 200;
  } catch (e: unknown) {
    return false;
  }
}

async function waitForDependencies(service: Service, maxWaitMs = 30000) {
  const depServices = service.dependencies
    .map((depId: string) => SERVICE_REGISTRY.find((s) => s.id === depId))
    .filter((s): s is Service => !!s);

  if (depServices.length === 0) return true;

  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const allHealthy = await Promise.all(
      depServices.map((dep: Service) => checkHealth(dep)),
    );

    if (allHealthy.every((h) => h)) return true;

    // Fast polling for dependencies (200ms)
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

async function spawnService(service: Service) {
  const filePath = path.join(PROJECT_ROOT, service.file);

  if (!fs.existsSync(filePath)) {
    console.error(`  ❌ FILE MISSING: ${filePath}`);
    return false;
  }

  // Wait for dependencies first
  const depsReady = await waitForDependencies(service);
  if (!depsReady) {
    console.error(`  ❌ ${service.name} dependency timeout`);
    return false;
  }

  const env = {
    ...process.env,
    ...service.envVars,
    NODE_ENV: process.env.NODE_ENV || "production",
  };

  return new Promise((resolve) => {
    // USE TSX for TypeScript execution
    const proc = spawn("npx", ["tsx", filePath], {
      env,
      stdio: "inherit",
      cwd: PROJECT_ROOT,
      detached: false,
    });

    let isHealthy = false;
    // Fast polling for startup (250ms)
    const healthCheckInterval = setInterval(async () => {
      if (!isHealthy && (await checkHealth(service))) {
        isHealthy = true;
        clearInterval(healthCheckInterval);
        console.log(`  ✅ ${service.name} is READY`);
        resolve(true);
      }
    }, 250);

    proc.on("error", (err) => {
      clearInterval(healthCheckInterval);
      console.error(`  ❌ ${service.name} ERROR: ${err.message}`);
      resolve(false);
    });

    // Timeout
    setTimeout(() => {
      if (!isHealthy) {
        clearInterval(healthCheckInterval);
        console.error(`  ⏱️  ${service.name} TIMEOUT`);
        resolve(false);
      }
    }, service.timeout);
  });
}

// ============================================================================
// ORCHESTRATOR API SERVER (Port 3123)
// ============================================================================

function startOrchestratorServer() {
  const app = express();
  const PORT = 3123;

  app.use(cors());
  app.use(bodyParser.json());

  // Health Check
  app.get("/health", (req, res) => {
    res.json({ ok: true, service: "orchestrator", status: "active" });
  });

  // System Routes
  app.get("/api/v1/system/routes", (req, res) => {
    const routes = SERVICE_REGISTRY.map((s) => ({
      service: s.name,
      port: s.primaryPort,
      health: `http://127.0.0.1:${s.primaryPort}${s.healthEndpoint}`,
    }));
    res.json({ ok: true, routes });
  });

  // System Priority
  app.post("/api/v1/system/priority/chat", (req, res) => {
    console.log("Orchestrator: Switching to CHAT priority");
    res.json({ ok: true, mode: "chat-priority" });
  });

  app.post("/api/v1/system/priority/background", (req, res) => {
    console.log("Orchestrator: Switching to BACKGROUND priority");
    res.json({ ok: true, mode: "background-priority" });
  });

  // System Status
  app.get("/api/v1/system/status", (req, res) => {
    res.json({
      ok: true,
      status: { services: SERVICE_REGISTRY.length, active: true },
    });
  });

  // System Processes (for Control Room)
  app.get("/api/v1/system/processes", async (req, res) => {
    const processes = await Promise.all(
      SERVICE_REGISTRY.map(async (s) => {
        const isHealthy = await checkHealth(s);
        return {
          name: s.name,
          port: s.primaryPort,
          status: isHealthy ? "running" : "stopped",
          pid: "?", // We don't track PIDs easily here yet
          uptime: 0, // Placeholder
        };
      }),
    );
    res.json({ ok: true, processes });
  });

  // System Capabilities (for Control Room)
  app.get("/api/v1/system/real-capabilities", (req, res) => {
    res.json({
      ok: true,
      capabilities: [
        {
          name: "Orchestration",
          description: "Service management",
          status: "active",
        },
        {
          name: "Web Interface",
          description: "User interaction",
          status: "active",
        },
        {
          name: "Budget Manager",
          description: "Cost control",
          status: "active",
        },
        {
          name: "Project Memory",
          description: "Context retention",
          status: "active",
        },
      ],
    });
  });

  // System Config (for Control Room)
  app.get("/api/v1/system/config", (req, res) => {
    res.json({
      ok: true,
      settings: [
        { name: "Environment", value: process.env.NODE_ENV || "development" },
        { name: "Orchestrator Port", value: PORT },
        { name: "Web Port", value: process.env.WEB_PORT || 3000 },
      ],
    });
  });

  app.listen(PORT, () => {
    console.log(`✨ Orchestrator API listening on port ${PORT}`);
  });
}

async function startAllServices() {
  console.log("\n TooLoo.ai Orchestrator v5 - Starting Clusters...\n");

  startOrchestratorServer();

  const sorted = [...SERVICE_REGISTRY].sort((a, b) => a.priority - b.priority);

  for (const service of sorted) {
    // No artificial delay here - go as fast as possible
    await spawnService(service);
  }

  console.log("\n✨ All services spawned.\n");
}

// ============================================================================
// MAIN
// ============================================================================

// Graceful shutdown
process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));

startAllServices().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
