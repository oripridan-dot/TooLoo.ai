import fs from 'fs';
import path from 'path';

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

  // Add new backlog item
  app.post('/api/v1/backlog', (req, res) => {
    const { summary, reach, impact, confidence, effort } = req.body;
    if (!summary) {
      return res.status(400).json({ error: 'Summary required' });
    }
    
    const rice = (reach * impact * confidence / 100) / effort;
    const item = { summary, reach, impact, confidence, effort, rice };
    
    // TODO: Save to persistent store
    res.json({ created: item });
  });
}