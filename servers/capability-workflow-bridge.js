#!/usr/bin/env node

/**
 * Capability-Workflow Bridge Service (Port 3010)
 * 
 * Phase 1: Capability-Driven Workflow Loop
 * 
 * Couples three services to create closed-loop artifact learning:
 * - Capabilities (3009) → discovered methods & activation status
 * - Product Development (3006) → workflows & artifacts
 * - Training (3001) → selection engine & performance metrics
 * 
 * Flow: capability gap → workflow suggestion → training variant → performance feedback → capability update
 * 
 * Routes:
 * GET /api/v1/bridge/status - Overall coupling status
 * POST /api/v1/bridge/analyze-gaps - Analyze capability gaps vs workflows
 * GET /api/v1/bridge/suggested-workflows - Get workflow suggestions for active gaps
 * POST /api/v1/bridge/enqueue-training - Feed workflow as training variant
 * POST /api/v1/bridge/feedback - Record training outcome → update capabilities
 * GET /api/v1/bridge/loop-status - View closed-loop progression
 */

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.CAPABILITY_BRIDGE_PORT || 3010;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const CAPABILITIES_URL = process.env.CAPABILITIES_URL || 'http://127.0.0.1:3009';
const PRODUCT_DEV_URL = process.env.PRODUCT_DEV_URL || 'http://127.0.0.1:3006';
const TRAINING_URL = process.env.TRAINING_URL || 'http://127.0.0.1:3001';
const SEGMENTATION_URL = process.env.SEGMENTATION_URL || 'http://127.0.0.1:3007';

// Phase 2: Cohort trait cache (5-min TTL)
const cohortTraitsCache = {};
const COHORT_CACHE_TTL = 300000; // 5 minutes

// In-memory state
const state = {
  gapAnalysisCache: null,
  suggestedWorkflows: new Map(),
  trainingQueue: [],
  loopHistory: [],
  lastAnalysis: null,
  stats: {
    gapsDetected: 0,
    workflowsSuggested: 0,
    trainingEnqueued: 0,
    feedbackProcessed: 0,
    capabilitiesUpdated: 0
  }
};

// Data persistence
const DATA_DIR = path.join(process.cwd(), 'data', 'bridge');
const STATE_FILE = path.join(DATA_DIR, 'bridge-state.json');

async function initializeStorage() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await loadPersistedState();
    console.log('🌉 Bridge data storage initialized');
  } catch (error) {
    console.warn('⚠️ Bridge storage init failed:', error.message);
  }
}

async function loadPersistedState() {
  try {
    const data = await fs.readFile(STATE_FILE, 'utf8');
    const persisted = JSON.parse(data);
    Object.assign(state, persisted);
    console.log(`📂 Restored bridge state: ${persisted.stats?.gapsDetected || 0} gaps, ${persisted.stats?.workflowsSuggested || 0} suggestions`);
  } catch (error) {
    console.log('📝 Starting with empty bridge state');
  }
}

async function persistState() {
  try {
    const payload = {
      gapAnalysisCache: state.gapAnalysisCache,
      suggestedWorkflows: Array.from(state.suggestedWorkflows.entries()),
      trainingQueue: state.trainingQueue,
      loopHistory: state.loopHistory.slice(-100), // keep last 100
      lastAnalysis: state.lastAnalysis,
      stats: state.stats
    };
    await fs.writeFile(STATE_FILE, JSON.stringify(payload, null, 2));
  } catch (error) {
    console.error('Failed to persist bridge state:', error.message);
  }
}

// ==================== PHASE 2: COHORT CONTEXT ====================

/**
 * Fetch cohort traits from segmentation-server
 * Implements 5-minute caching to reduce load
 */
