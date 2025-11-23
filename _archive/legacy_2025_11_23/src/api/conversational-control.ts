/**
 * Month 4: Conversational Control API
 * 
 * Provides:
 * - Service management via natural language
 * - Alert investigation and resolution
 * - Policy management via conversation
 * - Conversation-driven analytics
 */

import { buildEnrichedSystemState } from './contextual-awareness.js';

// ============================================================================
// SERVICE COMMANDS VIA CONVERSATION
// ============================================================================

/**
 * Parse natural language service commands
 */
export function parseServiceCommand(userMessage) {
  const message = userMessage.toLowerCase();
  const commands = [];

  // Restart patterns
  if (message.includes('restart')) {
    if (message.includes('all') || message.includes('services')) {
      commands.push({ type: 'restart_all_services', confidence: 0.95 });
    } else {
      const serviceMatch = message.match(/restart\s+(\w+(?:-\w+)*)/);
      if (serviceMatch) {
        commands.push({
          type: 'restart_service',
          service: serviceMatch[1],
          confidence: 0.9,
        });
      }
    }
  }

  // Stop patterns
  if (message.includes('stop')) {
    const serviceMatch = message.match(/stop\s+(\w+(?:-\w+)*)/);
    if (serviceMatch) {
      commands.push({
        type: 'stop_service',
        service: serviceMatch[1],
        confidence: 0.85,
      });
    }
  }

  // Start patterns
  if (message.includes('start')) {
    const serviceMatch = message.match(/start\s+(\w+(?:-\w+)*)/);
    if (serviceMatch) {
      commands.push({
        type: 'start_service',
        service: serviceMatch[1],
        confidence: 0.85,
      });
    }
  }

  // Scale patterns
  if (message.includes('scale')) {
    const scaleMatch = message.match(/scale\s+(\w+(?:-\w+)*)\s+(?:to\s+)?(\d+)/);
    if (scaleMatch) {
      commands.push({
        type: 'scale_service',
        service: scaleMatch[1],
        replicas: parseInt(scaleMatch[2]),
        confidence: 0.9,
      });
    }
  }

  // Show status patterns
  if (message.includes('show') || message.includes('status') || message.includes('health')) {
    if (message.includes('slow') || message.includes('latency')) {
      commands.push({ type: 'show_slow_services', confidence: 0.8 });
    } else {
      commands.push({ type: 'show_all_services', confidence: 0.8 });
    }
  }

  return commands;
}

/**
 * Execute parsed service command
 */
export async function executeServiceCommand(command) {
  switch (command.type) {
    case 'restart_all_services':
      return await restartAllServices();
    case 'restart_service':
      return await restartService(command.service);
    case 'stop_service':
      return await stopService(command.service);
    case 'start_service':
      return await startService(command.service);
    case 'scale_service':
      return await scaleService(command.service, command.replicas);
    case 'show_slow_services':
      return await showSlowServices();
    case 'show_all_services':
      return await showAllServices();
    default:
      return { error: 'Unknown command: ' + command.type };
  }
}

async function restartAllServices() {
  try {
    const response = await fetch('http://127.0.0.1:3123/api/v1/system/services/restart-all', {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to restart services');
    return { action: 'restart_all', status: 'initiated' };
  } catch (error) {
    return { error: error.message };
  }
}

async function restartService(serviceName) {
  try {
    const response = await fetch(
      'http://127.0.0.1:3123/api/v1/system/service/' + serviceName + '/restart',
      { method: 'POST' }
    );
    if (!response.ok) throw new Error('Failed to restart service');
    return { action: 'restart', service: serviceName, status: 'initiated' };
  } catch (error) {
    return { error: error.message };
  }
}

async function stopService(serviceName) {
  try {
    const response = await fetch(
      'http://127.0.0.1:3123/api/v1/system/service/' + serviceName + '/stop',
      { method: 'POST' }
    );
    if (!response.ok) throw new Error('Failed to stop service');
    return { action: 'stop', service: serviceName, status: 'stopped' };
  } catch (error) {
    return { error: error.message };
  }
}

async function startService(serviceName) {
  try {
    const response = await fetch(
      'http://127.0.0.1:3123/api/v1/system/service/' + serviceName + '/start',
      { method: 'POST' }
    );
    if (!response.ok) throw new Error('Failed to start service');
    return { action: 'start', service: serviceName, status: 'started' };
  } catch (error) {
    return { error: error.message };
  }
}

async function scaleService(serviceName, replicas) {
  try {
    const response = await fetch(
      'http://127.0.0.1:3123/api/v1/system/service/' + serviceName + '/scale',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replicas }),
      }
    );
    if (!response.ok) throw new Error('Failed to scale service');
    return { action: 'scale', service: serviceName, replicas, status: 'scaled' };
  } catch (error) {
    return { error: error.message };
  }
}

async function showSlowServices() {
  try {
    const response = await fetch('http://127.0.0.1:3010/api/v1/metrics/services');
    if (!response.ok) throw new Error('Failed to get services');
    const data = await response.json();
    const slow = (data.list || [])
      .filter(s => s.responseTime > 500)
      .sort((a, b) => b.responseTime - a.responseTime)
      .slice(0, 5);
    return { action: 'show_slow', count: slow.length, services: slow };
  } catch (error) {
    return { error: error.message };
  }
}

