#!/usr/bin/env node

/**
 * Repository Health Checker
 * Performs comprehensive health checks on the repository
 */

import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

async function checkRepositoryHealth() {
  console.log('🏥 Checking repository health...');

  const healthReport = {
    timestamp: new Date().toISOString(),
    checks: {},
    overall: 'unknown'
  };

  try {
    // Git repository checks
    healthReport.checks.git = await checkGitHealth();

    // File system checks
    healthReport.checks.filesystem = await checkFilesystemHealth();

    // Dependency checks
    healthReport.checks.dependencies = await checkDependenciesHealth();

    // Code quality checks
    healthReport.checks.codeQuality = await checkCodeQuality();

    // Service health checks
    healthReport.checks.services = await checkServicesHealth();

    // Performance checks
    healthReport.checks.performance = await checkPerformanceHealth();

    // Determine overall health
    healthReport.overall = determineOverallHealth(healthReport.checks);

    // Save health report
    await saveHealthReport(healthReport);

    console.log(`✅ Health check completed. Overall status: ${healthReport.overall.toUpperCase()}`);

    // Exit with appropriate code
    process.exit(healthReport.overall === 'healthy' ? 0 : 1);

  } catch (error) {
    console.error('❌ Health check failed:', error);
    healthReport.checks.error = {
      status: 'error',
      message: error.message
    };
    healthReport.overall = 'error';

    await saveHealthReport(healthReport);
    process.exit(1);
  }
}

