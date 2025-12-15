/**
 * @file ChatSkill - Skill Definition
 * @description Complete vertical slice for the Chat feature
 * @version 1.0.0
 *
 * This is the DEFINITION file that ties together:
 * - Intent (when to activate)
 * - Logic (backend execution)
 * - UI (frontend component)
 *
 * Everything about "Chat" lives in this folder.
 */

import { z } from 'zod';
import { defineSkill, defaultClassifiers, type Skill } from '../../kernel/index.js';
import { chatExecute, type ChatInput, type ChatOutput } from './logic.js';

// =============================================================================
// INPUT/OUTPUT SCHEMAS
// =============================================================================

export const ChatInputSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  conversationId: z.string().optional(),
  options: z
    .object({
      model: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
      systemPrompt: z.string().optional(),
    })
    .optional(),
}) as z.ZodType<ChatInput>;

export const ChatOutputSchema = z.object({
  response: z.string(),
  conversationId: z.string(),
  history: z.array(
    z.object({
      id: z.string(),
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
      timestamp: z.number(),
      metadata: z
        .object({
          model: z.string().optional(),
          tokens: z.number().optional(),
          duration: z.number().optional(),
        })
        .optional(),
    })
  ),
  metadata: z.object({
    model: z.string(),
    processingTime: z.number(),
    inputTokens: z.number().optional(),
    outputTokens: z.number().optional(),
  }),
}) as z.ZodType<ChatOutput>;

// =============================================================================
// SKILL DEFINITION
// =============================================================================

/**
 * ChatSkill - The conversational AI feature
 *
 * This skill handles all chat/conversation functionality.
 * It's the default fallback for natural language input.
 */
export const ChatSkill = defineSkill<ChatInput, ChatOutput>({
  id: 'core.chat',
  name: 'Chat',
  description: 'Conversational AI assistant for general questions and discussions',
  version: '1.0.0',
  category: 'core',

  // ---------------------------------------------------------------------------
  // INTENT: When does this skill activate?
  // ---------------------------------------------------------------------------
  intent: {
    triggers: [
      '/chat', // Explicit command
      '/talk', // Alternative command
      'chat', // Keyword
      'hello', // Greeting
      'hi', // Greeting
      'hey', // Greeting
    ],
    classifier: defaultClassifiers.chat,
    priority: 10, // High priority - this is the default skill
    requires: {
      auth: false, // Chat is available without authentication
    },
  },

  // ---------------------------------------------------------------------------
  // LOGIC: The backend brain
  // ---------------------------------------------------------------------------
  schema: ChatInputSchema,
  outputSchema: ChatOutputSchema,
  execute: chatExecute,

  // ---------------------------------------------------------------------------
  // UI: Frontend configuration
  // ---------------------------------------------------------------------------
  ui: {
    icon: 'message-circle',
    placement: 'main',
    shortcut: 'Alt+C',
  },

  // Component path - loaded dynamically by the frontend
  component: 'skills/chat/ui',

  // ---------------------------------------------------------------------------
  // LIFECYCLE HOOKS
  // ---------------------------------------------------------------------------
  hooks: {
    onLoad: async (_context) => {
      console.log('[ChatSkill] Loaded');
      // context.services may not be available during initial load
    },

    onActivate: async (_context) => {
      console.log('[ChatSkill] Activated');
      // Could load conversation history here
    },

    onDeactivate: async () => {
      console.log('[ChatSkill] Deactivated');
      // Could save state here
    },
  },
});

// =============================================================================
// EXPORTS
// =============================================================================

export default ChatSkill;

// Re-export types for consumers
export type { ChatInput, ChatOutput, ChatMessage } from './logic.js';
