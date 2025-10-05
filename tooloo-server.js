const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const path = require('path');

// Core modules
const Simulator = require('./core/simulator');
const Trainer = require('./core/trainer');
const Feedback = require('./core/feedback');
const Auth = require('./core/auth');
const ProviderRouter = require('./providers/provider-router');

/**
 * TooLoo Server - Purpose-built for personal AI product factory
 * 
 * Features:
 * - Simulation engine (test UX before building)
 * - Training system (learn from real apps)
 * - Feedback collection (real user testing)
 * - Single-user security (password-protected)
 * - Cost-optimized AI routing
 */
class ToolooServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIO(this.server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });
    
    this.port = process.env.PORT || 3005;
    
    // Initialize core modules
    this.auth = new Auth();
    this.simulator = new Simulator();
    this.trainer = new Trainer();
    this.feedback = new Feedback();
    this.providerRouter = new ProviderRouter();
    
    // Active socket connections
    this.activeConnections = new Map();
  }

  /**
   * Initialize TooLoo server
   */
  async initialize() {
    console.log('\n🚀 ═══════════════════════════════════════════════════════');
    console.log('🚀 Initializing TooLoo.ai Server v2.0');
    console.log('🚀 ═══════════════════════════════════════════════════════\n');
    
    // Middleware
    this.app.use(cors());
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.static('web-app/dist')); // Serve built frontend
    this.app.use('/temp', express.static('temp')); // Serve prototypes
    
    // Initialize modules
    await this.auth.initialize();
    await this.trainer.initialize();
    await this.feedback.initialize();
    
    // Setup routes
    this.setupRoutes();
    
    // Socket.IO handlers
    this.setupSocketHandlers();
    
    console.log('✅ TooLoo.ai Server ready\n');
  }

  /**
   * Setup Express API routes
   */
  setupRoutes() {
    const app = this.app;
    
    // ===== PUBLIC ROUTES (No auth required) =====
    
    // Health check
    app.get('/api/v1/health', (req, res) => {
      res.json({
        status: 'healthy',
        server: 'TooLoo.ai',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
      });
    });

    // Authentication
    app.post('/api/v1/auth/login', async (req, res) => {
      try {
        const { password } = req.body;
        
        if (!password) {
          return res.status(400).json({
            success: false,
            error: 'Password required'
          });
        }
        
        const auth = await this.auth.authenticate(password);
        
        if (auth) {
          res.json({
            success: true,
            token: auth.token,
            expiresAt: auth.expiresAt
          });
        } else {
          res.status(401).json({
            success: false,
            error: 'Invalid password'
          });
        }
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Check if auth is configured
    app.get('/api/v1/auth/status', async (req, res) => {
      const configured = await this.auth.isConfigured();
      res.json({
        success: true,
        configured
      });
    });

    // Public feedback submission (for testers)
    app.post('/api/v1/feedback/public', async (req, res) => {
      try {
        const { shareToken, rating, comments } = req.body;
        
        // Get share link details
        const link = await this.feedback.getShareLink(shareToken);
        
        if (!link) {
          return res.status(404).json({
            success: false,
            error: 'Invalid share link'
          });
        }
        
        if (link.expired) {
          return res.status(410).json({
            success: false,
            error: 'Share link expired'
          });
        }
        
        // Collect feedback
        await this.feedback.collect({
          projectId: link.projectId,
          userId: `tester-${Date.now()}`,
          rating,
          comments,
          timestamp: new Date().toISOString(),
          userAgent: req.headers['user-agent'],
          ipHash: require('crypto').createHash('md5').update(req.ip).digest('hex')
        });
        
        // Increment feedback count
        await this.feedback.incrementFeedback(shareToken);
        
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // ===== PROTECTED ROUTES (Auth required) =====
    const authMiddleware = this.auth.middleware();

    // Simulation
    app.post('/api/v1/simulate', authMiddleware, async (req, res) => {
      try {
        const { description, inspiration } = req.body;
        
        if (!description) {
          return res.status(400).json({
            success: false,
            error: 'Description required'
          });
        }
        
        const result = await this.simulator.generate(
          description,
          inspiration,
          this.trainer
        );
        
        res.json({
          success: true,
          prototype: result
        });
      } catch (error) {
        console.error('Simulation error:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // List prototypes
    app.get('/api/v1/simulate/list', authMiddleware, async (req, res) => {
      try {
        const prototypes = await this.simulator.listPrototypes();
        res.json({
          success: true,
          prototypes
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Training - Add example
    app.post('/api/v1/training/add', authMiddleware, async (req, res) => {
      try {
        const { key, example } = req.body;
        
        if (!key || !example) {
          return res.status(400).json({
            success: false,
            error: 'Key and example required'
          });
        }
        
        await this.trainer.addExample(key, example);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Training - Get all examples
    app.get('/api/v1/training/examples', authMiddleware, async (req, res) => {
      const examples = this.trainer.getAllExamples();
      res.json({
        success: true,
        examples,
        count: Object.keys(examples).length
      });
    });

    // Training - Export
    app.get('/api/v1/training/export', authMiddleware, async (req, res) => {
      try {
        const data = await this.trainer.export();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=training-data.json');
        res.send(data);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Training - Import
    app.post('/api/v1/training/import', authMiddleware, async (req, res) => {
      try {
        const { data } = req.body;
        const success = await this.trainer.import(data);
        
        res.json({ success });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Feedback - Get for project
    app.get('/api/v1/feedback/:projectId', authMiddleware, async (req, res) => {
      try {
        const feedback = await this.feedback.get(req.params.projectId);
        res.json({
          success: true,
          feedback
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Feedback - Generate share link
    app.post('/api/v1/feedback/share', authMiddleware, async (req, res) => {
      try {
        const { projectId, prototypeUrl, expiresInDays } = req.body;
        
        const shareLink = await this.feedback.generateShareLink(
          projectId,
          prototypeUrl,
          expiresInDays || 7
        );
        
        res.json({
          success: true,
          shareLink
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Feedback - Summary
    app.get('/api/v1/feedback/summary', authMiddleware, async (req, res) => {
      try {
        const summary = await this.feedback.getSummary();
        res.json({
          success: true,
          summary
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Stats - Provider usage
    app.get('/api/v1/stats/providers', authMiddleware, (req, res) => {
      const stats = this.providerRouter.getStats();
      res.json({
        success: true,
        stats
      });
    });

    // Stats - Reset
    app.post('/api/v1/stats/reset', authMiddleware, (req, res) => {
      this.providerRouter.resetStats();
      res.json({ success: true });
    });

    // Logout
    app.post('/api/v1/auth/logout', authMiddleware, (req, res) => {
      this.auth.logout();
      res.json({ success: true });
    });

    // Fallback - serve frontend for all other routes (comment out for now)
    // app.get('*', (req, res) => {
    //   res.sendFile(path.join(process.cwd(), 'web-app', 'dist', 'index.html'));
    // });
  }

  /**
   * Setup Socket.IO real-time handlers
   */
  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('🔌 Client connected:', socket.id);
      this.activeConnections.set(socket.id, socket);

      // Simple AI chat conversation
      socket.on('message', async (data) => {
        try {
          const { message, conversationId } = data;
          
          console.log(`💬 Message from ${socket.id}:`, message);
          
          // Use provider router to generate response
          const response = await this.providerRouter.generate({
            prompt: message,
            provider: 'deepseek', // Default to cost-effective provider
            conversationId: conversationId || 'default'
          });
          
          socket.emit('response', {
            content: response.content,
            provider: response.provider,
            timestamp: new Date().toISOString()
          });
          
        } catch (error) {
          console.error('❌ Message error:', error);
          socket.emit('error', {
            message: error.message
          });
        }
      });

      // Real-time simulation with progress updates
      socket.on('simulate', async (data) => {
        try {
          const { description, inspiration } = data;
          
          socket.emit('simulation-started', {
            status: 'started',
            message: 'Starting simulation...'
          });
          
          const result = await this.simulator.generate(
            description,
            inspiration,
            this.trainer,
            (progress) => {
              socket.emit('simulation-progress', progress);
            }
          );
          
          socket.emit('simulation-complete', {
            success: true,
            prototype: result
          });
          
        } catch (error) {
          socket.emit('simulation-error', {
            success: false,
            error: error.message
          });
        }
      });

      // Disconnect
      socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
        this.activeConnections.delete(socket.id);
      });
    });
  }

  /**
   * Start TooLoo server
   */
  async start() {
    try {
      await this.initialize();
      
      this.server.listen(this.port, () => {
        console.log('🚀 ═══════════════════════════════════════════════════════');
        console.log(`🚀 TooLoo.ai Server running on http://localhost:${this.port}`);
        console.log(`🔐 Security: ${this.auth.isConfigured() ? 'Password protected' : 'Setup required'}`);
        console.log(`📚 Training examples: ${this.trainer.getExampleCount()}`);
        console.log(`🔌 WebSocket server: Active`);
        console.log('🚀 ═══════════════════════════════════════════════════════\n');
        console.log('✅ Ready to simulate and build amazing products!\n');
      });
      
    } catch (error) {
      console.error('❌ Server initialization failed:', error);
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('\n👋 Shutting down TooLoo.ai Server...');
    
    // Close all socket connections
    this.activeConnections.forEach((socket) => {
      socket.disconnect(true);
    });
    
    // Close server
    this.server.close(() => {
      console.log('✅ Server closed gracefully');
      process.exit(0);
    });
  }
}

// Start server if run directly
if (require.main === module) {
  const server = new ToolooServer();
  
  // Handle shutdown signals
  process.on('SIGTERM', () => server.shutdown());
  process.on('SIGINT', () => server.shutdown());
  
  server.start().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = ToolooServer;
