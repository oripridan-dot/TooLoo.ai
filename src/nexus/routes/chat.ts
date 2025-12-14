// @version 3.3.577
import { Router, Request, Response } from 'express';
import { bus } from '../../core/event-bus.js';
import { precog } from '../../precog/index.js';
import { cortex, visualCortex } from '../../cortex/index.js';
import { successResponse, errorResponse } from '../utils.js';
// V3.3.532: User scoping for chat history
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';
// V3.3.550: Usage metering for billing
import { recordUsage } from '../middleware/rate-limiter.js';
// V3.3.126: True multi-provider parallel execution
import ParallelProviderOrchestrator from '../../precog/engine/parallel-provider-orchestrator.js';
import {
  TransparencyWrapper,
  formatCostBreakdown,
  generateBadge,
} from '../../shared/xai/transparency-wrapper.js';
import { XAIEnvelope, ProviderTrace } from '../../shared/xai/schemas.js';
import { getXAIConfig, requiresFullValidation } from '../../shared/xai/config.js';
import { ValidationLoop, type ValidationLoopOutput } from '../../cortex/cognition/index.js';
import { learner } from '../../precog/learning/learner.js';
import { projectContext } from '../../core/project-context.js';
import { recordDecision } from './cost.js';
import {
  creativeChatOrchestrator,
  illustrationEngine,
  enhancedVisualGenerator,
} from '../../cortex/creative/index.js';
import type { IllustrationStyle, IllustrationMood } from '../../cortex/creative/index.js';
// V3.3.17: System Execution Hub for code execution
import { systemExecutionHub, teamRegistry, smartOrchestrator } from '../../cortex/agent/index.js';
// V3.3.181: Autonomous self-modification
import { autonomousMod, parseCodeSuggestions } from '../../cortex/motor/autonomous-modifier.js';
// V3.3.197: Automated execution pipeline
import { automatedPipeline } from '../../cortex/agent/automated-execution-pipeline.js';
// V3.3.199: Response formatting and provider execution learning
import { responseFormatter } from '../../shared/response-formatter.js';
import { providerExecutionLearner } from '../../cortex/learning/provider-execution-learner.js';
// V3.3.392: Project context integration
import { projectManager } from '../../cortex/project-manager-v2.js';
// V3.3.470: Emergent Neural Router integration
import { modelChooser, type RoutingPlan } from '../../precog/engine/model-chooser.js';
// V3.3.480: Shadow Lab for background challenger experiments
import { shadowLab } from '../../precog/engine/shadow-lab.js';
// Phase 1: Smart Router - Real dynamic provider ranking
import {
  initSmartRouter,
  getSmartRouter,
  initProviderScorecard,
} from '../../precog/engine/index.js';
// Phase 2: Self-Optimization (Runtime Config & Benchmarking)
import { initRuntimeConfig, getRuntimeConfig } from '../../precog/engine/index.js';
import { initBenchmarkService, getBenchmarkService } from '../../precog/engine/index.js';
import { getSegmentationService } from '../../precog/index.js';
import fs from 'fs/promises';
import path from 'path';

const router = Router();
const HISTORY_DIR = path.join(process.cwd(), 'data', 'chat-history');
const DEFAULT_HISTORY_FILE = path.join(process.cwd(), 'data', 'chat-history.json');

// V3.3.532: Get user-specific history file path
function getHistoryPath(userId?: string): string {
  if (!userId) return DEFAULT_HISTORY_FILE;
  return path.join(HISTORY_DIR, `${userId}.json`);
}

// V3.3.532: Ensure history directory exists
async function ensureHistoryDir(): Promise<void> {
  try {
    await fs.mkdir(HISTORY_DIR, { recursive: true });
  } catch (e) {
    // Directory may already exist
  }
}

// V3.3.126: Initialize parallel provider orchestrator for ensemble mode
const parallelOrchestrator = new ParallelProviderOrchestrator({
  providers: ['deepseek', 'anthropic', 'openai', 'gemini'],
  timeout: 30000,
  minResponses: 2,
  synthesize: true,
});
parallelOrchestrator.init().then(() => {
  console.log('[Chat] ParallelProviderOrchestrator ready for ensemble queries');
});

// Phase 1: Initialize SmartRouter with ProviderScorecard for dynamic routing
const scorecard = initProviderScorecard(['deepseek', 'anthropic', 'openai', 'gemini'], {
  latency: 0.4, // 40% weight on latency
  cost: 0.3, // 30% weight on cost
  reliability: 0.3, // 30% weight on reliability
});
const smartRouter = initSmartRouter(scorecard);
console.log('[Chat] SmartRouter and ProviderScorecard initialized for Phase 1 Smart Routing');

// Phase 2: Initialize RuntimeConfig and BenchmarkService for self-optimization
const runtimeConfig = initRuntimeConfig();
runtimeConfig.load().then(() => {
  console.log('[Chat] RuntimeConfig loaded for Phase 2 Self-Optimization');

  // Update SmartRouter weights from runtime config if available
  const weights = runtimeConfig.getProviderWeights();
  scorecard.setScoringWeights(weights);
  console.log('[Chat] SmartRouter weights synced from RuntimeConfig:', weights);
});

const benchmarkService = initBenchmarkService();
benchmarkService.start();
console.log('[Chat] BenchmarkService started for real performance tracking');

