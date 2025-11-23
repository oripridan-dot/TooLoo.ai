/**
 * Startup Report Generator
 * Analyzes startup logs and generates comprehensive diagnostics
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class StartupReporter {
  constructor(logFile = '/tmp/tooloo-startup.jsonl') {
    this.logFile = logFile;
    this.events = [];
    this.load();
  }

  /**
   * Load events from log file
   */
  load() {
    try {
      if (fs.existsSync(this.logFile)) {
        const content = fs.readFileSync(this.logFile, 'utf8');
        this.events = content
          .split('\n')
          .filter(l => l.trim())
          .map(l => JSON.parse(l));
      }
    } catch (err) {
      console.error('Failed to load startup log:', err.message);
    }
  }

  /**
   * Get all services mentioned
   */
  getServices() {
    return [...new Set(this.events.map(e => e.service))].sort();
  }

  /**
   * Get timeline for a service
   */
  getServiceTimeline(service) {
    return this.events.filter(e => e.service === service);
  }

  /**
   * Get startup time for a service
   */
  getServiceStartTime(service) {
    const spawn = this.events.find(e => e.service === service && e.type === 'spawn');
    const ready = this.events.find(e => e.service === service && e.type === 'ready');

    if (!spawn || !ready) return null;

    const spawnMs = parseInt(spawn.elapsed);
    const readyMs = parseInt(ready.elapsed);
    return readyMs - spawnMs;
  }

  /**
   * Get all errors
   */
  getErrors() {
    return this.events.filter(e => e.type === 'error');
  }

  /**
   * Get all timeouts
   */
  getTimeouts() {
    return this.events.filter(e => e.type === 'timeout');
  }

  /**
   * Get all warnings
   */
  getWarnings() {
    return this.events.filter(e => e.type === 'warning');
  }

  /**
   * Calculate total startup time
   */
  getTotalTime() {
    if (this.events.length === 0) return null;
    const lastEvent = this.events[this.events.length - 1];
    return parseInt(lastEvent.elapsed);
  }

  /**
   * Get parallelization efficiency
   */
  getParallelizationStats() {
    const services = this.getServices();
    if (services.length === 0) return null;

    const timelineStart = Math.min(...this.events.map(e => parseInt(e.elapsed)));
    const timelineEnd = Math.max(...this.events.map(e => parseInt(e.elapsed)));
    const timelineLength = timelineEnd - timelineStart;

    // Sum of individual service times
    let totalIndividualTime = 0;
    for (const svc of services) {
      const time = this.getServiceStartTime(svc);
      if (time) totalIndividualTime += time;
    }

    const efficiency = Math.round((timelineLength / totalIndividualTime) * 100);

    return {
      parallelizationEfficiency: efficiency,
      comment: efficiency > 80 ? 'Excellent parallelization' :
        efficiency > 60 ? 'Good parallelization' :
          efficiency > 40 ? 'Fair parallelization' :
            'Poor parallelization (mostly sequential)'
    };
  }

  /**
   * Generate HTML report
   */
  generateHtmlReport() {
    const services = this.getServices();
    const errors = this.getErrors();
    const warnings = this.getWarnings();
    const timeouts = this.getTimeouts();
    const totalTime = this.getTotalTime();
    const parallelStats = this.getParallelizationStats();

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>TooLoo.ai Startup Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
      color: #333;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .card h3 {
      margin: 0 0 10px 0;
      color: #667eea;
    }
    .card .value {
      font-size: 24px;
      font-weight: bold;
      color: #333;
    }
    .status-good { color: #10b981; }
    .status-warning { color: #f59e0b; }
    .status-error { color: #ef4444; }
    .timeline {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .timeline h2 {
      margin-top: 0;
    }
    .event {
      display: flex;
      gap: 15px;
      padding: 10px 0;
      border-bottom: 1px solid #eee;
      font-size: 13px;
    }
    .event:last-child {
      border-bottom: none;
    }
    .event-time {
      font-weight: bold;
      color: #667eea;
      min-width: 80px;
    }
    .event-type {
      padding: 2px 6px;
      border-radius: 3px;
      background: #f0f0f0;
      min-width: 60px;
      text-align: center;
      font-size: 11px;
      font-weight: 600;
    }
    .event-service {
      font-weight: 600;
      color: #333;
      min-width: 150px;
    }
    .event-detail {
      color: #666;
      flex: 1;
    }
    .issues {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .issue {
      padding: 10px;
      margin: 10px 0;
      border-radius: 4px;
      border-left: 4px solid;
    }
    .issue.error {
      background: #fee;
      border-color: #ef4444;
    }
    .issue.warning {
      background: #fef3c7;
      border-color: #f59e0b;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚀 TooLoo.ai Startup Report</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>
  </div>

  <div class="summary">
    <div class="card">
      <h3>Total Startup Time</h3>
      <div class="value status-good">${totalTime}ms</div>
    </div>
    <div class="card">
      <h3>Services</h3>
      <div class="value status-good">${services.length}</div>
    </div>
    <div class="card">
      <h3>Parallelization</h3>
      <div class="value status-good">${parallelStats?.parallelizationEfficiency || 0}%</div>
      <div style="font-size: 12px; color: #666; margin-top: 5px;">
        ${parallelStats?.comment}
      </div>
    </div>
    <div class="card">
      <h3>Issues</h3>
      <div class="value ${errors.length > 0 || timeouts.length > 0 ? 'status-error' : 'status-good'}">
        ${errors.length + timeouts.length}
      </div>
    </div>
  </div>

  <div class="timeline">
    <h2>📊 Startup Timeline</h2>
    ${this.events.map(e => `
      <div class="event">
        <div class="event-time">${e.elapsed}</div>
        <div class="event-type" title="${e.type}">${e.type.substring(0, 8)}</div>
        <div class="event-service">${e.service}</div>
        <div class="event-detail">${e.details?.message || JSON.stringify(e.details || {}).substring(0, 100)}</div>
      </div>
    `).join('')}
  </div>

  ${errors.length > 0 ? `
    <div class="issues">
      <h2>❌ Errors (${errors.length})</h2>
      ${errors.map(e => `
        <div class="issue error">
          <strong>${e.service}</strong>: ${e.details?.message}
        </div>
      `).join('')}
    </div>
  ` : ''}

  ${timeouts.length > 0 ? `
    <div class="issues">
      <h2>⏱️ Timeouts (${timeouts.length})</h2>
      ${timeouts.map(e => `
        <div class="issue warning">
          <strong>${e.service}</strong>: Timeout after ${e.details?.maxAttempts} attempts
        </div>
      `).join('')}
    </div>
  ` : ''}

  ${warnings.length > 0 ? `
    <div class="issues">
      <h2>⚠️  Warnings (${warnings.length})</h2>
      ${warnings.map(e => `
        <div class="issue warning">
          <strong>${e.service}</strong>: ${e.details?.message}
        </div>
      `).join('')}
    </div>
  ` : ''}

  <div style="text-align: center; color: #999; margin-top: 40px; padding: 20px;">
    <p>📝 Log file: ${this.logFile}</p>
  </div>
</body>
</html>`;

    return html;
  }

  /**
   * Save HTML report
   */
  saveHtmlReport(outputFile = '/tmp/tooloo-startup-report.html') {
    const html = this.generateHtmlReport();
    fs.writeFileSync(outputFile, html);
    return outputFile;
  }

  /**
   * Print text summary
   */
  printSummary() {
    console.log('\n' + '═'.repeat(60));
    console.log('📊 STARTUP DIAGNOSTIC REPORT');
    console.log('═'.repeat(60));

    const totalTime = this.getTotalTime();
    const services = this.getServices();
    const errors = this.getErrors();
    const warnings = this.getWarnings();
    const timeouts = this.getTimeouts();
    const parallelStats = this.getParallelizationStats();

    console.log(`\n⏱️  Total Startup Time: ${totalTime}ms`);
    console.log(`📡 Services: ${services.length}`);
    console.log(`⚙️  Parallelization: ${parallelStats?.parallelizationEfficiency || 0}% (${parallelStats?.comment})`);

    if (errors.length > 0) {
      console.log(`\n❌ Errors (${errors.length}):`);
      errors.forEach(e => {
        console.log(`   ${e.service}: ${e.details?.message}`);
      });
    }

    if (timeouts.length > 0) {
      console.log(`\n⏱️  Timeouts (${timeouts.length}):`);
      timeouts.forEach(e => {
        console.log(`   ${e.service}`);
      });
    }

    if (warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${warnings.length}):`);
      warnings.forEach(e => {
        console.log(`   ${e.service}: ${e.details?.message}`);
      });
    }

    // Service timings
    console.log('\n📈 Service Startup Times:');
    const timings = [];
    for (const svc of services) {
      const time = this.getServiceStartTime(svc);
      if (time) {
        timings.push({ service: svc, time });
      }
    }
    timings.sort((a, b) => b.time - a.time);
    timings.slice(0, 5).forEach(t => {
      console.log(`   ${t.service.padEnd(30)} ${t.time.toString().padStart(5)}ms`);
    });

    console.log('\n' + '═'.repeat(60));
    console.log(`HTML Report: /tmp/tooloo-startup-report.html`);
    console.log('═'.repeat(60) + '\n');
  }
}

export default StartupReporter;
