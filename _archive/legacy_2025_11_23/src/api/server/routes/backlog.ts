import fs from 'fs';
import path from 'path';

const BACKLOG_FILE = path.join(process.cwd(), 'data', 'backlog.json');

// Ensure data directory exists
function ensureDataDir() {
  const dataDir = path.dirname(BACKLOG_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Load backlog from file
function loadBacklog() {
  ensureDataDir();
  try {
    if (fs.existsSync(BACKLOG_FILE)) {
      const data = fs.readFileSync(BACKLOG_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading backlog:', error.message);
  }
  return [];
}

// Save backlog to file
function saveBacklog(items) {
  ensureDataDir();
  try {
    fs.writeFileSync(BACKLOG_FILE, JSON.stringify(items, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving backlog:', error.message);
    return false;
  }
}

export function setupBacklogRoutes(app) {
  // Prioritized backlog (reads from datasets)
  app.get('/api/v1/backlog/prioritized', (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const file = path.join(process.cwd(), 'backlog-airbnb-scored.csv');
    
    let items = [];
    try {
      const lines = fs.readFileSync(file, 'utf8').split('\n').slice(1, limit + 1);
      items = lines.map(l => {
        const [Summary, RICE, Reach, Impact, Confidence, Effort] = l.split(',');
        return { 
          Summary, 
          RICE: +RICE, 
          Reach: +Reach, 
          Impact: +Impact, 
          Confidence: +(Confidence || '0'), 
          Effort: +Effort 
        };
      }).filter(x => x.Summary);
    } catch (e) {
      // Fallback to sample data
      items = [
        { Summary: "Host Onboarding Wizard", RICE: 1700, Reach: 2000, Impact: 3, Confidence: 85, Effort: 3 },
        { Summary: "Fraud Analytics Dashboard", RICE: 1275, Reach: 2000, Impact: 3, Confidence: 85, Effort: 4 },
        { Summary: "Photo Quality Hints", RICE: 1200, Reach: 1200, Impact: 2.5, Confidence: 80, Effort: 2 }
      ];
    }
    
    res.json({ items: items.slice(0, limit) });
  });

  // Get all custom backlog items
  app.get('/api/v1/backlog', (req, res) => {
    const items = loadBacklog();
    res.json({ items });
  });

  // Get single backlog item
  app.get('/api/v1/backlog/:id', (req, res) => {
    const items = loadBacklog();
    const item = items.find(i => i.id === req.params.id);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json(item);
  });

  // Add new backlog item (with persistence)
  app.post('/api/v1/backlog', (req, res) => {
    const { summary, reach, impact, confidence, effort } = req.body;
    if (!summary) {
      return res.status(400).json({ error: 'Summary required' });
    }
    
    const rice = (reach * impact * confidence / 100) / effort;
    const item = {
      id: `backlog-${Date.now()}`,
      summary,
      reach: reach || 0,
      impact: impact || 0,
      confidence: confidence || 0,
      effort: effort || 1,
      rice,
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };
    
    // Save to persistent store
    const items = loadBacklog();
    items.push(item);
    
    if (saveBacklog(items)) {
      res.status(201).json({ created: item });
    } else {
      res.status(500).json({ error: 'Failed to save backlog item' });
    }
  });

  // Update backlog item
  app.put('/api/v1/backlog/:id', (req, res) => {
    const items = loadBacklog();
    const index = items.findIndex(i => i.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    const { summary, reach, impact, confidence, effort } = req.body;
    const updatedItem = {
      ...items[index],
      ...(summary && { summary }),
      ...(reach !== undefined && { reach }),
      ...(impact !== undefined && { impact }),
      ...(confidence !== undefined && { confidence }),
      ...(effort !== undefined && { effort }),
      updated: new Date().toISOString()
    };
    
    // Recalculate RICE if any params changed
    if (reach !== undefined || impact !== undefined || confidence !== undefined || effort !== undefined) {
      const r = updatedItem.reach || 0;
      const im = updatedItem.impact || 0;
      const c = updatedItem.confidence || 0;
      const e = updatedItem.effort || 1;
      updatedItem.rice = (r * im * c / 100) / e;
    }
    
    items[index] = updatedItem;
    
    if (saveBacklog(items)) {
      res.json(updatedItem);
    } else {
      res.status(500).json({ error: 'Failed to update backlog item' });
    }
  });

  // Delete backlog item
  app.delete('/api/v1/backlog/:id', (req, res) => {
    let items = loadBacklog();
    const index = items.findIndex(i => i.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    const deleted = items.splice(index, 1)[0];
    
    if (saveBacklog(items)) {
      res.json({ deleted });
    } else {
      res.status(500).json({ error: 'Failed to delete backlog item' });
    }
  });
}