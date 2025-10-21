/**
 * Automated Commit Service
 * Monitors for changes and automatically commits updates to the repository
 * Integrates with TooLoo.ai's multi-service architecture
 */

import express from 'express';
import cors from 'cors';
import { execSync, exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.AUTOMATED_COMMIT_PORT || 3011;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Service configuration
const CONFIG = {
  repoPath: process.cwd(),
  autoCommit: process.env.AUTO_COMMIT_ENABLED === 'true',
  commitInterval: Number(process.env.COMMIT_INTERVAL_MINUTES || 30) * 60 * 1000,
  maxCommitsPerHour: Number(process.env.MAX_COMMITS_PER_HOUR || 12),
  excludedPaths: [
    'node_modules/',
    '*.log',
    '.git/',
    'data/temp/',
    '*.tmp',
    '.DS_Store'
  ]
};

// Commit tracking
let commitHistory = [];
let lastCommitTime = Date.now();
let commitsThisHour = 0;

/**
 * Check if a path should be excluded from commits
 */
function shouldExcludePath(filePath) {
  return CONFIG.excludedPaths.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(filePath);
    }
    return filePath.includes(pattern);
  });
}

/**
 * Get git status and check for changes
 */
async function getGitStatus() {
  try {
    const status = execSync('git status --porcelain', {
      cwd: CONFIG.repoPath,
      encoding: 'utf8'
    });

    const changes = status.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [status, file] = line.split(/\s+/);
        return { status, file, excluded: shouldExcludePath(file) };
      })
      .filter(change => !change.excluded);

    return {
      hasChanges: changes.length > 0,
      changes,
      totalFiles: changes.length
    };
  } catch (error) {
    console.error('Error getting git status:', error);
    return { hasChanges: false, changes: [], totalFiles: 0 };
  }
}

/**
 * Stage and commit changes
 */
