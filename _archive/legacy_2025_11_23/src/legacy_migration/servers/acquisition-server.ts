import express from 'express';
import cors from 'cors';
import MetaLearningEngine from '../engine/meta-learning-engine.js';
import fs from 'fs';
import path from 'path';
import environmentHub from '../engine/environment-hub.js';
import { ServiceFoundation } from '../lib/service-foundation.js';
import { DistributedTracer } from '../lib/distributed-tracer.js';

// Initialize service with unified middleware (replaces 35 LOC of boilerplate)
const svc = new ServiceFoundation('meta-server', process.env.META_PORT || 3002);
svc.setupMiddleware();
svc.registerHealthEndpoint();
svc.registerStatusEndpoint();

const app = svc.app;
const PORT = svc.port;

// Initialize distributed tracing (Phase 6C)
const tracer = new DistributedTracer({ serviceName: 'meta-server', samplingRate: 0.2 });
svc.environmentHub.registerComponent('tracer', tracer, ['observability', 'tracing', 'learning']);

const meta = new MetaLearningEngine({ workspaceRoot: process.cwd() });
environmentHub.registerComponent('metaLearningEngine', meta, ['meta-learning', 'reporting', 'insights']);

// API endpoints
app.post('/api/v4/meta-learning/start', async (req,res)=>{ try{ await meta.init(); const s=await meta.start(); res.json({ ok:true, status:s }); }catch(e){ res.status(500).json({ ok:false, error:e.message }); }});
app.post('/api/v4/meta-learning/run-all', async (req,res)=>{ try{ await meta.init(); const r=await meta.runAllPhases(); res.json({ ok:true, report:r }); }catch(e){ res.status(500).json({ ok:false, error:e.message }); }});
app.get('/api/v4/meta-learning/report', async (req,res)=>{ try{ await meta.init(); res.json({ ok:true, report: meta.getReport() }); }catch(e){ res.status(500).json({ ok:false, error:e.message }); }});
app.get('/api/v4/meta-learning/insights', async (req,res)=>{ try{ await meta.init(); res.json({ ok:true, insights: meta.getInsights() }); }catch(e){ res.status(500).json({ ok:false, error:e.message }); }});

// Knowledge endpoint: curated bibliography of published books (CS & Design)
app.get('/api/v4/meta-learning/knowledge', async (req,res)=>{
  try{
    const file = path.join(process.cwd(), 'data', 'knowledge', 'bibliography.json');
    const exists = fs.existsSync(file);
    if (!exists) return res.json({ ok:true, sources: [], note: 'No bibliography found' });
    const raw = await fs.promises.readFile(file, 'utf-8');
    const data = JSON.parse(raw);
    res.json({ ok:true, ...data });
  }catch(e){
    res.status(500).json({ ok:false, error:e.message });
  }
});

