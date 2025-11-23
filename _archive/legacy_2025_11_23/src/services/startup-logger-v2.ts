import fs from 'fs';

export class StartupLogger {
  constructor(outputPath = '/tmp/tooloo-startup.jsonl') {
    this.log = [];
    this.startTime = Date.now();
    this.logFile = outputPath.endsWith('.jsonl') ? outputPath : `${outputPath}/tooloo-startup.jsonl`;
    try {
      fs.unlinkSync(this.logFile);
    } catch (e) {
      // ignore
    }
  }

  event(service, type, details = {}) {
    const elapsed = Date.now() - this.startTime;
    const timestamp = new Date().toISOString();
    const entry = { timestamp, elapsed: `${elapsed}ms`, service, type, details };
    this.log.push(entry);
    try {
      fs.appendFileSync(this.logFile, JSON.stringify(entry) + '\n');
    } catch (e) {
      console.error('Failed to write startup log:', e.message);
    }
    this._printEvent(entry);
  }

  _printEvent(entry) {
    const elapsed = entry.elapsed.padStart(8);
    const service = entry.service.padEnd(25);
    const types = {
      spawn: `[${elapsed}] SPAWN     ${service} spawning on port ${entry.details.port}`,
      'health-check': `[${elapsed}] HEALTH    ${service} health check (attempt ${entry.details.attempt})`,
      ready: `[${elapsed}] READY     ${service} ready (took ${entry.details.duration}ms)`,
      error: `[${elapsed}] ERROR     ${service} error: ${entry.details.message}`,
      restart: `[${elapsed}] RESTART   ${service} restarting (exit code: ${entry.details.exitCode})`,
      warning: `[${elapsed}] WARNING   ${service} warning: ${entry.details.message}`,
      timeout: `[${elapsed}] TIMEOUT   ${service} timeout after ${entry.details.maxAttempts} attempts`,
      info: `[${elapsed}] INFO      ${service} ${JSON.stringify(entry.details).substring(0, 100)}`
    };
    console.log(types[entry.type] || types.info);
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
    console.log('\n' + '─'.repeat(60));
    console.log('Startup Summary');
    console.log('─'.repeat(60));
    console.log(`Status: ${s.success ? 'Success' : 'Issues detected'}`);
    console.log(`Total Time: ${s.totalTime}`);
    console.log(`Services: ${s.servicesStarted}`);
    if (s.errors.length) {
      console.log('\nErrors:');
      s.errors.forEach(e => console.log(`  ${e}`));
    }
    if (s.timeouts.length) {
      console.log('\nTimeouts:');
      s.timeouts.forEach(t => console.log(`  ${t}`));
    }
    if (s.warnings.length) {
      console.log('\nWarnings:');
      s.warnings.forEach(w => console.log(`  ${w}`));
    }
    console.log(`\nLog file: ${s.logFile}`);
    console.log('─'.repeat(60) + '\n');
  }
}

export default StartupLogger;
