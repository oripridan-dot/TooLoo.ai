// @version 2.1.230
import { Router } from "express";
import { bus } from "../../core/event-bus.js";
import fs from "fs-extra";
import path from "path";

const router = Router();

// System Status
router.get("/status", (req, res) => {
  // In Synapsys, we are always "active" if this code runs
  res.json({
    ok: true,
    status: {
      services: 3, // Cortex, Precog, Nexus
      active: true,
      architecture: "Synapsys V2.1",
    },
  });
});

// System Awareness
router.get("/awareness", (req, res) => {
  res.json({
    ok: true,
    awareness: {
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
    },
  });
});

// System Introspection
router.get("/introspect", (req, res) => {
  const memoryUsage = process.memoryUsage();
  res.json({
    ok: true,
    introspection: {
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
    },
  });
});

// Self-Patch (Self-Modification)
router.post("/self-patch", async (req, res) => {
  const { action, file, content, message } = req.body;

  if (!action) {
    return res.status(400).json({ ok: false, error: "Action required" });
  }

  try {
    if (action === "analyze") {
      // Just check if file exists and return info
      if (!file)
        return res.status(400).json({ ok: false, error: "File required" });
      const fullPath = path.resolve(process.cwd(), file);
      const exists = await fs.pathExists(fullPath);
      res.json({
        ok: true,
        analysis: {
          file,
          exists,
          path: fullPath,
          writable: true, // Assuming we have write access
        },
      });
    } else if (action === "create" || action === "update") {
      if (!file || content === undefined) {
        return res
          .status(400)
          .json({ ok: false, error: "File and content required" });
      }
      const fullPath = path.resolve(process.cwd(), file);

      // Security check: prevent writing outside workspace
      if (!fullPath.startsWith(process.cwd())) {
        return res.status(403).json({ ok: false, error: "Access denied" });
      }

      await fs.outputFile(fullPath, content);

      bus.publish("nexus", "system:self_patch", {
        action,
        file,
        message: message || "Self-patch applied",
      });

      res.json({
        ok: true,
        message: `File ${file} ${action === "create" ? "created" : "updated"}`,
      });
    } else {
      res.status(400).json({ ok: false, error: "Invalid action" });
    }
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// System Processes (Mocking the old response for compatibility)
router.get("/processes", (req, res) => {
  res.json({
    ok: true,
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
  });
});

// System Priority
router.post("/priority/chat", (req, res) => {
  bus.publish("nexus", "system:priority_change", { mode: "chat-priority" });
  res.json({ ok: true, mode: "chat-priority" });
});

router.post("/priority/background", (req, res) => {
  bus.publish("nexus", "system:priority_change", {
    mode: "background-priority",
  });
  res.json({ ok: true, mode: "background-priority" });
});

// System Config
router.get("/config", (req, res) => {
  res.json({
    ok: true,
    settings: [
      { name: "Environment", value: process.env.NODE_ENV || "development" },
      { name: "Web Port", value: process.env.PORT || 3000 },
      { name: "Architecture", value: "Synapsys" },
    ],
  });
});

// Real Capabilities (Mock)
router.get("/real-capabilities", (req, res) => {
  res.json({
    ok: true,
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
  });
});

// SmartFS Routes
import { smartFS } from "../../core/fs-manager.js";

router.get('/fs/context', async (req, res) => {
    try {
        const { path: filePath } = req.query;
        
        if (!filePath || typeof filePath !== 'string') {
             res.status(400).json({ error: 'File path is required' });
             return;
        }

        const bundle = await smartFS.getGoldenPlate(filePath);
        
        res.json({
            success: true,
            data: bundle
        });
    } catch (error: any) {
        res.status(404).json({ success: false, error: error.message });
    }
});

router.post('/fs/transaction', (req, res) => {
    const id = smartFS.startTransaction();
    res.json({ success: true, transactionId: id });
});

router.post('/fs/rollback', async (req, res) => {
    const { transactionId } = req.body;
    if (!transactionId) {
         res.status(400).json({ error: 'Transaction ID required' });
         return;
    }

    const success = await smartFS.rollback(transactionId);
    res.json({ success, message: success ? 'System restored' : 'Transaction not found' });
});

router.post('/fs/commit', (req, res) => {
    const { transactionId } = req.body;
    smartFS.commit(transactionId);
    res.json({ success: true });
});

export default router;
