/**
 * Integrations Adapter - Generic handler framework for extensible integrations
 * Supports: Slack, Discord, webhooks, custom handlers, and future integrations
 */

import { BaseAdapter } from './base-adapter.js';

export class IntegrationsAdapter extends BaseAdapter {
  constructor(config = {}) {
    super('integrations', config);
    
    this.metadata.authentication = 'none';
    this.metadata.capabilities = [
      'send-message',      // Slack, Discord, Teams
      'trigger-workflow',  // Zapier, Make, etc.
      'create-event',      // Google Calendar, etc.
      'store-data',        // Database webhook
      'notify-user',       // Generic user notification
      'register-handler',  // Register custom handler
      'custom-handler'     // Execute custom handler
    ];
    
    // Handler registry: action name → async handler function
    this.handlers = new Map();
    
    // Webhook registry: webhook ID → handler function
    this.webhooks = new Map();
    
    // Built-in default handlers
    this.setupDefaultHandlers();
  }

  /**
   * Setup built-in default handlers
   */
  setupDefaultHandlers() {
    // Log handler (always available)
    this.registerHandler('log', async (params) => {
      console.log('[Integrations] Event:', params);
      return { logged: true, timestamp: new Date().toISOString() };
    });
    
    // Echo handler (for testing)
    this.registerHandler('echo', async (params) => {
      return { echo: params, receivedAt: new Date().toISOString() };
    });
    
    // Delay handler (for testing workflows)
    this.registerHandler('delay', async (params) => {
      const ms = params.ms || 1000;
      await new Promise(resolve => setTimeout(resolve, ms));
      return { delayed: ms };
    });
  }

  /**
   * Initialize integrations adapter
   */
  async initialize(config) {
    this.config = { ...this.config, ...config };
    
    // Load custom handlers from config if provided
    if (config.handlers && typeof config.handlers === 'object') {
      for (const [name, handler] of Object.entries(config.handlers)) {
        if (typeof handler === 'function') {
          this.registerHandler(name, handler);
        }
      }
    }
    
    this._markReady();
  }

  /**
   * Register a new handler
   */
  registerHandler(eventType, handler) {
    if (typeof handler !== 'function') {
      throw new Error(`Handler must be a function, got ${typeof handler}`);
    }
    
    if (this.handlers.has(eventType)) {
      console.warn(`[Integrations] Overwriting existing handler for '${eventType}'`);
    }
    
    this.handlers.set(eventType, handler);
    console.log(`[Integrations] Registered handler: ${eventType}`);
  }

  /**
   * Unregister a handler
   */
  unregisterHandler(eventType) {
    if (this.handlers.delete(eventType)) {
      console.log(`[Integrations] Unregistered handler: ${eventType}`);
      return true;
    }
    return false;
  }

  /**
   * Register a webhook
   */
  registerWebhook(id, callback) {
    if (typeof callback !== 'function') {
      throw new Error(`Webhook callback must be a function, got ${typeof callback}`);
    }
    
    this.webhooks.set(id, callback);
    console.log(`[Integrations] Registered webhook: ${id}`);
    
    return {
      id,
      url: `/api/v1/adapters/integrations/webhook/${id}`
    };
  }

  /**
   * Unregister a webhook
   */
  unregisterWebhook(id) {
    if (this.webhooks.delete(id)) {
      console.log(`[Integrations] Unregistered webhook: ${id}`);
      return true;
    }
    return false;
  }

  /**
   * List registered handlers
   */
  listHandlers() {
    return {
      count: this.handlers.size,
      handlers: Array.from(this.handlers.keys()),
      builtIn: ['log', 'echo', 'delay']
    };
  }

  /**
   * List registered webhooks
   */
  listWebhooks() {
    return {
      count: this.webhooks.size,
      webhooks: Array.from(this.webhooks.keys())
    };
  }

  /**
   * Trigger a webhook
   */
  async triggerWebhook(id, data) {
    const webhook = this.webhooks.get(id);
    if (!webhook) {
      throw new Error(`Unknown webhook: ${id}`);
    }
    
    try {
      const result = await webhook(data);
      return {
        status: 'success',
        webhookId: id,
        result
      };
    } catch (err) {
      this._recordError(err);
      return {
        status: 'error',
        webhookId: id,
        error: err.message
      };
    }
  }

  /**
   * Send message (Slack, Discord, Teams, etc.)
   */
  async sendMessage(params) {
    // Placeholder for message sending logic
    // In real implementation, would integrate with Slack/Discord/Teams APIs
    
    const { service, channel, text, blocks, attachments } = params;
    
    return {
      sent: true,
      service,
      channel,
      timestamp: new Date().toISOString(),
      preview: text || blocks?.[0]?.text || '...'
    };
  }

  /**
   * Trigger workflow in external service (Zapier, Make, etc.)
   */
  async triggerWorkflow(params) {
    // Placeholder for workflow triggering
    
    const { service, workflow, payload } = params;
    
    return {
      triggered: true,
      service,
      workflow,
      executionId: `exec-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create calendar event
   */
  async createEvent(params) {
    // Placeholder for event creation
    
    const { service, title, startTime, endTime, attendees } = params;
    
    return {
      created: true,
      service,
      eventId: `evt-${Date.now()}`,
      title,
      startTime,
      endTime,
      attendees: attendees?.length || 0
    };
  }

  /**
   * Store data via webhook (database trigger, etc.)
   */
  async storeData(params) {
    // Placeholder for data storage
    
    const { collection, data } = params;
    
    return {
      stored: true,
      collection,
      recordId: `rec-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Notify user
   */
  async notifyUser(params) {
    // Placeholder for user notifications
    
    const { userId, message, type = 'info', title } = params;
    
    return {
      notified: true,
      userId,
      type,
      messageId: `msg-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Connect to integrations service
   */
  async connect() {
    return {
      status: 'ready',
      handlers: this.handlers.size,
      webhooks: this.webhooks.size,
      builtInHandlers: 3
    };
  }

  /**
   * Execute handler action
   */
  async executeAction(action, params) {
    if (action === 'list-handlers') {
      return this.listHandlers();
    }
    
    if (action === 'list-webhooks') {
      return this.listWebhooks();
    }
    
    if (action === 'register-webhook') {
      return this.registerWebhook(params.id, params.callback);
    }
    
    if (action === 'trigger-webhook') {
      return this.triggerWebhook(params.id, params.data);
    }
    
    if (action === 'send-message') {
      return this.sendMessage(params);
    }
    
    if (action === 'trigger-workflow') {
      return this.triggerWorkflow(params);
    }
    
    if (action === 'create-event') {
      return this.createEvent(params);
    }
    
    if (action === 'store-data') {
      return this.storeData(params);
    }
    
    if (action === 'notify-user') {
      return this.notifyUser(params);
    }
    
    // Custom handler execution
    const handler = this.handlers.get(action);
    if (handler) {
      try {
        return await handler(params);
      } catch (err) {
        this._recordError(err);
        throw err;
      }
    }
    
    throw new Error(`Unknown integration action: ${action}`);
  }
}

export default IntegrationsAdapter;
