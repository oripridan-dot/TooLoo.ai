#!/usr/bin/env node
/**
 * TooLoo.ai Startup Diagnostic Tool
 * Checks system state before and after startup
 */

import { createRequire } from 'module';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SERVICES, validateServiceConfig } from '../config/services.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function header(title) {
  console.log('\n' + '═'.repeat(50));
  log(title, 'bold');
  console.log('═'.repeat(50));
}

/**
 * Check port availability
 */
async function checkPorts() {
  header('📡 Port Availability');

  const checking = SERVICES.slice(0, 5); // Check first 5 services
  let available = 0;
  let inUse = 0;

  for (const svc of checking) {
    try {
      await fetch(`http://127.0.0.1:${svc.port}/`, {
        timeout: 500
      });
      log(`  Port ${svc.port}: IN USE (${svc.name})`, 'red');
      inUse++;
    } catch {
      log(`  Port ${svc.port}: Available`, 'green');
      available++;
    }
  }

  console.log(`\nSummary: ${available} available, ${inUse} in use`);
}

/**
 * Check service files exist
 */
function checkServiceFiles() {
  header('📂 Service Files');

  let exists = 0;
  let missing = 0;

  for (const svc of SERVICES) {
    const fullPath = path.join(path.dirname(__dirname), svc.file);
    const fileExists = fs.existsSync(fullPath);

    if (fileExists) {
      log(`  [OK] ${svc.name}`, 'green');
      exists++;
    } else {
      log(`  [MISSING] ${svc.name} (${svc.file})`, 'red');
      missing++;
    }
  }

  console.log(`\nSummary: ${exists} exist, ${missing} missing`);
}

/**
 * Validate configuration
 */
function validateConfig() {
  header('🔍 Configuration Validation');

  const { valid, errors } = validateServiceConfig();

  if (valid) {
    log('  ✅ Configuration is valid', 'green');
  } else {
    log('  ❌ Configuration errors:', 'red');
    errors.forEach(e => log(`     - ${e}`, 'red'));
  }

  console.log(`\nTotal services configured: ${SERVICES.length}`);
}

/**
 * Check environment variables
 */
function checkEnvironment() {
  header('🌍 Environment Variables');

  const required = [
    'NODE_ENV',
    'PROJECT_ROOT'
  ];

  const optional = [
    'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY',
    'OLLAMA_URL'
  ];

  console.log('Required:');
  required.forEach(v => {
    if (process.env[v]) {
      log(`  ✅ ${v}`, 'green');
    } else {
      log(`  ❌ ${v} (not set)`, 'red');
    }
  });

  console.log('\nOptional:');
  optional.forEach(v => {
    if (process.env[v]) {
      log(`  ✅ ${v} (set)`, 'green');
    } else {
      log(`  ℹ️  ${v} (not set)`, 'yellow');
    }
  });
}

/**
 * Check Node version
 */
function checkNodeVersion() {
  header('📦 Node.js Version');

  const version = process.version;
  const major = parseInt(version.split('.')[0].slice(1));

  log(`  Node version: ${version}`, major >= 18 ? 'green' : 'red');

  if (major < 18) {
    log(
      '  ⚠️  Recommended Node.js 18+',
      'yellow'
    );
  }
}

/**
 * Check startup log
 */
function checkStartupLog() {
  header('📝 Startup Log');

  const logFile = '/tmp/tooloo-startup.jsonl';

  if (fs.existsSync(logFile)) {
    const content = fs.readFileSync(logFile, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());

    if (lines.length === 0) {
      log('  (No startup log entries yet)', 'yellow');
    } else {
      log('  Recent entries (last 5):', 'blue');

      const recent = lines.slice(-5);
      recent.forEach(line => {
        try {
          const entry = JSON.parse(line);
          const icon =
            entry.type === 'ready' ? '✅' :
              entry.type === 'error' ? '❌' :
                entry.type === 'timeout' ? '⏱️' :
                  'ℹ️';

          console.log(
            `    ${icon} ${entry.service}: ${entry.type} (${entry.elapsed})`
          );
        } catch { }
      });
    }
  } else {
    log('  (No startup log yet)', 'yellow');
  }
}

/**
 * Service dependency graph
 */
function showDependencyGraph() {
  header('🔗 Service Dependency Graph');

  const servicesWithDeps = SERVICES.filter(s => s.dependsOn?.length);

  if (servicesWithDeps.length === 0) {
    log('  No services with dependencies', 'yellow');
  } else {
    servicesWithDeps.forEach(svc => {
      log(`  ${svc.name}`, 'blue');
      svc.dependsOn.forEach(dep => {
        log(`    ↓ requires ${dep}`, 'reset');
      });
    });
  }
}

/**
 * Main diagnostic
 */
async function runDiagnostics() {
  log(
    '\n🔧 TooLoo.ai Startup Diagnostic Tool\n',
    'bold'
  );

  checkNodeVersion();
  checkEnvironment();
  validateConfig();
  checkServiceFiles();
  await checkPorts();
  checkStartupLog();
  showDependencyGraph();

  console.log('\n' + '═'.repeat(50));
  log('✅ Diagnostic complete!\n', 'green');
  log('Next steps:', 'bold');
  log('  1. npm run stop:all        (stop any running services)', 'reset');
  log('  2. npm run dev             (start the system)', 'reset');
  log('  3. tail -f /tmp/tooloo-startup.jsonl  (watch startup progress)', 'reset');
  console.log('');
}

runDiagnostics().catch(err => {
  log(`\n❌ Diagnostic failed: ${err.message}\n`, 'red');
  process.exit(1);
});
