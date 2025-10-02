/**
 * Assistant Module for TooLoo.ai
 * Provides high-level AI assistant capabilities with conversation management,
 * role-based interactions, and tool calling support.
 */

const EventEmitter = require('events');

/**
 * Message types in a conversation
 */
const MessageRole = {
  SYSTEM: 'system',
  USER: 'user',
  ASSISTANT: 'assistant',
  TOOL: 'tool'
};

/**
 * Predefined assistant roles/personas
 */
const AssistantRoles = {
  GENERAL: {
    name: 'general',
    systemPrompt: 'You are a helpful AI assistant. Be concise, accurate, and thoughtful in your responses.',
    temperature: 0.7
  },
  CODER: {
    name: 'coder',
    systemPrompt: 'You are an expert software engineer. Provide clean, well-documented code with best practices. Explain technical decisions clearly.',
    temperature: 0.3
  },
  ARCHITECT: {
    name: 'architect',
    systemPrompt: 'You are a software architect. Focus on system design, scalability, and architectural patterns. Consider trade-offs and long-term maintainability.',
    temperature: 0.5
  },
  DEBUGGER: {
    name: 'debugger',
    systemPrompt: 'You are a debugging specialist. Systematically analyze problems, identify root causes, and suggest solutions. Be methodical and thorough.',
    temperature: 0.2
  },
  CREATIVE: {
    name: 'creative',
    systemPrompt: 'You are a creative AI assistant. Think outside the box, suggest innovative solutions, and explore unconventional approaches.',
    temperature: 0.9
  },
  ANALYST: {
    name: 'analyst',
    systemPrompt: 'You are a data analyst. Focus on patterns, insights, and evidence-based conclusions. Be precise with numbers and statistics.',
    temperature: 0.4
  }
};

/**
 * Main Assistant class
 * Manages conversations, context, and interactions with AI providers
 */
