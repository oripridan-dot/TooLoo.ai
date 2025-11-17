#!/usr/bin/env node

/**
 * Automated Checkpoint Runner
 * Runs checkpoints 5-7 on schedule (Nov 18-19)
 * Can be scheduled with cron or run manually
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CHECKPOINT_SCHEDULE = {
  5: { date: 'Nov 18', time: '00:30 UTC', nextRun: null },
  6: { date: 'Nov 18', time: '08:30 UTC', nextRun: null },
  7: { date: 'Nov 19', time: '12:30 UTC', nextRun: null, isDecision: true },
};

function parseScheduleTime(dateStr, timeStr) {
  // Example: "Nov 18" and "00:30 UTC"
  const now = new Date();
  const year = now.getFullYear();
  
  // Parse the time
  const timeParts = timeStr.split(' ')[0].split(':');
  const hours = parseInt(timeParts[0]);
  const minutes = parseInt(timeParts[1]);
  
  // Create date
  const dateObj = new Date(`${dateStr} ${year} ${hours}:${minutes}:00 UTC`);
  
  return dateObj;
}

async function runCheckpoint(checkpointNum) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🚀 Running Checkpoint ${checkpointNum} at ${new Date().toISOString()}`);
  console.log(`${'='.repeat(80)}\n`);
  
  try {
    // Ensure web-server is running
    console.log('Checking web-server status...');
    try {
      const { stdout } = await execAsync('curl -s http://127.0.0.1:3000/health', { timeout: 5000 });
      console.log('✅ Web-server is running\n');
    } catch {
      console.log('⏳ Starting web-server...');
      exec('cd /workspaces/TooLoo.ai && node servers/web-server.js > /tmp/ws.log 2>&1 &');
      await new Promise(r => setTimeout(r, 3000));
    }
    
    // Run checkpoint
    const { stdout } = await execAsync(`node ${path.join(__dirname, 'checkpoint-monitor.js')} ${checkpointNum}`);
    console.log(stdout);
    
    // Parse results
    const passed = stdout.includes('✅ PASSED');
    const passRate = stdout.match(/Pass Rate: (\d+)%/)?.[1] || '0';
    
    return {
      checkpoint: checkpointNum,
      timestamp: new Date().toISOString(),
      passed,
      passRate: parseInt(passRate),
      output: stdout
    };
  } catch (error) {
    console.error(`❌ Checkpoint ${checkpointNum} failed:`, error.message);
    return {
      checkpoint: checkpointNum,
      timestamp: new Date().toISOString(),
      passed: false,
      passRate: 0,
      error: error.message
    };
  }
}

async function runScheduledCheckpoints() {
  console.log('\n📋 AUTOMATED CHECKPOINT RUNNER');
  console.log('Monitoring Nov 17-19, Checkpoints 5-7\n');
  
  const results = [];
  
  for (const [cp, schedule] of Object.entries(CHECKPOINT_SCHEDULE)) {
    const checkpointNum = parseInt(cp);
    
    // Calculate next run time
    const nextRun = parseScheduleTime(schedule.date, schedule.time);
    const now = new Date();
    
    console.log(`Checkpoint ${checkpointNum}: ${schedule.date} ${schedule.time}`);
    console.log(`  Next run: ${nextRun.toISOString()}`);
    
    if (nextRun <= now) {
      console.log(`  Status: ⏱️ DUE (running now...)\n`);
      const result = await runCheckpoint(checkpointNum);
      results.push(result);
    } else {
      const diffMs = nextRun - now;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      console.log(`  Status: ⏳ PENDING (in ${diffHours}h ${diffMins}m)\n`);
    }
  }
  
  // Summary
  if (results.length > 0) {
    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 CHECKPOINT SUMMARY');
    console.log(`${'='.repeat(80)}\n`);
    
    for (const result of results) {
      const status = result.passed ? '✅ PASSED' : '❌ FAILED';
      console.log(`Checkpoint ${result.checkpoint}: ${status} (${result.passRate}%)`);
    }
    
    const allPassed = results.every(r => r.passed);
    console.log(`\nOverall: ${allPassed ? '✅ ALL PASSED' : '⚠️ SOME FAILED'}\n`);
    
    // Save results
    const resultsFile = path.join(__dirname, '../.checkpoint-results.json');
    let allResults = [];
    if (fs.existsSync(resultsFile)) {
      allResults = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
    }
    allResults.push(...results);
    fs.writeFileSync(resultsFile, JSON.stringify(allResults, null, 2));
    
    console.log(`Results saved to ${resultsFile}`);
  }
}

// CLI Interface
const args = process.argv.slice(2);

if (args.includes('--help')) {
  console.log(`
Automated Checkpoint Runner

Usage:
  node checkpoint-runner.js              # Run checkpoints due now
  node checkpoint-runner.js --all        # Check all scheduled times
  node checkpoint-runner.js --watch      # Run once and exit
  node checkpoint-runner.js --help       # Show this message

Checkpoints:
  5 - Nov 18, 00:30 UTC
  6 - Nov 18, 08:30 UTC
  7 - Nov 19, 12:30 UTC (DECISION POINT)
  `);
  process.exit(0);
}

if (args.includes('--watch')) {
  console.log('Watch mode: Running scheduled checkpoints...');
  runScheduledCheckpoints().then(() => {
    console.log('\n✅ Checkpoint runner completed');
    process.exit(0);
  }).catch(err => {
    console.error('\n❌ Error:', err);
    process.exit(1);
  });
} else {
  runScheduledCheckpoints().catch(console.error);
}
