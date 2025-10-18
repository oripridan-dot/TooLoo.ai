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

// Archetype-specific gap severity weights for Phase 2
const ARCHETYPE_GAP_WEIGHTS = {
  'Fast Learner': {
    learningVelocity: 2.0,    // Prioritize fast-paced learning gaps
    domainGap: 1.2,
    frameworkAdoption: 1.8,
    asyncPatterns: 2.0,
    default: 1.5
  },
  'Specialist': {
    learningVelocity: 1.2,
    domainGap: 2.5,            // Prioritize deep domain expertise gaps
    frameworkAdoption: 1.1,
    asyncPatterns: 1.1,
    default: 1.0
  },
  'Power User': {
    learningVelocity: 1.5,
    domainGap: 1.2,
    frameworkAdoption: 1.8,    // Prioritize high-volume adoption gaps
    asyncPatterns: 1.6,
    default: 1.8
  },
  'Long-term Retainer': {
    learningVelocity: 1.2,
    domainGap: 1.2,
    frameworkAdoption: 1.5,
    asyncPatterns: 2.0,        // Prioritize foundational capability gaps
    default: 2.0
  },
  'Generalist': {
    learningVelocity: 1.0,
    domainGap: 1.0,
    frameworkAdoption: 1.0,
    asyncPatterns: 1.0,
    default: 1.0              // Standard severity (no modification)
  }
};

/**
 * Get weight multiplier for a gap component given cohort archetype
 */
function getGapWeight(archetype, componentName) {
  const weights = ARCHETYPE_GAP_WEIGHTS[archetype] || ARCHETYPE_GAP_WEIGHTS['Generalist'];
  
  // Check for exact component match
  if (weights[componentName]) {
    return weights[componentName];
  }
  
  // Check for partial matches
  const lowerComponent = componentName.toLowerCase();
  if (lowerComponent.includes('async')) return weights.asyncPatterns || weights.default;
  if (lowerComponent.includes('domain')) return weights.domainGap || weights.default;
  if (lowerComponent.includes('framework')) return weights.frameworkAdoption || weights.default;
  if (lowerComponent.includes('learning')) return weights.learningVelocity || weights.default;
  
  return weights.default;
}

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

// ==================== PHASE 2: PER-COHORT GAP ANALYSIS ====================

/**
 * Analyze capability gaps tailored to a specific cohort
 * Applies archetype-specific severity weights to prioritize relevant gaps
 */
async function analyzeGapsPerCohort(cohortId) {
  try {
    // 1. Fetch cohort traits (using Task 2 cache)
    const cohort = await fetchCohortTraits(cohortId);
    if (!cohort) {
      throw new Error(`Cohort not found: ${cohortId}`);
    }

    // 2. Fetch global gaps
    const capsData = await fetchService(CAPABILITIES_URL, '/api/v1/capabilities/status');
    if (!capsData) throw new Error('Capabilities service unavailable');

    const discoveredCapabilities = capsData.status?.componentStatus || {};
    const totalActivated = capsData.status?.totalActivated || 0;
    const totalDiscovered = capsData.status?.totalDiscovered || 0;

    // 3. Build gap list with archetype-modified severity
    const gaps = [];
    for (const [component, status] of Object.entries(discoveredCapabilities)) {
      const pending = (status.discovered || 0) - (status.activated || 0);
      if (pending > 0) {
        // Get base severity from pending ratio
        const baseSeverity = Math.min(1.0, pending / Math.max(1, status.discovered || 1));
        
        // Apply archetype-specific weight
        const archetypeWeight = getGapWeight(cohort.archetype, component);
        const archetypeModifiedSeverity = baseSeverity * archetypeWeight;
        
        // Normalize to reasonable scale (can exceed 1.0 due to weights)
        const normalizedSeverity = Math.min(2.5, archetypeModifiedSeverity);
        
        gaps.push({
          component,
          discovered: status.discovered || 0,
          activated: status.activated || 0,
          pending,
          baseSeverity: parseFloat(baseSeverity.toFixed(2)),
          archetypeWeight,
          archetypeModifiedSeverity: parseFloat(normalizedSeverity.toFixed(2)),
          urgency: normalizedSeverity > 1.5 ? 'critical' : 
                   normalizedSeverity > 0.8 ? 'high' : 
                   normalizedSeverity > 0.5 ? 'medium' : 'low',
          lastActivation: status.lastActivation,
          relevanceReason: generateGapReason(cohort.archetype, component, baseSeverity)
        });
      }
    }

    // 4. Sort by archetype-modified severity (highest first)
    gaps.sort((a, b) => b.archetypeModifiedSeverity - a.archetypeModifiedSeverity);

    // 5. Include top 10 gaps + aggregate stats
    const analysis = {
      timestamp: new Date().toISOString(),
      cohortId,
      archetype: cohort.archetype,
      cohortSize: cohort.size,
      cohortTraits: cohort.avgTraits,
      totalDiscovered,
      totalActivated,
      activationRate: totalDiscovered > 0 ? (totalActivated / totalDiscovered * 100).toFixed(2) + '%' : '0%',
      gaps: gaps.slice(0, 10),
      gapCount: gaps.length,
      criticalGaps: gaps.filter(g => g.urgency === 'critical').length,
      recommendedFocus: generateArchetypeRecommendation(cohort.archetype),
      estimatedROI: estimateROIMultiplier(cohort.archetype, gaps)
    };

    return analysis;
  } catch (error) {
    console.error(`Per-cohort gap analysis failed for ${cohortId}:`, error.message);
    throw error;
  }
}

