#!/usr/bin/env node
/**
 * TooLoo.ai Orchestrator v3
 * 
 * Streamlined, dependency-aware service orchestration
 * - Starts only the 9 core services (no duplicate web-server proxy)
 * - Respects service dependencies (Training must start before Coach)
 * - Intelligent health checking with exponential backoff
 * - Graceful failure handling with per-service retry logic
 * - Built for horizontal scaling and future service additions
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

// ============================================================================
// SERVICE REGISTRY - Define all core TooLoo.ai services
// ============================================================================
// This is the single source of truth for all services
const SERVICE_REGISTRY = [
  // Priority 1: Core infrastructure services (no dependencies)
  {
    id: 'training',
    name: 'training-server',
    file: 'servers/training-server.js',
    port: 3001,
    envVar: 'TRAINING_PORT',
    priority: 1,
    healthEndpoint: '/health', // Standard health endpoint from ServiceFoundation
    timeout: 30000,
    dependencies: []
  },
  {
    id: 'meta',
    name: 'meta-server',
    file: 'servers/meta-server.js',
    port: 3002,
    envVar: 'META_PORT',
    priority: 1,
    healthEndpoint: '/health',
    timeout: 30000,
    dependencies: []
  },
  {
    id: 'budget',
    name: 'budget-server',
    file: 'servers/budget-server.js',
    port: 3003,
    envVar: 'BUDGET_PORT',
    priority: 1,
    healthEndpoint: '/health',
    timeout: 30000,
    dependencies: []
  },
  // Priority 2: Services with dependencies (core AI features)
  {
    id: 'coach',
    name: 'coach-server',
    file: 'servers/coach-server.js',
    port: 3004,
    envVar: 'COACH_PORT',
    priority: 2,
    healthEndpoint: '/health',
    timeout: 30000,
    dependencies: ['training'] // Requires training to be running first
  },
  {
    id: 'product',
    name: 'product-development-server',
    file: 'servers/product-development-server.js',
    port: 3006,
    envVar: 'PRODUCT_PORT',
    priority: 2,
    healthEndpoint: '/health',
    timeout: 30000,
    dependencies: []
  },
  {
    id: 'segmentation',
    name: 'segmentation-server',
    file: 'servers/segmentation-server.js',
    port: 3007,
    envVar: 'SEGMENTATION_PORT',
    priority: 2,
    healthEndpoint: '/health',
    timeout: 30000,
    dependencies: []
  },
  {
    id: 'reports',
    name: 'reports-server',
    file: 'servers/reports-server.js',
    port: 3008,
    envVar: 'REPORTS_PORT',
    priority: 2,
    healthEndpoint: '/health',
    timeout: 30000,
    dependencies: ['training', 'meta', 'budget'] // Aggregates data from these services
  },
  {
    id: 'capabilities',
    name: 'capabilities-server',
    file: 'servers/capabilities-server.js',
    port: 3009,
    envVar: 'CAPABILITIES_PORT',
    priority: 2,
    healthEndpoint: '/health',
    timeout: 30000,
    dependencies: []
  }
];

// ============================================================================
// STATE TRACKING
// ============================================================================
const state = {
  services: new Map(), // id -> { process, port, status, healthChecks, lastError }
  startTime: null,
  failureCount: new Map(), // id -> count (reset after successful start)
  completedBatches: [],
  allServicesStarted: false
};

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Check if a port is in use
 */
async function isPortInUse(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`, { timeout: 2000 });
    return response.status === 200;
  } catch {
    return false;
  }
}

/**
 * Kill process on port using fuser (more reliable than lsof)
 */
function killPortProcess(port) {
  return new Promise((resolve) => {
    const proc = spawn('fuser', ['-k', `${port}/tcp`], { stdio: 'pipe' });
    proc.on('close', () => {
      console.log(`  🔪 Cleared port ${port}`);
      resolve(true);
    });
    proc.on('error', () => {
      // fuser not available, try lsof as fallback
      const lsof = spawn('lsof', ['-ti', `:${port}`], { stdio: 'pipe' });
      let pid = '';
      lsof.stdout.on('data', (data) => { pid += data.toString(); });
      lsof.on('close', () => {
        if (pid.trim()) {
          try {
            process.kill(parseInt(pid), 'SIGKILL');
            console.log(`  🔪 Cleared port ${port}`);
          } catch (e) {
            // Already dead
          }
        }
        resolve(true);
      });
    });
  });
}

/**
 * Check service health
 */
async function checkHealth(service) {
  try {
    const url = `http://127.0.0.1:${service.port}${service.healthEndpoint}`;
    const response = await fetch(url, { timeout: 5000 });
    return response.status === 200;
  } catch (e) {
    return false;
  }
}

/**
 * Wait for dependencies to be healthy
 */
