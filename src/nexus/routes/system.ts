// @version 2.1.331
import { Router } from "express";
import { bus } from "../../core/event-bus.js";
import { successResponse, errorResponse } from "../utils.js";
import fs from "fs-extra";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const router = Router();

// Helper to execute shell commands (duplicated from github.ts for independence)
async function execCommand(command: string, cwd: string = process.cwd()) {
  try {
    const { stdout, stderr } = await execAsync(command, { cwd });
    return { stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error: any) {
    throw new Error(error.stderr || error.message);
  }
}

// System Status
router.get("/status", (req, res) => {
  // In Synapsys, we are always "active" if this code runs
  res.json(
    successResponse({
      services: 3, // Cortex, Precog, Nexus
      active: true,
      architecture: "Synapsys V2.1",
      modules: {
        cortex: { status: "loaded", role: "Cognitive Core" },
        precog: { status: "loaded", role: "Predictive Intelligence" },
        nexus: { status: "loaded", role: "Interface Layer" },
      },
    }),
  );
});

// System Awareness
router.get("/awareness", (req, res) => {
  res.json(
    successResponse({
      identity: "TooLoo.ai",
      architecture: "Synapsys V2.1",
      capabilities: {
        selfModification: true,
        githubIntegration: true,
        autonomousPlanning: true,
      },
      services: {
        cortex: "active",
        precog: "active",
        nexus: "active",
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || "development",
        cwd: process.cwd(),
      },
    }),
  );
});

// System Introspection
router.get("/introspect", (req, res) => {
  const memoryUsage = process.memoryUsage();
  res.json(
    successResponse({
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + "MB",
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + "MB",
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + "MB",
        },
      },
      modules: {
        cortex: { status: "loaded", role: "Cognitive Core" },
        precog: { status: "loaded", role: "Predictive Intelligence" },
        nexus: { status: "loaded", role: "Interface Layer" },
      },
    }),
  );
});

// Self-Patch (Self-Modification)
router.post("/self-patch", async (req, res) => {
  const { action, file, content, message, branch, createPr } = req.body;

  if (!action) {
    return res.status(400).json(errorResponse("Action required"));
  }

  try {
    if (action === "analyze") {
      // Just check if file exists and return info
      if (!file) return res.status(400).json(errorResponse("File required"));
      const fullPath = path.resolve(process.cwd(), file);
      const exists = await fs.pathExists(fullPath);
      res.json(
        successResponse({
          file,
          exists,
          path: fullPath,
          writable: true, // Assuming we have write access
        }),
      );
    } else if (action === "create" || action === "update") {
      if (!file || content === undefined) {
        return res.status(400).json(errorResponse("File and content required"));
      }

      try {
        // 1. Write the file (Direct Commit / Local Change)
        // Use SmartFS for safe writing
        await smartFS.writeSafe(file, content);

        // 2. Handle GitHub Integration if requested
        let prUrl = null;
        if (createPr && message) {
          const targetBranch = branch || `patch-${Date.now()}`;

          // Create branch
          await execCommand(`git checkout -b ${targetBranch}`);

          // Commit
          await execCommand(`git add "${file}"`);
          await execCommand(`git commit -m "${message}"`);

          // Push & PR
          await execCommand(`git push -u origin ${targetBranch}`);
          const { stdout } = await execCommand(
            `gh pr create --title "${message}" --body "Auto-generated patch by TooLoo.ai" --head ${targetBranch} --base main`,
          );
          prUrl = stdout;

          // Switch back to main (optional, depending on workflow)
          await execCommand(`git checkout main`);
        }

        bus.publish("nexus", "system:self_patch", {
          action,
          file,
          message: message || "Self-patch applied",
          prUrl,
        });

        res.json(
          successResponse({
            message: `File ${file} ${action === "create" ? "created" : "updated"}`,
            prUrl,
          }),
        );
      } catch (e: any) {
        return res.status(500).json(errorResponse(e.message));
      }
    } else {
      res.status(400).json(errorResponse("Invalid action"));
    }
  } catch (error: any) {
    res.status(500).json(errorResponse(error.message));
  }
});

// System Processes (Mocking the old response for compatibility)
router.get("/processes", (req, res) => {
  res.json(
    successResponse({
      processes: [
        {
          name: "nexus",
          port: 3000,
          status: "running",
          pid: process.pid,
          uptime: process.uptime(),
        },
        {
          name: "cortex",
          port: "internal",
          status: "running",
          pid: process.pid,
          uptime: process.uptime(),
        },
        {
          name: "precog",
          port: "internal",
          status: "running",
          pid: process.pid,
          uptime: process.uptime(),
        },
      ],
    }),
  );
});

// System Priority
router.post("/priority/chat", (req, res) => {
  bus.publish("nexus", "system:priority_change", { mode: "chat-priority" });
  res.json(successResponse({ mode: "chat-priority" }));
});

router.post("/priority/background", (req, res) => {
  bus.publish("nexus", "system:priority_change", {
    mode: "background-priority",
  });
  res.json(successResponse({ mode: "background-priority" }));
});

// System Config
router.get("/config", (req, res) => {
  res.json(
    successResponse({
      settings: [
        { name: "Environment", value: process.env.NODE_ENV || "development" },
        { name: "Web Port", value: process.env.PORT || 3000 },
        { name: "Architecture", value: "Synapsys" },
      ],
    }),
  );
});

// Real Capabilities (Mock)
router.get("/real-capabilities", (req, res) => {
  res.json(
    successResponse({
      capabilities: [
        {
          name: "Cognitive Core",
          description: "Reasoning & Planning",
          status: "active",
        },
        {
          name: "Predictive Engine",
          description: "Optimization & Forecasting",
          status: "active",
        },
        {
          name: "Nexus Interface",
          description: "API & Web Serving",
          status: "active",
        },
      ],
    }),
  );
});

// SmartFS Routes
import { smartFS } from "../../core/fs-manager.js";

router.get("/fs/context", async (req, res) => {
  try {
    const { path: filePath } = req.query;

    if (!filePath || typeof filePath !== "string") {
      res.status(400).json(errorResponse("File path is required"));
      return;
    }

    const bundle = await smartFS.getGoldenPlate(filePath);

    res.json(successResponse(bundle));
  } catch (error: any) {
    res.status(404).json(errorResponse(error.message));
  }
});

router.post("/fs/transaction", (req, res) => {
  const id = smartFS.startTransaction();
  res.json(successResponse({ transactionId: id }));
});

router.post("/fs/rollback", async (req, res) => {
  const { transactionId } = req.body;
  if (!transactionId) {
    res.status(400).json(errorResponse("Transaction ID required"));
    return;
  }

  const success = await smartFS.rollback(transactionId);
  res.json(
    successResponse({
      success,
      message: success ? "System restored" : "Transaction not found",
    }),
  );
});

router.post("/fs/commit", (req, res) => {
  const { transactionId } = req.body;
  smartFS.commit(transactionId);
  res.json(successResponse({ success: true }));
});

export default router;
