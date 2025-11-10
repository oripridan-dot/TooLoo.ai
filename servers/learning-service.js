/**
 * Learning Service - Port 3001
 * 
 * Manages training sessions, mastery tracking, and skill challenges
 * Event-driven integration with Event Bus
 */

import express from 'express';
import cors from 'cors';
import TrainingEngine from '../lib/training-engine.js';
import ChallengeEngine from '../lib/challenge-engine.js';
import EventBus from '../lib/event-bus.js';

const app = express();
const PORT = process.env.LEARNING_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb' }));

// Initialize engines
const eventBus = new EventBus('./data/events.db');
const trainingEngine = new TrainingEngine(eventBus);
const challengeEngine = new ChallengeEngine(eventBus);

// Startup
let server = null;
let initialized = false;

/**
 * Initialize service
 */
async function initialize() {
  if (initialized) return;

  try {
    // Initialize Event Bus
    await eventBus.initialize();

    // Subscribe to provider events for future phases
    eventBus.subscribe('learning-service', ['provider.selected', 'provider.budget.exceeded'], (event) => {
      console.log(`[Learning] Received event: ${event.type}`);
      // Handle provider events in Phase 2
    });

    initialized = true;
    console.log('✅ Learning Service initialized');
  } catch (error) {
    console.error('❌ Initialization failed:', error.message);
    throw error;
  }
}

/**
 * Start server
 */
async function start() {
  await initialize();

  return new Promise((resolve) => {
    server = app.listen(PORT, () => {
      console.log('\n╔════════════════════════════════════════════════════╗');
      console.log('║ 🎓 TooLoo.ai Learning Service (Event-Driven)      ║');
      console.log('╚════════════════════════════════════════════════════╝\n');
      console.log(`📍 Listening on http://127.0.0.1:${PORT}\n`);
      console.log('🔗 Core Endpoints:');
      console.log('   POST   /api/v1/training/start        - Start training');
      console.log('   POST   /api/v1/training/round        - Complete round');
      console.log('   GET    /api/v1/training/progress     - Get mastery metrics');
      console.log('   POST   /api/v1/challenges/start      - Start challenge');
      console.log('   POST   /api/v1/challenges/grade      - Grade challenge');
      console.log('   GET    /api/v1/learning/health       - Service health\n');

      resolve(server);
    });
  });
}

// ============================================================================
// TRAINING ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/training/health - Service health check
 */
app.get('/api/v1/learning/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'learning',
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

/**
 * POST /api/v1/training/start - Start a new training session
 * Body: { userId, focusArea, roundCount? }
 */
app.post('/api/v1/training/start', async (req, res) => {
  try {
    const { userId, focusArea, roundCount } = req.body;

    if (!userId || !focusArea) {
      return res.status(400).json({
        error: 'userId and focusArea are required'
      });
    }

    const result = await trainingEngine.startTraining(userId, focusArea, { roundCount });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Training session started'
    });
  } catch (error) {
    console.error('Error starting training:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/training/round - Complete a training round
 * Body: { roundId, response, score? }
 */
app.post('/api/v1/training/round', async (req, res) => {
  try {
    const { roundId, response, score } = req.body;

    if (!roundId || !response) {
      return res.status(400).json({
        error: 'roundId and response are required'
      });
    }

    const result = await trainingEngine.completeRound(roundId, response, score);

    res.json({
      success: true,
      data: result,
      message: result.completed ? 'Training completed' : 'Round completed, continue to next'
    });
  } catch (error) {
    console.error('Error completing round:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/training/progress - Get mastery metrics for user
 * Query: userId
 */
app.get('/api/v1/training/progress', (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        error: 'userId query parameter is required'
      });
    }

    const metrics = trainingEngine.getMasteryMetrics(userId);
    const sessions = trainingEngine.getUserSessions(userId);

    res.json({
      success: true,
      data: {
        mastery: metrics,
        sessions,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    console.error('Error getting progress:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/training/session/:sessionId - Get session details
 */
app.get('/api/v1/training/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = trainingEngine.getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/training/stats - Service statistics
 */
app.get('/api/v1/training/stats', (req, res) => {
  try {
    const stats = trainingEngine.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// CHALLENGE ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/challenges/start - Start a new challenge
 * Body: { userId, skill, difficulty? }
 */
app.post('/api/v1/challenges/start', async (req, res) => {
  try {
    const { userId, skill, difficulty } = req.body;

    if (!userId || !skill) {
      return res.status(400).json({
        error: 'userId and skill are required'
      });
    }

    const result = await challengeEngine.startChallenge(
      userId,
      skill,
      difficulty || 'medium'
    );

    res.status(201).json({
      success: true,
      data: result,
      message: 'Challenge started'
    });
  } catch (error) {
    console.error('Error starting challenge:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v1/challenges/grade - Grade a challenge response
 * Body: { challengeId, response }
 */
app.post('/api/v1/challenges/grade', async (req, res) => {
  try {
    const { challengeId, response } = req.body;

    if (!challengeId || !response) {
      return res.status(400).json({
        error: 'challengeId and response are required'
      });
    }

    const result = await challengeEngine.gradeChallenge(challengeId, response);

    res.json({
      success: true,
      data: result,
      message: result.passed ? 'Challenge passed!' : 'Challenge failed'
    });
  } catch (error) {
    console.error('Error grading challenge:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/challenges/stats - Challenge statistics
 */
app.get('/api/v1/challenges/stats', (req, res) => {
  try {
    const stats = challengeEngine.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// HEALTH & INFO
// ============================================================================

/**
 * GET /api/v1/system/info - Service information
 */
app.get('/api/v1/system/info', (req, res) => {
  res.json({
    name: 'Learning Service',
    version: '2.0.0',
    port: PORT,
    status: initialized ? 'ready' : 'initializing',
    uptime: process.uptime(),
    endpoints: {
      training: 4,
      challenges: 3
    },
    timestamp: Date.now()
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

/**
 * Global error handler
 */
app.use((err, req, res) => {
  console.error('Global error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// ============================================================================
// STARTUP
// ============================================================================

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n📛 SIGTERM received, shutting down gracefully...');
  if (server) {
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  }
});

process.on('SIGINT', () => {
  console.log('\n📛 SIGINT received, shutting down gracefully...');
  if (server) {
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  }
});

// Auto-start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  start().catch(error => {
    console.error('Failed to start:', error);
    process.exit(1);
  });
}

export default app;
export { start, initialize };
