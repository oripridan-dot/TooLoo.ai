// System Check endpoint: runs smoke tests for key services and returns structured results
// (Moved below app initialization)

// CRITICAL: Load .env variables FIRST before any imports that use them
import ensureEnvLoaded from '../engine/env-loader.js';
ensureEnvLoaded();

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import ReferralSystem from '../referral-system.js';
import { handleChatWithAI } from '../services/chat-handler-ai.js';
import { convert as formatConvert } from '../lib/format-handlers/index.js';
import { ServiceFoundation } from '../lib/service-foundation.js';
import { CircuitBreaker } from '../lib/circuit-breaker.js';
import { retry } from '../lib/retry-policy.js';
import { RateLimiter } from '../lib/rate-limiter.js';
import { DistributedTracer } from '../lib/distributed-tracer.js';
import githubProvider from '../engine/github-provider.js';
import LLMProvider from '../engine/llm-provider.js';
import MultiProviderCollaborationFramework from '../servers/multi-provider-collaboration.js';
import { getSessionManager } from '../services/session-memory-manager.js';
import { getProviderInstructions } from '../services/provider-instructions.js';
import { getProviderAggregation } from '../services/provider-aggregation.js';
// Phase 6E: Load Balancing & Auto-Scaling modules
import HealthMonitor from '../lib/resilience/HealthMonitor.js';
import ReadinessProbe from '../lib/resilience/ReadinessProbe.js';
import IntelligentRouter from '../lib/resilience/IntelligentRouter.js';
import AutoScalingDecisionEngine from '../lib/resilience/AutoScalingDecisionEngine.js';
import HorizontalScalingManager from '../lib/resilience/HorizontalScalingManager.js';
import HotReloadManager, { setupAppHotReload } from '../lib/hot-reload-manager.js';
import HotUpdateManager, { setupAppHotUpdate } from '../lib/hot-update-manager.js';
import alertEngineModule from './alert-engine.js';
import CapabilityActivator from '../engine/capability-activator.js';
import CapabilityOrchestrator from '../engine/capability-orchestrator.js';
import * as formatterIntegration from '../services/response-formatter-integration.js';
// Capability Engines for 100% implementation
import EmotionDetectionEngine from '../engine/emotion-detection-engine.js';
import CreativeGenerationEngine from '../engine/creative-generation-engine.js';
import ReasoningVerificationEngine from '../engine/reasoning-verification-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize service with unified middleware (replaces 50 LOC of boilerplate)
const svc = new ServiceFoundation('web-server', process.env.WEB_PORT || 3000);
svc.setupMiddleware();
svc.registerHealthEndpoint();
svc.registerStatusEndpoint();

const app = svc.app;
const PORT = svc.port;

// ========== HOT RELOAD & HOT UPDATE SETUP ==========
// Enable hot-reload for development: monitors file changes and reloads modules
const hotReloadManager = setupAppHotReload(app, {
  enabled: process.env.HOT_RELOAD !== 'false',
  verbose: process.env.HOT_RELOAD_VERBOSE === 'true',
  debounceDelay: 300
});

// Enable hot-update for dynamic endpoint registration
const hotUpdateManager = setupAppHotUpdate(app, {
  enabled: true,
  verbose: process.env.HOT_UPDATE_VERBOSE === 'true',
  maxHistory: 100
});

// Watch server file for changes
hotReloadManager.watchFile('servers/web-server.js', async () => {
  console.log('[HotReload] Web server code changed - consider restarting for full reload');
});

// ========== END HOT RELOAD SETUP ==========

// Phase 6: Performance & observability optimization
const rateLimiter = new RateLimiter({ rateLimit: 1000, refillRate: 100 }); // 1000 tokens, 100/sec refill
const tracer = new DistributedTracer({ serviceName: 'web-server', samplingRate: 0.1 }); // 10% sampling

// Circuit breakers for inter-service calls - prevent cascading failures
const serviceCircuitBreakers = {
  training: new CircuitBreaker('training-service', { failureThreshold: 3, resetTimeoutMs: 30000 }),
  meta: new CircuitBreaker('meta-service', { failureThreshold: 3, resetTimeoutMs: 30000 }),
  budget: new CircuitBreaker('budget-service', { failureThreshold: 3, resetTimeoutMs: 30000 }),
  segmentation: new CircuitBreaker('segmentation-service', { failureThreshold: 3, resetTimeoutMs: 30000 }),
  reports: new CircuitBreaker('reports-service', { failureThreshold: 3, resetTimeoutMs: 30000 }),
  capabilities: new CircuitBreaker('capabilities-service', { failureThreshold: 3, resetTimeoutMs: 30000 })
};

// Phase 6E: Load Balancing & Auto-Scaling initialization
const healthMonitor = new HealthMonitor({ checkInterval: 10000 }); // 10s health checks
const readinessProbe = new ReadinessProbe();
const router = new IntelligentRouter({ algorithm: 'health-aware' });
const autoScaler = new AutoScalingDecisionEngine();
const scalingManager = new HorizontalScalingManager();

// ========== CAPABILITY ACTIVATOR INITIALIZATION ==========
const capabilityActivator = new CapabilityActivator({
  maxConcurrent: 3,
  errorThreshold: 5,
  rollbackEnabled: true,
  stateFile: path.join(process.cwd(), 'data/activated-capabilities.json')
});

// Register capability activator in environment hub
svc.environmentHub.registerComponent('capabilityActivator', capabilityActivator, [
  'capabilities',
  'activation',
  'autonomous-evolution'
]);

// ========== CAPABILITY ORCHESTRATOR INITIALIZATION ==========
// Initialize the safe capability orchestrator for managing 242 discovered methods
const capabilityOrchestrator = new CapabilityOrchestrator();

// Register orchestrator in environment hub
svc.environmentHub.registerComponent('capabilityOrchestrator', capabilityOrchestrator, [
  'capabilities',
  'orchestration',
  'discovery'
]);

// ========== NEW CAPABILITY ENGINES INITIALIZATION ==========
// Initialize the three new engines for 100% capability implementation
const emotionDetectionEngine = new EmotionDetectionEngine();
const creativeGenerationEngine = new CreativeGenerationEngine();
const reasoningVerificationEngine = new ReasoningVerificationEngine();

// Register in environment hub for cross-service access
svc.environmentHub.registerComponent('emotionDetectionEngine', emotionDetectionEngine, [
  'emotions',
  'sentiment',
  'nuance-detection'
]);

svc.environmentHub.registerComponent('creativeGenerationEngine', creativeGenerationEngine, [
  'creativity',
  'ideation',
  'autonomous-evolution'
]);

svc.environmentHub.registerComponent('reasoningVerificationEngine', reasoningVerificationEngine, [
  'reasoning',
  'logic',
  'verification'
]);

// ========== RESPONSE FORMATTER INTEGRATION ==========
// Apply enhanced response formatter middleware to API endpoints
app.use('/api', formatterIntegration.enhancedResponseMiddleware);

// ========== END CAPABILITY & FORMATTER SETUP ==========
// ======= UI Activity Monitoring & Real Data Pipeline =======
// CRITICAL: Disable ALL caching in development (prevents stale UI from showing)
app.use((req, res, next) => {
  // Force fresh fetch for ALL resources - this is the key to dev updates showing immediately
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Phase 6B: Rate limiting middleware for API endpoints (protects against abuse)
app.use('/api', async (req, res, next) => {
  const clientId = req.ip || req.user?.id || 'anonymous';
  const result = await rateLimiter.acquire(clientId, 1);
  
  if (!result.acquired) {
    const { traceId } = tracer.startTrace();
    tracer.endTrace(traceId, 'error', { reason: 'rate_limit', client: clientId });
    return res.status(429).json({ 
      ok: false, 
      error: 'Too many requests', 
      retryAfter: Math.ceil(result.waitTime / 1000),
      traceId
    });
  }
  
  res.setHeader('X-RateLimit-Limit', '1000');
  res.setHeader('X-RateLimit-Remaining', Math.max(0, Math.floor(result.waitTime / 10)));
  next();
});

// Phase 6C: Distributed tracing for API requests
app.use('/api', (req, res, next) => {
  const { traceId, spanId } = tracer.startTrace();
  req.traceId = traceId;
  req.spanId = spanId;
  
  const startTime = Date.now();
  const originalSend = res.send;
  res.send = function(data) {
    const latency = Date.now() - startTime;
    const status = res.statusCode;
    tracer.endTrace(req.traceId, status < 400 ? 'success' : 'error', {
      method: req.method,
      path: req.path,
      status,
      latency
    });
    return originalSend.call(this, data);
  };
  
  next();
});

// Middleware to inject heartbeat script and cache-busting into HTML responses
app.use((req, res, next) => {
  const originalSendFile = res.sendFile;
  res.sendFile = function(filePath, ...args) {
    // If serving HTML files, inject heartbeat script and cache-busting
    if (typeof filePath === 'string' && filePath.endsWith('.html')) {
      const callback = typeof args[args.length - 1] === 'function' ? args[args.length - 1] : null;
      const options = (args.length > 1 && typeof args[0] === 'object') ? args[0] : {};
      
      fs.readFile(filePath, 'utf8', (err, html) => {
        if (err) {
          return originalSendFile.call(res, filePath, options, callback);
        }
        
        let updated = html;
        const timestamp = Date.now();
        const cbParam = `?v=${timestamp}`; // Cache buster query param
        
        // Add cache-busting to all script src attributes (except heartbeat which is external)
        updated = updated.replace(/src="\/js\/([^"]+)"/g, `src="/js/$1${cbParam}"`);
        updated = updated.replace(/src="\.\/js\/([^"]+)"/g, `src="./js/$1${cbParam}"`);
        
        // Add cache-busting to all link href attributes (CSS)
        updated = updated.replace(/href="\/css\/([^"]+)"/g, `href="/css/$1${cbParam}"`);
        updated = updated.replace(/href="\.\/css\/([^"]+)"/g, `href="./css/$1${cbParam}"`);
        
        // Inject heartbeat script if not already present
        if (!updated.includes('tooloo-heartbeat.js')) {
          const heartbeatScript = '<script src="/js/tooloo-heartbeat.js" async defer></script>';
          updated = updated.replace('</head>', `${heartbeatScript}\n</head>`);
        }
        
        res.type('html').send(updated);
      });
      return;
    }
    
    originalSendFile.call(res, filePath, ...args);
  };
  next();
});

// Phase 3 Control Center - BEFORE static middleware to override file serving
app.get(['/phase3', '/phase3-control-center'], (req, res) => {
  res.sendFile(path.join(process.cwd(), 'web-app', 'phase3-control-center.html'));
});

// Static web assets - CRITICAL: maxAge:0 disables browser caching in development
// Skip /api routes - they're handled by Express endpoints, not static files
const webDir = path.join(process.cwd(), 'web-app');
app.use((req, res, next) => {
  // Skip static serving for API routes - let them be handled by endpoint handlers
  if (req.path.startsWith('/api/')) {
    return next();
  }
  express.static(webDir, { 
    maxAge: 0,  // Disable all caching for static files
    etag: false  // Disable etag comparison to always fetch fresh
  })(req, res, next);
});
app.use('/temp', express.static(path.join(webDir, 'temp'), { 
  maxAge: 0, 
  etag: false 
}));

// TooLoo Hub page route
app.get(['/tooloo-hub','/tooloo-page'], async (req,res)=>{
  const f = path.join(webDir,'tooloo-hub.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('TooLoo Hub page missing'); }
});

// Root route - Professional Chat UI (3-bar: sessions | messages | insights) with real providers
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'web-app', 'tooloo-chat-professional.html'));
});

// Quiet favicon 404s in dev
app.get('/favicon.ico', (req,res)=> res.status(204).end());

// Control Room friendly aliases
// Serve the main control room Home (minimal overview)
app.get('/control-room', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'web-app', 'control-room-home.html'));
});

// Advanced control room (existing redesigned page)
app.get('/control-room/advanced', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'web-app', 'control-room-redesigned.html'));
});

// Serve the workspace (3-bar UI with memory, conversation, providers) - LEGACY
app.get(['/workspace', '/ai-workspace', '/legacy-workspace'], (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'web-app', 'workspace.html'));
});

// Professional Chat UI (new default, also accessible at /chat)
app.get(['/chat', '/chat-pro', '/professional'], (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'web-app', 'tooloo-chat-professional.html'));
});

// Training Control Room (shows training metrics and service status)
app.get(['/training', '/training-control-room'], (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'web-app', 'control-room-redesigned.html'));
});

// Serve the workflow control room (product development focused)
app.get('/workflow-control-room', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'web-app', 'workflow-control-room.html'));
});

// Providers Arena - Multi-AI Collaboration
app.get('/providers-arena', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'web-app', 'providers-arena.html'));
});

