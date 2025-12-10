// @version 3.3.220
// TooLoo.ai Design Routes - Figma Copilot Integration
import { Router, Request, Response } from 'express';
import fs from 'fs-extra';
import path from 'path';
import { chromium } from 'playwright';
import axios from 'axios';
import { figmaBridge, designToCode, FigmaBridge, DesignContext, CodeGenOptions, GenerationResult } from '../../cortex/design/index.js';
import { bus } from '../../core/event-bus.js';

const router = Router();
const DESIGN_SYSTEM_PATH = path.join(process.cwd(), 'data', 'design-system.json');
const FIGMA_CACHE_PATH = path.join(process.cwd(), 'data', 'figma-cache');

// Environment-based Figma token
const FIGMA_ACCESS_TOKEN = process.env['FIGMA_ACCESS_TOKEN'] || '';

// Initialize Figma Bridge if token exists
if (FIGMA_ACCESS_TOKEN) {
  figmaBridge.initialize(FIGMA_ACCESS_TOKEN);
  console.log('[Design Routes] Figma Bridge initialized with env token');
}

// Ensure data dirs exist
fs.ensureDirSync(path.dirname(DESIGN_SYSTEM_PATH));
fs.ensureDirSync(FIGMA_CACHE_PATH);

// Initialize default design system if missing
if (!fs.existsSync(DESIGN_SYSTEM_PATH)) {
  fs.writeJsonSync(
    DESIGN_SYSTEM_PATH,
    {
      tokens: {
        colors: {
          primary: '#007bff',
          secondary: '#6c757d',
          success: '#28a745',
          danger: '#dc3545',
        },
        spacing: {
          sm: '0.5rem',
          md: '1rem',
          lg: '2rem',
        },
        typography: {
          fontFamily: 'Inter, sans-serif',
          baseSize: '16px',
        },
      },
      components: [],
    },
    { spaces: 2 }
  );
}

