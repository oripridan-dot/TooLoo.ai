import { Router } from "express";
import { tracer } from "../../cortex/tracer.js";
import { cortex } from "../../cortex/index.js";
import metricsCollector from "../../core/metrics-collector.js";

const router = Router();

// Get System Metrics
router.get("/metrics", (req, res) => {
  try {
    const metrics = metricsCollector.getSystemOverview();
    res.json({ ok: true, data: metrics });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

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

// Get Knowledge Graph Stats
router.get("/knowledge-graph", (req, res) => {
  try {
    const stats = cortex.hippocampus.knowledgeGraph.getGraphStatistics();
    const providers =
      cortex.hippocampus.knowledgeGraph.getGoalPerformanceSummary(
        "interaction",
      );
    res.json({ ok: true, data: { stats, providers } });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
