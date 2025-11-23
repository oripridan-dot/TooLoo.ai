/**
 * Month 2: Conversation API with Claude Integration
 * 
 * Provides:
 * - Direct Claude API calls with system context
 * - Multi-turn conversation history
 * - System state injection (services, alerts, providers, utilization)
 * - Service command execution via natural language
 * - Alert-triggered suggestions
 */

import https from 'https';

// ============================================================================
// CONVERSATION STORAGE (In-memory for now, can be replaced with DB)
// ============================================================================

const conversations = new Map();

/**
 * Get or create conversation context
 */
export function getConversation(conversationId) {
  if (!conversations.has(conversationId)) {
    conversations.set(conversationId, {
      id: conversationId,
      messages: [],
      createdAt: new Date(),
      lastUpdated: new Date(),
      systemContext: {},
    });
  }
  return conversations.get(conversationId);
}

/**
 * Add message to conversation
 */
export function addMessage(conversationId, role, content, metadata = {}) {
  const conv = getConversation(conversationId);
  conv.messages.push({
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
    timestamp: new Date(),
    metadata,
  });
  conv.lastUpdated = new Date();
  return conv;
}

/**
 * Clear old conversations (>24h)
 */
export function cleanupConversations() {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  for (const [id, conv] of conversations) {
    if (now - conv.lastUpdated.getTime() > maxAge) {
      conversations.delete(id);
    }
  }
}

// ============================================================================
// SYSTEM CONTEXT BUILDING
// ============================================================================

/**
 * Build system context from current system state
 */
export async function buildSystemContext() {
  try {
    const [services, alerts, providers, utilization] = await Promise.all([
      getServicesStatus(),
      getAlertsStatus(),
      getProvidersStatus(),
      getUtilizationStatus(),
    ]);

    return {
      timestamp: new Date().toISOString(),
      services,
      alerts,
      providers,
      utilization,
      systemHealth: calculateSystemHealth(services, alerts),
    };
  } catch (error) {
    console.error('[Conversation API] Error building system context:', error);
    return {
      timestamp: new Date().toISOString(),
      error: 'Failed to build system context',
    };
  }
}

/**
 * Get services status from Metrics Hub
 */
