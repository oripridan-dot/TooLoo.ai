/**
 * Context API Endpoints
 * Exposes the learning system's context extraction to external systems
 * Provides unified access for users, providers, and analytics
 */

import express from 'express';

class ContextAPIEndpoints {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.router = express.Router();
    this.setupRoutes();
  }

  setupRoutes() {
    // ====== USER CONTEXT ENDPOINTS ======

    /**
     * GET /api/v1/context/user/:userId
     * Get user's profile, preferences, and history summary
     */
    this.router.get('/user/:userId', (req, res) => {
      try {
        const { userId } = req.params;
        const limit = parseInt(req.query.limit) || 5;
        
        const context = this.orchestrator.getUserContext(userId);
        if (!context) {
          return res.status(404).json({ error: 'User not found' });
        }

        res.json({
          success: true,
          data: context
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    /**
     * GET /api/v1/context/user/:userId/sessions
     * List user's sessions with brief context
     */
    this.router.get('/user/:userId/sessions', (req, res) => {
      try {
        const { userId } = req.params;
        const limit = parseInt(req.query.limit) || 10;

        const userContext = this.orchestrator.getUserContext(userId);
        if (!userContext) {
          return res.status(404).json({ error: 'User not found' });
        }

        res.json({
          success: true,
          sessionCount: userContext.sessions.length,
          data: userContext.sessions.slice(0, limit)
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ====== SESSION CONTEXT ENDPOINTS ======

    /**
     * GET /api/v1/context/session/:sessionId
     * Get full session context with metadata and learning data
     */
    this.router.get('/session/:sessionId', (req, res) => {
      try {
        const { sessionId } = req.params;
        
        const context = this.orchestrator.getSessionWithContext(sessionId);
        if (!context) {
          return res.status(404).json({ error: 'Session not found' });
        }

        res.json({
          success: true,
          data: context
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    /**
     * GET /api/v1/context/session/:sessionId/learning
     * Get learning data extracted from session
     * Used by ML systems to improve
     */
    this.router.get('/session/:sessionId/learning', (req, res) => {
      try {
        const { sessionId } = req.params;
        
        const learningContext = this.orchestrator.getLearningContext(sessionId);
        if (!learningContext) {
          return res.status(404).json({ error: 'Session not found' });
        }

        res.json({
          success: true,
          sessionId,
          data: learningContext
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    /**
     * GET /api/v1/context/session/:sessionId/similar
     * Find similar sessions for context enrichment
     */
    this.router.get('/session/:sessionId/similar', (req, res) => {
      try {
        const { sessionId } = req.params;
        const limit = parseInt(req.query.limit) || 3;
        
        const similar = this.orchestrator.findSimilarSessions(sessionId, limit);
        
        res.json({
          success: true,
          sessionId,
          similarCount: similar.length,
          data: similar
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    /**
     * GET /api/v1/context/session/:sessionId/export
     * Export session as markdown
     */
    this.router.get('/session/:sessionId/export', (req, res) => {
      try {
        const { sessionId } = req.params;
        
        const markdown = this.orchestrator.exportSessionAsMarkdown(sessionId);
        if (!markdown) {
          return res.status(404).json({ error: 'Session not found' });
        }

        res.set('Content-Type', 'text/markdown');
        res.set('Content-Disposition', `attachment; filename="session-${sessionId}.md"`);
        res.send(markdown);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ====== PROVIDER CONTEXT ENDPOINTS ======

    /**
     * GET /api/v1/context/provider/:userId/:sessionId
     * Get context for AI provider (conversation history + success patterns)
     */
    this.router.get('/provider/:userId/:sessionId', (req, res) => {
      try {
        const { userId, sessionId } = req.params;
        
        const context = this.orchestrator.getProviderContext(userId, sessionId);
        if (!context) {
          return res.status(404).json({ error: 'Context not found' });
        }

        res.json({
          success: true,
          data: context
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    /**
     * GET /api/v1/context/provider/:userId/category/:topic
     * Get context for provider about similar user queries for a topic
     */
    this.router.get('/provider/:userId/category/:topic', (req, res) => {
      try {
        const { userId, topic } = req.params;
        
        const context = this.orchestrator.getProviderCategoryContext(userId, topic);
        
        res.json({
          success: true,
          userId,
          topic,
          data: context
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    /**
     * POST /api/v1/context/provider/:userId/:sessionId/systemPrompt
     * Get contextual system prompt for provider
     */
    this.router.post('/provider/:userId/:sessionId/systemPrompt', (req, res) => {
      try {
        const { userId, sessionId } = req.params;
        const { task } = req.body || {};
        
        const systemPrompt = this.orchestrator.buildContextualSystemPrompt(
          userId,
          sessionId,
          task || 'general'
        );

        res.json({
          success: true,
          systemPrompt
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ====== SEARCH & DISCOVERY ENDPOINTS ======

    /**
     * GET /api/v1/context/search
     * Search sessions by query
     */
    this.router.get('/search', (req, res) => {
      try {
        const { userId, query } = req.query;
        
        if (!userId || !query) {
          return res.status(400).json({
            error: 'userId and query parameters required'
          });
        }

        const results = this.orchestrator.searchSessions(userId, query);
        
        res.json({
          success: true,
          userId,
          query,
          resultCount: results.length,
          data: results
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ====== LEARNING SYSTEM ENDPOINTS ======

    /**
     * POST /api/v1/context/session
     * Create new session
     */
    this.router.post('/session', (req, res) => {
      try {
        const { userId, metadata } = req.body;
        
        if (!userId) {
          return res.status(400).json({ error: 'userId required' });
        }

        const session = this.orchestrator.createSession(userId, metadata);
        
        res.json({
          success: true,
          sessionId: session.id,
          data: session
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    /**
     * POST /api/v1/context/session/:sessionId/message
     * Add message to session
     */
    this.router.post('/session/:sessionId/message', (req, res) => {
      try {
        const { sessionId } = req.params;
        const { role, content, provider, feedback } = req.body;
        
        if (!role || !content) {
          return res.status(400).json({
            error: 'role and content required'
          });
        }

        const result = this.orchestrator.addSessionMessage(
          sessionId,
          role,
          content,
          provider,
          feedback
        );

        res.json({
          success: true,
          data: result
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    /**
     * GET /api/v1/context/session/:sessionId/extract-learning
     * Extract learning data from session
     */
    this.router.get('/session/:sessionId/extract-learning', (req, res) => {
      try {
        const { sessionId } = req.params;
        
        const learningData = this.orchestrator.extractSessionLearning(sessionId);
        
        res.json({
          success: true,
          sessionId,
          data: learningData
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ====== ANALYTICS ENDPOINTS ======

    /**
     * GET /api/v1/context/analytics/:userId
     * Get comprehensive analytics combining all systems
     */
    this.router.get('/analytics/:userId', (req, res) => {
      try {
        const { userId } = req.params;
        
        const analytics = this.orchestrator.getContextualAnalytics(userId);
        
        res.json({
          success: true,
          userId,
          data: analytics
        });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
  }

  getRouter() {
    return this.router;
  }
}

export default ContextAPIEndpoints;