/**
 * Generate human-readable reason why a gap is relevant to this cohort
 */
function generateGapReason(archetype, component, baseSeverity) {
  const reasons = {
    'Fast Learner': {
      async: 'High-priority for rapid async/await mastery',
      framework: 'Critical for framework adoption velocity',
      learning: 'Essential for accelerating capability adoption',
      default: 'Relevant to fast-paced learning trajectory'
    },
    'Specialist': {
      domain: 'Core to deep domain expertise development',
      async: 'Important for domain-specific async patterns',
      framework: 'Supports specialized framework knowledge',
      default: 'Part of focused domain specialization'
    },
    'Power User': {
      framework: 'High-value for broad capability adoption',
      async: 'Supports high-volume async operations',
      learning: 'Enables scaling to more capabilities',
      default: 'Relevant to expansive capability coverage'
    },
    'Long-term Retainer': {
      framework: 'Foundational for long-term capability retention',
      async: 'Core pattern for robust system design',
      learning: 'Essential for sustainable mastery',
      default: 'Important for durable capability foundation'
    },
    'Generalist': {
      default: 'Relevant to balanced skill development'
    }
  };

  const archetypeReasons = reasons[archetype] || reasons['Generalist'];
  const lowerComponent = component.toLowerCase();
  
  if (lowerComponent.includes('async')) return archetypeReasons.async || archetypeReasons.default;
  if (lowerComponent.includes('domain')) return archetypeReasons.domain || archetypeReasons.default;
  if (lowerComponent.includes('framework')) return archetypeReasons.framework || archetypeReasons.default;
  if (lowerComponent.includes('learning')) return archetypeReasons.learning || archetypeReasons.default;
  
  return archetypeReasons.default;
}

/**
 * Generate archetype-specific focus recommendation
 */
function generateArchetypeRecommendation(archetype) {
  const recommendations = {
    'Fast Learner': 'Focus on rapid-cycle training variants with high difficulty progression',
    'Specialist': 'Prioritize deep dives into top critical gaps within your domain',
    'Power User': 'Adopt high-volume workflows to expand capability breadth',
    'Long-term Retainer': 'Build strong foundations through spaced repetition patterns',
    'Generalist': 'Balance learning across identified gap areas'
  };
  return recommendations[archetype] || recommendations['Generalist'];
}

/**
 * Estimate potential ROI multiplier for this cohort based on archetype + gaps
 */
function estimateROIMultiplier(archetype, gaps) {
  const criticalCount = gaps.filter(g => g.urgency === 'critical').length;
  const baseMultiplier = {
    'Fast Learner': 1.8,
    'Specialist': 1.6,
    'Power User': 1.4,
    'Long-term Retainer': 1.5,
    'Generalist': 1.0
  };
  
  // Boost by 0.1x for every 3 critical gaps
  const boost = Math.floor(criticalCount / 3) * 0.1;
  const estimated = (baseMultiplier[archetype] || 1.0) + boost;
  
  return parseFloat(estimated.toFixed(2));
}

/**
 * Endpoint: POST /api/v1/bridge/gaps-per-cohort/:cohortId
 */