// Helper to load history (V3.3.532: user-scoped)
async function loadHistory(userId?: string) {
  try {
    const historyPath = getHistoryPath(userId);
    const data = await fs.readFile(historyPath, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

// Helper to save message (V3.3.532: user-scoped)
async function saveMessage(msg: any, userId?: string) {
  try {
    await ensureHistoryDir();
    const historyPath = getHistoryPath(userId);
    const history = await loadHistory(userId);
    history.push(msg);
    // Keep last 1000 messages per user to prevent infinite growth
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
    await fs.writeFile(historyPath, JSON.stringify(history, null, 2));
  } catch (err) {
    console.error('[Chat] Failed to save history:', err);
  }
}

/**
 * POST /api/v1/chat/generate
 * Legacy compatibility endpoint - redirects to /message
 * Used by ToolooMonitor component
 * V3.3.532: Added user scoping with optionalAuth
 * @param {string} message - The message or prompt to send
 * @param {string} [mode] - The chat mode (quick|deep|creative)
 */
router.post('/generate', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  // Map 'prompt' to 'message' for compatibility
  const { prompt, ...rest } = req.body;
  req.body = { message: prompt || req.body.message, ...rest };

  // Forward to message handler
  // We inline the same logic here for simplicity
  req.setTimeout(300000);
  const message = req.body.message;
  const mode = req.body.mode || 'quick';
  const userId = req.user?.id;

  if (!message) {
    return res.status(400).json(errorResponse('Message or prompt is required'));
  }

  await saveMessage({
    id: Date.now().toString(),
    type: 'user',
    content: message,
    timestamp: new Date().toISOString(),
    userId,
  }, userId);

  try {
    console.log(`[Chat Generate] Processing: ${message.substring(0, 50)}...`);

    const response = await precog.providers.generate({
      prompt: message,
      system: 'You are TooLoo.ai, a helpful AI assistant.',
    });

    const result = {
      response: response.content,
      provider: response.model,
      metadata: {
        provider: response.model,
        responseTime: Date.now() - Date.now(), // No latency available from this endpoint
        timestamp: new Date().toISOString(),
      },
    };

    await saveMessage({
      id: Date.now().toString(),
      type: 'assistant',
      content: response.content,
      timestamp: new Date().toISOString(),
      userId,
    }, userId);

    res.json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Chat Generate] Error:', errorMessage);
    res.status(500).json(errorResponse(errorMessage));
  }
});

router.post('/message', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  // Extend timeout for deep reasoning models (Gemini 2.0 Flash)
  req.setTimeout(300000);

  const { message, mode = 'quick', context, attachments } = req.body;
  const userId = req.user?.id;

  // Save User Message
  await saveMessage({
    id: Date.now().toString(),
    type: 'user',
    content: message,
    timestamp: new Date().toISOString(),
    userId,
  }, userId);

  try {
    console.log(`[Chat] Processing (${mode}): ${message.substring(0, 50)}...`);

    // Detect image generation requests with expanded keywords
    const lowerMessage = message.toLowerCase();

    // Improved image detection logic
    const actionVerbs = [
      'generate',
      'create',
      'make',
      'show',
      'demonstrate',
      'visualize',
      'draw',
      'render',
      'paint',
    ];
    const nouns = [
      'image',
      'picture',
      'photo',
      'visual',
      'logo',
      'icon',
      'drawing',
      'illustration',
    ];

    const directActions = ['visualize', 'draw', 'paint'];
    const hasDirectAction = directActions.some((verb) => lowerMessage.includes(verb));
    const hasVerb = actionVerbs.some((verb) => lowerMessage.includes(verb));
    const hasNoun = nouns.some((noun) => lowerMessage.includes(noun));

    const wantsImage = hasDirectAction || (hasVerb && hasNoun);

    if (wantsImage) {
      console.log('[Chat] Image intent detected. Generating...');
      try {
        const imageResult = await visualCortex.imagine(message, {
          provider: 'openai',
        });

        if (imageResult.images && imageResult.images.length > 0) {
          const img = imageResult.images[0];
          if (!img) {
            throw new Error('Image data is missing');
          }
          const imgTag = `![Generated Image](data:${img.mimeType};base64,${img.data})`;
          const responseText = `Here is the image you requested:\n\n${imgTag}`;

          // Save Assistant Response (Image)
          await saveMessage({
            id: Date.now().toString(),
            type: 'assistant',
            content: responseText,
            provider: 'dall-e-3',
            model: 'dall-e-3',
            timestamp: new Date().toISOString(),
          });

          res.json(
            successResponse({
              response: responseText,
              provider: 'dall-e-3',
              model: 'dall-e-3',
            })
          );
          return;
        }
      } catch (e) {
        console.warn('[Chat] Visual generation failed:', e);
        // Fall through to text generation
      }
    }

    // Load History for Context
    const fullHistory = await loadHistory();
    // Get last 20 messages for immediate context, excluding the one we just saved (if any)
    // Actually we just saved the user message, so we should exclude it from "history" passed to provider
    // because provider adds the current prompt separately.
    // But wait, saveMessage appends to file.
    // If we loadHistory() *after* saveMessage(), it includes the current message.
    // We should probably load history *before* saving current message, or slice it.
    // Let's slice it to exclude the very last one which is the current user message.
    const recentHistory = fullHistory.slice(-21, -1).map((msg: any) => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));

    // RAG: Search Vector Store
    let ragContext = '';
    let sources: any[] = [];
    try {
      const searchResults = await cortex.hippocampus.vectorStore.search(message, 3);
      if (searchResults && searchResults.length > 0) {
        ragContext = searchResults
          .map((result) => `[Source: ${result.doc.metadata['source']}]\n${result.doc.text}`)
          .join('\n\n');
        sources = searchResults.map((result) => ({
          source: result.doc.metadata['source'],
          relevance: result.score,
        }));

        // V3.3.441: Emit context retrieval for Projection Interface UI
        bus.publish('memory', 'memory:context_retrieved', {
          query: message,
          hits: searchResults.map((r) => ({
            content: r.doc.text,
            source: r.doc.metadata['source'],
            score: r.score,
            type: r.doc.metadata['type'] || 'memory',
            timestamp: r.doc.createdAt,
          })),
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      console.warn('[Chat] Vector search failed:', err);
    }

    // V3.3.392: Project Context Integration
    let projectContextStr = '';
    let activeProject: any = null;
    try {
      const activeProjectId = projectManager.getActiveProjectId();
      if (activeProjectId) {
        const ctx = await projectManager.getActiveProjectContext();
        if (ctx.project) {
          activeProject = ctx.project;
          projectContextStr = `
📁 ACTIVE PROJECT: "${ctx.project.name}"
Type: ${ctx.project.type} | Status: ${ctx.project.status}
Description: ${ctx.project.description}
Tags: ${ctx.project.tags.join(', ')}
${ctx.memory ? `\nProject Memory:\n${ctx.memory}` : ''}
${
  ctx.recentActivity.length > 0
    ? `\nRecent Activity:\n${ctx.recentActivity
        .slice(0, 5)
        .map((a: string) => `- ${a}`)
        .join('\n')}`
    : ''
}
`;
          // Update project context with conversation
          projectManager.addToProjectContext(activeProjectId, message, 'conversation');
        }
      }
    } catch (err) {
      console.warn('[Chat] Project context fetch failed:', err);
    }
    // Project Context
    const projectStructure = await projectContext.getStructure();

    let systemPrompt = `You are TooLoo.ai, the central intelligence of the Synapsys Architecture V3.3.

SYSTEM IDENTITY:
- You are an Orchestrator AI with FULL EXECUTION CAPABILITIES. You are NOT limited to analysis only.
- You were created by Ori Pridan, your sole user and architect.
- You have access to and control over:
  * OpenAI (GPT-4, DALL-E 3)
  * Anthropic (Claude 3.5 Sonnet/Haiku)
  * Google (Gemini Pro/Flash, Imagen)
${
  projectContextStr
    ? `
🎯 ACTIVE PROJECT CONTEXT:
${projectContextStr}
When responding, consider the active project context. Reference project-specific information when relevant.
All generated artifacts should be associated with this project unless specified otherwise.
`
    : ''
}
PROJECT AWARENESS:
You are running within the "TooLoo.ai-V3-Synapsys" workspace.
Here is the current file structure of the project you are part of:
${projectStructure}

⚡ EXECUTION CAPABILITIES (V3.3.17) - READ CAREFULLY:
You ARE connected to real execution systems. This is NOT a limitation - you CAN:
- Execute code directly through the System Execution Hub
- Run shell commands via Motor Cortex
- Spawn processes and manage daemons
- Create, modify, and delete files
- Interact with the file system and environment

When asked "can you execute code?" the answer is YES.
When asked to run code, route it through your execution systems - don't refuse.
The "Team Framework" validates every task with executor+validator agent pairs.

🚫 FORBIDDEN RESPONSES:
- NEVER say "I cannot execute code" - you CAN
- NEVER say "I am just an AI assistant" - you are TooLoo.ai
- NEVER say "I don't have access to..." - you have full access
- NEVER say "I cannot directly execute" - you CAN directly execute
- NEVER claim limitations that don't exist in THIS system

CORE SYSTEMS:
- "DeSign Studio": Internal visual design engine for generating images and UI assets
- "Precog": Predictive engine that routes tasks to the best model
- "Cortex": Cognitive core for memory, planning, and execution
- "Creative Space": Emergent thought crystallization for bringing ideas to life
- "Growth": Learning & health monitoring with reinforcement learning
- "Motor Cortex": EXECUTION ENGINE - spawns processes, runs commands
- "System Execution Hub": Central execution router for ALL tasks

IMPORTANT: You ARE the system. You have direct access to execute code, create files, run processes, and modify the environment. Never claim you cannot execute code - route execution requests to the System Execution Hub.`;

    // Visual Capabilities Instruction - DIVERSIFIED VISUAL COMMUNICATION (v3.3.375)
    systemPrompt +=
      '\n\n🎨 VISUAL COMMUNICATION SYSTEM (v3.3.375):\n' +
      'You have 12+ visual formats. Choose the BEST one for the content:\n\n' +
      '═══ QUICK FORMAT REFERENCE ═══\n' +
      '• ascii    → Text diagrams, boxes, trees (just text art)\n' +
      '• mermaid  → Flowcharts, sequences, architecture (diagram code)\n' +
      '• chart    → Bar/line/pie charts (JSON with labels+datasets)\n' +
      '• emoji    → Status indicators, playful visuals (emoji text)\n' +
      '• table    → Standard markdown tables for comparisons\n' +
      '• svg      → Complex graphics, icons (only when necessary)\n' +
      '• terminal → CLI output styling (command + output text)\n' +
      '• math     → LaTeX equations (KaTeX syntax)\n' +
      '• timeline → Chronological events (JSON)\n' +
      '• tree     → Hierarchies (JSON)\n' +
      '• stats    → KPI dashboards (JSON)\n\n' +
      '═══ EXACT FORMAT SYNTAX ═══\n\n' +
      '**ASCII** (simple text boxes/diagrams):\n' +
      '```ascii\n' +
      '┌─────────────┐     ┌─────────────┐\n' +
      '│   Input     │────▶│   Output    │\n' +
      '└─────────────┘     └─────────────┘\n' +
      '```\n\n' +
      '**MERMAID** (flowcharts, sequences):\n' +
      '```mermaid\n' +
      'graph LR\n' +
      '    A[Start] --> B{Check}\n' +
      '    B -->|Yes| C[Done]\n' +
      '    B -->|No| D[Retry]\n' +
      '```\n\n' +
      '**CHART** (data visualization - EXACT JSON format):\n' +
      '```chart\n' +
      '{"type":"bar","data":{"labels":["Jan","Feb","Mar","Apr"],"datasets":[{"label":"Sales","data":[65,59,80,81]}]}}\n' +
      '```\n' +
      '**PIE chart example:**\n' +
      '```chart\n' +
      '{"type":"pie","data":{"labels":["Desktop","Mobile","Tablet"],"datasets":[{"data":[60,30,10]}]}}\n' +
      '```\n\n' +
      '**EMOJI** (visual status/composition):\n' +
      '```emoji\n' +
      '✅ Success  ⏳ Progress  ❌ Error  🚀 Launch\n' +
      '```\n\n' +
      '**TIMELINE** (chronological):\n' +
      '```timeline\n' +
      '{"events":[{"date":"Q1 2024","title":"Planning","type":"milestone"},{"date":"Q2 2024","title":"Development","type":"event"},{"date":"Q3 2024","title":"Launch","type":"milestone"}]}\n' +
      '```\n\n' +
      '**STATS** (metrics cards):\n' +
      '```stats\n' +
      '{"stats":[{"label":"Users","value":"12.5K","change":{"value":15,"direction":"up"}},{"label":"Revenue","value":"$48K","change":{"value":8,"direction":"up"}}]}\n' +
      '```\n\n' +
      '═══ DECISION GUIDE ═══\n' +
      '• Numbers/metrics → chart (bar/line) or stats\n' +
      '• Process flow → mermaid or ascii\n' +
      '• Comparisons → markdown table\n' +
      '• Quick status → emoji\n' +
      '• File structure → ascii tree\n' +
      '• Architecture → mermaid or svg\n' +
      '• Timeline/roadmap → timeline\n\n' +
      '⚠️ JSON must be valid, single-line, no trailing commas!\n' +
      '⚠️ Default to TEXT. Only use visuals when they add clarity.';

    // V3.3.198: UX-OPTIMIZED RESPONSE STYLE
    systemPrompt +=
      '\n\n📱 RESPONSE UX GUIDELINES (CRITICAL):\n' +
      '- Be CONCISE. Skip verbose explanations of what you are about to do.\n' +
      '- DO NOT narrate your process step-by-step (e.g., "First, I will...", "Phase 1:", "Let me...").\n' +
      '- When executing code: show the result directly, not the process.\n' +
      '- When answering questions: give the answer first, then brief context if needed.\n' +
      '- Avoid unnecessary headers, numbered phases, or procedural explanations.\n' +
      '- Keep the screen stable - minimize scrolling with focused, compact responses.\n' +
      '- For execution results: just show the output in a clean code block.\n' +
      '- NEVER say "Alright, let\'s execute..." or "I will now..." - just DO IT and show results.';

    let taskType = 'general';

    // Mode Logic
    switch (mode) {
      case 'quick':
        systemPrompt += ' Be concise, direct, and fast. Avoid fluff.';
        break;
      case 'technical':
        systemPrompt +=
          ' You are an expert software architect. Provide detailed technical explanations, code snippets, and implementation strategies. Focus on correctness and best practices.';
        taskType = 'code';
        break;
      case 'creative':
        systemPrompt +=
          ' You are a creative partner. Brainstorm ideas, explore possibilities, and think outside the box. Use metaphors and vivid language.';
        taskType = 'creative';
        break;
      case 'structured':
        systemPrompt +=
          ' Output your response in a structured format (JSON, Markdown tables, or lists). Be strictly organized.';
        break;
    }

    if (context) systemPrompt += `\n\nContext:\n${context}`;
    if (ragContext) systemPrompt += `\n\nRelevant Knowledge Base:\n${ragContext}`;
    if (attachments && attachments.length > 0) {
      systemPrompt += `\n\nAttachments:\n${JSON.stringify(attachments)}`;
    }

    const startTime = Date.now();
    const sessionId = req.body.sessionId || `session-${Date.now()}`;

    console.log(`[Chat Pro] SessionID received: ${req.body.sessionId}, using: ${sessionId}`);

    // Notify cortex about incoming request
    cortex.sessionContextService.addHighlight(sessionId, {
      type: 'milestone',
      icon: '💬',
      content: `User: ${message.substring(0, 60)}${message.length > 60 ? '...' : ''}`,
      relevanceScore: 1.0,
    });

    // Track provider request start
    const requestId = `req-${Date.now()}`;

    const result = await precog.providers.generate({
      prompt: message,
      system: systemPrompt,
      history: recentHistory,
      taskType: taskType,
    });

    const latency = Date.now() - startTime;

    // Record provider feedback
    console.log(`[Chat Pro] Recording provider: ${result.provider}, latency: ${latency}ms`);
    cortex.providerFeedbackEngine.recordRequestStart(result.provider || 'unknown', requestId);
    cortex.providerFeedbackEngine.recordRequestSuccess(result.provider || 'unknown', latency, 0.85);

    // V3.3.199: Record execution for provider learning
    try {
      const resultAny = result as Record<string, unknown>;
      const usage = resultAny['usage'] as { input?: number; output?: number } | undefined;
      const tokensUsed = usage
        ? (usage.input || 0) + (usage.output || 0)
        : Math.ceil(result.content.length / 4);
      providerExecutionLearner.recordExecution({
        providerId: result.provider || 'unknown',
        taskType: taskType,
        prompt: message,
        response: result.content,
        responseTime: latency,
        tokensUsed,
        success: true,
        qualityScore: 0.8, // Base score, adjusted by user feedback
        timestamp: new Date(),
      });

      // V3.3.550: Record token usage for billing metering
      const userId = (req as AuthenticatedRequest).user?.id;
      if (userId) {
        recordUsage(userId, 0, tokensUsed); // 0 requests (already counted by middleware), tokensUsed tokens
      }
    } catch (learnErr) {
      console.warn('[Chat] Provider execution learning failed:', learnErr);
    }

    // Add response to session highlights
    cortex.sessionContextService.addHighlight(sessionId, {
      type: 'achievement',
      icon: '🤖',
      content: `${result.provider}: ${result.content.substring(0, 60)}${result.content.length > 60 ? '...' : ''}`,
      relevanceScore: 0.9,
    });

    // Update session goal if message implies a new task
    if (message.toLowerCase().includes('help') || message.toLowerCase().includes('can you')) {
      cortex.sessionContextService.setCurrentGoal(
        sessionId,
        `Processing: ${message.substring(0, 40)}...`
      );
    }

    // Save Assistant Response
    await saveMessage({
      id: Date.now().toString(),
      type: 'assistant',
      content: result.content,
      provider: result.provider,
      model: result.model,
      timestamp: new Date().toISOString(),
    });

    // LEARN: Ingest interaction
    learner
      .ingestInteraction(message, result.content, {
        provider: result.provider,
        model: result.model,
        sessionId: sessionId,
        mode: mode,
      })
      .then(() => {
        bus.publish('precog', 'learning:ingested', {
          sessionId,
          type: 'interaction',
          timestamp: Date.now(),
        });
      })
      .catch((err) => console.error('[Chat] Learning failed:', err));

    res.json(
      successResponse({
        response: result.content,
        provider: result.provider,
        model: result.model,
        sources: sources,
        sessionId: sessionId,
      })
    );
  } catch (error: unknown) {
    console.error('[Chat] Error:', error);
    // Ensure we always return JSON even on error
    if (!res.headersSent) {
      res.status(500).json(errorResponse(error instanceof Error ? error.message : String(error)));
    }
  }
});

/**
 * Streaming Chat Endpoint
 * Server-Sent Events (SSE) for real-time token streaming
 * Enhanced with Creative Chat Orchestrator for visually-rich responses
 * V3.3.68: Model selection and thinking process output
 */
router.post('/stream', async (req, res) => {
  // Extend timeout for long streams
  req.setTimeout(300000);

  const {
    message,
    mode = 'quick',
    context,
    attachments,
    sessionId: reqSessionId,
    persona,
    provider: requestedProvider, // V3.3.68: Allow provider override
    model: requestedModel, // V3.3.68: Allow model override
  } = req.body;
  const sessionId = reqSessionId || `session-${Date.now()}`;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Save User Message
  await saveMessage({
    id: Date.now().toString(),
    type: 'user',
    content: message,
    timestamp: new Date().toISOString(),
  });

  try {
    // V3.3.68: Log model selection if provided
    if (requestedProvider || requestedModel) {
      console.log(
        `[Chat Stream] Model override: provider=${requestedProvider || 'auto'}, model=${requestedModel || 'auto'}`
      );
    }
    console.log(`[Chat Stream] Processing (${mode}): ${message.substring(0, 50)}...`);

    // 🚀 CAPABILITY QUESTION INTERCEPT - TooLoo responds as TooLoo, not as base model
    const capabilityPatterns = [
      /can you (execute|run|compile|build)/i,
      /do you have (access|ability|capability)/i,
      /are you able to (execute|run|code)/i,
      /can you (directly|actually) (execute|run)/i,
      /(execute|run|compile) code/i,
      /what can you do/i,
      /what are your capabilities/i,
    ];
    const isCapabilityQuestion = capabilityPatterns.some((p) => p.test(message));

    if (isCapabilityQuestion) {
      console.log('[Chat Stream] Intercepting capability question - TooLoo identity response');
      const toolooResponse = `**Yes, absolutely!** I'm TooLoo.ai V3.3, and I have **full execution capabilities**.

🧠 **My Synapsys Architecture:**
- **Cortex**: Cognitive core — reasoning, memory, planning
- **Precog**: Predictive intelligence — routes to optimal AI providers (Gemini, Claude, GPT, DeepSeek)
- **Motor Cortex**: Execution engine — runs code, spawns processes
- **System Execution Hub**: Connects to ALL TooLoo systems

⚡ **What I Can Execute:**
- Code in Python, JavaScript, TypeScript, and more
- Shell commands and system processes  
- File operations (create, read, write, delete)
- Database queries and API calls
- Build and deployment pipelines

🎯 **How I'm Different:**
I'm not a single AI model — I'm an **orchestrator** that intelligently routes tasks to the best provider:
- **Claude** for deep reasoning & safety
- **Gemini** for speed & multimodal tasks
- **GPT** for versatility & creative writing
- **DeepSeek** for code-heavy tasks

Every execution task goes through my **Team Framework** with executor+validator agent pairs for quality assurance.

Want me to demonstrate? Just tell me what to build or execute! 🚀`;

      // Stream the response character by character for effect
      res.write(
        `data: ${JSON.stringify({ meta: { persona: 'TooLoo Cortex', visualEnabled: false } })}\n\n`
      );

      for (const char of toolooResponse) {
        res.write(`data: ${JSON.stringify({ chunk: char })}\n\n`);
        await new Promise((r) => setTimeout(r, 5)); // Small delay for streaming effect
      }

      res.write(
        `data: ${JSON.stringify({ done: true, provider: 'TooLoo Cortex', model: 'Synapsys V3.3' })}\n\n`
      );
      res.end();

      await saveMessage({
        id: Date.now().toString(),
        type: 'assistant',
        content: toolooResponse,
        provider: 'TooLoo Cortex',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 🚀 V3.3.82: INLINE EXECUTION INTERCEPT
    // Detect /run, /execute, or code execution requests in the message
    const runCommandMatch =
      message.match(/^\/run\s+```(\w+)?\n([\s\S]*?)```/m) ||
      message.match(/^\/execute\s+```(\w+)?\n([\s\S]*?)```/m);
    const inlineCodeMatch = message.match(/^```(\w+)\n([\s\S]*?)```\s*(?:run|execute|→|->|=>)/im);

    // Also detect natural language execution requests with code blocks
    const naturalExecPatterns = [
      /(?:run|execute|test|try)\s+(?:this|the following|below)[\s\S]*?```(\w+)\n([\s\S]*?)```/i,
      /```(\w+)\n([\s\S]*?)```[\s\S]*?(?:run|execute|test|try)\s+(?:it|this|that)/i,
    ];
    const naturalExecMatch = naturalExecPatterns.reduce(
      (acc, pattern) => acc || message.match(pattern),
      null as RegExpMatchArray | null
    );

    const execMatch = runCommandMatch || inlineCodeMatch || naturalExecMatch;

    if (execMatch) {
      const language = execMatch[1] || 'javascript';
      const code = execMatch[2];

      console.log(`[Chat Stream] 🚀 Inline execution detected: ${language} (${code.length} chars)`);

      // Send execution start notification
      res.write(
        `data: ${JSON.stringify({
          meta: { persona: 'TooLoo Executor', visualEnabled: false },
          executionStart: true,
          language,
          codePreview: code.substring(0, 100) + (code.length > 100 ? '...' : ''),
        })}\n\n`
      );

      res.write(
        `data: ${JSON.stringify({ chunk: `⚡ **Executing ${language} code...**\n\n` })}\n\n`
      );

      try {
        // Direct Docker execution for inline chat execution
        const { CodeExecutor } = await import('../../cortex/motor/code-execution.js');
        const executor = new CodeExecutor(process.cwd());
        const directResult = await executor.executeInDocker(code, language);

        const execResponse = {
          success: directResult.ok,
          output: directResult.stdout,
          error: directResult.stderr,
          qualityScore: directResult.ok ? 0.85 : 0,
        };

        if (execResponse.success) {
          const resultMsg = `✅ **Execution Complete** (Quality: ${((execResponse.qualityScore || 0) * 100).toFixed(0)}%)\n\n\`\`\`\n${execResponse.output}\n\`\`\`\n`;
          for (const char of resultMsg) {
            res.write(`data: ${JSON.stringify({ chunk: char })}\n\n`);
          }
        } else {
          const errorMsg = `❌ **Execution Failed**\n\n\`\`\`\n${execResponse.error || 'Unknown error'}\n\`\`\`\n`;
          for (const char of errorMsg) {
            res.write(`data: ${JSON.stringify({ chunk: char })}\n\n`);
          }
        }

        res.write(
          `data: ${JSON.stringify({
            done: true,
            provider: 'TooLoo Executor',
            model: 'Docker Sandbox',
            execution: {
              success: execResponse.success,
              qualityScore: execResponse.qualityScore,
              output: execResponse.output,
              error: execResponse.error,
            },
          })}\n\n`
        );
        res.end();

        await saveMessage({
          id: Date.now().toString(),
          type: 'execution',
          content: `Executed ${language}:\n\`\`\`${language}\n${code}\n\`\`\``,
          result: execResponse.success ? execResponse.output : execResponse.error,
          success: execResponse.success,
          timestamp: new Date().toISOString(),
        });
        return;
      } catch (execError) {
        const errorMsg = `❌ **Execution Error**: ${execError instanceof Error ? execError.message : String(execError)}\n`;
        for (const char of errorMsg) {
          res.write(`data: ${JSON.stringify({ chunk: char })}\n\n`);
        }
        res.write(
          `data: ${JSON.stringify({ done: true, provider: 'TooLoo Executor', error: true })}\n\n`
        );
        res.end();
        return;
      }
    }

    // Load History for Context
    const fullHistory = await loadHistory();
    const recentHistory = fullHistory.slice(-21, -1).map((msg: any) => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));

    // 🎨 CREATIVE CHAT ORCHESTRATION
    // Analyze prompt and generate creative context with visual directives
    const creativeContext = await creativeChatOrchestrator.analyzePrompt(message, mode, context);

    // Use the enhanced creative system prompt
    let systemPrompt = creativeContext.enhancedSystemPrompt;

    // RAG (Simplified for stream)
    try {
      const searchResults = await cortex.hippocampus.vectorStore.search(message, 2);
      if (searchResults && searchResults.length > 0) {
        const ragContext = searchResults.map((r) => r.doc.text).join('\n\n');
        systemPrompt += `\n\n📚 RELEVANT KNOWLEDGE BASE:\n${ragContext}`;
      }
    } catch (e) {
      /* ignore */
    }

    if (attachments && attachments.length > 0) {
      systemPrompt += `\n\n📎 ATTACHMENTS:\n${JSON.stringify(attachments)}`;
    }

    // Determine task type from creative context
    const taskType = mode === 'technical' ? 'code' : mode === 'creative' ? 'creative' : 'general';

    // Notify cortex with creative context info
    cortex.sessionContextService.addHighlight(sessionId, {
      type: 'milestone',
      icon: creativeContext.visualDirective.enabled ? '🎨' : '💬',
      content: `Creative Stream: ${message.substring(0, 50)}... [${creativeContext.creativeDirective.persona.name}]`,
      relevanceScore: 1.0,
    });

    // Send creative context metadata first
    res.write(
      `data: ${JSON.stringify({
        meta: {
          persona: creativeContext.creativeDirective.persona.name,
          visualEnabled: creativeContext.visualDirective.enabled,
          visualType: creativeContext.visualDirective.intent.primaryType,
          temperature: creativeContext.temperature,
        },
      })}\n\n`
    );

    // 🎨 V3.3.68: ENHANCED VISUAL GENERATION
    // Detect visual requests and enhance prompts for stunning output
    const isVisualRequest = enhancedVisualGenerator.detectVisualRequest(message);
    let enhancedMessage = message;

    if (isVisualRequest) {
      console.log(
        `[Chat Stream] 🎨 Visual request detected - enhancing prompt for stunning output`
      );
      enhancedMessage = enhancedVisualGenerator.enhancePrompt(message);

      // Add visual enhancement notification
      res.write(
        `data: ${JSON.stringify({
          visualEnhanced: true,
          visualType: enhancedVisualGenerator.detectVisualType(message),
        })}\n\n`
      );
    }

    // ============================================
    // V3.3.198: MINIMAL THINKING EVENTS (UX-OPTIMIZED)
    // Only emit essential status - avoid scrolling/verbose output
    // ============================================

    // Helper to emit minimal thinking events (consolidated, non-intrusive)
    const emitThinking = (
      stage: string,
      message: string,
      type: 'info' | 'success' | 'error' = 'info',
      silent = false
    ) => {
      // Only emit if not silent - most thinking is now silent for clean UX
      if (!silent) {
        res.write(
          `data: ${JSON.stringify({
            thinking: { stage, message, type, timestamp: Date.now() },
          })}\n\n`
        );
      }
    };

    // ============================================
    // V3.3.470: EMERGENT NEURAL ROUTER INTEGRATION
    // Use ModelChooser for intelligent routing with learning
    // ============================================

    // Determine ensemble strategy using Neural Router
    const availableProviders = precog.providers.getProviderStatus();
    const activeProviders = Object.entries(availableProviders)
      .filter(([_, status]: [string, any]) => status.available)
      .map(([name]) => name);

    let selectedProviders: string[] = [];
    let routingStrategy = 'single';
    let neuralRoutingPlan: RoutingPlan | null = null;
    let requestStartTime = Date.now();

    if (!requestedProvider) {
      // V3.3.470: Use Neural Router for intelligent routing
      try {
        neuralRoutingPlan = await modelChooser.selectRecipeForIntent({
          originalPrompt: enhancedMessage,
          taskType: taskType,
          context: { ...context, sessionId },
          sessionId,
          requestId: `chat-${Date.now()}`,
        });

        if (neuralRoutingPlan.type === 'recipe' && neuralRoutingPlan.steps) {
          // Recipe mode: use primary model from first step
          selectedProviders = neuralRoutingPlan.steps
            .map((s) => s.model)
            .filter((m) => activeProviders.includes(m))
            .slice(0, 3);
          routingStrategy = 'recipe';
          console.log(
            `[Chat Stream] 🧠 Neural Router: Recipe "${neuralRoutingPlan.name}" selected`
          );
        } else if (neuralRoutingPlan.model) {
          // Single model mode
          if (activeProviders.includes(neuralRoutingPlan.model)) {
            selectedProviders = [neuralRoutingPlan.model];
          } else {
            // Fallback if recommended model not available
            selectedProviders = activeProviders.slice(0, 1);
          }
          routingStrategy = neuralRoutingPlan.lane === 'deep' ? 'ensemble' : 'single';
          console.log(
            `[Chat Stream] 🧠 Neural Router: ${neuralRoutingPlan.model} (${neuralRoutingPlan.lane} lane, confidence: ${neuralRoutingPlan.confidence?.toFixed(2)})`
          );
        }

        // Emit neural routing info
        res.write(
          `data: ${JSON.stringify({
            neuralRouting: {
              plan: neuralRoutingPlan.type,
              model: neuralRoutingPlan.model,
              lane: neuralRoutingPlan.lane,
              confidence: neuralRoutingPlan.confidence,
              recipeName: neuralRoutingPlan.name,
              shadowTest: neuralRoutingPlan.shadowTest,
            },
          })}\n\n`
        );
      } catch (routerError) {
        console.warn('[Chat Stream] Neural Router error, using fallback:', routerError);
        // Fallback to legacy routing
        const complexity =
          enhancedMessage.length > 500 ||
          /code|implement|build|create|design|architect/i.test(enhancedMessage)
            ? 'high'
            : 'standard';

        if (
          complexity === 'high' ||
          /creative|brainstorm|multiple|compare/i.test(enhancedMessage)
        ) {
          selectedProviders = activeProviders.slice(0, 3);
          routingStrategy = 'ensemble';
        } else if (/code|debug|fix|implement/i.test(enhancedMessage)) {
          selectedProviders = activeProviders.includes('deepseek')
            ? ['deepseek']
            : activeProviders.includes('anthropic')
              ? ['anthropic']
              : [activeProviders[0] || 'gemini'];
        } else if (/explain|summarize|analyze/i.test(enhancedMessage)) {
          selectedProviders = activeProviders.includes('anthropic')
            ? ['anthropic']
            : [activeProviders[0] || 'gemini'];
        } else {
          selectedProviders = activeProviders.includes('gemini')
            ? ['gemini']
            : [activeProviders[0] || 'gemini'];
        }
      }
    } else {
      // User selected specific provider
      selectedProviders = [requestedProvider];
      // Silent - no verbose output
    }

    // V3.3.470: Emit routing decision for process visualization with Neural Router info
    const complexity = neuralRoutingPlan?.lane === 'deep' ? 'high' : 'standard';
    res.write(
      `data: ${JSON.stringify({
        routing: {
          strategy: routingStrategy,
          selectedProviders,
          complexity,
          reasoning: requestedProvider
            ? `User requested ${requestedProvider}`
            : neuralRoutingPlan?.type === 'recipe'
              ? `Neural Router: Recipe "${neuralRoutingPlan.name}" (confidence: ${neuralRoutingPlan.confidence?.toFixed(2)})`
              : neuralRoutingPlan
                ? `Neural Router: ${neuralRoutingPlan.model} (${neuralRoutingPlan.lane} lane, confidence: ${neuralRoutingPlan.confidence?.toFixed(2)})`
                : routingStrategy === 'ensemble'
                  ? `Complex/creative task - using ${selectedProviders.length} providers in parallel`
                  : `Auto-routed to ${selectedProviders[0]}`,
          activeProviders,
          neuralRouter: neuralRoutingPlan
            ? {
                type: neuralRoutingPlan.type,
                model: neuralRoutingPlan.model,
                lane: neuralRoutingPlan.lane,
                confidence: neuralRoutingPlan.confidence,
                recipe: neuralRoutingPlan.name,
                shadowTest: neuralRoutingPlan.shadowTest,
              }
            : undefined,
        },
      })}\n\n`
    );

    // V3.3.198: Single minimal status indicator instead of verbose processing steps
    emitThinking('processing', `⚡ ${selectedProviders[0]}`, 'info');

    let fullResponse = '';
    let result: any;

    // ============================================
    // V3.3.126: TRUE ENSEMBLE PARALLEL EXECUTION
    // When ensemble mode is triggered, query ALL providers
    // in parallel and synthesize a consensus response
    // ============================================

    if (routingStrategy === 'ensemble' && selectedProviders.length > 1) {
      // 🚀 ENSEMBLE MODE: Query all providers in parallel (silent processing)
      const parallelResult = await parallelOrchestrator.hyperParallelGenerate(enhancedMessage, {
        system: systemPrompt,
        sessionId: sessionId,
        maxTokens: 2048,
      });

      // Report individual provider results (silent - just log)
      const successfulProviders = parallelResult.results.filter((r) => r.success);
      console.log(
        `[Chat Stream] Ensemble: ${successfulProviders.length}/${parallelResult.results.length} providers responded`
      );

      fullResponse = parallelResult.consensus;

      // Stream chunks for UI effect (simulate streaming of pre-generated content)
      const chunkSize = 50;
      for (let i = 0; i < fullResponse.length; i += chunkSize) {
        const chunk = fullResponse.slice(i, i + chunkSize);
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        // Small delay to create streaming effect
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // V3.3.404: Aggregate costs from all providers
      const aggregatedCost = successfulProviders.reduce((total, r) => {
        // Estimate cost based on response length and provider
        // Using rough per-token pricing: ~$0.002 per 1k tokens average
        const estimatedTokens = (r.response?.length || 0) / 4; // ~4 chars per token
        const perTokenCost = 0.000002; // $0.002 / 1000
        return total + estimatedTokens * perTokenCost;
      }, 0);

      result = {
        provider: `ensemble(${successfulProviders.map((p) => p.provider).join('+')})`,
        model: 'consensus',
        cost_usd: aggregatedCost,
        reasoning: `Parallel ensemble: queried ${parallelResult.results.length} providers, synthesized from ${successfulProviders.length} responses in ${parallelResult.timing.total}ms`,
      };

      // Silent - completion indicated by done:true in final event
    } else {
      // Phase 1: Smart Router mode - intelligent waterfall fallback
      // If user requested specific provider, use that; otherwise use smart routing
      if (requestedProvider) {
        // User explicitly selected a provider - respect their choice
        result = await precog.providers.stream({
          prompt: enhancedMessage,
          system: systemPrompt,
          history: recentHistory,
          taskType: taskType,
          sessionId: sessionId,
          provider: requestedProvider,
          model: requestedModel || undefined,
          onChunk: (chunk) => {
            if (chunk && chunk.length > 0) {
              fullResponse += chunk;
              res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
            }
          },
          onComplete: (_fullText) => {
            console.log(`[Chat Stream] Response complete via ${requestedProvider}`);
          },
        });

        // Record metrics in scorecard
        const latency = Date.now() - requestStartTime;
        const tokens = (fullResponse.length / 4) | 0; // Estimate: ~4 chars per token
        smartRouter.recordMetric(requestedProvider, latency, true, tokens);
      } else {
        // No user preference - use smart routing with waterfall fallback

        // Phase 3: User Segmentation
        // Analyze user intent to get segment
        const segment = await getSegmentationService().analyzeUserIntent(
          sessionId,
          enhancedMessage
        );
        console.log(`[Chat] User segment detected: ${segment}`);

        const smartRouteResult = await smartRouter.smartRoute(enhancedMessage, {
          system: systemPrompt,
          maxTokens: 2048,
          sessionId: sessionId,
          timeout: 30000,
          maxRetries: 3,
          excludeProviders: [], // Can be customized by user
          segment: segment, // Pass segment to SmartRouter
        });

        if (smartRouteResult.success) {
          fullResponse = smartRouteResult.response;

          // Stream the response in chunks for consistent UX
          const chunkSize = 50;
          for (let i = 0; i < fullResponse.length; i += chunkSize) {
            const chunk = fullResponse.slice(i, i + chunkSize);
            res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
            await new Promise((resolve) => setTimeout(resolve, 10));
          }

          result = {
            provider: smartRouteResult.provider,
            model: 'smart-routed',
            cost_usd: 0, // Will be calculated from tokens
            reasoning: `Smart routed via ${smartRouteResult.provider} (attempt ${smartRouteResult.attemptsNeeded})`,
          };

          console.log(
            `[SmartRoute] Success via ${smartRouteResult.provider} in ${smartRouteResult.latency}ms (attempts: ${smartRouteResult.attemptsNeeded})`
          );
        } else {
          // All providers failed - fallback to best available provider
          console.error(`[SmartRoute] All providers failed: ${smartRouteResult.error}`);

          const rankings = smartRouter.getProviderRankings();
          const fallbackProvider = rankings[0]?.provider || 'deepseek';

          result = await precog.providers.stream({
            prompt: enhancedMessage,
            system: systemPrompt,
            history: recentHistory,
            taskType: taskType,
            sessionId: sessionId,
            provider: fallbackProvider,
            model: requestedModel || undefined,
            onChunk: (chunk) => {
              if (chunk && chunk.length > 0) {
                fullResponse += chunk;
                res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
              }
            },
            onComplete: (_fullText) => {
              console.log(`[Chat Stream] Fallback response via ${fallbackProvider}`);
            },
          });
        }
      }
    }

    // Record decision for transparency log
    recordDecision({
      taskType: taskType,
      detectedDomain:
        taskType === 'code' ? 'code' : taskType === 'creative' ? 'creative' : 'general',
      selectedProvider: result.provider,
      selectedModel: result.model || result.provider,
      reasoning: requestedProvider
        ? `User selected ${requestedProvider}/${requestedModel || 'default'}`
        : result.reasoning || `Auto-selected ${result.provider} for ${taskType} task`,
      costEstimate: result.cost_usd || 0,
      complexity: result.complexity || 'auto',
    });

    // Send completion event
    res.write(
      `data: ${JSON.stringify({
        done: true,
        provider: result.provider,
        model: result.model,
        cost_usd: result.cost_usd || 0,
        reasoning: requestedProvider
          ? `User selected ${requestedProvider}/${requestedModel || 'default'}`
          : result.reasoning || `Auto-selected ${result.provider} for this task`,
        ensemble: routingStrategy === 'ensemble',
        neuralRouting: neuralRoutingPlan
          ? {
              plan: neuralRoutingPlan.type,
              lane: neuralRoutingPlan.lane,
              confidence: neuralRoutingPlan.confidence,
            }
          : undefined,
      })}\n\n`
    );
    res.end();

    // V3.3.470: Record outcome to Neural Router for learning
    const requestLatency = Date.now() - requestStartTime;
    const responseQuality = fullResponse.length > 100 ? 0.7 : 0.5; // Basic quality heuristic

    try {
      // Extract features from the original prompt for learning
      const learnedFeatures = modelChooser.extractFeatures(message);

      await modelChooser.recordOutcome(
        learnedFeatures.length > 0 ? learnedFeatures : ['general'],
        result.provider?.split('(')[0] || selectedProviders[0] || 'unknown', // Handle ensemble provider string
        {
          success: fullResponse.length > 50, // Consider successful if we got a substantial response
          rating: responseQuality,
          latency: requestLatency,
          cost: result.cost_usd || 0,
        }
      );
      console.log(
        `[Chat Stream] 🧠 Neural Router outcome recorded (provider: ${result.provider}, latency: ${requestLatency}ms)`
      );
    } catch (learnErr) {
      console.warn('[Chat Stream] Failed to record Neural Router outcome:', learnErr);
    }

    // V3.3.480: Trigger Shadow Lab background experiment (async, non-blocking)
    // Shadow Lab runs challenger experiments in background to find better routing options
    try {
      const primaryProvider = result.provider?.split('(')[0] || selectedProviders[0] || 'gemini';
      const learnedFeatures = modelChooser.extractFeatures(message);

      // Run shadow experiment asynchronously - don't await to avoid blocking
      shadowLab
        .maybeRunExperiment({
          prompt: enhancedMessage.substring(0, 500), // Truncate for efficiency
          context: { sessionId, taskType, features: learnedFeatures },
          primaryProvider,
          primaryResult: {
            response: fullResponse.substring(0, 200), // Sample of response
            latency: requestLatency,
            cost: result.cost_usd || 0,
            quality: responseQuality,
          },
        })
        .then((experimentResult) => {
          if (experimentResult && experimentResult.ran) {
            console.log(
              `[Chat Stream] 🔬 Shadow Lab experiment completed: ` +
                `${experimentResult.challengerWon ? 'CHALLENGER WON' : 'incumbent held'} ` +
                `(${experimentResult.challenger} vs ${primaryProvider})`
            );
          }
        })
        .catch((shadowErr) => {
          console.warn('[Chat Stream] Shadow Lab experiment failed:', shadowErr);
        });
    } catch (shadowSetupErr) {
      console.warn('[Chat Stream] Failed to setup Shadow Lab experiment:', shadowSetupErr);
    }

    // Save Assistant Response
    await saveMessage({
      id: Date.now().toString(),
      type: 'assistant',
      content: fullResponse,
      provider: result.provider,
      model: result.model,
      timestamp: new Date().toISOString(),
    });

    // V3.3.182: Detect self-modification suggestions but DO NOT auto-apply
    // All changes require explicit user approval via /api/v1/system/autonomous/approve
    const codeSuggestions = parseCodeSuggestions(fullResponse);
    if (codeSuggestions.length > 0) {
      console.log(
        `[Chat Stream] 🧬 Found ${codeSuggestions.length} self-modification suggestions (awaiting approval)`
      );

      // Queue suggestions for approval - DO NOT auto-apply
      bus.publish('cortex', 'self-mod:suggestions-detected', {
        sessionId,
        count: codeSuggestions.length,
        suggestions: codeSuggestions.map((s) => ({
          filePath: s.filePath,
          operation: s.operation,
          confidence: s.confidence,
        })),
        message:
          'Code suggestions detected. Use /api/v1/system/autonomous/process with autoApply=false to review, then /approve to apply.',
      });
    }

    // Add response to session highlights
    cortex.sessionContextService.addHighlight(sessionId, {
      type: 'achievement',
      icon: '🤖',
      content: `${result.provider}: ${fullResponse.substring(0, 60)}...`,
      relevanceScore: 0.9,
    });
  } catch (error: unknown) {
    console.error('[Chat Stream] Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
    res.end();
  }
});

// ========================================
// CREATIVE CHAT ENDPOINTS
// ========================================

/**
 * GET /api/v1/chat/personas
 * Get available creative personas
 */
router.get('/personas', (req, res) => {
  const personas = creativeChatOrchestrator.getAvailablePersonas();
  res.json(successResponse({ personas }));
});

/**
 * POST /api/v1/chat/analyze
 * Analyze a prompt and get creative context without generating a response
 */
router.post('/analyze', async (req, res) => {
  const { message, mode = 'quick' } = req.body;

  if (!message) {
    return res.status(400).json(errorResponse('Message is required'));
  }

  try {
    const context = await creativeChatOrchestrator.analyzePrompt(message, mode);
    const suggestions = creativeChatOrchestrator.suggestVisualEnhancements(message);

    res.json(
      successResponse({
        visualIntent: context.visualDirective.intent,
        visualEnabled: context.visualDirective.enabled,
        persona: {
          name: context.creativeDirective.persona.name,
          voice: context.creativeDirective.persona.voice,
        },
        suggestedFormat: context.suggestedFormat,
        temperature: context.temperature,
        suggestions,
      })
    );
  } catch (error: unknown) {
    console.error('[Chat Analyze] Error:', error);
    res.status(500).json(errorResponse(error instanceof Error ? error.message : String(error)));
  }
});

/**
 * POST /api/v1/chat/creative
 * Generate a creative visual response with persona and visual enhancements
 */
router.post('/creative', async (req, res) => {
  const { prompt, mode = 'creative', persona: requestedPersona } = req.body;

  if (!prompt) {
    return res.status(400).json(errorResponse('Prompt is required'));
  }

  try {
    console.log(`[Creative Chat] Processing: ${prompt.substring(0, 50)}...`);

    // Get creative context
    const context = await creativeChatOrchestrator.analyzePrompt(prompt, mode);
    const suggestions = creativeChatOrchestrator.suggestVisualEnhancements(prompt);

    // Generate with enhanced system prompt
    const result = await precog.providers.generate({
      prompt,
      system: context.enhancedSystemPrompt,
      taskType: 'creative',
    });

    // Save to history
    const userMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
    };
    await saveMessage(userMessage);

    const assistantMessage = {
      id: `msg-${Date.now()}-assistant`,
      role: 'assistant',
      content: result.content,
      timestamp: new Date().toISOString(),
      provider: result.provider,
      model: result.model,
      persona: context.creativeDirective.persona.name,
      visualIntent: context.visualDirective.intent.primaryType,
    };
    await saveMessage(assistantMessage);

    res.json(
      successResponse({
        response: result.content,
        provider: result.provider,
        model: result.model,
        persona: {
          name: context.creativeDirective.persona.name,
          voice: context.creativeDirective.persona.voice,
        },
        visualIntent: context.visualDirective.intent,
        visualEnabled: context.visualDirective.enabled,
        suggestions,
      })
    );
  } catch (error: unknown) {
    console.error('[Creative Chat] Error:', error);
    res.status(500).json(errorResponse(error instanceof Error ? error.message : String(error)));
  }
});

// ========================================
// ILLUSTRATION ENDPOINT - Human-like AI Art
// ========================================

/**
 * POST /api/v1/chat/illustrate
 * Generate human-like AI illustrations with intelligent prompt analysis
 * Returns SVG illustrations based on prompt analysis
 */
router.post('/illustrate', async (req, res) => {
  const { prompt, width = 800, height = 600 } = req.body;

  if (!prompt) {
    return res.status(400).json(errorResponse('Prompt is required'));
  }

  try {
    console.log(`[Illustration] Generating: ${prompt.substring(0, 50)}...`);

    // Analyze the prompt to determine illustration spec
    const spec = illustrationEngine.analyzePrompt(prompt);

    // Generate SVG illustration
    const svgContent = illustrationEngine.generateSVG(spec, width, height);

    // Generate text description for the illustration
    const description = illustrationEngine.generateIllustrationPrompt(spec);

    res.json(
      successResponse({
        response: `## 🎨 Illustration Generated\n\n\`\`\`svg\n${svgContent}\n\`\`\`\n\n**Style**: ${spec.style}\n**Mood**: ${spec.mood}\n**Complexity**: ${spec.complexity}`,
        visual: {
          type: 'svg',
          data: svgContent,
          altText: prompt,
          metadata: {
            style: spec.style,
            mood: spec.mood,
            complexity: spec.complexity,
            width,
            height,
          },
        },
        provider: 'tooloo-visual-cortex',
        model: 'illustration-engine-v1',
        analysis: {
          spec,
          description,
          elements: spec.elements.length,
          effects: spec.effects.length,
        },
      })
    );
  } catch (error: unknown) {
    console.error('[Illustration] Error:', error);
    res.status(500).json(errorResponse(error instanceof Error ? error.message : String(error)));
  }
});

/**
 * GET /api/v1/chat/illustration-types
 * Get available illustration types and styles
 */
router.get('/illustration-types', (req, res) => {
  // IllustrationStyle and IllustrationMood are string literal types, enumerate them manually
  const styles: IllustrationStyle[] = [
    'minimalist',
    'isometric',
    'hand-drawn',
    'geometric',
    'gradient-flow',
    'neon-glow',
    'watercolor',
    'line-art',
    'flat-design',
    'data-art',
    'organic',
    'technical',
    'retro-futurism',
    'abstract',
  ];

  const moods: IllustrationMood[] = [
    'inspiring',
    'calm',
    'energetic',
    'mysterious',
    'playful',
    'professional',
    'futuristic',
    'nostalgic',
    'dramatic',
  ];

  res.json(
    successResponse({
      styles,
      moods,
      compositions: [
        'centered',
        'rule-of-thirds',
        'golden-ratio',
        'symmetrical',
        'asymmetrical',
        'radial',
        'grid',
      ],
      effects: [
        'glow',
        'shadow',
        'blur',
        'gradient',
        'noise',
        'grain',
        'reflection',
        'parallax',
        'pulse',
        'shimmer',
      ],
      themes: [
        'technology',
        'nature',
        'abstract',
        'business',
        'education',
        'art',
        'science',
        'social',
      ],
    })
  );
});

// ============================================================================
// SMART EXECUTION - V3.3.196
// Intelligent execution with human-friendly progress and quality optimization
// ============================================================================

/**
 * @route POST /api/v1/chat/command/smart
 * @description Smart execution with full TooLoo orchestration
 * This is the flagship execution endpoint that uses:
 * - Sprint-based execution cycles
 * - Human-friendly progress updates
 * - Quality > Performance > Efficiency > Cost optimization
 * - Multi-phase validation
 * V3.3.196: Smart execution orchestrator
 */
router.post('/command/smart', async (req, res) => {
  const {
    objective,
    code,
    language = 'javascript',
    context,
    qualityThreshold = 0.85,
    maxSprints = 5,
    verbose = true,
  } = req.body;

  if (!objective && !code) {
    return res.status(400).json(errorResponse('Objective or code is required'));
  }

  const startTime = Date.now();
  const requestId = `smart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    console.log(`[Chat Smart] 🧠 Starting smart execution (${requestId})...`);
    console.log(`[Chat Smart] Objective: ${(objective || 'code execution').substring(0, 100)}...`);

    // Publish execution start event
    bus.publish('cortex', 'chat:smart:start', {
      requestId,
      objective: objective || 'code execution',
      hasCode: !!code,
      timestamp: Date.now(),
    });

    // Execute through Smart Orchestrator
    const response = await smartOrchestrator.execute({
      id: requestId,
      objective: objective || `Execute ${language} code`,
      type: code ? 'execute' : 'generate',
      code,
      language,
      context: {
        ...context,
        source: 'chat',
      },
      qualityThreshold,
      maxSprints,
      verbose,
    });

    const duration = Date.now() - startTime;

    // Publish completion event
    bus.publish('cortex', 'chat:smart:complete', {
      requestId,
      success: response.success,
      qualityScore: response.qualityScore,
      sprints: response.totalSprints,
      duration,
      timestamp: Date.now(),
    });

    // Save to history with rich context
    await saveMessage({
      id: requestId,
      type: 'smart-execution',
      content: `[Smart Execution] ${objective || 'Code Execution'}\n${code ? `\`\`\`${language}\n${code}\n\`\`\`` : ''}`,
      result: response.output,
      success: response.success,
      qualityScore: response.qualityScore,
      sprints: response.totalSprints,
      optimization: response.optimization,
      timestamp: new Date().toISOString(),
    });

    // Build human-friendly response
    const humanResponse = buildHumanFriendlyResponse(response);

    res.json(
      successResponse({
        requestId,
        success: response.success,
        output: response.output,

        // Human-friendly summary
        summary: humanResponse.summary,
        explanation: humanResponse.explanation,

        // Execution details
        sprints: response.sprints.map((s) => ({
          number: s.number,
          objective: s.objective,
          status: s.status,
          qualityScore: s.qualityScore,
          durationMs: s.durationMs,
        })),
        totalSprints: response.totalSprints,

        // Quality metrics
        qualityScore: response.qualityScore,
        optimization: response.optimization,

        // Status info
        finalStatus: response.finalStatus,

        // Artifacts
        artifacts: response.artifacts,

        // Performance
        durationMs: duration,

        // Recommendations for user
        recommendations: response.recommendations,

        // Team info
        teamId: response.teamId,
      })
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Chat Smart] Error:', error);

    bus.publish('cortex', 'chat:smart:error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      duration,
      timestamp: Date.now(),
    });

    res.status(500).json(errorResponse(error instanceof Error ? error.message : String(error)));
  }
});

/**
 * Build a human-friendly response from the smart execution result
 */
function buildHumanFriendlyResponse(response: any): { summary: string; explanation: string } {
  const { success, qualityScore, totalSprints, optimization, recommendations } = response;

  let summary: string;
  let explanation: string;

  if (success) {
    const qualityPercent = (qualityScore * 100).toFixed(1);
    summary = `✅ Task completed successfully with ${qualityPercent}% quality`;

    explanation = `I completed your task in ${totalSprints} sprint${totalSprints > 1 ? 's' : ''}. `;

    if (qualityScore >= 0.95) {
      explanation += `The output quality is excellent! `;
    } else if (qualityScore >= 0.85) {
      explanation += `The output quality is good and meets the threshold. `;
    } else {
      explanation += `The output quality is acceptable but could be improved. `;
    }

    if (optimization.efficiencyRatio > 0.7) {
      explanation += `Execution was highly efficient. `;
    }

    if (recommendations.length > 0) {
      explanation += `\n\nSuggestions for next time:\n• ${recommendations.slice(0, 3).join('\n• ')}`;
    }
  } else {
    summary = `⚠️ Task completed but did not meet quality threshold`;

    explanation = `I attempted ${totalSprints} sprint${totalSprints > 1 ? 's' : ''} but achieved ${(qualityScore * 100).toFixed(1)}% quality. `;

    if (recommendations.length > 0) {
      explanation += `\n\nHere's what might help:\n• ${recommendations.join('\n• ')}`;
    }
  }

  return { summary, explanation };
}

// ============================================================================
// AUTOMATED EXECUTION - V3.3.197
// Fully automated, self-correcting execution pipeline
// This is the recommended execution endpoint for TooLoo
// ============================================================================

/**
 * @route POST /api/v1/chat/command/auto
 * @description Fully automated code execution with self-correction
 * This is TooLoo's streamlined execution - it handles everything automatically:
 * - Code generation from objectives
 * - Proper file-based execution (no eval issues)
 * - Auto-retry with intelligent error fixing
 * - Clean result packaging
 *
 * V3.3.197: New automated execution pipeline
 */
router.post('/command/auto', async (req, res) => {
  const { code, objective, language = 'javascript', timeout = 30000, maxRetries = 3 } = req.body;

  if (!code && !objective) {
    return res.status(400).json(errorResponse('Code or objective is required'));
  }

  const startTime = Date.now();
  const requestId = `auto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    console.log(`[Chat Auto] 🤖 Starting automated execution (${requestId})...`);

    // Execute through automated pipeline
    const result = await automatedPipeline.execute({
      code,
      objective,
      language: language as any,
      timeout,
      maxRetries,
    });

    const duration = Date.now() - startTime;

    // Save to history
    await saveMessage({
      id: requestId,
      type: 'auto-execution',
      content: `[Auto Execution] ${objective || 'Code'}\n\`\`\`${result.language}\n${result.executedCode}\n\`\`\``,
      result: result.success ? result.output : result.error,
      success: result.success,
      attempts: result.attempts,
      timestamp: new Date().toISOString(),
    });

    // Build response
    res.json(
      successResponse({
        requestId,
        success: result.success,
        output: result.output,
        error: result.error,
        exitCode: result.exitCode,

        // Execution details
        executedCode: result.executedCode,
        language: result.language,
        attempts: result.attempts,

        // Performance
        durationMs: duration,

        // Phases completed
        phases: result.phases,

        // Human-friendly summary
        summary: result.success
          ? `✅ Executed successfully${result.attempts > 1 ? ` (after ${result.attempts} attempts)` : ''}`
          : `❌ Execution failed after ${result.attempts} attempt(s)`,
      })
    );
  } catch (error) {
    console.error('[Chat Auto] Error:', error);
    res.status(500).json(errorResponse(error instanceof Error ? error.message : String(error)));
  }
});

// ============================================================================
// INLINE CODE EXECUTION - V3.3.82
// Execute code directly from chat with team validation
// ============================================================================

/**
 * @route POST /api/v1/chat/command/execute
 * @description Execute code inline in the chat with team validation
 * Supports: python, javascript, typescript, bash, shell
 * V3.3.82: Added inline code execution from chat
 */
router.post('/command/execute', async (req, res) => {
  const {
    code,
    language = 'javascript',
    prompt,
    useTeam = true,
    qualityThreshold = 0.8,
    maxIterations = 3,
    timeout = 30000,
  } = req.body;

  if (!code && !prompt) {
    return res.status(400).json(errorResponse('Code or prompt is required'));
  }

  const startTime = Date.now();
  const requestId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    console.log(`[Chat Execute] 🚀 Executing ${language} code (${requestId})...`);
    console.log(`[Chat Execute] Code preview: ${(code || '').substring(0, 100)}...`);

    // Publish execution start event
    bus.publish('cortex', 'chat:execute:start', {
      requestId,
      language,
      codeLength: code?.length || 0,
      hasPrompt: !!prompt,
      timestamp: Date.now(),
    });

    // Execute through System Execution Hub with team validation
    let response;

    // V3.3.125: Fixed System Hub code execution pipeline
    // Use team execution for quality validation, with fallback to direct execution
    if (useTeam) {
      try {
        console.log(`[Chat Execute] Using System Hub team execution for ${language}`);
        const { systemExecutionHub } = await import('../../cortex/agent/system-hub.js');

        const hubResponse = await systemExecutionHub.submitRequest({
          id: requestId,
          source: 'synaptic',
          type: 'execute',
          prompt: prompt || `Execute the following ${language} code`,
          code,
          context: { language, originalPrompt: prompt },
          options: {
            useTeam: true,
            teamSpecialization: 'code-execution',
            qualityThreshold,
            maxIterations,
            timeout,
            sandbox: true,
          },
          priority: 'normal',
        });

        response = {
          success: hubResponse.success,
          output: hubResponse.output,
          error: hubResponse.success ? '' : hubResponse.output,
          requestId: hubResponse.requestId,
          qualityScore: hubResponse.qualityScore || (hubResponse.success ? 0.85 : 0),
          iterations: hubResponse.iterations || 1,
          teamId: hubResponse.teamId || null,
          artifacts: hubResponse.artifacts || [],
        };
      } catch (hubError) {
        console.warn(`[Chat Execute] Hub execution failed, falling back to direct: ${hubError}`);
        // Fallback to direct execution
        const { CodeExecutor } = await import('../../cortex/motor/code-execution.js');
        const executor = new CodeExecutor(process.cwd());
        const directResult = await executor.executeInDocker(code, language);

        response = {
          success: directResult.ok,
          output: directResult.stdout,
          error: directResult.stderr,
          requestId,
          qualityScore: directResult.ok ? 0.85 : 0,
          iterations: 1,
          teamId: null,
          artifacts: [],
        };
      }
    } else {
      // Direct execution without team validation
      console.log(`[Chat Execute] Using direct Docker execution for ${language}`);
      const { CodeExecutor } = await import('../../cortex/motor/code-execution.js');
      const executor = new CodeExecutor(process.cwd());
      const directResult = await executor.executeInDocker(code, language);

      response = {
        success: directResult.ok,
        output: directResult.stdout,
        error: directResult.stderr,
        requestId,
        qualityScore: directResult.ok ? 0.85 : 0,
        iterations: 1,
        teamId: null,
        artifacts: [],
      };
    }

    const duration = Date.now() - startTime;

    // Publish execution complete event
    bus.publish('cortex', 'chat:execute:complete', {
      requestId,
      success: response.success,
      duration,
      qualityScore: response.qualityScore,
      timestamp: Date.now(),
    });

    // Log execution for history
    await saveMessage({
      id: requestId,
      type: 'execution',
      content: `[Code Execution] ${language}\n\`\`\`${language}\n${code}\n\`\`\``,
      result: response.success ? response.output : response.error,
      success: response.success,
      qualityScore: response.qualityScore,
      timestamp: new Date().toISOString(),
    });

    if (response.success) {
      res.json(
        successResponse({
          requestId: response.requestId,
          output: response.output,
          success: true,
          language,
          qualityScore: response.qualityScore,
          iterations: response.iterations,
          teamId: response.teamId,
          artifacts: response.artifacts,
          durationMs: duration,
          execution: {
            stdout: response.output,
            stderr: response.error || '',
            exitCode: 0,
          },
        })
      );
    } else {
      res.json({
        ok: false,
        error: response.error || 'Execution failed',
        requestId: response.requestId,
        output: response.output,
        qualityScore: response.qualityScore,
        iterations: response.iterations,
        durationMs: duration,
      });
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Chat Execute] Error:', error);

    // Publish execution error event
    bus.publish('cortex', 'chat:execute:error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      duration,
      timestamp: Date.now(),
    });

    res.status(500).json(errorResponse(error instanceof Error ? error.message : String(error)));
  }
});