async function commitChanges(commitMessage, options = {}) {
  try {
    const now = Date.now();

    // Rate limiting
    if (commitsThisHour >= CONFIG.maxCommitsPerHour) {
      throw new Error(`Rate limit exceeded: ${CONFIG.maxCommitsPerHour} commits per hour`);
    }

    // Check minimum interval
    if (now - lastCommitTime < CONFIG.commitInterval) {
      throw new Error(`Commit interval not met: ${CONFIG.commitInterval / 1000}s minimum`);
    }

    const status = await getGitStatus();
    if (!status.hasChanges) {
      return { success: false, message: 'No changes to commit' };
    }

    // Stage changes
    execSync('git add .', { cwd: CONFIG.repoPath });

    // Create commit
    const message = commitMessage || `🤖 Automated: ${status.totalFiles} files updated - ${new Date().toISOString()}`;
    execSync(`git commit -m "${message}"`, { cwd: CONFIG.repoPath });

    // Update tracking
    lastCommitTime = now;
    commitsThisHour++;
    commitHistory.push({
      timestamp: now,
      message,
      filesChanged: status.totalFiles,
      changes: status.changes
    });

    // Reset counter every hour
    if (commitHistory.length > 0 &&
        now - commitHistory[0].timestamp > 3600000) {
      commitsThisHour = 0;
    }

    // Keep only last 100 commits in history
    if (commitHistory.length > 100) {
      commitHistory = commitHistory.slice(-50);
    }

    console.log(`✅ Committed ${status.totalFiles} files: ${message}`);

    return {
      success: true,
      message,
      filesChanged: status.totalFiles,
      commitHash: execSync('git rev-parse HEAD', { cwd: CONFIG.repoPath, encoding: 'utf8' }).trim()
    };

  } catch (error) {
    console.error('Error committing changes:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Push changes to remote repository
 */
async function pushChanges(branch = 'main') {
  try {
    execSync(`git push origin ${branch}`, { cwd: CONFIG.repoPath });
    console.log(`🚀 Pushed changes to ${branch}`);
    return { success: true, branch };
  } catch (error) {
    console.error('Error pushing changes:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate automated commit content
 */
async function generateAutomatedContent() {
  try {
    console.log('🤖 Generating automated content...');

    // Update timestamps in documentation
    await updateTimestamps();

    // Generate performance reports
    await generatePerformanceReports();

    // Update analytics data
    await updateAnalyticsData();

    // Clean up temporary files
    await cleanupTempFiles();

    console.log('✅ Automated content generation complete');
    return { success: true };

  } catch (error) {
    console.error('Error generating automated content:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update timestamps in documentation
 */
async function updateTimestamps() {
  const files = [
    'README.md',
    'docs/CHANGELOG.md',
    'docs/ROADMAP.md'
  ];

  for (const file of files) {
    try {
      const filePath = path.join(CONFIG.repoPath, file);
      let content = await fs.readFile(filePath, 'utf8');

      // Update last updated timestamps
      content = content.replace(
        /Last updated: \d{4}-\d{2}-\d{2}/g,
        `Last updated: ${new Date().toISOString().split('T')[0]}`
      );

      await fs.writeFile(filePath, content);
    } catch (error) {
      // File might not exist, continue
    }
  }
}

/**
 * Generate performance reports
 */
async function generatePerformanceReports() {
  try {
    // This would integrate with the performance monitoring system
    const report = {
      timestamp: new Date().toISOString(),
      metrics: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
      }
    };

    const reportPath = path.join(CONFIG.repoPath, 'data/performance-reports', `report-${Date.now()}.json`);
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  } catch (error) {
    console.error('Error generating performance report:', error);
  }
}

/**
 * Update analytics data
 */
async function updateAnalyticsData() {
  try {
    const analyticsPath = path.join(CONFIG.repoPath, 'data/analytics.json');
    let analytics = { lastUpdate: Date.now(), metrics: {} };

    try {
      const existing = await fs.readFile(analyticsPath, 'utf8');
      analytics = JSON.parse(existing);
    } catch (error) {
      // File doesn't exist, use defaults
    }

    analytics.lastUpdate = Date.now();
    analytics.commitCount = commitHistory.length;

    await fs.writeFile(analyticsPath, JSON.stringify(analytics, null, 2));
  } catch (error) {
    console.error('Error updating analytics:', error);
  }
}

/**
 * Clean up temporary files
 */
async function cleanupTempFiles() {
  try {
    const tempDir = path.join(CONFIG.repoPath, 'data/temp');
    const files = await fs.readdir(tempDir).catch(() => []);

    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = await fs.stat(filePath);

      // Delete files older than 24 hours
      if (Date.now() - stats.mtime.getTime() > 24 * 60 * 60 * 1000) {
        await fs.unlink(filePath);
        console.log(`🗑️ Cleaned up: ${file}`);
      }
    }
  } catch (error) {
    // Directory might not exist, continue
  }
}

// API Endpoints

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'automated-commit',
    time: new Date().toISOString(),
    config: {
      autoCommit: CONFIG.autoCommit,
      commitInterval: CONFIG.commitInterval,
      maxCommitsPerHour: CONFIG.maxCommitsPerHour
    }
  });
});

app.get('/api/v1/commit/status', (req, res) => {
  getGitStatus().then(status => {
    res.json({
      ok: true,
      ...status,
      lastCommit: lastCommitTime,
      commitsThisHour,
      commitHistory: commitHistory.slice(-10)
    });
  }).catch(error => {
    res.status(500).json({ ok: false, error: error.message });
  });
});

app.post('/api/v1/commit/auto', async (req, res) => {
  try {
    const { message, generateContent = true, push = false } = req.body || {};

    if (generateContent) {
      await generateAutomatedContent();
    }

    const result = await commitChanges(message);

    if (result.success && push) {
      const pushResult = await pushChanges();
      result.push = pushResult;
    }

    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/v1/commit/manual', async (req, res) => {
  try {
    const { message, files, push = false } = req.body || {};

    if (!message) {
      return res.status(400).json({ ok: false, error: 'Commit message required' });
    }

    // Stage specific files if provided
    if (files && files.length > 0) {
      for (const file of files) {
        if (!shouldExcludePath(file)) {
          execSync(`git add "${file}"`, { cwd: CONFIG.repoPath });
        }
      }
    } else {
      execSync('git add .', { cwd: CONFIG.repoPath });
    }

    const result = await commitChanges(message);

    if (result.success && push) {
      const pushResult = await pushChanges();
      result.push = pushResult;
    }

    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/v1/commit/push', async (req, res) => {
  try {
    const { branch = 'main' } = req.body || {};
    const result = await pushChanges(branch);
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/v1/commit/history', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  res.json({
    ok: true,
    history: commitHistory.slice(-limit),
    total: commitHistory.length
  });
});

app.post('/api/v1/commit/generate-content', async (req, res) => {
  try {
    const result = await generateAutomatedContent();
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Auto-commit scheduler
if (CONFIG.autoCommit) {
  setInterval(async () => {
    try {
      const status = await getGitStatus();
      if (status.hasChanges) {
        console.log(`🤖 Auto-committing ${status.totalFiles} changes...`);
        await generateAutomatedContent();
        const result = await commitChanges();

        if (result.success) {
          console.log(`✅ Auto-committed: ${result.message}`);
        }
      }
    } catch (error) {
      console.error('Auto-commit error:', error);
    }
  }, CONFIG.commitInterval);
}

// Start server
app.listen(PORT, () => {
  console.log(`🤖 Automated Commit Service listening on http://127.0.0.1:${PORT}`);
  console.log(`Auto-commit: ${CONFIG.autoCommit ? 'ENABLED' : 'DISABLED'}`);
  console.log(`Commit interval: ${CONFIG.commitInterval / 1000}s`);
  console.log(`Max commits/hour: ${CONFIG.maxCommitsPerHour}`);
});