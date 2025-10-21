/**
 * UI Activity Monitor
 * 
 * Tracks UI activity and ensures all backend servers remain active
 * whenever the UI is in use. Handles:
 * - Session heartbeat tracking
 * - Automatic server startup on UI activation
 * - Real data pipeline routing
 * - Server health checks & recovery
 */

import express from 'express';
import http from 'http';
import fetch from 'node-fetch';
import { spawn } from 'child_process';
import os from 'os';

const app = express();
const PORT = process.env.UI_MONITOR_PORT || 3050;

app.use(express.json({ limit: '1mb' }));

// Session tracking
const sessions = new Map(); // sessionId -> { lastSeen, userId, route, startTime, provider }
const serverHealthCache = new Map(); // serviceName -> { healthy, lastCheck, latency }

// Service definitions matching orchestrator.js
const SERVICES = [
  { name: 'web', port: 3000, health: '/health' },
  { name: 'training', port: 3001, health: '/health' },
  { name: 'meta', port: 3002, health: '/health' },
  { name: 'budget', port: 3003, health: '/health' },
  { name: 'coach', port: 3004, health: '/health' },
  { name: 'cup', port: 3005, health: '/health' },
  { name: 'product-dev', port: 3006, health: '/health' },
  { name: 'segmentation', port: 3007, health: '/health' },
  { name: 'reports', port: 3008, health: '/health' },
  { name: 'capabilities', port: 3009, health: '/health' },
  { name: 'bridge', port: 3010, health: '/health' },
  { name: 'analytics', port: 3012, health: '/health' }
];

// Mutable config
let config = {
  autoStartEnabled: true,
  healthCheckIntervalMs: 15000,
  sessionTimeoutMs: 300000, // 5 mins
  realDataMode: true, // Force real provider responses
  minActiveServers: 6, // Minimum servers to keep running
  priorityServices: ['web', 'training', 'budget', 'chat-bridge'] // Always keep these running
};

// Track active services
let runningServices = new Set();

/**
 * Check if a service is healthy
 */
async function isServiceHealthy(service, retries = 2) {
  for (let i = 0; i < retries; i++) {
    try {
      const start = Date.now();
      const res = await fetch(`http://127.0.0.1:${service.port}${service.health}`, {
        timeout: 3000,
        signal: AbortSignal.timeout(3000)
      });
      const latency = Date.now() - start;
      
      if (res.status === 200) {
        serverHealthCache.set(service.name, { healthy: true, lastCheck: Date.now(), latency });
        return true;
      }
    } catch (e) {
      if (i < retries - 1) await new Promise(r => setTimeout(r, 200));
    }
  }
  
  serverHealthCache.set(service.name, { healthy: false, lastCheck: Date.now(), latency: null });
  return false;
}

/**
 * Bulk check all services
 */
async function checkAllServices() {
  const results = {};
  for (const service of SERVICES) {
    results[service.name] = await isServiceHealthy(service);
  }
  return results;
}

/**
 * Start a specific service (if not running)
 */
async function startService(serviceName) {
  if (runningServices.has(serviceName)) return { ok: true, already: true };
  
  const service = SERVICES.find(s => s.name === serviceName);
  if (!service) return { ok: false, error: 'Service not found' };
  
  try {
    // Check if already running
    if (await isServiceHealthy(service)) {
      runningServices.add(serviceName);
      return { ok: true, already: true };
    }
    
    // Start new process
    const cmd = serviceName === 'web' ? 'node' : 'node';
    const file = serviceName === 'web' ? 'servers/web-server.js' : `servers/${serviceName}-server.js`;
    
    const proc = spawn(cmd, [file], {
      stdio: 'inherit',
      detached: false,
      env: { ...process.env }
    });
    
    runningServices.add(serviceName);
    
    // Wait for health
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 500));
      if (await isServiceHealthy(service)) {
        console.log(`✅ ${serviceName} service started (${Date.now() - Date.now()}ms)`);
        return { ok: true, started: true, pid: proc.pid };
      }
    }
    
    return { ok: true, started: true, pid: proc.pid, status: 'starting' };
  } catch (e) {
    console.error(`❌ Failed to start ${serviceName}:`, e.message);
    return { ok: false, error: e.message };
  }
}