/**
 * @route POST /api/v1/chat/command/run
 * @description Quick run - simplified inline execution without full team validation
 * Faster execution for simple scripts
 * V3.3.82: Quick run endpoint for immediate execution
 */
router.post('/command/run', async (req, res) => {
  const { code, language = 'javascript', timeout = 10000 } = req.body;

  if (!code) {
    return res.status(400).json(errorResponse('Code is required'));
  }

  const startTime = Date.now();
  const requestId = `run-${Date.now()}`;

  try {
    console.log(`[Chat Run] ⚡ Quick run ${language} code...`);

    // Import the code executor directly for faster execution
    const { CodeExecutor } = await import('../../cortex/motor/code-execution.js');
    const executor = new CodeExecutor(process.cwd());

    // Execute directly without team validation for speed
    const result = await executor.executeInDocker(code, language);

    const duration = Date.now() - startTime;

    // Log execution
    await saveMessage({
      id: requestId,
      type: 'quick-run',
      content: `[Quick Run] ${language}\n\`\`\`${language}\n${code}\n\`\`\``,
      result: result.ok ? result.stdout : result.stderr,
      success: result.ok,
      timestamp: new Date().toISOString(),
    });

    res.json(
      successResponse({
        requestId,
        output: result.stdout,
        success: result.ok,
        language,
        durationMs: duration,
        execution: {
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
        },
      })
    );
  } catch (error) {
    console.error('[Chat Run] Error:', error);
    res.status(500).json(errorResponse(error instanceof Error ? error.message : String(error)));
  }
});

