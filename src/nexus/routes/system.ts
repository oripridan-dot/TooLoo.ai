// @version 2.1.11
import { Router } from "express";
import { bus } from "../../core/event-bus.js";

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

export default router;