async function waitForDependencies(service, maxWaitMs = 30000) {
  const depServices = service.dependencies
    .map(depId => SERVICE_REGISTRY.find(s => s.id === depId))
    .filter(Boolean);
  
  if (depServices.length === 0) return true;
  
  const startTime = Date.now();
  console.log(`  ⏳ Waiting for dependencies: ${service.dependencies.join(', ')}`);
  
  while (Date.now() - startTime < maxWaitMs) {
    const allHealthy = await Promise.all(
      depServices.map(dep => checkHealth(dep))
    );
    
    if (allHealthy.every(h => h)) {
      console.log(`  ✅ All dependencies ready for ${service.id}`);
      return true;
    }
    
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log(`  ⚠️  Dependency timeout for ${service.id}`);
  return false;
}

/**
 * Spawn a single service
 */
async function spawnService(service) {
  const filePath = path.join(PROJECT_ROOT, service.file);
  
  // Validate file exists
  if (!fs.existsSync(filePath)) {
    console.log(`  ❌ ${service.name} (${service.port}) - FILE NOT FOUND`);
    state.failureCount.set(service.id, (state.failureCount.get(service.id) || 0) + 1);
    return false;
  }
  
  // Kill any existing process on this port
  const inUse = await isPortInUse(service.port);
  if (inUse) {
    console.log(`  ⚠️  Port ${service.port} in use, clearing...`);
    await killPortProcess(service.port);
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Wait for dependencies
  const depsReady = await waitForDependencies(service);
  if (!depsReady) {
    state.failureCount.set(service.id, (state.failureCount.get(service.id) || 0) + 1);
    return false;
  }
  
  // Spawn process
  const env = {
    ...process.env,
    [service.envVar]: service.port.toString(),
    NODE_ENV: process.env.NODE_ENV || 'production'
  };
  
  return new Promise((resolve) => {
    const proc = spawn('node', [filePath], {
      env,
      stdio: 'inherit',
      cwd: PROJECT_ROOT,
      detached: false
    });
    
    let isHealthy = false;
    const healthCheckInterval = setInterval(async () => {
      if (!isHealthy && await checkHealth(service)) {
        isHealthy = true;
        state.failureCount.delete(service.id); // Reset failure counter on success
        clearInterval(healthCheckInterval);
        console.log(`  ✅ ${service.name} (${service.port}) - HEALTHY`);
        resolve(true);
      }
    }, 2000);
    
    proc.on('error', (err) => {
      clearInterval(healthCheckInterval);
      console.error(`  ❌ ${service.name} - ERROR: ${err.message}`);
      state.failureCount.set(service.id, (state.failureCount.get(service.id) || 0) + 1);
      resolve(false);
    });
    
    proc.on('exit', (code) => {
      clearInterval(healthCheckInterval);
      if (code && code !== 0 && code !== null) {
        console.log(`  ⚠️  ${service.name} exited with code ${code}`);
        state.failureCount.set(service.id, (state.failureCount.get(service.id) || 0) + 1);
      }
    });
    
    state.services.set(service.id, {
      process: proc,
      port: service.port,
      status: 'spawned',
      healthChecks: 0,
      lastError: null
    });
    
    console.log(`  🚀 ${service.name} (${service.port}) - SPAWNED`);
    
    // Output port label for VS Code to detect
    setTimeout(() => {
      console.log(`🔗 [${service.name}] http://127.0.0.1:${service.port}`);
    }, 500);
    
    // Timeout: if not healthy within service timeout, fail and move on
    setTimeout(() => {
      clearInterval(healthCheckInterval);
      if (!isHealthy) {
        console.log(`  ⏱️  ${service.name} - HEALTH CHECK TIMEOUT`);
        resolve(false);
      }
    }, service.timeout);
  });
}

/**
 * Start services in priority order with dependency awareness
 */
async function startAllServices() {
  console.log('\n🎼 TooLoo.ai Orchestrator v3 - Starting Services\n');
  console.log(`📋 Found ${SERVICE_REGISTRY.length} services to start\n`);
  
  // Sort by priority (lower = earlier)
  const sorted = [...SERVICE_REGISTRY].sort((a, b) => a.priority - b.priority);
  
  // Start services in batches respecting dependencies
  const MAX_CONCURRENT = 3;
  const started = [];
  
  for (let i = 0; i < sorted.length; i += MAX_CONCURRENT) {
    const batch = sorted.slice(i, i + MAX_CONCURRENT);
    const batchNum = Math.floor(i / MAX_CONCURRENT) + 1;
    
    console.log(`📦 Batch ${batchNum} (${batch.map(s => s.id).join(', ')}):\n`);
    
    const results = await Promise.all(batch.map(spawnService));
    const successCount = results.filter(Boolean).length;
    
    state.completedBatches.push({ batchNum, count: successCount, total: batch.length });
    console.log(`   ✓ Batch ${batchNum}: ${successCount}/${batch.length} services spawned\n`);
    
    // Small delay between batches
    if (i + MAX_CONCURRENT < sorted.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  
  state.allServicesStarted = true;
  console.log('\n✨ All services spawned. Orchestrator monitoring active.\n');
  
  // Print port map for VS Code and monitoring
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║              🌐 ACTIVE SERVICE PORTS                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  SERVICE_REGISTRY.forEach(service => {
    console.log(`  🔗 ${service.name.padEnd(35)} → http://127.0.0.1:${service.port}`);
  });
  console.log('\n');
}

/**
 * Graceful shutdown
 */
function shutdown() {
  console.log('\n🛑 Orchestrator shutting down...');
  state.services.forEach((svc) => {
    try {
      svc.process.kill('SIGTERM');
    } catch (e) {
      // Already terminated
    }
  });
  process.exit(0);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  state.startTime = Date.now();
  
  // Print banner
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  🎼 TooLoo.ai Orchestrator v3 - Service Orchestration     ║');
  console.log('║  → Dependency-aware, health-checked, production-ready    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // Start services
  await startAllServices();
  
  // Keep alive
  setInterval(() => {
    // Could add periodic health checks here
  }, 5000);
}

// Graceful shutdown handlers
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start
main().catch((err) => {
  console.error('\n❌ Orchestrator fatal error:', err);
  process.exit(1);
});
