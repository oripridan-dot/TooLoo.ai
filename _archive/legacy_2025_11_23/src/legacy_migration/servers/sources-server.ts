/**
 * Sources Server - GitHub issue sync and external data source integration
 * Port: 3010
 * Purpose: Syncs GitHub issues as training topics, manages external data sources
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.SOURCES_PORT || 3010;
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const stateFile = path.join(process.cwd(), 'data', 'sources-github-state.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
  fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch {
    return {};
  }
}

function saveState(state) {
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

// ======= ENDPOINTS =======

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'sources-server', port: PORT, time: new Date().toISOString() });
});

/**
 * Sync GitHub issues to training/new-topic
 * POST /api/v1/sources/github/issues/sync
 * Body: { repo, token, force }
 */
app.post('/api/v1/sources/github/issues/sync', async (req, res) => {
  const { repo = process.env.GITHUB_REPO, token = process.env.GITHUB_TOKEN, force = false } = req.body || {};

  if (!repo || !token) {
    return res.status(400).json({ ok: false, error: 'repo and token required' });
  }

  const state = loadState();
  const lastSync = state[repo]?.lastSync || 0;
  const since = force ? 0 : lastSync;

  try {
    const issuesUrl = `https://api.github.com/repos/${repo}/issues?state=all&since=${new Date(since).toISOString()}`;
    const r = await fetch(issuesUrl, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!r.ok) {
      return res.status(r.status).json({ ok: false, error: `GitHub API error: ${r.statusText}` });
    }

    const issues = await r.json();
    const newTopics = [];
    const trainingBase = process.env.TRAINING_BASE || 'http://127.0.0.1:3001';

    for (const issue of issues) {
      if (!issue.id || state[repo]?.ids?.includes(issue.id)) continue;

      // Normalize to training topic format
      const topic = {
        key: `github-issue-${issue.id}`,
        name: issue.title,
        background: true,
        source: 'github',
        url: issue.html_url,
        body: issue.body || '',
        created_at: issue.created_at,
        labels: issue.labels?.map(l => l.name) || []
      };

      // POST to training/new-topic
      try {
        await fetch(`${trainingBase}/api/v1/training/new-topic`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(topic)
        });
        newTopics.push(topic);
      } catch (e) {
        console.warn(`Failed to sync issue ${issue.id}:`, e.message);
      }

      // Track synced issue
      state[repo] = state[repo] || { ids: [], lastSync: 0 };
      state[repo].ids.push(issue.id);
    }

    state[repo].lastSync = Date.now();
    saveState(state);

    res.json({
      ok: true,
      repo,
      newTopics,
      count: newTopics.length,
      nextSync: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * Get sync status for a repo
 * GET /api/v1/sources/github/:repo/status
 */
app.get('/api/v1/sources/github/:repo/status', (req, res) => {
  const { repo } = req.params;
  const state = loadState();
  const repoState = state[repo];

  if (!repoState) {
    return res.json({
      ok: true,
      repo,
      synced: false,
      message: 'Never synced'
    });
  }

  res.json({
    ok: true,
    repo,
    synced: true,
    issuesSynced: repoState.ids?.length || 0,
    lastSync: new Date(repoState.lastSync).toISOString(),
    lastSyncAgo: `${Math.floor((Date.now() - repoState.lastSync) / 60000)} minutes ago`
  });
});

/**
 * List available data sources
 * GET /api/v1/sources
 */
app.get('/api/v1/sources', (req, res) => {
  res.json({
    ok: true,
    sources: [
      {
        id: 'github',
        name: 'GitHub Issues',
        description: 'Sync issues from GitHub repositories as training topics',
        status: 'active',
        endpoint: '/api/v1/sources/github/issues/sync'
      },
      {
        id: 'confluence',
        name: 'Confluence Pages',
        description: 'Sync pages from Confluence spaces (coming soon)',
        status: 'planned',
        endpoint: '/api/v1/sources/confluence/pages/sync'
      },
      {
        id: 'slack',
        name: 'Slack Threads',
        description: 'Sync important Slack threads as discussion topics (coming soon)',
        status: 'planned',
        endpoint: '/api/v1/sources/slack/threads/sync'
      }
    ]
  });
});

/**
 * Manual trigger for scheduled sync (for testing)
 * POST /api/v1/sources/schedule/trigger
 */
app.post('/api/v1/sources/schedule/trigger', async (req, res) => {
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;

  if (!repo || !token) {
    return res.status(400).json({ ok: false, error: 'GITHUB_REPO and GITHUB_TOKEN environment variables required' });
  }

  try {
    const syncRes = await fetch(`http://127.0.0.1:${PORT}/api/v1/sources/github/issues/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo, token })
    });

    const data = await syncRes.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * Configure scheduled syncing
 * POST /api/v1/sources/schedule/configure
 */
app.post('/api/v1/sources/schedule/configure', (req, res) => {
  const { intervalMinutes = 10, enabled = true } = req.body || {};

  if (enabled && process.env.GITHUB_REPO && process.env.GITHUB_TOKEN) {
    const intervalMs = intervalMinutes * 60 * 1000;
    const repo = process.env.GITHUB_REPO;
    const token = process.env.GITHUB_TOKEN;

    setInterval(async () => {
      try {
        await fetch(`http://127.0.0.1:${PORT}/api/v1/sources/github/issues/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repo, token })
        });
        console.log(`[Sources] Scheduled sync completed for ${repo}`);
      } catch (e) {
        console.warn('[Sources] Scheduled sync failed:', e.message);
      }
    }, intervalMs);

    res.json({
      ok: true,
      schedule: {
        enabled: true,
        intervalMinutes,
        repo,
        nextSync: new Date(Date.now() + intervalMs).toISOString()
      }
    });
  } else {
    res.json({
      ok: true,
      schedule: {
        enabled: false,
        reason: 'GitHub credentials not configured'
      }
    });
  }
});

// Auto-start scheduled sync if enabled
if (process.env.SCHEDULE_GITHUB_ISSUES === 'true' && process.env.GITHUB_REPO && process.env.GITHUB_TOKEN) {
  const intervalMinutes = parseInt(process.env.GITHUB_SYNC_INTERVAL_MINUTES || '10', 10);
  const intervalMs = intervalMinutes * 60 * 1000;
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;

  console.log(`[Sources] Scheduled sync enabled (every ${intervalMinutes} minutes)`);

  setInterval(async () => {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/api/v1/sources/github/issues/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo, token })
      });
      const data = await res.json();
      if (data.ok) {
        console.log(`[Sources] Synced ${data.count} new issues from ${repo}`);
      }
    } catch (e) {
      console.warn('[Sources] Scheduled sync error:', e.message);
    }
  }, intervalMs);
}

// Start server
app.listen(PORT, () => {
  console.log(`[Sources Server] Running on port ${PORT}`);
});
