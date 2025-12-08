// @version 3.3.300 - Flow System
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { bus } from '../core/event-bus.js';
import { SocketServer } from './socket.js';
import apiRoutes from './routes/api.js';
import systemRoutes from './routes/system.js';
import providersRoutes from './routes/providers.js';
import orchestratorRoutes from './routes/orchestrator.js';
import capabilitiesRoutes from './routes/capabilities.js';
import githubRoutes from './routes/github.js';
import projectsRoutes from './routes/projects.js';
import chatRoutes from './routes/chat.js';
import designRoutes from './routes/design.js';
import visualsRoutes from './routes/visuals.js';
import workflowsRoutes from './routes/workflows.js';
import observabilityRoutes from './routes/observability.js';
import contextRoutes from './routes/context.js';
import learningRoutes from './routes/learning.js';
import assetsRoutes from './routes/assets.js';
import { trainingRoutes } from './routes/training.js';
import { cortexRoutes } from './routes/cortex.js';
import { explorationRoutes } from './routes/exploration.js';
import emergenceRoutes from './routes/emergence.js';
import { serendipityRoutes } from './routes/serendipity.js';
import suggestionsRoutes from './routes/suggestions.js';
import qaRoutes from '../qa/routes/qa.js';
import diagnosticRoutes from './routes/diagnostic.js';
import costRoutes from './routes/cost.js';
import { generateRoutes } from './routes/generate.js';
import agentRoutes from './routes/agent.js';
import selfModRoutes from './routes/self-mod.js';
import autonomousModRoutes from './routes/autonomous-mod.js';
import cognitiveRoutes from './routes/cognitive.js';
import { growthEngineRoutes } from './routes/growth-engine.js';
import { configurationRoutes } from './routes/configuration.js';
import { reflectionRoutes } from './routes/reflection.js';
import flowRoutes from './routes/flow.js';
import { registry } from '../core/module-registry.js';
import { SYSTEM_VERSION } from '../core/system-info.js';
import { autoArchitect } from './auto-architect.js';
import { NexusInterface } from './interface.js';
import { precog } from '../precog/index.js';
import { suggestionAggregator } from '../cortex/discover/suggestion-aggregator.js';
import { contractEnforcer } from './middleware/contract-enforcer.js';

export function createNexusApp() {
  const app = express();

  app.use(express.json());

  // Hard-wire API Contracts
  app.use(contractEnforcer);

  // System Routes
  app.use('/api/v1/system', systemRoutes);
  app.use('/api/v1/providers', providersRoutes);
  app.use('/api/v1/orchestrator', orchestratorRoutes);
  app.use('/api/v1/capabilities', capabilitiesRoutes);
  app.use('/api/v1/github', githubRoutes);
  app.use('/api/v1/projects', projectsRoutes);
  app.use('/api/v1/chat', chatRoutes);
  app.use('/api/v1/design', designRoutes);
  app.use('/api/v1/visuals', visualsRoutes);
  app.use('/api/v1/workflows', workflowsRoutes);
  app.use('/api/v1/observability', observabilityRoutes);
  app.use('/api/v1/context', contextRoutes);
  app.use('/api/v1/learning', learningRoutes);
  app.use('/api/v1/assets', assetsRoutes);
  app.use('/api/v1/cortex', cortexRoutes);
  app.use('/api/v1/exploration', explorationRoutes);
  app.use('/api/v1/emergence', emergenceRoutes);
  app.use('/api/v1/serendipity', serendipityRoutes);
  app.use('/api/v1/suggestions', suggestionsRoutes);
  app.use('/api/v1/qa', qaRoutes);
  app.use('/api/v1/cost', costRoutes);
  app.use('/api/v1/generate', generateRoutes);
  app.use('/api/v1/agent', agentRoutes);
  app.use('/api/v1/system/self', selfModRoutes);
  app.use('/api/v1/system/autonomous', autonomousModRoutes);
  app.use('/api/v1/cognitive', cognitiveRoutes);
  app.use('/api/v1/growth', growthEngineRoutes);
  app.use('/api/v1/config', configurationRoutes);
  app.use('/api/v1/reflection', reflectionRoutes);
  app.use('/api/v1/flow', flowRoutes);
  app.use('/api/v1', diagnosticRoutes);

  // Training & Sources Routes (Precog)
  app.use('/api/v1', trainingRoutes);

  // API Routes
  app.use('/api/v1', apiRoutes);

  // Redirect /visuals.html to /app/visuals.html
  app.get('/visuals.html', (req, res) => {
    res.redirect('/app/visuals.html');
  });

  // Legacy System Control
  app.post('/system/start', (req, res) => {
    bus.publish('nexus', 'system:start_request', {});
    res.json({ ok: true, message: 'System start initiated' });
  });

  app.post('/system/stop', (req, res) => {
    bus.publish('nexus', 'system:stop_request', {});
    res.json({ ok: true, message: 'System stop initiated' });
  });

  // Serve React App Build
  const distPath = path.join(process.cwd(), 'src', 'web-app', 'dist');
  app.use(express.static(distPath));
  console.log(`[Nexus] Serving React app from: ${distPath}`);

  // Static Files (Web App) - Optional fallback
  const webAppPath = path.join(process.cwd(), 'src', 'web-app');

  console.log(`[Nexus] Serving static files from: ${webAppPath}`);

  // Health Check
  app.get('/health', (req, res) => {
    const providerStatus = precog.providers.getProviderStatus();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      providers: providerStatus,
    });
  });

  // SPA Fallback for Client-Side Routing
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });

  return app;
}

export function startNexus(port?: number): Promise<void> {
  const PORT = port || Number(process.env['PORT']) || 4000;

  // Initialize Auto-Architect
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  autoArchitect;
  // Initialize Nexus Interface (Synapse)
  new NexusInterface();

  // Initialize SuggestionAggregator for symbiotic learning
  suggestionAggregator.initialize().catch((err) => {
    console.warn('[Nexus] SuggestionAggregator initialization warning:', err);
  });

  registry.register({
    name: 'nexus',
    version: SYSTEM_VERSION,
    status: 'booting',
    meta: { port: PORT },
  });

  const app = createNexusApp();
  const httpServer = createServer(app);

  // Set global server timeout to 5 minutes to match provider capabilities
  httpServer.setTimeout(300000);

  // Initialize Socket Server
  new SocketServer(httpServer);

  return new Promise((resolve) => {
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`[Nexus] Web Server running on port ${PORT}`);
      bus.publish('nexus', 'nexus:started', { port: PORT });
      resolve();
    });
  });
}