async function showAllServices() {
  try {
    const response = await fetch('http://127.0.0.1:3010/api/v1/metrics/services');
    if (!response.ok) throw new Error('Failed to get services');
    const data = await response.json();
    return { action: 'show_all', services: data.list || [] };
  } catch (error) {
    return { error: error.message };
  }
}

// ============================================================================
// ALERT INVESTIGATION & RESOLUTION
// ============================================================================

/**
 * Investigate alerts and suggest resolutions
 */
export async function investigateAlerts() {
  try {
    const response = await fetch('http://127.0.0.1:3000/api/v1/system/alerts/active');
    if (!response.ok) throw new Error('Failed to get alerts');
    const data = await response.json();

    if (!data.alerts || data.alerts.length === 0) {
      return { status: 'ok', message: 'No active alerts' };
    }

    const investigations = [];
    for (const alert of data.alerts.slice(0, 5)) {
      investigations.push(await analyzeAlert(alert));
    }

    return {
      alertCount: data.alerts.length,
      investigations,
      summary: generateAlertSummary(investigations),
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Analyze a single alert and suggest resolution
 */
async function analyzeAlert(alert) {
  let rootCause = 'Unknown';
  let suggestions = [];

  // Pattern matching for root causes
  if (alert.type === 'high_latency') {
    rootCause = 'Slow provider or overloaded service';
    suggestions = [
      'Switch to a faster provider',
      'Scale the affected service',
      'Check provider status',
    ];
  } else if (alert.type === 'high_memory') {
    rootCause = 'Memory leak or inefficient processing';
    suggestions = [
      'Restart the affected service',
      'Scale service to more replicas',
      'Review recent code changes',
    ];
  } else if (alert.type === 'service_offline') {
    rootCause = 'Service crashed or became unresponsive';
    suggestions = [
      'Restart the service',
      'Check service logs',
      'Verify configuration',
    ];
  }

  return {
    alert: alert.message,
    severity: alert.severity,
    rootCause,
    suggestions,
    estimatedResolutionTime: estimateResolutionTime(alert.type),
  };
}

/**
 * Estimate time to resolve alert
 */
function estimateResolutionTime(alertType) {
  const estimates = {
    'high_latency': '2-5 minutes',
    'high_memory': '1-3 minutes',
    'service_offline': '5-10 minutes',
    'high_cpu': '2-4 minutes',
    'api_error': '5-15 minutes',
  };
  return estimates[alertType] || '5-10 minutes';
}

/**
 * Generate summary of alert investigations
 */
function generateAlertSummary(investigations) {
  const bySeverity = {};
  const rootCauses = {};
  const allSuggestions = [];

  investigations.forEach(inv => {
    bySeverity[inv.severity] = (bySeverity[inv.severity] || 0) + 1;
    rootCauses[inv.rootCause] = (rootCauses[inv.rootCause] || 0) + 1;
    allSuggestions.push(...inv.suggestions);
  });

  return {
    bySeverity,
    commonRootCauses: Object.entries(rootCauses)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(e => e[0]),
    topSuggestions: Array.from(new Set(allSuggestions)).slice(0, 5),
  };
}

// ============================================================================
// POLICY MANAGEMENT
// ============================================================================

/**
 * Parse policy commands from natural language
 */
export function parsePolicyCommand(userMessage) {
  const message = userMessage.toLowerCase();
  const commands = [];

  if (message.includes('cost-optimized') || message.includes('cheapest')) {
    commands.push({ type: 'set_policy', policy: 'cost-optimized' });
  }
  if (message.includes('latency') || message.includes('fastest')) {
    commands.push({ type: 'set_policy', policy: 'latency-first' });
  }
  if (message.includes('balanced')) {
    commands.push({ type: 'set_policy', policy: 'balanced' });
  }

  return commands;
}

/**
 * Apply policy
 */
export async function applyPolicy(policyName, config = {}) {
  try {
    const response = await fetch('http://127.0.0.1:3003/api/v1/providers/policy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ policy: policyName, ...config }),
    });
    if (!response.ok) throw new Error('Failed to apply policy');
    const data = await response.json();
    return { action: 'set_policy', policy: policyName, status: 'applied', data };
  } catch (error) {
    return { error: error.message };
  }
}

// ============================================================================
// CONVERSATION-DRIVEN ANALYTICS
// ============================================================================

/**
 * Parse analytics queries from natural language
 */
export function parseAnalyticsQuery(userMessage) {
  const message = userMessage.toLowerCase();

  if (message.includes('how many') || message.includes('api calls')) {
    if (message.includes('last hour')) {
      return { type: 'api_calls_last_hour' };
    }
    if (message.includes('last day')) {
      return { type: 'api_calls_last_day' };
    }
    return { type: 'api_calls_total' };
  }

  if (message.includes('provider') && message.includes('performance')) {
    if (message.includes('7 days')) {
      return { type: 'provider_performance_7d' };
    }
    return { type: 'provider_performance' };
  }

  if (message.includes('cost')) {
    if (message.includes('today')) {
      return { type: 'cost_today' };
    }
    return { type: 'cost_total' };
  }

  return null;
}

/**
 * Execute analytics query
 */
export async function executeAnalyticsQuery(query) {
  switch (query.type) {
    case 'api_calls_last_hour':
      return await getAPICallsLastHour();
    case 'api_calls_last_day':
      return await getAPICallsLastDay();
    case 'api_calls_total':
      return await getAPICallsTotal();
    case 'provider_performance':
      return await getProviderPerformance();
    case 'provider_performance_7d':
      return await getProviderPerformance7d();
    case 'cost_today':
      return await getCostToday();
    case 'cost_total':
      return await getCostTotal();
    default:
      return { error: 'Unknown query type' };
  }
}

async function getAPICallsLastHour() {
  try {
    const response = await fetch('http://127.0.0.1:3010/api/v1/metrics/api-calls');
    if (!response.ok) throw new Error('Failed to get API calls');
    const data = await response.json();
    const lastHour = data.calls || 0;
    const trend = (data.trend || 0) > 0 ? 'up' : 'down';
    return {
      metric: 'API Calls (Last Hour)',
      value: lastHour,
      trend: trend + ' ' + Math.abs(data.trend || 0) + '%',
      average: Math.round(lastHour / 60) + ' per minute',
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function getAPICallsLastDay() {
  try {
    const response = await fetch('http://127.0.0.1:3010/api/v1/metrics/api-calls?range=24h');
    if (!response.ok) throw new Error('Failed to get API calls');
    const data = await response.json();
    return {
      metric: 'API Calls (Last 24h)',
      value: data.calls || 0,
      average: Math.round((data.calls || 0) / 24) + ' per hour',
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function getAPICallsTotal() {
  try {
    const response = await fetch('http://127.0.0.1:3010/api/v1/metrics/api-calls');
    if (!response.ok) throw new Error('Failed to get API calls');
    const data = await response.json();
    return {
      metric: 'Total API Calls',
      value: data.total || 0,
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function getProviderPerformance() {
  try {
    const response = await fetch('http://127.0.0.1:3000/api/v1/reports/providers');
    if (!response.ok) throw new Error('Failed to get provider metrics');
    const data = await response.json();
    return {
      metric: 'Provider Performance',
      providers: (data.providers || []).map(p => ({
        name: p.name,
        latency: p.latency + 'ms',
        success: p.successRate + '%',
        cost: '$' + p.costPerCall.toFixed(4),
      })),
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function getProviderPerformance7d() {
  try {
    const response = await fetch('http://127.0.0.1:3000/api/v1/reports/providers?range=7d');
    if (!response.ok) throw new Error('Failed to get provider metrics');
    const data = await response.json();
    return {
      metric: 'Provider Performance (7 Days)',
      providers: (data.providers || []).map(p => ({
        name: p.name,
        latency: p.latency + 'ms',
        trend: p.trend || 'stable',
        reliability: p.reliability + '%',
      })),
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function getCostToday() {
  try {
    const response = await fetch('http://127.0.0.1:3003/api/v1/providers/cost?range=24h');
    if (!response.ok) throw new Error('Failed to get cost');
    const data = await response.json();
    return {
      metric: 'Cost Today',
      value: '$' + (data.cost || 0).toFixed(2),
      breakdown: data.breakdown || {},
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function getCostTotal() {
  try {
    const response = await fetch('http://127.0.0.1:3003/api/v1/providers/cost');
    if (!response.ok) throw new Error('Failed to get cost');
    const data = await response.json();
    return {
      metric: 'Total Cost',
      value: '$' + (data.total || 0).toFixed(2),
      daily_average: '$' + (data.dailyAverage || 0).toFixed(2),
    };
  } catch (error) {
    return { error: error.message };
  }
}

// ============================================================================
// API HANDLERS
// ============================================================================

/**
 * POST /api/v1/control/command
 * Execute conversational command
 */
export async function handleExecuteCommand(req, res) {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    // Try service commands
    let commands = parseServiceCommand(message);
    if (commands.length > 0) {
      const results = [];
      for (const cmd of commands) {
        results.push(await executeServiceCommand(cmd));
      }
      return res.json({ type: 'service_command', results });
    }

    // Try policy commands
    commands = parsePolicyCommand(message);
    if (commands.length > 0) {
      const results = [];
      for (const cmd of commands) {
        results.push(await applyPolicy(cmd.policy));
      }
      return res.json({ type: 'policy_command', results });
    }

    // Try analytics queries
    const query = parseAnalyticsQuery(message);
    if (query) {
      const result = await executeAnalyticsQuery(query);
      return res.json({ type: 'analytics_query', result });
    }

    res.json({ error: 'Could not parse command' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/v1/control/investigate-alerts
 */
export async function handleInvestigateAlerts(req, res) {
  try {
    const result = await investigateAlerts();
    res.json(result);
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
    service: 'conversational-control-api',
    timestamp: new Date().toISOString(),
  });
}