app.post('/api/v1/bridge/gaps-per-cohort/:cohortId', async (req, res) => {
  try {
    const { cohortId } = req.params;
    const analysis = await analyzeGapsPerCohort(cohortId);
    
    res.json({
      ok: true,
      analysis
    });
  } catch (error) {
    if (error.message.includes('Cohort not found')) {
      return res.status(404).json({
        ok: false,
        error: error.message
      });
    }
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * Endpoint: GET /api/v1/bridge/gaps-per-cohort/:cohortId
 * Retrieve cached or fresh per-cohort gap analysis
 */
app.get('/api/v1/bridge/gaps-per-cohort/:cohortId', async (req, res) => {
  try {
    const { cohortId } = req.params;
    const analysis = await analyzeGapsPerCohort(cohortId);
    
    res.json({
      ok: true,
      analysis
    });
  } catch (error) {
    if (error.message.includes('Cohort not found')) {
      return res.status(404).json({
        ok: false,
        error: error.message
      });
    }
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// ==================== COHORT-SPECIFIC WORKFLOW SUGGESTIONS ====================

/**
 * Score a workflow against cohort traits & gaps
 * Scoring formula: (40% domain affinity + 30% pace match + 20% engagement fit + 10% retention strength)
 */
function scoreWorkflowForCohort(workflow, cohort, gaps) {
  const traits = cohort.avgTraits || {};
  
  // 1. Domain Affinity Match (40%)
  // Workflows with domain-specific components score higher for specialists
  const domainComponents = (workflow.components || []).filter(c => 
    c.toLowerCase().includes('domain') || 
    c.toLowerCase().includes('pattern') ||
    c.toLowerCase().includes('specialized')
  );
  const domainScore = Math.min(1.0, (domainComponents.length / Math.max(workflow.components?.length || 1, 1)) * 1.2);
  const domainWeight = traits.domainAffinity || 0.5;
  const domainAdjusted = domainScore * 0.4 * domainWeight;

  // 2. Pace Match (30%)
  // Fast Learners prefer shorter, high-difficulty workflows
  // Methodical learners prefer longer, deeper dives
  const estimatedDuration = workflow.estimatedDuration || 600;
  const learningVelocity = traits.learningVelocity || 0.5;
  
  let paceScore = 0.5; // Baseline
  if (learningVelocity > 0.7 && estimatedDuration <= 300) {
    paceScore = 0.9; // Fast learner + short workshop = good fit
  } else if (learningVelocity < 0.4 && estimatedDuration >= 600) {
    paceScore = 0.85; // Slow learner + deep dive = good fit
  } else if (Math.abs(learningVelocity - 0.5) < 0.2) {
    paceScore = 0.8; // Moderate learner + moderate duration = good fit
  }
  const paceAdjusted = paceScore * 0.3;

  // 3. Engagement Fit (20%)
  // Workflows with hands-on activities score higher for high-interaction cohorts
  const hasInteractiveLabs = workflow.phases?.some(p => 
    p.type === 'hands-on' || p.type === 'lab' || (p.activities?.length || 0) > 0
  );
  const interactionFrequency = traits.interactionFrequency || 0.5;
  const engagementScore = hasInteractiveLabs ? interactionFrequency : (1 - interactionFrequency) * 0.6;
  const engagementAdjusted = engagementScore * 0.2;

  // 4. Retention Strength (10%)
  // Workflows targeting gaps with high severity get retention boost
  const topGapSeverity = gaps && gaps.length > 0 ? gaps[0].archetypeModifiedSeverity : 0.5;
  const retentionStrength = traits.retentionStrength || 0.5;
  const retentionBoost = Math.min(0.5, (topGapSeverity / 2.5) * retentionStrength);
  const retentionAdjusted = retentionBoost * 0.1;

  // 5. Total Score (0-1.0)
  const totalScore = domainAdjusted + paceAdjusted + engagementAdjusted + retentionAdjusted;

  return {
    score: parseFloat(Math.min(1.0, totalScore).toFixed(3)),
    breakdown: {
      domain: parseFloat(domainAdjusted.toFixed(3)),
      pace: parseFloat(paceAdjusted.toFixed(3)),
      engagement: parseFloat(engagementAdjusted.toFixed(3)),
      retention: parseFloat(retentionAdjusted.toFixed(3))
    }
  };
}

/**
 * Generate cohort-specific workflow recommendations
 */
async function suggestWorkflowsForCohort(cohortId) {
  try {
    // 1. Fetch cohort traits (with Task 2 cache)
    const cohort = await fetchCohortTraits(cohortId);
    if (!cohort) {
      throw new Error(`Cohort not found: ${cohortId}`);
    }

    // 2. Get per-cohort gap analysis
    const gapAnalysis = await analyzeGapsPerCohort(cohortId);
    const topGaps = gapAnalysis.gaps.slice(0, 5);

    // 3. Fetch all available workflows from Product Dev server
    const workflowsResp = await fetchService(PRODUCT_DEV_URL, '/api/v1/workflows/list');
    let workflows = workflowsResp?.workflows || [];

    // 4. Score each workflow against cohort + gaps
    const scoredWorkflows = workflows.map(workflow => {
      const scored = scoreWorkflowForCohort(workflow, cohort, gapAnalysis.gaps);
      return {
        ...workflow,
        scoredForCohort: {
          ...scored,
          matchedGaps: topGaps.filter(g => 
            (workflow.components || []).some(c => 
              c.toLowerCase().includes(g.component.split('-')[0])
            )
          ).map(g => ({ component: g.component, severity: g.archetypeModifiedSeverity }))
        }
      };
    });

    // 5. Sort by score and return top 5 with reasoning
    const topWorkflows = scoredWorkflows
      .sort((a, b) => (b.scoredForCohort.score || 0) - (a.scoredForCohort.score || 0))
      .slice(0, 5)
      .map(wf => ({
        workflowId: wf.id,
        name: wf.name,
        description: wf.description,
        estimatedDuration: wf.estimatedDuration,
        difficulty: wf.difficulty,
        matchScore: wf.scoredForCohort.score,
        scoreBreakdown: wf.scoredForCohort.breakdown,
        matchedGaps: wf.scoredForCohort.matchedGaps,
        recommendation: generateWorkflowRecommendation(
          cohort.archetype,
          wf.scoredForCohort.score,
          wf.scoredForCohort.matchedGaps
        ),
        recommendedOrder: scoredWorkflows.indexOf(wf) + 1
      }));

    return {
      timestamp: new Date().toISOString(),
      cohortId,
      archetype: cohort.archetype,
      cohortSize: cohort.size,
      topGaps: topGaps.map(g => ({ 
        component: g.component, 
        severity: g.archetypeModifiedSeverity, 
        urgency: g.urgency 
      })),
      suggestedWorkflows: topWorkflows,
      totalWorkflowsEvaluated: workflows.length,
      nextSteps: generateWorkflowNextSteps(cohort.archetype, topWorkflows)
    };
  } catch (error) {
    console.error(`Workflow suggestions failed for ${cohortId}:`, error.message);
    throw error;
  }
}

/**
 * Generate recommendation text for why a workflow is matched
 */
function generateWorkflowRecommendation(archetype, matchScore, matchedGaps) {
  if (matchScore >= 0.85) {
    const gapsList = matchedGaps.map(g => g.component).join(', ');
    return `Excellent match for ${archetype} - directly addresses ${gapsList}`;
  } else if (matchScore >= 0.70) {
    const primary = matchedGaps[0]?.component || 'key gaps';
    return `Good fit for ${archetype} - primarily targets ${primary}`;
  } else if (matchScore >= 0.50) {
    return `Moderate relevance for ${archetype} - supplements current learning focus`;
  } else {
    return `Consider as supplementary learning for ${archetype}`;
  }
}

/**
 * Generate next steps for workflow enrollment
 */
function generateWorkflowNextSteps(archetype, topWorkflows) {
  const workflow = topWorkflows[0];
  if (!workflow) {
    return 'No workflows available at this time';
  }

  const steps = [];
  if (archetype === 'Fast Learner') {
    steps.push('Start with the top-ranked workflow for rapid capability growth');
    steps.push('Complete modules 1-2 in parallel for accelerated pace');
  } else if (archetype === 'Specialist') {
    steps.push('Deep-dive into the top workflow to build domain expertise');
    steps.push('Complete all modules sequentially for thorough understanding');
  } else if (archetype === 'Power User') {
    steps.push('Enroll in top workflow, then immediately proceed to #2 and #3');
    steps.push('Manage multiple streams in parallel to maximize capability coverage');
  } else if (archetype === 'Long-term Retainer') {
    steps.push('Start with the top workflow - focus on consolidation');
    steps.push('Plan for multi-week engagement for long-term retention');
  } else {
    steps.push(`Begin with top workflow for ${archetype}`);
  }

  return steps;
}

/**
 * Endpoint: POST /api/v1/bridge/workflows-per-cohort/:cohortId
 * Suggest workflows tailored to cohort traits & gaps
 */
app.post('/api/v1/bridge/workflows-per-cohort/:cohortId', async (req, res) => {
  try {
    const { cohortId } = req.params;
    const suggestions = await suggestWorkflowsForCohort(cohortId);

    res.json({
      ok: true,
      suggestions
    });
  } catch (error) {
    if (error.message.includes('Cohort not found')) {
      return res.status(404).json({
        ok: false,
        error: error.message
      });
    }
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * Endpoint: GET /api/v1/bridge/workflows-per-cohort/:cohortId
 * Retrieve cached workflow suggestions for cohort
 */
app.get('/api/v1/bridge/workflows-per-cohort/:cohortId', async (req, res) => {
  try {
    const { cohortId } = req.params;
    const suggestions = await suggestWorkflowsForCohort(cohortId);

    res.json({
      ok: true,
      suggestions
    });
  } catch (error) {
    if (error.message.includes('Cohort not found')) {
      return res.status(404).json({
        ok: false,
        error: error.message
      });
    }
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
