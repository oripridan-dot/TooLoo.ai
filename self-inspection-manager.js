const fs = require('fs').promises;
const path = require('path');

class SelfInspectionManager {
  constructor(options = {}) {
    this.workspaceRoot = options.workspaceRoot || process.cwd();
    this.logsDir = options.logsDir || path.join(this.workspaceRoot, 'logs');
    this.statePath = path.join(this.logsDir, 'inspection-state.json');
    this.stateLoaded = false;
    this.autoTimer = null;
    this.state = {
      lastInspection: null,
      history: [],
      schedule: {
        mode: 'smart',
        intervalMs: this.getIntervalFromMode('smart')
      }
    };

    this.loadState().catch((error) => {
      console.warn('⚠️ Self-Inspection state load warning:', error.message);
    });

    console.log('🔍 Self-Inspection Manager initialized');
  }

  getIntervalFromMode(mode = 'smart') {
    switch (mode) {
      case 'aggressive':
        return 60 * 60 * 1000; // 1 hour
      case 'conservative':
        return 12 * 60 * 60 * 1000; // 12 hours
      case 'smart':
      default:
        return 6 * 60 * 60 * 1000; // 6 hours
    }
  }

  async loadState() {
    if (this.stateLoaded) {
      return this.state;
    }

    try {
      const raw = await fs.readFile(this.statePath, 'utf8');
      const parsed = JSON.parse(raw);
      this.state = {
        lastInspection: parsed.lastInspection || null,
        history: Array.isArray(parsed.history) ? parsed.history : [],
        schedule: parsed.schedule || this.state.schedule
      };
      this.stateLoaded = true;
      return this.state;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // Missing file is ok; mark as loaded with defaults
      this.stateLoaded = true;
      return this.state;
    }
  }

  async saveState() {
    await fs.mkdir(this.logsDir, { recursive: true });
    const payload = JSON.stringify({
      lastInspection: this.state.lastInspection,
      history: this.state.history,
      schedule: this.state.schedule
    }, null, 2);
    await fs.writeFile(this.statePath, payload, 'utf8');
  }

  async shouldRunInspection() {
    await this.loadState();
    const reasons = [];
    const now = Date.now();
    const lastInspection = this.state.lastInspection;
    const intervalMs = this.state.schedule?.intervalMs || this.getIntervalFromMode(this.state.schedule?.mode);

    if (!lastInspection) {
      reasons.push('No previous inspection found.');
    } else {
      const completedAt = new Date(lastInspection.completedAt || lastInspection.timestamp || 0).getTime();
      if (!Number.isFinite(completedAt) || completedAt === 0) {
        reasons.push('Previous inspection timestamp invalid.');
      } else {
        const age = now - completedAt;
        if (age >= intervalMs) {
          const hours = (age / (60 * 60 * 1000)).toFixed(1);
          reasons.push(`Last inspection was ${hours} hours ago.`);
        }
      }

      if (lastInspection.summary && lastInspection.summary.status === 'issues') {
        reasons.push('Previous inspection reported outstanding issues.');
      }
    }

    const shouldInspect = reasons.length > 0;
    const message = shouldInspect
      ? `🔍 Inspection recommended (${reasons.length} reason${reasons.length === 1 ? '' : 's'}).`
      : '✅ System health looks good. No inspection required now.';

    const details = shouldInspect
      ? reasons.join(' ')
      : lastInspection
        ? `Last inspection completed ${this.describeRelativeTime(new Date(lastInspection.completedAt))}.`
        : 'Inspection has not been run yet.';

    return {
      shouldInspect,
      reasons,
      summary: { message, details },
      lastInspection
    };
  }

