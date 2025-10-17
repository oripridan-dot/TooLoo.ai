// Product Development Server - ES Module Compatible
// Professional product development capabilities for TooLoo

import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import environmentHub from '../engine/environment-hub.js';

class ProductDevelopmentServer {
  constructor() {
    this.app = express();
    this.port = process.env.PRODUCT_PORT || 3006;
    
    // JSON persistence setup
    this.dataDir = path.join(process.cwd(), 'data', 'workflows');
    this.artifactsDir = path.join(process.cwd(), 'data', 'artifacts');
    this.workflowsFile = path.join(this.dataDir, 'active-workflows.json');
    this.skillsFile = path.join(this.dataDir, 'skill-matrix.json');
    this.eventsFile = path.join(this.dataDir, 'events.json');
    this.artifactsIndexFile = path.join(this.artifactsDir, 'index.json');
    
    // In-memory storage with persistence
    this.activeWorkflows = new Map();
    this.skillMatrix = new Map();
    this.eventLog = [];
    this.artifactsIndex = new Map();
    this.artifactTemplates = this.initializeArtifactTemplates();
    
    this.initializeStorage();
    
    this.setupMiddleware();
    this.setupRoutes();
    
    environmentHub.registerComponent('productDevelopmentServer', this, [
      'workflow-orchestration', 'dynamic-learning', 'bookworm-analysis', 'artifact-generation'
    ]);
  }