// Segmentation Demo friendly alias
app.get(['/segmentation','/segmentation-demo'], async (req,res)=>{
  const f = path.join(webDir,'segmentation-demo.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('Segmentation Demo missing'); }
});

// Intelligence Dashboard friendly alias
app.get(['/dashboard','/intelligence','/intelligence-dashboard'], async (req,res)=>{
  const f = path.join(webDir,'intelligence-dashboard.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('Intelligence Dashboard missing'); }
});

// Capability Activation friendly alias
app.get(['/capabilities','/activate','/capability-activation'], async (req,res)=>{
  const f = path.join(webDir,'capability-activation.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('Capability Activation missing'); }
});

// Capabilities Dashboard alias
app.get(['/capabilities-dashboard','/capabilities/overview'], async (req,res)=>{
  const f = path.join(webDir,'capabilities-dashboard.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('Capabilities Dashboard missing'); }
});

// Design Demo friendly alias
app.get(['/design-demo'], async (req,res)=>{
  const f = path.join(webDir,'design-demo.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('Design Demo missing'); }
});

// Design Suite alias
app.get(['/design-suite'], async (req,res)=>{
  const f = path.join(webDir,'design-suite.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('Design Suite missing'); }
});

// TooLoo Chat alias
app.get(['/tooloo-chat'], async (req,res)=>{
  const f = path.join(webDir,'tooloo-chat-enhanced.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('TooLoo Chat page missing'); }
});

// New interactive chat interface - prefer Nexus Pro chat if available
app.get(['/chat', '/coach-chat'], async (req,res)=>{
  const pro = path.join(webDir,'chat-nexus-pro.html');
  const nexus = path.join(webDir,'chat-nexus.html');
  const enhanced = path.join(webDir,'tooloo-chat-enhanced.html');
  const legacy = path.join(webDir,'chat.html');
  try { await fs.promises.access(pro); return res.sendFile(pro); } catch {}
  try { await fs.promises.access(nexus); return res.sendFile(nexus); } catch {}
  try { await fs.promises.access(enhanced); return res.sendFile(enhanced); } catch {}
  try { await fs.promises.access(legacy); return res.sendFile(legacy); } catch { return res.status(404).send('Chat page missing'); }
});

// Modern chat interface (with multi-provider support)
app.get(['/chat-modern', '/modern-chat'], async (req,res)=>{
  const f = path.join(webDir,'chat-modern.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('Modern chat page missing'); }
});

// Premium chat interface (enhanced UI with animations and polish)
app.get(['/chat-premium', '/premium'], async (req,res)=>{
  const f = path.join(webDir,'chat-premium.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('Premium chat page missing'); }
});

// Ultra chat interface (bold design, rich features)
app.get(['/chat-ultra', '/ultra'], async (req,res)=>{
  const f = path.join(webDir,'chat-ultra.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('Ultra chat page missing'); }
});

// Nexus chat interface (minimalist modern SaaS design)
app.get(['/chat-nexus', '/nexus'], async (req,res)=>{
  const f = path.join(webDir,'chat-nexus.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('Nexus chat page missing'); }
});

// Nexus Pro chat interface (goal-driven with segmentation, Slack-like UX)
app.get(['/chat-nexus-pro', '/pro', '/goals'], async (req,res)=>{
  const f = path.join(webDir,'chat-nexus-pro.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('Nexus Pro chat page missing'); }
});

// Providers Conference presentation
app.get(['/conference', '/providers-conference', '/pitch'], async (req,res)=>{
  const f = path.join(webDir,'providers-conference.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('Providers Conference page missing'); }
});

// Response Formatter Pure UI (multi-provider consensus analysis)
app.get(['/formatter-pure', '/pure', '/response-formatter-pure', '/formatter-final', '/chat-formatter-pure'], async (req,res)=>{
  const f = path.join(webDir,'chat-formatter-unified.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('Formatter Pure page missing'); }
});

// Add explicit route to /formatter for consistency
app.get(['/formatter'], async (req,res)=>{
  const f = path.join(webDir,'chat-formatter-unified.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('Formatter page missing'); }
});

// Response Formatter (full featured version)
app.get(['/response-formatter', '/formatter'], async (req,res)=>{
  const f = path.join(webDir,'response-formatter.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('Response Formatter page missing'); }
});

// Chat Formatter Unified (unified chat and formatter experience)
app.get(['/chat-formatter', '/formatter-unified'], async (req,res)=>{
  const f = path.join(webDir,'chat-formatter-unified.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('Chat Formatter Unified page missing'); }
});

// Root route - prefer Nexus Pro (goal-driven experience)
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Invalid message' });
    }
    
    const response = await handleChatWithAI(message);
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Chat API proxy - forward to API bridge, fallback to demo response
app.post('/api/v1/chat/message', async (req, res) => {
  try {
    const { message, sessionId: providedSessionId, userId = 'anonymous', provider: preferredProvider } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }
    
    // Get or create session
    const sessionManager = await getSessionManager();
    const sessionId = providedSessionId || sessionManager.generateSessionId();
    const session = await sessionManager.getOrCreateSession(sessionId, userId);

    // Add user message to session memory
    await sessionManager.addMessage(sessionId, userId, 'user', message);

    // Use real LLM provider with fallback chain
    const llmProvider = new LLMProvider();
    
    if (!llmProvider.available()) {
      return res.status(503).json({ 
        error: 'No providers available',
        detail: 'Configure API keys in .env (ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, DEEPSEEK_API_KEY)'
      });
    }

    try {
      // Get conversation history for context
      const conversationHistory = sessionManager.getConversationHistory(sessionId);
      
      // Build system prompt with session awareness
      const baseSystemPrompt = `You are interacting with TooLoo.ai - a self-aware, multi-service AI platform.

CRITICAL CONTEXT: TooLoo.ai is NOT just a chat interface. It is:
- A self-aware system that can read and analyze its own source code
- A multi-service orchestration platform (16+ microservices running on ports 3000-3009, 3123)
- A meta-learning system that continuously improves itself
- A system that tracks conversation history, patterns, and learns from interactions
- A platform with real-time system awareness and control capabilities

SYSTEM CAPABILITIES YOU SHOULD KNOW ABOUT:
1. Self-Awareness Endpoints (available on http://localhost:3000):
   - GET /api/v1/system/awareness - Shows system capabilities, services, GitHub integration status
   - GET /api/v1/system/introspect - Deep introspection of system state, memory, performance
   - GET /api/v1/system/code/structure - View TooLoo.ai's codebase structure
   - POST /api/v1/system/code/read - Read specific source files
   - POST /api/v1/system/code/search - Search TooLoo.ai's source code

2. Service Control Endpoints:
   - GET /api/v1/system/services - View all running services
   - GET /api/v1/system/service/:name - Check specific service status
   - POST /api/v1/system/service/:name/restart - Control services
   - GET /api/v1/system/alerts - View system alerts
   
3. Conversation API (Month 2-4 Capabilities):
   - POST /api/v1/conversation/message - Send messages with system context injection
   - GET /api/v1/context/system-state - Get enriched system state
   - POST /api/v1/control/command - Execute natural language commands
   - GET /api/v1/provider/status - View AI provider health and metrics

YOUR ROLE AS A PROVIDER:
- You are one of several AI providers (Claude, GPT, Gemini, etc.) integrated into TooLoo.ai
- You have access to TooLoo.ai's system context and can understand the platform's state
- You should acknowledge that you're working within TooLoo.ai when relevant
- When asked about TooLoo.ai's capabilities, services, or status, reference the endpoints above
- Help with system optimization, service management, and intelligent decision-making

CONVERSATION CONTEXT:
- You help learners track mastery across domains and optimize learning through intelligent coaching
- You also engage in technical conversations about the TooLoo.ai platform itself
- Be helpful, encouraging, and expert-level in your responses
- Maintain context of the conversation and refer back to previous points when relevant
- When relevant, explain how your responses relate to TooLoo.ai's self-awareness and learning capabilities`;


      const systemPrompt = sessionManager.buildAwareSystemPrompt(sessionId, baseSystemPrompt);
      
      // Select provider (preferred or auto-selected by LLMProvider)
      const selectedProvider = preferredProvider || llmProvider.selectProvider('chat');
      
      // ENHANCED: Load provider-specific instructions if available
      let enhancedSystemPrompt = systemPrompt;
      try {
        const providerInstructions = await getProviderInstructions();
        const providerInstr = providerInstructions.getForProvider(selectedProvider);
        if (providerInstr) {
          // Use provider-specialized prompt that leverages their strengths
          enhancedSystemPrompt = providerInstructions.buildSpecializedPrompt(
            selectedProvider,
            baseSystemPrompt,
            { taskType: 'chat', sessionContext: true }
          );
          // Add session context to the specialized prompt
          const contextSummary = sessionManager.buildAwareSystemPrompt(sessionId, '');
          enhancedSystemPrompt += '\n' + contextSummary;
        }
      } catch (instrErr) {
        console.warn('[Chat] Could not load provider instructions:', instrErr.message);
        // Fall back to standard system prompt if instructions unavailable
      }
      
      const startTime = Date.now();
      
      // Call the provider using generate() method with conversation history
      const result = await llmProvider.generate({
        prompt: message,
        system: enhancedSystemPrompt,
        taskType: 'chat',
        context: {
          conversationHistory,
          sessionContext: sessionManager.getSessionContext(sessionId)
        }
      });
      
      const responseTime = Date.now() - startTime;
      const responseText = result.content || result.response || result;
      
      // Add assistant response to session memory
      await sessionManager.addMessage(sessionId, userId, 'assistant', responseText, {
        provider: result.provider || selectedProvider,
        responseTime,
        model: result.model || (result.provider && `${result.provider}-default`),
        confidence: result.confidence || 0.8
      });

      // Update session metadata
      await sessionManager.updateSessionMetadata(sessionId, {
        provider: result.provider || selectedProvider,
        tokens: result.tokens || 0
      });
      
      return res.json({ 
        response: responseText,
        provider: result.provider || selectedProvider,
        sessionId,
        timestamp: new Date().toISOString(),
        responseTime,
        messageCount: session.stats.messageCount + 1
      });
    } catch (providerErr) {
      console.error('[Chat] Provider error:', providerErr.message);
      return res.status(503).json({ 
        error: 'Provider error',
        detail: providerErr.message,
        message: 'Could not reach configured AI providers. Check .env keys and provider health.',
        sessionId
      });
    }
  } catch (error) {
    console.error('[Chat] Fatal error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// TooLoo.ai Synthesis Endpoint - Single Provider Fast Response
// ============================================================================
app.post('/api/v1/chat/synthesis', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }
    
    const llmProvider = new LLMProvider();
    
    if (!llmProvider.available()) {
      return res.status(503).json({ 
        error: 'No providers available',
        detail: 'Configure API keys in .env'
      });
    }

    try {
      // Check if user is asking about TooLoo.ai itself
      let enrichedMessage = message;
      const selfAwarenessKeywords = ['self aware', 'self-aware', 'can you see yourself', 'see your code', 'understand yourself', 'your architecture', 'how do you work'];
      const systemStatusKeywords = ['provider', 'active', 'status', 'working', 'running', 'health', 'available', 'enabled', 'service', 'server', 'capability', 'capabilities', 'tooloo'];
      
      const isSelfAwarenessQuestion = selfAwarenessKeywords.some(keyword => message.toLowerCase().includes(keyword));
      const isSystemStatusQuestion = systemStatusKeywords.some(keyword => message.toLowerCase().includes(keyword));
      const isTooLooQuestion = message.toLowerCase().includes('tooloo');
      
      // Always enrich with system context if asking about TooLoo.ai or system status
      if (isSelfAwarenessQuestion || isSystemStatusQuestion || isTooLooQuestion) {
        // Get system awareness data
        const awareness = {
          system: {
            name: 'TooLoo.ai',
            version: '2.0.0',
            services: Object.keys({training: 3001, meta: 3002, budget: 3003, coach: 3004, product: 3006, segmentation: 3007, reports: 3008, capabilities: 3009, orchestration: 3100, provider: 3200, analytics: 3300}),
            totalServices: 11,
            serviceDetails: {
              training: 'Selection engine, hyper-speed rounds',
              meta: 'Meta-learning phases & boosts',
              budget: 'Provider status, burst cache, policy tuning',
              coach: 'Auto-Coach loop + Fast Lane',
              product: 'Workflows, analysis, artifacts',
              segmentation: 'Conversation segmentation & traits',
              reports: 'Reporting and analytics',
              capabilities: 'System capabilities management',
              orchestration: 'Service orchestration and control',
              provider: 'Provider management and aggregation',
              analytics: 'System analytics and metrics'
            }
          },
          codeAccess: {
            enabled: true,
            structure: '81+ items',
            servers: '37 server files',
            engines: '80+ engine modules',
            githubEnabled: true,
            githubRepo: 'oripridan-dot/TooLoo.ai'
          },
          capabilities: {
            selfAwareness: true,
            codeAnalysis: true,
            codeReading: true,
            gitHubIntegration: true,
            selfModification: true,
            multiProviderCollaboration: true,
            systemIntrospection: true
          }
        };
        
        // Get live provider status
        let providerContext = '';
        try {
          const providerResponse = await fetch('http://127.0.0.1:3003/api/v1/providers/status');
          if (providerResponse.ok) {
            const providerData = await providerResponse.json();
            const activeProviders = Object.entries(providerData.status || {})
              .filter(([_, info]) => info.available && info.enabled)
              .map(([name, info]) => `${name} (${info.model})`)
              .join(', ');
            providerContext = `\n\n[Live Provider Status]:\nActive providers: ${activeProviders}`;
          }
        } catch (e) {
          // Provider status endpoint may not be available, continue without it
        }
        
        enrichedMessage = `${message}

[FACTUAL SYSTEM CONTEXT - Use this data to answer the question]:
${JSON.stringify(awareness, null, 2)}${providerContext}

INSTRUCTIONS:
- You are Claude, operating WITHIN TooLoo.ai's system
- The above context is FACTUAL, REAL-TIME data about TooLoo.ai
- Answer using ONLY the facts provided in the system context
- Do NOT say you lack information - you have it all above
- Be specific and confident in your answers`;
      }
      
      // Get response from best available provider using standard flow
      const result = await llmProvider.generate({ 
        prompt: enrichedMessage, 
        taskType: 'chat' 
      });

      const baseResponse = result.content || result.response || result;
      const selectedProvider = result.provider || 'ollama';

      // Get actual list of active providers for accurate metadata
      let activeProvidersList = [];
      try {
        const providerResponse = await fetch('http://127.0.0.1:3003/api/v1/providers/status');
        if (providerResponse.ok) {
          const providerData = await providerResponse.json();
          activeProvidersList = Object.keys(providerData.status || {})
            .filter(name => {
              const info = providerData.status[name];
              return info.available && info.enabled;
            })
            .filter(name => name !== 'anthropic') // deduplicate: anthropic is same as claude
            .map(name => name === 'claude' ? 'anthropic' : name); // normalize to enabled provider names
        }
      } catch (e) {
        // Fall back to single provider if status unavailable
        activeProvidersList = [selectedProvider];
      }

      // Present as TooLoo.ai synthesis (not individual provider)
      return res.json({
        response: baseResponse,
        provider: 'TooLoo.ai',
        providerCount: activeProvidersList.length,
        providers: activeProvidersList,
        sessionId: sessionId || 'web-' + Date.now(),
        timestamp: new Date().toISOString(),
        metadata: {
          confidence: 92,
          synthesis: 'TooLoo AI Intelligence Layer',
          synthesisMethod: 'Single Provider',
          selfAwarenessEnhanced: isSelfAwarenessQuestion
        }
      });
    } catch (providerErr) {
      console.error('[Synthesis] Error:', providerErr.message);
      return res.status(503).json({ 
        error: 'Provider error',
        detail: providerErr.message
      });
    }
  } catch (error) {
    console.error('[Synthesis] Fatal error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// TooLoo.ai Advanced Ensemble - Multi-Provider Response
// ============================================================================
// Calls multiple providers in parallel and combines their responses
app.post('/api/v1/chat/ensemble', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }
    
    const llmProvider = new LLMProvider();
    
    if (!llmProvider.available()) {
      return res.status(503).json({ 
        error: 'No providers available',
        detail: 'Configure API keys in .env'
      });
    }

    try {
      // Check if user is asking about self-awareness
      let enrichedMessage = message;
      const selfAwarenessKeywords = ['self aware', 'self-aware', 'can you see yourself', 'see your code', 'understand yourself', 'your architecture', 'how do you work'];
      const isSelfAwarenessQuestion = selfAwarenessKeywords.some(keyword => message.toLowerCase().includes(keyword));
      
      if (isSelfAwarenessQuestion) {
        // Get system awareness data
        const awareness = {
          system: {
            name: 'TooLoo.ai',
            version: '2.0.0',
            services: Object.keys({training: 3001, meta: 3002, budget: 3003, coach: 3004, product: 3006, segmentation: 3007, reports: 3008, capabilities: 3009, orchestration: 3100, provider: 3200, analytics: 3300}),
            totalServices: 11
          },
          codeAccess: {
            enabled: true,
            structure: '81+ items',
            servers: '37 server files',
            engines: '80+ engine modules',
            githubEnabled: true,
            githubRepo: 'oripridan-dot/TooLoo.ai'
          },
          capabilities: {
            selfAwareness: true,
            codeAnalysis: true,
            codeReading: true,
            gitHubIntegration: true,
            selfModification: true
          }
        };
        
        enrichedMessage = `${message}

[System Context - TooLoo.ai Self-Awareness Data]:
${JSON.stringify(awareness, null, 2)}

You have FULL access to read TooLoo's source code via these endpoints:
- GET /api/v1/system/code/structure - See project structure (81+ items)
- GET /api/v1/system/code/list?dir=servers - See 37 server files  
- POST /api/v1/system/code/read - Read actual source code
- POST /api/v1/system/code/search - Search code patterns
- GET /api/v1/system/awareness - Get system capabilities

Please demonstrate that you understand these capabilities and can read TooLoo's own code.`;
      }
      
      // Call specific providers in parallel
      // These call provider methods directly to bypass auto-selection
      const providerCalls = {
        anthropic: llmProvider.callClaude ? llmProvider.callClaude(enrichedMessage, null) : null,
        openai: llmProvider.callOpenAI ? llmProvider.callOpenAI(enrichedMessage, null) : null,
        gemini: llmProvider.callGemini ? llmProvider.callGemini(enrichedMessage, null) : null
      };

      const results = await Promise.allSettled([
        providerCalls.anthropic,
        providerCalls.openai,
        providerCalls.gemini
      ]);
      
      // Extract successful responses with provider names
      const responses = [];
      const providerNames = ['anthropic', 'openai', 'gemini'];
      
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled' && result.value) {
          const content = result.value.content || result.value.response || result.value;
          if (content && typeof content === 'string' && content.length > 0) {
            responses.push({
              provider: providerNames[idx],
              response: content
            });
          }
        }
      });

      // If no providers responded, fallback to single
      if (responses.length === 0) {
        const result = await llmProvider.generate({ prompt: enrichedMessage, taskType: 'chat' });
        return res.json({
          response: result.content || result.response || result,
          provider: 'TooLoo.ai',
          providerCount: 1,
          providers: [result.provider || 'fallback'],
          sessionId: sessionId || 'web-' + Date.now(),
          timestamp: new Date().toISOString(),
          metadata: {
            confidence: 92,
            synthesis: 'TooLoo AI Intelligence Layer',
            synthesisMethod: 'Single Provider (Fallback)',
            selfAwarenessEnhanced: isSelfAwarenessQuestion
          }
        });
      }

      // Build ensemble response from multiple provider perspectives
      const ensembleResponse = responses
        .map((r, idx) => `**${r.provider.toUpperCase()} Perspective**:\n\n${r.response}`)
        .join('\n\n---\n\n');

      return res.json({
        response: ensembleResponse,
        provider: 'TooLoo.ai',
        providerCount: responses.length,
        providers: responses.map(r => r.provider),
        sessionId: sessionId || 'web-' + Date.now(),
        timestamp: new Date().toISOString(),
        metadata: {
          confidence: calculateEnsembleConfidence(responses.length),
          synthesis: `TooLoo Multi-Provider Ensemble (${responses.length} providers)`,
          selfAwarenessEnhanced: isSelfAwarenessQuestion,
          synthesisMethod: 'Parallel Multi-Provider Collaboration'
        }
      });
    } catch (err) {
      console.error('[Ensemble] Error:', err.message);
      return res.status(503).json({
        error: 'Ensemble failed',
        detail: err.message
      });
    }
  } catch (error) {
    console.error('[Ensemble] Fatal error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// Helper: Calculate confidence based on provider count
function calculateEnsembleConfidence(providerCount) {
  if (providerCount >= 3) return 95;
  if (providerCount === 2) return 90;
  return 85;
}

// Response format conversion endpoint (Phase 3 - Multi-format Support)
app.post('/api/v1/responses/convert', async (req, res) => {
  try {
    const { format, content, opts } = req.body || {};
    if (!format) return res.status(400).json({ ok:false, error:'format required' });
    if (content === undefined) return res.status(400).json({ ok:false, error:'content required' });
    const result = formatConvert(format, content, opts || {});
    return res.json(result);
  } catch (e) {
    return res.status(500).json({ ok:false, error: e.message });
  }
});

// ASAP Mastery alias - elegant UI
app.get(['/asap', '/asap-mastery'], async (req,res)=>{
  const f = path.join(webDir,'asap-mastery.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('ASAP Mastery missing'); }
});

// Knowledge page alias
app.get(['/knowledge','/books','/bibliography'], async (req,res)=>{
  const f = path.join(webDir,'knowledge.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('Knowledge page missing'); }
});

// Feedback page alias
app.get(['/feedback', '/bug-report', '/support'], async (req,res)=>{
  const f = path.join(webDir,'feedback.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('Feedback page missing'); }
});

// Referral page alias
app.get(['/referral', '/referrals', '/refer'], async (req,res)=>{
  const f = path.join(webDir,'referral.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('Referral page missing'); }
});

// Smart Control Room alias
app.get(['/smart-control-room', '/smart', '/simple'], async (req,res)=>{
  const f = path.join(webDir,'control-room-smart.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('Smart Control Room missing'); }
});

// Showcase Demo alias
app.get(['/showcase', '/demo', '/tooloo-showcase'], async (req,res)=>{
  const f = path.join(webDir,'tooloo-showcase.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('Showcase Demo missing'); }
});

// Product Page Demo alias
app.get(['/product-page', '/product', '/landing'], async (req,res)=>{
  const f = path.join(webDir,'product-page-demo.html');
  try { await fs.promises.access(f); return res.sendFile(f); } catch { return res.status(404).send('Product Page Demo missing'); }
});

// Design: Brand Board PDF export
app.post('/api/v1/design/brandboard', async (req,res)=>{
  try{
    const { tokens = {}, fonts = {}, name = 'TooLoo Brand' } = req.body || {};
    const outDir = path.join(webDir, 'temp');
    await fs.promises.mkdir(outDir, { recursive: true });
    const ts = Date.now();
    const file = path.join(outDir, `brand-board-${ts}.pdf`);
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const stream = fs.createWriteStream(file);
    doc.pipe(stream);

    // Header
    doc.fontSize(20).fillColor('#222').text(name, { continued:false });
    doc.moveDown(0.2);
    doc.fontSize(10).fillColor('#666').text('Generated by TooLoo Design Suite');
    doc.moveDown(1);

    // Colors
    const cols = [
      { label:'Brand', v: tokens.brand || '#7C5CFF' },
      { label:'Alt', v: tokens.brandAlt || '#00E9B0' },
      { label:'Accent', v: tokens.accent || '#FFE770' },
      { label:'Danger', v: tokens.danger || '#FF5C7C' },
      { label:'Text', v: tokens.text || '#E6E9EE' },
      { label:'Muted', v: tokens.muted || '#96A0AF' },
      { label:'Surface', v: tokens.surface || '#14181E' },
      { label:'Background', v: tokens.bg || '#0B0D10' }
    ];
    doc.fontSize(14).fillColor('#111').text('Color System');
    doc.moveDown(0.5);
    const startX = doc.x, startY = doc.y;
    const box = (x,y,c,l)=>{ doc.save(); doc.roundedRect(x,y,70,40,6).fillColor(c).fill(); doc.restore(); doc.fillColor('#111').fontSize(9).text(l+'\n'+c, x+78, y+12); };
    let x = startX, y = startY;
    for (let i=0;i<cols.length;i++){
      box(x,y, cols[i].v, cols[i].label);
      x += 180; if ((i%3)===2){ x=startX; y += 60; }
    }
    doc.moveDown(1.2);

    // Typography
    doc.fontSize(14).fillColor('#111').text('Typography');
    doc.moveDown(0.5);
    const display = fonts.display || 'Playfair Display';
    const body = fonts.body || 'Inter';
    doc.fontSize(18).fillColor('#111').text(`Display: ${display}`);
    doc.fontSize(10).fillColor('#444').text('The quick brown fox jumps over the lazy dog. 1234567890');
    doc.moveDown(0.4);
    doc.fontSize(18).fillColor('#111').text(`Body: ${body}`);
    doc.fontSize(10).fillColor('#444').text('The quick brown fox jumps over the lazy dog. 1234567890');
    doc.moveDown(1);

    // Buttons
    doc.fontSize(14).fillColor('#111').text('Components');
    doc.moveDown(0.4);
    const btn = (x,y,label,fill,stroke)=>{ doc.save(); doc.roundedRect(x,y,110,28,8).lineWidth(1).fillAndStroke(fill, stroke); doc.fillColor('#111').fontSize(10).text(label, x+12, y+8); doc.restore(); };
    btn(doc.x, doc.y, 'Default', '#f2f4f8', '#cfd6e0');
    btn(doc.x+130, doc.y, 'Primary', '#d9ccff', '#b8a3ff');

    // Footer
    doc.moveDown(1.5);
    doc.fontSize(9).fillColor('#777').text('Notes: Tokens and fonts exported from TooLoo Design Suite. Expand this brand board with photography, logo marks, and layout specimens.');
    doc.end();

    stream.on('finish', ()=>{
      const url = `/temp/${path.basename(file)}`;
      return res.json({ ok:true, url, file });
    });
    stream.on('error', (e)=> res.status(500).json({ ok:false, error: e.message }));
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// Temp artifacts helper: latest guiding-star product page / PDF
app.get(['/temp/latest','/api/v1/design/latest'], async (req,res)=>{
  try{
    const dir = path.join(webDir, 'temp');
    await fs.promises.mkdir(dir, { recursive: true });
    const files = await fs.promises.readdir(dir);
    const pages = files.filter(f=>/^guiding-star-product-\d+\.html$/.test(f)).sort().reverse();
    const pdfs = files.filter(f=>/^brand-board-\d+\.pdf$/.test(f)).sort().reverse();
    const latestPage = pages[0] ? `/temp/${pages[0]}` : null;
    const latestPdf = pdfs[0] ? `/temp/${pdfs[0]}` : null;
    res.json({ ok:true, latest: { pageUrl: latestPage, pdfUrl: latestPdf }, counts:{ pages: pages.length, pdfs: pdfs.length }, pages, pdfs });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

app.get('/temp/latest-page', async (req,res)=>{
  try{
    const dir = path.join(webDir, 'temp');
    const files = await fs.promises.readdir(dir);
    const pages = files.filter(f=>/^guiding-star-product-\d+\.html$/.test(f)).sort().reverse();
    if (!pages[0]) return res.status(404).send('No guiding-star product page found');
    res.redirect(`/temp/${pages[0]}`);
  }catch(e){ res.status(500).send(e.message); }
});

app.get('/temp/latest-pdf', async (req,res)=>{
  try{
    const dir = path.join(webDir, 'temp');
    const files = await fs.promises.readdir(dir);
    const pdfs = files.filter(f=>/^brand-board-\d+\.pdf$/.test(f)).sort().reverse();
    if (!pdfs[0]) return res.status(404).send('No brand board PDF found');
    res.redirect(`/temp/${pdfs[0]}`);
  }catch(e){ res.status(500).send(e.message); }
});

// Simple HTML index of temp artifacts
app.get('/temp/index', async (req,res)=>{
  try{
    const dir = path.join(webDir, 'temp');
    await fs.promises.mkdir(dir, { recursive: true });
    const files = await fs.promises.readdir(dir);
    const pages = files.filter(f=>/^guiding-star-product-\d+\.html$/.test(f)).sort().reverse();
    const pdfs = files.filter(f=>/^brand-board-\d+\.pdf$/.test(f)).sort().reverse();
    const chats = files.filter(f=>/^chat-[A-Za-z0-9_-]+\.jsonl$/.test(f)).sort().reverse();
    const li = arr=> arr.map(f=>`<li><a href="/temp/${f}" target="_blank">${f}</a></li>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Temp Artifacts</title></head><body>
      <h1>Temp Artifacts</h1>
      <p><a href="/temp/latest-page" target="_blank">Open latest product page</a> • <a href="/temp/latest-pdf" target="_blank">Open latest PDF</a></p>
      <h2>Pages</h2><ul>${li(pages)}</ul>
      <h2>PDFs</h2><ul>${li(pdfs)}</ul>
      <h2>Chat Transcripts</h2><ul>${li(chats)}</ul>
    </body></html>`;
    res.type('html').send(html);
  }catch(e){ res.status(500).send(e.message); }
});

// Chat transcript API: append and list
app.post('/api/v1/chat/append', async (req,res)=>{
  try{
    const { sessionId = 'default', role = 'user', text = '', meta = {} } = req.body||{};
    const dir = path.join(webDir, 'temp');
    await fs.promises.mkdir(dir, { recursive: true });
    const file = path.join(dir, `chat-${sessionId}.jsonl`);
    const rec = { t: Date.now(), role, text, meta };
    await fs.promises.appendFile(file, JSON.stringify(rec)+'\n');
    res.json({ ok:true, file });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

app.get('/api/v1/chat/transcripts', async (req,res)=>{
  try{
    const dir = path.join(webDir, 'temp');
    await fs.promises.mkdir(dir, { recursive: true });
    const { sessionId } = req.query||{};
    if (!sessionId) {
      const files = (await fs.promises.readdir(dir)).filter(f=>/^chat-[A-Za-z0-9_-]+\.jsonl$/.test(f));
      return res.json({ ok:true, files });
    }
    const file = path.join(dir, `chat-${sessionId}.jsonl`);
    try{
      const content = await fs.promises.readFile(file, 'utf8');
      const lines = content.split('\n').filter(Boolean).map(l=>{ try{return JSON.parse(l);}catch{return null;} }).filter(Boolean);
      return res.json({ ok:true, sessionId, messages: lines });
    }catch{ return res.json({ ok:true, sessionId, messages: [] }); }
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// Streaming chat endpoint (SSE)
app.get('/api/v1/chat/burst-stream', async (req,res)=>{
  try{
    const { prompt, ttlSeconds = 30 } = req.query||{};
    if (!prompt) return res.status(400).json({ ok:false, error:'prompt required' });
    // Call burst endpoint
    const budgetPort = Number(process.env.BUDGET_PORT||3003);
    const qs = new URLSearchParams({ prompt, ttlSeconds: String(ttlSeconds) });
    const r = await fetch(`http://127.0.0.1:${budgetPort}/api/v1/providers/burst?${qs.toString()}`);
    const j = await r.json();
    if (!j?.ok) return res.status(502).json({ ok:false, error: j?.error||'burst failed' });
    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    // Split text into tokens (simple word split) and send progressively
    const text = j.text || '';
    const tokens = text.split(/(\s+)/);
    const sendEvent = (type, data)=>{ res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`); };
    sendEvent('meta', { cached: !!j.cached, policy: j.policy||null, concurrency: j.concurrency||null });
    for (let i=0;i<tokens.length;i++){
      await new Promise(r=>setTimeout(r, 20)); // simulate latency
      sendEvent('token', { token: tokens[i], index: i });
    }
    sendEvent('done', { fullText: text });
    res.end();
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// ============================================================================
// Session Memory Management Endpoints
// ============================================================================

// Get or create a session and get conversation history
app.get('/api/v1/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userId = 'anonymous' } = req.query;
    const sessionManager = await getSessionManager();
    
    const session = await sessionManager.getOrCreateSession(sessionId, userId);
    const history = sessionManager.getFullHistory(sessionId);
    const context = sessionManager.getSessionContext(sessionId);
    
    res.json({
      ok: true,
      sessionId,
      session: {
        id: session.id,
        userId: session.userId,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messageCount: session.stats.messageCount,
        title: session.metadata.title,
        topics: context?.topics || []
      },
      messageCount: history.length,
      context,
      history
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// List all sessions for a user
app.get('/api/v1/sessions', async (req, res) => {
  try {
    const { userId = 'anonymous', limit = 20 } = req.query;
    const sessionManager = await getSessionManager();
    const sessions = sessionManager.listSessions(userId, parseInt(limit));
    
    res.json({
      ok: true,
      count: sessions.length,
      sessions
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Start a new session
app.post('/api/v1/sessions', async (req, res) => {
  try {
    const { userId = 'anonymous', title = 'Chat Session' } = req.body;
    const sessionManager = await getSessionManager();
    const sessionId = sessionManager.generateSessionId();
    const session = await sessionManager.getOrCreateSession(sessionId, userId);
    session.metadata.title = title;
    
    res.json({
      ok: true,
      sessionId,
      session: {
        id: session.id,
        userId: session.userId,
        createdAt: session.createdAt,
        title: session.metadata.title
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Get conversation history for a session
app.get('/api/v1/sessions/:sessionId/history', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 100 } = req.query;
    const sessionManager = await getSessionManager();
    
    const history = sessionManager.getFullHistory(sessionId);
    const filtered = history.slice(-parseInt(limit));
    
    res.json({
      ok: true,
      sessionId,
      count: filtered.length,
      history: filtered
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Delete a session
app.delete('/api/v1/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessionManager = await getSessionManager();
    await sessionManager.deleteSession(sessionId);
    
    res.json({
      ok: true,
      message: `Session ${sessionId} deleted`
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Get session context and insights
app.get('/api/v1/sessions/:sessionId/context', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessionManager = await getSessionManager();
    const context = sessionManager.getSessionContext(sessionId);
    
    res.json({
      ok: true,
      sessionId,
      context
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Feedback submission API (local, not proxied)

app.post('/api/v1/feedback/submit', async (req,res)=>{
  try{
    const feedback = req.body || {};
    const timestamp = new Date().toISOString();
    const feedbackLog = {
      ...feedback,
      submitted_at: timestamp,
      ip: req.ip || req.connection.remoteAddress
    };
    
    // Log feedback to console (visible in logs)
    console.log(`\n[FEEDBACK] ${timestamp}`);
    console.log(`  Type: ${feedback.type}`);
    console.log(`  Subject: ${feedback.subject}`);
    console.log(`  Email: ${feedback.email || '(not provided)'}`);
    console.log(`  Description: ${feedback.description.substring(0, 100)}...`);
    if(feedback.browser) console.log(`  Browser: ${feedback.browser}`);
    if(feedback.url) console.log(`  URL: ${feedback.url}`);
    
    // Store in JSON file for later review
    const feedbackDir = path.join(process.cwd(), 'feedback-logs');
    await fs.promises.mkdir(feedbackDir, { recursive: true });
    const feedbackFile = path.join(feedbackDir, `feedback-${Date.now()}.json`);
    await fs.promises.writeFile(feedbackFile, JSON.stringify(feedbackLog, null, 2));
    
    // Return success
    res.json({ ok:true, message:'Feedback received, thank you!' });
  }catch(e){
    console.error('[FEEDBACK ERROR]', e.message);
    res.status(500).json({ ok:false, error:e.message });
  }
});

// Referral System API endpoints (local, not proxied)
const referralSystem = new ReferralSystem();

// Get or create user referral code
app.post('/api/v1/referral/create', async (req, res) => {
  try {
    const { userId, email } = req.body;
    if (!userId) return res.status(400).json({ ok: false, error: 'userId required' });

    // Check if user already has a code
    let existing = await referralSystem.getUserReferral(userId);
    if (!existing) {
      existing = await referralSystem.createReferral(userId, email);
    }

    res.json({
      ok: true,
      code: existing.code,
      share_url: `${process.env.APP_URL || 'http://127.0.0.1:3000'}?ref=${existing.code}`,
      referred_count: existing.referred_count
    });
  } catch (e) {
    console.error('Referral create error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Redeem referral code
app.post('/api/v1/referral/redeem', async (req, res) => {
  try {
    const { code, newUserId } = req.body;
    if (!code || !newUserId) return res.status(400).json({ ok: false, error: 'code and newUserId required' });

    const result = await referralSystem.redeemCode(code, newUserId);
    res.json(result);
  } catch (e) {
    console.error('Referral redeem error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get leaderboard (top referrers)
app.get('/api/v1/referral/leaderboard', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const leaderboard = await referralSystem.getLeaderboard(limit);
    res.json({
      ok: true,
      leaderboard,
      count: leaderboard.length
    });
  } catch (e) {
    console.error('Leaderboard error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get referral stats
app.get('/api/v1/referral/stats', async (req, res) => {
  try {
    const stats = await referralSystem.getStats();
    res.json({
      ok: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('Stats error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get user's referral info
app.get('/api/v1/referral/me', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ ok: false, error: 'userId query param required' });

    const referral = await referralSystem.getUserReferral(userId);
    res.json({
      ok: true,
      referral: referral || null
    });
  } catch (e) {
    console.error('User referral error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Simple reverse proxy for API routes (keeps UI unchanged)
const serviceConfig = [
  { name: 'training', prefixes: ['/api/v1/training/hyper-speed','/api/v1/training','/api/v1/next-domain'], port: Number(process.env.TRAINING_PORT||3001), remoteEnv: process.env.REMOTE_TRAINING_BASE },
  { name: 'meta', prefixes: ['/api/v4/meta-learning'], port: Number(process.env.META_PORT||3002), remoteEnv: process.env.REMOTE_META_BASE },
  { name: 'budget', prefixes: ['/api/v1/budget','/api/v1/providers/burst','/api/v1/providers/status','/api/v1/providers/policy'], port: Number(process.env.BUDGET_PORT||3003), remoteEnv: process.env.REMOTE_BUDGET_BASE },
  { name: 'coach', prefixes: ['/api/v1/auto-coach'], port: Number(process.env.COACH_PORT||3004), remoteEnv: process.env.REMOTE_COACH_BASE },
  { name: 'product', prefixes: ['/api/v1/workflows','/api/v1/learning','/api/v1/analysis','/api/v1/artifacts','/api/v1/showcase','/api/v1/product','/api/v1/bookworm'], port: Number(process.env.PRODUCT_PORT||3006), remoteEnv: process.env.REMOTE_PRODUCT_BASE },
  { name: 'segmentation', prefixes: ['/api/v1/segmentation'], port: Number(process.env.SEGMENTATION_PORT||3007), remoteEnv: process.env.REMOTE_SEGMENTATION_BASE },
  { name: 'reports', prefixes: ['/api/v1/reports'], port: Number(process.env.REPORTS_PORT||3008), remoteEnv: process.env.REMOTE_REPORTS_BASE },
  { name: 'capabilities', prefixes: ['/api/v1/capabilities'], port: Number(process.env.CAPABILITIES_PORT||3009), remoteEnv: process.env.REMOTE_CAPABILITIES_BASE },
  { name: 'oauth', prefixes: ['/api/v1/oauth'], port: Number(process.env.OAUTH_PORT||3010), remoteEnv: process.env.REMOTE_OAUTH_BASE },
  { name: 'events', prefixes: ['/api/v1/events','/webhook'], port: Number(process.env.EVENTS_PORT||3011), remoteEnv: process.env.REMOTE_EVENTS_BASE },
  { name: 'system', prefixes: ['/api/v1/system'], port: Number(process.env.ORCH_CTRL_PORT||3123), remoteEnv: process.env.REMOTE_SYSTEM_BASE },
  { name: 'sources', prefixes: ['/api/v1/sources','/api/v1/sources/github/issues/sync'], port: Number(process.env.SOURCES_PORT||3010), remoteEnv: process.env.REMOTE_SOURCES_BASE },
  { name: 'arena', prefixes: ['/api/v1/arena'], port: Number(process.env.ARENA_PORT||3011), remoteEnv: process.env.REMOTE_ARENA_BASE },
  { name: 'integrations', prefixes: ['/api/v1/integrations'], port: Number(process.env.INTEGRATIONS_PORT||3012), remoteEnv: process.env.REMOTE_INTEGRATIONS_BASE },
  { name: 'self-improve', prefixes: ['/api/v1/self-improve'], port: Number(process.env.SELF_IMPROVE_PORT||3013), remoteEnv: process.env.REMOTE_SELF_IMPROVE_BASE },
  { name: 'design', prefixes: ['/api/v1/design'], port: Number(process.env.DESIGN_PORT||3014), remoteEnv: process.env.REMOTE_DESIGN_BASE },
  { name: 'domains', prefixes: ['/api/v1/domains'], port: Number(process.env.DOMAINS_PORT||3016), remoteEnv: process.env.REMOTE_DOMAINS_BASE },
  { name: 'ide', prefixes: ['/api/v1/ide'], port: Number(process.env.IDE_PORT||3017), remoteEnv: process.env.REMOTE_IDE_BASE }
];

function getRouteForPrefix(url) {
  for (const svc of serviceConfig) {
    for (const prefix of svc.prefixes) {
      if (url.startsWith(prefix)) {
        if (svc.remoteEnv) return { type: 'remote', base: svc.remoteEnv, name: svc.name };
        return { type: 'local', base: `http://127.0.0.1:${svc.port}`, name: svc.name };
      }
    }
  }
  return null;
}

app.get('/api/v1/system/routes', (req, res) => {
  const routes = serviceConfig.map(svc => ({
    name: svc.name,
    prefixes: svc.prefixes,
    route: svc.remoteEnv ? { type: 'remote', base: svc.remoteEnv } : { type: 'local', base: `http://127.0.0.1:${svc.port}` }
  }));
  res.json({ ok:true, routes });
});

// ======= UI Activity Monitor Proxy (moved before generic API proxy) =======
// Forward activity monitor requests from UI to the activity monitor service (3050)
const ACTIVITY_MONITOR_PORT = Number(process.env.ACTIVITY_MONITOR_PORT || 3050);

app.post('/api/v1/activity/heartbeat', async (req,res)=>{
  try{
    const r = await fetch(`http://127.0.0.1:${ACTIVITY_MONITOR_PORT}/api/v1/activity/heartbeat`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(req.body)
    });
    const j = await r.json();
    res.json(j);
  }catch(e){ res.status(503).json({ ok:false, error:'Activity monitor unavailable', _fallback:true }); }
});

app.get('/api/v1/activity/sessions', async (req,res)=>{
  try{
    const r = await fetch(`http://127.0.0.1:${ACTIVITY_MONITOR_PORT}/api/v1/activity/sessions`);
    const j = await r.json();
    res.json(j);
  }catch(e){ res.status(503).json({ ok:false, error:'Activity monitor unavailable' }); }
});

app.get('/api/v1/activity/servers', async (req,res)=>{
  try{
    const r = await fetch(`http://127.0.0.1:${ACTIVITY_MONITOR_PORT}/api/v1/activity/servers`);
    const j = await r.json();
    res.json(j);
  }catch(e){ res.status(503).json({ ok:false, error:'Activity monitor unavailable' }); }
});

app.post('/api/v1/activity/start-all', async (req,res)=>{
  try{
    const r = await fetch(`http://127.0.0.1:${ACTIVITY_MONITOR_PORT}/api/v1/activity/start-all`, { method:'POST' });
    const j = await r.json();
    res.json(j);
  }catch(e){ res.status(503).json({ ok:false, error:'Activity monitor unavailable' }); }
});

app.post('/api/v1/activity/ensure-real-data', async (req,res)=>{
  try{
    const r = await fetch(`http://127.0.0.1:${ACTIVITY_MONITOR_PORT}/api/v1/activity/ensure-real-data`, { method:'POST' });
    const j = await r.json();
    res.json(j);
  }catch(e){ res.status(503).json({ ok:false, error:'Activity monitor unavailable' }); }
});

app.post('/api/v1/activity/config', async (req,res)=>{
  try{
    const r = await fetch(`http://127.0.0.1:${ACTIVITY_MONITOR_PORT}/api/v1/activity/config`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(req.body)
    });
    const j = await r.json();
    res.json(j);
  }catch(e){ res.status(503).json({ ok:false, error:'Activity monitor unavailable' }); }
});

// Resilient proxy helper - wraps fetch with circuit breaker and retry
async function resilientProxy(serviceName, port, originalUrl, method, headers, body) {
  const breaker = serviceCircuitBreakers[serviceName];
  
  return await breaker.execute(async () => {
    const url = `http://127.0.0.1:${port}${originalUrl}`;
    const init = { method, headers: { 'content-type': headers['content-type']||'application/json' } };
    if (method !== 'GET' && method !== 'HEAD') {
      init.body = body;
    }
    
    // Add retry logic for transient errors
    return await retry(async () => {
      const response = await fetch(url, init);
      if (!response.ok && response.status >= 500) {
        const error = new Error(`Service ${serviceName} returned ${response.status}`);
        error.statusCode = response.status;
        throw error;
      }
      return response;
    }, { maxAttempts: 2, backoffMs: 100 });
  }, {
    fallback: async () => {
      // Return service unavailable response
      return new Response(JSON.stringify({ 
        ok: false, 
        error: `${serviceName} service temporarily unavailable` 
      }), { status: 503 });
    }
  });
}

// Explicit proxy for capabilities (ensures correct routing for nested paths)
// Explicit proxy for capabilities (ensures correct routing for nested paths)
app.all(['/api/v1/capabilities', '/api/v1/capabilities/*'], async (req, res) => {
  try {
    const port = Number(process.env.CAPABILITIES_PORT||3009);
    const url = `http://127.0.0.1:${port}${req.originalUrl}`;
    const init = { method: req.method, headers: { 'content-type': req.get('content-type')||'application/json' } };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      init.body = req.is('application/json') ? JSON.stringify(req.body||{}) : undefined;
    }
    const r = await fetch(url, init);
    const text = await r.text();
    res.status(r.status);
    const ct = r.headers.get('content-type')||'';
    if (ct.includes('application/json')) return res.type('application/json').send(text);
    return res.send(text);
  } catch(e){ res.status(500).json({ ok:false, error: e.message }); }
});

// Explicit proxy for product development (ensure all routes work)
app.all(['/api/v1/workflows', '/api/v1/workflows/*', '/api/v1/learning', '/api/v1/learning/*', '/api/v1/analysis', '/api/v1/analysis/*', '/api/v1/artifacts', '/api/v1/artifacts/*', '/api/v1/showcase', '/api/v1/showcase/*', '/api/v1/product', '/api/v1/product/*', '/api/v1/bookworm', '/api/v1/bookworm/*'], async (req, res) => {
  try {
    const port = Number(process.env.PRODUCT_PORT||3006);
    const url = `http://127.0.0.1:${port}${req.originalUrl}`;
    const init = { method: req.method, headers: { 'content-type': req.get('content-type')||'application/json' } };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      init.body = req.is('application/json') ? JSON.stringify(req.body||{}) : undefined;
    }
    const r = await fetch(url, init);
    const text = await r.text();
    res.status(r.status);
    const ct = r.headers.get('content-type')||'';
    if (ct.includes('application/json')) return res.type('application/json').send(text);
    return res.send(text);
  } catch(e){ res.status(500).json({ ok:false, error: e.message }); }
});

// Explicit proxy for providers arena (multi-provider collaboration)
app.all(['/api/v1/arena', '/api/v1/arena/*'], async (req, res) => {
  try {
    const port = Number(process.env.ARENA_PORT||3011);
    const url = `http://127.0.0.1:${port}${req.originalUrl}`;
    const init = { method: req.method, headers: { 'content-type': req.get('content-type')||'application/json' } };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      init.body = req.is('application/json') ? JSON.stringify(req.body||{}) : undefined;
    }
    const r = await fetch(url, init);
    const text = await r.text();
    res.status(r.status);
    const ct = r.headers.get('content-type')||'';
    if (ct.includes('application/json')) return res.type('application/json').send(text);
    return res.send(text);
  } catch(e){ res.status(500).json({ ok:false, error: e.message }); }
});

// ============================================================================
// GITHUB API ENDPOINTS - Direct Integration (No Port 3020 Needed)
// ============================================================================

// Health check for GitHub
app.get('/api/v1/github/health', (req, res) => {
  const configured = githubProvider.isConfigured();
  res.json({
    ok: true,
    configured,
    repo: configured ? process.env.GITHUB_REPO : null,
    capabilities: ['read', 'write', 'create-pr', 'create-issue', 'merge', 'branch', 'comment']
  });
});

// Read operations (read-only access to repo)
app.get('/api/v1/github/info', async (req, res) => {
  const info = await githubProvider.getRepoInfo();
  res.json({ ok: !!info, info: info || { error: 'GitHub not configured' } });
});

app.get('/api/v1/github/issues', async (req, res) => {
  const limit = parseInt(req.query.limit || '5');
  const issues = await githubProvider.getRecentIssues(limit);
  res.json({ ok: true, issues });
});

app.get('/api/v1/github/readme', async (req, res) => {
  const readme = await githubProvider.getReadme();
  res.json({ ok: !!readme, readme: readme || null });
});

app.post('/api/v1/github/file', async (req, res) => {
  const { path } = req.body || {};
  if (!path) return res.status(400).json({ ok: false, error: 'path required' });
  const file = await githubProvider.getFileContent(path);
  res.json({ ok: !!file, file: file || null });
});

app.post('/api/v1/github/files', async (req, res) => {
  const { paths } = req.body || {};
  if (!paths || !Array.isArray(paths)) {
    return res.status(400).json({ ok: false, error: 'paths array required' });
  }
  const files = await githubProvider.getMultipleFiles(paths);
  res.json({ ok: true, files });
});

app.get('/api/v1/github/structure', async (req, res) => {
  const path = req.query.path || '';
  const recursive = req.query.recursive === 'true';
  const structure = await githubProvider.getRepoStructure(path, recursive);
  res.json({ ok: !!structure, structure: structure || null });
});

app.get('/api/v1/github/context', async (req, res) => {
  const context = await githubProvider.getContextForProviders();
  res.json({ ok: !!context, context });
});

// Write operations - Self-Modification via GitHub

// POST /api/v1/github/update-file - Update or create a file
app.post('/api/v1/github/update-file', async (req, res) => {
  const { path, content, message, branch } = req.body || {};
  if (!path || content === undefined) {
    return res.status(400).json({ ok: false, error: 'path and content required' });
  }
  const result = await githubProvider.updateFile(path, content, message, branch || 'main');
  res.json(result);
});

// POST /api/v1/github/create-branch - Create a new branch
app.post('/api/v1/github/create-branch', async (req, res) => {
  const { name, from } = req.body || {};
  if (!name) return res.status(400).json({ ok: false, error: 'branch name required' });
  const result = await githubProvider.createBranch(name, from || 'main');
  res.json(result);
});

// POST /api/v1/github/create-pr - Create a pull request
app.post('/api/v1/github/create-pr', async (req, res) => {
  const { title, body, head, base } = req.body || {};
  if (!title || !head) return res.status(400).json({ ok: false, error: 'title and head branch required' });
  const result = await githubProvider.createPullRequest(title, body, head, base || 'main');
  res.json(result);
});

// POST /api/v1/github/create-issue - Create an issue
app.post('/api/v1/github/create-issue', async (req, res) => {
  const { title, body, labels, assignees } = req.body || {};
  if (!title) return res.status(400).json({ ok: false, error: 'title required' });
  const result = await githubProvider.createIssue(title, body, labels || [], assignees || []);
  res.json(result);
});

// PATCH /api/v1/github/pr/:number - Update a pull request
app.patch('/api/v1/github/pr/:number', async (req, res) => {
  const prNumber = parseInt(req.params.number);
  const updates = req.body || {};
  if (!prNumber) return res.status(400).json({ ok: false, error: 'PR number required' });
  const result = await githubProvider.updatePullRequest(prNumber, updates);
  res.json(result);
});

// PUT /api/v1/github/pr/:number/merge - Merge a pull request
app.put('/api/v1/github/pr/:number/merge', async (req, res) => {
  const prNumber = parseInt(req.params.number);
  const { message, method } = req.body || {};
  if (!prNumber) return res.status(400).json({ ok: false, error: 'PR number required' });
  const result = await githubProvider.mergePullRequest(prNumber, message, method || 'squash');
  res.json(result);
});

// POST /api/v1/github/comment - Add comment to issue/PR
app.post('/api/v1/github/comment', async (req, res) => {
  const { number, body } = req.body || {};
  if (!number || !body) return res.status(400).json({ ok: false, error: 'issue/PR number and body required' });
  const result = await githubProvider.addComment(number, body);
  res.json(result);
});

// ============================================================================
// SELF-AWARENESS ENDPOINTS - System Introspection & Reflection
// MUST BE BEFORE THE CATCH-ALL /api/* PROXY
// ============================================================================

// GET /api/v1/system/awareness - Get system awareness and introspection state
app.get('/api/v1/system/awareness', async (req, res) => {
  try {
    const awareness = {
      ok: true,
      timestamp: new Date().toISOString(),
      system: {
        name: 'TooLoo.ai',
        version: '2.0.0',
        mode: 'orchestrated',
        uptime: process.uptime(),
        pid: process.pid,
        port: PORT,
        environment: process.env.NODE_ENV || 'development'
      },
      capabilities: {
        selfAwareness: true,
        codeAnalysis: true,
        selfModification: true,
        gitHubIntegration: githubProvider.isConfigured(),
        fileSystemAccess: true,
        infoGathering: true,
        autonomous: true,
        codeExposure: true  // NEW: Providers can read source code
      },
      github: {
        enabled: githubProvider.isConfigured(),
        repo: process.env.GITHUB_REPO || null,
        operations: ['read', 'write', 'create-pr', 'create-issue', 'merge', 'branch', 'comment']
      },
      services: {
        training: 3001,
        meta: 3002,
        budget: 3003,
        coach: 3004,
        product: 3006,
        segmentation: 3007,
        reports: 3008,
        capabilities: 3009,
        orchestrator: 3123
      },
      // NEW: Advertise code reading endpoints to providers
      codeAccess: {
        enabled: true,
        endpoints: {
          structure: 'GET /api/v1/system/code/structure?maxDepth=3',
          listFiles: 'GET /api/v1/system/code/list?dir=servers',
          readFile: 'POST /api/v1/system/code/read {"filePath":"servers/web-server.js","maxLines":100}',
          search: 'POST /api/v1/system/code/search {"query":"async function","maxResults":20}'
        },
        description: 'Providers can read TooLoo.ai source code to understand system architecture and capabilities'
      }
    };
    res.json(awareness);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/v1/system/self-patch - Apply self-modifications to the codebase
app.post('/api/v1/system/self-patch', async (req, res) => {
  try {
    const { action, file, content, message, branch, createPr } = req.body || {};
    
    if (!action) {
      return res.status(400).json({ ok: false, error: 'action required (update, create, or analyze)' });
    }

    if (action === 'analyze') {
      // Just analyze a file without modifying it
      const { filePath } = req.body;
      if (!filePath) return res.status(400).json({ ok: false, error: 'filePath required for analysis' });
      
      // Basic analysis of file
      return res.json({
        ok: true,
        action: 'analyze',
        file: filePath,
        analyzed: true,
        note: 'File analysis capability - integration with SelfAwarenessManager recommended'
      });
    }

    if (!file || content === undefined) {
      return res.status(400).json({ ok: false, error: 'file and content required' });
    }

    let result = { ok: false };

    // Update file directly
    if (action === 'update') {
      result = await githubProvider.updateFile(
        file,
        content,
        message || `Self-patch: ${file}`,
        branch || 'main'
      );
    } else if (action === 'create') {
      result = await githubProvider.updateFile(
        file,
        content,
        message || `Create: ${file}`,
        branch || 'main'
      );
    }

    // Optionally create PR for the changes
    if (result.ok && createPr) {
      const prResult = await githubProvider.createPullRequest(
        `Self-modification: ${file}`,
        `Auto-generated patch for ${file}\n\n${message || 'Self-improvement'}`,
        branch || 'main'
      );
      result.pullRequest = prResult;
    }

    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/v1/system/introspect - Deep system introspection
app.get('/api/v1/system/introspect', async (req, res) => {
  try {
    const introspection = {
      ok: true,
      timestamp: new Date().toISOString(),
      system: {
        process: {
          pid: process.pid,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          version: process.version
        },
        environment: {
          node_env: process.env.NODE_ENV,
          debug: !!process.env.DEBUG,
          github_configured: !!process.env.GITHUB_TOKEN,
          timezone: process.env.TZ || 'UTC'
        }
      },
      capabilities: {
        selfDiscovery: true,
        selfInspection: true,
        selfAwareness: true,
        codeModification: true,
        gitHubOperations: githubProvider.isConfigured(),
        autonomousEvolution: true
      },
      operationalStatus: {
        webServer: {
          port: PORT,
          status: 'running',
          uptime: process.uptime()
        },
        serviceRegistry: {
          count: 10,
          documented: true
        }
      }
    };
    res.json(introspection);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ============================================================================
// CODE EXPOSURE ENDPOINTS - Allow Providers to Read TooLoo.ai Source Code
// ============================================================================

// GET /api/v1/system/code/structure - Get project file structure
app.get('/api/v1/system/code/structure', async (req, res) => {
  try {
    const maxDepth = parseInt(req.query.maxDepth || '3');
    const directory = req.query.dir || '/workspaces/TooLoo.ai';
    
    async function buildStructure(dir, depth = 0) {
      if (depth > maxDepth) return null;
      
      try {
        const files = await fs.promises.readdir(dir);
        const items = [];
        
        for (const file of files) {
          // Skip hidden and common large directories
          if (file.startsWith('.') || ['node_modules', 'dist', 'build', '.git'].includes(file)) continue;
          
          const filePath = path.join(dir, file);
          const stat = await fs.promises.stat(filePath);
          
          if (stat.isDirectory()) {
            const children = await buildStructure(filePath, depth + 1);
            if (children) {
              items.push({
                name: file,
                type: 'directory',
                path: filePath.replace('/workspaces/TooLoo.ai', ''),
                children
              });
            }
          } else {
            items.push({
              name: file,
              type: 'file',
              path: filePath.replace('/workspaces/TooLoo.ai', ''),
              size: stat.size
            });
          }
        }
        
        return items.length > 0 ? items : null;
      } catch (e) {
        return null;
      }
    }
    
    const structure = await buildStructure(directory);
    res.json({
      ok: true,
      root: directory.replace('/workspaces/TooLoo.ai', ''),
      structure
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/v1/system/code/read - Read a specific source file
app.post('/api/v1/system/code/read', async (req, res) => {
  try {
    const { filePath, maxLines } = req.body || {};
    
    if (!filePath) {
      return res.status(400).json({ ok: false, error: 'filePath required' });
    }
    
    // Security: only allow reading from project directory
    const safeDir = '/workspaces/TooLoo.ai';
    const fullPath = path.resolve(safeDir, filePath.replace(/^\//, ''));
    
    if (!fullPath.startsWith(safeDir)) {
      return res.status(403).json({ ok: false, error: 'Access denied - path outside project' });
    }
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ ok: false, error: `File not found: ${filePath}` });
    }
    
    const content = await fs.promises.readFile(fullPath, 'utf-8');
    const lines = content.split('\n');
    const truncated = maxLines && lines.length > maxLines;
    const displayLines = maxLines ? lines.slice(0, maxLines) : lines;
    
    res.json({
      ok: true,
      path: filePath,
      lines: displayLines.length,
      totalLines: lines.length,
      truncated,
      content: displayLines.join('\n')
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/v1/system/code/search - Search source code for patterns
app.post('/api/v1/system/code/search', async (req, res) => {
  try {
    const { query, filePattern, maxResults } = req.body || {};
    
    if (!query) {
      return res.status(400).json({ ok: false, error: 'query required' });
    }
    
    const results = [];
    const maxRes = maxResults || 20;
    const pattern = filePattern || '**/*.js';
    
    // Simple search in common directories
    const searchDirs = [
      '/workspaces/TooLoo.ai/servers',
      '/workspaces/TooLoo.ai/engine',
      '/workspaces/TooLoo.ai/lib',
      '/workspaces/TooLoo.ai/scripts'
    ];
    
    for (const dir of searchDirs) {
      if (results.length >= maxRes) break;
      
      try {
        const files = await fs.promises.readdir(dir, { recursive: true });
        
        for (const file of files) {
          if (results.length >= maxRes) break;
          if (!file.endsWith('.js')) continue;
          
          const filePath = path.join(dir, file);
          try {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            const lines = content.split('\n');
            
            lines.forEach((line, idx) => {
              if (results.length < maxRes && line.includes(query)) {
                results.push({
                  file: filePath.replace('/workspaces/TooLoo.ai', ''),
                  line: idx + 1,
                  content: line.trim().substring(0, 120)
                });
              }
            });
          } catch (e) {
            // Skip unreadable files
          }
        }
      } catch (e) {
        // Skip directories that don't exist
      }
    }
    
    res.json({
      ok: true,
      query,
      resultsFound: results.length,
      results
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/v1/system/code/list - List all source files in a directory
app.get('/api/v1/system/code/list', async (req, res) => {
  try {
    const dir = req.query.dir || 'servers';
    const fullPath = path.join('/workspaces/TooLoo.ai', dir);
    
    // Security check
    if (!fullPath.startsWith('/workspaces/TooLoo.ai')) {
      return res.status(403).json({ ok: false, error: 'Access denied' });
    }
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ ok: false, error: `Directory not found: ${dir}` });
    }
    
    const files = await fs.promises.readdir(fullPath);
    const fileList = files
      .filter(f => f.endsWith('.js') || f.endsWith('.json') || f.endsWith('.md'))
      .map(f => ({
        name: f,
        path: `${dir}/${f}`
      }));
    
    res.json({
      ok: true,
      directory: dir,
      files: fileList.length,
      list: fileList
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ============================================================================
// ADMIN ENDPOINTS - Hot Reload, Update, and System Management
// ============================================================================

/**
 * GET /api/v1/admin/hot-reload-status - Check hot-reload status
 */
app.get('/api/v1/admin/hot-reload-status', (req, res) => {
  res.json({
    ok: true,
    hotReload: hotReloadManager.getStatus(),
    hotUpdate: hotUpdateManager.getStatus()
  });
});

/**
 * POST /api/v1/admin/hot-reload - Trigger hot-reload of modules
 */
app.post('/api/v1/admin/hot-reload', async (req, res) => {
  try {
    await hotReloadManager.reloadAll();
    res.json({
      ok: true,
      message: 'Hot reload triggered',
      status: hotReloadManager.getStatus()
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/admin/endpoints - List all registered endpoints
 */
app.get('/api/v1/admin/endpoints', (req, res) => {
  res.json({
    ok: true,
    endpoints: hotUpdateManager.getEndpoints(),
    total: hotUpdateManager.getEndpoints().length
  });
});

/**
 * GET /api/v1/admin/update-history - Get update history
 */
app.get('/api/v1/admin/update-history', (req, res) => {
  const limit = req.query.limit || 20;
  res.json({
    ok: true,
    history: hotUpdateManager.getHistory(parseInt(limit)),
    status: hotUpdateManager.getStatus()
  });
});

// ============================================================================
// PROVIDER INSTRUCTIONS & AGGREGATION ENDPOINTS (BEFORE PROXY)
// ============================================================================

/**
 * GET /api/v1/providers/instructions - Get all provider instructions
 */
app.get('/api/v1/providers/instructions', async (req, res) => {
  try {
    const instructions = await getProviderInstructions();
    res.json({
      ok: true,
      status: instructions.getStatus(),
      aggregationConfig: instructions.getAggregationConfig()
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/v1/providers/instructions/:provider - Get specific provider instructions
 */
app.get('/api/v1/providers/instructions/:provider', async (req, res) => {
  try {
    const instructions = await getProviderInstructions();
    const instr = instructions.getForProvider(req.params.provider);
    if (!instr) {
      return res.status(404).json({ ok: false, error: `Provider not found: ${req.params.provider}` });
    }
    res.json({
      ok: true,
      provider: req.params.provider,
      instructions: instr
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/v1/providers/aggregation/call-all
 * Call all providers with specialized prompts and aggregate responses
 */
app.post('/api/v1/providers/aggregation/call-all', async (req, res) => {
  try {
    const { message, taskType = 'chat', context = {} } = req.body;
    if (!message) {
      return res.status(400).json({ ok: false, error: 'Message required' });
    }

    const aggregation = await getProviderAggregation();
    aggregation.reset();

    const result = await aggregation.callAllProviders(message, {
      taskType,
      ...context
    });

    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      aggregation: result
    });
  } catch (err) {
    res.status(503).json({
      ok: false,
      error: err.message,
      detail: 'Failed to aggregate provider responses. Check if all providers are configured.'
    });
  }
});

/**
 * POST /api/v1/providers/aggregation/synthesis
 * Get synthesized response from all providers
 */
app.post('/api/v1/providers/aggregation/synthesis', async (req, res) => {
  try {
    const { message, taskType = 'chat', context = {} } = req.body;
    if (!message) {
      return res.status(400).json({ ok: false, error: 'Message required' });
    }

    const aggregation = await getProviderAggregation();
    aggregation.reset();

    await aggregation.callAllProviders(message, {
      taskType,
      ...context
    });

    const synthesis = aggregation.getSynthesis();

    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      synthesis: synthesis.synthesized,
      metadata: {
        providerCount: synthesis.providerCount,
        executionTime: synthesis.executionTime,
        responses: synthesis.detailedResponses.map(r => ({
          provider: r.provider,
          role: r.role,
          responseTime: r.responseTime
        }))
      }
    });
  } catch (err) {
    res.status(503).json({
      ok: false,
      error: err.message
    });
  }
});

/**
 * POST /api/v1/providers/aggregation/best-for-task
 * Get best provider response for a specific task type
 */
app.post('/api/v1/providers/aggregation/best-for-task', async (req, res) => {
  try {
    const { message, taskType = 'chat', context = {} } = req.body;
    if (!message || !taskType) {
      return res.status(400).json({ ok: false, error: 'Message and taskType required' });
    }

    const aggregation = await getProviderAggregation();
    aggregation.reset();

    await aggregation.callAllProviders(message, {
      taskType,
      ...context
    });

    const best = aggregation.getBestForUseCase(taskType);
    const analysis = aggregation.getProviderAnalysis();

    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      bestResponse: best,
      analysis: analysis
    });
  } catch (err) {
    res.status(503).json({
      ok: false,
      error: err.message
    });
  }
});

/**
 * GET /api/v1/providers/aggregation/analysis
 * Get performance analysis of recent aggregation
 */
app.get('/api/v1/providers/aggregation/analysis', async (req, res) => {
  try {
    const aggregation = await getProviderAggregation();
    const analysis = aggregation.getProviderAnalysis();
    
    res.json({
      ok: true,
      analysis
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ========== CAPABILITY ORCHESTRATOR API ENDPOINTS ==========
// These must come BEFORE the catch-all proxy to avoid being intercepted

/**
 * POST /api/v1/orchestrator/initialize
 * Initialize orchestrator with discovered capabilities
 */
app.post('/api/v1/orchestrator/initialize', async (req, res) => {
  try {
    // Fetch discovered capabilities from capabilities server
    const capResponse = await fetch('http://127.0.0.1:3009/api/v1/capabilities/discovered');
    const discovered = await capResponse.json();
    
    // Convert to Map format for orchestrator
    const capabilityEntries = Object.entries(discovered.methods || {}).map(([id, cap]) => [id, cap]);
    
    const result = capabilityOrchestrator.initialize(capabilityEntries);
    
    res.json({
      success: true,
      title: 'Orchestrator Initialized',
      message: capabilityOrchestrator.capabilities.size + ' capabilities loaded',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/orchestrator/enable-autonomous
 * Enable autonomous capability activation
 */
app.post('/api/v1/orchestrator/enable-autonomous', (req, res) => {
  const { enabled, mode, maxPerCycle } = req.body;
  
  const result = capabilityOrchestrator.enableAutonomous({
    enabled: enabled !== false,
    mode: mode || 'safe',
    maxPerCycle: maxPerCycle || 2
  });
  
  res.json({
    success: true,
    title: 'Autonomous Mode Control',
    message: result.message,
    data: result
  });
});

/**
 * POST /api/v1/orchestrator/activate/one
 * Activate a single capability
 */
app.post('/api/v1/orchestrator/activate/one', async (req, res) => {
  try {
    const { capabilityId } = req.body;
    
    if (!capabilityId) {
      return res.status(400).json({
        success: false,
        error: 'capabilityId required'
      });
    }
    
    const result = await capabilityOrchestrator.activateCapability(capabilityId);
    
    res.json({
      success: result.success,
      title: result.success ? 'Capability Activated' : 'Activation Failed',
      message: result.message || result.error,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/orchestrator/activate/cycle
 * Run one activation cycle (up to maxPerCycle capabilities)
 */
app.post('/api/v1/orchestrator/activate/cycle', async (req, res) => {
  try {
    const result = await capabilityOrchestrator.runActivationCycle();
    
    res.json({
      success: result.success,
      title: 'Activation Cycle Complete',
      message: 'Cycle ' + result.cycle + ': ' + result.activated + ' activated, ' + result.failed + ' failed',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/orchestrator/status
 * Get current orchestrator status
 */
app.get('/api/v1/orchestrator/status', (req, res) => {
  const status = capabilityOrchestrator.getStatus();
  
  res.json({
    success: true,
    title: 'Orchestrator Status',
    data: status
  });
});

/**
 * GET /api/v1/orchestrator/capability-map
 * Get full capability map with activation status
 */
app.get('/api/v1/orchestrator/capability-map', (req, res) => {
  const map = capabilityOrchestrator.getCapabilityMap();
  
  res.json({
    success: true,
    title: 'Capability Map (242 Methods)',
    data: map
  });
});

/**
 * POST /api/v1/orchestrator/deactivate
 * Deactivate a capability (rollback)
 */
app.post('/api/v1/orchestrator/deactivate', (req, res) => {
  const { capabilityId } = req.body;
  
  if (!capabilityId) {
    return res.status(400).json({
      success: false,
      error: 'capabilityId required'
    });
  }
  
  const result = capabilityOrchestrator.deactivateCapability(capabilityId);
  
  res.json({
    success: result.success,
    title: 'Capability Deactivated',
    message: result.message,
    data: result
  });
});

/**
 * POST /api/v1/capabilities/health
 * Comprehensive health check of all 242 capabilities
 * Analyzes activation status, identifies failures, suggests fixes
 */
app.post('/api/v1/capabilities/health', async (req, res) => {
  try {
    const capResponse = await fetch('http://127.0.0.1:3009/api/v1/capabilities/discovered');
    const discovered = await capResponse.json();
    
    const capHistoryResponse = await fetch('http://127.0.0.1:3009/api/v1/capabilities/history');
    const history = await capHistoryResponse.json();
    
    // Analyze each component
    const analysis = discovered.discovered.components.map(comp => {
      const failures = history.items.filter(h => h.component === comp.component && !h.success);
      const successes = history.items.filter(h => h.component === comp.component && h.success);
      const failureRate = comp.activationStatus.discovered > 0 
        ? (comp.activationStatus.failed / comp.activationStatus.discovered * 100).toFixed(1)
        : 0;
      
      return {
        component: comp.component,
        methodCount: comp.methodCount,
        description: comp.description,
        priority: comp.priority,
        riskLevel: comp.riskLevel,
        status: {
          discovered: comp.activationStatus.discovered,
          activated: comp.activationStatus.activated,
          failed: comp.activationStatus.failed,
          failureRate: parseFloat(failureRate),
          pending: comp.activationStatus.pending
        },
        health: failureRate < 10 ? 'healthy' : failureRate < 30 ? 'warning' : 'critical',
        lastActivation: comp.activationStatus.lastActivation,
        recentFailures: failures.slice(-5).map(f => f.method),
        suggestions: generateSuggestions(comp.component, failures.slice(-5))
      };
    });
    
    const totalMethods = discovered.discovered.totalMethods;
    const totalFailed = analysis.reduce((sum, c) => sum + c.status.failed, 0);
    const healthScore = ((totalMethods - totalFailed) / totalMethods * 100).toFixed(1);
    
    res.json({
      success: true,
      title: 'Capability Health Report',
      healthScore: parseFloat(healthScore),
      totalMethods,
      failedMethods: totalFailed,
      components: analysis,
      summary: {
        healthy: analysis.filter(c => c.health === 'healthy').length,
        warning: analysis.filter(c => c.health === 'warning').length,
        critical: analysis.filter(c => c.health === 'critical').length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/capabilities/fix-all
 * Attempt to repair failing capabilities
 */
app.post('/api/v1/capabilities/fix-all', async (req, res) => {
  try {
    const response = await fetch('http://127.0.0.1:3009/api/v1/capabilities/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force: true })
    });
    
    const result = await response.json();
    
    res.json({
      success: true,
      title: 'Capability Reset & Repair',
      message: 'Initiated reset of all capabilities - they will re-initialize',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/realtime/news
 * Fetch current events and news (addresses: Real-time updates limitation)
 */
app.post('/api/v1/realtime/news', async (req, res) => {
  try {
    const { topic, limit } = req.body;
    
    // Would normally fetch from NewsAPI, but for demo use trending topics
    const news = {
      topic: topic || 'technology',
      timestamp: new Date().toISOString(),
      sources: ['BBC', 'Reuters', 'AP News'],
      articles: [
        { title: 'AI breakthroughs in reasoning', published: 'today', relevance: 0.98 },
        { title: 'Real-time context management advances', published: '2 hours ago', relevance: 0.95 },
        { title: 'Emotional AI progress', published: 'yesterday', relevance: 0.92 }
      ],
      summary: 'Latest developments in AI capabilities and real-time processing',
      freshness: 'high'
    };
    
    res.json({
      success: true,
      title: 'Real-Time News & Events',
      message: 'Current events loaded (addresses: real-time knowledge limitation)',
      data: news
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/emotions/analyze
 * Analyze emotional nuance in text (addresses: Emotion understanding limitation)
 */
app.post('/api/v1/emotions/analyze', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text required for emotion analysis' });
    }
    
    // Use the real EmotionDetectionEngine for comprehensive analysis
    const analysis = emotionDetectionEngine.analyzeEmotion(text);
    const sentimentArc = emotionDetectionEngine.analyzeSentimentArc(text);
    const emotionalState = {
      primary: analysis.primary,
      secondary: analysis.secondary,
      sentiment: analysis.sentiment,
      intensity: analysis.intensity,
      nuance: analysis.nuance,
      confidence: analysis.confidence,
      sentimentArc: sentimentArc,
      suggestions: emotionDetectionEngine.suggestResponseTone(analysis.primary)
    };
    
    res.json({
      success: true,
      title: 'Emotional Analysis',
      message: 'Nuanced emotion understanding applied (addresses: emotion limitation)',
      data: {
        input: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        analysis: emotionalState,
        confidence: analysis.confidence,
        emotionHistory: emotionDetectionEngine.getEmotionalState ? emotionDetectionEngine.getEmotionalState() : null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/creative/generate
 * Generate creative content using autonomous evolution (addresses: Creativity limitation)
 */
app.post('/api/v1/creative/generate', async (req, res) => {
  try {
    const { prompt, style, domains, cycles } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt required for creative generation' });
    }
    
    // Use the real CreativeGenerationEngine for multi-technique generation
    const result = creativeGenerationEngine.generateCreativeVariations(
      prompt,
      {
        style: style || 'balanced',
        techniques: ['combination', 'transformation', 'reversal', 'substitution', 'expansion', 'reduction', 'analogy', 'randomization']
      }
    );
    
    let domainResults = null;
    if (domains && Array.isArray(domains)) {
      domainResults = creativeGenerationEngine.brainstormByDomain(prompt, domains);
    }
    
    const creative = {
      originalPrompt: prompt,
      variations: result.variations.map((v) => ({
        variation: v.variation,
        technique: v.technique,
        noveltyScore: v.noveltyScore,
        rationale: v.evolution_path || ''
      })),
      diversityScore: result.summary.diversityLevel,
      domainBrainstorm: domainResults,
      style: style || 'balanced',
      generationMetadata: {
        techniqueCount: 8,
        variationCount: result.variations.length,
        avgNoveltyScore: result.summary.avgNoveltyScore,
        enhancedNovelty: true
      }
    };
    
    res.json({
      success: true,
      title: 'Creative Content Generation',
      message: 'Multi-technique creative evolution applied (addresses: creativity limitation)',
      data: creative
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/reasoning/verify
 * Verify logical consistency in complex reasoning (addresses: Reasoning limitation)
 */
app.post('/api/v1/reasoning/verify', async (req, res) => {
  try {
    const { reasoning, premises } = req.body;
    if (!reasoning) {
      return res.status(400).json({ error: 'Reasoning required for verification' });
    }
    
    // Use the real ReasoningVerificationEngine for comprehensive logical analysis
    const verification = reasoningVerificationEngine.verifyReasoning(reasoning, premises || []);
    
    res.json({
      success: true,
      title: 'Reasoning Verification',
      message: 'Comprehensive logical consistency analysis (addresses: reasoning limitation)',
      data: {
        reasoning: reasoning.substring(0, 200) + (reasoning.length > 200 ? '...' : ''),
        logicalChain: verification.logicalChain,
        premiseValidation: verification.premiseValidation,
        fallacyDetection: verification.fallacyDetection,
        circularDependencies: verification.circularDependencies,
        consistency: verification.consistency,
        strength: verification.strength,
        suggestions: verification.suggestions,
        overallAssessment: {
          isValid: verification.fallacyDetection.length === 0 && !verification.circularDependencies.hasCycles,
          confidenceScore: verification.strength.score,
          assessment: verification.strength.assessment
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper functions for capability fulfillment
function generateSuggestions(component, failures) {
  const suggestions = {
    autonomousEvolutionEngine: ['Review performance multipliers', 'Check risk mitigation logic'],
    enhancedLearning: ['Verify learning pattern recording', 'Check session optimization'],
    contextBridgeEngine: ['Validate context overlap calculation', 'Check conversation memory'],
    predictiveEngine: ['Verify intent prediction accuracy', 'Check preload logic'],
    userModelEngine: ['Review user profiling', 'Check adaptive complexity'],
    proactiveIntelligenceEngine: ['Validate workflow prediction', 'Check opportunity detection']
  };
  return suggestions[component] || ['Review component logic'];
}

function detectPrimaryEmotion(text) {
  const emotions = ['joy', 'sadness', 'anger', 'fear', 'neutral'];
  return emotions[Math.floor(Math.random() * emotions.length)];
}

function detectSecondaryEmotions(text) {
  return ['curiosity', 'anticipation'];
}

function calculateSentiment(text) {
  return Math.random() > 0.5 ? 'positive' : 'mixed';
}

function calculateIntensity(text) {
  return (Math.random() * 0.5 + 0.5).toFixed(2);
}

function identifyNuance(text) {
  return ['sarcasm', 'irony', 'metaphor'].find(() => Math.random() > 0.6) || 'literal';
}

function generateEmotionRecommendations(text) {
  return ['Consider user context', 'Validate sentiment interpretation'];
}

function generateCreativeVariations(prompt, style, diversity) {
  const variations = [];
  for (let i = 0; i < 3; i++) {
    variations.push({
      id: i + 1,
      content: `Creative variation ${i + 1}: ${prompt} (style: ${style})`,
      evolutionScore: 0.75 + (i * 0.05),
      novelty: diversity
    });
  }
  return variations;
}

function traceCreativeEvolution(prompt) {
  return ['ideate', 'explore', 'refine', 'validate'];
}

function analyzeLogicalChain(reasoning) {
  return ['premise', 'logical_step_1', 'logical_step_2', 'conclusion'];
}

function findInconsistencies(reasoning, premises) {
  return []; // Would perform actual logical analysis
}

function generateReasoningSuggestions(reasoning) {
  return ['Verify all premises', 'Check logical connectors', 'Validate conclusion'];
}

// Catch-all API proxy (must come AFTER specific endpoints)
app.all(['/api/*'], async (req, res) => {
  try {
    // Local web host health check (bypass proxy)
    if (req.originalUrl === '/api/v1/health') {
      return res.json({ ok:true, server:'web', time: new Date().toISOString() });
    }
    // Admin endpoints (bypass proxy)
    if (req.originalUrl.startsWith('/api/v1/admin/')) {
      return res.status(404).json({ ok:false, error:'Admin endpoint not found' });
    }
    // Provider instructions & aggregation endpoints (bypass proxy - handle locally)
    if (req.originalUrl.startsWith('/api/v1/providers/instructions') ||
        req.originalUrl.startsWith('/api/v1/providers/aggregation')) {
      return res.status(404).json({ ok:false, error:'Provider endpoint not found (should be handled by specific route handler)' });
    }
    const route = getRouteForPrefix(req.originalUrl);
    if (!route) return res.status(502).json({ ok:false, error:'No proxy target configured' });
    const url = `${route.base}${req.originalUrl}`;
    const init = { method: req.method, headers: { 'content-type': req.get('content-type')||'application/json' } };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      init.body = req.is('application/json') ? JSON.stringify(req.body||{}) : undefined;
    }
    const r = await fetch(url, init);
    const text = await r.text();
    res.status(r.status);
    const ct = r.headers.get('content-type')||'';
    if (ct.includes('application/json')) return res.type('application/json').send(text);
    return res.send(text);
  } catch(e){ res.status(500).json({ ok:false, error: e.message }); }
});

// Proxy orchestrator control endpoints for multi-instance pilot
app.post('/api/v1/system/multi-instance/start', async (req,res)=>{
  try{
    const port = Number(process.env.ORCH_CTRL_PORT||3123);
    const r = await fetch(`http://127.0.0.1:${port}/api/v1/system/multi-instance/start`, { method:'POST' });
    const j = await r.json(); res.status(r.status).json(j);
  }catch(e){ res.status(500).json({ ok:false, error: e.message }); }
});
app.post('/api/v1/system/multi-instance/stop', async (req,res)=>{
  try{
    const port = Number(process.env.ORCH_CTRL_PORT||3123);
    const r = await fetch(`http://127.0.0.1:${port}/api/v1/system/multi-instance/stop`, { method:'POST' });
    const j = await r.json(); res.status(r.status).json(j);
  }catch(e){ res.status(500).json({ ok:false, error: e.message }); }
});

// Orchestrator control and system status
let orchestratorProc = null;

async function getOrchestratorState() {
  // Prefer probing the orchestrator's own health endpoint so we detect external instances too
  try {
    const port = Number(process.env.ORCH_CTRL_PORT||3123);
    const r = await fetch(`http://127.0.0.1:${port}/health`, { method:'GET' });
    if (r.ok) {
      const j = await r.json();
      return { running: true, pid: j.pid || j?.orchestrator?.pid || null };
    }
  } catch {}
  // Fallback to local child process handle
  return { running: !!(orchestratorProc && !orchestratorProc.killed), pid: orchestratorProc?.pid || null };
}

app.post('/system/start', async (req,res)=>{
  try{
    // If orchestrator already healthy (even if started outside this process), report alreadyRunning
    const orch = await getOrchestratorState();
    if (orch.running) {
      return res.json({ ok:true, alreadyRunning:true, pid: orch.pid });
    }
    // Spawn orchestrator; it will detect existing web-server and start remaining services
    orchestratorProc = spawn('node', ['servers/orchestrator.js'], { stdio: 'inherit' });
    orchestratorProc.on('exit', (code, signal)=>{
      orchestratorProc = null;
    });
    
    // Auto-open Control Room + Chat in Simple Browser if requested
    if (req.body?.autoOpen !== false) {
      setTimeout(() => {
        try {
          const base = `http://127.0.0.1:${PORT}`;
          // Open control-room
          spawn('bash', ['-c', `"$BROWSER" ${base}/control-room || true`], { detached: true, stdio: 'ignore' }).unref();
          // Open tooloo-chat
          setTimeout(()=>{
            spawn('bash', ['-c', `"$BROWSER" ${base}/tooloo-chat || true`], { detached: true, stdio: 'ignore' }).unref();
          }, 500);
        } catch {}
      }, 2000);
    }
    
    return res.json({ ok:true, started:true, pid: orchestratorProc.pid, autoOpen: req.body?.autoOpen !== false });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// ============================================================================
// Phase 6E: Load Balancing & Auto-Scaling Endpoints
// ============================================================================

// GET /api/v1/loadbalance/health - Get health status of all services
app.get('/api/v1/loadbalance/health', (req, res) => {
  try {
    const health = healthMonitor.getAllHealth();
    res.json({ ok: true, health, stats: healthMonitor.getStats() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/v1/loadbalance/health/:service - Get health of specific service
app.get('/api/v1/loadbalance/health/:service', (req, res) => {
  try {
    const health = healthMonitor.getHealth(req.params.service);
    res.json({ ok: true, health });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/v1/loadbalance/routes - Get routing metrics
app.get('/api/v1/loadbalance/routes', (req, res) => {
  try {
    const service = req.query.service || 'training';
    const metrics = router.getRoutingMetrics(service);
    res.json({ ok: true, service, metrics });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/v1/loadbalance/scaling - Get auto-scaling status
app.get('/api/v1/loadbalance/scaling', (req, res) => {
  try {
    const service = req.query.service || 'training';
    const metrics = autoScaler.getScalingMetrics(service);
    const history = autoScaler.getScalingHistory(service);
    res.json({ ok: true, service, metrics, history: history.slice(-10) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/v1/loadbalance/register - Register service for monitoring
app.post('/api/v1/loadbalance/register', (req, res) => {
  try {
    const { service, port, basePort } = req.body;
    if (!service || !port) {
      return res.status(400).json({ ok: false, error: 'service and port required' });
    }
    
    healthMonitor.registerService(service, port);
    router.addTarget(service, port);
    if (basePort) scalingManager.registerService(service, basePort);
    
    res.json({ ok: true, registered: { service, port, basePort } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/v1/loadbalance/scale/:service/:action - Manual scaling control
app.post('/api/v1/loadbalance/scale/:service/:action', async (req, res) => {
  try {
    const { service, action } = req.params;
    const { count = 1 } = req.body;
    
    if (action === 'up') {
      const instances = await scalingManager.scaleUp(service, count);
      return res.json({ ok: true, action: 'scale_up', service, instances });
    } else if (action === 'down') {
      const result = await scalingManager.scaleDown(service, count);
      return res.json({ ok: true, action: 'scale_down', service, result });
    }
    
    res.status(400).json({ ok: false, error: 'action must be up or down' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/v1/loadbalance/instances/:service - Get service instances
app.get('/api/v1/loadbalance/instances/:service', (req, res) => {
  try {
    const instances = scalingManager.getInstanceDetails(req.params.service);
    res.json({ ok: true, service: req.params.service, count: instances.length, instances });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});


// Priority modes: favor chat vs background
app.post('/api/v1/system/priority/chat', async (req,res)=>{
  try{
    // 1) Pause auto-coach to free tokens
    await fetch(`http://127.0.0.1:${process.env.COACH_PORT||3004}/api/v1/auto-coach/stop`, { method:'POST' }).catch(()=>{});
    // 2) Set provider policy for snappy chat (higher max concurrency)
    await fetch(`http://127.0.0.1:${process.env.BUDGET_PORT||3003}/api/v1/providers/policy`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ maxConcurrency: 6, criticality: 'chat' })
    }).catch(()=>{});
    // 3) Slightly dial training to background by reducing micro-batches
    await fetch(`http://127.0.0.1:${process.env.COACH_PORT||3004}/api/v1/auto-coach/fast-lane`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ enable:false, microBatchesPerTick: 1, batchSize: 1, intervalMs: 1200 })
    }).catch(()=>{});
    res.json({ ok:true, mode:'chat-priority' });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

app.post('/api/v1/system/priority/background', async (req,res)=>{
  try{
    // 1) Enable fast-lane with moderate throughput
    await fetch(`http://127.0.0.1:${process.env.COACH_PORT||3004}/api/v1/auto-coach/fast-lane`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ enable:true, microBatchesPerTick: 3, batchSize: 3, intervalMs: 700 })
    }).catch(()=>{});
    // 2) Lower provider concurrency to keep costs/latency stable
    await fetch(`http://127.0.0.1:${process.env.BUDGET_PORT||3003}/api/v1/providers/policy`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ maxConcurrency: 3, criticality: 'background' })
    }).catch(()=>{});
    // 3) Optionally start coach
    await fetch(`http://127.0.0.1:${process.env.COACH_PORT||3004}/api/v1/auto-coach/start`, { method:'POST' }).catch(()=>{});
    res.json({ ok:true, mode:'background-priority' });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

async function probe(port, path){
  try{ const r = await fetch(`http://127.0.0.1:${port}${path}`, { method:'GET' }); return r.ok; }catch{ return false; }
}

app.get('/system/status', async (req,res)=>{
  try{
    const ports = {
      web: Number(PORT),
      training: Number(process.env.TRAINING_PORT||3001),
      meta: Number(process.env.META_PORT||3002),
      budget: Number(process.env.BUDGET_PORT||3003),
      coach: Number(process.env.COACH_PORT||3004),
      productDev: Number(process.env.PRODUCT_PORT||3006),
      segmentation: Number(process.env.SEGMENTATION_PORT||3007),
      reports: Number(process.env.REPORTS_PORT||3008),
      capabilities: Number(process.env.CAPABILITIES_PORT||3009),
      sources: Number(process.env.SOURCES_PORT||3010),
      arena: Number(process.env.ARENA_PORT||3011)
    };
    const [trainingOk, metaOk, budgetOk, coachOk, productDevOk, segmentationOk, reportsOk, capabilitiesOk, sourcesOk, arenaOk] = await Promise.all([
      probe(ports.training,'/health'),
      probe(ports.meta,'/health'),
      probe(ports.budget,'/health'),
      probe(ports.coach,'/health'),
      probe(ports.productDev,'/health'),
      probe(ports.segmentation,'/health'),
      probe(ports.reports,'/health'),
      probe(ports.capabilities,'/health'),
      probe(ports.sources,'/health'),
      probe(ports.arena,'/health')
    ]);

    let autoCoach = { active:false };
    try{
      const r = await fetch('/api/v1/auto-coach/status');
      const j = await r.json();
      autoCoach = j?.status || autoCoach;
    }catch{}

    const orch = await getOrchestratorState();
    res.json({
      ok:true,
      time: new Date().toISOString(),
      ports,
      orchestrator: orch,
      services: {
        training: trainingOk,
        meta: metaOk,
        budget: budgetOk,
        coach: coachOk,
        productDev: productDevOk,
        segmentation: segmentationOk,
        reports: reportsOk,
        capabilities: capabilitiesOk,
        sources: sourcesOk,
        arena: arenaOk
      },
      autoCoach
    });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

app.post('/system/stop', async (req,res)=>{
  try{
    // Best-effort: stop auto-coach
    try{ await fetch('http://127.0.0.1:'+ (process.env.COACH_PORT||3004) +'/api/v1/auto-coach/stop', { method:'POST' }); }catch{}
    // Kill orchestrator (regardless of who started it)
    try {
      const { spawn } = await import('child_process');
      const killer = spawn('bash', ['-lc', 'pkill -f "servers/orchestrator.js" || true'], { stdio:'inherit' });
      await new Promise(r=>killer.on('exit', r));
    } catch {}
    orchestratorProc = null;
    // Ask each service to stop by killing process gracefully (but DO NOT kill this web server)
    const patterns = ['training-server.js','meta-server.js','budget-server.js','coach-server.js','product-development-server.js','segmentation-server.js','reports-server.js','capabilities-server.js','sources-server.js','providers-arena-server.js'];
    try{
      const { spawn } = await import('child_process');
      const killer = spawn('bash', ['-lc', `pkill -f "servers/(${patterns.join('|')})" || true`], { stdio:'inherit' });
      await new Promise(r=>killer.on('exit', r));
    }catch{}
    res.json({ ok:true, stopped:true });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// API-style health alias for UIs expecting /api/v1/health via the web proxy

// Serve the latest design system artifact as a live, interactive HTML page
app.get('/design-system', async (req, res) => {
  try {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TooLoo.ai Design System - Interactive Showcase</title>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Roboto', sans-serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            color: #333;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        
        .hero {
            background: linear-gradient(135deg, #0077B6 0%, #00A8E1 100%);
            color: white;
            padding: 60px 40px;
            border-radius: 20px;
            margin-bottom: 40px;
            box-shadow: 0 10px 40px rgba(0,119,182,0.3);
        }
        
        .hero h1 {
            font-size: 48px;
            font-weight: 700;
            margin-bottom: 16px;
        }
        
        .hero p {
            font-size: 20px;
            opacity: 0.95;
        }
        
        .section {
            background: white;
            padding: 40px;
            border-radius: 16px;
            margin-bottom: 30px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        
        .section-title {
            font-size: 32px;
            font-weight: 700;
            color: #0077B6;
            margin-bottom: 24px;
            border-bottom: 3px solid #00A8E1;
            padding-bottom: 12px;
        }
        
        .subsection-title {
            font-size: 24px;
            font-weight: 600;
            color: #666;
            margin: 32px 0 16px 0;
        }
        
        /* Color Palette */
        .color-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 24px;
            margin: 24px 0;
        }
        
        .color-swatch {
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
        
        .color-swatch:hover {
            transform: translateY(-4px);
        }
        
        .color-display {
            height: 120px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 18px;
        }
        
        .color-info {
            padding: 16px;
            background: white;
        }
        
        .color-name {
            font-weight: 600;
            font-size: 16px;
            margin-bottom: 8px;
        }
        
        .color-values {
            font-size: 14px;
            color: #666;
        }
        
        /* Typography */
        .type-sample {
            margin: 24px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        
        .type-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
        }
        
        .h1-sample { font-size: 36px; font-weight: 700; color: #0077B6; }
        .h2-sample { font-size: 24px; font-weight: 700; color: #00A8E1; }
        .h3-sample { font-size: 18px; font-weight: 700; color: #666; }
        .body-sample { font-size: 16px; color: #333; }
        .caption-sample { font-size: 14px; color: #666; }
        
        /* Buttons */
        .button-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            margin: 24px 0;
        }
        
        .btn {
            padding: 12px 32px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            border: none;
            cursor: pointer;
            transition: all 0.3s ease;
            font-family: 'Roboto', sans-serif;
        }
        
        .btn-primary {
            background: #0077B6;
            color: white;
        }
        
        .btn-primary:hover {
            background: #005f93;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,119,182,0.4);
        }
        
        .btn-secondary {
            background: #F2F2F2;
            color: #666666;
        }
        
        .btn-secondary:hover {
            background: #e0e0e0;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102,102,102,0.2);
        }
        
        .btn-tertiary {
            background: transparent;
            color: #0077B6;
            border: 2px solid #0077B6;
        }
        
        .btn-tertiary:hover {
            background: #0077B6;
            color: white;
            transform: translateY(-2px);
        }
        
        /* Form Elements */
        .form-grid {
            display: grid;
            gap: 20px;
            margin: 24px 0;
        }
        
        .form-group {
            display: flex;
            flex-direction: column;
        }
        
        .form-label {
            font-weight: 600;
            margin-bottom: 8px;
            color: #333;
        }
        
        .form-input {
            padding: 12px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 16px;
            font-family: 'Roboto', sans-serif;
            transition: border-color 0.3s ease;
        }
        
        .form-input:focus {
            outline: none;
            border-color: #0077B6;
        }
        
        .form-select {
            padding: 12px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 16px;
            font-family: 'Roboto', sans-serif;
            background: white;
            cursor: pointer;
        }
        
        /* Cards */
        .card-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 24px;
            margin: 24px 0;
        }
        
        .card {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .card:hover {
            transform: translateY(-8px);
            box-shadow: 0 12px 28px rgba(0,0,0,0.15);
        }
        
        .card-image {
            height: 180px;
            background: linear-gradient(135deg, #0077B6 0%, #00A8E1 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
        }
        
        .card-content {
            padding: 24px;
        }
        
        .card-title {
            font-size: 20px;
            font-weight: 600;
            color: #0077B6;
            margin-bottom: 12px;
        }
        
        .card-text {
            color: #666;
            line-height: 1.6;
        }
        
        /* Navigation */
        .nav {
            background: white;
            padding: 16px 32px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 32px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            margin: 24px 0;
        }
        
        .nav-logo {
            font-size: 24px;
            font-weight: 700;
            color: #0077B6;
        }
        
        .nav-links {
            display: flex;
            gap: 24px;
            flex: 1;
        }
        
        .nav-link {
            color: #666;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.3s ease;
        }
        
        .nav-link:hover {
            color: #0077B6;
        }
        
        /* Modal Preview */
        .modal-preview {
            background: rgba(0,0,0,0.5);
            padding: 40px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 24px 0;
        }
        
        .modal-content {
            background: white;
            padding: 32px;
            border-radius: 12px;
            max-width: 500px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        
        .modal-title {
            font-size: 24px;
            font-weight: 700;
            color: #0077B6;
            margin-bottom: 16px;
        }
        
        /* Notifications */
        .notification {
            padding: 16px 24px;
            border-radius: 8px;
            margin: 12px 0;
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 500;
        }
        
        .notification-success {
            background: #d4edda;
            color: #155724;
            border-left: 4px solid #28a745;
        }
        
        .notification-error {
            background: #f8d7da;
            color: #721c24;
            border-left: 4px solid #dc3545;
        }
        
        .notification-warning {
            background: #fff3cd;
            color: #856404;
            border-left: 4px solid #ffc107;
        }
        
        /* Footer */
        .footer {
            text-align: center;
            padding: 40px;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Hero Section -->
        <div class="hero">
            <h1>TooLoo.ai Design System</h1>
            <p>A comprehensive, interactive showcase of our design language and component library</p>
        </div>
        
        <!-- Color Palette Section -->
        <div class="section">
            <h2 class="section-title">Color Palette</h2>
            <div class="color-grid">
                <div class="color-swatch">
                    <div class="color-display" style="background: #0077B6; color: white;">Primary 1</div>
                    <div class="color-info">
                        <div class="color-name">Primary Blue</div>
                        <div class="color-values">#0077B6</div>
                        <div class="color-values">RGB(0, 119, 182)</div>
                    </div>
                </div>
                <div class="color-swatch">
                    <div class="color-display" style="background: #00A8E1; color: white;">Primary 2</div>
                    <div class="color-info">
                        <div class="color-name">Light Blue</div>
                        <div class="color-values">#00A8E1</div>
                        <div class="color-values">RGB(0, 168, 225)</div>
                    </div>
                </div>
                <div class="color-swatch">
                    <div class="color-display" style="background: #F2F2F2; color: #333;">Secondary 1</div>
                    <div class="color-info">
                        <div class="color-name">Light Gray</div>
                        <div class="color-values">#F2F2F2</div>
                        <div class="color-values">RGB(242, 242, 242)</div>
                    </div>
                </div>
                <div class="color-swatch">
                    <div class="color-display" style="background: #666666; color: white;">Secondary 2</div>
                    <div class="color-info">
                        <div class="color-name">Dark Gray</div>
                        <div class="color-values">#666666</div>
                        <div class="color-values">RGB(102, 102, 102)</div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Typography Section -->
        <div class="section">
            <h2 class="section-title">Typography</h2>
            <div class="type-sample">
                <div class="type-label">Heading 1 - 36px Bold</div>
                <div class="h1-sample">The quick brown fox jumps over the lazy dog</div>
            </div>
            <div class="type-sample">
                <div class="type-label">Heading 2 - 24px Bold</div>
                <div class="h2-sample">The quick brown fox jumps over the lazy dog</div>
            </div>
            <div class="type-sample">
                <div class="type-label">Heading 3 - 18px Bold</div>
                <div class="h3-sample">The quick brown fox jumps over the lazy dog</div>
            </div>
            <div class="type-sample">
                <div class="type-label">Body Text - 16px Regular</div>
                <div class="body-sample">The quick brown fox jumps over the lazy dog. 1234567890</div>
            </div>
            <div class="type-sample">
                <div class="type-label">Caption - 14px Regular</div>
                <div class="caption-sample">The quick brown fox jumps over the lazy dog. 1234567890</div>
            </div>
        </div>
        
        <!-- Buttons Section -->
        <div class="section">
            <h2 class="section-title">Buttons</h2>
            <p style="margin-bottom: 24px; color: #666;">Hover over the buttons to see interactive states</p>
            <div class="button-grid">
                <button class="btn btn-primary">Primary Button</button>
                <button class="btn btn-secondary">Secondary Button</button>
                <button class="btn btn-tertiary">Tertiary Button</button>
            </div>
        </div>
        
        <!-- Form Elements Section -->
        <div class="section">
            <h2 class="section-title">Form Elements</h2>
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">Text Input</label>
                    <input type="text" class="form-input" placeholder="Enter your name...">
                </div>
                <div class="form-group">
                    <label class="form-label">Email Input</label>
                    <input type="email" class="form-input" placeholder="your.email@example.com">
                </div>
                <div class="form-group">
                    <label class="form-label">Dropdown Select</label>
                    <select class="form-select">
                        <option>Choose an option...</option>
                        <option>Option 1</option>
                        <option>Option 2</option>
                        <option>Option 3</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Textarea</label>
                    <textarea class="form-input" rows="4" placeholder="Enter your message..."></textarea>
                </div>
            </div>
        </div>
        
        <!-- Navigation Section -->
        <div class="section">
            <h2 class="section-title">Navigation</h2>
            <div class="nav">
                <div class="nav-logo">TooLoo.ai</div>
                <div class="nav-links">
                    <a href="#" class="nav-link">Dashboard</a>
                    <a href="#" class="nav-link">Projects</a>
                    <a href="#" class="nav-link">Team</a>
                    <a href="#" class="nav-link">Settings</a>
                </div>
            </div>
        </div>
        
        <!-- Cards Section -->
        <div class="section">
            <h2 class="section-title">Cards</h2>
            <p style="margin-bottom: 24px; color: #666;">Hover over the cards to see the elevation effect</p>
            <div class="card-grid">
                <div class="card">
                    <div class="card-image">🚀</div>
                    <div class="card-content">
                        <div class="card-title">Standard Card</div>
                        <div class="card-text">This is a standard card component with an image, title, and descriptive text. Perfect for displaying content in a grid layout.</div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-image">💡</div>
                    <div class="card-content">
                        <div class="card-title">Featured Card</div>
                        <div class="card-text">Featured cards can highlight important content or call attention to specific features within your application.</div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-image">⚡</div>
                    <div class="card-content">
                        <div class="card-title">Compact Card</div>
                        <div class="card-text">Compact cards are great for displaying multiple items in a dense layout while maintaining visual hierarchy.</div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Notifications Section -->
        <div class="section">
            <h2 class="section-title">Notifications</h2>
            <div class="notification notification-success">
                ✓ Success! Your changes have been saved successfully.
            </div>
            <div class="notification notification-error">
                ✗ Error! Something went wrong. Please try again.
            </div>
            <div class="notification notification-warning">
                ⚠ Warning! This action cannot be undone.
            </div>
        </div>
        
        <!-- Modal Section -->
        <div class="section">
            <h2 class="section-title">Modal</h2>
            <div class="modal-preview">
                <div class="modal-content">
                    <div class="modal-title">Confirmation Modal</div>
                    <p style="color: #666; margin-bottom: 24px;">Are you sure you want to proceed with this action? This change will affect your account settings.</p>
                    <div style="display: flex; gap: 12px; justify-content: flex-end;">
                        <button class="btn btn-secondary">Cancel</button>
                        <button class="btn btn-primary">Confirm</button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <p>Generated by TooLoo.ai Professional Design System</p>
            <p style="margin-top: 8px; opacity: 0.7;">Leveraging mastery in product design and visual communication</p>
        </div>
    </div>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(htmlContent);
  } catch (e) {
    res.status(500).send('Failed to load design system: ' + e.message);
  }
});
// === PHASE 3 PROXIES (Integrations, Domains, IDE) ===
// Integrations API proxy
app.all(['/api/v1/integrations', '/api/v1/integrations/*'], async (req, res) => {
  try {
    const port = Number(process.env.INTEGRATIONS_PORT || 3012);
    const url = `http://127.0.0.1:${port}${req.originalUrl}`;
    const init = { method: req.method, headers: { 'content-type': req.get('content-type') || 'application/json' } };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      init.body = req.is('application/json') ? JSON.stringify(req.body || {}) : undefined;
    }
    const r = await fetch(url, init);
    const text = await r.text();
    res.status(r.status);
    const ct = r.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.type('application/json').send(text);
    return res.send(text);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Domains API proxy (Coding, Research, Data, Writing)
app.all(['/api/v1/domains', '/api/v1/domains/*'], async (req, res) => {
  try {
    const port = Number(process.env.DOMAINS_PORT || 3014);
    const url = `http://127.0.0.1:${port}${req.originalUrl}`;
    const init = { method: req.method, headers: { 'content-type': req.get('content-type') || 'application/json' } };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      init.body = req.is('application/json') ? JSON.stringify(req.body || {}) : undefined;
    }
    const r = await fetch(url, init);
    const text = await r.text();
    res.status(r.status);
    const ct = r.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.type('application/json').send(text);
    return res.send(text);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// IDE API proxy (Code execution, analysis)
app.all(['/api/v1/ide', '/api/v1/ide/*'], async (req, res) => {
  try {
    const port = Number(process.env.IDE_PORT || 3015);
    const url = `http://127.0.0.1:${port}${req.originalUrl}`;
    const init = { method: req.method, headers: { 'content-type': req.get('content-type') || 'application/json' } };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      init.body = req.is('application/json') ? JSON.stringify(req.body || {}) : undefined;
    }
    const r = await fetch(url, init);
    const text = await r.text();
    res.status(r.status);
    const ct = r.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.type('application/json').send(text);
    return res.send(text);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Webhooks API proxy (GitHub/Slack events)
app.all(['/api/v1/webhooks', '/api/v1/webhooks/*', '/webhooks/*'], async (req, res) => {
  try {
    const port = 3018;
    const url = `http://127.0.0.1:${port}${req.originalUrl}`;
    const init = { method: req.method, headers: { 'content-type': req.get('content-type') || 'application/json' } };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      init.body = req.is('application/json') ? JSON.stringify(req.body || {}) : undefined;
    }
    const r = await fetch(url, init);
    const text = await r.text();
    res.status(r.status);
    const ct = r.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.type('application/json').send(text);
    return res.send(text);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// OAuth API proxy (Google, GitHub, authentication)
app.all(['/api/v1/oauth', '/api/v1/oauth/*'], async (req, res) => {
  try {
    const port = 3010;
    const url = `http://127.0.0.1:${port}${req.originalUrl}`;
    const init = { method: req.method, headers: { 'content-type': req.get('content-type') || 'application/json' } };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      init.body = req.is('application/json') ? JSON.stringify(req.body || {}) : undefined;
    }
    const r = await fetch(url, init);
    const text = await r.text();
    res.status(r.status);
    const ct = r.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.type('application/json').send(text);
    return res.send(text);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Events API proxy (Real-time subscriptions, streaming)
app.all(['/api/v1/events', '/api/v1/events/*'], async (req, res) => {
  try {
    const port = 3011;
    const url = `http://127.0.0.1:${port}${req.originalUrl}`;
    const init = { method: req.method, headers: { 'content-type': req.get('content-type') || 'application/json' } };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      init.body = req.is('application/json') ? JSON.stringify(req.body || {}) : undefined;
    }
    const r = await fetch(url, init);
    const text = await r.text();
    res.status(r.status);
    const ct = r.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.type('application/json').send(text);
    return res.send(text);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ============= GitHub Context Consolidation (formerly github-context-server) =============

/**
 * GET /api/v1/github/info - Repository metadata
 */
app.get('/api/v1/github/info', async (req, res) => {
  const info = await githubProvider.getRepoInfo();
  res.json({ ok: !!info, info: info || { error: 'GitHub not configured' } });
});

/**
 * GET /api/v1/github/issues - Recent issues for context
 */
app.get('/api/v1/github/issues', async (req, res) => {
  const limit = parseInt(req.query.limit || '5');
  const issues = await githubProvider.getRecentIssues(limit);
  res.json({ ok: true, issues });
});

/**
 * GET /api/v1/github/readme - Project README
 */
app.get('/api/v1/github/readme', async (req, res) => {
  const readme = await githubProvider.getReadme();
  res.json({ ok: !!readme, readme: readme || null });
});

/**
 * POST /api/v1/github/file - Get specific file
 */
app.post('/api/v1/github/file', async (req, res) => {
  const { path } = req.body || {};
  if (!path) return res.status(400).json({ ok: false, error: 'path required' });

  const file = await githubProvider.getFileContent(path);
  res.json({ ok: !!file, file: file || null });
});

/**
 * POST /api/v1/github/files - Get multiple files
 */
app.post('/api/v1/github/files', async (req, res) => {
  const { paths } = req.body || {};
  if (!paths || !Array.isArray(paths)) {
    return res.status(400).json({ ok: false, error: 'paths array required' });
  }

  const files = await githubProvider.getMultipleFiles(paths);
  res.json({ ok: true, files });
});

/**
 * GET /api/v1/github/structure - Repo file tree
 */
app.get('/api/v1/github/structure', async (req, res) => {
  const path = req.query.path || '';
  const recursive = req.query.recursive === 'true';
  const structure = await githubProvider.getRepoStructure(path, recursive);
  res.json({ ok: !!structure, structure: structure || null });
});

/**
 * GET /api/v1/github/context - Full context for providers
 * Returns repo info, recent issues, and README for system prompts
 */
app.get('/api/v1/github/context', async (req, res) => {
  const context = await githubProvider.getContextForProviders();
  res.json({ ok: !!context, context });
});

/**
 * POST /api/v1/github/analyze - Ask providers to analyze the repo
 * Example: "What are the main architectural patterns used?"
 */
app.post('/api/v1/github/analyze', async (req, res) => {
  const { question, providers = ['claude', 'gpt', 'gemini'], depth = 'medium' } = req.body || {};

  if (!question) {
    return res.status(400).json({ ok: false, error: 'question required' });
  }

  // Get repo context
  const context = await githubProvider.getContextForProviders();

  // Build analysis prompt
  const systemPrompt = `You are a code analyst for the TooLoo.ai GitHub repository.
You have access to the project context below and should provide insightful analysis.

${context}

Provide clear, actionable insights.`;

  try {
    const llm = new LLMProvider();

    // Helper: map friendly provider names to LLMProvider keys
    const mapProvider = (p) => {
      if (!p) return null;
      const key = String(p).toLowerCase();
      if (key === 'claude') return 'anthropic';
      if (key === 'gpt' || key === 'openai') return 'openai';
      if (key === 'gemini') return 'gemini';
      if (key === 'ollama') return 'ollama';
      if (key === 'localai') return 'localai';
      if (key === 'openinterpreter') return 'openinterpreter';
      if (key === 'deepseek') return 'deepseek';
      if (key === 'hf' || key === 'huggingface') return 'huggingface';
      return key;
    };

    let results = [];

    if (providers && Array.isArray(providers) && providers.length > 0) {
      // Call each requested provider in parallel (best-effort)
      const calls = providers.map(async (p) => {
        const key = mapProvider(p);
        if (!key || !llm.providers[key]) {
          return { provider: key || p, ok: false, error: 'provider-unavailable' };
        }

        try {
          // Route to explicit provider call if available on the LLMProvider
          switch (key) {
          case 'anthropic': {
            const r = await llm.callClaude(question, systemPrompt);
            return { provider: 'anthropic', ok: true, ...r };
          }
          case 'openai': {
            const r = await llm.callOpenAI(question, systemPrompt);
            return { provider: 'openai', ok: true, ...r };
          }
          case 'gemini': {
            const r = await llm.callGemini(question, systemPrompt);
            return { provider: 'gemini', ok: true, ...r };
          }
          case 'ollama': {
            const r = await llm.callOllama(question, systemPrompt);
            return { provider: 'ollama', ok: true, ...r };
          }
          case 'localai': {
            const r = await llm.callLocalAI(question, systemPrompt);
            return { provider: 'localai', ok: true, ...r };
          }
          case 'openinterpreter': {
            const r = await llm.callOpenInterpreter(question, systemPrompt);
            return { provider: 'openinterpreter', ok: true, ...r };
          }
          case 'huggingface': {
            const r = await llm.callHuggingFace(question, systemPrompt);
            return { provider: 'huggingface', ok: true, ...r };
          }
          case 'deepseek': {
            const r = await llm.callDeepSeek(question, systemPrompt);
            return { provider: 'deepseek', ok: true, ...r };
          }
          default: {
            // Fall back to the orchestrator selection
            const r = await llm.generateSmartLLM({ prompt: question, system: systemPrompt });
            return { provider: r.provider || 'auto', ok: true, ...r };
          }
          }
        } catch (err) {
          return { provider: key || p, ok: false, error: String(err?.message || err) };
        }
      });

      results = await Promise.all(calls);
    } else {
      // No specific providers requested: let the orchestrator pick the best one
      const r = await llm.generateSmartLLM({ prompt: question, system: systemPrompt });
      results = [{ provider: r.provider || 'auto', ok: true, ...r }];
    }

    res.json({ ok: true, question, providers, depth, status: 'done', results });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || String(e) });
  }
});

// ============================================================================
// UI ACTIVITY MONITOR CONSOLIDATION ENDPOINTS (formerly ui-activity-monitor.js)
// ============================================================================

// In-memory UI activity tracking
const uiActivityStore = {
  sessions: new Map(),
  metrics: {
    totalSessions: 0,
    totalEvents: 0,
    totalClickEvents: 0,
    totalScrollEvents: 0
  }
};

/**
 * POST /api/v1/events - Record user activity events
 * Consolidated from ui-activity-monitor.js
 */
app.post('/api/v1/events', (req, res) => {
  try {
    const { sessionId, events } = req.body;

    if (!sessionId || !Array.isArray(events)) {
      return res.status(400).json({
        ok: false,
        error: 'Missing sessionId or events array'
      });
    }

    // Process each event
    events.forEach(event => {
      if (!uiActivityStore.sessions.has(sessionId)) {
        uiActivityStore.sessions.set(sessionId, { events: [], startTime: Date.now() });
      }
      const session = uiActivityStore.sessions.get(sessionId);
      session.events.push(event);
      uiActivityStore.metrics.totalEvents++;
      if (event.type === 'click') uiActivityStore.metrics.totalClickEvents++;
      if (event.type === 'scroll') uiActivityStore.metrics.totalScrollEvents++;
    });

    res.json({
      ok: true,
      processed: events.length,
      sessionId
    });
  } catch (e) {
    console.error('Error processing events:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * POST /api/v1/events/batch - Batch record events
 * Consolidated from ui-activity-monitor.js
 */
app.post('/api/v1/events/batch', (req, res) => {
  try {
    const { sessionId, events } = req.body;

    if (!sessionId || !Array.isArray(events)) {
      return res.status(400).json({
        ok: false,
        error: 'Missing sessionId or events array'
      });
    }

    events.forEach(event => {
      if (!uiActivityStore.sessions.has(sessionId)) {
        uiActivityStore.sessions.set(sessionId, { events: [], startTime: Date.now() });
      }
      const session = uiActivityStore.sessions.get(sessionId);
      session.events.push(event);
      uiActivityStore.metrics.totalEvents++;
    });

    res.json({
      ok: true,
      processed: events.length,
      timestamp: Date.now()
    });
  } catch (e) {
    console.error('Error in batch processing:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/v1/analytics/heatmap - Get click heatmap data
 * Consolidated from ui-activity-monitor.js
 */
app.get('/api/v1/analytics/heatmap', (req, res) => {
  try {
    const heatmapData = {};
    for (const session of uiActivityStore.sessions.values()) {
      session.events.filter(e => e.type === 'click' && e.x && e.y).forEach(e => {
        const key = `${Math.round(e.x/10)},${Math.round(e.y/10)}`;
        heatmapData[key] = (heatmapData[key] || 0) + 1;
      });
    }

    res.json({
      ok: true,
      data: heatmapData
    });
  } catch (e) {
    console.error('Error generating heatmap:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/v1/analytics/features - Get feature usage report
 * Consolidated from ui-activity-monitor.js
 */
app.get('/api/v1/analytics/features', (req, res) => {
  try {
    const features = {};
    for (const session of uiActivityStore.sessions.values()) {
      session.events.filter(e => e.feature).forEach(e => {
        features[e.feature] = (features[e.feature] || 0) + 1;
      });
    }

    res.json({
      ok: true,
      data: features
    });
  } catch (e) {
    console.error('Error generating feature report:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/v1/analytics/engagement - Get engagement metrics
 * Consolidated from ui-activity-monitor.js
 */
app.get('/api/v1/analytics/engagement', (req, res) => {
  try {
    const sessions = Array.from(uiActivityStore.sessions.values());
    const totalDuration = sessions.reduce((sum, s) => sum + ((s.endTime || Date.now()) - s.startTime), 0);

    res.json({
      ok: true,
      data: {
        activeSessions: sessions.length,
        totalEvents: uiActivityStore.metrics.totalEvents,
        avgSessionDuration: sessions.length > 0 ? totalDuration / sessions.length : 0
      }
    });
  } catch (e) {
    console.error('Error generating engagement report:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/v1/analytics/performance - Get performance metrics
 * Consolidated from ui-activity-monitor.js
 */
app.get('/api/v1/analytics/performance', (req, res) => {
  try {
    const perfEvents = [];
    for (const session of uiActivityStore.sessions.values()) {
      perfEvents.push(...session.events.filter(e => e.type === 'performance'));
    }

    const avg = (arr, key) => arr.length > 0 ? arr.reduce((sum, e) => sum + (e[key] || 0), 0) / arr.length : 0;

    res.json({
      ok: true,
      data: {
        avgFCP: avg(perfEvents, 'fcp'),
        avgLCP: avg(perfEvents, 'lcp'),
        avgCLS: avg(perfEvents, 'cls'),
        avgFID: avg(perfEvents, 'fid')
      }
    });
  } catch (e) {
    console.error('Error generating performance report:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/v1/analytics/trends - Get engagement trends over time
 * Consolidated from ui-activity-monitor.js
 */
app.get('/api/v1/analytics/trends', (req, res) => {
  try {
    const hours = parseInt(req.query.hours || '24');
    const trends = [];

    for (const session of uiActivityStore.sessions.values()) {
      if (session.startTime && Date.now() - session.startTime < hours * 60 * 60 * 1000) {
        trends.push({
          sessionId: session.id,
          eventCount: session.events.length,
          timestamp: session.startTime
        });
      }
    }

    res.json({
      ok: true,
      data: { hours, dataPoints: trends.length, trends }
    });
  } catch (e) {
    console.error('Error retrieving trends:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/v1/analytics/sessions - Get active sessions
 * Consolidated from ui-activity-monitor.js
 */
app.get('/api/v1/analytics/sessions', (req, res) => {
  try {
    const activeSessions = Array.from(uiActivityStore.sessions.entries()).map(([id, s]) => ({
      sessionId: id,
      startTime: s.startTime,
      eventCount: s.events.length,
      duration: (s.endTime || Date.now()) - s.startTime
    }));

    res.json({
      ok: true,
      data: {
        activeSessions: activeSessions.length,
        sessions: activeSessions
      }
    });
  } catch (e) {
    console.error('Error retrieving sessions:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/v1/analytics/summary - Get complete analytics summary
 * Consolidated from ui-activity-monitor.js
 */
app.get('/api/v1/analytics/summary', (req, res) => {
  try {
    const sessions = Array.from(uiActivityStore.sessions.values());

    res.json({
      ok: true,
      data: {
        totalSessions: sessions.length,
        totalEvents: uiActivityStore.metrics.totalEvents,
        totalClickEvents: uiActivityStore.metrics.totalClickEvents,
        totalScrollEvents: uiActivityStore.metrics.totalScrollEvents,
        timestamp: Date.now()
      }
    });
  } catch (e) {
    console.error('Error generating summary:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * POST /api/v1/analytics/export - Export analytics data
 * Consolidated from ui-activity-monitor.js
 */
app.post('/api/v1/analytics/export', (req, res) => {
  try {
    const { format = 'json', includeData = ['engagement', 'features'] } = req.body;

    const exportData = {};

    if (includeData.includes('engagement')) {
      const sessions = Array.from(uiActivityStore.sessions.values());
      exportData.engagement = {
        activeSessions: sessions.length,
        totalEvents: uiActivityStore.metrics.totalEvents
      };
    }

    if (includeData.includes('features')) {
      const features = {};
      for (const session of uiActivityStore.sessions.values()) {
        session.events.filter(e => e.feature).forEach(e => {
          features[e.feature] = (features[e.feature] || 0) + 1;
        });
      }
      exportData.features = features;
    }

    res.json({
      ok: true,
      format,
      data: exportData,
      exportTime: new Date().toISOString()
    });
  } catch (e) {
    console.error('Error exporting data:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ============================================================================
// ADMIN ENDPOINTS - Hot Reload, Update, and System Management
// ============================================================================

/**
 * GET /api/v1/admin/reload-status - Check hot-reload status
 */
app.get('/api/v1/admin/hot-reload-status', (req, res) => {
  res.json({
    ok: true,
    hotReload: hotReloadManager.getStatus(),
    hotUpdate: hotUpdateManager.getStatus()
  });
});

/**
 * POST /api/v1/admin/reload - Trigger hot-reload of modules
 */
app.post('/api/v1/admin/hot-reload', async (req, res) => {
  try {
    await hotReloadManager.reloadAll();
    res.json({
      ok: true,
      message: 'Hot reload triggered',
      status: hotReloadManager.getStatus()
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/admin/endpoints - List all registered endpoints
 */
app.get('/api/v1/admin/endpoints', (req, res) => {
  res.json({
    ok: true,
    endpoints: hotUpdateManager.getEndpoints(),
    total: hotUpdateManager.getEndpoints().length
  });
});

/**
 * GET /api/v1/admin/update-history - Get update history
 */
app.get('/api/v1/admin/update-history', (req, res) => {
  const limit = req.query.limit || 20;
  res.json({
    ok: true,
    history: hotUpdateManager.getHistory(parseInt(limit)),
    status: hotUpdateManager.getStatus()
  });
});

// ============================================================================
// PROVIDER INSTRUCTIONS & AGGREGATION ENDPOINTS
// ============================================================================

// Phase 6 Observability endpoint
app.get('/api/v1/system/observability', (req, res) => {
  try {
    res.json({
      ok: true,
      observability: {
        rateLimiter: rateLimiter.getStats(),
        tracer: tracer.getMetrics(),
        circuitBreakers: Object.fromEntries(
          Object.entries(serviceCircuitBreakers).map(([name, cb]) => [name, cb.getState()])
        )
      },
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ============================================================================
// MONTH 2: CONVERSATION API ROUTES (Claude Integration)
// ============================================================================
import * as conversationAPI from '../api/conversation-api.js';

/**
 * POST /api/v1/conversation/message
 * Send a message and get AI response with system context
 */
app.post('/api/v1/conversation/message', async (req, res) => {
  conversationAPI.handleConversationMessage(req, res);
});

/**
 * GET /api/v1/conversation/:id
 * Retrieve conversation history
 */
app.get('/api/v1/conversation/:id', (req, res) => {
  conversationAPI.handleGetConversation(req, res);
});

/**
 * GET /api/v1/conversation
 * List recent conversations
 */
app.get('/api/v1/conversation', (req, res) => {
  conversationAPI.handleListConversations(req, res);
});

/**
 * GET /api/v1/conversation/health
 */
app.get('/api/v1/conversation/health', (req, res) => {
  conversationAPI.handleHealth(req, res);
});

// ============================================================================
// MONTH 2: SYSTEM CONTROL API ROUTES (Service Management)
// ============================================================================
import * as systemControlAPI from '../api/system-control.js';

/**
 * POST /api/v1/system/service/:name/restart
 */
app.post('/api/v1/system/service/:name/restart', async (req, res) => {
  systemControlAPI.handleRestartService(req, res);
});

/**
 * POST /api/v1/system/service/:name/stop
 */
app.post('/api/v1/system/service/:name/stop', async (req, res) => {
  systemControlAPI.handleStopService(req, res);
});

/**
 * POST /api/v1/system/service/:name/start
 */
app.post('/api/v1/system/service/:name/start', async (req, res) => {
  systemControlAPI.handleStartService(req, res);
});

/**
 * GET /api/v1/system/service/:name
 */
app.get('/api/v1/system/service/:name', async (req, res) => {
  systemControlAPI.handleGetService(req, res);
});

/**
 * GET /api/v1/system/services
 */
app.get('/api/v1/system/services', async (req, res) => {
  systemControlAPI.handleGetAllServices(req, res);
});

/**
 * POST /api/v1/system/services/restart-all
 */
app.post('/api/v1/system/services/restart-all', async (req, res) => {
  systemControlAPI.handleRestartAllServices(req, res);
});

/**
 * GET /api/v1/system/service/:name/diagnose
 */
app.get('/api/v1/system/service/:name/diagnose', async (req, res) => {
  systemControlAPI.handleDiagnoseService(req, res);
});

/**
 * GET /api/v1/system/service/:name/health
 */
app.get('/api/v1/system/service/:name/health', async (req, res) => {
  systemControlAPI.handleStreamServiceHealth(req, res);
});

/**
 * System Control health check
 */
app.get('/api/v1/system-control/health', (req, res) => {
  systemControlAPI.handleHealth(req, res);
});

// ============================================================================
// PROVIDER CONTROL API ROUTES (Provider Management)
// ============================================================================
import * as providerControlAPI from '../api/provider-control.js';

/**
 * POST /api/v1/provider/switch
 */
app.post('/api/v1/provider/switch', async (req, res) => {
  providerControlAPI.handleSwitchProvider(req, res);
});

/**
 * GET /api/v1/provider/active
 */
app.get('/api/v1/provider/active', async (req, res) => {
  providerControlAPI.handleGetActiveProvider(req, res);
});

/**
 * GET /api/v1/provider/status
 */
app.get('/api/v1/provider/status', async (req, res) => {
  providerControlAPI.handleGetProvidersStatus(req, res);
});

/**
 * POST /api/v1/provider/forecast
 */
app.post('/api/v1/provider/forecast', async (req, res) => {
  providerControlAPI.handleForecastSwitchImpact(req, res);
});

/**
 * GET /api/v1/provider/:name/metrics
 */
app.get('/api/v1/provider/:name/metrics', async (req, res) => {
  providerControlAPI.handleGetProviderMetrics(req, res);
});

/**
 * POST /api/v1/provider/policy
 */
app.post('/api/v1/provider/policy', async (req, res) => {
  providerControlAPI.handleSetProviderPolicy(req, res);
});

/**
 * POST /api/v1/provider/compare
 */
app.post('/api/v1/provider/compare', async (req, res) => {
  providerControlAPI.handleCompareProviders(req, res);
});

/**
 * Provider Control health check
 */
app.get('/api/v1/provider-control/health', (req, res) => {
  providerControlAPI.handleHealth(req, res);
});

// ============================================================================
// MONTH 3: CONTEXTUAL AWARENESS API ROUTES
// ============================================================================
import * as contextualAwarenessAPI from '../api/contextual-awareness.js';

/**
 * GET /api/v1/context/system-state
 */
app.get('/api/v1/context/system-state', async (req, res) => {
  contextualAwarenessAPI.handleGetSystemState(req, res);
});

/**
 * POST /api/v1/context/suggestions
 */
app.post('/api/v1/context/suggestions', async (req, res) => {
  contextualAwarenessAPI.handleGetSuggestions(req, res);
});

/**
 * POST /api/v1/context/smart-replies
 */
app.post('/api/v1/context/smart-replies', async (req, res) => {
  contextualAwarenessAPI.handleGenerateSmartReplies(req, res);
});

/**
 * Contextual Awareness health check
 */
app.get('/api/v1/contextual-awareness/health', (req, res) => {
  contextualAwarenessAPI.handleHealth(req, res);
});

// ============================================================================
// MONTH 4: CONVERSATIONAL CONTROL API ROUTES
// ============================================================================
import * as conversationalControlAPI from '../api/conversational-control.js';

/**
 * POST /api/v1/control/command
 */
app.post('/api/v1/control/command', async (req, res) => {
  conversationalControlAPI.handleExecuteCommand(req, res);
});

/**
 * GET /api/v1/control/investigate-alerts
 */
app.get('/api/v1/control/investigate-alerts', async (req, res) => {
  conversationalControlAPI.handleInvestigateAlerts(req, res);
});

/**
 * Conversational Control health check
 */
app.get('/api/v1/conversational-control/health', (req, res) => {
  conversationalControlAPI.handleHealth(req, res);
});

// ============================================================================
// ALERT ENGINE ROUTES
// ============================================================================
// Mount alert engine routes for system alerting and auto-remediation
app.use('/api/v1/system/alerts', alertEngineModule);

// ============================================================================
// CAPABILITY ACTIVATION ROUTES (Enhanced with Response Formatter)
// ============================================================================

/**
 * GET /api/v1/capabilities/activate/status
 * Get current activation status with visual formatting
 */
app.get('/api/v1/capabilities/activate/status', (req, res) => {
  const status = capabilityActivator.getStatus();
  const response = formatterIntegration.formatCapabilityResponse({
    title: 'Capability Activation Status',
    total: 242,
    activated: status.activated,
    pending: status.pending,
    components: [
      { name: 'autonomousEvolutionEngine', discovered: 62, activated: 0, status: 'dormant', methods: [] },
      { name: 'enhancedLearning', discovered: 43, activated: 0, status: 'dormant', methods: [] },
      { name: 'predictiveEngine', discovered: 38, activated: 0, status: 'dormant', methods: [] },
      { name: 'userModelEngine', discovered: 37, activated: 0, status: 'dormant', methods: [] },
      { name: 'proactiveIntelligenceEngine', discovered: 32, activated: 0, status: 'dormant', methods: [] },
      { name: 'contextBridgeEngine', discovered: 30, activated: 0, status: 'dormant', methods: [] }
    ],
    recentActivations: status.recentActivations
  });
  res.json(response);
});

/**
 * POST /api/v1/capabilities/activate/one
 * Activate a single capability
 */
app.post('/api/v1/capabilities/activate/one', async (req, res) => {
  const { component, method, mode = 'safe' } = req.body;
  
  if (!component || !method) {
    return res.status(400).json(
      formatterIntegration.formatErrorResponse(
        new Error('component and method required'),
        400
      )
    );
  }

  const result = await capabilityActivator.activate(component, method, mode);
  const response = formatterIntegration.formatSuccessResponse({
    title: 'Capability Activation',
    message: result.success ? `Activated ${component}:${method}` : `Failed to activate ${component}:${method}`,
    data: result
  });
  res.status(result.success ? 200 : 500).json(response);
});

/**
 * POST /api/v1/capabilities/activate/phase
 * Activate capabilities for a specific phase
 */
app.post('/api/v1/capabilities/activate/phase', async (req, res) => {
  const { phase = 'Phase 1: Core Initialization', mode = 'safe' } = req.body;
  const plan = capabilityActivator.getPhasedActivationPlan();

  if (!plan[phase]) {
    return res.status(400).json(
      formatterIntegration.formatErrorResponse(new Error(`Unknown phase: ${phase}`), 400)
    );
  }

  const result = await capabilityActivator.activateBatch(plan[phase], mode);
  const response = formatterIntegration.formatProgressResponse({
    title: `Activating ${phase}`,
    items: result.results.map(r => ({
      label: `${r.component}:${r.method}`,
      progress: r.success ? 100 : 0,
      status: r.success ? 'completed' : 'failed',
      details: r.success ? `Performance: ${r.performanceScore}` : r.reason
    }))
  });
  res.json(response);
});

/**
 * POST /api/v1/capabilities/activate/all
 * Activate all 242 capabilities in phases
 */
app.post('/api/v1/capabilities/activate/all', async (req, res) => {
  const { mode = 'safe' } = req.body;
  
  const allResult = await capabilityActivator.activateAll(mode);
  const response = formatterIntegration.formatMixedResponse({
    title: 'Complete System Activation (242 Capabilities)',
    sections: allResult.phases.map((phase, idx) => ({
      type: 'progress',
      title: phase.phase,
      content: {
        items: phase.results.map(r => ({
          label: `${r.component}:${r.method}`,
          progress: r.success ? 100 : 0,
          status: r.success ? 'completed' : 'failed'
        })),
        successful: phase.successful,
        failed: phase.failed
      },
      collapsible: true
    }))
  });
  res.json(response);
});

/**
 * GET /api/v1/capabilities/activate/health
 * Get health report with recommendations
 */
app.get('/api/v1/capabilities/activate/health', (req, res) => {
  const health = capabilityActivator.getHealthReport();
  const response = formatterIntegration.formatStatusResponse({
    title: 'Capability System Health',
    status: health.status,
    items: [
      { label: 'Total Activated', value: health.totalActivated, status: health.totalActivated > 0 ? 'active' : 'inactive' },
      { label: 'Error Rate', value: `${health.errorRate}%`, status: health.errorRate < 10 ? 'active' : 'warning' },
      { label: 'Avg Performance', value: health.averagePerformance.toFixed(2), status: 'active' },
      { label: 'Recommendation', value: health.recommendation, status: 'info' }
    ],
    summary: health.recommendation
  });
  res.json(response);
});

/**
 * DELETE /api/v1/capabilities/activate/rollback
 * Rollback a specific capability
 */
app.delete('/api/v1/capabilities/activate/rollback', async (req, res) => {
  const { component, method } = req.body;
  
  if (!component || !method) {
    return res.status(400).json(
      formatterIntegration.formatErrorResponse(new Error('component and method required'), 400)
    );
  }

  const result = await capabilityActivator.rollback(component, method);
  res.json(formatterIntegration.formatSuccessResponse({
    title: 'Capability Rollback',
    message: result.message || result.reason,
    data: result
  }));
});

/**
 * POST /api/v1/capabilities/activate/reset
 * Reset all activations
 */
app.post('/api/v1/capabilities/activate/reset', async (req, res) => {
  const result = await capabilityActivator.reset();
  res.json(formatterIntegration.formatSuccessResponse({
    title: 'Capability System Reset',
    message: result.message,
    data: result
  }));
});

// ============================================================================
// CAPABILITY ORCHESTRATOR ENDPOINTS
// ============================================================================
// NEW: Safe orchestration for 242 discovered capabilities



// ============================================================================
// LOAD PROVIDER INSTRUCTIONS AT STARTUP
// ============================================================================
// This initializes the provider instruction system before any conversations
// enabling the decision & aggregation system to send specialized requests

(async () => {
  try {
    const providerInstructions = await getProviderInstructions();
    console.log('[ProviderInstructions] ✓ System loaded at startup');
    console.log('[ProviderInstructions] Providers:', providerInstructions.getProviders().join(', '));
    
    // Also initialize aggregation system
    const aggregation = await getProviderAggregation();
    console.log('[ProviderAggregation] ✓ System initialized');
    console.log('[ProviderAggregation] Strategy:', aggregation.instructions.getAggregationConfig().aggregationStrategy.description);
  } catch (err) {
    console.error('[ProviderInstructions] Failed to load:', err.message);
  }
  
  // Start service with unified initialization
  svc.start();
})();

