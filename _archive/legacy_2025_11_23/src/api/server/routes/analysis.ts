import { segmentText } from '../../skills/segmentation.js';
import { fetchUrl } from '../../skills/fetcher.js';

export function setupAnalysisRoutes(app) {
  // Text segmentation analysis
  app.post('/api/v1/analyze-text', async (req, res) => {
    try {
      const { text, advanced = false } = req.body;
      // Allow empty text for edge case testing
      if (text === undefined) {
        return res.status(400).json({ error: 'Text field required' });
      }

      const result = await segmentText(text, { advanced });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // URL fetching and analysis
  app.get('/api/v1/fetch', async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) {
        return res.status(400).json({ error: 'URL required' });
      }

      const result = await fetchUrl(url);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Batch analysis
  app.post('/api/v1/analyze-batch', async (req, res) => {
    try {
      const { items, type = 'text' } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Items array required' });
      }

      const results = [];
      for (const item of items.slice(0, 10)) { // Limit batch size
        if (type === 'text') {
          const result = await segmentText(item.text || item, { advanced: false });
          results.push({ id: item.id, ...result });
        }
      }

      res.json({ results, processed: results.length });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}