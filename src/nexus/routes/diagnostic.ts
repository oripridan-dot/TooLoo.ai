// @version 2.2.362
/**
 * System Diagnostic Endpoint
 * Tests all connections from origin to endpoint and back for the entire system
 */
import { Router } from 'express';
import { cortex } from '../../cortex/index.js';
import { precog } from '../../precog/index.js';
import metricsCollector from '../../core/metrics-collector.js';
import { tracer } from '../../cortex/tracer.js';

const router = Router();

interface DiagnosticResult {
  component: string;
  status: 'healthy' | 'degraded' | 'failed';
  latency?: number;
  error?: string;
  details?: any;
}

interface DiagnosticReport {
  timestamp: string;
  overallStatus: 'healthy' | 'degraded' | 'failed';
  duration: number;
  results: DiagnosticResult[];
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    failed: number;
  };
}

/**
 * Test a component with timeout and error handling
 */
async function testComponent(
  name: string,
  testFn: () => Promise<any>,
  timeoutMs: number = 5000
): Promise<DiagnosticResult> {
  const startTime = Date.now();

  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), timeoutMs);
    });

    const result = await Promise.race([testFn(), timeoutPromise]);
    const latency = Date.now() - startTime;

    return {
      component: name,
      status: latency > timeoutMs * 0.8 ? 'degraded' : 'healthy',
      latency,
      details: result,
    };
  } catch (error: any) {
    return {
      component: name,
      status: 'failed',
      latency: Date.now() - startTime,
      error: error.message || String(error),
    };
  }
}

/**
 * Comprehensive system diagnostic
 */
router.get('/system/diagnostic', async (req, res) => {
  const startTime = Date.now();
  const results: DiagnosticResult[] = [];

  console.log('[Diagnostic] Starting comprehensive system check...');

  // 1. Test Cortex Core
  results.push(
    await testComponent('Cortex Core', async () => {
      if (!cortex) throw new Error('Cortex not initialized');
      return { initialized: true, components: Object.keys(cortex) };
    })
  );

  // 2. Test Hippocampus (Memory System)
  results.push(
    await testComponent('Hippocampus Memory', async () => {
      const hippocampus = cortex?.hippocampus;
      if (!hippocampus) throw new Error('Hippocampus not available');

      // Test knowledge graph
      const stats = hippocampus.knowledgeGraph?.getGraphStatistics?.();
      if (!stats) throw new Error('Knowledge graph not operational');

      return {
        nodes: stats.nodes?.total || 0,
        edges: stats.edges?.total || 0,
        learningHistory: stats.learningHistory || 0,
      };
    })
  );

  // 3. Test Short-Term Memory (Vector Store)
  results.push(
    await testComponent('Short-Term Memory (Vector Store)', async () => {
      const vectorStore = cortex?.hippocampus?.vectorStore;
      if (!vectorStore) throw new Error('Vector store not available');

      // Test vector operations
      const testQuery = 'diagnostic test query';
      const searchResults = await vectorStore.search(testQuery, 1);

      return {
        operational: true,
        canSearch: true,
        resultsReturned: searchResults?.length || 0,
      };
    })
  );

  // 4. Test Long-Term Memory (Knowledge Graph)
  results.push(
    await testComponent('Long-Term Memory (Knowledge Graph)', async () => {
      const knowledgeGraph = cortex?.hippocampus?.knowledgeGraph;
      if (!knowledgeGraph) throw new Error('Knowledge graph not available');

      const exportData = knowledgeGraph.exportGraphData?.();
      if (!exportData) throw new Error('Cannot export graph data');

      return {
        nodes: exportData.nodes?.length || 0,
        edges: exportData.edges?.length || 0,
        goals: exportData.goals?.length || 0,
        providers: exportData.providers?.length || 0,
      };
    })
  );

  // 5. Test Precog (Provider Engine)
  results.push(
    await testComponent('Precog Provider Engine', async () => {
      if (!precog) throw new Error('Precog not initialized');

      const providerStatus = precog.providers?.getProviderStatus?.();
      if (!providerStatus) throw new Error('Cannot get provider status');

      return providerStatus;
    })
  );

  // 6. Test AI Providers
  const providerNames = ['openai', 'claude', 'gemini', 'deepseek'];
  for (const providerName of providerNames) {
    results.push(
      await testComponent(
        `AI Provider: ${providerName}`,
        async () => {
          const provider = precog.providers?.getProvider?.(providerName);
          if (!provider) {
            return { available: false, reason: 'Provider not registered' };
          }

          // Check if API key is configured
          const envVarName = `${providerName.toUpperCase()}_API_KEY`;
          const hasApiKey = !!process.env[envVarName];

          return {
            available: true,
            configured: hasApiKey,
            provider: providerName,
          };
        },
        3000
      )
    );
  }

  // 7. Test Tracer
  results.push(
    await testComponent('Tracer System', async () => {
      if (!tracer) throw new Error('Tracer not initialized');

      const traces = tracer.getTraces?.() || [];
      const activeTraces = traces.filter((t) => t.status === 'running');

      return {
        totalTraces: traces.length,
        activeTraces: activeTraces.length,
        operational: true,
      };
    })
  );

  // 8. Test Metrics Collector
  results.push(
    await testComponent('Metrics Collector', async () => {
      if (!metricsCollector) throw new Error('Metrics collector not available');

      const overview = metricsCollector.getSystemOverview?.();
      if (!overview) throw new Error('Cannot get system overview');

      return overview;
    })
  );

  // 9. Test Exploration Engine
  results.push(
    await testComponent('Exploration Engine', async () => {
      const explorationEngine = cortex?.explorationEngine;
      if (!explorationEngine) {
        return { available: false, reason: 'Not initialized' };
      }

      return { available: true, operational: true };
    })
  );

  // 10. Test Feedback System
  results.push(
    await testComponent('Feedback System', async () => {
      const feedbackEngine = cortex?.providerFeedbackEngine;
      if (!feedbackEngine) {
        return { available: false, reason: 'Not initialized' };
      }

      return { available: true, operational: true };
    })
  );

  // Calculate summary
  const summary = {
    total: results.length,
    healthy: results.filter((r) => r.status === 'healthy').length,
    degraded: results.filter((r) => r.status === 'degraded').length,
    failed: results.filter((r) => r.status === 'failed').length,
  };

  // Determine overall status
  let overallStatus: 'healthy' | 'degraded' | 'failed' = 'healthy';
  if (summary.failed > results.length * 0.3) {
    overallStatus = 'failed';
  } else if (summary.failed > 0 || summary.degraded > results.length * 0.2) {
    overallStatus = 'degraded';
  }

  const report: DiagnosticReport = {
    timestamp: new Date().toISOString(),
    overallStatus,
    duration: Date.now() - startTime,
    results,
    summary,
  };

  console.log(
    `[Diagnostic] Check complete: ${overallStatus.toUpperCase()} (${summary.healthy}/${summary.total} healthy)`
  );

  res.json({
    ok: overallStatus !== 'failed',
    data: report,
  });
});