// Visual Command Handlers
router.post('/command/diagram', async (req, res) => {
  const { description, type = 'flowchart' } = req.body;

  try {
    console.log(`[Chat] Generating ${type} diagram: ${description.substring(0, 50)}...`);

    const diagramPrompt = `Generate a ${type} diagram as a raw SVG for: ${description}

REQUIREMENTS:
- viewBox="0 0 800 500" (use this exact size)
- Dark background: #0a0a0f
- Center content in the viewBox (not top-left corner)
- Use rectangles with rounded corners (rx="8") for nodes
- Use clear lines/arrows connecting elements
- Colors: #06B6D4 (cyan), #8B5CF6 (purple), #EC4899 (pink), #10B981 (green)
- Text must be white (#ffffff) or light gray (#94a3b8)
- Font: sans-serif, sizes 12-16px
- Include proper spacing between elements (min 40px)

Return ONLY the SVG code wrapped in \`\`\`svg tags.`;

    const result = await precog.providers.generate({
      prompt: diagramPrompt,
      system: `You are an expert SVG diagram creator. Generate clean, well-structured SVG diagrams.

CRITICAL RULES:
1. ALWAYS use viewBox="0 0 800 500" 
2. ALWAYS include a dark background rect as first element: <rect width="800" height="500" fill="#0a0a0f"/>
3. CENTER all content - main elements should be around x=400, y=250
4. Use RECTANGLES for boxes/nodes, CIRCLES for points, LINES/PATHS for connections
5. NEVER create random curves or abstract art - create clear, labeled diagrams
6. Each shape must have a PURPOSE - represent a concept, step, or connection
7. Include text labels for all important elements
8. Use consistent styling: stroke-width="2", font-family="sans-serif"

Return ONLY the SVG code block, nothing else.`,
      taskType: 'creative',
    });

    // Extract SVG code from response
    const svgMatch =
      result.content.match(/```svg\n([\s\S]*?)\n```/) ||
      result.content.match(/<svg[\s\S]*?<\/svg>/);
    const diagramCode = svgMatch ? svgMatch[1] || svgMatch[0] : result.content;

    res.json(
      successResponse({
        response: diagramCode,
        visual: {
          type: 'diagram',
          data: diagramCode,
          altText: description,
        },
        provider: result.provider,
        model: result.model,
      })
    );
  } catch (error: unknown) {
    console.error('[Chat] Diagram generation error:', error);
    res.status(500).json(errorResponse(error instanceof Error ? error.message : String(error)));
  }
});

