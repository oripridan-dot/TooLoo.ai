// @version 2.1.11
import { Router } from "express";
import { bus } from "../../core/event-bus.js";

const router = Router();

// Helper for Event Bus Request/Response (Duplicated from api.ts for now, should be shared util)
const request = (event: string, payload: any, res: any, timeout = 5000) => {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const listener = (evt: any) => {
    if (evt.payload.requestId === requestId) {
      if (evt.payload.error) {
        res
          .status(evt.payload.status || 500)
          .json({ error: evt.payload.error });
      } else {
        res.json(evt.payload.data || evt.payload.response);
      }
      bus.off("cortex:response", listener);
    }
  };

  bus.on("cortex:response", listener);

  bus.publish("nexus", event, { ...payload, requestId });

  setTimeout(() => {
    bus.off("cortex:response", listener);
    if (!res.headersSent) {
      res.status(504).json({ error: "Request timed out" });
    }
  }, timeout);
};

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

export default router;
