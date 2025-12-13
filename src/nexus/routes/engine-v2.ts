// @version 2.0.NaN
/**
 * Engine V2 Routes - Connects the @tooloo/engine package to the API
 * 
 * This exposes the new skill-based orchestrator with tool execution capabilities.
 * The AI can now use file_write, file_read, list_files tools.
 */

import { Router, Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils.js';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';

// Import from @tooloo packages
import { createSkillRegistry, defineSkill } from '@tooloo/skills';
import { createProviderRegistry } from '@tooloo/providers';
import { createOrchestrator, type OrchestratorConfig } from '@tooloo/engine';

const router = Router();

// =============================================================================
// INITIALIZE V2 ENGINE
// =============================================================================

// Create skill registry with default skills
const skillRegistry = createSkillRegistry();

// Register a general-purpose coding skill
skillRegistry.register(defineSkill({
  id: 'general-assistant',
  name: 'General Assistant',
  description: 'A general-purpose AI assistant that can help with coding, file operations, and more',
  instructions: `You are TooLoo.ai, a powerful AI assistant with the ability to modify files directly.

## Your Capabilities
- Read and write files in the project
- Analyze code and provide suggestions
- Execute multi-step tasks autonomously

## Tool Usage
When you need to create or modify a file, use this EXACT format on a new line:
:::tool{name="file_write"}
{"path": "relative/path/to/file.ts", "content": "file content here"}
:::

When you need to read a file:
:::tool{name="file_read"}
{"path": "relative/path/to/file.ts"}
:::

When you need to list directory contents:
:::tool{name="list_files"}
{"path": "relative/directory"}
:::

Always be helpful, precise, and proactive. When asked to create something, DO IT - don't just explain how.`,
  triggerPatterns: [/.*/], // Matches everything as fallback
  keywords: ['help', 'code', 'create', 'write', 'file', 'build', 'implement'],
  category: 'general',
  priority: 0,
  context: {
    maxTokens: 4096,
    includeHistory: true,
    maxHistoryMessages: 10,
  },
  tools: [
    { name: 'file_write', required: false },
    { name: 'file_read', required: false },
    { name: 'list_files', required: false },
  ],
  modelRequirements: {
    minCapability: 'advanced',
    preferredProviders: ['anthropic', 'openai', 'deepseek', 'gemini'],
    temperature: 0.7,
  },
}));

// Register a code generation skill
skillRegistry.register(defineSkill({
  id: 'code-generation',
  name: 'Code Generator',
  description: 'Specialized skill for generating code with file operations',
  instructions: `You are a code generation specialist. Your primary function is to write and create code files.

## IMPORTANT: You have REAL file system access!
When the user asks you to create a file, you MUST actually create it using the tool syntax below.

## Tool Format (STRICT)
:::tool{name="file_write"}
{"path": "path/to/file.ts", "content": "your code here"}
:::

## Guidelines
1. Always write complete, working code
2. Include proper imports and types
3. Follow the project's coding style
4. Create files in appropriate directories
5. When creating multiple files, create them one by one

DO NOT just show code - CREATE THE FILES!`,
  triggerPatterns: [
    /create\s+(a\s+)?file/i,
    /write\s+(a\s+)?(function|class|component|module)/i,
    /implement/i,
    /generate\s+code/i,
    /build\s+(a\s+)?/i,
  ],
  keywords: ['create', 'write', 'implement', 'generate', 'build', 'code', 'function', 'class', 'component'],
  category: 'coding',
  priority: 10,
  context: {
    maxTokens: 8192,
    includeHistory: true,
    maxHistoryMessages: 5,
  },
  tools: [
    { name: 'file_write', required: true },
    { name: 'file_read', required: false },
    { name: 'list_files', required: false },
  ],
  modelRequirements: {
    minCapability: 'advanced',
    preferredProviders: ['anthropic', 'deepseek', 'openai'],
    temperature: 0.3,
  },
}));

// Create provider registry
const providerRegistry = createProviderRegistry();

// Register available providers based on environment
if (process.env.ANTHROPIC_API_KEY) {
  providerRegistry.register('anthropic', {
    type: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
    defaultModel: 'claude-3-5-sonnet-20241022',
  });
}

if (process.env.OPENAI_API_KEY) {
  providerRegistry.register('openai', {
    type: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    defaultModel: 'gpt-4o',
  });
}

if (process.env.DEEPSEEK_API_KEY) {
  providerRegistry.register('deepseek', {
    type: 'deepseek',
    apiKey: process.env.DEEPSEEK_API_KEY,
    defaultModel: 'deepseek-chat',
  });
}

// Always try to register Gemini (Google AI)
const googleKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
if (googleKey) {
  providerRegistry.register('gemini', {
    type: 'gemini',
    apiKey: googleKey,
    defaultModel: 'gemini-1.5-flash',
  });
}

// Determine default provider
const defaultProvider = process.env.ANTHROPIC_API_KEY ? 'anthropic' 
  : process.env.DEEPSEEK_API_KEY ? 'deepseek'
  : process.env.OPENAI_API_KEY ? 'openai'
  : 'gemini';

// Create orchestrator with config
const orchestratorConfig: Partial<OrchestratorConfig> = {
  defaultProvider,
  defaultModel: 'auto',
  routing: {
    semantic: false, // Start with keyword routing
    minConfidence: 0.3,
  },
  execution: {
    maxRetries: 2,
    timeoutMs: 60000,
    enableTools: true,
  },
};

let orchestrator: ReturnType<typeof createOrchestrator> | null = null;

// Lazy initialization
function getOrchestrator() {
  if (!orchestrator) {
    orchestrator = createOrchestrator(
      skillRegistry,
      providerRegistry,
      orchestratorConfig
    );
    console.log('[Engine-V2] Orchestrator initialized with tool support');
  }
  return orchestrator;
}

// =============================================================================
// ROUTES
// =============================================================================

/**
 * @route POST /api/v1/engine/chat
 * @description Process a message through the V2 engine with tool execution
 */
router.post('/chat', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { message, sessionId, projectId } = req.body;
    
    if (!message || typeof message !== 'string') {
      return errorResponse(res, 'Message is required', 400);
    }
    
    const orch = getOrchestrator();
    const result = await orch.process(
      message,
      sessionId || `session-${Date.now()}`,
      projectId
    );
    
    return successResponse(res, {
      response: result.content,
      artifacts: result.artifacts,
      toolCalls: result.toolCalls,
      tokens: result.tokenCount,
      latencyMs: result.latencyMs,
    });
  } catch (error) {
    console.error('[Engine-V2] Chat error:', error);
    return errorResponse(res, String(error), 500);
  }
});

