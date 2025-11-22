#!/usr/bin/env node
/**
 * TooLoo.ai Orchestrator v5 (TypeScript Optimized)
 * High-performance, parallel-capable service orchestration.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Resolve to workspace root (assuming src/servers/orchestrator.ts)
const PROJECT_ROOT = path.resolve(__dirname, '../..');

// ============================================================================
// SERVICE REGISTRY (TypeScript Paths)
// ============================================================================
const SERVICE_REGISTRY = [
  {
    id: 'brain',
    name: 'brain-service',
    file: 'src/servers/brain-service.ts',
    ports: [3001, 3002, 3007, 3004],
    primaryPort: 3001,
    envVars: {
      TRAINING_PORT: '3001',
      META_PORT: '3002',
      SEGMENTATION_PORT: '3007',
      COACH_PORT: '3004'
    },
    priority: 1,
    healthEndpoint: '/health',
    timeout: 60000,
    dependencies: []
  },
  {
    id: 'hands',
    name: 'hands-service',
    file: 'src/servers/hands-service.ts',
    ports: [3006, 3009, 3003, 3017],
    primaryPort: 3006,
    envVars: {
      PRODUCT_PORT: '3006',
      CAPABILITIES_PORT: '3009',
      BUDGET_PORT: '3003',
      IDE_PORT: '3017'
    },
    priority: 2,
    healthEndpoint: '/health',
    timeout: 60000,
    dependencies: ['brain']
  },
  {
    id: 'eyes',
    name: 'eyes-service',
    file: 'src/servers/eyes-service.ts',
    ports: [3000, 3008, 3050],
    primaryPort: 3000,
    envVars: {
      WEB_PORT: '3000',
      REPORTS_PORT: '3008',
      ACTIVITY_MONITOR_PORT: '3050'
    },
    priority: 3,
    healthEndpoint: '/health',
    timeout: 60000,
    dependencies: ['brain', 'hands']
  },
  {
    id: 'admin',
    name: 'repo-manager',
    file: 'src/servers/repo-manager.ts',
    ports: [3010],
    primaryPort: 3010,
    envVars: {
      REPO_MANAGER_PORT: '3010'
    },
    priority: 4,
    healthEndpoint: '/health',
    timeout: 60000,
    dependencies: ['eyes']
  },
  {
    id: 'projects',
    name: 'project-server',
    file: 'src/servers/project-server.ts',
    ports: [3011],
    primaryPort: 3011,
    envVars: {
      PROJECT_SERVER_PORT: '3011'
    },
    priority: 3,
    healthEndpoint: '/health',
    timeout: 60000,
    dependencies: ['eyes']
  }
];

// ============================================================================
// UTILITIES
// ============================================================================

async function checkHealth(service: any) {
  try {
    const url = `http://127.0.0.1:${service.primaryPort}${service.healthEndpoint}`;
    const response = await fetch(url, { timeout: 1000 }); // Fast timeout
    return response.status === 200;
  } catch (e) {
    return false;
  }
}

async function waitForDependencies(service: any, maxWaitMs = 30000) {
  const depServices = service.dependencies
    .map((depId: string) => SERVICE_REGISTRY.find(s => s.id === depId))
    .filter(Boolean);
  
  if (depServices.length === 0) return true;
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    const allHealthy = await Promise.all(
      depServices.map((dep: any) => checkHealth(dep))
    );
    
    if (allHealthy.every(h => h)) return true;
    
    // Fast polling for dependencies (200ms)
    await new Promise(r => setTimeout(r, 200));
  }
  return false;
}

async function spawnService(service: any) {
  const filePath = path.join(PROJECT_ROOT, service.file);
  
  if (!fs.existsSync(filePath)) {
    console.error(`  ❌ FILE MISSING: ${filePath}`);
    return false;
  }
  
  // Wait for dependencies first
  const depsReady = await waitForDependencies(service);
  if (!depsReady) {
    console.error(`  ❌ ${service.name} dependency timeout`);
    return false;
  }
  
  const env = {
    ...process.env,
    ...service.envVars,
    NODE_ENV: process.env.NODE_ENV || 'production'
  };
  
  return new Promise((resolve) => {
    // USE TSX for TypeScript execution
    const proc = spawn('npx', ['tsx', filePath], {
      env,
      stdio: 'inherit',
      cwd: PROJECT_ROOT,
      detached: false
    });
    
    let isHealthy = false;
    // Fast polling for startup (250ms)
    const healthCheckInterval = setInterval(async () => {
      if (!isHealthy && await checkHealth(service)) {
        isHealthy = true;
        clearInterval(healthCheckInterval);
        console.log(`  ✅ ${service.name} is READY`);
        resolve(true);
      }
    }, 250);
    
    proc.on('error', (err) => {
      clearInterval(healthCheckInterval);
      console.error(`  ❌ ${service.name} ERROR: ${err.message}`);
      resolve(false);
    });
    
    // Timeout
    setTimeout(() => {
      if (!isHealthy) {
        clearInterval(healthCheckInterval);
        console.error(`  ⏱️  ${service.name} TIMEOUT`);
        resolve(false);
      }
    }, service.timeout);
  });
}

async function startAllServices() {
  console.log('\n�� TooLoo.ai Orchestrator v5 - Starting Clusters...\n');
  
  const sorted = [...SERVICE_REGISTRY].sort((a, b) => a.priority - b.priority);
  
  for (const service of sorted) {
    // No artificial delay here - go as fast as possible
    await spawnService(service);
  }
  
  console.log('\n✨ All services spawned.\n');
}

// ============================================================================
// MAIN
// ============================================================================

// Graceful shutdown
process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

startAllServices().catch(err => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