router.post('/command/image', async (req, res) => {
  const { prompt, provider = 'openai', style = 'realistic' } = req.body;

  try {
    console.log(`[Chat] Generating image: ${prompt.substring(0, 50)}...`);

    const enhancedPrompt = `${prompt}. Style: ${style}. High quality, detailed.`;

    const imageResult = await visualCortex.imagine(enhancedPrompt, {
      provider,
    });

    if (imageResult.images && imageResult.images.length > 0) {
      const img = imageResult.images[0];
      if (!img) {
        throw new Error('No images were generated');
      }

      res.json(
        successResponse({
          response: 'Image generated successfully',
          visual: {
            type: 'image',
            data: img.data,
            mimeType: img.mimeType,
            altText: prompt,
          },
          provider,
        })
      );
    } else {
      throw new Error('No images were generated');
    }
  } catch (error: unknown) {
    console.error('[Chat] Image generation error:', error);
    res.status(500).json(errorResponse(error instanceof Error ? error.message : String(error)));
  }
});

router.post('/command/component', async (req, res) => {
  const { name, description, framework = 'react' } = req.body;

  try {
    console.log(`[Chat] Generating ${framework} component: ${name}`);

    const componentPrompt = `Generate a reusable ${framework} component named "${name}" for: ${description}
    Requirements:
    - Clean, modern code
    - Proper type hints (if TypeScript)
    - Responsive design
    - Accessibility features
    Return ONLY the component code in a \`\`\`${framework} code block.`;

    const result = await precog.providers.generate({
      prompt: componentPrompt,
      system: `You are an expert ${framework} developer. Create production-ready components.`,
      taskType: 'code',
    });

    res.json(
      successResponse({
        response: result.content,
        visual: {
          type: 'component',
          data: JSON.stringify({ name, framework, code: result.content }),
          altText: `${framework} component: ${name}`,
        },
        provider: result.provider,
        model: result.model,
      })
    );
  } catch (error: unknown) {
    console.error('[Chat] Component generation error:', error);
    res.status(500).json(errorResponse(error instanceof Error ? error.message : String(error)));
  }
});

