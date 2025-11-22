#!/usr/bin/env node

/**
 * TooLoo.ai Metrics Hub (Port 3010)
 * Real-time performance aggregation + WebSocket live updates
 * 
 * Routes:
 * GET  /api/v1/metrics/dashboard - Current snapshot of all services
 * GET  /api/v1/metrics/service/:id - Detailed metrics for one service
 * GET  /api/v1/metrics/providers - Provider performance leaderboard
 * GET  /api/v1/metrics/alerts - Active alert status
 * WS   /ws/metrics - Live metrics stream (WebSocket)
 */

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import http from 'http';
import { WebSocketServer } from 'ws';
import { ServiceFoundation } from '../lib/service-foundation.js';
import { CircuitBreaker } from '../lib/circuit-breaker.js';
import { PersistentCache } from '../lib/persistent-cache.js';
import { EventBus } from '../lib/event-bus.js';

// Initialize service
const svc = new ServiceFoundation('metrics-hub', process.env.METRICS_HUB_PORT || 3010);
svc.setupMiddleware();
svc.registerHealthEndpoint();
svc.registerStatusEndpoint();

const app = svc.app;
const PORT = svc.port;

// Cache for quick access (30s TTL for real-time feel)
const cache = new PersistentCache({ ttl: 30000 });

// WebSocket clients registry
const wssClients = new Set();

// Service registry (mirrors orchestrator)
const SERVICES = {
  'web': { port: 3000, name: 'Web Server (API Proxy)', category: 'infrastructure' },
  'training': { port: 3001, name: 'Training Server', category: 'core' },
  'meta': { port: 3002, name: 'Meta Server', category: 'core' },
  'budget': { port: 3003, name: 'Budget Server', category: 'core' },
  'coach': { port: 3004, name: 'Coach Server', category: 'core' },
  'cup': { port: 3005, name: 'Cup Server', category: 'extended' },
  'product': { port: 3006, name: 'Product Development Server', category: 'extended' },
  'segmentation': { port: 3007, name: 'Segmentation Server', category: 'extended' },
  'reports': { port: 3008, name: 'Reports Server', category: 'extended' },
  'capabilities': { port: 3009, name: 'Capabilities Server', category: 'extended' },
  'orchestration': { port: 3100, name: 'Orchestration Service', category: 'integration' },
  'provider': { port: 3200, name: 'Provider Service', category: 'integration' },
  'analytics': { port: 3300, name: 'Analytics Service', category: 'integration' }
};

// Metrics storage
const metricsDB = {
  services: new Map(),
  providers: new Map(),
  alerts: [],
  lastUpdate: null
};

// Circuit breakers for each service
const breakers = new Map();
Object.entries(SERVICES).forEach(([id, svc]) => {
  breakers.set(id, new CircuitBreaker(id, { 
    failureThreshold: 3, 
    resetTimeoutMs: 30000 
  }));
});

// ============================================================================
// METRICS COLLECTION
// ============================================================================

/**
 * Collect metrics for a single service
 */
async function collectServiceMetrics(serviceId) {
  const service = SERVICES[serviceId];
  if (!service) return null;

  const startTime = Date.now();
  const breaker = breakers.get(serviceId);

  try {
    const response = await fetch(`http://127.0.0.1:${service.port}/health`, {
      timeout: 5000
    });

    const responseTime = Date.now() - startTime;
    const status = response.status === 200 ? 'healthy' : 'degraded';

    if (breaker) breaker.recordSuccess();

    return {
      id: serviceId,
      name: service.name,
      port: service.port,
      status: status,
      responseTime: responseTime,
      category: service.category,
      lastChecked: new Date().toISOString(),
      healthy: status === 'healthy'
    };
  } catch (error) {
    if (breaker) breaker.recordFailure();

    return {
      id: serviceId,
      name: service.name,
      port: service.port,
      status: 'offline',
      responseTime: Date.now() - startTime,
      category: service.category,
      lastChecked: new Date().toISOString(),
      healthy: false,
      error: error.message
    };
  }
}

/**
 * Collect all metrics in parallel
 */
async function collectAllMetrics() {
  const metrics = await Promise.all(
    Object.keys(SERVICES).map(id => collectServiceMetrics(id))
  );

  // Update DB
  metrics.forEach(metric => {
    if (metric) {
      metricsDB.services.set(metric.id, metric);
    }
  });

  metricsDB.lastUpdate = new Date().toISOString();
  return metrics;
}

/**
 * Calculate aggregated stats
 */
