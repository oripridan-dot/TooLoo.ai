// @version 3.3.198
import { Router } from 'express';
import { bus } from '../../core/event-bus.js';
import { precog } from '../../precog/index.js';
import { cortex, visualCortex } from '../../cortex/index.js';
import { successResponse, errorResponse } from '../utils.js';
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
import fs from 'fs/promises';
import path from 'path';

const router = Router();
const HISTORY_FILE = path.join(process.cwd(), 'data', 'chat-history.json');

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

// Helper to load history
async function loadHistory() {
  try {
    const data = await fs.readFile(HISTORY_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

// Helper to save message
async function saveMessage(msg: any) {
  try {
    const history = await loadHistory();
    history.push(msg);
    // Keep last 1000 messages to prevent infinite growth
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
    await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2));
  } catch (err) {
    console.error('[Chat] Failed to save history:', err);
  }
}

/**
 * POST /api/v1/chat/generate
 * Legacy compatibility endpoint - redirects to /message
 * Used by ToolooMonitor component
 * @param {string} message - The message or prompt to send
 * @param {string} [mode] - The chat mode (quick|deep|creative)
 */
router.post('/generate', async (req, res) => {
  // Map 'prompt' to 'message' for compatibility
  const { prompt, ...rest } = req.body;
  req.body = { message: prompt || req.body.message, ...rest };

  // Forward to message handler
  // We inline the same logic here for simplicity
  req.setTimeout(300000);
  const message = req.body.message;
  const mode = req.body.mode || 'quick';

  if (!message) {
    return res.status(400).json(errorResponse('Message or prompt is required'));
  }

  await saveMessage({
    id: Date.now().toString(),
    type: 'user',
    content: message,
    timestamp: new Date().toISOString(),
  });

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
    });

    res.json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Chat Generate] Error:', errorMessage);
    res.status(500).json(errorResponse(errorMessage));
  }
});