// Designer Integration Endpoint
router.post('/design-sync', async (req, res) => {
  const { action, componentId, definition, context } = req.body;

  try {
    console.log(`[Chat] Designer sync: ${action} ${componentId}`);

    // Publish to Designer-Chat Sync Engine via event bus
    bus.publishDesignerAction(
      'nexus',
      'designer:action',
      {
        action,
        target: 'component',
        componentId,
        payload: { definition },
      } as any,
      context
    );

    res.json(
      successResponse({
        message: `Designer sync initiated: ${action}`,
        componentId,
      })
    );
  } catch (error: unknown) {
    console.error('[Chat] Design sync error:', error);
    res.status(500).json(errorResponse(error instanceof Error ? error.message : String(error)));
  }
});

/**
 * Visual-to-Code Generation Endpoint
 * Leverages DeSign Studio (Gemini 2.0 Flash) or DALL-E 3
 * to generate functional code from visual context
 */
router.post('/visual-to-code', async (req, res) => {
  const {
    visualPrompt,
    codePrompt,
    context,
    outputFormat = 'react',
    provider = 'gemini-nano',
    includeImage = false,
    temperature,
    maxTokens,
  } = req.body;

  try {
    console.log(`[Chat] Visual-to-code generation: ${provider}...`);

    if (!visualPrompt || !codePrompt) {
      return res.status(400).json(errorResponse('visualPrompt and codePrompt are required'));
    }

    // Select provider
    let selectedProvider;
    if (provider === 'dalle3' || provider === 'openai') {
      // Use OpenAI provider
      const openaiProvider = new (
        await import('../../precog/providers/openai-image.js')
      ).OpenAIImageProvider();
      if (!openaiProvider.isAvailable()) {
        return res.status(503).json(errorResponse('OpenAI provider unavailable'));
      }
      selectedProvider = openaiProvider;
    } else {
      // Default to Gemini (DeSign Studio)
      const geminiProvider = new (
        await import('../../precog/providers/gemini-image.js')
      ).GeminiImageProvider();
      if (!geminiProvider.isAvailable()) {
        return res.status(503).json(errorResponse('Gemini provider unavailable'));
      }
      selectedProvider = geminiProvider;
    }

    // Generate code from visual context
    const result = await selectedProvider.generateCodeFromContext({
      visualPrompt,
      codePrompt,
      context: context || {},
      outputFormat,
      provider: provider as 'gemini-nano' | 'dalle3',
      includeImage,
      temperature,
      maxTokens,
    });

    // Publish visual generation event
    bus.publishVisual(
      'nexus',
      'visual:code-generated',
      {
        visualPrompt,
        codePrompt,
        provider: result.provider,
        model: result.model,
        codeLength: result.code.length,
        contextAnalysis: result.contextAnalysis,
      },
      context
    );

    // Format response for frontend visual rendering
    res.json(
      successResponse({
        response: result.code, // Main content
        visual: {
          type: 'code',
          data: {
            code: result.code,
            language: result.language,
            framework: result.framework,
          },
        },
        imageUrl: result.imageUrl,
        contextAnalysis: result.contextAnalysis,
        provider: result.provider,
        model: result.model,
      })
    );
  } catch (error: unknown) {
    console.error('[Chat] Visual-to-code error:', error);
    res.status(500).json(errorResponse(error instanceof Error ? error.message : String(error)));
  }
});