function getAggregateStats() {
  const metrics = Array.from(metricsDB.services.values());
  const healthy = metrics.filter(m => m.healthy).length;
  const total = metrics.length;
  const avgResponseTime = metrics.length > 0
    ? Math.round(metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length)
    : 0;

  return {
    timestamp: metricsDB.lastUpdate,
    serviceHealth: {
      healthy: healthy,
      degraded: metrics.filter(m => m.status === 'degraded').length,
      offline: metrics.filter(m => m.status === 'offline').length,
      total: total,
      healthPercentage: total > 0 ? Math.round((healthy / total) * 100) : 0
    },
    performance: {
      avgResponseTime: avgResponseTime,
      minResponseTime: metrics.length > 0 ? Math.min(...metrics.map(m => m.responseTime)) : 0,
      maxResponseTime: metrics.length > 0 ? Math.max(...metrics.map(m => m.responseTime)) : 0
    },
    categories: {
      infrastructure: metrics.filter(m => m.category === 'infrastructure').filter(m => m.healthy).length,
      core: metrics.filter(m => m.category === 'core').filter(m => m.healthy).length,
      extended: metrics.filter(m => m.category === 'extended').filter(m => m.healthy).length,
      integration: metrics.filter(m => m.category === 'integration').filter(m => m.healthy).length
    }
  };
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * Dashboard endpoint - full metrics snapshot
 */
app.get('/api/v1/metrics/dashboard', async (req, res) => {
  try {
    const cached = cache.get('metrics-dashboard');
    if (cached) {
      return res.json(cached);
    }

    await collectAllMetrics();
    const stats = getAggregateStats();
    const services = Array.from(metricsDB.services.values());

    const dashboard = {
      stats: stats,
      services: services,
      status: stats.serviceHealth.healthPercentage >= 80 ? 'operational' : 'degraded'
    };

    cache.set('metrics-dashboard', dashboard);
    res.json(dashboard);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Service-specific metrics
 */
app.get('/api/v1/metrics/service/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!SERVICES[id]) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const metric = await collectServiceMetrics(id);
    res.json(metric);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Alert status
 */
app.get('/api/v1/metrics/alerts', (req, res) => {
  res.json({
    total: metricsDB.alerts.length,
    alerts: metricsDB.alerts,
    lastUpdated: metricsDB.lastUpdate
  });
});

/**
 * Provider performance leaderboard (aggregated from budget service)
 */
app.get('/api/v1/metrics/providers', async (req, res) => {
  try {
    // Fetch from budget service
    const response = await fetch('http://127.0.0.1:3003/api/v1/providers/status');
    const providerData = await response.json();

    // Format as leaderboard
    const leaderboard = (providerData.providers || [])
      .map(p => ({
        name: p.name,
        status: p.status,
        responseTime: p.lastResponseTime || 0,
        successRate: p.successRate || 0,
        costPerToken: p.costPerToken || 0,
        rank: 0
      }))
      .sort((a, b) => b.successRate - a.successRate)
      .map((p, i) => ({ ...p, rank: i + 1 }));

    res.json({
      leaderboard: leaderboard,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Provider metrics error:', error);
    res.json({
      leaderboard: [],
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// WEBSOCKET LIVE UPDATES
// ============================================================================

/**
 * Create HTTP server and WebSocket server
 */
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('📊 Metrics client connected');
  wssClients.add(ws);

  // Send initial state
  (async () => {
    const stats = getAggregateStats();
    ws.send(JSON.stringify({
      type: 'metrics-update',
      data: {
        stats: stats,
        services: Array.from(metricsDB.services.values())
      },
      timestamp: new Date().toISOString()
    }));
  })();

  ws.on('close', () => {
    console.log('📊 Metrics client disconnected');
    wssClients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    wssClients.delete(ws);
  });
});

/**
 * Broadcast metrics to all WebSocket clients
 */
function broadcastMetrics(data) {
  const message = JSON.stringify({
    type: 'metrics-update',
    data: data,
    timestamp: new Date().toISOString()
  });

  wssClients.forEach((client) => {
    if (client.readyState === 1) { // OPEN
      client.send(message);
    }
  });
}

// ============================================================================
// BACKGROUND COLLECTION
// ============================================================================

/**
 * Collect metrics every 5 seconds and broadcast
 */
setInterval(async () => {
  try {
    await collectAllMetrics();
    const stats = getAggregateStats();
    
    broadcastMetrics({
      stats: stats,
      services: Array.from(metricsDB.services.values())
    });

    // Update alerts
    const unhealthy = Array.from(metricsDB.services.values())
      .filter(m => !m.healthy);
    
    if (unhealthy.length > 0) {
      metricsDB.alerts = unhealthy.map(m => ({
        severity: 'warning',
        service: m.id,
        message: `Service ${m.name} is ${m.status}`,
        timestamp: new Date().toISOString()
      }));
    } else {
      metricsDB.alerts = [];
    }

  } catch (error) {
    console.error('Metrics collection error:', error);
  }
}, 5000);

// ============================================================================
// STARTUP
// ============================================================================

server.listen(PORT, () => {
  console.log(`\n✅ Metrics Hub running on port ${PORT}`);
  console.log(`   📊 Dashboard: http://127.0.0.1:${PORT}/api/v1/metrics/dashboard`);
  console.log(`   📡 WebSocket: ws://127.0.0.1:${PORT}/ws/metrics`);
  console.log(`   🏥 Health: http://127.0.0.1:${PORT}/health\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Metrics Hub shutting down...');
  wssClients.forEach(client => client.close());
  server.close(() => process.exit(0));
});

export default app;
