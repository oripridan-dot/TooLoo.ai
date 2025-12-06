import { Router } from 'express';
import { visualCortex } from '../../cortex/index.js';
import {
  visualCortex2,
  type VisualCortex2Request,
  type DataPoint,
  type DataSeries,
  type ChartOptions,
} from '../../cortex/visual/index.js';

const router = Router();

// ============================================================================
// VISUAL CORTEX 1.0 - AI Image Generation
// ============================================================================

router.post('/generate', async (req, res) => {
  try {
    const {
      prompt,
      provider,
      model,
      aspectRatio,
      imageSize,
      negativePrompt,
      referenceImages,
      mode,
      options,
    } = req.body;

    if (!prompt && (!referenceImages || referenceImages.length === 0)) {
      return res.status(400).json({ error: 'Prompt or reference images are required.' });
    }

    // Use Visual Cortex for intelligent generation
    const response = await visualCortex.imagine(prompt, {
      provider,
      model,
      aspectRatio,
      imageSize,
      negativePrompt,
      referenceImages,
      mode,
      ...options, // Pass skipEnhancement and other options
    });

    res.json(response);
  } catch (error: any) {
    console.error('[Visuals API] Error generating image:', error);
    // Return 500 but with the actual error message so the frontend can display it
    res.status(500).json({
      error: 'Generation failed',
      details: error.message || String(error),
    });
  }
});

// ============================================================================
// VISUAL CORTEX 2.0 - SVG & Chart Generation
// ============================================================================

/**
 * GET /api/v1/visuals/v2/status
 * Get Visual Cortex 2.0 system status
 */
