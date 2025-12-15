/**
 * @file ChatSkill - Logic Layer
 * @description Backend brain for the Chat skill
 * @version 1.0.0
 *
 * This file contains all the server-side logic for chat.
 * It handles message processing, history management, and AI completion.
 */
// =============================================================================
// IN-MEMORY STORAGE (Replace with real DB in production)
// =============================================================================
const conversations = new Map();
// =============================================================================
// CORE LOGIC
// =============================================================================
/**
 * Process a chat message and generate a response
 */
export async function chatExecute(input, context) {
    const startTime = Date.now();
    const conversationId = input.conversationId ?? generateId();
    // Get or create conversation history
    let history = conversations.get(conversationId) ?? [];
    // Add user message
    const userMessage = {
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
    let response;
    try {
        response = await context.services.llm.complete(prompt, {
            model: input.options?.model,
            temperature: input.options?.temperature ?? 0.7,
        });
    }
    catch (error) {
        // Fallback response if LLM fails
        response = generateFallbackResponse(input.message);
    }
    // Add assistant message
    const assistantMessage = {
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
function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function getDefaultSystemPrompt() {
    return `You are TooLoo, an intelligent AI assistant. You are helpful, harmless, and honest.
You help users with coding, analysis, creative tasks, and general questions.
Be concise but thorough in your responses.`;
}
function buildPrompt(systemPrompt, history) {
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
function generateFallbackResponse(input) {
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
export function getConversationHistory(conversationId) {
    return conversations.get(conversationId) ?? [];
}
/**
 * Clear conversation history
 */
export function clearConversation(conversationId) {
    return conversations.delete(conversationId);
}
/**
 * Get all conversation IDs
 */
export function listConversations() {
    return Array.from(conversations.keys());
}
/**
 * Export conversation as text
 */
export function exportConversation(conversationId) {
    const history = conversations.get(conversationId);
    if (!history)
        return '';
    return history
        .map((msg) => {
        const time = new Date(msg.timestamp).toISOString();
        return `[${time}] ${msg.role.toUpperCase()}: ${msg.content}`;
    })
        .join('\n\n');
}
//# sourceMappingURL=logic.js.map