/**
 * Ensure minimum services are running
 */
async function ensureMinimumServers() {
  if (!config.autoStartEnabled) return;
  
  const health = await checkAllServices();
  const runningCount = Object.values(health).filter(Boolean).length;
  
  console.log(`📊 Active servers: ${runningCount}/${SERVICES.length}`);
  
  // Start priority services first
  for (const name of config.priorityServices) {
    if (!health[name]) {
      console.log(`🔄 Starting priority service: ${name}`);
      await startService(name);
    }
  }
  
  // Fill up to minimum if needed
  if (runningCount < config.minActiveServers) {
    const needed = config.minActiveServers - runningCount;
    const candidates = SERVICES.filter(s => !health[s.name]);
    
    for (let i = 0; i < Math.min(needed, candidates.length); i++) {
      console.log(`🔄 Starting filler service: ${candidates[i].name}`);
      await startService(candidates[i].name);
    }
  }
}

/**
 * Track UI session activity
 */
function recordSession(sessionId, metadata = {}) {
  const session = sessions.get(sessionId) || {
    sessionId,
    startTime: Date.now(),
    activities: [],
    provider: null
  };
  
  session.lastSeen = Date.now();
  session.userId = metadata.userId || 'anonymous';
  session.route = metadata.route || 'unknown';
  session.provider = metadata.provider || session.provider;
  session.activities.push({
    timestamp: Date.now(),
    action: metadata.action || 'ping',
    route: metadata.route
  });
  
  sessions.set(sessionId, session);
  return session;
}

/**
 * Clean expired sessions
 */
function cleanupSessions() {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [id, session] of sessions) {
    if (now - session.lastSeen > config.sessionTimeoutMs) {
      sessions.delete(id);
      cleaned++;
    }
  }
  
  if (cleaned > 0) console.log(`🗑️  Cleaned ${cleaned} expired sessions`);
  return cleaned;
}

/**
 * Get real results from provider
 */
async function getRealProviderResult(prompt, provider = null) {
  try {
    // Try to get real response through budget server
    const res = await fetch('http://127.0.0.1:3003/api/v1/providers/burst', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        criticality: 'normal',
        ttlSeconds: 3600
      }),
      timeout: 10000
    });
    
    if (res.ok) {
      const data = await res.json();
      return { ok: true, ...data, realData: true };
    }
  } catch (e) {
    console.warn('⚠️ Provider burst failed:', e.message);
  }
  
  return { ok: false, realData: false };
}

// ============ API Routes ============

/**
 * POST /api/v1/activity/heartbeat
 * Register UI activity & ensure servers active
 */
