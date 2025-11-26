// @version 2.1.54
import { Router } from "express";
import { request } from "../utils.js";

const router = Router();

// Initialize
router.post("/initialize", (req, res) => {
  request("nexus:orchestrator_init", req.body, res);
});

// Status
router.get("/status", (req, res) => {
  request("nexus:orchestrator_status", {}, res);
});

// Capability Map
router.get("/capability-map", (req, res) => {
  request("nexus:orchestrator_map", {}, res);
});

// Enable Autonomous
router.post("/enable-autonomous", (req, res) => {
  request("nexus:orchestrator_enable", req.body, res);
});

// Activate Cycle
router.post("/activate/cycle", (req, res) => {
  request("nexus:orchestrator_cycle", req.body, res);
});

// Add to Queue
router.post("/queue/add", (req, res) => {
  const { goal } = req.body;
  request("nexus:orchestrator_plan_update", { action: "add", item: goal }, res);
});

export default router;
