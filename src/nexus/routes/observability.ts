import { Router } from 'express';
import { tracer } from '../../cortex/tracer.js';
import { cortex } from '../../cortex/index.js';
import metricsCollector from '../../core/metrics-collector.js';

const router = Router();

// Get System Metrics
router.get('/metrics', (req, res) => {
  try {
    const metrics = metricsCollector.getSystemOverview();
    res.json({ ok: true, data: metrics });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get all traces (summary)
router.get('/traces', (req, res) => {
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
router.get('/traces/:id', (req, res) => {
  const trace = tracer.getTrace(req.params.id);
  if (!trace) {
    return res.status(404).json({ ok: false, error: 'Trace not found' });
  }
  res.json({ ok: true, data: trace });
});

// Get Knowledge Graph Stats
router.get('/knowledge-graph', (req, res) => {
  try {
    // Null-safe access to knowledge graph
    const knowledgeGraph = cortex?.hippocampus?.knowledgeGraph;
    const vectorStore = cortex?.hippocampus?.vectorStore;

    // Get comprehensive stats
    const stats = knowledgeGraph?.getGraphStatistics?.() || {
      nodes: { total: 0, goals: 0, providers: 0, tasks: 0 },
      edges: { total: 0, byType: {} },
      correlations: 0,
      learningHistory: 0,
    };

    // Get provider performance summary
    const providers = knowledgeGraph?.getGoalPerformanceSummary?.('interaction') || {
      providers: [],
    };

    // Get active traces to determine system load/activity
    const traces = tracer?.getTraces?.() || [];
    const activeTraces = traces.filter((t) => t.status === 'running');
    const isBusy = activeTraces.length > 0;
    const activeProvider = activeTraces.length > 0 ? 'synapsys' : null;

    // Memory system health
    const memoryHealth = {
      shortTerm: {
        available: !!vectorStore,
        operational: !!vectorStore?.search,
      },
      longTerm: {
        available: !!knowledgeGraph,
        nodes: stats.nodes?.total || 0,
        edges: stats.edges?.total || 0,
        memories: stats.learningHistory || 0,
      },
    };

    // Calculate real inspection metrics
    // Bias score: based on provider error rates and knowledge graph diversity
    const nodeTypes = (stats.nodes as any)?.byType || {};
    const typeCount = Object.keys(nodeTypes).length;
    const totalNodes = stats.nodes?.total || 1;
    // More diverse node types = lower bias
    const diversityScore = typeCount > 0 ? Math.min(1, typeCount / 10) : 0;
    const biasScore = Math.max(0.01, (1 - diversityScore) * 0.1);

    // Plan efficiency: based on correlations and edge connectivity
    const edgeCount = stats.edges?.total || 0;
    const correlations = stats.correlations || 0;
    // More edges and correlations per node = better efficiency
    const connectivityRatio = totalNodes > 0 ? edgeCount / totalNodes : 0;
    const planEfficiency = Math.min(
      0.99,
      0.5 + connectivityRatio * 0.1 + (correlations > 0 ? 0.2 : 0)
    );

    // System stress: based on active traces
    const systemStress = Math.min(1, activeTraces.length / 10);

    res.json({
      ok: true,
      data: {
        stats,
        providers,
        status: {
          busy: isBusy,
          activeCount: activeTraces.length,
          activeProvider,
        },
        memory: memoryHealth,
        // Real Inspection Metrics (calculated from actual system state)
        inspection: {
          biasScore: Number(biasScore.toFixed(4)),
          planEfficiency: Number(planEfficiency.toFixed(3)),
          systemStress: Number(systemStress.toFixed(3)),
          diversityScore: Number(diversityScore.toFixed(3)),
          connectivityRatio: Number(connectivityRatio.toFixed(3)),
        },
      },
    });
  } catch (e: any) {
    console.error('[Observability] Knowledge graph error:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get Extended System Health - Real metrics
router.get('/health-extended', async (req, res) => {
  try {
    const knowledgeGraph = cortex?.hippocampus?.knowledgeGraph;
    const traces = tracer?.getTraces?.() || [];
    const activeTraces = traces.filter((t) => t.status === 'running');

    // Get real stats for calculations
    const stats = knowledgeGraph?.getGraphStatistics?.() || {
      nodes: { total: 0, byType: {} },
      edges: { total: 0 },
      correlations: 0,
    };

    // Calculate real metrics (same logic as knowledge-graph endpoint)
    const nodeTypes = (stats.nodes as any)?.byType || {};
    const typeCount = Object.keys(nodeTypes).length;
    const totalNodes = stats.nodes?.total || 1;
    const diversityScore = typeCount > 0 ? Math.min(1, typeCount / 10) : 0;
    const biasScore = Math.max(0.01, (1 - diversityScore) * 0.1);

    const edgeCount = stats.edges?.total || 0;
    const correlations = stats.correlations || 0;
    const connectivityRatio = totalNodes > 0 ? edgeCount / totalNodes : 0;
    const planEfficiency = Math.min(
      0.99,
      0.5 + connectivityRatio * 0.1 + (correlations > 0 ? 0.2 : 0)
    );

    const systemStress = Math.min(1, activeTraces.length / 10);

    res.json({
      ok: true,
      data: {
        biasScore: Number(biasScore.toFixed(4)),
        planEfficiency: Number(planEfficiency.toFixed(3)),
        systemStress: Number(systemStress.toFixed(3)),
        lastInspection: new Date().toISOString(),
        details: {
          activeTraces: activeTraces.length,
          totalNodes,
          edgeCount,
          diversityScore: Number(diversityScore.toFixed(3)),
        },
      },
    });
  } catch (e: any) {
    console.error('[Observability] Health-extended error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
