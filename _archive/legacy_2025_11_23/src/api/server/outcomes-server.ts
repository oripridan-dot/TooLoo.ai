// Minimal TooLoo Outcomes API Server
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json({limit:'1mb'}));

// Health endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Metrics endpoint (returns static values for demo)
app.get('/api/v1/metrics', (req, res) => {
  res.json({
    latest: { f1: 0.75, precision: 0.75, recall: 0.75, timestamp: Date.now() },
    trend: 'flat'
  });
});

// Backlog endpoint (returns top items from sample file)
app.get('/api/v1/backlog/prioritized', (req, res) => {
  const file = path.join(process.cwd(), 'backlog-airbnb-scored.csv');
  let items = [];
  try {
    const lines = fs.readFileSync(file, 'utf8').split('\n').slice(1,13);
    items = lines.map(l => {
      const [Summary,RICE,Reach,Impact,Confidence,Effort] = l.split(',');
      return { Summary, RICE: +RICE, Reach: +Reach, Impact: +Impact, Confidence: +(Confidence||'0'), Effort: +Effort };
    }).filter(x=>x.Summary);
  } catch {}
  res.json({ items });
});

// Fetch endpoint (returns raw HTML for now)
app.get('/api/v1/fetch', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'Missing url' });
  try {
    const r = await fetch(url);
    const html = await r.text();
    res.json({ snippet: html.slice(0,1200), bytes: html.length, truncated: html.length>1200 });
  } catch (e) {
    res.status(500).json({ error: 'Fetch failed' });
  }
});

// Analyze-text endpoint (segments text by lines)
app.post('/api/v1/analyze-text', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Missing text' });
  const lines = text.split(/\r?\n/).filter(l=>l.trim());
  const segments = [];
  let current = { title: '', summary: '', messageCount: 0 };
  for (const l of lines) {
    if (/^User:/.test(l)) {
      if (current.messageCount) segments.push({ ...current });
      current = { title: l.replace(/^User:/,''), summary: '', messageCount: 1 };
    } else if (/^Assistant:/.test(l)) {
      current.summary += (current.summary ? ' ' : '') + l.replace(/^Assistant:/,'');
      current.messageCount++;
    } else {
      current.summary += (current.summary ? ' ' : '') + l;
    }
  }
  if (current.messageCount) segments.push(current);
  res.json({ segments });
});

// Serve dashboard at /dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'web-app', 'outcomes-dashboard.html'));
});

// Root redirect to dashboard
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('Outcomes API running on port', PORT);
});
