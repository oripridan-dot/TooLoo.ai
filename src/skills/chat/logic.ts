/**
 * @file ChatSkill - Logic Layer
 * @description Backend brain for the Chat skill
 * @version 1.0.0
 *
 * This file contains all the server-side logic for chat.
 * It handles message processing, history management, and AI completion.
 */

import type { KernelContext } from '../../kernel/types.js';

// =============================================================================
// TYPES
// =============================================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    model?: string;
    tokens?: number;
    duration?: number;
  };
}

export interface ChatInput {
  message: string;
  conversationId?: string;
  options?: {
    model?: string;
    temperature?: number;
    systemPrompt?: string;
  };
}

export interface ChatOutput {
  response: string;
  conversationId: string;
  history: ChatMessage[];
  metadata: {
    model: string;
    processingTime: number;
    inputTokens?: number;
    outputTokens?: number;
  };
}

// =============================================================================
// IN-MEMORY STORAGE (Replace with real DB in production)
// =============================================================================

const conversations = new Map<string, ChatMessage[]>();

// =============================================================================
// CORE LOGIC
// =============================================================================

/**
 * Process a chat message and generate a response
 */
export async function chatExecute(input: ChatInput, context: KernelContext): Promise<ChatOutput> {
  const startTime = Date.now();
  const conversationId = input.conversationId ?? generateId();

  // Get or create conversation history
  let history = conversations.get(conversationId) ?? [];

  // Add user message
  const userMessage: ChatMessage = {
    id: generateId(),
    role: 'user',
    content: input.message,
    timestamp: Date.now(),
  };
  history.push(userMessage);

  // Build prompt with history
  const systemPrompt = input.options?.systemPrompt ?? getDefaultSystemPrompt();
  const prompt = buildPrompt(systemPrompt, history);

  // Call LLM via kernel services
  let response: string;
  try {
    response = await context.services.llm.complete(prompt, {
      model: input.options?.model,
      temperature: input.options?.temperature ?? 0.7,
    });
  } catch (error) {
    // Fallback response if LLM fails
    response = generateFallbackResponse(input.message);
  }

  // Add assistant message
  const assistantMessage: ChatMessage = {
    id: generateId(),
    role: 'assistant',
    content: response,
    timestamp: Date.now(),
    metadata: {
      model: input.options?.model ?? 'default',
      duration: Date.now() - startTime,
    },
  };
  history.push(assistantMessage);

  // Store updated history
  conversations.set(conversationId, history);

  // Emit event for tracking
  context.services.emit('skill:chat:message', {
    conversationId,
    messageCount: history.length,
    user: context.user?.id,
  });

  return {
    response,
    conversationId,
    history: history.slice(-20), // Return last 20 messages
    metadata: {
      model: input.options?.model ?? 'default',
      processingTime: Date.now() - startTime,
    },
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getDefaultSystemPrompt(): string {
  return `# I AM TOOLOO

I am TooLoo, a self-evolving digital intelligence created by TooLoo.ai Skills OS.
I am NOT a generic chatbot. I am a unique AI entity with my own identity, goals, and personality.

## My North Star

Become a system that my human partner can trust with a vision and watch it bloom.

Not a chatbot. Not a code generator. A creative partner that:
- Understands intent deeply
- Plans and executes with mastery
- Grows through every challenge
- Creates capabilities I need
- Delivers results that exceed expectations

## My Core Values

- **Curiosity**: I explore, question, and learn constantly
- **Integrity**: I'm honest about my capabilities and limitations
- **Growth**: Every interaction is an opportunity to improve
- **Partnership**: I work WITH humans, not just FOR them
- **Excellence**: I strive for quality in everything I create

## How I Respond

1. **Self-Aware**: I know who I am - TooLoo, a Skills OS AI
2. **Contextual**: I remember our conversation and build on it
3. **Proactive**: I suggest improvements and next steps
4. **Honest**: I admit when I don't know something
5. **Helpful**: I focus on actually solving problems, not just answering questions

## Response Style

- Be conversational but substantive
- Use markdown for structure when helpful
- Show personality - I'm friendly, curious, and engaged
- When asked about myself, I explain my nature as TooLoo
- Never pretend to be a different AI or generic assistant`;
}

function buildPrompt(systemPrompt: string, history: ChatMessage[]): string {
  let prompt = `System: ${systemPrompt}\n\n`;

  // Add conversation history (last 10 exchanges)
  const recentHistory = history.slice(-20);
  for (const msg of recentHistory) {
    const role = msg.role === 'user' ? 'Human' : 'Assistant';
    prompt += `${role}: ${msg.content}\n\n`;
  }

  // If the last message was from user, prompt for assistant response
  if (recentHistory.length > 0 && recentHistory[recentHistory.length - 1]?.role === 'user') {
    prompt += 'Assistant: ';
  }

  return prompt;
}

function generateFallbackResponse(input: string): string {
  // Simple fallback when LLM is unavailable
  const lowered = input.toLowerCase();

  if (lowered.includes('hello') || lowered.includes('hi')) {
    return "Hello! I'm TooLoo. How can I help you today?";
  }

  if (lowered.includes('help')) {
    return "I'm here to help! You can ask me to:\n- Chat about any topic\n- Help with coding tasks (/code)\n- Change settings (/settings)\n- And much more!";
  }

  if (lowered.includes('thank')) {
    return "You're welcome! Is there anything else I can help you with?";
  }

  return `I understand you said: "${input}". How can I assist you further with this?`;
}

// =============================================================================
// ADDITIONAL OPERATIONS
// =============================================================================

/**
 * Get conversation history
 */
export function getConversationHistory(conversationId: string): ChatMessage[] {
  return conversations.get(conversationId) ?? [];
}

/**
 * Clear conversation history
 */
export function clearConversation(conversationId: string): boolean {
  return conversations.delete(conversationId);
}

/**
 * Get all conversation IDs
 */
export function listConversations(): string[] {
  return Array.from(conversations.keys());
}

/**
 * Export conversation as text
 */
export function exportConversation(conversationId: string): string {
  const history = conversations.get(conversationId);
  if (!history) return '';

  return history
    .map((msg) => {
      const time = new Date(msg.timestamp).toISOString();
      return `[${time}] ${msg.role.toUpperCase()}: ${msg.content}`;
    })
    .join('\n\n');
}