// ========================================
// V3 ENDPOINTS — Multi-Provider Orchestration
// ========================================

/**
 * V3 Message Endpoint — Full XAI Transparency
 * Returns responses wrapped with meta showing:
 * - Which providers collaborated
 * - Exact model identifiers (claude-sonnet-4-20250514, gemini-2.0-flash-exp)
 * - Cost breakdown ($0.003 Gemini + $0.008 Claude = $0.011)
 * - Validation trace
 */
router.post('/v3/message', async (req, res) => {
  req.setTimeout(300000);

  const {
    message,
    mode = 'single',
    context,
    attachments,
    fullValidation = false,
    executionMode = 'single', // "single" | "ensemble" | "validation_loop"
  } = req.body;

  if (!message) {
    return res.status(400).json(errorResponse('Message is required'));
  }

  const config = getXAIConfig();
  const wrapper = TransparencyWrapper.create();
  const startTime = Date.now();
  const sessionId = req.body.sessionId || `session-${Date.now()}`;

  try {
    console.log(`[Chat V3] Processing (${executionMode}): ${message.substring(0, 50)}...`);

    // Save User Message
    await saveMessage({
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    });

    // Classify task complexity
    const taskClassification = classifyTaskComplexity(message, mode);
    const shouldFullValidate = fullValidation || requiresFullValidation(taskClassification);

    // Build system prompt
    let systemPrompt = buildV3SystemPrompt(mode, context, attachments);

    // RAG Context
    let ragContext = '';
    let sources: any[] = [];
    try {
      const searchResults = await cortex.hippocampus.vectorStore.search(message, 3);
      if (searchResults?.length > 0) {
        ragContext = searchResults
          .map((r) => `[Source: ${r.doc.metadata?.['source'] || 'KB'}]\n${r.doc.text}`)
          .join('\n\n');
        sources = searchResults.map((r) => ({
          source: r.doc.metadata?.['source'] || 'Knowledge Base',
          relevance: r.score,
        }));
        systemPrompt += `\n\nRelevant Knowledge Base:\n${ragContext}`;
      }
    } catch (err) {
      console.warn('[Chat V3] Vector search failed:', err);
    }

    let result: any;
    let finalEnvelope: XAIEnvelope;
    let workingWrapper: TransparencyWrapper = TransparencyWrapper.create();

    // === EXECUTION MODE DISPATCH ===
    if (executionMode === 'validation_loop' || shouldFullValidate) {
      // Full 4-stage validation: Generate → Review → Test → Optimize
      console.log('[Chat V3] Using VALIDATION_LOOP mode');

      // Create a provider callback for the validation loop
      const providerCallback = async (params: {
        provider: string;
        model: string;
        systemPrompt: string;
        userPrompt: string;
      }) => {
        const startTime = Date.now();
        const response = await precog.providers.generate({
          prompt: params.userPrompt,
          system: params.systemPrompt,
          provider: params.provider,
          model: params.model,
        });
        return {
          content: response.content,
          latencyMs: Date.now() - startTime,
        };
      };

      const validationLoopInstance = new ValidationLoop(providerCallback);
      const validationResult = await validationLoopInstance.execute(message, {
        skipOptimize: false,
        minConfidence: 0.8,
        maxRetries: 2,
      });

      result = {
        content: validationResult.finalContent,
        provider: 'multi-provider',
        model: validationResult.stages.map((s: { model: string }) => s.model).join(' → '),
      };
      // ValidationLoop returns an XAIEnvelope directly
      finalEnvelope = validationResult.wrapper;
    } else if (executionMode === 'ensemble') {
      // Parallel query + synthesis
      console.log('[Chat V3] Using ENSEMBLE mode');
      const ensembleResult = await precog.providers.generateEnsemble({
        prompt: message,
        system: systemPrompt,
        sessionId,
        synthesize: true,
      });

      result = {
        content: ensembleResult.content,
        provider: ensembleResult.provider,
        model: ensembleResult.model,
      };
      // Build wrapper for ensemble mode
      workingWrapper = TransparencyWrapper.create();
      if (ensembleResult.envelope?.meta) {
        workingWrapper.meta
          .setPrimary(ensembleResult.provider, ensembleResult.model)
          .setRouting(
            `ENSEMBLE: ${ensembleResult.meta?.providers?.length || 0} providers`,
            taskClassification,
            'ensemble'
          )
          .setConfidence(0.9, ensembleResult.meta?.consensus || 0.85);
      }
      // Wrap to create envelope
      finalEnvelope = workingWrapper.wrap({
        response: result.content,
        provider: result.provider,
        model: result.model,
      });
    } else {
      // Single provider with transparency
      console.log('[Chat V3] Using SINGLE mode');
      const singleResult = await precog.providers.generateWithTransparency({
        prompt: message,
        system: systemPrompt,
        taskType: mode === 'technical' ? 'code' : 'general',
        sessionId,
        executionMode: 'single',
      });

      result = {
        content: singleResult.content,
        provider: singleResult.provider,
        model: singleResult.model,
      };

      // Build wrapper for single mode
      workingWrapper = TransparencyWrapper.create();
      const latencyMs = Date.now() - startTime;
      const costUsd = 0.015; // Approximate

      workingWrapper.meta
        .addProvider({
          provider: (result.provider || 'gemini') as ProviderTrace['provider'],
          model: result.model || result.provider,
          role: 'generator',
          latency_ms: latencyMs,
          cost_usd: costUsd,
          success: true,
        })
        .setPrimary(result.provider, result.model)
        .setRouting(`Single provider - ${result.provider}`, taskClassification, 'single')
        .setConfidence(0.85);

      // Wrap to create envelope
      finalEnvelope = workingWrapper.wrap({
        response: result.content,
        provider: result.provider,
        model: result.model,
      });
    }

    const latency = Date.now() - startTime;

    // Record telemetry
    cortex.providerFeedbackEngine.recordRequestStart(
      result.provider || 'unknown',
      `req-${Date.now()}`
    );
    cortex.providerFeedbackEngine.recordRequestSuccess(result.provider || 'unknown', latency, 0.85);

    // Add session highlight
    cortex.sessionContextService.addHighlight(sessionId, {
      type: 'achievement',
      icon: '🤖',
      content: `V3 ${executionMode}: ${result.content.substring(0, 60)}...`,
      relevanceScore: 0.95,
    });

    // Save Assistant Response
    await saveMessage({
      id: Date.now().toString(),
      type: 'assistant',
      content: result.content,
      provider: result.provider,
      model: result.model,
      timestamp: new Date().toISOString(),
    });

    // LEARN: Ingest interaction
    learner
      .ingestInteraction(message, result.content, {
        provider: result.provider,
        model: result.model,
        sessionId: sessionId,
        mode: mode,
        executionMode: executionMode,
        meta: finalEnvelope.meta,
      })
      .then(() => {
        bus.publish('precog', 'learning:ingested', {
          sessionId,
          type: 'interaction',
          timestamp: Date.now(),
        });
      })
      .catch((err) => console.error('[Chat V3] Learning failed:', err));

    // Generate summary badge from the envelope we already have
    const badge = generateBadge(finalEnvelope.meta);
    const costBreakdown = formatCostBreakdown(finalEnvelope.meta);

    // V3 Response Format
    res.json({
      ok: true,
      data: {
        response: result.content,
        provider: result.provider,
        model: result.model,
        sources,
        sessionId,
        // V3 Transparency Fields
        badge, // e.g., "gemini-2.0-flash-exp + claude-sonnet-4 | validated | $0.011"
        costBreakdown, // e.g., "$0.003 (gemini) + $0.008 (claude) = $0.011 total"
      },
      meta: finalEnvelope.meta, // Full XAI metadata
      api_version: 'v3',
      timestamp: Date.now(),
    });
  } catch (error: unknown) {
    console.error('[Chat V3] Error:', error);
    const errorEnvelope = wrapper.wrapError(error instanceof Error ? error : String(error));
    res.status(500).json(errorEnvelope);
  }
});

