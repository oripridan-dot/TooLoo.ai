/**
 * TooLoo.ai Infographics Server
 * Port: 3010
 * 
 * Generates visual representations of analysis data
 * Supports 8 visualization types with Claude-style explanations
 */

import express from 'express';
import InfographicsEngine from './infographics-engine.js';

const app = express();
const PORT = 3010;

app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

const engine = new InfographicsEngine();

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', port: PORT, service: 'infographics' });
});

/**
 * POST /api/v1/infographics/generate
 * Generate infographic from analysis data
 */
app.post('/api/v1/infographics/generate', async (req, res) => {
  try {
    const { data, analysisType, style = 'modern', type = null } = req.body;

    // Auto-detect type if not specified
    const vizType = type || engine.detectVisualizationType(data, analysisType);

    // Generate infographic
    const infographic = await engine.generate({
      data,
      type: vizType,
      style,
      title: data.title || 'TooLoo Analysis',
      metrics: data.metrics
    });

    res.json({
      status: 'success',
      infographic,
      renderFormat: 'svg',
      downloadLink: `/api/v1/infographics/${infographic.id}/svg`
    });

  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/infographics/templates
 * List available templates
 */
app.get('/api/v1/infographics/templates', (req, res) => {
  try {
    const templates = engine.listTemplates();
    res.json({ templates });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/infographics/:id
 * Retrieve infographic by ID
 */
app.get('/api/v1/infographics/:id', (req, res) => {
  try {
    const infographic = engine.getInfographic(req.params.id);
    res.json(infographic);
  } catch (error) {
    res.status(404).json({ error: 'Not found' });
  }
});

/**
 * GET /api/v1/infographics/:id/svg
 * Download infographic as SVG
 */
app.get('/api/v1/infographics/:id/svg', (req, res) => {
  try {
    const infographic = engine.getInfographic(req.params.id);
    res.type('svg');
    res.send(infographic.svg);
  } catch (error) {
    res.status(404).json({ error: 'Not found' });
  }
});

/**
 * POST /api/v1/infographics/explain
 * Generate explanation for infographic
 */
app.post('/api/v1/infographics/explain', (req, res) => {
  try {
    const { infographic } = req.body;
    const explanation = engine.generateExplanation(infographic);
    res.json({ infographic, explanation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/infographics/batch
 * Generate multiple infographics
 */
app.post('/api/v1/infographics/batch', async (req, res) => {
  try {
    const { analyses, style = 'modern' } = req.body;

    const infographics = await Promise.all(
      analyses.map(analysis =>
        engine.generate({ ...analysis, style })
      )
    );

    res.json({
      status: 'success',
      count: infographics.length,
      infographics
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log(`✨ Infographics Server running on port ${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api/v1/infographics`);
  console.log(`🎨 Templates: http://localhost:${PORT}/api/v1/infographics/templates`);
});

export default app;