router.get('/system', async (req, res) => {
  try {
    const system = await fs.readJson(DESIGN_SYSTEM_PATH);
    res.json({ ok: true, system });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/system', async (req, res) => {
  try {
    const { system } = req.body;
    await fs.writeJson(DESIGN_SYSTEM_PATH, system, { spaces: 2 });
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/components', async (req, res) => {
  try {
    const system = await fs.readJson(DESIGN_SYSTEM_PATH);
    res.json({ ok: true, components: system.components || [] });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// List Systems (Presets)
router.get('/systems', async (req, res) => {
  try {
    // Return the default system as a list item
    const system = await fs.readJson(DESIGN_SYSTEM_PATH);
    res.json({
      ok: true,
      systems: [{ id: 'default', name: 'Default System', ...system }],
    });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Extract from Website (Real)
router.post('/extract-from-website', async (req, res) => {
  const { websiteUrl } = req.body;
  console.log(`[Design] Extracting from ${websiteUrl}...`);

  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(websiteUrl, { waitUntil: 'networkidle' });

    const data = await page.evaluate(() => {
      const colors = new Set<string>();
      const fonts = new Set<string>();

      // Scan all elements
      const elements = document.querySelectorAll('*');
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        if (!el) continue;
        const style = window.getComputedStyle(el);
        if (style.color) colors.add(style.color);
        if (style.backgroundColor) colors.add(style.backgroundColor);
        if (style.fontFamily) fonts.add(style.fontFamily);
      }

      const colorArray = Array.from(colors)
        .map((rgb) => {
          // Inline rgbToHex logic to avoid __name injection issues
          if (!rgb.startsWith('rgb')) return rgb;
          const match = rgb.match(/\d+/g);
          if (!match || match.length < 3) return rgb;
          const r = parseInt(match[0] ?? '0', 10);
          const g = parseInt(match[1] ?? '0', 10);
          const b = parseInt(match[2] ?? '0', 10);
          return (
            '#' +
            [r, g, b]
              .map((x) => {
                const hex = x.toString(16);
                return hex.length === 1 ? '0' + hex : hex;
              })
              .join('')
          );
        })
        .filter((c) => c.startsWith('#') && c !== '#00000000') // Filter transparent
        .slice(0, 20); // Limit to 20

      const fontArray = Array.from(fonts)
        .map((f) => (f.split(',')[0] ?? '').replace(/['"]/g, ''))
        .slice(0, 10);

      return {
        brand: { name: document.title },
        tokens: {
          colors: colorArray.reduce((acc, c, i) => ({ ...acc, [`color-${i + 1}`]: c }), {}),
          typography: fontArray.reduce((acc, f, i) => ({ ...acc, [`font-${i + 1}`]: f }), {}),
        },
      };
    });

    await browser.close();
    res.json({ ok: true, ...data });
  } catch (error: any) {
    console.error(`[Design] Extraction failed: ${error.message}`);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Import Figma (Real)
router.post('/import-figma', async (req, res) => {
  const { figmaUrl, apiToken } = req.body;

  if (!apiToken) {
    return res.status(400).json({ ok: false, error: 'Figma API Token required' });
  }

  try {
    // Extract File Key: https://www.figma.com/file/ByKey/...
    const fileKeyMatch = figmaUrl.match(/file\/([a-zA-Z0-9]+)/);
    if (!fileKeyMatch) {
      throw new Error('Invalid Figma URL');
    }
    const fileKey = fileKeyMatch[1];

    const response = await axios.get(`https://api.figma.com/v1/files/${fileKey}/styles`, {
      headers: { 'X-Figma-Token': apiToken },
    });

    const styles = response.data.meta.styles;
    const colors: Record<string, string> = {};

    // Note: To get actual color values, we'd need to fetch the nodes.
    // For now, we'll just list the style names as a proof of connection.
    // A full implementation would require a second call to /files/:key/nodes?ids=...

    styles.forEach((s: { style_type: string; name: string; node_id?: string }) => {
      if (s.style_type === 'FILL') {
        // Figma API limitation: Styles endpoint returns style names but not color values.
        // Full implementation requires: GET /files/:key/nodes?ids={node_id}
        // For now, we return the style names with a default color indicator
        colors[s.name] = `style:${s.node_id || 'unknown'}`;
      }
    });

    res.json({
      ok: true,
      metadata: { name: 'Figma Import' },
      designSystem: {
        colors,
      },
    });
  } catch (error: any) {
    console.error(`[Design] Figma import failed: ${error.message}`);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Stream Tokens (Mock SSE)
router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (data: Record<string, unknown>) => {
    res.write(`event: token\ndata: ${JSON.stringify(data)}\n\n`);
  };

  let count = 0;
  const interval = setInterval(() => {
    send({
      key: `token-${count}`,
      value: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
    });
    count++;
    if (count > 5) {
      clearInterval(interval);
      res.write('event: done\ndata: {}\n\n');
      res.end();
    }
  }, 1000);

  req.on('close', () => clearInterval(interval));
});

// ============================================================================
// TOOLOO COPILOT - FIGMA MAKE STYLE ENDPOINTS
// ============================================================================

/**
 * Check Figma connection status
 */
router.get('/figma/status', async (req: Request, res: Response) => {
  try {
    const hasToken = !!FIGMA_ACCESS_TOKEN;
    
    if (!hasToken) {
      return res.json({
        ok: true,
        connected: false,
        message: 'FIGMA_ACCESS_TOKEN not configured in .env',
      });
    }

    // Test the connection by fetching user info
    const response = await axios.get('https://api.figma.com/v1/me', {
      headers: { 'X-Figma-Token': FIGMA_ACCESS_TOKEN },
    });

    res.json({
      ok: true,
      connected: true,
      user: {
        id: response.data.id,
        email: response.data.email,
        handle: response.data.handle,
      },
    });
  } catch (error: any) {
    res.json({
      ok: true,
      connected: false,
      error: error.response?.data?.message || error.message,
    });
  }
});

/**
 * Parse a Figma URL and return file/node info
 */
router.post('/figma/parse-url', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ ok: false, error: 'URL required' });
    }

    const parsed = FigmaBridge.parseUrl(url);
    res.json({ ok: true, ...parsed });
  } catch (error: any) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

/**
 * Get Figma file metadata
 */
router.get('/figma/file/:fileId', async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    
    if (!fileId) {
      return res.status(400).json({ ok: false, error: 'File ID required' });
    }
    
    const file = await figmaBridge.getFile(fileId);
    
    res.json({
      ok: true,
      file: {
        name: file.name,
        lastModified: file.lastModified,
        version: file.version,
        componentCount: Object.keys(file.components).length,
        styleCount: Object.keys(file.styles).length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * Import a Figma design and analyze it
 */
router.post('/figma/import', async (req: Request, res: Response) => {
  try {
    const { fileId, nodeIds, url } = req.body;
    
    let targetFileId = fileId;
    let targetNodeIds = nodeIds;

    // Parse URL if provided
    if (url && !fileId) {
      const parsed = FigmaBridge.parseUrl(url);
      targetFileId = parsed.fileId;
      targetNodeIds = parsed.nodeIds;
    }

    if (!targetFileId) {
      return res.status(400).json({ ok: false, error: 'File ID or URL required' });
    }

    console.log(`[Design] Importing Figma file: ${targetFileId}`);
    
    const context = await figmaBridge.importDesign(targetFileId, targetNodeIds);
    
    // Cache the context
    const cacheFile = path.join(FIGMA_CACHE_PATH, `${targetFileId}.json`);
    await fs.writeJson(cacheFile, {
      importedAt: new Date().toISOString(),
      fileId: targetFileId,
      fileName: context.file.name,
      componentCount: context.componentMap.size,
      tokenCount: context.designTokens.length,
    });

    res.json({
      ok: true,
      import: {
        fileId: targetFileId,
        fileName: context.file.name,
        components: Array.from(context.componentMap.values()).map(c => ({
          id: c.figmaId,
          name: c.name,
          type: c.type,
          semanticRole: c.semanticRole,
        })),
        tokens: context.designTokens,
        semanticAnalysis: context.semanticAnalysis,
      },
    });

    // Publish event for other systems
    bus.publish('cortex', 'design:figma_imported', {
      fileId: targetFileId,
      fileName: context.file.name,
    });
  } catch (error: any) {
    console.error(`[Design] Figma import failed:`, error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * The "Make" endpoint - Generate code from Figma design (like Figma Make)
 */
router.post('/figma/make', async (req: Request, res: Response) => {
  try {
    const { 
      url,
      fileId,
      nodeIds,
      options = {}
    } = req.body;

    let targetFileId = fileId;
    let targetNodeIds = nodeIds;

    // Parse URL if provided
    if (url && !fileId) {
      const parsed = FigmaBridge.parseUrl(url);
      targetFileId = parsed.fileId;
      targetNodeIds = parsed.nodeIds || targetNodeIds;
    }

    if (!targetFileId) {
      return res.status(400).json({ ok: false, error: 'File ID or URL required' });
    }

    console.log(`[Design] Making code from Figma: ${targetFileId}`);

    // Default options
    const codeGenOptions: CodeGenOptions = {
      framework: options.framework || 'react',
      styling: options.styling || 'tailwind',
      typescript: options.typescript !== false,
      componentLibrary: options.componentLibrary,
      includeTests: options.includeTests || false,
      includeStorybook: options.includeStorybook || false,
    };

    // Import and analyze the design
    const context = await figmaBridge.importDesign(targetFileId, targetNodeIds);
    
    // Generate code
    const result = await designToCode.generate(context, codeGenOptions);

    // Publish event
    bus.publish('cortex', 'design:code_generated', {
      fileId: targetFileId,
      componentCount: result.components.length,
      qualityScore: result.totalQualityScore,
    });

    res.json({
      ok: true,
      generation: {
        components: result.components.map(c => ({
          name: c.name,
          code: c.code,
          types: c.types,
          styles: c.styles,
          test: c.test,
          story: c.story,
          qualityScore: c.qualityScore,
          dependencies: c.dependencies,
          figmaSource: c.figmaSource,
        })),
        sharedStyles: result.sharedStyles,
        designTokens: result.designTokens,
        indexFile: result.indexFile,
        totalQualityScore: result.totalQualityScore,
        warnings: result.warnings,
        suggestions: result.suggestions,
      },
    });
  } catch (error: any) {
    console.error(`[Design] Code generation failed:`, error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * Stream code generation (Server-Sent Events for live feedback)
 */
router.get('/figma/make/stream', async (req: Request, res: Response) => {
  const { fileId, url } = req.query;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (event: string, data: Record<string, unknown>) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    let targetFileId = fileId as string;

    if (url && !fileId) {
      const parsed = FigmaBridge.parseUrl(url as string);
      targetFileId = parsed.fileId;
    }

    if (!targetFileId) {
      send('error', { message: 'File ID or URL required' });
      res.end();
      return;
    }

    // Stage 1: Parsing
    send('progress', { stage: 'parsing', message: '🔍 Parsing Figma design...', progress: 10 });
    const file = await figmaBridge.getFile(targetFileId);
    send('progress', { stage: 'parsing', message: `Found: ${file.name}`, progress: 20 });

    // Stage 2: Analyzing
    send('progress', { stage: 'analyzing', message: '🧠 Analyzing design semantics...', progress: 30 });
    const context = await figmaBridge.importDesign(targetFileId);
    send('progress', { 
      stage: 'analyzing', 
      message: `Identified ${context.componentMap.size} components`, 
      progress: 50 
    });

    // Stage 3: Generating
    send('progress', { stage: 'generating', message: '⚡ Generating code...', progress: 60 });
    
    const result = await designToCode.generate(context, {
      framework: 'react',
      styling: 'tailwind',
      typescript: true,
      includeTests: false,
      includeStorybook: false,
    });

    // Stream each component
    for (const [index, component] of result.components.entries()) {
      send('component', {
        index,
        total: result.components.length,
        name: component.name,
        code: component.code,
        qualityScore: component.qualityScore,
      });
      send('progress', { 
        stage: 'generating', 
        message: `Generated ${component.name}`, 
        progress: 60 + (30 * (index + 1) / result.components.length)
      });
    }

    // Stage 4: Validating
    send('progress', { stage: 'validating', message: '✅ Validating quality...', progress: 95 });
    
    // Final result
    send('complete', {
      totalQualityScore: result.totalQualityScore,
      componentCount: result.components.length,
      warnings: result.warnings.length,
      suggestions: result.suggestions.length,
    });
    send('progress', { stage: 'done', message: '🎉 Complete!', progress: 100 });
    
  } catch (error: any) {
    send('error', { message: error.message });
  }

  res.end();
});

/**
 * Export a component's image from Figma
 */
router.get('/figma/export/:fileId/:nodeId', async (req: Request, res: Response) => {
  try {
    const { fileId, nodeId } = req.params;
    const { format = 'svg', scale = '2' } = req.query;

    if (!fileId || !nodeId) {
      return res.status(400).json({ ok: false, error: 'fileId and nodeId required' });
    }

    const imageUrl = await figmaBridge.exportImage(
      fileId, 
      nodeId.replace('-', ':'),
      format as 'png' | 'svg' | 'jpg',
      parseInt(scale as string)
    );

    res.json({ ok: true, imageUrl });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * Get cached Figma imports
 */
router.get('/figma/cache', async (req: Request, res: Response) => {
  try {
    const files = await fs.readdir(FIGMA_CACHE_PATH);
    const imports = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const data = await fs.readJson(path.join(FIGMA_CACHE_PATH, file));
        imports.push(data);
      }
    }

    res.json({ ok: true, imports });
  } catch (error: any) {
    res.json({ ok: true, imports: [] });
  }
});

/**
 * Webhook endpoint for Figma file updates (for real-time sync)
 */
router.post('/figma/webhook', async (req: Request, res: Response) => {
  try {
    const { event_type, file_key, file_name, timestamp, passcode } = req.body;

    console.log(`[Design] Figma webhook: ${event_type} for ${file_name || file_key}`);

    // Verify passcode if configured
    const expectedPasscode = process.env['FIGMA_WEBHOOK_PASSCODE'];
    if (expectedPasscode && passcode !== expectedPasscode) {
      return res.status(401).json({ ok: false, error: 'Invalid passcode' });
    }

    // Handle different event types
    switch (event_type) {
      case 'FILE_UPDATE':
        bus.publish('cortex', 'design:figma_updated', {
          fileKey: file_key,
          fileName: file_name,
          timestamp,
        });
        break;
      
      case 'FILE_DELETE':
        bus.publish('cortex', 'design:figma_deleted', {
          fileKey: file_key,
          timestamp,
        });
        break;
      
      case 'FILE_VERSION_UPDATE':
        bus.publish('cortex', 'design:figma_version', {
          fileKey: file_key,
          fileName: file_name,
          timestamp,
        });
        break;
    }

    res.json({ ok: true });
  } catch (error: any) {
    console.error(`[Design] Webhook error:`, error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * Get framework/styling presets
 */
router.get('/presets', (req: Request, res: Response) => {
  res.json({
    ok: true,
    presets: {
      frameworks: [
        { id: 'react', name: 'React', icon: '⚛️' },
        { id: 'vue', name: 'Vue', icon: '💚' },
        { id: 'svelte', name: 'Svelte', icon: '🔥' },
        { id: 'html', name: 'HTML', icon: '📄' },
      ],
      styling: [
        { id: 'tailwind', name: 'Tailwind CSS', icon: '🎨' },
        { id: 'css-modules', name: 'CSS Modules', icon: '📦' },
        { id: 'styled-components', name: 'Styled Components', icon: '💅' },
        { id: 'emotion', name: 'Emotion', icon: '👩‍🎤' },
      ],
      componentLibraries: [
        { id: 'shadcn', name: 'shadcn/ui', icon: '🎭' },
        { id: 'radix', name: 'Radix UI', icon: '🔮' },
        { id: 'chakra', name: 'Chakra UI', icon: '⚡' },
        { id: 'mantine', name: 'Mantine', icon: '🔷' },
      ],
    },
  });
});

export default router;