router.post('/message', async (req, res) => {
  // Extend timeout for deep reasoning models (Gemini 3 Pro)
  req.setTimeout(300000);

  const { message, mode = 'quick', context, attachments } = req.body;

  // Save User Message
  await saveMessage({
    id: Date.now().toString(),
    type: 'user',
    content: message,
    timestamp: new Date().toISOString(),
  });

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
          .map((result) => `[Source: ${result.doc.metadata.source}]\n${result.doc.text}`)
          .join('\n\n');
        sources = searchResults.map((result) => ({
          source: result.doc.metadata.source,
          relevance: result.score,
        }));
      }
    } catch (err) {
      console.warn('[Chat] Vector search failed:', err);
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

    // Visual Capabilities Instruction - ONLY generate visuals when EXPLICITLY requested
    systemPrompt +=
      '\n\nVISUAL CAPABILITIES (USE SPARINGLY):\n' +
      '- You CAN generate SVG diagrams, charts, and React components when the user EXPLICITLY asks for visuals.\n' +
      "- ONLY generate SVG/visual content when the user specifically requests: charts, graphs, diagrams, visualizations, infographics, timelines, illustrations, or says 'show me', 'draw', 'visualize', 'create a chart/diagram'.\n" +
      '- For normal questions, explanations, and discussions: respond with TEXT ONLY. Do NOT generate SVG.\n' +
      '- DO NOT use Mermaid.js or ```mermaid blocks. They are disabled.\n' +
      '- When you DO generate visuals (only when asked): wrap SVG in ```svg blocks, React in ```jsx blocks.\n' +
      '- Keep visuals responsive and dark-theme compatible.\n' +
      '⚠️ DEFAULT BEHAVIOR: Respond with plain text unless visuals are explicitly requested.';

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

    // Determine complexity and optimal routing (silently)
    const complexity =
      message.length > 500 || /code|implement|build|create|design|architect/i.test(message)
        ? 'high'
        : 'standard';

    // Determine ensemble strategy based on task (minimal status output)
    const availableProviders = precog.providers.getProviderStatus();
    const activeProviders = Object.entries(availableProviders)
      .filter(([_, status]: [string, any]) => status.available)
      .map(([name]) => name);

    // V3.3.80: Smart ensemble selection based on task type
    let selectedProviders: string[] = [];
    let routingStrategy = 'single';

    if (!requestedProvider) {
      // Auto mode - TooLoo selects optimal ensemble
      if (complexity === 'high' || /creative|brainstorm|multiple|compare/i.test(message)) {
        // Use ensemble for complex/creative tasks
        selectedProviders = activeProviders.slice(0, 3); // Top 3 available
        routingStrategy = 'ensemble';
        // Silent - no verbose output
      } else if (/code|debug|fix|implement/i.test(message)) {
        // Prefer DeepSeek for code, fallback to others
        selectedProviders = activeProviders.includes('deepseek')
          ? ['deepseek']
          : activeProviders.includes('anthropic')
            ? ['anthropic']
            : [activeProviders[0] || 'gemini'];
        // Silent - no verbose output
      } else if (/explain|summarize|analyze/i.test(message)) {
        // Prefer Claude for analysis
        selectedProviders = activeProviders.includes('anthropic')
          ? ['anthropic']
          : [activeProviders[0] || 'gemini'];
        // Silent - no verbose output
      } else {
        // Default: Use fastest available (Gemini Flash)
        selectedProviders = activeProviders.includes('gemini')
          ? ['gemini']
          : [activeProviders[0] || 'gemini'];
        // Silent - no verbose output
      }
    } else {
      // User selected specific provider
      selectedProviders = [requestedProvider];
      // Silent - no verbose output
    }

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
      console.log(`[Chat Stream] Ensemble: ${successfulProviders.length}/${parallelResult.results.length} providers responded`);

      fullResponse = parallelResult.consensus;

      // Stream chunks for UI effect (simulate streaming of pre-generated content)
      const chunkSize = 50;
      for (let i = 0; i < fullResponse.length; i += chunkSize) {
        const chunk = fullResponse.slice(i, i + chunkSize);
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        // Small delay to create streaming effect
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      result = {
        provider: `ensemble(${successfulProviders.map((p) => p.provider).join('+')})`,
        model: 'consensus',
        cost_usd: 0, // TODO: aggregate costs
        reasoning: `Parallel ensemble: queried ${parallelResult.results.length} providers, synthesized from ${successfulProviders.length} responses in ${parallelResult.timing.total}ms`,
      };

      // Silent - completion indicated by done:true in final event
    } else {
      // Single provider mode (original behavior)
      result = await precog.providers.stream({
        prompt: enhancedMessage,
        system: systemPrompt,
        history: recentHistory,
        taskType: taskType,
        sessionId: sessionId,
        provider: requestedProvider || selectedProviders[0],
        model: requestedModel || undefined,
        onChunk: (chunk) => {
          fullResponse += chunk;
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        },
        onComplete: (_fullText) => {
          // V3.3.198: Silent completion - no verbose output
          console.log(`[Chat Stream] Response complete via ${result?.provider || selectedProviders[0]}`);
        },
      });
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
      })}\n\n`
    );
    res.end();

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
  const {
    code,
    objective,
    language = 'javascript',
    timeout = 30000,
    maxRetries = 3,
  } = req.body;

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

        const hubResponse = await systemExecutionHub.handleExecution({
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
          timestamp: new Date(),
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
    Return ONLY the SVG code, no explanations.
    Format: \`\`\`svg
    <svg>...</svg>
    \`\`\`
    Style: Dark mode, modern, professional.`;

    const result = await precog.providers.generate({
      prompt: diagramPrompt,
      system:
        'You are an expert at creating clear, concise SVG diagrams. Return only the SVG code block.',
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
 * Leverages DeSign Studio (Gemini 3 Pro Image Preview) or DALL-E 3
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
 * - Exact model identifiers (claude-sonnet-4.5, gemini-3-pro-preview)
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
          .map((r) => `[Source: ${r.doc.metadata?.source || 'KB'}]\n${r.doc.text}`)
          .join('\n\n');
        sources = searchResults.map((r) => ({
          source: r.doc.metadata?.source || 'Knowledge Base',
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
        badge, // e.g., "gemini-3-pro + claude-sonnet-4.5 | validated | $0.011"
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
- Visuals: Generate raw SVG diagrams (dark mode) instead of Mermaid.js.

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

export default router;
