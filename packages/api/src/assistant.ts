import { MultiProviderOrchestrator, SafeCodeExecutor } from '@tooloo/engine';
import { generateId } from './utils.js';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  provider?: string;
  metadata?: Record<string, unknown>;
}

export interface ConversationContext {
  conversationId: string;
  messages: ConversationMessage[];
  userId?: string;
  sessionId?: string;
}

export interface IntentClassification {
  intent: 'code_generation' | 'code_execution' | 'question_answering' | 'explanation' | 'general';
  confidence: number;
  context?: Record<string, unknown>;
}

export class ConversationalAssistant {
  private orchestrator: MultiProviderOrchestrator;
  private executor: SafeCodeExecutor;
  private conversations: Map<string, ConversationContext> = new Map();

  constructor(
    providers: { [key: string]: { apiKey: string; baseUrl?: string } }
  ) {
    this.orchestrator = new MultiProviderOrchestrator(providers as any);
    this.executor = new SafeCodeExecutor();
  }

  async processRequest(
    userInput: string,
    conversationId?: string,
    userId?: string
  ): Promise<{
    response: string;
    conversationId: string;
    metadata: Record<string, unknown>;
  }> {
    // Get or create conversation context
    const convId = conversationId || generateId();
    let context = this.conversations.get(convId);
    
    if (!context) {
      context = {
        conversationId: convId,
        messages: [],
        userId,
        sessionId: generateId(),
      };
      this.conversations.set(convId, context);
    }

    // Add user message to context
    const userMessage: ConversationMessage = {
      id: generateId(),
      role: 'user',
      content: userInput,
      timestamp: new Date(),
    };
    context.messages.push(userMessage);

    try {
      // Classify user intent
      const intent = await this.classifyIntent(userInput, context);
      
      // Process based on intent
      const result = await this.processIntent(intent, userInput, context);
      
      // Add assistant response to context
      const assistantMessage: ConversationMessage = {
        id: generateId(),
        role: 'assistant',
        content: result.response,
        timestamp: new Date(),
        provider: result.metadata.provider as string,
        metadata: result.metadata,
      };
      context.messages.push(assistantMessage);

      return {
        response: result.response,
        conversationId: convId,
        metadata: {
          ...result.metadata,
          intent: intent.intent,
          confidence: intent.confidence,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      const assistantMessage: ConversationMessage = {
        id: generateId(),
        role: 'assistant',
        content: `I apologize, but I encountered an error: ${errorMessage}`,
        timestamp: new Date(),
        metadata: { error: true },
      };
      context.messages.push(assistantMessage);

      return {
        response: assistantMessage.content,
        conversationId: convId,
        metadata: { error: true, message: errorMessage },
      };
    }
  }

  private async classifyIntent(
    input: string,
    context: ConversationContext
  ): Promise<IntentClassification> {
    const codePatterns = [
      /write.*code|generate.*code|create.*function|implement/i,
      /function|class|const|let|var|return|if|for|while/i,
    ];
    
    const executionPatterns = [
      /run.*code|execute.*code|test.*code/i,
      /what.*output|result.*code/i,
    ];

    const explanationPatterns = [
      /explain|how.*work|what.*do|understand/i,
      /why|what.*mean|clarify/i,
    ];

    if (codePatterns.some(pattern => pattern.test(input))) {
      return { intent: 'code_generation', confidence: 0.9 };
    }
    
    if (executionPatterns.some(pattern => pattern.test(input))) {
      return { intent: 'code_execution', confidence: 0.85 };
    }
    
    if (explanationPatterns.some(pattern => pattern.test(input))) {
      return { intent: 'explanation', confidence: 0.8 };
    }

    return { intent: 'general', confidence: 0.6 };
  }

  private async processIntent(
    intent: IntentClassification,
    userInput: string,
    context: ConversationContext
  ): Promise<{ response: string; metadata: Record<string, unknown> }> {
    const conversationHistory = context.messages
      .slice(-10) // Last 10 messages for context
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    const systemMessage = this.buildSystemMessage(intent, context);
    const enhancedPrompt = this.buildEnhancedPrompt(userInput, conversationHistory, intent);

    switch (intent.intent) {
      case 'code_generation':
        return this.handleCodeGeneration(enhancedPrompt, systemMessage);
      
      case 'code_execution':
        return this.handleCodeExecution(userInput, context);
      
      case 'explanation':
      case 'question_answering':
      case 'general':
      default:
        return this.handleGeneralQuery(enhancedPrompt, systemMessage);
    }
  }

  private buildSystemMessage(
    intent: IntentClassification,
    context: ConversationContext
  ): string {
    const baseMessage = "You are TooLoo.ai, an intelligent development assistant that helps with coding, problem-solving, and technical questions.";
    
    switch (intent.intent) {
      case 'code_generation':
        return `${baseMessage} Focus on generating clean, efficient, and well-documented code. Always explain your approach and include comments.`;
      
      case 'code_execution':
        return `${baseMessage} You're helping analyze and execute code. Be precise about expected outputs and potential issues.`;
      
      case 'explanation':
        return `${baseMessage} Provide clear, detailed explanations that are educational and easy to understand.`;
      
      default:
        return baseMessage;
    }
  }

  private buildEnhancedPrompt(
    userInput: string,
    conversationHistory: string,
    intent: IntentClassification
  ): string {
    let prompt = userInput;

    if (conversationHistory && conversationHistory.trim()) {
      prompt = `Context from our conversation:\n${conversationHistory}\n\nCurrent request: ${userInput}`;
    }

    return prompt;
  }

  private async handleCodeGeneration(
    prompt: string,
    systemMessage: string
  ): Promise<{ response: string; metadata: Record<string, unknown> }> {
    const response = await this.orchestrator.generate({
      prompt,
      systemMessage,
      temperature: 0.3, // Lower temperature for more consistent code
      maxTokens: 4000,
    });

    return {
      response: response.content,
      metadata: {
        provider: response.provider,
        usage: response.usage,
        performance: response.performance,
        type: 'code_generation',
      },
    };
  }

  private async handleCodeExecution(
    userInput: string,
    context: ConversationContext
  ): Promise<{ response: string; metadata: Record<string, unknown> }> {
    // Extract code from user input or previous messages
    const codeBlocks = this.extractCodeFromContext(userInput, context);
    
    if (codeBlocks.length === 0) {
      return {
        response: "I don't see any code to execute. Could you please provide the code you'd like me to run?",
        metadata: { type: 'code_execution', error: 'no_code_found' },
      };
    }

    const results = [];
    for (const code of codeBlocks) {
      try {
        const result = await this.executor.execute(code.code, code.language || 'javascript');
        results.push({
          code: code.code,
          result,
          success: result.success,
        });
      } catch (error) {
        results.push({
          code: code.code,
          error: error instanceof Error ? error.message : String(error),
          success: false,
        });
      }
    }

    const response = this.formatExecutionResults(results);
    
    return {
      response,
      metadata: {
        type: 'code_execution',
        executionResults: results,
      },
    };
  }

  private async handleGeneralQuery(
    prompt: string,
    systemMessage: string
  ): Promise<{ response: string; metadata: Record<string, unknown> }> {
    const response = await this.orchestrator.generate({
      prompt,
      systemMessage,
      temperature: 0.7,
      maxTokens: 4000,
    });

    return {
      response: response.content,
      metadata: {
        provider: response.provider,
        usage: response.usage,
        performance: response.performance,
        type: 'general_query',
      },
    };
  }

  private extractCodeFromContext(
    userInput: string,
    context: ConversationContext
  ): Array<{ code: string; language?: string }> {
    const codeBlocks: Array<{ code: string; language?: string }> = [];
    
    // Extract from current input
    const inputBlocks = this.extractCodeBlocks(userInput);
    codeBlocks.push(...inputBlocks);
    
    // If no code in current input, look in recent messages
    if (codeBlocks.length === 0) {
      const recentMessages = context.messages.slice(-5);
      for (const message of recentMessages) {
        const messageBlocks = this.extractCodeBlocks(message.content);
        codeBlocks.push(...messageBlocks);
      }
    }
    
    return codeBlocks;
  }

  private extractCodeBlocks(text: string): Array<{ code: string; language?: string }> {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const blocks: Array<{ code: string; language?: string }> = [];
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      blocks.push({
        language: match[1] || 'javascript',
        code: match[2].trim(),
      });
    }

    // Also try to extract inline code
    if (blocks.length === 0) {
      const inlineCodeRegex = /`([^`]+)`/g;
      while ((match = inlineCodeRegex.exec(text)) !== null) {
        // Only treat as code if it looks like code
        const code = match[1];
        if (code.includes('(') || code.includes('{') || code.includes('=')) {
          blocks.push({ code, language: 'javascript' });
        }
      }
    }

    return blocks;
  }

  private formatExecutionResults(results: any[]): string {
    let response = "## Code Execution Results\n\n";
    
    results.forEach((result, index) => {
      response += `### Result ${index + 1}\n\n`;
      response += `**Code:**\n\`\`\`javascript\n${result.code}\n\`\`\`\n\n`;
      
      if (result.success) {
        response += `**Output:** \`${result.result.output || '(no output)'}\`\n`;
        response += `**Execution Time:** ${result.result.executionTime}ms\n`;
        if (result.result.complexity) {
          response += `**Complexity:** ${result.result.complexity.timeComplexity || 'Unknown'}\n`;
        }
      } else {
        response += `**Error:** ${result.error || result.result?.error || 'Unknown error'}\n`;
      }
      
      response += "\n---\n\n";
    });
    
    return response;
  }

  getConversation(conversationId: string): ConversationContext | undefined {
    return this.conversations.get(conversationId);
  }

  listConversations(userId?: string): ConversationContext[] {
    const conversations = Array.from(this.conversations.values());
    return userId 
      ? conversations.filter(c => c.userId === userId)
      : conversations;
  }

  getProviderStats() {
    return this.orchestrator.getProviderStats();
  }
}