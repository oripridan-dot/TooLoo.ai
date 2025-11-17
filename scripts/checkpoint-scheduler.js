#!/usr/bin/env node

/**
 * Checkpoint Monitoring Scheduler (No External Dependencies)
 * Uses pure Node.js setInterval to schedule Checkpoints 5-7 at specific times
 * Can be run as a background service
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.dirname(__dirname);

const LOG_DIR = '/tmp/checkpoint-monitoring';
const RESULTS_FILE = path.join(PROJECT_DIR, '.checkpoint-results.json');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(path.join(LOG_DIR, 'scheduler.log'), logMessage + '\n');
}

function getMinutesUntilTarget(targetHour, targetMinute) {
  const now = new Date();
  const target = new Date();
  target.setUTCHours(targetHour, targetMinute, 0, 0);
  
  // If target time has passed today, schedule for tomorrow
  if (target < now) {
    target.setDate(target.getDate() + 1);
  }
  
  return Math.floor((target - now) / (1000 * 60));
}

async function ensureWebserver() {
  try {
    await execAsync('curl -s -m 2 http://127.0.0.1:3000/health', { timeout: 5000 });
    return true;
  } catch {
    log('⏳ Starting web-server...');
    exec(`cd "${PROJECT_DIR}" && node servers/web-server.js > "${LOG_DIR}/web-server.log" 2>&1 &`);
    await new Promise(r => setTimeout(r, 3000));
    return true;
  }
}

async function runCheckpoint(checkpointNum) {
  log(`\n🚀 Running Checkpoint ${checkpointNum}`);
  
  try {
    await ensureWebserver();
    
    const { stdout } = await execAsync(
      `cd "${PROJECT_DIR}" && node scripts/checkpoint-monitor.js ${checkpointNum}`,
      { timeout: 30000 }
    );
    
    // Save output
    fs.writeFileSync(
      path.join(LOG_DIR, `checkpoint-${checkpointNum}.log`),
      stdout
    );
    
    // Parse results
    const passed = stdout.includes('✅ PASSED');
    const passRate = stdout.match(/Pass Rate: (\d+)%/)?.[1] || '0';
    
    if (passed) {
      log(`✅ Checkpoint ${checkpointNum} PASSED (${passRate}%)`);
    } else {
      log(`❌ Checkpoint ${checkpointNum} FAILED (${passRate}%)`);
    }
    
    // Append to results file
    const result = {
      checkpoint: checkpointNum,
      timestamp: new Date().toISOString(),
      passed,
      passRate: parseInt(passRate)
    };
    
    let results = [];
    if (fs.existsSync(RESULTS_FILE)) {
      results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
    }
    results.push(result);
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
    
    return { checkpoint: checkpointNum, passed, passRate };
  } catch (error) {
    log(`❌ Checkpoint ${checkpointNum} ERROR: ${error.message}`);
    return { checkpoint: checkpointNum, passed: false, error: error.message };
  }
}

function scheduleCheckpoint(cpNum, hourUTC, minuteUTC, isDecision = false) {
  // Calculate initial delay
  const minutesUntil = getMinutesUntilTarget(hourUTC, minuteUTC);
  const delayMs = minutesUntil * 60 * 1000;
  
  const nextRunDate = new Date(Date.now() + delayMs);
  log(`✅ Checkpoint ${cpNum} scheduled for ${nextRunDate.toUTCString()}`);
  
  // Schedule the checkpoint
  setTimeout(async () => {
    if (isDecision) {
      log('\n⏰ 🎯 DECISION POINT - Checkpoint 7 running NOW');
      const result = await runCheckpoint(cpNum);
      
      // Final summary
      log('\n' + '='.repeat(80));
      if (result.passed) {
        log('🎉 DECISION: APPROVED FOR PRODUCTION ✅');
        log('Next: Phase 4.5 Development (Nov 22-23)');
      } else {
        log('⚠️  DECISION: INVESTIGATE OR EXTEND MONITORING ⚠️');
      }
      log('='.repeat(80));
    } else {
      log(`\n⏰ Checkpoint ${cpNum} running NOW`);
      await runCheckpoint(cpNum);
    }
    
    // Reschedule for next month (unlikely to be needed)
    setTimeout(() => scheduleCheckpoint(cpNum, hourUTC, minuteUTC, isDecision), 30 * 24 * 60 * 60 * 1000);
  }, delayMs);
}

function start() {
  log('🎯 Checkpoint Monitoring Scheduler Started');
  log('Scheduling automated Checkpoints 5-7 for Nov 18-19, 2025\n');
  
  // Checkpoint 5: Nov 18, 00:30 UTC
  scheduleCheckpoint(5, 0, 30, false);
  
  // Checkpoint 6: Nov 18, 08:30 UTC
  scheduleCheckpoint(6, 8, 30, false);
  
  // Checkpoint 7: Nov 19, 12:30 UTC (DECISION POINT)
  scheduleCheckpoint(7, 12, 30, true);
  
  log('\n📋 Monitoring service running. Press Ctrl+C to stop.\n');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('\n🛑 Scheduler shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('\n🛑 Scheduler terminating...');
  process.exit(0);
});

// Start the scheduler
try {
  start();
} catch (error) {
  log(`❌ Failed to start scheduler: ${error.message}`);
  process.exit(1);
}
