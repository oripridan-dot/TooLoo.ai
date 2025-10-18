#!/usr/bin/env node

/**
 * Bridge Metrics Monitor
 * 
 * Tracks Phase 1 Capability-Workflow Bridge performance metrics over time.
 * Polls /api/v1/bridge/loop-status and stores in time-series format.
 * 
 * Usage:
 *   node scripts/monitor-bridge-metrics.js --interval 5000 --output data/bridge-metrics.jsonl
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BRIDGE_URL = process.env.BRIDGE_URL || 'http://127.0.0.1:3010';
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || process.argv.find(a => a.startsWith('--interval='))?.split('=')[1] || '5000');
const OUTPUT_FILE = process.env.METRICS_FILE || process.argv.find(a => a.startsWith('--output='))?.split('=')[1] || path.join(process.cwd(), 'data', 'bridge-metrics.jsonl');

let pollCount = 0;
let successCount = 0;
let errorCount = 0;
const startTime = Date.now();

async function ensureOutputDir() {
  const dir = path.dirname(OUTPUT_FILE);
  await fs.mkdir(dir, { recursive: true });
}

async function pollMetrics() {
  try {
    const response = await fetch(`${BRIDGE_URL}/api/v1/bridge/loop-status`, {
      timeout: 3000
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.ok) {
      throw new Error('Bridge returned ok=false');
    }

    const metrics = {
      timestamp: new Date().toISOString(),
      unix: Date.now(),
      uptime: (Date.now() - startTime) / 1000,
      pollCount,
      
      // Extract stats
      gapsDetected: data.stats?.gapsDetected || 0,
      workflowsSuggested: data.stats?.workflowsSuggested || 0,
      trainingEnqueued: data.stats?.trainingEnqueued || 0,
      feedbackProcessed: data.stats?.feedbackProcessed || 0,
      capabilitiesUpdated: data.stats?.capabilitiesUpdated || 0,
      queuedVariants: data.queuedTrainingVariants || 0,
      
      // Derived metrics
      feedbackToEnqueueRatio: data.stats?.trainingEnqueued > 0 ? 
        ((data.stats?.feedbackProcessed || 0) / data.stats?.trainingEnqueued * 100).toFixed(2) : 'N/A',
      capabilitiesPerFeedback: data.stats?.feedbackProcessed > 0 ?
        ((data.stats?.capabilitiesUpdated || 0) / data.stats?.feedbackProcessed).toFixed(2) : 'N/A'
    };

    // Append to metrics file (JSONL format)
    const line = JSON.stringify(metrics);
    await fs.appendFile(OUTPUT_FILE, line + '\n');

    // Log to console
    console.log(`[${new Date().toISOString()}] Poll #${pollCount} ✓`);
    console.log(`  Gaps: ${metrics.gapsDetected} | Suggestions: ${metrics.workflowsSuggested} | Enqueued: ${metrics.trainingEnqueued} | Feedback: ${metrics.feedbackProcessed} | Capabilities Updated: ${metrics.capabilitiesUpdated}`);
    console.log(`  Feedback→Enqueue Ratio: ${metrics.feedbackToEnqueueRatio}% | Capabilities/Feedback: ${metrics.capabilitiesPerFeedback}`);

    successCount++;
  } catch (error) {
    errorCount++;
    console.error(`[${new Date().toISOString()}] Poll #${pollCount} ✗ Error: ${error.message}`);
  }

  pollCount++;
}

async function main() {
  await ensureOutputDir();

  console.log(`🔍 Bridge Metrics Monitor`);
  console.log(`📡 URL: ${BRIDGE_URL}`);
  console.log(`⏱️  Interval: ${POLL_INTERVAL}ms`);
  console.log(`📝 Output: ${OUTPUT_FILE}`);
  console.log(`\n Starting monitoring... (Ctrl+C to stop)\n`);

  // Poll immediately
  await pollMetrics();

  // Set up interval
  const interval = setInterval(pollMetrics, POLL_INTERVAL);

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log(`\n\n📊 Monitoring Complete`);
    clearInterval(interval);
    
    // Print summary
    const uptime = ((Date.now() - startTime) / 1000).toFixed(2);
    const successRate = ((successCount / pollCount) * 100).toFixed(2);
    
    console.log(`⏱️  Total Uptime: ${uptime}s`);
    console.log(`📈 Total Polls: ${pollCount}`);
    console.log(`✓ Successful: ${successCount}`);
    console.log(`✗ Failed: ${errorCount}`);
    console.log(`📊 Success Rate: ${successRate}%`);
    console.log(`📁 Metrics saved to: ${OUTPUT_FILE}`);
    
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
