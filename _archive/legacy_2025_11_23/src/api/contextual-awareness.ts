/**
 * Month 3: Contextual Awareness API
 * 
 * Provides:
 * - System state injection into conversation context
 * - Auto-suggestions based on detected patterns
 * - Multi-turn conversation memory management
 * - Smart replies and contextual action buttons
 */

import { buildSystemContext } from './conversation-api.js';

// ============================================================================
// SYSTEM STATE INJECTION
// ============================================================================

/**
 * Build enriched system state for injection into AI prompts
 */
export async function buildEnrichedSystemState() {
  const context = await buildSystemContext();
  
  return {
    timestamp: new Date().toISOString(),
    systemState: {
      health: context.systemHealth,
      services: {
        online: context.serviceslistfilter(s => s.status === 'online').length || 0,
        degraded: context.serviceslistfilter(s => s.status === 'degraded').length || 0,
        offline: context.serviceslistfilter(s => s.status === 'offline').length || 0,
        total: context.serviceslistlength || 0,
      },
      alerts: {
        critical: context.alertscritical || 0,
        warning: context.alertswarning || 0,
        info: context.alertsinfo || 0,
        total: context.alertstotal || 0,
      },
      providers: {
        active: context.providersactivelength || 0,
        busy: context.providersbusy || 0,
      },
      utilization: {
        memory: context.utilizationmemory || 0,
        cpu: context.utilizationcpu || 0,
        apiCalls: context.utilizationapiCalls || 0,
      },
    },
    recentEvents: extractRecentEvents(context),
    patterns: detectPatterns(context),
  };
}

/**
 * Extract recent events from system context
 */
function extractRecentEvents(context) {
  const events = [];
  
  // Service state changes
  if (context.serviceslist) {
    context.services.list.slice(0, 3).forEach(s => {
      if (s.lastStateChange && Date.now() - new Date(s.lastStateChange).getTime() < 5 * 60 * 1000) {
        events.push({
          type: 'service_state',
          service: s.name,
          status: s.status,
          time: s.lastStateChange,
        });
      }
    });
  }

  // Recent alerts
  if (context.alertsactive) {
    context.alerts.active.slice(0, 3).forEach(a => {
      events.push({
        type: 'alert',
        severity: a.severity,
        message: a.message,
        time: a.timestamp,
      });
    });
  }

  return events;
}

/**
 * Detect patterns in system state
 */
function detectPatterns(context) {
  const patterns = [];

  // Pattern: High latency
  if (context.utilizationapiCalls > 80) {
    patterns.push({
      type: 'high_load',
      severity: 'warning',
      description: 'System is experiencing high API call volume',
      recommendation: 'Consider scaling services or switching to a faster provider',
    });
  }

  // Pattern: High memory usage
  if (context.utilizationmemory > 80) {
    patterns.push({
      type: 'high_memory',
      severity: 'warning',
      description: 'Memory utilization is above 80%',
      recommendation: 'Scale services or restart high-memory consumers',
    });
  }

  // Pattern: Offline services
  const offlineCount = context.serviceslistfilter(s => s.status === 'offline').length || 0;
  if (offlineCount > 0) {
    patterns.push({
      type: 'service_offline',
      severity: 'critical',
      description: offlineCount + ' service(s) are offline',
      recommendation: 'Restart offline services or investigate root cause',
    });
  }

  // Pattern: Multiple alerts
  if (context.alertstotal > 3) {
    patterns.push({
      type: 'alert_storm',
      severity: 'warning',
      description: context.alerts.total + ' active alerts',
      recommendation: 'Investigate and resolve root causes to reduce alert noise',
    });
  }

  return patterns;
}

// ============================================================================
// AUTO-SUGGESTIONS ENGINE
// ============================================================================

/**
 * Generate suggestions based on system patterns
 */
export async function generateSuggestions(conversationHistory = []) {
  const state = await buildEnrichedSystemState();
  const suggestions = [];

  // Get last user message for context
  const lastUserMessage = conversationHistory.filter(m => m.role === 'user').pop();
  const context = lastUserMessagecontent || '';

  // Rule-based suggestions
  for (const pattern of state.patterns) {
    const suggestion = await generateSuggestionForPattern(pattern, context);
    if (suggestion) {
      suggestions.push(suggestion);
    }
  }

  return {
    suggestions,
    systemState: state,
    hasHighSeverity: state.patterns.some(p => p.severity === 'critical'),
  };
}

/**
 * Generate specific suggestion for a detected pattern
 */
async function generateSuggestionForPattern(pattern, context) {
  switch (pattern.type) {
    case 'high_load':
      return {
        type: 'scale_service',
        text: 'API call volume is high. Would you like to scale services or switch providers?',
        actions: [
          { label: 'Switch to faster provider', command: 'SWITCH_PROVIDER', args: ['openai'] },
          { label: 'Scale services', command: 'SCALE_ALL', args: [] },
        ],
      };

    case 'high_memory':
      return {
        type: 'restart_service',
        text: 'Memory usage is high. Restarting high-memory services might help.',
        actions: [
          { label: 'Restart all services', command: 'RESTART_ALL', args: [] },
          { label: 'Get memory report', command: 'GET_MEMORY_REPORT', args: [] },
        ],
      };

    case 'service_offline':
      return {
        type: 'restart_service',
        text: 'Some services are offline. Would you like me to restart them?',
        actions: [
          { label: 'Restart all services', command: 'RESTART_ALL', args: [] },
          { label: 'Diagnose issues', command: 'DIAGNOSE_SERVICES', args: [] },
        ],
      };

    case 'alert_storm':
      return {
        type: 'investigate_alerts',
        text: 'Multiple alerts are active. Let me investigate root causes.',
        actions: [
          { label: 'Investigate alerts', command: 'INVESTIGATE_ALERTS', args: [] },
          { label: 'View full alert log', command: 'VIEW_ALERTS', args: [] },
        ],
      };

    default:
      return null;
  }
}