async function fetchCohortTraits(cohortId) {
  // Check cache
  if (cohortTraitsCache[cohortId]) {
    const cached = cohortTraitsCache[cohortId];
    if (Date.now() - cached.fetchedAt < COHORT_CACHE_TTL) {
      return cached.data;
    }
    delete cohortTraitsCache[cohortId];
  }

  try {
    const response = await fetch(
      `${SEGMENTATION_URL}/api/v1/segmentation/cohorts/${cohortId}`,
      { timeout: 5000 }
    );
    
    if (!response.ok) {
      console.warn(`[bridge] Cohort fetch failed: ${response.status} for ${cohortId}`);
      return null;
    }

    const data = await response.json();
    if (data.ok && data.cohort) {
      // Cache with TTL
      cohortTraitsCache[cohortId] = {
        data: data.cohort,
        fetchedAt: Date.now()
      };
      
      // Set automatic cleanup
      setTimeout(() => {
        delete cohortTraitsCache[cohortId];
      }, COHORT_CACHE_TTL);

      return data.cohort;
    }
  } catch (error) {
    console.warn(`[bridge] Failed to fetch cohort traits for ${cohortId}:`, error.message);
  }

  return null;
}

/**
 * Pre-warm cohort cache on startup
 * Fetches all available cohorts to reduce latency on first request
 */
async function warmCohortCache() {
  try {
    const response = await fetch(`${SEGMENTATION_URL}/api/v1/segmentation/cohorts`, {
      timeout: 5000
    });

    if (response.ok) {
      const data = await response.json();
      if (data.ok && data.cohorts) {
        data.cohorts.forEach((cohort) => {
          cohortTraitsCache[cohort.id] = {
            data: cohort,
            fetchedAt: Date.now()
          };
        });
        console.log(`✅ Warmed cohort cache: ${data.cohorts.length} cohorts preloaded`);
      }
    }
  } catch (error) {
    console.warn('[bridge] Cohort cache warmup failed:', error.message);
  }
}

/**
 * Get user's cohort from segmentation-server (future enhancement)
 * Currently for future-proofing; will be used when user profiles available
 */
async function getUserCohortId(userId) {
  try {
    // Future: Implement user → cohort mapping
    // For now, returns null (use explicit cohortId parameter)
    return null;
  } catch (error) {
    console.error(`[bridge] Failed to get cohort for user ${userId}:`, error.message);
    return null;
  }
}

// ==================== SERVICE DISCOVERY & HEALTH ====================