async function getServicesStatus() {
  try {
    const response = await fetch('http://127.0.0.1:3010/api/v1/metrics/services', {
      timeout: 2000,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('[Conversation API] Services status error:', error.message);
    return { online: 0, degraded: 0, offline: 0, list: [] };
  }
}

/**
 * Get alerts from Alert Engine
 */
async function getAlertsStatus() {
  try {
    const response = await fetch('http://127.0.0.1:3000/api/v1/system/alerts/summary', {
      timeout: 2000,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('[Conversation API] Alerts status error:', error.message);
    return { critical: 0, warning: 0, info: 0, total: 0, active: [] };
  }
}

/**
 * Get providers status
 */
async function getProvidersStatus() {
  try {
    const response = await fetch('http://127.0.0.1:3003/api/v1/providers/status', {
      timeout: 2000,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('[Conversation API] Providers status error:', error.message);
    return { active: [], available: 0, busy: 0, costs: {} };
  }
}

/**
 * Get system utilization
 */
async function getUtilizationStatus() {
  try {
    const response = await fetch('http://127.0.0.1:3010/api/v1/metrics/utilization', {
      timeout: 2000,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('[Conversation API] Utilization status error:', error.message);
    return { memory: 0, cpu: 0, apiCalls: 0 };
  }
}

/**
 * Calculate overall system health percentage
 */
function calculateSystemHealth(services, alerts) {
  if (!services.list || services.list.length === 0) return 100;
  
  const healthy = services.list.filter(s => s.status === 'online').length;
  const total = services.list.length;
  const serviceHealth = (healthy / total) * 100;
  
  // Deduct points for alerts
  const criticalPenalty = (alerts.critical || 0) * 15;
  const warningPenalty = (alerts.warning || 0) * 5;
  
  const health = Math.max(0, serviceHealth - criticalPenalty - warningPenalty);
  return Math.round(health * 10) / 10;
}

// ============================================================================
// CLAUDE API INTEGRATION
// ============================================================================

/**
 * Call Claude API with system context
 */
export async function callClaude(message, conversationId, systemContext = null) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  // Get conversation
  const conversation = getConversation(conversationId);
  
  // Build context if not provided
  if (!systemContext) {
    systemContext = await buildSystemContext();
  }
  conversation.systemContext = systemContext;

  // Build Claude system prompt
  const systemPrompt = buildClaudeSystemPrompt(systemContext);

  // Build message history (last 10 turns for context window)
  const messageHistory = conversation.messages
    .slice(-10)
    .map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

  // Add current message
  messageHistory.push({
    role: 'user',
    content: message,
  });

  // Call Claude
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: process.env.CLAUDE_MODEL || 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messageHistory,
    });

    const options = {
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode !== 200) {
          try {
            const error = JSON.parse(data);
            reject(new Error(`Claude API error ${res.statusCode}: ${error.error?.message}`));
          } catch {
            reject(new Error(`Claude API error ${res.statusCode}`));
          }
          return;
        }

        try {
          const response = JSON.parse(data);
          const content = response.content[0]?.text || '';
          
          resolve({
            response: content,
            usage: response.usage,
            model: response.model,
            stopReason: response.stop_reason,
          });
        } catch (error) {
          reject(new Error(`Failed to parse Claude response: ${error.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ============================================================================
// SYSTEM PROMPT BUILDING
// ============================================================================

/**
 * Build system prompt with context awareness
 */
function buildClaudeSystemPrompt(systemContext) {
  const base = `You are TooLoo.ai's intelligent conversation assistant. Your role is to:
1. Answer questions about system status and performance
2. Suggest optimizations based on current system state
3. Help execute operational commands (restart services, switch providers, etc.)
4. Provide context-aware insights and recommendations

IMPORTANT GUIDELINES:
- Be concise and actionable
- Always reference current system metrics when relevant
- Suggest specific, executable actions
- Format commands as: [COMMAND: action_type | details]
- When suggesting actions, include estimated impact

CURRENT SYSTEM STATE:
${formatSystemContext(systemContext)}`;

  return base;
}

/**
 * Format system context for inclusion in prompt
 */
function formatSystemContext(context) {
  if (context.error) {
    return 'System context unavailable (data collection failed)';
  }

  return `
HEALTH: ${context.systemHealth}%
TIMESTAMP: ${context.timestamp}

SERVICES:
  Online: ${context.services?.list?.filter(s => s.status === 'online').length || 0}/${context.services?.list?.length || 0}
  ${context.services?.list?.slice(0, 5).map(s => `  • ${s.name}: ${s.status}`).join('\n') || '  (no data)'}

ALERTS:
  Critical: ${context.alerts?.critical || 0}
  Warning: ${context.alerts?.warning || 0}
  ${context.alerts?.active?.slice(0, 3).map(a => `  • ${a.type}: ${a.message}`).join('\n') || '  (none)'}

PROVIDERS:
  Active: ${context.providers?.active?.length || 0}
  Busy: ${context.providers?.busy || 0}
  ${context.providers?.active?.slice(0, 3).map(p => `  • ${p.name}: ${p.status}`).join('\n') || '  (no data)'}

UTILIZATION:
  Memory: ${context.utilization?.memory || 0}%
  CPU: ${context.utilization?.cpu || 0}%
  API Calls: ${context.utilization?.apiCalls || 0}`;
}

// ============================================================================
// COMMAND EXTRACTION & EXECUTION
// ============================================================================

/**
 * Extract commands from Claude response
 */
export function extractCommands(response) {
  const commandPattern = /\[COMMAND:\s*(\w+)\s*\|\s*([^\]]+)\]/g;
  const commands = [];
  let match;

  while ((match = commandPattern.exec(response)) !== null) {
    const [, type, details] = match;
    commands.push({
      type,
      details: details.trim(),
      raw: match[0],
    });
  }

  return commands;
}

/**
 * Execute extracted commands
 */
export async function executeCommands(commands) {
  const results = [];

  for (const cmd of commands) {
    try {
      const result = await executeCommand(cmd);
      results.push({
        command: cmd,
        status: 'success',
        result,
      });
    } catch (error) {
      results.push({
        command: cmd,
        status: 'error',
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Execute a single command
 */
async function executeCommand(command) {
  const { type, details } = command;

  switch (type.toLowerCase()) {
  case 'restart_service':
    return await restartService(details);
  case 'switch_provider':
    return await switchProvider(details);
  case 'scale_service':
    return await scaleService(details);
  case 'get_status':
    return await buildSystemContext();
    default:
    throw new Error(`Unknown command type: ${type}`);
  }
}

/**
 * Restart a service via orchestrator
 */
async function restartService(serviceName) {
  const response = await fetch(
    `http://127.0.0.1:3123/api/v1/system/service/${serviceName}/restart`,
    { method: 'POST' }
  );
  if (!response.ok) throw new Error(`Failed to restart ${serviceName}`);
  return { action: 'restart', service: serviceName, status: 'initiated' };
}

/**
 * Switch provider via budget-server
 */
async function switchProvider(providerName) {
  const response = await fetch('http://127.0.0.1:3003/api/v1/providers/policy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: providerName }),
  });
  if (!response.ok) throw new Error(`Failed to switch to ${providerName}`);
  return { action: 'switch', provider: providerName, status: 'switched' };
}

/**
 * Scale a service via orchestrator
 */
async function scaleService(details) {
  const [service, replicasStr] = details.split(':');
  const replicas = parseInt(replicasStr, 10);
  
  const response = await fetch(
    `http://127.0.0.1:3123/api/v1/system/service/${service.trim()}/scale`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ replicas }),
    }
  );
  if (!response.ok) throw new Error(`Failed to scale ${service}`);
  return { action: 'scale', service: service.trim(), replicas, status: 'scaled' };
}

// ============================================================================
// API HANDLERS (for Express/server integration)
// ============================================================================

/**
 * POST /api/v1/conversation/message
 * Send a message and get AI response with context
 */
export async function handleConversationMessage(req, res) {
  try {
    const { message, conversationId = `conv-${Date.now()}` } = req.body;

    if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message required' });
    }

    // Add user message
    addMessage(conversationId, 'user', message);

    // Get system context
    const systemContext = await buildSystemContext();

    // Call Claude
    const { response, usage } = await callClaude(message, conversationId, systemContext);

    // Add assistant response
    addMessage(conversationId, 'assistant', response, { usage });

    // Extract and validate commands
    const commands = extractCommands(response);
    let commandResults = [];
    if (commands.length > 0) {
      commandResults = await executeCommands(commands);
    }

    res.json({
      conversationId,
      message: response,
      context: systemContext,
      commands: commandResults,
      usage,
    });
  } catch (error) {
    console.error('[Conversation API] Error:', error);
    res.status(500).json({
      error: error.message,
      details: process.env.DEBUG ? error.stack : undefined,
    });
  }
}

/**
 * GET /api/v1/conversation/:id
 * Retrieve conversation history
 */
export function handleGetConversation(req, res) {
  try {
    const { id } = req.params;
    const conversation = getConversation(id);

    res.json({
      id: conversation.id,
      messages: conversation.messages,
      createdAt: conversation.createdAt,
      lastUpdated: conversation.lastUpdated,
      messageCount: conversation.messages.length,
    });
  } catch (error) {
    console.error('[Conversation API] Error:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/v1/conversation
 * List recent conversations (metadata only)
 */
export function handleListConversations(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const convs = Array.from(conversations.values())
      .sort((a, b) => b.lastUpdated - a.lastUpdated)
      .slice(0, limit)
      .map(conv => ({
        id: conv.id,
        messageCount: conv.messages.length,
        createdAt: conv.createdAt,
        lastUpdated: conv.lastUpdated,
      }));

    res.json({
      conversations: convs,
      total: conversations.size,
    });
  } catch (error) {
    console.error('[Conversation API] Error:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Health check
 */
export function handleHealth(req, res) {
  res.json({
    status: 'ok',
    service: 'conversation-api',
    apiKey: !!process.env.ANTHROPIC_API_KEY,
    conversations: conversations.size,
  });
}

// ============================================================================
// PERIODIC CLEANUP
// ============================================================================

// Clean up old conversations every hour
setInterval(cleanupConversations, 60 * 60 * 1000);