  async initializeStorage() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.mkdir(this.artifactsDir, { recursive: true });
      await this.loadPersistedData();
      console.log('📁 Workflow and artifact persistence initialized');
    } catch (error) {
      console.warn('⚠️ Storage initialization failed:', error.message);
    }
  }

  async loadPersistedData() {
    try {
      // Load workflows
      const workflowsData = await fs.readFile(this.workflowsFile, 'utf8');
      const workflows = JSON.parse(workflowsData);
      for (const [id, workflow] of Object.entries(workflows)) {
        this.activeWorkflows.set(id, workflow);
      }
      
      // Load skills
      const skillsData = await fs.readFile(this.skillsFile, 'utf8');
      const skills = JSON.parse(skillsData);
      for (const [key, skill] of Object.entries(skills)) {
        this.skillMatrix.set(key, skill);
      }
      
      // Load events
      const eventsData = await fs.readFile(this.eventsFile, 'utf8');
      this.eventLog = JSON.parse(eventsData);
      
      // Load artifacts index
      const artifactsData = await fs.readFile(this.artifactsIndexFile, 'utf8');
      const artifacts = JSON.parse(artifactsData);
      for (const [id, artifact] of Object.entries(artifacts)) {
        this.artifactsIndex.set(id, artifact);
      }
      
      console.log(`📋 Loaded ${this.activeWorkflows.size} workflows, ${this.skillMatrix.size} skills, ${this.eventLog.length} events, ${this.artifactsIndex.size} artifacts`);
    } catch (error) {
      console.log('📝 Starting with empty state');
    }
  }

  async persistData() {
    try {
      // Create backups
      const timestamp = Date.now();
      try {
        await fs.copyFile(this.workflowsFile, `${this.workflowsFile}.bak.${timestamp}`);
      } catch {} // Ignore if file doesn't exist

      // Save workflows
      const workflowsObj = Object.fromEntries(this.activeWorkflows);
      await fs.writeFile(this.workflowsFile, JSON.stringify(workflowsObj, null, 2));
      
      // Save skills
      const skillsObj = Object.fromEntries(this.skillMatrix);
      await fs.writeFile(this.skillsFile, JSON.stringify(skillsObj, null, 2));
      
      // Save events (keep last 100)
      const recentEvents = this.eventLog.slice(-100);
      await fs.writeFile(this.eventsFile, JSON.stringify(recentEvents, null, 2));
      
      // Save artifacts index
      const artifactsObj = Object.fromEntries(this.artifactsIndex);
      await fs.writeFile(this.artifactsIndexFile, JSON.stringify(artifactsObj, null, 2));
      
      return true;
    } catch (error) {
      console.error('💾 Persistence failed:', error.message);
      return false;
    }
  }

  logEvent(type, message, workflowId = null) {
    const event = {
      timestamp: new Date().toISOString(),
      type,
      message,
      workflowId
    };
    this.eventLog.push(event);
    this.persistData().catch(() => {}); // Non-blocking persist
    console.log(`📝 ${type}: ${message}`);
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Request logging
    this.app.use((req, res, next) => {
      console.log(`📡 ${req.method} ${req.path} - ${new Date().toISOString()}`);
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        service: 'product-development',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        capabilities: [
          'workflow-orchestration',
          'dynamic-learning',
          'bookworm-analysis', 
          'artifact-generation'
        ],
        activeWorkflows: this.activeWorkflows.size,
        skillsAcquired: this.skillMatrix.size,
        eventsLogged: this.eventLog.length
      });
    });

    // Basic authentication middleware for workflow operations
    this.app.use('/api/v1/workflows', (req, res, next) => {
      const token = req.headers['x-workflow-token'];
      const expectedToken = process.env.WORKFLOW_TOKEN || 'demo-token-2025';
      
      // Allow GET requests without auth for demo purposes
      if (req.method === 'GET') {
        return next();
      }
      
      if (token !== expectedToken) {
        this.logEvent('auth-failed', `Unauthorized workflow access from ${req.ip}`);
        return res.status(401).json({
          ok: false,
          error: 'Unauthorized - X-Workflow-Token required'
        });
      }
      
      next();
    });

    // Workflow Management Routes
    this.setupWorkflowRoutes();
    
    // Learning Engine Routes
    this.setupLearningRoutes();
    
    // Analysis Engine Routes
    this.setupAnalysisRoutes();
    
    // Artifact Generation Routes
    this.setupArtifactRoutes();
    
    // Integration Routes
    this.setupIntegrationRoutes();
  }

  setupWorkflowRoutes() {
    // Start a new product development workflow
    this.app.post('/api/v1/workflows/start', async (req, res) => {
      try {
        const { type, requirements, options } = req.body;
        
        if (!type || !requirements) {
          return res.status(400).json({
            error: 'Missing required fields: type, requirements'
          });
        }

        const workflowId = this.generateWorkflowId();
        const workflow = {
          id: workflowId,
          type: type,
          requirements: requirements,
          options: options || {},
          state: 'started',
          currentPhase: 'discovery',
          startedAt: new Date().toISOString(),
          progress: 0,
          phases: this.getWorkflowPhases(type)
        };

        this.activeWorkflows.set(workflowId, workflow);
        
        // Log event and persist
        this.logEvent('workflow-started', `${type} workflow started: ${requirements.productName || 'Unnamed Product'}`, workflowId);
        
        res.json({
          ok: true,
          workflowId,
          status: 'started',
          currentPhase: workflow.currentPhase,
          message: `${type} workflow started successfully`,
          nextActions: ['Execute discovery phase', 'Begin market analysis']
        });

      } catch (error) {
        console.error('Failed to start workflow:', error);
        res.status(500).json({
          ok: false,
          error: error.message
        });
      }
    });

    // Execute workflow phase
    this.app.post('/api/v1/workflows/:workflowId/execute', async (req, res) => {
      try {
        const { workflowId } = req.params;
        const { phase } = req.body;

        const workflow = this.activeWorkflows.get(workflowId);
        if (!workflow) {
          return res.status(404).json({
            ok: false,
            error: 'Workflow not found'
          });
        }

        // Simulate phase execution
        const phaseResult = await this.simulatePhaseExecution(workflow, phase);
        
        // Update workflow progress
        workflow.progress = Math.min(workflow.progress + 0.2, 1.0);
        if (workflow.progress >= 1.0) {
          workflow.state = 'completed';
        }
        
        // Log event and persist
        this.logEvent('phase-executed', `${phase || workflow.currentPhase} phase completed (${phaseResult.qualityScore} quality)`, workflowId);
        this.logEvent('artifacts-generated', `Generated ${phaseResult.artifacts.length} artifacts`, workflowId);
        
        res.json({
          ok: true,
          workflowId,
          phase: phase || workflow.currentPhase,
          status: 'completed',
          qualityScore: phaseResult.qualityScore,
          artifactsGenerated: phaseResult.artifacts.length,
          progress: workflow.progress,
          message: 'Phase executed successfully'
        });

      } catch (error) {
        console.error('Failed to execute workflow phase:', error);
        res.status(500).json({
          ok: false,
          error: error.message
        });
      }
    });

    // Get workflow status
    this.app.get('/api/v1/workflows/:workflowId', (req, res) => {
      try {
        const { workflowId } = req.params;
        const workflow = this.activeWorkflows.get(workflowId);
        
        if (!workflow) {
          return res.status(404).json({
            ok: false,
            error: 'Workflow not found'
          });
        }

        res.json({
          ok: true,
          workflow: {
            id: workflow.id,
            type: workflow.type,
            state: workflow.state,
            currentPhase: workflow.currentPhase,
            progress: workflow.progress,
            startedAt: workflow.startedAt,
            phases: workflow.phases
          }
        });

      } catch (error) {
        console.error('Failed to get workflow status:', error);
        res.status(500).json({
          ok: false,
          error: error.message
        });
      }
    });

    // List all active workflows
    this.app.get('/api/v1/workflows', (req, res) => {
      try {
        const workflows = Array.from(this.activeWorkflows.values()).map(w => ({
          id: w.id,
          type: w.type,
          state: w.state,
          currentPhase: w.currentPhase,
          progress: w.progress,
          startedAt: w.startedAt
        }));
        
        res.json({
          ok: true,
          workflows: workflows,
          count: workflows.length
        });

      } catch (error) {
        console.error('Failed to list workflows:', error);
        res.status(500).json({
          ok: false,
          error: error.message
        });
      }
    });

    // Get available workflow templates
    this.app.get('/api/v1/workflows/templates', (req, res) => {
      const templates = [
        {
          type: 'concept-to-market',
          name: 'Concept-to-Market Product Development',
          description: 'Complete journey from idea to paying customers',
          duration: '8-16 weeks',
          phases: ['discovery', 'strategy', 'development', 'launch', 'scale']
        },
        {
          type: 'rapid-mvp',
          name: 'Rapid MVP Development', 
          description: 'Fast-track from concept to testable product',
          duration: '2-4 weeks',
          phases: ['validate', 'build', 'test']
        }
      ];

      res.json({
        ok: true,
        templates: templates
      });
    });

    // Get event log
    this.app.get('/api/v1/workflows/events', (req, res) => {
      const { limit = 50, workflowId } = req.query;
      let events = this.eventLog;
      
      if (workflowId) {
        events = events.filter(e => e.workflowId === workflowId);
      }
      
      events = events.slice(-parseInt(limit));
      
      res.json({
        ok: true,
        events: events.reverse(), // Most recent first
        count: events.length
      });
    });
  }

  setupLearningRoutes() {
    // Acquire new skill
    this.app.post('/api/v1/learning/acquire', async (req, res) => {
      try {
        const { skillName, context, urgency } = req.body;
        
        if (!skillName) {
          return res.status(400).json({
            error: 'Missing required field: skillName'
          });
        }

        // Simulate skill acquisition
        const skill = {
          name: skillName,
          proficiency: 'professional',
          confidence: 0.85,
          acquiredAt: new Date().toISOString(),
          context: context || {},
          applications: this.getSkillApplications(skillName)
        };

        const skillKey = `${skillName}-${JSON.stringify(context || {})}`;
        this.skillMatrix.set(skillKey, skill);
        
        res.json({
          ok: true,
          skill: skill,
          message: `Acquired ${skill.proficiency} level proficiency in ${skillName}`
        });

      } catch (error) {
        console.error('Failed to acquire skill:', error);
        res.status(500).json({
          ok: false,
          error: error.message
        });
      }
    });

    // Get skill matrix
    this.app.get('/api/v1/learning/skills', (req, res) => {
      try {
        const skills = Array.from(this.skillMatrix.values());
        const skillMatrix = {
          'technical-foundation': skills.filter(s => this.categorizeToDomain(s.name) === 'technical'),
          'business-strategy': skills.filter(s => this.categorizeToDomain(s.name) === 'business'),
          'product-design': skills.filter(s => this.categorizeToDomain(s.name) === 'design'),
          'marketing-growth': skills.filter(s => this.categorizeToDomain(s.name) === 'marketing')
        };
        
        res.json({
          ok: true,
          skillMatrix: skillMatrix,
          totalSkills: skills.length,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Failed to get skill matrix:', error);
        res.status(500).json({
          ok: false,
          error: error.message
        });
      }
    });

    // Learn for specific project
    this.app.post('/api/v1/learning/project', async (req, res) => {
      try {
        const { projectType, requirements } = req.body;
        
        if (!projectType || !requirements) {
          return res.status(400).json({
            error: 'Missing required fields: projectType, requirements'
          });
        }

        // Determine required skills for project
        const requiredSkills = this.getProjectSkills(projectType);
        const results = [];

        for (const skillName of requiredSkills) {
          const skill = {
            name: skillName,
            proficiency: 'professional',
            confidence: 0.8,
            acquiredAt: new Date().toISOString(),
            projectContext: projectType
          };
          
          this.skillMatrix.set(`${skillName}-${projectType}`, skill);
          results.push(skill);
        }
        
        res.json({
          ok: true,
          learningResults: {
            projectType,
            skillsAcquired: results.length,
            skills: results
          },
          message: `Acquired ${results.length} skills for ${projectType} project`
        });

      } catch (error) {
        console.error('Failed to learn for project:', error);
        res.status(500).json({
          ok: false,
          error: error.message
        });
      }
    });
  }

  setupAnalysisRoutes() {
    // Analyze document with Book Worm mode
    this.app.post('/api/v1/analysis/document', async (req, res) => {
      try {
        const { content, type, mode, context, outputFormat } = req.body;
        
        if (!content) {
          return res.status(400).json({
            error: 'Missing required field: content'
          });
        }

        // Simulate comprehensive analysis
        const analysis = this.simulateDocumentAnalysis(content, type || 'general', mode || 'comprehensive');
        
        res.json({
          ok: true,
          analysis: analysis,
          message: 'Document analysis completed successfully'
        });

      } catch (error) {
        console.error('Failed to analyze document:', error);
        res.status(500).json({
          ok: false,
          error: error.message
        });
      }
    });

    // Get available analysis types
    this.app.get('/api/v1/analysis/types', (req, res) => {
      const analysisTypes = [
        {
          type: 'business-plan',
          description: 'Comprehensive business plan analysis with market validation',
          modes: ['rapid', 'comprehensive']
        },
        {
          type: 'technical-spec',
          description: 'Technical specification and architecture review',
          modes: ['focused', 'comprehensive']
        },
        {
          type: 'design-document',
          description: 'User experience and design system analysis',
          modes: ['focused', 'comprehensive']
        },
        {
          type: 'market-analysis',
          description: 'Market opportunity and competitive landscape analysis',
          modes: ['rapid', 'comprehensive']
        }
      ];

      res.json({
        ok: true,
        analysisTypes: analysisTypes
      });
    });
  }

  setupArtifactRoutes() {
    // List all artifact templates
    this.app.get('/api/v1/artifacts/templates', (req, res) => {
      const templates = Array.from(this.artifactTemplates.entries()).map(([key, t]) => ({
        type: key,
        format: t.format,
        sections: t.sections,
        quality: t.quality
      }));
      res.json({ ok: true, templates });
    });

    // Generate single artifact
    this.app.post('/api/v1/artifacts/generate', async (req, res) => {
      try {
        let { type, requirements, quality } = req.body || {};
        // Accept requirements as JSON string or object; allow simple text fallback
        if (typeof requirements === 'string') {
          try {
            requirements = JSON.parse(requirements);
          } catch {
            requirements = { description: String(requirements) };
          }
        }
        if (!requirements && req.body?.requirementsText) {
          requirements = { description: String(req.body.requirementsText) };
        }
        
        if (!type || !requirements) {
          return res.status(400).json({
            error: 'Missing required fields: type, requirements'
          });
        }

  const artifact = await this.generateSimulatedArtifact(type, requirements, quality);
        
        // Save artifact to persistent storage
        const saveResult = await this.saveArtifact(artifact);
        if (saveResult) {
          artifact.id = saveResult.id;
          artifact.createdAt = saveResult.createdAt;
        }
        
        res.json({
          ok: true,
          artifact: artifact,
          message: `${type} artifact generated successfully`,
          saved: !!saveResult
        });

      } catch (error) {
        console.error('Failed to generate artifact:', error);
        res.status(500).json({
          ok: false,
          error: error.message
        });
      }
    });

    // GET fallback for artifact generation (useful for curl/browser testing)
    this.app.get('/api/v1/artifacts/generate/run', async (req, res) => {
      try {
        const q = req.query || {};
        const type = (q.type || 'business-plan').toString();
        const quality = (q.quality || 'production').toString();
        let requirements = {};
        // If requirements provided as JSON string
        if (q.requirements) {
          try { requirements = JSON.parse(q.requirements); } catch { requirements = { description: String(q.requirements) }; }
        } else {
          // Build from common query fields
          const productName = q.productName || q.name || q.title;
          const companyName = q.companyName || q.org || undefined;
          const description = q.description || q.desc || undefined;
          const audience = q.audience || undefined;
          requirements = { ...(productName?{productName}:{}) , ...(companyName?{companyName}:{}) , ...(description?{description}:{}) , ...(audience?{audience}:{}) };
          if (Object.keys(requirements).length === 0) {
            requirements = { productName: 'TooLoo Demo Product', description: 'Auto-generated via GET fallback' };
          }
        }
  const artifact = await this.generateSimulatedArtifact(type, requirements, quality);
        
        // Save artifact to persistent storage
        const saveResult = await this.saveArtifact(artifact);
        if (saveResult) {
          artifact.id = saveResult.id;
          artifact.createdAt = saveResult.createdAt;
        }
        
        return res.json({ ok:true, artifact, saved: !!saveResult, note: 'Generated via GET fallback' });
      } catch (error) {
        console.error('GET artifact generation failed:', error);
        return res.status(500).json({ ok:false, error: error.message });
      }
    });

    // Get available artifact types (must be before /:id route)
    this.app.get('/api/v1/artifacts/types', (req, res) => {
      const artifactTypes = [
        {
          type: 'business-plan',
          description: 'Comprehensive business plan with financial projections',
          quality: ['draft', 'review', 'production']
        },
        {
          type: 'technical-specification',
          description: 'Technical architecture and implementation specification',
          quality: ['draft', 'review', 'production']
        },
        {
          type: 'design-system',
          description: 'Complete design system with components and guidelines',
          quality: ['draft', 'review', 'production']
        },
        {
          type: 'marketing-strategy',
          description: 'Go-to-market strategy and customer acquisition plan',
          quality: ['draft', 'review', 'production']
        }
      ];

      res.json({
        ok: true,
        artifactTypes: artifactTypes
      });
    });

    // List all generated artifacts (index)
    this.app.get('/api/v1/artifacts', (req, res) => {
      try {
        const { type, quality, limit = 50, offset = 0 } = req.query;
        let artifacts = Array.from(this.artifactsIndex.values());
        
        // Apply filters
        if (type) {
          artifacts = artifacts.filter(a => a.type === type);
        }
        if (quality) {
          artifacts = artifacts.filter(a => a.quality === quality);
        }
        
        // Sort by creation date (newest first)
        artifacts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // Apply pagination
        const total = artifacts.length;
        const paginatedArtifacts = artifacts.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
        
        res.json({
          ok: true,
          artifacts: paginatedArtifacts,
          total,
          offset: parseInt(offset),
          limit: parseInt(limit),
          hasMore: (parseInt(offset) + parseInt(limit)) < total
        });
      } catch (error) {
        console.error('Failed to list artifacts:', error);
        res.status(500).json({
          ok: false,
          error: error.message
        });
      }
    });

    // Get specific artifact by ID
    this.app.get('/api/v1/artifacts/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const artifact = await this.getArtifact(id);
        
        if (!artifact) {
          return res.status(404).json({
            ok: false,
            error: 'Artifact not found'
          });
        }
        
        res.json({
          ok: true,
          artifact: artifact
        });
      } catch (error) {
        console.error('Failed to get artifact:', error);
        res.status(500).json({
          ok: false,
          error: error.message
        });
      }
    });

    // Download artifact content as file
    this.app.get('/api/v1/artifacts/:id/download', async (req, res) => {
      try {
        const { id } = req.params;
        const { format = 'markdown' } = req.query;
        const artifact = await this.getArtifact(id);
        
        if (!artifact) {
          return res.status(404).json({
            ok: false,
            error: 'Artifact not found'
          });
        }
        
        switch (format.toLowerCase()) {
          case 'json':
            const filename = `${artifact.type}-${id}.json`;
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.json(artifact);
            break;
            
          case 'html':
            const htmlFilename = `${artifact.type}-${id}.html`;
            const htmlContent = this.generateHtmlArtifact(artifact);
            res.setHeader('Content-Disposition', `attachment; filename="${htmlFilename}"`);
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(htmlContent);
            break;
            
          case 'markdown':
          default:
            const mdFilename = `${artifact.type}-${id}.md`;
            res.setHeader('Content-Disposition', `attachment; filename="${mdFilename}"`);
            res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
            res.send(artifact.content);
            break;
        }
      } catch (error) {
        console.error('Failed to download artifact:', error);
        res.status(500).json({
          ok: false,
          error: error.message
        });
      }
    });

    // Get artifact history with timeline data
    this.app.get('/api/v1/artifacts/history/timeline', async (req, res) => {
      try {
        const { days = 30 } = req.query;
        const cutoff = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);
        
        const artifacts = Array.from(this.artifactsIndex.values())
          .filter(a => new Date(a.createdAt) >= cutoff)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // Group by date for timeline
        const timeline = {};
        artifacts.forEach(a => {
          const date = new Date(a.createdAt).toISOString().split('T')[0];
          if (!timeline[date]) {
            timeline[date] = { date, artifacts: [], count: 0 };
          }
          timeline[date].artifacts.push(a);
          timeline[date].count++;
        });
        
        // Type distribution
        const byType = {};
        artifacts.forEach(a => {
          byType[a.type] = (byType[a.type] || 0) + 1;
        });
        
        res.json({
          ok: true,
          timeline: Object.values(timeline),
          byType,
          total: artifacts.length,
          period: `Last ${days} days`
        });
      } catch (error) {
        console.error('Failed to get artifact history:', error);
        res.status(500).json({
          ok: false,
          error: error.message
        });
      }
    });

  }

  setupIntegrationRoutes() {
    // Book Worm Mode activation
    this.app.post('/api/v1/bookworm/activate', async (req, res) => {
      try {
        const { content, analysisType, depth } = req.body;
        
        if (!content) {
          return res.status(400).json({
            error: 'Book Worm Mode requires content to analyze'
          });
        }

        // Comprehensive analysis simulation
        const analysis = this.simulateBookWormAnalysis(content, analysisType, depth);
        
        res.json({
          ok: true,
          bookWormResults: analysis,
          message: 'Book Worm Mode analysis completed with professional artifacts'
        });

      } catch (error) {
        console.error('Book Worm Mode failed:', error);
        res.status(500).json({
          ok: false,
          error: error.message
        });
      }
    });

    // System capabilities overview
    this.app.get('/api/v1/capabilities', (req, res) => {
      const capabilities = {
        workflowOrchestration: {
          description: 'End-to-end product development workflows',
          workflows: ['concept-to-market', 'rapid-mvp'],
          features: ['quality gates', 'progress tracking', 'risk management']
        },
        dynamicLearning: {
          description: 'On-demand skill acquisition for any domain',
          modes: ['project-based', 'industry-focused', 'skill-specific'],
          features: ['contextual learning', 'proficiency tracking']
        },
        bookWormAnalysis: {
          description: 'Professional-grade document analysis and feedback',
          modes: ['rapid', 'focused', 'comprehensive'],
          features: ['quality assessment', 'gap identification', 'improvement recommendations']
        },
        artifactGeneration: {
          description: 'Production-ready deliverable creation',
          types: ['business-documents', 'technical-specs', 'design-systems'],
          quality: ['draft', 'review', 'production']
        }
      };

      res.json({
        ok: true,
        capabilities: capabilities,
        status: 'All systems operational',
        version: '1.0.0'
      });
    });

    // === Showcase Demo Endpoints ===
    // Stage 1: Generate Ideas
    this.app.post('/api/v1/showcase/generate-ideas', async (req, res) => {
      try {
        const providers = ['DeepSeek', 'Claude', 'GPT-4', 'Gemini', 'Ollama'];
        const ideas = [
          { name: 'QuantumSync', description: 'AI-powered workflow automation for teams', provider: 'DeepSeek' },
          { name: 'EcoPulse', description: 'Sustainable energy optimization platform', provider: 'Claude' },
          { name: 'MindMesh', description: 'Neural network for personal knowledge management', provider: 'GPT-4' },
          { name: 'HealthHive', description: 'Smart health monitoring ecosystem', provider: 'Gemini' },
          { name: 'SkillSphere', description: 'Adaptive learning and skill development hub', provider: 'Ollama' }
        ].map((idea, i) => ({ ...idea, id: `idea-${Date.now()}-${i}` }));
        
        res.json({ ok: true, ideas });
      } catch (error) {
        console.error('Stage 1 failed:', error);
        res.status(500).json({ ok: false, error: error.message });
      }
    });

    // Stage 2: Critique Ideas
    this.app.post('/api/v1/showcase/critique-ideas', async (req, res) => {
      try {
        const providers = ['DeepSeek', 'Claude', 'GPT-4', 'Gemini', 'Ollama'];
        const ideas = ['QuantumSync', 'EcoPulse', 'MindMesh', 'HealthHive', 'SkillSphere'];
        const critiques = [];
        
        for (const idea of ideas) {
          for (const provider of providers) {
            const score = Math.round(7 + Math.random() * 3);
            critiques.push({
              idea,
              provider,
              score,
              summary: `${provider} rates ${idea}: ${score}/10. ${score > 8 ? 'Strong potential.' : 'Needs refinement.'}`,
              text: `Detailed critique for ${idea} by ${provider}.`
            });
          }
        }
        
        res.json({ ok: true, providers, totalCritiques: critiques.length, critiques });
      } catch (error) {
        console.error('Stage 2 failed:', error);
        res.status(500).json({ ok: false, error: error.message });
      }
    });

    // Stage 3: Select Best Idea
    this.app.post('/api/v1/showcase/select-best', async (req, res) => {
      try {
        const ideas = [
          { name: 'QuantumSync', scores: [9, 8, 9, 8, 9] },
          { name: 'EcoPulse', scores: [8, 8, 8, 8, 8] },
          { name: 'MindMesh', scores: [7, 8, 7, 8, 7] },
          { name: 'HealthHive', scores: [8, 9, 8, 9, 8] },
          { name: 'SkillSphere', scores: [9, 9, 10, 9, 9] }
        ];
        
        let winner = ideas[0];
        let bestAvg = 0;
        
        for (const idea of ideas) {
          const avg = idea.scores.reduce((a, b) => a + b, 0) / idea.scores.length;
          if (avg > bestAvg) {
            bestAvg = avg;
            winner = idea;
          }
        }
        
        winner.avgScore = bestAvg.toFixed(2);
        winner.consensus = bestAvg > 8.5 ? 'Unanimous' : 'Majority';
        
        res.json({ ok: true, winner });
      } catch (error) {
        console.error('Stage 3 failed:', error);
        res.status(500).json({ ok: false, error: error.message });
      }
    });

    // Stage 4: Generate Docs
    this.app.post('/api/v1/showcase/generate-docs', async (req, res) => {
      try {
        const requirements = {
          productName: 'SkillSphere',
          description: 'Adaptive learning and skill development hub',
          audience: 'Professionals, students, lifelong learners'
        };
        
        const types = ['business-plan', 'technical-specification', 'marketing-strategy'];
        const artifacts = [];
        
        for (const type of types) {
          const artifact = await this.generateSimulatedArtifact(type, requirements, 'production');
          const saveResult = await this.saveArtifact(artifact);
          
          if (saveResult) {
            artifact.id = saveResult.id;
            artifact.createdAt = saveResult.createdAt;
          }
          
          artifact.preview = artifact.content.substring(0, 400) + '...';
          artifacts.push(artifact);
        }
        
        res.json({ ok: true, artifacts });
      } catch (error) {
        console.error('Stage 4 failed:', error);
        res.status(500).json({ ok: false, error: error.message });
      }
    });

    // Stage 5: Finalize Presentation
    this.app.post('/api/v1/showcase/finalize', async (req, res) => {
      try {
        const productName = 'SkillSphere';
        const tagline = 'Adaptive learning and skill development hub';
        
        // Get last 3 artifacts
        const allArtifacts = Array.from(this.artifactsIndex.values())
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 3);
        
        // Load full artifacts with content
        const artifacts = [];
        for (const indexEntry of allArtifacts) {
          const fullArtifact = await this.getArtifact(indexEntry.id);
          if (fullArtifact) {
            fullArtifact.preview = fullArtifact.content?.substring(0, 400) + '...';
            artifacts.push(fullArtifact);
          }
        }
        
        const critiques = [
          { provider: 'Claude', score: 9, summary: 'Excellent market fit and technical approach.' },
          { provider: 'GPT-4', score: 10, summary: 'Outstanding innovation and scalability.' },
          { provider: 'Gemini', score: 9, summary: 'Strong go-to-market and user engagement.' }
        ];
        
        const stats = {
          ideasGenerated: 5,
          critiquesReceived: 25,
          artifactsCreated: artifacts.length,
          timeElapsed: 7
        };
        
        res.json({ ok: true, productName, tagline, artifacts, critiques, stats });
      } catch (error) {
        console.error('Stage 5 failed:', error);
        res.status(500).json({ ok: false, error: error.message });
      }
    });
  }

  // Artifact persistence utilities
  generateArtifactId() {
    return `art-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async saveArtifact(artifact) {
    try {
      const id = this.generateArtifactId();
      const timestamp = new Date().toISOString();
      
      // Create artifact record with metadata
      const record = {
        id,
        ...artifact,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      
      // Save to individual file
      const fileName = `${id}.json`;
      const filePath = path.join(this.artifactsDir, fileName);
      await fs.writeFile(filePath, JSON.stringify(record, null, 2));
      
      // Update index
      this.artifactsIndex.set(id, {
        id,
        type: artifact.type,
        quality: artifact.quality,
        createdAt: timestamp,
        fileName,
        metadata: artifact.metadata || {}
      });
      
      // Persist index
      await this.persistData();
      
      return { id, createdAt: timestamp };
    } catch (error) {
      console.error('Failed to save artifact:', error.message);
      return null;
    }
  }

  async getArtifact(id) {
    try {
      const indexEntry = this.artifactsIndex.get(id);
      if (!indexEntry) return null;
      
      const filePath = path.join(this.artifactsDir, indexEntry.fileName);
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load artifact:', error.message);
      return null;
    }
  }

  generateHtmlArtifact(artifact) {
    // Simple but professional HTML export
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${artifact.type} - TooLoo.ai</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
               line-height: 1.6; padding: 40px; max-width: 900px; margin: 0 auto; 
               background: #f5f5f5; color: #333; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
        .header h1 { font-size: 28px; margin-bottom: 8px; }
        .meta { display: flex; gap: 20px; font-size: 14px; opacity: 0.9; }
        .content { background: white; padding: 40px; border-radius: 12px; 
                   box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .content h1 { color: #667eea; margin-top: 24px; margin-bottom: 12px; font-size: 24px; }
        .content h2 { color: #764ba2; margin-top: 20px; margin-bottom: 10px; font-size: 20px; }
        .content p { margin-bottom: 16px; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #999; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${artifact.type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</h1>
        <div class="meta">
            <span>Quality: ${artifact.quality}</span>
            <span>Generated: ${new Date(artifact.createdAt || artifact.metadata?.generated).toLocaleDateString()}</span>
            <span>Score: ${artifact.metadata?.qualityScore || 'N/A'}</span>
        </div>
    </div>
    <div class="content">
        ${artifact.content.split('\n').map(line => {
          if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`;
          if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
          if (line.startsWith('**') && line.endsWith('**')) return `<p><strong>${line.slice(2, -2)}</strong></p>`;
          if (line.trim() === '') return '';
          return `<p>${line}</p>`;
        }).join('\n')}
    </div>
    <div class="footer">
        Generated by TooLoo.ai Professional Artifact Generator
    </div>