async function fetchService(url, endpoint, options = {}) {
  try {
    const response = await fetch(`${url}${endpoint}`, {
      timeout: 5000,
      ...options
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch ${url}${endpoint}:`, error.message);
    return null;
  }
}

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    server: 'capability-workflow-bridge',
    port: PORT,
    time: new Date().toISOString(),
    phase2: {
      cohortContextEnabled: true,
      cohortsCached: Object.keys(cohortTraitsCache).length,
      segmentationUrl: SEGMENTATION_URL
    }
  });
});

// ==================== GAP ANALYSIS ====================

async function analyzeCapabilityGaps() {
  try {
    // 1. Fetch discovered capabilities
    const capsData = await fetchService(CAPABILITIES_URL, '/api/v1/capabilities/status');
    if (!capsData) throw new Error('Capabilities service unavailable');

    const discoveredCapabilities = capsData.status?.componentStatus || {};
    const totalActivated = capsData.status?.totalActivated || 0;
    const totalDiscovered = capsData.status?.totalDiscovered || 0;

    // 2. Fetch all workflows
    const prodData = await fetchService(PRODUCT_DEV_URL, '/api/v1/workflows');
    if (!prodData) throw new Error('Product development service unavailable');

    const workflows = prodData.workflows || [];

    // 3. Identify gaps: activated < discovered in each component
    const gaps = [];
    for (const [component, status] of Object.entries(discoveredCapabilities)) {
      const pending = (status.discovered || 0) - (status.activated || 0);
      if (pending > 0) {
        gaps.push({
          component,
          discovered: status.discovered || 0,
          activated: status.activated || 0,
          pending,
          lastActivation: status.lastActivation,
          priority: component === 'autonomousEvolutionEngine' ? 'high' : 'medium'
        });
      }
    }

    // 4. Suggest workflows for each gap
    const suggestions = {};
    for (const gap of gaps) {
      const relevantWorkflows = workflows.filter(w => {
        const matchesGap = w.description?.toLowerCase().includes(gap.component.toLowerCase()) ||
                          w.tags?.some(t => t.includes(gap.component));
        return matchesGap;
      });
      suggestions[gap.component] = relevantWorkflows.slice(0, 3); // top 3
    }

    const analysis = {
      timestamp: new Date().toISOString(),
      totalDiscovered,
      totalActivated,
      activationRate: totalDiscovered > 0 ? (totalActivated / totalDiscovered * 100).toFixed(2) + '%' : '0%',
      gaps: gaps.sort((a, b) => b.pending - a.pending),
      suggestions,
      workflowsAvailable: workflows.length
    };

    state.gapAnalysisCache = analysis;
    state.lastAnalysis = new Date().toISOString();
    state.stats.gapsDetected += gaps.length;

    await persistState();
    return analysis;
  } catch (error) {
    console.error('Gap analysis failed:', error.message);
    throw error;
  }
}

app.post('/api/v1/bridge/analyze-gaps', async (req, res) => {
  try {
    const analysis = await analyzeCapabilityGaps();
    res.json({
      ok: true,
      analysis
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// ==================== WORKFLOW SUGGESTIONS ====================

app.get('/api/v1/bridge/suggested-workflows', async (req, res) => {
  try {
    if (!state.gapAnalysisCache) {
      const analysis = await analyzeCapabilityGaps();
      state.gapAnalysisCache = analysis;
    }

    const { component } = req.query;
    const suggestions = state.gapAnalysisCache.suggestions || {};

    let filtered = suggestions;
    if (component) {
      filtered = { [component]: suggestions[component] || [] };
    }

    res.json({
      ok: true,
      suggestions: filtered,
      total: Object.values(filtered).flat().length,
      lastAnalysis: state.lastAnalysis
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// ==================== TRAINING ENQUEUE ====================

async function enqueueWorkflowAsTrainingVariant(workflowId, metadata = {}) {
  try {
    // Fetch workflow details
    const workflowResp = await fetchService(PRODUCT_DEV_URL, `/api/v1/workflows/${workflowId}`);
    if (!workflowResp?.workflow) throw new Error('Workflow not found');

    const workflow = workflowResp.workflow;

    // Create training variant
    const trainingVariant = {
      id: `train-${workflow.id}-${Date.now()}`,
      workflowId: workflow.id,
      type: 'artifact-driven',
      source: 'capability-bridge',
      description: workflow.description || `Training from ${workflow.name}`,
      targetCapabilities: metadata.targetCapabilities || [],
      steps: workflow.phases?.map(p => ({
        name: p.name,
        description: p.description,
        estimatedDuration: p.estimatedDuration || 300
      })) || [],
      expectedOutcome: metadata.expectedOutcome || 'Capability activation',
      createdAt: new Date().toISOString()
    };

    // Enqueue in training server
    const response = await fetch(`${TRAINING_URL}/api/v1/training/enqueue-variant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trainingVariant)
    });

    if (!response.ok) {
      console.warn(`Training enqueue returned ${response.status}`);
    }

    state.trainingQueue.push(trainingVariant);
    state.stats.trainingEnqueued++;

    await persistState();
    return trainingVariant;
  } catch (error) {
    console.error('Failed to enqueue training variant:', error.message);
    throw error;
  }
}

