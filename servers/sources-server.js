// servers/sources-server.js
import express from 'express';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.SOURCES_PORT || 3010;
app.use(express.json({ limit: '2mb' }));

const stateFile = path.join(process.cwd(), 'sources-github-state.json');

function loadState() {
  try { return JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch { return {}; }
}
function saveState(state) {
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

// Sync GitHub issues to training/new-topic (background=true)
app.post('/api/v1/sources/github/issues/sync', async (req, res) => {
  const { repo = process.env.GITHUB_REPO, token = process.env.GITHUB_TOKEN, force = false } = req.body || {};
  if (!repo || !token) return res.status(400).json({ ok: false, error: 'repo and token required' });
  const state = loadState();
  const lastSync = state[repo]?.lastSync || 0;
  const since = force ? 0 : lastSync;
  try {
    const issuesUrl = `https://api.github.com/repos/${repo}/issues?state=all&since=${new Date(since).toISOString()}`;
    const r = await fetch(issuesUrl, { headers: { 'Authorization': `token ${token}` } });
    const issues = await r.json();
    const newTopics = [];
    for (const issue of issues) {
      if (!issue.id || state[repo]?.ids?.includes(issue.id)) continue;
      // Normalize to training topic
      const topic = {
        key: `github-issue-${issue.id}`,
        name: issue.title,
        background: true,
        source: 'github',
        url: issue.html_url,
        body: issue.body || '',
        created_at: issue.created_at
      };
      // POST to training/new-topic
      await fetch(`${process.env.TRAINING_BASE || 'http://127.0.0.1:3001'}/api/v1/training/new-topic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(topic)
      });
      newTopics.push(topic);
      state[repo] = state[repo] || { ids: [], lastSync: 0 };
      state[repo].ids.push(issue.id);
    }
    state[repo].lastSync = Date.now();
    saveState(state);
    res.json({ ok: true, newTopics, count: newTopics.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Health endpoint
app.get('/health', (req, res) => res.json({ ok: true, server: 'sources', time: new Date().toISOString() }));

// Simple scheduler: sync every 10min if env SCHEDULE_GITHUB_ISSUES=true
if (process.env.SCHEDULE_GITHUB_ISSUES === 'true') {
  setInterval(() => {
    const repo = process.env.GITHUB_REPO;
    const token = process.env.GITHUB_TOKEN;
    if (repo && token) {
      fetch(`http://127.0.0.1:${PORT}/api/v1/sources/github/issues/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo, token })
      });
    }
  }, 10 * 60 * 1000);
}

app.listen(PORT, () => {
  console.log(`Sources server running on port ${PORT}`);
});
