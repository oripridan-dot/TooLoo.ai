import express from 'express';
import { orchestrator } from './orchestrator.js';

const app = express();
app.use(express.json());

/**
 * Start multi-instance deployment
 * POST /system/multi-instance/start
 */
app.post('/system/multi-instance/start', async (req, res) => {
  try {
    const { instances, shards } = req.body;
    const result = await orchestrator.start({ instances, shards });
    
    // Simulate some workload for testing
    setTimeout(() => {
      orchestrator.simulateWorkload(10000, 100); // 10 sec, 100 req/sec
    }, 100);
    
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Stop multi-instance deployment and get real stats
 * POST /system/multi-instance/stop
 */
app.post('/system/multi-instance/stop', async (req, res) => {
  try {
    const result = await orchestrator.stop();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get current status and real-time metrics
 * GET /system/multi-instance/status
 */
app.get('/system/multi-instance/status', (req, res) => {
  try {
    const status = orchestrator.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'orchestrator-api' });
});

const PORT = process.env.PORT || 3000;

// Only start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, () => {
    console.log(`🚀 Orchestrator API running on http://127.0.0.1:${PORT}`);
    console.log(`📊 Try: curl -X POST http://127.0.0.1:${PORT}/system/multi-instance/start`);
  });
}

export default app;
export { app, orchestrator };