// ============================================================================
// CONVERSATION MEMORY MANAGEMENT
// ============================================================================

/**
 * Smart conversation memory handler
 * Keeps recent messages and summarizes older ones
 */
export class ConversationMemory {
  constructor(maxTurns = 20, summarizeThreshold = 30) {
    this.maxTurns = maxTurns;
    this.summarizeThreshold = summarizeThreshold;
    this.messages = [];
    this.summary = null;
  }

  /**
   * Add message and manage memory
   */
  addMessage(role, content, metadata = {}) {
    const message = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2),
      role,
      content,
      timestamp: new Date(),
      metadata,
    };

    this.messages.push(message);

    // Manage memory size
    if (this.messages.length > this.summarizeThreshold) {
      this.summarizeOldMessages();
    }

    return message;
  }

  /**
   * Summarize messages older than the last maxTurns
   */
  async summarizeOldMessages() {
    const keepCount = this.maxTurns;
    if (this.messages.length <= keepCount) return;

    const toSummarize = this.messages.slice(0, -keepCount);
    const toKeep = this.messages.slice(-keepCount);

    // Create summary (simplified - in real implementation, could use Claude)
    const summary = {
      messageCount: toSummarize.length,
      timeSpan: {
        from: toSummarize[0].timestamp,
        to: toSummarize[toSummarize.length - 1].timestamp,
      },
      topics: extractTopics(toSummarize),
      actions: extractActions(toSummarize),
    };

    this.summary = summary;
    this.messages = toKeep;
  }

  /**
   * Get messages for context (recent + summary)
   */
  getContextMessages() {
    const context = [];

    if (this.summary) {
      context.push({
        role: 'system',
        content: 'Previous conversation summary: ' + JSON.stringify(this.summary),
        isSummary: true,
      });
    }

    context.push(...this.messages);
    return context;
  }

  /**
   * Export conversation
   */
  export() {
    return {
      messages: this.messages,
      summary: this.summary,
      exportedAt: new Date().toISOString(),
      messageCount: this.messages.length + (this.summarymessageCount || 0),
    };
  }
}

/**
 * Extract topics from messages
 */
function extractTopics(messages) {
  const topics = new Set();
  const topicKeywords = {
    services: ['service', 'restart', 'stop', 'start', 'health'],
    performance: ['latency', 'memory', 'cpu', 'performance', 'slow'],
    alerts: ['alert', 'critical', 'warning', 'error'],
    providers: ['provider', 'switch', 'claude', 'openai', 'cost'],
  };

  messages.forEach(msg => {
    const content = msg.content.toLowerCase();
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(kw => content.includes(kw))) {
        topics.add(topic);
      }
    });
  });

  return Array.from(topics);
}

/**
 * Extract actions that were taken
 */
function extractActions(messages) {
  const actions = [];
  messages.forEach(msg => {
    if (msg.metadatacommandExecuted) {
      actions.push({
        type: msg.metadata.commandType,
        time: msg.timestamp,
      });
    }
  });
  return actions;
}

// ============================================================================
// SMART REPLIES
// ============================================================================

/**
 * Generate smart reply options for assistant response
 */
export async function generateSmartReplies(assistantMessage, systemState) {
  const replies = [];

  // Extract suggestions from message
  if (assistantMessage.includes('switch') || assistantMessage.includes('provider')) {
    replies.push({
      text: 'Yes, switch providers',
      command: 'CONFIRM_SWITCH',
      context: 'provider_switch',
    });
    replies.push({
      text: 'Show impact forecast',
      command: 'FORECAST_IMPACT',
      context: 'provider_switch',
    });
    replies.push({
      text: 'Keep current provider',
      command: 'CANCEL',
      context: 'provider_switch',
    });
  }

  if (assistantMessage.includes('restart') || assistantMessage.includes('service')) {
    replies.push({
      text: 'Yes, restart services',
      command: 'CONFIRM_RESTART',
      context: 'service_restart',
    });
    replies.push({
      text: 'Diagnose first',
      command: 'DIAGNOSE',
      context: 'service_restart',
    });
    replies.push({
      text: 'Cancel',
      command: 'CANCEL',
      context: 'service_restart',
    });
  }

  if (systemStatepatternslength > 0) {
    replies.push({
      text: 'Tell me more',
      command: 'EXPLAIN_PATTERNS',
      context: 'patterns',
    });
  }

  // Remove duplicates
  return Array.from(new Map(replies.map(r => [r.command, r])).values()).slice(0, 3);
}

// ============================================================================
// API HANDLERS
// ============================================================================

/**
 * GET /api/v1/context/system-state
 * Get current enriched system state
 */
export async function handleGetSystemState(req, res) {
  try {
    const state = await buildEnrichedSystemState();
    res.json(state);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/v1/context/suggestions
 * Get suggestions based on patterns
 */
export async function handleGetSuggestions(req, res) {
  try {
    const history = req.bodyhistory || [];
    const suggestions = await generateSuggestions(history);
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/v1/context/smart-replies
 * Generate smart reply options
 */
export async function handleGenerateSmartReplies(req, res) {
  try {
    const { message, systemState } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }
    const replies = await generateSmartReplies(message, systemState);
    res.json({ replies });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Health check
 */
export function handleHealth(req, res) {
  res.json({
    status: 'ok',
    service: 'contextual-awareness-api',
    timestamp: new Date().toISOString(),
  });
}
