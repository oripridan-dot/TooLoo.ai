#!/usr/bin/env node

/**
 * Segmentation Server (Port 3007)
 * Unified endpoint for conversation segmentation, pattern extraction, and trait aggregation
 * 
 * Routes:
 * POST /api/v1/segmentation/analyze - Full analysis pipeline
 * GET /api/v1/segmentation/status - Engine status and health
 * POST /api/v1/segmentation/configure - Update configuration
 */

import express from 'express';
import cors from 'cors';
import { segment, LABELS } from '../engine/segmenter.js';
import SegmentationUnifier from '../engine/segmentation-unifier.js';
import SemanticSegmentation from '../engine/semantic-segmentation.js';
import { default as SemanticTraitsAnalyzer } from '../engine/semantic-traits-analyzer.js';
import { ServiceFoundation } from '../lib/service-foundation.js';
import { DistributedTracer } from '../lib/distributed-tracer.js';

// Initialize service with unified middleware (replaces 25 LOC of boilerplate)
const svc = new ServiceFoundation('segmentation-server', process.env.SEGMENTATION_PORT || 3007);
svc.setupMiddleware();
svc.registerHealthEndpoint();
svc.registerStatusEndpoint();

const app = svc.app;
const PORT = svc.port;

// Initialize distributed tracing (Phase 6C)
const tracer = new DistributedTracer({ serviceName: 'segmentation-server', samplingRate: 0.15 });
svc.environmentHub.registerComponent('tracer', tracer, ['observability', 'tracing', 'segmentation']);

// Initialize semantic segmentation engine
const semanticEngine = new SemanticSegmentation();

// Initialize segmentation unifier with available strategies
const unifier = new SegmentationUnifier({
  strategies: {
    'rule-basic': async (messages) => {
      const result = segment(messages);
      return result.segments.map(seg => ({
        start: 0, // Will be calculated from messageId
        end: messages.length - 1,
        title: seg.label,
        summary: `${seg.label} segment with confidence ${seg.confidence}`
      }));
    },
    'rule-advanced': async (messages) => {
      // Enhanced rule-based with better boundary detection
      const result = segment(messages, { minScore: 0.4 });
      return result.segments.map(seg => ({
        start: 0,
        end: messages.length - 1,
        title: seg.label,
        summary: `Advanced ${seg.label} segment`
      }));
    },
    'semantic-llm': async (messages) => {
      // LLM-powered semantic analysis
      const analysis = await semanticEngine.analyzeConversation(messages);
      return analysis.segments.map(seg => ({
        start: seg.start,
        end: seg.end,
        title: seg.title,
        summary: seg.summary,
        phase: seg.phase,
        intent: seg.intent,
        emotionalState: seg.emotionalState
      }));
    }
  }
});

// Pattern extraction (mock implementation for MVP)
function extractPatterns(segments, messages) {
  const patterns = [];
  segments.forEach((segment, idx) => {
    const confidence = Math.random() * 0.3 + 0.7; // 0.7-1.0
    const frequency = Math.floor(Math.random() * 5) + 1;
    const recency = Math.random() * 0.5;
    const distinctiveness = Math.random() * 0.4 + 0.6;
    
    patterns.push({
      patterns: [segment.title.toLowerCase().replace(/\s+/g, '-')],
      segmentId: `s${idx + 1}`,
      windowStart: segment.start,
      windowEnd: segment.end,
      texts: messages.slice(segment.start, segment.end + 1).map(m => m.content || ''),
      features: { confidence, frequency, recency, distinctiveness }
    });
  });
  return patterns;
}

// Trait aggregation (mock implementation for MVP)
function aggregateTraits(patternCandidates) {
  const traits = {
    decisionCompression: 0,
    riskDiscipline: 0,
    trustPriority: 0,
    structureExpectation: 0
  };

  const mappings = {
    'decision-compression': 'decisionCompression',
    'authorization': 'decisionCompression',
    'option-framing': 'decisionCompression',
    'risk-enumeration': 'riskDiscipline',
    'mitigation-plan': 'riskDiscipline',
    'pivot-question': 'riskDiscipline',
    'privacy-principle': 'trustPriority',
    'profile-delivery': 'structureExpectation',
    'format-convention': 'structureExpectation'
  };

  patternCandidates.forEach(candidate => {
    candidate.patterns.forEach(pattern => {
      const traitKey = mappings[pattern];
      if (traitKey && candidate.features) {
        const weight = candidate.features.confidence * Math.log(1 + candidate.features.frequency);
        traits[traitKey] = Math.min(1, traits[traitKey] + weight * 0.2);
      }
    });
  });

  return traits;
}

// Routes

