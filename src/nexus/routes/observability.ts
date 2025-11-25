import { Router } from "express";
import { tracer } from "../../cortex/tracer.js";

const router = Router();

// Get all traces (summary)
router.get("/traces", (req, res) => {
  const traces = tracer.getTraces().map((t) => ({
    id: t.id,
    goal: t.goal,
    startTime: t.startTime,
    endTime: t.endTime,
    status: t.status,
    stepCount: t.steps.length,
  }));
  res.json({ ok: true, data: traces });
});

// Get specific trace details
router.get("/traces/:id", (req, res) => {
  const trace = tracer.getTrace(req.params.id);
  if (!trace) {
    return res.status(404).json({ ok: false, error: "Trace not found" });
  }
  res.json({ ok: true, data: trace });
});

export default router;
