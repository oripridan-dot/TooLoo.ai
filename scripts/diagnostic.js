#!/usr/bin/env node

/**
 * Diagnostic script for UI Activity Monitor
 * 
 * Checks all components and identifies issues
 */

import fs from 'fs';
import path from 'path';

console.log(`
╔══════════════════════════════════════════════════════╗
║  TooLoo UI Activity Monitor - Diagnostic             ║
╚══════════════════════════════════════════════════════╝
`);

let issues = [];
let warnings = [];

// Check 1: Files exist
console.log('📋 Checking files...\n');

const files = [
  'servers/ui-activity-monitor.js',
  'web-app/js/tooloo-heartbeat.js',
  'scripts/test-ui-activity-monitor.js',
  'servers/web-server.js',
  'servers/orchestrator.js'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✓ ${file}`);
  } else {
    console.log(`  ✗ ${file}`);
    issues.push(`Missing file: ${file}`);
  }
});

// Check 2: File sizes
console.log('\n📊 Checking file sizes...\n');

files.forEach(file => {
  if (fs.existsSync(file)) {
    const size = fs.statSync(file).size;
    const kb = (size / 1024).toFixed(1);
    console.log(`  ${file}: ${kb}KB`);
    
    if (size < 100) {
      warnings.push(`${file} is suspiciously small (${kb}KB)`);
    }
  }
});

// Check 3: Syntax check
console.log('\n✓ Checking syntax...\n');

const jsFiles = [
  'servers/ui-activity-monitor.js',
  'web-app/js/tooloo-heartbeat.js',
  'scripts/test-ui-activity-monitor.js'
];

jsFiles.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    // Basic check for common syntax issues
    if (content.includes('import ') || content.includes('require')) {
      console.log(`  ✓ ${file} - Has imports`);
    } else if (file.includes('heartbeat')) {
      console.log(`  ⚠ ${file} - May have issues`);
      warnings.push(`${file} might not have proper imports`);
    }
  } catch (e) {
    console.log(`  ✗ ${file} - ${e.message}`);
    issues.push(`${file} read error: ${e.message}`);
  }
});

// Check 4: Code quality
console.log('\n📝 Checking code quality...\n');

const criticalFunctions = {
  'servers/ui-activity-monitor.js': ['checkAllServices', 'recordSession', 'startService'],
  'web-app/js/tooloo-heartbeat.js': ['sendHeartbeat', 'setupActivityTracking'],
  'scripts/test-ui-activity-monitor.js': ['main', 'testActivityMonitorHealth']
};

for (const [file, funcs] of Object.entries(criticalFunctions)) {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const missing = funcs.filter(f => !content.includes(f));
    
    if (missing.length === 0) {
      console.log(`  ✓ ${file} - All functions present`);
    } else {
      console.log(`  ⚠ ${file} - Missing: ${missing.join(', ')}`);
      warnings.push(`${file} is missing functions: ${missing.join(', ')}`);
    }
  }
}

// Check 5: Configuration
console.log('\n⚙️  Checking configuration...\n');

const webServerContent = fs.readFileSync('servers/web-server.js', 'utf8');

if (webServerContent.includes('ui-activity-monitor')) {
  console.log(`  ✓ Web server references activity monitor`);
} else {
  console.log(`  ✗ Web server missing activity monitor references`);
  issues.push('Web server not properly integrated');
}

if (webServerContent.includes('tooloo-heartbeat')) {
  console.log(`  ✓ Web server references heartbeat script`);
} else {
  console.log(`  ⚠ Web server may not inject heartbeat`);
  warnings.push('Heartbeat injection might not work');
}

const orchestratorContent = fs.readFileSync('servers/orchestrator.js', 'utf8');

if (orchestratorContent.includes('ui-monitor')) {
  console.log(`  ✓ Orchestrator includes ui-monitor service`);
} else {
  console.log(`  ✗ Orchestrator missing ui-monitor`);
  warnings.push('Orchestrator not configured for ui-monitor');
}

// Summary
console.log('\n' + '═'.repeat(60));
console.log('SUMMARY');
console.log('═'.repeat(60));

if (issues.length === 0 && warnings.length === 0) {
  console.log('\n✅ All checks passed! System is ready.\n');
  console.log('Next steps:');
  console.log('  1. Run: node scripts/quick-setup-test.sh');
  console.log('  2. Or run: npm run dev');
  console.log('  3. Then test: node scripts/test-ui-activity-monitor.js\n');
  process.exit(0);
}

if (issues.length > 0) {
  console.log(`\n❌ ${issues.length} issue(s) found:\n`);
  issues.forEach((issue, i) => {
    console.log(`  ${i + 1}. ${issue}`);
  });
}

if (warnings.length > 0) {
  console.log(`\n⚠️  ${warnings.length} warning(s):\n`);
  warnings.forEach((warning, i) => {
    console.log(`  ${i + 1}. ${warning}`);
  });
}

console.log('\nTo fix issues:');
console.log('  1. Check the files exist in the repository');
console.log('  2. Verify they were created correctly');
console.log('  3. Run: npm run clean && npm run dev\n');

process.exit(issues.length > 0 ? 1 : 0);