app.post('/api/v1/activity/heartbeat', async (req, res) => {
  try {
    const { sessionId, route, action, userId, ensureServices = true } = req.body || {};
    
    if (!sessionId) {
      return res.status(400).json({ ok: false, error: 'sessionId required' });
    }
    
    // Record session
    const session = recordSession(sessionId, { route, action, userId });
    
    // Ensure servers are active
    if (ensureServices) {
      await ensureMinimumServers();
    }
    
    // Get current server health
    const health = await checkAllServices();
    const healthStats = Object.fromEntries(
      Object.entries(health).map(([name, healthy]) => [
        name,
        { healthy, latency: serverHealthCache.get(name)?.latency || 0 }
      ])
    );
    
    res.json({
      ok: true,
      sessionId,
      activeSessions: sessions.size,
      serversActive: Object.values(health).filter(Boolean).length,
      serverHealth: healthStats,
      config: {
        autoStart: config.autoStartEnabled,
        realDataMode: config.realDataMode
      }
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/v1/activity/sessions
 * List active sessions
 */
app.get('/api/v1/activity/sessions', (req, res) => {
  const sessionList = Array.from(sessions.values()).map(s => ({
    sessionId: s.sessionId,
    userId: s.userId,
    route: s.route,
    activeFor: Date.now() - s.startTime,
    lastSeen: Date.now() - s.lastSeen,
    provider: s.provider
  }));
  
  res.json({
    ok: true,
    activeSessions: sessionList.length,
    sessions: sessionList,
    totalActiveSessions: sessions.size
  });
});

/**
 * GET /api/v1/activity/servers
 * Get all server health status
 */
app.get('/api/v1/activity/servers', async (req, res) => {
  try {
    const health = await checkAllServices();
    
    const servers = SERVICES.map(service => {
      const cache = serverHealthCache.get(service.name);
      return {
        name: service.name,
        port: service.port,
        healthy: health[service.name],
        latency: cache?.latency || null,
        lastCheck: cache?.lastCheck || null,
        isRunning: runningServices.has(service.name),
        isPriority: config.priorityServices.includes(service.name)
      };
    });
    
    const activeCount = Object.values(health).filter(Boolean).length;
    
    res.json({
      ok: true,
      activeServers: activeCount,
      totalServers: SERVICES.length,
      servers,
      config
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * POST /api/v1/activity/start-all
 * Start all critical servers immediately
 */
app.post('/api/v1/activity/start-all', async (req, res) => {
  try {
    console.log('🚀 Starting all critical services...');
    const results = {};
    
    for (const service of config.priorityServices) {
      results[service] = await startService(service);
    }
    
    // Wait a bit and verify
    await new Promise(r => setTimeout(r, 2000));
    const health = await checkAllServices();
    
    res.json({
      ok: true,
      started: results,
      serverHealth: health
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * POST /api/v1/activity/ensure-real-data
 * Force real data mode and ensure providers active
 */
app.post('/api/v1/activity/ensure-real-data', async (req, res) => {
  try {
    config.realDataMode = true;
    
    // Make sure budget & provider servers are running
    await startService('budget');
    await startService('bridge');
    
    const realData = await getRealProviderResult('system status check');
    
    res.json({
      ok: true,
      realDataMode: config.realDataMode,
      providersActive: realData.ok,
      realDataAvailable: realData.ok
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * POST /api/v1/activity/config
 * Update configuration
 */
app.post('/api/v1/activity/config', (req, res) => {
  try {
    const updates = req.body || {};
    
    if (updates.autoStartEnabled !== undefined) config.autoStartEnabled = updates.autoStartEnabled;
    if (updates.realDataMode !== undefined) config.realDataMode = updates.realDataMode;
    if (updates.minActiveServers !== undefined) config.minActiveServers = updates.minActiveServers;
    if (updates.sessionTimeoutMs !== undefined) config.sessionTimeoutMs = updates.sessionTimeoutMs;
    
    res.json({ ok: true, config });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /health
 * Health check for orchestrator
 */
app.get('/health', (req, res) => {
  res.json({ ok: true, status: 'monitoring' });
});

// ============ Startup ============

async function main() {
  console.log('🎯 UI Activity Monitor starting...');
  
  // Initial server check
  await ensureMinimumServers();
  
  // Periodic health checks & cleanup
  setInterval(async () => {
    await ensureMinimumServers();
  }, config.healthCheckIntervalMs);
  
  setInterval(() => {
    cleanupSessions();
  }, 60000);
  
  // Start server
  app.listen(PORT, () => {
    console.log(`✅ UI Activity Monitor listening on port ${PORT}`);
    console.log(`📍 Session tracking enabled`);
    console.log(`🔄 Auto-start enabled: ${config.autoStartEnabled}`);
    console.log(`📊 Real data mode: ${config.realDataMode}`);
  });
}

main().catch(e => {
  console.error('Failed to start UI Activity Monitor:', e);
  process.exit(1);
});

export default app;