async function checkGitHealth() {
  const gitHealth = {
    status: 'unknown',
    details: {}
  };

  try {
    // Check if it's a git repository
    execSync('git status', { cwd: repoRoot, stdio: 'pipe' });
    gitHealth.details.isRepository = true;

    // Check for uncommitted changes
    const status = execSync('git status --porcelain', {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: 'pipe'
    });

    gitHealth.details.hasUncommittedChanges = status.trim().length > 0;

    // Check current branch
    const branch = execSync('git branch --show-current', {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim();

    gitHealth.details.currentBranch = branch;

    // Check if branch is clean
    gitHealth.details.isClean = !gitHealth.details.hasUncommittedChanges;

    // Check remote status
    try {
      execSync('git fetch --dry-run', { cwd: repoRoot, stdio: 'pipe' });
      gitHealth.details.remoteAccessible = true;
    } catch (error) {
      gitHealth.details.remoteAccessible = false;
    }

    // Determine status
    if (gitHealth.details.isClean && gitHealth.details.remoteAccessible) {
      gitHealth.status = 'healthy';
    } else if (gitHealth.details.isClean) {
      gitHealth.status = 'warning';
    } else {
      gitHealth.status = 'unhealthy';
    }

  } catch (error) {
    gitHealth.status = 'error';
    gitHealth.details.error = error.message;
  }

  return gitHealth;
}

async function checkFilesystemHealth() {
  const fsHealth = {
    status: 'unknown',
    details: {}
  };

  try {
    // Check disk space
    const diskUsage = execSync('df -h . | tail -1', {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: 'pipe'
    });

    const diskFields = diskUsage.trim().split(/\s+/);
    const usePercent = parseInt(diskFields[4].replace('%', ''));

    fsHealth.details.diskUsage = usePercent;

    // Check for large files
    const largeFiles = execSync('find . -type f -size +100M -not -path "./node_modules/*" -not -path "./.git/*"', {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: 'pipe'
    }).split('\n').filter(line => line.trim());

    fsHealth.details.largeFiles = largeFiles.length;

    // Check for broken symlinks
    const brokenLinks = execSync('find . -type l -exec test ! -e {} \\; -print', {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: 'pipe'
    }).split('\n').filter(line => line.trim());

    fsHealth.details.brokenSymlinks = brokenLinks.length;

    // Determine status
    if (usePercent < 90 && largeFiles.length === 0 && brokenLinks.length === 0) {
      fsHealth.status = 'healthy';
    } else if (usePercent < 95) {
      fsHealth.status = 'warning';
    } else {
      fsHealth.status = 'unhealthy';
    }

  } catch (error) {
    fsHealth.status = 'error';
    fsHealth.details.error = error.message;
  }

  return fsHealth;
}

async function checkDependenciesHealth() {
  const depHealth = {
    status: 'unknown',
    details: {}
  };

  try {
    // Check if package.json exists
    const packageJsonPath = path.join(repoRoot, 'package.json');
    await fs.access(packageJsonPath);
    depHealth.details.hasPackageJson = true;

    // Check if node_modules exists
    const nodeModulesPath = path.join(repoRoot, 'node_modules');
    try {
      await fs.access(nodeModulesPath);
      depHealth.details.hasNodeModules = true;
    } catch (error) {
      depHealth.details.hasNodeModules = false;
    }

    // Check for outdated packages
    try {
      const outdated = execSync('npm outdated --json', {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: 'pipe'
      });

      const outdatedPackages = JSON.parse(outdated || '{}');
      depHealth.details.outdatedPackages = Object.keys(outdatedPackages).length;
    } catch (error) {
      depHealth.details.outdatedPackages = 0;
    }

    // Check for security vulnerabilities
    try {
      const audit = execSync('npm audit --audit-level=moderate --json', {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: 'pipe'
      });

      const auditResult = JSON.parse(audit);
      depHealth.details.vulnerabilities = auditResult.metadata?.vulnerabilities?.total || 0;
    } catch (error) {
      depHealth.details.vulnerabilities = 0;
    }

    // Determine status
    if (depHealth.details.hasNodeModules &&
        depHealth.details.outdatedPackages === 0 &&
        depHealth.details.vulnerabilities === 0) {
      depHealth.status = 'healthy';
    } else if (depHealth.details.vulnerabilities === 0) {
      depHealth.status = 'warning';
    } else {
      depHealth.status = 'unhealthy';
    }

  } catch (error) {
    depHealth.status = 'error';
    depHealth.details.error = error.message;
  }

  return depHealth;
}

async function checkCodeQuality() {
  const qualityHealth = {
    status: 'unknown',
    details: {}
  };

  try {
    // Check for linting errors
    try {
      execSync('npx eslint . --ext .js,.ts --max-warnings 0', {
        cwd: repoRoot,
        stdio: 'pipe'
      });
      qualityHealth.details.lintErrors = 0;
    } catch (error) {
      // Count linting errors from exit code or parse output
      qualityHealth.details.lintErrors = 1; // Simplified
    }

    // Check for syntax errors in JS files
    const jsFiles = execSync('find . -name "*.js" -not -path "./node_modules/*" -not -path "./.git/*"', {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: 'pipe'
    }).split('\n').filter(line => line.trim());

    let syntaxErrors = 0;
    for (const file of jsFiles.slice(0, 10)) { // Check first 10 files
      try {
        execSync(`node -c "${file}"`, { cwd: repoRoot, stdio: 'pipe' });
      } catch (error) {
        syntaxErrors++;
      }
    }

    qualityHealth.details.syntaxErrors = syntaxErrors;

    // Check for TODO/FIXME comments
    const todoCount = execSync('grep -r "TODO\\|FIXME" --include="*.js" --include="*.ts" --include="*.md" . --exclude-dir=node_modules --exclude-dir=.git | wc -l', {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim();

    qualityHealth.details.todoComments = parseInt(todoCount);

    // Determine status
    if (qualityHealth.details.lintErrors === 0 &&
        qualityHealth.details.syntaxErrors === 0) {
      qualityHealth.status = 'healthy';
    } else if (qualityHealth.details.syntaxErrors === 0) {
      qualityHealth.status = 'warning';
    } else {
      qualityHealth.status = 'unhealthy';
    }

  } catch (error) {
    qualityHealth.status = 'error';
    qualityHealth.details.error = error.message;
  }

  return qualityHealth;
}

async function checkServicesHealth() {
  const serviceHealth = {
    status: 'unknown',
    details: {}
  };

  try {
    // Check if services are running (simplified check)
    const ports = [3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3011, 3123];
    let runningServices = 0;

    for (const port of ports) {
      try {
        execSync(`lsof -i :${port}`, { stdio: 'pipe' });
        runningServices++;
      } catch (error) {
        // Port not in use
      }
    }

    serviceHealth.details.totalServices = ports.length;
    serviceHealth.details.runningServices = runningServices;
    serviceHealth.details.serviceUptime = (runningServices / ports.length) * 100;

    // Determine status
    if (serviceHealth.details.serviceUptime >= 80) {
      serviceHealth.status = 'healthy';
    } else if (serviceHealth.details.serviceUptime >= 50) {
      serviceHealth.status = 'warning';
    } else {
      serviceHealth.status = 'unhealthy';
    }

  } catch (error) {
    serviceHealth.status = 'error';
    serviceHealth.details.error = error.message;
  }

  return serviceHealth;
}

async function checkPerformanceHealth() {
  const perfHealth = {
    status: 'unknown',
    details: {}
  };

  try {
    // Check log file sizes
    const logsDir = path.join(repoRoot, 'logs');
    let totalLogSize = 0;

    try {
      const logFiles = await fs.readdir(logsDir);
      for (const file of logFiles) {
        const stats = await fs.stat(path.join(logsDir, file));
        totalLogSize += stats.size;
      }
    } catch (error) {
      // Logs directory doesn't exist
    }

    perfHealth.details.totalLogSize = totalLogSize;

    // Check for memory issues (simplified)
    const memUsage = process.memoryUsage();
    perfHealth.details.memoryUsage = memUsage.heapUsed / memUsage.heapTotal;

    // Check response times (mock)
    perfHealth.details.averageResponseTime = Math.random() * 1000; // Mock value

    // Determine status
    if (totalLogSize < 100 * 1024 * 1024 && // Less than 100MB logs
        perfHealth.details.memoryUsage < 0.8) { // Less than 80% memory usage
      perfHealth.status = 'healthy';
    } else if (perfHealth.details.memoryUsage < 0.9) {
      perfHealth.status = 'warning';
    } else {
      perfHealth.status = 'unhealthy';
    }

  } catch (error) {
    perfHealth.status = 'error';
    perfHealth.details.error = error.message;
  }

  return perfHealth;
}

function determineOverallHealth(checks) {
  const statuses = Object.values(checks).map(check => check.status);

  if (statuses.includes('error') || statuses.includes('unhealthy')) {
    return 'unhealthy';
  } else if (statuses.includes('warning')) {
    return 'warning';
  } else if (statuses.every(status => status === 'healthy')) {
    return 'healthy';
  } else {
    return 'unknown';
  }
}

async function saveHealthReport(report) {
  try {
    const reportsDir = path.join(repoRoot, 'data', 'health-reports');
    await fs.mkdir(reportsDir, { recursive: true });

    const reportPath = path.join(reportsDir, `health-report-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log(`📊 Health report saved to: ${reportPath}`);
  } catch (error) {
    console.error('⚠️ Failed to save health report:', error.message);
  }
}

// Run the health check
checkRepositoryHealth();