router.get('/v2/status', (req, res) => {
  try {
    const status = visualCortex2.getStatus();
    res.json({ ok: true, data: status });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/v1/visuals/v2/generate
 * Unified generation endpoint for Visual Cortex 2.0
 */
router.post('/v2/generate', async (req, res) => {
  try {
    const request = req.body as VisualCortex2Request;

    if (!request.type) {
      return res.status(400).json({ ok: false, error: 'Request type is required' });
    }

    const result = await visualCortex2.generate(request);

    if (result.success) {
      res.json({ ok: true, data: result });
    } else {
      res.status(400).json({ ok: false, error: result.error });
    }
  } catch (error: any) {
    console.error('[Visual Cortex 2.0] Generation error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// CHART ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/visuals/v2/chart/bar
 * Generate a bar chart SVG
 */
router.post('/v2/chart/bar', (req, res) => {
  try {
    const { data, options } = req.body as { data: DataPoint[]; options?: ChartOptions };

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ ok: false, error: 'Data array is required' });
    }

    const svg = visualCortex2.barChart(data, options);
    res.json({ ok: true, svg, type: 'bar-chart' });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/v1/visuals/v2/chart/line
 * Generate a line chart SVG
 */
router.post('/v2/chart/line', (req, res) => {
  try {
    const { series, options } = req.body as { series: DataSeries[]; options?: ChartOptions };

    if (!series || !Array.isArray(series)) {
      return res.status(400).json({ ok: false, error: 'Series array is required' });
    }

    const svg = visualCortex2.lineChart(series, options);
    res.json({ ok: true, svg, type: 'line-chart' });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/v1/visuals/v2/chart/pie
 * Generate a pie/donut chart SVG
 */
router.post('/v2/chart/pie', (req, res) => {
  try {
    const { data, options } = req.body as {
      data: DataPoint[];
      options?: ChartOptions & { donut?: boolean };
    };

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ ok: false, error: 'Data array is required' });
    }

    const svg = visualCortex2.pieChart(data, options);
    res.json({ ok: true, svg, type: options?.donut ? 'donut-chart' : 'pie-chart' });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/v1/visuals/v2/chart/gauge
 * Generate a gauge/progress indicator SVG
 */
router.post('/v2/chart/gauge', (req, res) => {
  try {
    const { value, options } = req.body as { value: number; options?: ChartOptions };

    if (typeof value !== 'number') {
      return res.status(400).json({ ok: false, error: 'Value is required and must be a number' });
    }

    const svg = visualCortex2.gauge(value, options);
    res.json({ ok: true, svg, type: 'gauge' });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/v1/visuals/v2/chart/sparkline
 * Generate a sparkline SVG
 */
router.post('/v2/chart/sparkline', (req, res) => {
  try {
    const { values, options } = req.body as {
      values: number[];
      options?: { width?: number; height?: number; color?: string };
    };

    if (!values || !Array.isArray(values)) {
      return res.status(400).json({ ok: false, error: 'Values array is required' });
    }

    const svg = visualCortex2.sparkline(values, options);
    res.json({ ok: true, svg, type: 'sparkline' });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// SVG COMPONENT ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/visuals/v2/svg/background
 * Generate a styled background SVG
 */
router.post('/v2/svg/background', (req, res) => {
  try {
    const options = req.body;
    const svg = visualCortex2.svg.createBackground(options);
    res.json({ ok: true, svg, type: 'background' });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/v1/visuals/v2/svg/card
 * Generate a card component SVG
 */
router.post('/v2/svg/card', (req, res) => {
  try {
    const options = req.body;
    const svg = visualCortex2.svg.createCard(options);
    res.json({ ok: true, svg, type: 'card' });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/v1/visuals/v2/svg/badge
 * Generate a badge SVG
 */
router.post('/v2/svg/badge', (req, res) => {
  try {
    const options = req.body;
    const svg = visualCortex2.svg.createBadge(options);
    res.json({ ok: true, svg, type: 'badge' });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/v1/visuals/v2/svg/icon
 * Generate an icon placeholder SVG
 */
router.post('/v2/svg/icon', (req, res) => {
  try {
    const options = req.body;
    const svg = visualCortex2.svg.createIcon(options);
    res.json({ ok: true, svg, type: 'icon' });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// ANIMATION ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/visuals/v2/animation/presets
 * List available animation presets
 */
router.get('/v2/animation/presets', (req, res) => {
  try {
    const presets = Object.keys(visualCortex2.animations);
    res.json({ ok: true, presets });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/v1/visuals/v2/animation/:preset
 * Get CSS animation for a preset
 */
router.get('/v2/animation/:preset', (req, res) => {
  try {
    const { preset } = req.params;

    if (!(preset in visualCortex2.animations)) {
      return res.status(404).json({ ok: false, error: `Animation preset '${preset}' not found` });
    }

    const animation = visualCortex2.animation.getPreset(
      preset as keyof typeof visualCortex2.animations
    );
    const css = visualCortex2.animation.toCSSAnimation(animation);
    const keyframes = visualCortex2.animation.toCSSKeyframes(animation);

    res.json({ ok: true, preset, animation, css, keyframes });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/v1/visuals/v2/animation/easings
 * List available easing functions
 */
router.get('/v2/animation/easings', (req, res) => {
  try {
    res.json({ ok: true, easings: visualCortex2.easings });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// DESIGN SYSTEM ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/visuals/v2/design-system
 * Get the full design system
 */
router.get('/v2/design-system', async (req, res) => {
  try {
    const system = visualCortex2.getDesignSystem();
    res.json({ ok: true, data: system });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/v1/visuals/v2/design-tokens
 * Get design tokens only
 */
router.get('/v2/design-tokens', (req, res) => {
  try {
    const tokens = visualCortex2.getTokens();
    res.json({ ok: true, tokens });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * PATCH /api/v1/visuals/v2/design-tokens
 * Update design tokens
 */
router.patch('/v2/design-tokens', async (req, res) => {
  try {
    const updates = req.body;
    const tokens = await visualCortex2.updateTokens(updates);
    res.json({ ok: true, tokens });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/v1/visuals/v2/palettes
 * Get chart color palettes
 */
router.get('/v2/palettes', (req, res) => {
  try {
    res.json({ ok: true, palettes: visualCortex2.palettes });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;