app.post('/api/v1/bridge/enqueue-training', async (req, res) => {
  try {
    const { workflowId, metadata } = req.body;
    if (!workflowId) {
      return res.status(400).json({
        ok: false,
        error: 'workflowId required'
      });
    }

    const variant = await enqueueWorkflowAsTrainingVariant(workflowId, metadata);
    res.json({
      ok: true,
      variant,
      queueLength: state.trainingQueue.length
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// ==================== FEEDBACK LOOP CLOSURE ====================

async function processFeedback(trainingId, performanceOutcome) {
  try {
    const variant = state.trainingQueue.find(v => v.id === trainingId);
    if (!variant) {
      throw new Error(`Training variant ${trainingId} not found in queue`);
    }

    // Extract performance metrics
    const { success, capabilitiesActivated = [], improvementPercent = 0 } = performanceOutcome;

    // Update capabilities server with outcomes
    const feedbackPayload = {
      source: 'capability-bridge',
      workflowId: variant.workflowId,
      trainingId,
      success,
      capabilitiesActivated,
      improvementPercent,
      timestamp: new Date().toISOString()
    };

    // POST feedback to capabilities server (if it has feedback endpoint)
    const feedbackResp = await fetch(`${CAPABILITIES_URL}/api/v1/capabilities/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedbackPayload)
    }).catch(() => null);

    // Record in loop history
    state.loopHistory.push({
      timestamp: new Date().toISOString(),
      workflowId: variant.workflowId,
      trainingId,
      feedback: feedbackPayload,
      capabilitiesUpdated: capabilitiesActivated.length
    });

    state.stats.feedbackProcessed++;
    state.stats.capabilitiesUpdated += capabilitiesActivated.length;

    await persistState();

    return {
      ok: true,
      feedback: feedbackPayload,
      loopClosed: true
    };
  } catch (error) {
    console.error('Failed to process feedback:', error.message);
    throw error;
  }
}

app.post('/api/v1/bridge/feedback', async (req, res) => {
  try {
    const { trainingId, performanceOutcome } = req.body;
    if (!trainingId || !performanceOutcome) {
      return res.status(400).json({
        ok: false,
        error: 'trainingId and performanceOutcome required'
      });
    }

    const result = await processFeedback(trainingId, performanceOutcome);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// ==================== STATUS & MONITORING ====================

app.get('/api/v1/bridge/status', async (req, res) => {
  try {
    // Check service health
    const capsHealth = await fetchService(CAPABILITIES_URL, '/health');
    const prodHealth = await fetchService(PRODUCT_DEV_URL, '/health');
    const trainHealth = await fetchService(TRAINING_URL, '/health');

    res.json({
      ok: true,
      bridge: {
        status: 'operational',
        port: PORT,
        uptime: process.uptime(),
        stats: state.stats
      },
      services: {
        capabilities: {
          url: CAPABILITIES_URL,
          healthy: capsHealth?.ok || false,
          time: capsHealth?.time
        },
        productDevelopment: {
          url: PRODUCT_DEV_URL,
          healthy: prodHealth?.ok || false,
          time: prodHealth?.time
        },
        training: {
          url: TRAINING_URL,
          healthy: trainHealth?.ok || false,
          time: trainHealth?.time
        }
      },
      lastAnalysis: state.lastAnalysis,
      cacheAge: state.gapAnalysisCache ? 
        new Date(Date.now() - new Date(state.gapAnalysisCache.timestamp)) : null
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

app.get('/api/v1/bridge/loop-status', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const history = state.loopHistory.slice(-parseInt(limit));

    res.json({
      ok: true,
      loopHistory: history,
      stats: state.stats,
      queuedTrainingVariants: state.trainingQueue.length
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// ==================== STARTUP & SHUTDOWN ====================

const server = app.listen(PORT, async () => {
  await initializeStorage();
  await warmCohortCache(); // Phase 2: Warm cohort cache
  console.log(`🌉 Capability-Workflow Bridge listening on port ${PORT}`);
  console.log(`📡 Connected services:`);
  console.log(`   • Capabilities: ${CAPABILITIES_URL}`);
  console.log(`   • Product Development: ${PRODUCT_DEV_URL}`);
  console.log(`   • Training: ${TRAINING_URL}`);
  console.log(`   • Segmentation: ${SEGMENTATION_URL} (Phase 2: Cohort context)`);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Bridge shutting down...');
  await persistState();
  server.close();
});

export default app;
