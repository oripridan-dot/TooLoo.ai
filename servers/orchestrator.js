#!/usr/bin/env node
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

const SERVICES = [
  { name: 'learning-service', port: 3001, file: 'servers/learning-service.js' },
  { name: 'provider-service', port: 3200, file: 'servers/provider-service.js' },
  { name: 'context-service', port: 3020, file: 'servers/context-service.js' },
  { name: 'integration-service', port: 3400, file: 'servers/integration-service.js' },
  { name: 'analytics-service', port: 3300, file: 'servers/analytics-service.js' },
  { name: 'orchestration-service', port: 3100, file: 'servers/orchestration-service.js' }
];

async function start() {
  console.log('\n🎼 TooLoo.ai v3 Orchestrator\n');
  for (const service of SERVICES) {
    const filePath = path.join(PROJECT_ROOT, service.file);
    if (!fs.existsSync(filePath)) {
      console.log(`  ❌ ${service.name} - file not found`);
      continue;
    }
    const proc = spawn('node', [filePath], {
      env: { ...process.env, PORT: service.port.toString() },
      stdio: 'inherit',
      cwd: PROJECT_ROOT
    });
    proc.on('error', (err) => console.error(`Error starting ${service.name}:`, err));
  }
}

start().catch(console.error);
