#!/usr/bin/env node

/**
 * Automated Updates Generator
 * Generates automated content updates for the repository
 */

import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

async function generateAutomatedUpdates() {
  console.log('🤖 Generating automated updates...');

  try {
    // Update package-lock.json if dependencies changed
    await updateDependencies();

    // Update documentation timestamps
    await updateDocumentation();

    // Generate performance metrics
    await generatePerformanceMetrics();

    // Update analytics data
    await updateAnalytics();

    // Clean up old files
    await cleanupOldFiles();

    console.log('✅ Automated updates generated successfully');
  } catch (error) {
    console.error('❌ Error generating automated updates:', error);
    process.exit(1);
  }
}

async function updateDependencies() {
  try {
    console.log('📦 Checking for dependency updates...');

    // Run npm audit fix
    execSync('npm audit fix --audit-level=moderate', {
      cwd: repoRoot,
      stdio: 'inherit'
    });

    // Update package-lock.json
    execSync('npm install', {
      cwd: repoRoot,
      stdio: 'inherit'
    });

    console.log('✅ Dependencies updated');
  } catch (error) {
    console.log('⚠️ Dependency update skipped:', error.message);
  }
}

async function updateDocumentation() {
  try {
    console.log('📚 Updating documentation...');

    const files = [
      'README.md',
      'docs/CHANGELOG.md',
      'docs/ROADMAP.md'
    ];

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toISOString().split('T')[1].split('.')[0];

    for (const file of files) {
      const filePath = path.join(repoRoot, file);

      try {
        let content = await fs.readFile(filePath, 'utf8');

        // Update last updated timestamps
        content = content.replace(
          /Last updated: \d{4}-\d{2}-\d{2}/g,
          `Last updated: ${dateStr}`
        );

        // Update last modified timestamps
        content = content.replace(
          /Last modified: \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/g,
          `Last modified: ${dateStr} ${timeStr}`
        );

        await fs.writeFile(filePath, content);
      } catch (error) {
        // File might not exist, continue
        console.log(`⚠️ Could not update ${file}: ${error.message}`);
      }
    }

    console.log('✅ Documentation updated');
  } catch (error) {
    console.log('⚠️ Documentation update skipped:', error.message);
  }
}

async function generatePerformanceMetrics() {
  try {
    console.log('📊 Generating performance metrics...');

    const metricsDir = path.join(repoRoot, 'data', 'performance-metrics');
    await fs.mkdir(metricsDir, { recursive: true });

    const metrics = {
      timestamp: new Date().toISOString(),
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform
      },
      repository: {
        commitCount: getGitCommitCount(),
        branch: getCurrentBranch(),
        lastCommit: getLastCommitInfo()
      }
    };

    const metricsFile = path.join(metricsDir, `metrics-${Date.now()}.json`);
    await fs.writeFile(metricsFile, JSON.stringify(metrics, null, 2));

    console.log('✅ Performance metrics generated');
  } catch (error) {
    console.log('⚠️ Performance metrics generation skipped:', error.message);
  }
}

async function updateAnalytics() {
  try {
    console.log('📈 Updating analytics data...');

    const analyticsDir = path.join(repoRoot, 'data', 'analytics');
    await fs.mkdir(analyticsDir, { recursive: true });

    const analyticsFile = path.join(analyticsDir, 'repository-analytics.json');

    let analytics = {
      lastUpdate: new Date().toISOString(),
      metrics: {}
    };

    try {
      const existing = await fs.readFile(analyticsFile, 'utf8');
      analytics = { ...JSON.parse(existing), lastUpdate: analytics.lastUpdate };
    } catch (error) {
      // File doesn't exist, use defaults
    }

    // Update repository metrics
    analytics.metrics = {
      ...analytics.metrics,
      totalCommits: getGitCommitCount(),
      activeBranches: getActiveBranches().length,
      totalFiles: await getTotalFiles(),
      repositorySize: await getRepositorySize(),
      lastActivity: new Date().toISOString()
    };

    await fs.writeFile(analyticsFile, JSON.stringify(analytics, null, 2));

    console.log('✅ Analytics updated');
  } catch (error) {
    console.log('⚠️ Analytics update skipped:', error.message);
  }
}

async function cleanupOldFiles() {
  try {
    console.log('🧹 Cleaning up old files...');

    const cleanupPatterns = [
      { dir: 'data/temp', pattern: '*.tmp', maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
      { dir: 'logs', pattern: '*.log', maxAge: 7 * 24 * 60 * 60 * 1000 }, // 7 days
      { dir: 'data/performance-metrics', pattern: '*.json', maxAge: 30 * 24 * 60 * 60 * 1000 }, // 30 days
    ];

    for (const { dir, pattern, maxAge } of cleanupPatterns) {
      const dirPath = path.join(repoRoot, dir);

      try {
        const files = await fs.readdir(dirPath);
        const now = Date.now();

        for (const file of files) {
          if (file.match(pattern.replace('*', '.*'))) {
            const filePath = path.join(dirPath, file);
            const stats = await fs.stat(filePath);

            if (now - stats.mtime.getTime() > maxAge) {
              await fs.unlink(filePath);
              console.log(`🗑️ Cleaned up: ${file}`);
            }
          }
        }
      } catch (error) {
        // Directory might not exist, continue
      }
    }

    console.log('✅ Cleanup completed');
  } catch (error) {
    console.log('⚠️ Cleanup skipped:', error.message);
  }
}

// Helper functions

function getGitCommitCount() {
  try {
    return parseInt(execSync('git rev-list --count HEAD', {
      cwd: repoRoot,
      encoding: 'utf8'
    }).trim());
  } catch (error) {
    return 0;
  }
}

function getCurrentBranch() {
  try {
    return execSync('git branch --show-current', {
      cwd: repoRoot,
      encoding: 'utf8'
    }).trim();
  } catch (error) {
    return 'unknown';
  }
}

function getLastCommitInfo() {
  try {
    const output = execSync('git log -1 --format="%H|%s|%an|%ae|%ad" --date=iso', {
      cwd: repoRoot,
      encoding: 'utf8'
    }).trim();

    const [hash, subject, author, email, date] = output.split('|');
    return { hash, subject, author, email, date };
  } catch (error) {
    return null;
  }
}

function getActiveBranches() {
  try {
    const output = execSync('git branch -a', {
      cwd: repoRoot,
      encoding: 'utf8'
    });

    return output.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('*') && !line.includes('remotes/'));
  } catch (error) {
    return [];
  }
}

async function getTotalFiles() {
  try {
    const output = execSync('find . -type f -not -path "./node_modules/*" -not -path "./.git/*" | wc -l', {
      cwd: repoRoot,
      encoding: 'utf8'
    });
    return parseInt(output.trim());
  } catch (error) {
    return 0;
  }
}

async function getRepositorySize() {
  try {
    const output = execSync('du -sb . --exclude=node_modules --exclude=.git | cut -f1', {
      cwd: repoRoot,
      encoding: 'utf8'
    });
    return parseInt(output.trim());
  } catch (error) {
    return 0;
  }
}

// Run the generator
generateAutomatedUpdates();