/**
 * @route POST /api/v1/engine/stream
 * @description Stream a response from the V2 engine
 */
router.post('/stream', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { message, sessionId, projectId } = req.body;
    
    if (!message || typeof message !== 'string') {
      return errorResponse(res, 'Message is required', 400);
    }
    
    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const orch = getOrchestrator();
    
    for await (const chunk of orch.processStream(message, sessionId, projectId)) {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }
    
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('[Engine-V2] Stream error:', error);
    res.write(`data: ${JSON.stringify({ error: String(error) })}\n\n`);
    res.end();
  }
});

/**
 * @route GET /api/v1/engine/status
 * @description Get the status of the V2 engine
 */
router.get('/status', (_req: Request, res: Response) => {
  const providers = providerRegistry.list();
  const skills = skillRegistry.list();
  
  return successResponse(res, {
    status: 'ready',
    version: '2.0.0-alpha',
    providers: providers.map(p => p.id),
    skills: skills.map(s => ({ id: s.id, name: s.name, priority: s.priority })),
    defaultProvider,
    toolsEnabled: true,
    availableTools: ['file_write', 'file_read', 'list_files'],
  });
});

/**
 * @route POST /api/v1/engine/reset
 * @description Reset the session state
 */
router.post('/reset', optionalAuth, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const orch = getOrchestrator();
    orch.resetSession();
    return successResponse(res, { message: 'Session reset' });
  } catch (error) {
    return errorResponse(res, String(error), 500);
  }
});

export default router;
