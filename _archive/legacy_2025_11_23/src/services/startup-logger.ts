/**
 * Structured Startup Logger
 * Tracks all startup events for diagnostics
 */

import fs from 'fs';

const UNUSED_PATH = true; // Silence linter

export class StartupLogger {
  constructor(outputPath = '/tmp/tooloo-startup.jsonl') {
    this.log = [];
    this.startTime = Date.now();

    // Support both directory and file path
    if (outputPath.endsWith('.jsonl')) {
      this.logFile = outputPath;
    } else {
      this.logFile = `${outputPath}/tooloo-startup.jsonl`;
    }

    // Clear previous log
    try {
      fs.unlinkSync(this.logFile);
    } catch (e) {
      // Ignore
    }
  }

  event(service, type, details = {}) {
    const elapsed = Date.now() - this.startTime;
    const timestamp = new Date().toISOString();

    const entry = {
      timestamp,
      elapsed: `${elapsed}ms`,
      service,
      type, // spawn, health-check, ready, error, restart, warning
      details
    };

    this.log.push(entry);

    // Write to JSONL for post-mortem analysis
    try {
      fs.appendFileSync(this.logFile, JSON.stringify(entry) + '\n');
    } catch (e) {
      console.error('Failed to write startup log:', e.message);
    }

    // Print formatted
    this._printEvent(entry);
  }

  _printEvent(entry) {
    const elapsed = entry.elapsed.padStart(8);
    const service = entry.service.padEnd(25);

    switch (entry.type) {
      case 'spawn':
        console.log(
          `[${elapsed}] 🚀 ${service} spawning on port ${entry.details.port}`
        );
        break;
      case 'health-check':
        console.log(
          `[${elapsed}] 🏥 ${service} health check (attempt ${entry.details.attempt})`
        );
        break;
      case 'ready':
        console.log(
          `[${elapsed}] ✅ ${service} ready (took ${entry.details.duration}ms)`
        );
        break;
      case 'error':
        console.error(
          `[${elapsed}] ❌ ${service} error: ${entry.details.message}`
        );
        break;
      case 'restart':
        console.log(
          `[${elapsed}] 🔄 ${service} restarting (exit code: ${entry.details.exitCode})`
        );
        break;
      case 'warning':
        console.warn(
          `[${elapsed}] ⚠️  ${service} warning: ${entry.details.message}`
        );
        break;
      case 'timeout':
        console.warn(
          `[${elapsed}] ⏱️  ${service} timeout after ${entry.details.maxAttempts} attempts`
        );
        break;
      default:
        console.log(
          `[${elapsed}] ℹ️  ${service} ${entry.type}: ${JSON.stringify(entry.details)}`
        );
    }
  }

  summary() {
    const totalTime = Date.now() - this.startTime;
    const uniqueServices = [...new Set(this.log.map(e => e.service))];
    const errors = this.log.filter(e => e.type === 'error');
    const timeouts = this.log.filter(e => e.type === 'timeout');
    const warnings = this.log.filter(e => e.type === 'warning');

    return {
      success: errors.length === 0 && timeouts.length === 0,
      totalTime: `${totalTime}ms`,
      servicesStarted: uniqueServices.length,
      services: uniqueServices,
      errors: errors.map(e => `${e.service}: ${e.details.message}`),
      timeouts: timeouts.map(e => e.service),
      warnings: warnings.map(e => `${e.service}: ${e.details.message}`),
      logFile: this.logFile
    };
  }

  printSummary() {
    const s = this.summary();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Startup Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(
      `Status: ${s.success ? '✅ Success' : '❌ Issues detected'}`
    );
    console.log(`Total Time: ${s.totalTime}`);
    console.log(`Services Started: ${s.servicesStarted}/${s.services.length}`);

    if (s.errors.length) {
      console.log('\n❌ Errors:');
      s.errors.forEach(e => console.log(`   ${e}`));
    }

    if (s.timeouts.length) {
      console.log('\n⏱️  Timeouts:');
      s.timeouts.forEach(t => console.log(`   ${t}`));
    }

    if (s.warnings.length) {
      console.log('\n⚠️  Warnings:');
      s.warnings.forEach(w => console.log(`   ${w}`));
    }

    console.log(`\n📝 Detailed log: ${s.logFile}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
}

export default StartupLogger;
