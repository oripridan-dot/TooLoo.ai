#!/usr/bin/env node
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Active TooLoo.ai architecture per copilot-instructions.md
const SERVICES = [
  // Core v3 services (modern architecture)
  { name: 'learning-service', port: 3001, envVar: 'PORT', file: 'servers/learning-service.js' },
  { name: 'provider-service', port: 3200, envVar: 'PORT', file: 'servers/provider-service.js' },
  { name: 'context-service', port: 3020, envVar: 'PORT', file: 'servers/context-service.js' },
  { name: 'integration-service', port: 3400, envVar: 'PORT', file: 'servers/integration-service.js' },
  { name: 'analytics-service', port: 3300, envVar: 'PORT', file: 'servers/analytics-service.js' },
  { name: 'orchestration-service', port: 3100, envVar: 'PORT', file: 'servers/orchestration-service.js' },
  
  // Original services (for backward compatibility)
  { name: 'training-server', port: 3001, envVar: 'TRAINING_PORT', file: 'servers/training-server.js' },
  { name: 'meta-server', port: 3002, envVar: 'META_PORT', file: 'servers/meta-server.js' },
  { name: 'budget-server', port: 3003, envVar: 'BUDGET_PORT', file: 'servers/budget-server.js' },
  { name: 'coach-server', port: 3004, envVar: 'COACH_PORT', file: 'servers/coach-server.js' },
  { name: 'cup-server', port: 3005, envVar: 'CUP_PORT', file: 'servers/cup-server.js' },
  { name: 'product-development-server', port: 3006, envVar: 'PRODUCT_PORT', file: 'servers/product-development-server.js' },
  { name: 'segmentation-server', port: 3007, envVar: 'SEGMENTATION_PORT', file: 'servers/segmentation-server.js' },
  { name: 'reports-server', port: 3008, envVar: 'REPORTS_PORT', file: 'servers/reports-server.js' },
  { name: 'capabilities-server', port: 3009, envVar: 'CAPABILITIES_PORT', file: 'servers/capabilities-server.js' }
];

async function start() {
  console.log('\n🎼 TooLoo.ai Orchestrator - Starting All Services\n');
  for (const service of SERVICES) {
    const filePath = path.join(PROJECT_ROOT, service.file);
    if (!fs.existsSync(filePath)) {
      console.log(`  ❌ ${service.name} - file not found`);
      continue;
    }
    const envVar = service.envVar || 'PORT';
    const env = { ...process.env, [envVar]: service.port.toString() };
    const proc = spawn('node', [filePath], {
      env,
      stdio: 'inherit',
      cwd: PROJECT_ROOT
    });
    proc.on('error', (err) => console.error(`Error starting ${service.name}:`, err));
  }
}

start().catch(console.error);