app.get('/api/v4/meta-learning/phase/:phaseNumber/report', async (req, res) => {
  try {
    await meta.init();
    const phaseNumber = Number(req.params.phaseNumber);
    if (!meta.phases[phaseNumber]) {
      return res.status(404).json({ ok: false, error: 'Phase not found' });
    }
    res.json({ ok: true, report: meta.phases[phaseNumber] });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/v4/meta-learning/activity-log', async (req, res) => {
  try {
    await meta.init();
    res.json({ ok: true, log: meta.activityLog });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/v4/meta-learning/metrics', async (req, res) => {
  try {
    await meta.init();
    res.json({ ok: true, metrics: meta.metrics });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Retention booster: small, safe bump to knowledge retention and transfer efficiency
app.post('/api/v4/meta-learning/boost-retention', async (req, res) => {
  try {
    await meta.init();
    const payload = req.body || {};
    const result = await meta.boostRetention({ retentionDelta: Number(payload.retentionDelta||0.05), transferDelta: Number(payload.transferDelta||0.04) });
    res.json({ ok:true, booster: result, metrics: meta.metrics });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Reset endpoint: clear saturation and restart meta-learning cycle
app.post('/api/v4/meta-learning/reset', async (req, res) => {
  try {
    await meta.init();
    const result = await meta.reset();
    res.json({ ok:true, result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Plateau detection endpoint: check if learning has plateaued
app.get('/api/v4/meta-learning/detect-plateau', async (req, res) => {
  try {
    await meta.init();
    const result = meta.detectPlateauAndAdapt();
    res.json({ ok: true, plateau: result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// PHASE 2A: Predictive plateau forecasting endpoint
app.get('/api/v4/meta-learning/predict-plateau', async (req, res) => {
  try {
    await meta.init();
    
    // Get prediction with optional confidence threshold
    const confidenceThreshold = Number(req.query.confidence) || 0.65;
    const prediction = meta.predictPlateauTiming(confidenceThreshold);
    
    res.json({
      ok: true,
      prediction,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// PHASE 2A: Trajectory analysis endpoint (shows trend data)
app.get('/api/v4/meta-learning/trajectory', async (req, res) => {
  try {
    await meta.init();
    
    // Get window size from query (default: 15 cycles)
    const windowSize = Number(req.query.window) || 15;
    const trajectory = meta.analyzeTrajectory(windowSize);
    
    // Also get forecast for context
    const forecast = meta.forecastMetrics(3);
    
    res.json({
      ok: true,
      trajectory,
      forecast,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// PHASE 2A: Predictive + Reactive check (integrated approach)
app.get('/api/v4/meta-learning/plateau-check', async (req, res) => {
  try {
    await meta.init();
    
    const confidenceThreshold = Number(req.query.confidence) || 0.70;
    const check = await meta.checkPlateauPredictiveAndReactive(confidenceThreshold);
    
    res.json({
      ok: true,
      check,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Auto-adapt endpoint: trigger adaptive strategy if plateau detected
app.post('/api/v4/meta-learning/auto-adapt', async (req, res) => {
  try {
    await meta.init();
    const result = await meta.checkPlateauAndAutoAdapt();
    res.json({ ok: true, adaptation: result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Continuous meta-learning: auto-cycle with plateau detection
let continuousMetaLearningActive = false;
let continuousMetaLearningHandle = null;

app.post('/api/v4/meta-learning/start-continuous', async (req, res) => {
  try {
    await meta.init();
    const payload = req.body || {};
    const intervalMs = Number(payload.intervalMs || 60000); // Default 1 minute
    const maxCycles = Number(payload.maxCycles || 0); // 0 = infinite

    if (continuousMetaLearningActive) {
      return res.json({ ok: false, error: 'Continuous meta-learning already active' });
    }

    continuousMetaLearningActive = true;
    let cycleCount = 0;

    const startMessage = `Starting continuous meta-learning: interval=${intervalMs}ms, maxCycles=${maxCycles || 'infinite'}`;
    meta.log(startMessage);
    
    console.log(`🔄 ${startMessage}`);

    // Start continuous cycle
    continuousMetaLearningHandle = setInterval(async () => {
      cycleCount++;
      console.log(`\n📊 Meta-Learning Cycle ${cycleCount}`);

      try {
        // Run all phases
        await meta.runAllPhases();

        // Check for plateau and auto-adapt
        const plateau = meta.detectPlateauAndAdapt();
        if (plateau.plateauDetected) {
          console.log('⚠️ Plateau detected - triggering adaptive strategy');
          await meta.triggerAdaptiveStrategy('aggressive');
        }

        // Check if max cycles reached
        if (maxCycles > 0 && cycleCount >= maxCycles) {
          console.log(`✅ Max cycles (${maxCycles}) reached - stopping continuous meta-learning`);
          clearInterval(continuousMetaLearningHandle);
          continuousMetaLearningActive = false;
          continuousMetaLearningHandle = null;
        }
      } catch (e) {
        console.error(`❌ Error in meta-learning cycle ${cycleCount}:`, e.message);
        meta.log(`Cycle ${cycleCount} failed: ${e.message}`);
      }
    }, intervalMs);

    res.json({
      ok: true,
      message: 'Continuous meta-learning started',
      config: { intervalMs, maxCycles: maxCycles || 'infinite' },
      firstCycleStartedAt: new Date().toISOString()
    });
  } catch (e) {
    continuousMetaLearningActive = false;
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Stop continuous meta-learning
app.post('/api/v4/meta-learning/stop-continuous', async (req, res) => {
  try {
    await meta.init();
    
    if (!continuousMetaLearningActive) {
      return res.json({ ok: false, error: 'Continuous meta-learning is not active' });
    }

    clearInterval(continuousMetaLearningHandle);
    continuousMetaLearningActive = false;
    continuousMetaLearningHandle = null;

    meta.log('Continuous meta-learning stopped');
    console.log('⏹️ Continuous meta-learning stopped');

    res.json({ ok: true, message: 'Continuous meta-learning stopped' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Status of continuous meta-learning
app.get('/api/v4/meta-learning/continuous-status', async (req, res) => {
  try {
    res.json({
      ok: true,
      continuousActive: continuousMetaLearningActive,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ===== PHASE 2B: PER-METRIC STRATEGIES ENDPOINTS =====

// Get available strategies for a specific metric
app.get('/api/v4/meta-learning/strategies/:metric', async (req, res) => {
  try {
    await meta.init();
    const metric = req.params.metric;
    const validMetrics = ['learningVelocity', 'adaptationSpeed', 'knowledgeRetention', 'transferEfficiency'];
    
    if (!validMetrics.includes(metric)) {
      return res.status(400).json({
        ok: false,
        error: `Invalid metric. Valid metrics: ${validMetrics.join(', ')}`
      });
    }
    
    // Get strategies from per-metric-strategies engine
    if (!meta.perMetricStrategies) {
      return res.status(503).json({ ok: false, error: 'Per-metric strategies engine not initialized' });
    }
    
    // Convert camelCase to method name: learningVelocity -> getLearningVelocityStrategies
    const getMethodName = `get${metric
      .split(/(?=[A-Z])/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('')}Strategies`;
    
    if (typeof meta.perMetricStrategies[getMethodName] === 'function') {
      const strategies = meta.perMetricStrategies[getMethodName]();
      res.json({
        ok: true,
        metric,
        strategies,
        count: strategies.length,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({ ok: false, error: `Method not found for metric: ${metric}` });
    }
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Analyze current metric state and recommend strategies
app.get('/api/v4/meta-learning/strategy-analysis', async (req, res) => {
  try {
    await meta.init();
    
    if (!meta.perMetricStrategies) {
      return res.status(503).json({ ok: false, error: 'Per-metric strategies engine not initialized' });
    }
    
    const analysis = {};
    const metrics = ['learningVelocity', 'adaptationSpeed', 'knowledgeRetention', 'transferEfficiency'];
    
    for (const metricName of metrics) {
      const currentValue = meta.metrics.current[metricName];
      const state = meta.perMetricStrategies.analyzeMetricState(currentValue);
      
      // Get recent deltas for trend detection
      const improvements = meta.metrics.improvements.filter(i => i.metric === metricName);
      const deltas = improvements.slice(-6).map(i => i.delta);
      const trend = meta.perMetricStrategies.calculateTrendDirection(deltas);
      
      // Select best strategy for this metric
      const strategy = meta.perMetricStrategies.selectStrategy(metricName, state, trend);
      
      analysis[metricName] = {
        currentValue,
        state,
        trend,
        recommendedStrategy: strategy,
        recentDeltas: deltas,
        confidence: 0.70 // Phase 2B default confidence threshold
      };
    }
    
    res.json({
      ok: true,
      analysis,
      timestamp: new Date().toISOString(),
      note: 'Strategies recommended based on metric state and recent trend'
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Manually trigger per-metric strategies (for testing/forced adaptation)
app.post('/api/v4/meta-learning/apply-strategy', async (req, res) => {
  try {
    await meta.init();
    
    if (!meta.perMetricStrategies) {
      return res.status(503).json({ ok: false, error: 'Per-metric strategies engine not initialized' });
    }
    
    const payload = req.body || {};
    const confidenceThreshold = Number(payload.confidence) || 0.70;
    
    // Apply per-metric strategies
    const result = await meta.applyPerMetricStrategies(confidenceThreshold);
    
    res.json({
      ok: true,
      adaptation: result,
      metrics: meta.metrics.current,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get historical effectiveness of strategies
app.get('/api/v4/meta-learning/strategy-effectiveness', async (req, res) => {
  try {
    await meta.init();
    
    if (!meta.perMetricStrategies) {
      return res.status(503).json({ ok: false, error: 'Per-metric strategies engine not initialized' });
    }
    
    const effectiveness = meta.perMetricStrategies.getEffectivenessSummary();
    
    res.json({
      ok: true,
      effectiveness,
      totalStrategiesApplied: effectiveness.history ? effectiveness.history.length : 0,
      timestamp: new Date().toISOString(),
      note: 'Tracks effectiveness of each per-metric strategy application'
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ===== PRODUCTION MONITORING ENDPOINTS =====

// Production dashboard: comprehensive status for monitoring
app.get('/api/v4/meta-learning/production-dashboard', async (req, res) => {
  try {
    await meta.init();
    
    // Get recent improvements to calculate velocity
    const recentImprovements = meta.metrics.improvements.slice(-10);
    const velocityTrend = recentImprovements.map(i => ({ at: i.at, delta: i.delta }));
    
    // Get last 3 phases for completeness
    const lastPhases = Object.entries(meta.phases)
      .map(([num, phase]) => ({
        phaseNumber: num,
        name: phase.name,
        status: phase.status,
        completedAt: phase.completedAt
      }))
      .filter(p => p.completedAt);
    
    const dashboard = {
      ok: true,
      systemStatus: {
        started: meta.started,
        continuousActive: continuousMetaLearningActive,
        lastUpdated: new Date().toISOString()
      },
      performance: {
        currentMetrics: meta.metrics.current,
        baselineMetrics: meta.metrics.baseline,
        totalImprovements: meta.metrics.improvements.length,
        recentVelocity: velocityTrend
      },
      phases: {
        completed: lastPhases.length,
        allPhases: meta.phases
      },
      health: {
        metricsHealthy: Object.values(meta.metrics.current).every(v => v >= 0 && v <= 1),
        phasesHealthy: Object.values(meta.phases).every(p => ['not_started', 'in_progress', 'completed'].includes(p.status)),
        logSize: meta.activityLog.length
      }
    };
    
    res.json(dashboard);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Metrics trend: recent improvement trajectory
app.get('/api/v4/meta-learning/metrics-trend', async (req, res) => {
  try {
    await meta.init();
    const limit = Number(req.query.limit) || 20;
    const trend = meta.metrics.improvements.slice(-limit).map(imp => ({
      phase: imp.phase,
      metric: imp.metric,
      delta: imp.delta,
      at: imp.at
    }));
    
    res.json({ ok: true, trend, count: trend.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Adaptation history: log of all auto-adaptations triggered
app.get('/api/v4/meta-learning/adaptation-history', async (req, res) => {
  try {
    await meta.init();
    const limit = Number(req.query.limit) || 20;
    
    // Filter activity log for adaptation-related entries
    const adaptations = meta.activityLog
      .filter(entry => entry.message.includes('adapt') || entry.message.includes('plateau') || entry.message.includes('boost'))
      .slice(-limit);
    
    res.json({ ok: true, adaptations, count: adaptations.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Performance metrics: system health check
app.get('/api/v4/meta-learning/performance', async (req, res) => {
  try {
    await meta.init();
    
    const perf = {
      ok: true,
      metrics: meta.metrics.current,
      improvements: {
        total: meta.metrics.improvements.length,
        recent: meta.metrics.improvements.slice(-5).reduce((sum, i) => sum + i.delta, 0),
        baseline: meta.metrics.baseline
      },
      phases: {
        total: 4,
        completed: Object.values(meta.phases).filter(p => p.status === 'completed').length
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        continuous: continuousMetaLearningActive
      }
    };
    
    res.json(perf);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Alerts: identify issues that need attention
app.get('/api/v4/meta-learning/alerts', async (req, res) => {
  try {
    await meta.init();
    const alerts = [];
    
    // Check for plateau
    const plateau = meta.detectPlateauAndAdapt();
    if (plateau.plateauDetected) {
      alerts.push({
        level: 'warning',
        type: 'plateau_detected',
        message: 'Learning velocity has plateaued',
        details: plateau,
        timestamp: new Date().toISOString()
      });
    }
    
    // Check for stuck phases
    const stuckPhases = Object.entries(meta.phases)
      .filter(([, p]) => p.status === 'in_progress' && p.startedAt)
      .filter(([, p]) => Date.now() - new Date(p.startedAt).getTime() > 60000); // Stuck > 60s
    
    stuckPhases.forEach(([num, phase]) => {
      alerts.push({
        level: 'critical',
        type: 'stuck_phase',
        message: `Phase ${num} (${phase.name}) appears to be stuck`,
        details: { phase: num, startedAt: phase.startedAt },
        timestamp: new Date().toISOString()
      });
    });
    
    // Check for metric anomalies (values outside 0-1 range)
    const anomalies = Object.entries(meta.metrics.current)
      .filter(([, v]) => v < 0 || v > 1);
    
    if (anomalies.length > 0) {
      alerts.push({
        level: 'warning',
        type: 'metric_anomaly',
        message: 'Metrics outside expected range [0, 1]',
        details: Object.fromEntries(anomalies),
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({ ok: true, alerts, count: alerts.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Persona Injection Endpoint
app.get('/api/v1/meta/persona', async (req, res) => {
  try {
    // In a real implementation, this would fetch from a database or analysis engine
    // For now, we return a default structure that can be enhanced
    const persona = {
      preferences: {
        conciseness: 'high',
        technicalLevel: 'expert',
        format: 'structured'
      },
      patterns: [
        'Prefers bullet points over paragraphs',
        'Values code examples',
        'Focuses on architecture and scalability'
      ],
      systemInstructions: [
        'Always provide file paths',
        'Use TypeScript for code examples',
        'Focus on performance implications'
      ]
    };
    
    res.json({ ok: true, persona });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Observability endpoint (Phase 6C)
app.get('/api/v1/system/observability', (req, res) => {
  res.json({
    service: 'meta-server',
    tracer: tracer.getMetrics(),
    circuitBreakers: svc.getCircuitBreakerStatus()
  });
});

svc.start();