/**
 * Quick health check endpoint
 */
router.get('/system/health', async (req, res) => {
  try {
    const checks = {
      cortex: !!cortex,
      precog: !!precog,
      hippocampus: !!cortex?.hippocampus,
      knowledgeGraph: !!cortex?.hippocampus?.knowledgeGraph,
      vectorStore: !!cortex?.hippocampus?.vectorStore,
      tracer: !!tracer,
    };

    const allHealthy = Object.values(checks).every((v) => v === true);

    res.json({
      ok: true,
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    });
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      status: 'failed',
      error: error.message,
    });
  }
});

/**
 * Test individual component
 */
router.get('/system/test/:component', async (req, res) => {
  const { component } = req.params;

  let result: DiagnosticResult;

  switch (component.toLowerCase()) {
    case 'memory':
      result = await testComponent('Memory System', async () => {
        const hippocampus = cortex?.hippocampus;
        if (!hippocampus) throw new Error('Hippocampus not available');

        const stats = hippocampus.knowledgeGraph?.getGraphStatistics?.();
        const vectorStore = hippocampus.vectorStore;

        return {
          knowledgeGraph: stats || { error: 'Not available' },
          vectorStore: vectorStore ? { available: true } : { available: false },
        };
      });
      break;

    case 'providers':
      result = await testComponent('Provider Engine', async () => {
        if (!precog) throw new Error('Precog not initialized');
        const status = precog.providers?.getProviderStatus?.();
        return status || { error: 'Status unavailable' };
      });
      break;

    case 'cortex':
      result = await testComponent('Cortex Core', async () => {
        if (!cortex) throw new Error('Cortex not initialized');
        return {
          initialized: true,
          components: Object.keys(cortex),
        };
      });
      break;

    default:
      return res.status(404).json({
        ok: false,
        error: `Unknown component: ${component}`,
        availableComponents: ['memory', 'providers', 'cortex'],
      });
  }

  res.json({
    ok: result.status !== 'failed',
    data: result,
  });
});

export default router;