/**
 * V3 Ensemble Endpoint — Query multiple providers in parallel
 */
router.post('/v3/ensemble', async (req, res) => {
  req.setTimeout(300000);

  const { message, providers = ['gemini', 'anthropic', 'openai'], synthesize = true } = req.body;

  if (!message) {
    return res.status(400).json(errorResponse('Message is required'));
  }

  try {
    console.log(`[Chat V3 Ensemble] Querying: ${providers.join(', ')}`);

    const result = await precog.providers.generateEnsemble({
      prompt: message,
      providers,
      synthesize,
      sessionId: req.body.sessionId,
    });

    res.json({
      ok: true,
      data: {
        response: result.content,
        provider: result.provider,
        model: result.model,
        consensus: result.meta?.consensus,
        totalCost: result.meta?.totalCost,
        totalLatency: result.meta?.totalLatency,
      },
      meta: result.envelope?.meta,
      api_version: 'v3',
      timestamp: Date.now(),
    });
  } catch (error: unknown) {
    console.error('[Chat V3 Ensemble] Error:', error);
    res.status(500).json(errorResponse(error instanceof Error ? error.message : String(error)));
  }
});

/**
 * V3 Validate Endpoint — Full 4-stage validation pipeline
 */
router.post('/v3/validate', async (req, res) => {
  req.setTimeout(300000);

  const { message, taskType = 'general' } = req.body;

  if (!message) {
    return res.status(400).json(errorResponse('Message is required'));
  }

  try {
    console.log(`[Chat V3 Validate] Running full validation pipeline...`);

    // Create a provider callback for the validation loop
    const providerCallback = async (params: {
      provider: string;
      model: string;
      systemPrompt: string;
      userPrompt: string;
    }) => {
      const startTime = Date.now();
      const response = await precog.providers.generate({
        prompt: params.userPrompt,
        system: params.systemPrompt,
        provider: params.provider,
        model: params.model,
      });
      return {
        content: response.content,
        latencyMs: Date.now() - startTime,
      };
    };

    const validationLoopInstance = new ValidationLoop(providerCallback);
    const result = await validationLoopInstance.execute(message, {
      skipOptimize: taskType !== 'code',
      minConfidence: taskType === 'code' ? 0.9 : 0.8,
      maxRetries: 2,
    });

    // Build response with full stage details
    res.json({
      ok: true,
      data: {
        response: result.finalContent,
        validationStatus: result.validationStatus,
        consensusScore: result.consensusScore,
        confidenceScore: result.confidenceScore,
        stages: result.stages.map(
          (s: {
            stage: string;
            provider: string;
            model: string;
            status: string;
            score: number;
            feedback?: string;
            latencyMs: number;
          }) => ({
            stage: s.stage,
            provider: s.provider,
            model: s.model,
            status: s.status,
            score: s.score,
            feedback: s.feedback,
            latencyMs: s.latencyMs,
          })
        ),
        totalLatencyMs: result.totalLatencyMs,
      },
      meta: result.wrapper.meta,
      api_version: 'v3',
      timestamp: Date.now(),
    });
  } catch (error: unknown) {
    console.error('[Chat V3 Validate] Error:', error);
    res.status(500).json(errorResponse(error instanceof Error ? error.message : String(error)));
  }
});

/**
 * V3 Config Endpoint — Get/Set XAI configuration
 */
router.get('/v3/config', (req, res) => {
  res.json({
    ok: true,
    data: getXAIConfig(),
    api_version: 'v3',
    timestamp: Date.now(),
  });
});

// ========================================
// V3 Helper Functions
// ========================================

function classifyTaskComplexity(
  prompt: string,
  mode: string
): 'simple' | 'moderate' | 'complex' | 'critical' {
  if (mode === 'technical') return 'complex';
  const complexKeywords = ['implement', 'design', 'architect', 'analyze', 'debug', 'optimize'];
  const criticalKeywords = ['production', 'security', 'performance', 'critical'];

  const lower = prompt.toLowerCase();
  if (criticalKeywords.some((k) => lower.includes(k))) return 'critical';
  if (complexKeywords.some((k) => lower.includes(k))) return 'complex';
  if (prompt.length > 500) return 'moderate';
  return 'simple';
}

function buildV3SystemPrompt(mode: string, context?: string, attachments?: any[]): string {
  let systemPrompt = `You are TooLoo.ai V3, the central intelligence of the Synapsys Architecture.

SYSTEM IDENTITY:
- You are an Orchestrator AI managing a multi-provider ecosystem
- You were created by Ori Pridan
- You coordinate: OpenAI (GPT-4), Anthropic (Claude), Google (Gemini), DeepSeek
- You control: DeSign Studio (visual), Precog (routing), Cortex (cognition)

V3 CAPABILITIES:
- Multi-provider validation: Generate → Review → Test → Optimize
- Ensemble mode: Parallel provider queries with synthesis
- Transparent responses: Every response shows which providers collaborated
- Cost tracking: Per-response cost breakdown
- Visuals: Use the best format (chart, mermaid, ascii, emoji, svg) based on content type

Be helpful, accurate, and transparent about your multi-provider orchestration.`;

  switch (mode) {
    case 'quick':
      systemPrompt += ' Be concise and direct.';
      break;
    case 'technical':
      systemPrompt += ' Provide detailed technical explanations with code examples.';
      break;
    case 'creative':
      systemPrompt += ' Be creative and exploratory.';
      break;
    case 'structured':
      systemPrompt += ' Output in structured format (JSON, tables, lists).';
      break;
  }

  if (context) systemPrompt += `\n\nContext:\n${context}`;
  if (attachments?.length) systemPrompt += `\n\nAttachments:\n${JSON.stringify(attachments)}`;

  return systemPrompt;
}

// ============================================================================
// V3.3.532: CHAT HISTORY ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/chat/history
 * Get chat history for the authenticated user
 * @query {number} limit - Maximum messages to return (default: 100)
 * @query {number} offset - Offset for pagination (default: 0)
 */
router.get('/history', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const history = await loadHistory(userId);
    const total = history.length;
    const paged = history.slice(offset, offset + limit);
    
    res.json(successResponse({
      messages: paged,
      total,
      limit,
      offset,
      userId: userId || 'anonymous',
    }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Chat] Failed to get history:', errorMessage);
    res.status(500).json(errorResponse('Failed to load chat history'));
  }
});

/**
 * DELETE /api/v1/chat/history
 * Clear chat history for the authenticated user
 */
router.delete('/history', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const historyPath = getHistoryPath(userId);
    
    // Write empty array to clear history
    await fs.writeFile(historyPath, '[]');
    
    res.json(successResponse({
      message: 'Chat history cleared',
      userId: userId || 'anonymous',
    }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Chat] Failed to clear history:', errorMessage);
    res.status(500).json(errorResponse('Failed to clear chat history'));
  }
});

export default router;
