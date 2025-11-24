// @version 2.1.203
import { Router } from "express";
import { bus } from "../../core/event-bus.js";

const router = Router();

// Helper for Event Bus Request/Response
const request = (event: string, payload: any, res: any, timeout = 5000) => {
  const requestId =
    payload.requestId ||
    `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const responseListener = (evt: any) => {
    if (evt.payload.requestId === requestId) {
      res.json(evt.payload.response);
      bus.off(`cortex:${event.split(":")[1]}_response`, responseListener); // Assumes convention
    }
  };

  // Listen for specific response or generic response
  // For simplicity, we'll assume the response event is 'cortex:<action>_response'
  // But since we don't have a strict convention yet, let's use a specific response channel for the request ID if possible,
  // or just listen to a generic 'cortex:response' and filter by requestId.
  // Actually, let's use a dedicated response event name passed as arg or derived.

  // Better approach: Listen to 'cortex:response' with requestId
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

// Health Check
router.get("/health", (req, res) => {
  res.json({ status: "ok", system: "Synapsys", module: "nexus" });
});

// Chat Message Endpoint (Legacy & New)
router.post(["/chat/message", "/chat/synthesis"], (req, res) => {
  request("nexus:chat_request", req.body, res, 30000);
});

// Projects Endpoints
router.get("/projects", (req, res) => {
  request("nexus:project_list_request", {}, res);
});

router.post("/projects", (req, res) => {
  request("nexus:project_create_request", req.body, res);
});

router.get("/projects/:id", (req, res) => {
  request("nexus:project_details_request", { projectId: req.params.id }, res);
});

router.post("/projects/:id/memory", (req, res) => {
  request(
    "nexus:project_memory_update",
    { projectId: req.params.id, ...req.body },
    res,
  );
});

// Intervention Endpoints
router.post("/intervention/mode", (req, res) => {
  // { enabled: boolean }
  bus.publish("nexus", "nexus:intervention:set_mode", req.body);
  res.json({
    ok: true,
    mode: req.body.enabled ? "intervention" : "autonomous",
  });
});

router.post("/intervention/pause", (req, res) => {
  bus.publish("nexus", "nexus:intervention:pause", {});
  res.json({ ok: true, status: "paused" });
});

router.post("/intervention/resume", (req, res) => {
  bus.publish("nexus", "nexus:intervention:resume", {});
  res.json({ ok: true, status: "resumed" });
});

export default router;