</body>
</html>`;
  }

  // Utility methods for simulation
  generateWorkflowId() {
    return `wf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getWorkflowPhases(type) {
    const phaseMap = {
      'concept-to-market': [
        { name: 'discovery', status: 'active' },
        { name: 'strategy', status: 'pending' },
        { name: 'development', status: 'pending' },
        { name: 'launch', status: 'pending' },
        { name: 'scale', status: 'pending' }
      ],
      'rapid-mvp': [
        { name: 'validate', status: 'active' },
        { name: 'build', status: 'pending' },
        { name: 'test', status: 'pending' }
      ]
    };
    return phaseMap[type] || phaseMap['concept-to-market'];
  }

  async simulatePhaseExecution(workflow, phase) {
    // Simulate phase execution with realistic timing
    await new Promise(resolve => setTimeout(resolve, 100));
    // Select artifact templates based on workflow type and phase
    const type = workflow.type || 'default';
    const phaseName = phase || workflow.currentPhase;
    let selected = [];
    if (phaseName === 'discovery') selected = ['business-plan', 'user-journey-map'];
    else if (phaseName === 'strategy') selected = ['go-to-market-plan', 'risk-assessment'];
    else if (phaseName === 'development') selected = ['technical-specification', 'pitch-deck'];
    else if (phaseName === 'launch') selected = ['investor-summary', 'pitch-deck'];
    else selected = ['default'];
    const artifacts = selected.map(key => {
      const t = this.artifactTemplates.get(key) || this.artifactTemplates.get('default');
      return {
        type: key,
        format: t.format,
        sections: t.sections,
        quality: t.quality[2],
        generatedAt: new Date().toISOString()
      };
    });
    return {
      phase: phaseName,
      qualityScore: 0.9,
      artifacts,
      insights: ['Market validated', 'Technical approach confirmed'],
      nextActions: ['Proceed to next phase', 'Review deliverables']
    };
  }

  simulateDocumentAnalysis(content, type, mode) {
    const wordCount = content.split(' ').length;
    const complexityScore = Math.min(wordCount / 1000, 1.0);
    
    return {
      metadata: {
        qualityScore: 0.82,
        wordCount: wordCount,
        analysisMode: mode,
        documentType: type
      },
      analysis: {
        structure: { score: 0.8, clarity: 'good' },
        content: { completeness: 0.85, relevance: 0.9 },
        quality: { overall: 0.82, professional: true }
      },
      feedback: {
        executive: 'Document shows strong foundation with opportunities for enhancement.',
        recommendations: [
          { priority: 'high', area: 'market-analysis', description: 'Expand competitive landscape section' },
          { priority: 'medium', area: 'financials', description: 'Add sensitivity analysis to projections' },
          { priority: 'low', area: 'formatting', description: 'Standardize section headers' }
        ],
        strengths: ['Clear value proposition', 'Solid technical approach'],
        improvements: ['Market size validation', 'Risk assessment detail']
      }
    };
  }

  simulateBookWormAnalysis(content, analysisType, depth) {
    const analysis = this.simulateDocumentAnalysis(content, analysisType || 'comprehensive', depth || 'comprehensive');
    
    return {
      analysis: analysis,
      artifacts: [
        {
          type: 'professional-report',
          title: 'Book Worm Analysis Report',
          content: '# Professional Analysis\n\nComprehensive review completed with actionable insights...'
        },
        {
          type: 'action-plan',
          title: 'Implementation Roadmap',
          content: '# Action Plan\n\n## Priority 1 Actions\n- Address market analysis gaps\n- Validate financial assumptions'
        }
      ],
      insights: analysis.feedback.recommendations.slice(0, 5),
      nextActions: ['Implement priority recommendations', 'Generate supporting artifacts', 'Schedule follow-up analysis']
    };
  }

  async generateSimulatedArtifact(type, requirements, quality) {
    const templates = this.artifactTemplates.get(type) || this.artifactTemplates.get('default');

    // Simple quality scoring guardrail
    const reqCount = Object.keys(requirements||{}).length;
    const sectionCount = templates.sections?.length || 5;
    const base = 0.6 + Math.min(0.2, (reqCount/10));
    const sectionBonus = Math.min(0.2, (sectionCount/10));
    const qualityScore = Math.min(1.0, Number((base + sectionBonus).toFixed(2)));
    const thresholds = { draft: 0.0, review: 0.75, production: 0.85 };
    const requested = (quality || 'production').toLowerCase();
    let decidedQuality = requested;
    let rationale = 'meets threshold';
    if (requested === 'production' && qualityScore < thresholds.production) {
      decidedQuality = qualityScore >= thresholds.review ? 'review' : 'draft';
      rationale = `downgraded: score ${qualityScore} < production ${thresholds.production}`;
    } else if (requested === 'review' && qualityScore < thresholds.review) {
      decidedQuality = 'draft';
      rationale = `downgraded: score ${qualityScore} < review ${thresholds.review}`;
    }

    // Generate content using AI (async) with fallback handled inside
    const content = await this.generateArtifactContent(type, requirements);

    return {
      type: type,
      quality: decidedQuality,
      content: content,
      metadata: {
        generated: new Date().toISOString(),
        requirements: reqCount,
        sections: sectionCount,
        qualityScore,
        requestedQuality: requested,
        decision: rationale
      },
      files: [
        {
          name: `${type}-${Date.now()}.md`,
          content: content,
          type: 'primary'
        }
      ]
    };
  }

  async generateArtifactContent(type, requirements) {
    const productName = requirements.productName || requirements.companyName || 'Product';
    const description = requirements.description || '';
    const audience = requirements.audience || '';
    
    // Build context for AI generation
    const contextInfo = `Product: ${productName}\nDescription: ${description}\nTarget Audience: ${audience}`;
    
    // Use real AI to generate professional content
    try {
  const { generateSmartLLM } = await import('../engine/llm-provider.js');
      
      let prompt = '';
      switch (type) {
        case 'business-plan':
          prompt = `Create a comprehensive, professional business plan for "${productName}". ${description ? 'Description: ' + description : ''} ${audience ? 'Target audience: ' + audience : ''}\n\nInclude:\n- Executive Summary (2-3 paragraphs)\n- Market Analysis with specific data points\n- Competitive Landscape\n- Business Model and Revenue Streams\n- Financial Projections (3-year outlook)\n- Go-to-Market Strategy\n- Risk Assessment\n\nMake it investor-ready and specific to this product. Use markdown formatting.`;
          break;
        
        case 'technical-specification':
          prompt = `Create a detailed technical specification for "${productName}". ${description ? 'Description: ' + description : ''} ${audience ? 'Target users: ' + audience : ''}\n\nInclude:\n- System Architecture (detailed components)\n- Technology Stack with justifications\n- API Design (RESTful endpoints)\n- Data Models and Schemas\n- Security Architecture\n- Scalability Plan\n- Performance Requirements\n- Integration Points\n\nMake it implementation-ready. Use markdown formatting with code examples where appropriate.`;
          break;
        
        case 'marketing-strategy':
          prompt = `Create a comprehensive marketing strategy for "${productName}". ${description ? 'Description: ' + description : ''} ${audience ? 'Target audience: ' + audience : ''}\n\nInclude:\n- Target Market Analysis\n- Customer Personas (3-4 detailed profiles)\n- Value Proposition and Messaging\n- Channel Strategy (digital, content, paid, organic)\n- Campaign Timeline (6-month plan)\n- Budget Allocation\n- KPIs and Success Metrics\n- Competitor Positioning\n\nMake it actionable and specific. Use markdown formatting.`;
          break;
        
        default:
          prompt = `Create a professional ${type.replace('-', ' ')} for "${productName}". ${description ? 'Description: ' + description : ''}\n\nMake it comprehensive, actionable, and production-ready. Use markdown formatting.`;
      }
      
      const response = await generateSmartLLM({
        prompt,
        taskType: 'analysis',
        criticality: 'high', // Use high criticality for professional artifacts
        maxTokens: 3000 // Allow longer, comprehensive outputs
      });
      
      if (response && response.text) {
        return response.text;
      }
    } catch (error) {
      console.error('AI generation failed, using fallback:', error.message);
    }
    
    // Fallback to basic template if AI fails
    const contextSection = description || audience ? `\n\n## Project Context\n${description ? '**Description:** ' + description + '\n\n' : ''}${audience ? '**Target Audience:** ' + audience + '\n\n' : ''}` : '';
    
    switch (type) {
      case 'business-plan':
        return `# Business Plan: ${productName}${contextSection}## Executive Summary\nComprehensive business plan with market analysis and financial projections.\n\n## Market Analysis\nTarget market validation and competitive landscape.\n\n## Financial Projections\nRevenue forecasts and funding requirements.\n\n*Generated by TooLoo.ai Professional Artifact Generator*`;
      
      case 'technical-specification':
        return `# Technical Specification: ${productName}${contextSection}## System Architecture\nScalable architecture designed for growth.\n\n## API Design\nRESTful API with comprehensive documentation.\n\n## Security\nIndustry-standard security measures.\n\n*Generated by TooLoo.ai Technical Specification Generator*`;
      
      case 'marketing-strategy':
        return `# Marketing Strategy: ${productName}${contextSection}## Go-to-Market Plan\nStrategic approach to market entry and customer acquisition.\n\n## Customer Segments\nDetailed analysis of target customer segments and positioning.\n\n## Campaign Strategy\nMulti-channel marketing approach with success metrics.\n\n*Generated by TooLoo.ai Marketing Strategy Generator*`;
      
      default:
        return `# ${type.charAt(0).toUpperCase() + type.slice(1)}: ${productName}${contextSection}Professional ${type} generated with comprehensive analysis and recommendations.\n\n*Generated by TooLoo.ai Artifact Generator*`;
    }
  }

  getSkillApplications(skillName) {
    const applicationMap = {
      'market-analysis': ['competitor research', 'market sizing', 'trend analysis'],
      'business-strategy': ['business model design', 'strategic planning', 'financial modeling'],
      'technical-architecture': ['system design', 'scalability planning', 'technology selection'],
      'user-experience': ['user research', 'interaction design', 'usability testing']
    };
    return applicationMap[skillName] || ['general application', 'project support'];
  }

  getProjectSkills(projectType) {
    const skillMap = {
      'saas-product': ['market-analysis', 'technical-architecture', 'user-experience', 'business-strategy'],
      'mobile-app': ['user-experience', 'mobile-development', 'app-store-optimization'],
      'e-commerce': ['digital-marketing', 'conversion-optimization', 'inventory-management']
    };
    return skillMap[projectType] || ['project-management', 'analysis'];
  }

  categorizeToDomain(skillName) {
    if (skillName.includes('technical') || skillName.includes('architecture')) return 'technical';
    if (skillName.includes('business') || skillName.includes('market')) return 'business';
    if (skillName.includes('design') || skillName.includes('user')) return 'design';
    if (skillName.includes('marketing') || skillName.includes('growth')) return 'marketing';
    return 'general';
  }

  initializeArtifactTemplates() {
    const templates = new Map();
    templates.set('business-plan', {
      sections: ['executive-summary', 'market-analysis', 'financial-projections'],
      format: 'markdown',
      quality: ['draft', 'review', 'production']
    });
    templates.set('technical-specification', {
      sections: ['architecture', 'requirements', 'implementation'],
      format: 'markdown',
      quality: ['draft', 'review', 'production']
    });
    templates.set('pitch-deck', {
      sections: ['problem', 'solution', 'traction', 'team', 'financials'],
      format: 'presentation',
      quality: ['draft', 'review', 'production']
    });
    templates.set('go-to-market-plan', {
      sections: ['target-market', 'channels', 'budget', 'timeline'],
      format: 'markdown',
      quality: ['draft', 'review', 'production']
    });
    templates.set('user-journey-map', {
      sections: ['persona', 'touchpoints', 'pain-points', 'opportunities'],
      format: 'diagram',
      quality: ['draft', 'review', 'production']
    });
    templates.set('risk-assessment', {
      sections: ['risks', 'mitigation', 'impact', 'likelihood'],
      format: 'markdown',
      quality: ['draft', 'review', 'production']
    });
    templates.set('investor-summary', {
      sections: ['company-overview', 'market', 'traction', 'ask'],
      format: 'markdown',
      quality: ['draft', 'review', 'production']
    });
    templates.set('default', {
      sections: ['overview', 'details', 'recommendations'],
      format: 'markdown',
      quality: ['draft', 'review', 'production']
    });
    return templates;
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`🏭 Product Development Server running on port ${this.port}`);
      console.log(`📊 Capabilities: Workflow Orchestration | Dynamic Learning | Book Worm Analysis | Artifact Generation`);
      console.log(`🚀 Ready for professional product development workflows`);
    });
  }
}

// Create and start server
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new ProductDevelopmentServer();
  server.start();
}

export { ProductDevelopmentServer };