  describeRelativeTime(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return 'at an unknown time';
    }
    const diffMs = Date.now() - date.getTime();
    if (diffMs < 0) return 'in the future (check system clock)';
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 60) {
      return `${minutes || 1} minute${minutes === 1 ? '' : 's'} ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    }
    const days = Math.floor(hours / 24);
    if (days < 7) {
      return `${days} day${days === 1 ? '' : 's'} ago`;
    }
    const weeks = Math.floor(days / 7);
    if (weeks < 4) {
      return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
    }
    const months = Math.floor(days / 30);
    if (months < 12) {
      return `${months} month${months === 1 ? '' : 's'} ago`;
    }
    const years = Math.floor(days / 365);
    return `${years} year${years === 1 ? '' : 's'} ago`;
  }

  startAutoInspection(mode = 'smart') {
    const intervalMs = this.getIntervalFromMode(mode);
    if (this.autoTimer) {
      clearInterval(this.autoTimer);
    }

    this.state.schedule = {
      mode,
      intervalMs
    };

    this.autoTimer = setInterval(async () => {
      try {
        const decision = await this.shouldRunInspection();
        if (decision.shouldInspect) {
          console.log('\n' + '='.repeat(60));
          console.log('🔍 Self-inspection recommended by scheduler');
          decision.reasons.forEach((reason, index) => {
            console.log(`${index + 1}. ${reason}`);
          });
          console.log('💡 Use "inspect repository" or POST /api/v1/maintenance/inspection');
          console.log('='.repeat(60) + '\n');
        }
      } catch (error) {
        console.error('❌ Auto-inspection check failed:', error.message);
      }
    }, intervalMs);

    if (typeof this.autoTimer.unref === 'function') {
      this.autoTimer.unref();
    }

    console.log(`⏰ Auto-inspection scheduled: ${mode}`);
    this.saveState().catch(() => {});
  }

  stopAutoInspection() {
    if (this.autoTimer) {
      clearInterval(this.autoTimer);
      this.autoTimer = null;
      console.log('⏹️ Auto-inspection scheduler stopped');
    }
  }

  async runInspection(options = {}) {
    await this.loadState();
    const startedAt = new Date();
    const trigger = options.trigger || 'manual';

    const checks = await this.performChecks();

    const counts = checks.reduce((acc, check) => {
      acc.total += 1;
      acc[check.status] = (acc[check.status] || 0) + 1;
      return acc;
    }, { total: 0, pass: 0, warn: 0, fail: 0 });

    const failing = checks.filter((check) => check.status === 'fail');
    const warnings = checks.filter((check) => check.status === 'warn');

    let summary;
    if (failing.length > 0) {
      summary = {
        status: 'issues',
        message: `🔍 Inspection found ${failing.length} high priority issue${failing.length === 1 ? '' : 's'}.`,
        details: failing.map((check) => `• ${check.title}: ${check.recommendation || check.details}`).join('\n')
      };
    } else if (warnings.length > 0) {
      summary = {
        status: 'warnings',
        message: '⚠️ Inspection completed with warnings.',
        details: warnings.map((check) => `• ${check.title}: ${check.recommendation || check.details}`).join('\n')
      };
    } else {
      summary = {
        status: 'healthy',
        message: '✅ Inspection completed. No issues detected.',
        details: 'All monitored systems look healthy.'
      };
    }

    const report = {
      trigger,
      startedAt: startedAt.toISOString(),
      completedAt: new Date().toISOString(),
      checks,
      counts,
      summary
    };

    this.state.lastInspection = report;
    this.state.history = [report, ...this.state.history].slice(0, 10);
    await this.saveState();

    console.log('\n' + '='.repeat(60));
    console.log('🧾 Self-inspection completed');
    console.log(summary.message);
    console.log(summary.details);
    console.log('='.repeat(60) + '\n');

    return report;
  }

  async performChecks() {
    const checks = [];

    // Check 1: Web app dependencies installed
    const webAppDepsOk = await this.pathExists(path.join(this.workspaceRoot, 'web-app', 'node_modules'));
    checks.push({
      id: 'web-app-deps',
      title: 'Web app dependencies installed',
      status: webAppDepsOk ? 'pass' : 'fail',
      severity: webAppDepsOk ? 'info' : 'high',
      details: webAppDepsOk ? 'Dependencies resolved under web-app/node_modules.' : 'Missing node_modules for web app.',
      recommendation: webAppDepsOk ? null : 'Run: npm --prefix web-app install'
    });

    // Check 2: Instruction files presence
    const instructionFiles = [
      '.github/copilot-instructions.md',
      'PERSONALITY-REFRESH.md',
      'SELF-AWARE.md'
    ];
    const missingInstructions = [];
    for (const relative of instructionFiles) {
      const exists = await this.pathExists(path.join(this.workspaceRoot, relative));
      if (!exists) {
        missingInstructions.push(relative);
      }
    }
    checks.push({
      id: 'instruction-files',
      title: 'Core instruction files present',
      status: missingInstructions.length === 0 ? 'pass' : 'warn',
      severity: missingInstructions.length === 0 ? 'info' : 'medium',
      details: missingInstructions.length === 0 ? 'Instruction files located.' : `Missing: ${missingInstructions.join(', ')}`,
      recommendation: missingInstructions.length === 0 ? null : 'Restore the missing instruction files from version control.'
    });

    // Check 3: Logs directory writable
    const logsWritable = await this.directoryWritable(this.logsDir);
    checks.push({
      id: 'logs-writable',
      title: 'Logs directory writable',
      status: logsWritable ? 'pass' : 'fail',
      severity: logsWritable ? 'info' : 'high',
      details: logsWritable ? 'Logs directory exists and is writable.' : 'Unable to create or write to logs directory.',
      recommendation: logsWritable ? null : 'Ensure the logs/ directory exists with write permissions.'
    });

    // Check 4: Personal projects workspace ready
    const projectsPath = path.join(this.workspaceRoot, 'personal-projects');
    const projectsReady = await this.pathExists(projectsPath);
    checks.push({
      id: 'personal-projects',
      title: 'Personal projects workspace ready',
      status: projectsReady ? 'pass' : 'warn',
      severity: projectsReady ? 'info' : 'low',
      details: projectsReady ? 'personal-projects directory available.' : 'personal-projects directory is missing.',
      recommendation: projectsReady ? null : 'Create the personal-projects directory to enable sandbox app creation.'
    });

    return checks;
  }

  async pathExists(targetPath) {
    try {
      await fs.access(targetPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  async directoryWritable(targetDir) {
    try {
      await fs.mkdir(targetDir, { recursive: true });
      const testFile = path.join(targetDir, `.write-test-${Date.now()}`);
      await fs.writeFile(testFile, 'ok');
      await fs.unlink(testFile);
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = SelfInspectionManager;
