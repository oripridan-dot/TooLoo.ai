/**
 * @tooloo/api - Main Entry Point
 * Starts the TooLoo.ai API server with fully wired Orchestrator
 *
 * @version 1.1.0
 * @skill-os true
 * @updated 2025-12-15
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load .env from workspace root
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../../.env') });

import { TooLooServer } from './server.js';
import { Orchestrator } from '@tooloo/engine';
import { SkillRegistry, SkillHotReloader } from '@tooloo/skills';
import { createProviderId, createSkillId } from '@tooloo/core';
import {
  ProviderRegistry,
  DeepSeekProvider,
  AnthropicProvider,
  OpenAIProvider,
  GeminiProvider,
} from '@tooloo/providers';

// Kernel Bridge for seamless Kernel → Orchestrator integration
import { orchestratorBridge } from '../../../src/kernel/orchestrator-bridge.js';

// Export everything
export * from './server.js';
export * from './types.js';
export * from './routes/index.js';
export * from './socket/handlers.js';

// =============================================================================
// PROVIDER INITIALIZATION
// =============================================================================

function initializeProviders(): ProviderRegistry {
  const registry = new ProviderRegistry();

  console.log('  Checking environment variables...');
  console.log(`  DEEPSEEK_API_KEY: ${process.env.DEEPSEEK_API_KEY ? '✓ set' : '✗ missing'}`);
  console.log(`  ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✓ set' : '✗ missing'}`);
  console.log(`  OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✓ set' : '✗ missing'}`);
  console.log(`  GOOGLE_API_KEY: ${process.env.GOOGLE_API_KEY ? '✓ set' : '✗ missing'}`);

  // DeepSeek - Cost-effective, great for coding
  if (process.env.DEEPSEEK_API_KEY) {
    registry.register(
      new DeepSeekProvider({
        id: createProviderId('deepseek'),
        name: 'DeepSeek',
        apiKey: process.env.DEEPSEEK_API_KEY,
        defaultModel: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        enabled: true,
        models: [
          {
            id: 'deepseek-chat',
            name: 'DeepSeek Chat',
            contextWindow: 64000,
            maxOutputTokens: 8192,
            capabilities: [
              { domain: 'coding', level: 'expert', score: 95 },
              { domain: 'reasoning', level: 'proficient', score: 85 },
              { domain: 'creative', level: 'capable', score: 70 },
              { domain: 'analysis', level: 'proficient', score: 80 },
            ],
            costPer1kInput: 0.00014,
            costPer1kOutput: 0.00028,
            supportsStreaming: true,
            supportsFunctionCalling: true,
            supportsVision: false,
          },
        ],
      })
    );
    console.log('  ✓ DeepSeek provider initialized');
  }

  // Anthropic (Claude) - Best for reasoning and analysis
  if (process.env.ANTHROPIC_API_KEY) {
    registry.register(
      new AnthropicProvider({
        id: createProviderId('anthropic'),
        name: 'Anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY,
        defaultModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
        enabled: true,
        models: [
          {
            id: 'claude-sonnet-4-20250514',
            name: 'Claude Sonnet 4',
            contextWindow: 200000,
            maxOutputTokens: 8192,
            capabilities: [
              { domain: 'coding', level: 'expert', score: 92 },
              { domain: 'reasoning', level: 'expert', score: 98 },
              { domain: 'creative', level: 'proficient', score: 88 },
              { domain: 'analysis', level: 'expert', score: 95 },
            ],
            costPer1kInput: 0.003,
            costPer1kOutput: 0.015,
            supportsStreaming: true,
            supportsFunctionCalling: true,
            supportsVision: true,
          },
        ],
      })
    );
    console.log('  ✓ Anthropic provider initialized');
  }

  // OpenAI - General purpose
  if (process.env.OPENAI_API_KEY) {
    registry.register(
      new OpenAIProvider({
        id: createProviderId('openai'),
        name: 'OpenAI',
        apiKey: process.env.OPENAI_API_KEY,
        defaultModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        enabled: true,
        models: [
          {
            id: 'gpt-4o-mini',
            name: 'GPT-4o Mini',
            contextWindow: 128000,
            maxOutputTokens: 16384,
            capabilities: [
              { domain: 'coding', level: 'proficient', score: 85 },
              { domain: 'reasoning', level: 'proficient', score: 85 },
              { domain: 'creative', level: 'proficient', score: 88 },
              { domain: 'analysis', level: 'proficient', score: 85 },
            ],
            costPer1kInput: 0.00015,
            costPer1kOutput: 0.0006,
            supportsStreaming: true,
            supportsFunctionCalling: true,
            supportsVision: true,
          },
        ],
      })
    );
    console.log('  ✓ OpenAI provider initialized');
  }

  // Google Gemini - Multi-modal with advanced reasoning
  if (process.env.GOOGLE_API_KEY) {
    registry.register(
      new GeminiProvider({
        id: createProviderId('gemini'),
        name: 'Gemini',
        apiKey: process.env.GOOGLE_API_KEY,
        defaultModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
        enabled: true,
        models: [
          {
            id: 'gemini-2.0-flash',
            name: 'Gemini 2.0 Flash',
            contextWindow: 1048576, // 1M tokens
            maxOutputTokens: 8192,
            capabilities: [
              { domain: 'coding', level: 'proficient', score: 88 },
              { domain: 'reasoning', level: 'expert', score: 92 },
              { domain: 'creative', level: 'proficient', score: 85 },
              { domain: 'analysis', level: 'expert', score: 90 },
            ],
            costPer1kInput: 0.000075,
            costPer1kOutput: 0.0003,
            supportsStreaming: true,
            supportsFunctionCalling: true,
            supportsVision: true,
          },
        ],
      })
    );
    console.log('  ✓ Gemini provider initialized');
  }

  console.log(`  Total providers: ${registry.getAll().length}`);
  return registry;
}

// =============================================================================
// SKILL REGISTRATION
// =============================================================================

function initializeSkills(): SkillRegistry {
  const registry = new SkillRegistry();

  // Default Chat Skill
  registry.register({
    id: createSkillId('chat'),
    name: 'General Chat',
    version: '1.0.0',
    description: 'General conversation and Q&A',
    instructions: `You are TooLoo, a helpful AI assistant. You are friendly, concise, and knowledgeable.
Respond naturally and helpfully to the user's questions and requests.
Keep responses focused and avoid unnecessary verbosity.`,
    tools: [],
    triggers: {
      intents: ['chat'],
      keywords: ['hello', 'hi', 'help', 'what', 'how', 'why', 'explain', 'tell me'],
    },
    context: {
      maxTokens: 4096,
      ragSources: ['memory'],
      memoryScope: 'session',
      includeHistory: true,
      maxHistoryMessages: 10,
    },
    composability: {
      requires: [],
      enhances: [],
      conflicts: [],
      priority: 0,
    },
    modelRequirements: {
      temperature: 0.7,
      preferredProviders: ['anthropic', 'openai', 'deepseek'],
    },
  });

  // Code Generation Skill
  registry.register({
    id: createSkillId('code'),
    name: 'Code Generation',
    version: '1.0.0',
    description: 'Write, explain, and debug code',
    instructions: `You are TooLoo, an expert software engineer. 
Write clean, well-documented, production-quality code.
Follow best practices and include helpful comments.
If asked to debug, explain the issue clearly before providing the fix.`,
    tools: [],
    triggers: {
      intents: ['code'],
      keywords: [
        'code',
        'function',
        'class',
        'implement',
        'write',
        'debug',
        'fix',
        'typescript',
        'javascript',
        'python',
        'react',
      ],
    },
    context: {
      maxTokens: 8192,
      ragSources: ['codebase', 'docs'],
      memoryScope: 'project',
      includeHistory: true,
      maxHistoryMessages: 5,
    },
    composability: {
      requires: [],
      enhances: ['analyze'],
      conflicts: [],
      priority: 10,
    },
    modelRequirements: {
      temperature: 0.3,
      capabilities: ['coding'],
      preferredProviders: ['deepseek', 'anthropic', 'openai'],
    },
  });

  // Analysis Skill
  registry.register({
    id: createSkillId('analyze'),
    name: 'Analysis & Reasoning',
    version: '1.0.0',
    description: 'Deep analysis and complex reasoning',
    instructions: `You are TooLoo, an expert analyst. 
Think step-by-step and provide thorough, well-reasoned analysis.
Consider multiple perspectives and potential edge cases.
Structure your response with clear sections when appropriate.`,
    tools: [],
    triggers: {
      intents: ['analyze'],
      keywords: ['analyze', 'think', 'reason', 'evaluate', 'compare', 'pros', 'cons', 'tradeoffs'],
    },
    context: {
      maxTokens: 8192,
      ragSources: ['memory', 'docs'],
      memoryScope: 'session',
      includeHistory: true,
      maxHistoryMessages: 10,
    },
    composability: {
      requires: [],
      enhances: ['code'],
      conflicts: [],
      priority: 5,
    },
    modelRequirements: {
      temperature: 0.5,
      capabilities: ['reasoning', 'analysis'],
      preferredProviders: ['anthropic', 'openai', 'deepseek'],
    },
  });

  console.log(`✓ ${registry.getAll().length} skills registered`);
  return registry;
}

// =============================================================================
// MAIN
// =============================================================================

const isMain = process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js');

if (isMain) {
  const port = parseInt(process.env.API_PORT || '4001', 10);
  const host = process.env.API_HOST || '0.0.0.0';

  console.log('\n🔧 Initializing TooLoo.ai V2...\n');

  // Initialize providers
  const providerRegistry = initializeProviders();

  // Initialize skills
  const skillRegistry = initializeSkills();

  // Initialize hot reloader for YAML skills
  const skillsDir = resolve(__dirname, '../../../skills');
  const hotReloader = new SkillHotReloader(skillRegistry, {
    skillsDir,
    verbose: true,
  });

  // Create orchestrator
  const orchestrator = new Orchestrator(skillRegistry, providerRegistry, {
    defaultProvider: 'deepseek',
    routing: {
      semantic: false, // Disabled until embeddings service is implemented
      minConfidence: 0.5, // Balanced for intent-based routing
      semanticWeight: 0.6,
      keywordWeight: 0.3, // When semantic=false: keyword*0.4 + intent*0.6
    },
  });
  console.log('✓ Orchestrator initialized');

  // ==========================================================================
  // KERNEL-ORCHESTRATOR BRIDGE
  // Seamlessly connects the Kernel to real LLM providers
  // ==========================================================================
  orchestratorBridge.initialize(providerRegistry);
  orchestratorBridge.setOrchestrator(orchestrator);

  // Import and connect to kernel
  import('../../../src/kernel/kernel.js')
    .then(({ kernel }) => {
      orchestratorBridge.connect(kernel);
      console.log('✓ Kernel-Orchestrator Bridge connected');
    })
    .catch((err) => {
      console.warn('⚠ Could not connect Kernel-Orchestrator Bridge:', err.message);
    });
  console.log('');

  // Create server with orchestrator
  const server = new TooLooServer({
    port,
    host,
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(
      ','
    ),
    orchestrator,
    skillRegistry,
  });

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM, shutting down gracefully...');
    hotReloader.stop();
    await server.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    hotReloader.stop();
    await server.stop();
    process.exit(0);
  });

  // Start the server and hot reloader
  Promise.all([server.start(), hotReloader.start()]).catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
