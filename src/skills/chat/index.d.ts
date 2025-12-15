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
import { type Skill } from '../../kernel/index.js';
import { type ChatInput, type ChatOutput } from './logic.js';
export declare const ChatInputSchema: z.ZodType<ChatInput>;
export declare const ChatOutputSchema: z.ZodType<ChatOutput>;
/**
 * ChatSkill - The conversational AI feature
 *
 * This skill handles all chat/conversation functionality.
 * It's the default fallback for natural language input.
 */
export declare const ChatSkill: Skill<ChatInput, ChatOutput>;
export default ChatSkill;
export type { ChatInput, ChatOutput, ChatMessage } from './logic.js';
//# sourceMappingURL=index.d.ts.map