class Assistant extends EventEmitter {
  constructor(config = {}) {
    super();

    this.id = config.id || `assistant-${Date.now()}`;
    this.name = config.name || 'TooLoo Assistant';
    this.role = config.role || AssistantRoles.GENERAL;
    this.orchestrator = config.orchestrator; // MultiProviderOrchestrator instance
    this.maxHistoryLength = config.maxHistoryLength || 50;
    this.contextWindow = config.contextWindow || 4000;

    // Conversation state
    this.conversations = new Map(); // conversationId -> { messages, metadata }
    this.currentConversationId = null;

    // Tools registry
    this.tools = new Map();
    this.toolsEnabled = config.toolsEnabled !== false;

    // Performance tracking
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTokens: 0,
      avgResponseTime: 0
    };
  }

  /**
   * Start a new conversation
   */
  startConversation(conversationId = null, metadata = {}) {
    const id = conversationId || `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.conversations.set(id, {
      id,
      messages: [],
      metadata: {
        ...metadata,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      context: {}
    });

    this.currentConversationId = id;
    this.emit('conversation:started', { conversationId: id, metadata });

    return id;
  }

  /**
   * Switch to an existing conversation
   */
  switchConversation(conversationId) {
    if (!this.conversations.has(conversationId)) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    this.currentConversationId = conversationId;
    this.emit('conversation:switched', { conversationId });

    return conversationId;
  }

  /**
   * Get current conversation
   */
  getCurrentConversation() {
    if (!this.currentConversationId) {
      this.startConversation();
    }

    return this.conversations.get(this.currentConversationId);
  }

  /**
   * Add a message to the current conversation
   */
  addMessage(role, content, metadata = {}) {
    const conversation = this.getCurrentConversation();

    const message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date(),
      metadata
    };

    conversation.messages.push(message);
    conversation.metadata.updatedAt = new Date();

    // Trim history if needed
    if (conversation.messages.length > this.maxHistoryLength) {
      const systemMessages = conversation.messages.filter(m => m.role === MessageRole.SYSTEM);
      const otherMessages = conversation.messages.filter(m => m.role !== MessageRole.SYSTEM);

      // Keep system messages and recent history
      const keepCount = this.maxHistoryLength - systemMessages.length;
      conversation.messages = [
        ...systemMessages,
        ...otherMessages.slice(-keepCount)
      ];
    }

    this.emit('message:added', { conversationId: this.currentConversationId, message });

    return message;
  }

  /**
   * Send a message and get a response
   */
  async chat(userMessage, options = {}) {
    if (!this.orchestrator) {
      throw new Error('No orchestrator configured. Provide an orchestrator instance in the constructor.');
    }

    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      // Add user message to conversation
      this.addMessage(MessageRole.USER, userMessage);

      const conversation = this.getCurrentConversation();

      // Build the prompt with conversation history
      const messages = this.buildMessagesForRequest(conversation, options);

      // Prepare request
      const request = {
        prompt: messages.map(m => `${m.role}: ${m.content}`).join('\n\n'),
        systemMessage: this.role.systemPrompt,
        temperature: options.temperature ?? this.role.temperature,
        maxTokens: options.maxTokens ?? 2000,
        provider: options.provider,
        context: {
          conversationId: this.currentConversationId,
          assistantId: this.id,
          ...options.context
        }
      };

      this.emit('request:start', { conversationId: this.currentConversationId, request });

      // Get response from orchestrator
      const response = await this.orchestrator.generate(request);

      // Add assistant response to conversation
      const assistantMessage = this.addMessage(
        MessageRole.ASSISTANT,
        response.content,
        {
          provider: response.provider,
          usage: response.usage,
          performance: response.performance
        }
      );

      // Update stats
      this.stats.successfulRequests++;
      this.stats.totalTokens += response.usage.totalTokens;
      const responseTime = Date.now() - startTime;
      this.stats.avgResponseTime =
        (this.stats.avgResponseTime * (this.stats.successfulRequests - 1) + responseTime)
        / this.stats.successfulRequests;

      this.emit('request:complete', {
        conversationId: this.currentConversationId,
        message: assistantMessage,
        response
      });

      return {
        message: assistantMessage,
        response,
        conversation: this.currentConversationId
      };

    } catch (error) {
      this.stats.failedRequests++;
      this.emit('request:error', {
        conversationId: this.currentConversationId,
        error
      });
      throw error;
    }
  }

  /**
   * Build messages array for API request
   */
  buildMessagesForRequest(conversation, options = {}) {
    let messages = [...conversation.messages];

    // Include context window management
    const includeCount = options.includeLastN || 10;

    // Always include system messages
    const systemMessages = messages.filter(m => m.role === MessageRole.SYSTEM);
    const nonSystemMessages = messages.filter(m => m.role !== MessageRole.SYSTEM);

    // Take last N messages
    const recentMessages = nonSystemMessages.slice(-includeCount);

    return [...systemMessages, ...recentMessages];
  }

  /**
   * Register a tool/function that the assistant can call
   */
  registerTool(name, definition, handler) {
    this.tools.set(name, {
      name,
      definition, // JSON schema or description
      handler
    });

    this.emit('tool:registered', { name, definition });
  }

  /**
   * Execute a registered tool
   */
  async executeTool(name, parameters) {
    const tool = this.tools.get(name);

    if (!tool) {
      throw new Error(`Tool '${name}' not found`);
    }

    if (!this.toolsEnabled) {
      throw new Error('Tools are disabled for this assistant');
    }

    this.emit('tool:execute:start', { name, parameters });

    try {
      const result = await tool.handler(parameters);

      this.emit('tool:execute:complete', { name, parameters, result });

      // Add tool result to conversation
      this.addMessage(MessageRole.TOOL, JSON.stringify(result), {
        toolName: name,
        parameters
      });

      return result;
    } catch (error) {
      this.emit('tool:execute:error', { name, parameters, error });
      throw error;
    }
  }

  /**
   * Change the assistant's role/persona
   */
  setRole(role) {
    if (typeof role === 'string') {
      const roleName = role.toUpperCase();
      if (!AssistantRoles[roleName]) {
        throw new Error(`Unknown role: ${role}`);
      }
      this.role = AssistantRoles[roleName];
    } else {
      this.role = role;
    }

    this.emit('role:changed', { role: this.role });
  }

  /**
   * Get conversation history
   */
  getHistory(conversationId = null) {
    const id = conversationId || this.currentConversationId;
    const conversation = this.conversations.get(id);

    if (!conversation) {
      return null;
    }

    return {
      conversationId: id,
      messages: conversation.messages,
      metadata: conversation.metadata
    };
  }

  /**
   * Clear conversation history
   */
  clearHistory(conversationId = null) {
    if (conversationId) {
      this.conversations.delete(conversationId);
      if (this.currentConversationId === conversationId) {
        this.currentConversationId = null;
      }
    } else {
      this.conversations.clear();
      this.currentConversationId = null;
    }

    this.emit('history:cleared', { conversationId });
  }

  /**
   * Get assistant statistics
   */
  getStats() {
    return {
      ...this.stats,
      activeConversations: this.conversations.size,
      registeredTools: this.tools.size,
      currentRole: this.role.name
    };
  }

  /**
   * Export conversation for persistence
   */
  exportConversation(conversationId = null) {
    const id = conversationId || this.currentConversationId;
    const conversation = this.conversations.get(id);

    if (!conversation) {
      return null;
    }

    return {
      id: conversation.id,
      messages: conversation.messages,
      metadata: conversation.metadata,
      context: conversation.context,
      exportedAt: new Date()
    };
  }

  /**
   * Import conversation from exported data
   */
  importConversation(data) {
    const conversation = {
      id: data.id,
      messages: data.messages || [],
      metadata: data.metadata || { createdAt: new Date(), updatedAt: new Date() },
      context: data.context || {}
    };

    this.conversations.set(data.id, conversation);
    this.emit('conversation:imported', { conversationId: data.id });

    return data.id;
  }
}

/**
 * Assistant Factory
 * Create pre-configured assistants easily
 */
class AssistantFactory {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
  }

  /**
   * Create a general-purpose assistant
   */
  createGeneral(config = {}) {
    return new Assistant({
      ...config,
      name: 'General Assistant',
      role: AssistantRoles.GENERAL,
      orchestrator: this.orchestrator
    });
  }

  /**
   * Create a coding assistant
   */
  createCoder(config = {}) {
    return new Assistant({
      ...config,
      name: 'Code Assistant',
      role: AssistantRoles.CODER,
      orchestrator: this.orchestrator
    });
  }

  /**
   * Create an architect assistant
   */
  createArchitect(config = {}) {
    return new Assistant({
      ...config,
      name: 'Architecture Assistant',
      role: AssistantRoles.ARCHITECT,
      orchestrator: this.orchestrator
    });
  }

  /**
   * Create a debugging assistant
   */
  createDebugger(config = {}) {
    return new Assistant({
      ...config,
      name: 'Debug Assistant',
      role: AssistantRoles.DEBUGGER,
      orchestrator: this.orchestrator
    });
  }

  /**
   * Create a custom assistant
   */
  create(config = {}) {
    return new Assistant({
      ...config,
      orchestrator: this.orchestrator
    });
  }
}

module.exports = {
  Assistant,
  AssistantFactory,
  AssistantRoles,
  MessageRole
};