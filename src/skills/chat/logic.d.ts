/**
 * @file ChatSkill - Logic Layer
 * @description Backend brain for the Chat skill
 * @version 1.0.0
 *
 * This file contains all the server-side logic for chat.
 * It handles message processing, history management, and AI completion.
 */
import type { KernelContext } from '../../kernel/types.js';
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
/**
 * Process a chat message and generate a response
 */
export declare function chatExecute(input: ChatInput, context: KernelContext): Promise<ChatOutput>;
/**
 * Get conversation history
 */
export declare function getConversationHistory(conversationId: string): ChatMessage[];
/**
 * Clear conversation history
 */
export declare function clearConversation(conversationId: string): boolean;
/**
 * Get all conversation IDs
 */
export declare function listConversations(): string[];
/**
 * Export conversation as text
 */
export declare function exportConversation(conversationId: string): string;
//# sourceMappingURL=logic.d.ts.map