// Health endpoint is provided by ServiceFoundation
app.get('/api/v1/segmentation/status', (req, res) => {
  try {
    const status = unifier.getStatus();
    res.json({
      ok: true,
      engine: 'segmentation-unified',
      version: '1.0.0',
      ...status,
      labels: Object.values(LABELS),
      components: {
        segmenter: 'active',
        patternExtractor: 'mock-mvp',
        traitAggregator: 'mock-mvp',
        unifier: 'active'
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/v1/segmentation/configure', (req, res) => {
  try {
    const config = unifier.saveConfig(req.body);
    res.json({ ok: true, config });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/v1/segmentation/analyze', async (req, res) => {
  try {
    const { messages, options = {} } = req.body;
    
    if (!Array.isArray(messages)) {
      return res.status(400).json({ ok: false, error: 'messages must be an array' });
    }

    // Transform messages to expected format if needed
    const formattedMessages = messages.map((msg, idx) => ({
      id: msg.id || `msg_${idx}`,
      author: msg.author || 'user',
      content: msg.content || msg.text || '',
      index: idx
    }));

    // Step 1: Segmentation
    const segments = await unifier.segment(formattedMessages, options);
    
    // Step 2: Pattern Extraction
    const patternCandidates = extractPatterns(segments, formattedMessages);
    
    // Step 3: Trait Aggregation (legacy - maintains backward compatibility)
    const traitVector = aggregateTraits(patternCandidates);

    // Step 4: Semantic Trait Analysis (NEW - enhanced with 16 traits)
    const semanticTraits = await SemanticTraitsAnalyzer.analyzeTraits(formattedMessages);
    
    // Response
    res.json({
      ok: true,
      analysis: {
        segments,
        patternCandidates,
        traitVector, // Legacy traits (4 traits)
        semanticTraits, // Enhanced traits (16 traits with confidence scoring)
        metadata: {
          totalMessages: formattedMessages.length,
          totalSegments: segments.length,
          totalPatterns: patternCandidates.length,
          strategy: unifier.config.mode,
          enhancedTraitsAvailable: true,
          traitCount: Object.keys(semanticTraits.traits || {}).length,
          timestamp: new Date().toISOString()
        }
      }
    });
    
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Demo endpoint with sample data
app.get('/api/v1/segmentation/demo', async (req, res) => {
  const sampleMessages = [
    { content: 'Let\'s analyze the ceiling for this project. What\'s the right path forward?', author: 'user' },
    { content: 'I see three main risks we need to enumerate: technical debt, timeline, and resource constraints.', author: 'assistant' },
    { content: 'For mitigation sequence: 1→ technical audit, 2→ timeline buffer, 3→ resource reallocation.', author: 'assistant' },
    { content: 'Profile: You prefer structured, privacy-first solutions with clear decision points.', author: 'assistant' },
    { content: 'Proceed with the technical audit as the first step.', author: 'user' }
  ];

  try {
    const analysis = await new Promise((resolve) => {
      // Simulate the analysis
      setTimeout(() => {
        const segments = [
          { start: 0, end: 0, title: 'Pivot Question', summary: 'Initial direction assessment' },
          { start: 1, end: 1, title: 'Risk Enumeration', summary: 'Identifying key project risks' },
          { start: 2, end: 2, title: 'Mitigation Plan', summary: 'Structured mitigation approach' },
          { start: 3, end: 3, title: 'Profile Delivery', summary: 'User cognitive profile' },
          { start: 4, end: 4, title: 'Authorization', summary: 'Decision to proceed' }
        ];
        
        const patterns = extractPatterns(segments, sampleMessages);
        const traits = aggregateTraits(patterns);
        
        resolve({
          segments, 
          patternCandidates: patterns,
          traitVector: traits,
          metadata: {
            totalMessages: sampleMessages.length,
            totalSegments: segments.length,
            totalPatterns: patterns.length,
            strategy: 'rule-basic',
            timestamp: new Date().toISOString()
          }
        });
      }, 100);
    });

    res.json({ ok: true, analysis });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Phase 2: Cohort Discovery Endpoint
// POST /api/v1/segmentation/cohorts
// Input: { userConversationMap: { userId: [conversations] } }
// Output: Array of cohorts with traits and user assignments
app.post('/api/v1/segmentation/cohorts', async (req, res) => {
  try {
    const { userConversationMap } = req.body;
    
    if (!userConversationMap || typeof userConversationMap !== 'object') {
      return res.status(400).json({
        ok: false,
        error: 'Missing or invalid userConversationMap'
      });
    }

    // Dynamically import cohort analyzer
    const cohortAnalyzer = await import('../engine/cohort-analyzer.js');
    
    const cohorts = await cohortAnalyzer.discoverCohorts(userConversationMap);
    
    res.json({
      ok: true,
      cohorts,
      metadata: {
        totalCohorts: cohorts.length,
        totalUsers: Object.keys(userConversationMap).length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[segmentation] Cohort discovery error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /api/v1/segmentation/cohorts
// Retrieve persisted cohorts from Phase 2 infrastructure
app.get('/api/v1/segmentation/cohorts', async (req, res) => {
  try {
    const cohortAnalyzer = await import('../engine/cohort-analyzer.js');
    const allCohorts = await cohortAnalyzer.getAllCohorts();
    
    res.json({
      ok: true,
      cohorts: allCohorts,
      metadata: {
        totalCohorts: allCohorts.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[segmentation] Cohort retrieval error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /api/v1/segmentation/cohorts/:userId
// Get the cohort for a specific user
app.get('/api/v1/segmentation/cohorts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const cohortAnalyzer = await import('../engine/cohort-analyzer.js');
    const userCohort = await cohortAnalyzer.getUserCohort(userId);
    
    if (!userCohort) {
      return res.status(404).json({
        ok: false,
        error: `User ${userId} not assigned to any cohort`
      });
    }
    
    res.json({
      ok: true,
      cohort: userCohort,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[segmentation] User cohort lookup error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Observability endpoint (Phase 6C)
app.get('/api/v1/system/observability', (req, res) => {
  res.json({
    service: 'segmentation-server',
    tracer: tracer.getMetrics(),
    circuitBreakers: svc.getCircuitBreakerStatus()
  });
});

// Start server with unified initialization
svc.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🧩 Segmentation Server shutting down...');
  process.exit(0);
});