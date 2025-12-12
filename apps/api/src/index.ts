/**
 * @tooloo/api - Main Entry Point
 * Starts the TooLoo.ai API server with fully wired Orchestrator
 * 
 * @version 2.0.0-alpha.0
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load .env from workspace root
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../../.env') });

import { TooLooServer } from './server.js';
import { Orchestrator } from '@tooloo/engine';
import { SkillRegistry } from '@tooloo/skills';
import { createProviderId } from '@tooloo/core';
import { 
  ProviderRegistry, 
  DeepSeekProvider, 
  AnthropicProvider, 
  OpenAIProvider 
} from '@tooloo/providers';

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

  // DeepSeek - Cost-effective, great for coding
  if (process.env.DEEPSEEK_API_KEY) {
    registry.register(new DeepSeekProvider({
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
    }));
    console.log('  ✓ DeepSeek provider initialized');
  }

  // Anthropic (Claude) - Best for reasoning and analysis
  if (process.env.ANTHROPIC_API_KEY) {
    registry.register(new AnthropicProvider({
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
    }));
    console.log('  ✓ Anthropic provider initialized');
  }

  // OpenAI - General purpose
  if (process.env.OPENAI_API_KEY) {
    registry.register(new OpenAIProvider({
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
    }));
    console.log('  ✓ OpenAI provider initialized');
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
    id: 'chat',
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
    id: 'code',
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
      keywords: ['code', 'function', 'class', 'implement', 'write', 'debug', 'fix', 'typescript', 'javascript', 'python', 'react'],
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
    id: 'analyze',
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

  // Create orchestrator
  const orchestrator = new Orchestrator(skillRegistry, providerRegistry, {
    routing: {
      defaultProvider: 'deepseek',
      fallbackChain: ['deepseek', 'anthropic', 'openai'],
    },
  });
  console.log('✓ Orchestrator initialized\n');

  // Create server with orchestrator
  const server = new TooLooServer({
    port,
    host,
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(','),
    orchestrator,
  });

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  // Start the server
  server.start().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
