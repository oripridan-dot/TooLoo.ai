// @version 2.1.11
/**
 * Screen Capture Service
 * 
 * Provides real-time visual context for TooLoo.ai workstation.
 * - Background screenshot loop (configurable interval)
 * - OCR text extraction (Tesseract or local Gemini Vision)
 * - Visual element tagging (UI components, text, images)
 * - Frame buffer (last N screenshots + searchable index)
 * - Intent Packet enrichment (auto-inject screen context)
 * 
 * Enables: "Fix this button", "Redesign this form", visual understanding
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class ScreenCaptureService {
  constructor(options = {}) {
    this.config = {
      captureIntervalMs: options.captureIntervalMs || 3000, // 3 seconds
      maxFrames: options.maxFrames || 50,
      enableOCR: options.enableOCR !== false,
      enableTagging: options.enableTagging !== false,
      storagePath: options.storagePath || path.join(process.cwd(), 'data', 'screenshots'),
      ...options
    };

    this.frames = []; // Circular buffer of last N screenshots
    this.frameIndex = new Map(); // frameId -> metadata for fast lookup
    this.stats = {
      totalCaptured: 0,
      totalOCRed: 0,
      averageLatencyMs: 0,
      lastCaptureAt: null,
      isRunning: false
    };

    this.captureLoop = null;
  }

  /**
   * Initialize storage directory
   */
  async initialize() {
    try {
      await fs.mkdir(this.config.storagePath, { recursive: true });
      console.log(`[Screen Capture] Storage initialized: ${this.config.storagePath}`);
    } catch (e) {
      console.warn(`[Screen Capture] Storage init warning: ${e.message}`);
    }
  }

  /**
   * Start background capture loop
   */
  async start() {
    if (this.stats.isRunning) return;

    await this.initialize();
    this.stats.isRunning = true;

    console.log(`[Screen Capture] Starting capture loop (${this.config.captureIntervalMs}ms)`);

    this.captureLoop = setInterval(async () => {
      try {
        await this.captureFrame();
      } catch (e) {
        console.error(`[Screen Capture] Capture error: ${e.message}`);
      }
    }, this.config.captureIntervalMs);
  }

  /**
   * Stop background capture loop
   */
  stop() {
    if (this.captureLoop) {
      clearInterval(this.captureLoop);
      this.captureLoop = null;
      this.stats.isRunning = false;
      console.log('[Screen Capture] Capture loop stopped');
    }
  }

  /**
   * Capture a single frame (mock implementation - ready for real screenshot)
   */
  async captureFrame() {
    const startMs = Date.now();

    try {
      // TODO: Replace with actual screenshot logic
      // In production, use: Playwright headless browser, FFmpeg, or native APIs
      const screenshot = await this.getScreenshot();

      // Extract OCR if enabled
      let ocrTags = [];
      if (this.config.enableOCR) {
        ocrTags = await this.extractOCR(screenshot);
      }

      // Tag visual elements if enabled
      let tags = [];
      if (this.config.enableTagging) {
        tags = await this.tagElements(screenshot, ocrTags);
      }

      const frame = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        screenshot: screenshot.substring(0, 100) + '...' + screenshot.substring(screenshot.length - 100), // Store first/last 100 chars
        screenshotHash: this.hashScreenshot(screenshot),
        ocrTags,
        tags,
        metadata: {
          width: 1920, // TODO: actual dimensions
          height: 1080,
          colorDepth: 24
        }
      };

      // Add to circular buffer
      if (this.frames.length >= this.config.maxFrames) {
        const removed = this.frames.shift();
        this.frameIndex.delete(removed.id);
      }
      this.frames.push(frame);
      this.frameIndex.set(frame.id, frame);

      // Update stats
      const latencyMs = Date.now() - startMs;
      this.stats.totalCaptured++;
      this.stats.lastCaptureAt = new Date().toISOString();
      this.stats.averageLatencyMs = (this.stats.averageLatencyMs + latencyMs) / 2;

      if (this.config.enableOCR) {
        this.stats.totalOCRed++;
      }

      return frame;
    } catch (e) {
      console.error(`[Screen Capture] Frame capture failed: ${e.message}`);
      throw e;
    }
  }

  /**
   * Mock screenshot getter - replace with real implementation
   */
  async getScreenshot() {
    // Placeholder for real screenshot logic
    // In production: use Playwright, FFmpeg, or native screenshot APIs
    return 'base64_screenshot_data_' + Date.now();
  }

  /**
   * Extract text via OCR (mock - ready for Tesseract integration)
   */
  async extractOCR(screenshot) {
    // TODO: Integrate actual Tesseract.js or local vision model
    // For now: mock OCR results
    const mockTags = [
      'Login Form',
      'Email Input',
      'Password Input',
      'Sign In Button',
      'Forgot Password Link'
    ];

    // In production:
    // const { createWorker } = require('tesseract.js');
    // const worker = await createWorker();
    // const result = await worker.recognize(screenshot);
    // return result.data.lines.map(line => line.text);

    return mockTags;
  }

  /**
   * Tag visual elements (buttons, inputs, images, etc.)
   */
  async tagElements(screenshot, ocrTags) {
    // Mock tagging - in production, use vision API or element detection
    return [
      { type: 'button', label: 'Sign In', confidence: 0.95 },
      { type: 'input', label: 'email', confidence: 0.92 },
      { type: 'input', label: 'password', confidence: 0.91 },
      { type: 'link', label: 'Forgot Password', confidence: 0.88 }
    ];
  }

  /**
   * Simple hash for deduplication
   */
  hashScreenshot(screenshot) {
    return crypto.createHash('md5').update(screenshot).digest('hex');
  }

  /**
   * Get the last N frames
   */
  getLastFrames(count = 5) {
    return this.frames.slice(-Math.min(count, this.frames.length));
  }

  /**
   * Get specific frame by ID
   */
  getFrame(frameId) {
    return this.frameIndex.get(frameId);
  }

  /**
   * Search frames by OCR content
   */
  searchFrames(query) {
    const results = [];
    for (const frame of this.frames) {
      if (frame.ocrTags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))) {
        results.push({
          frameId: frame.id,
          timestamp: frame.timestamp,
          matchedTags: frame.ocrTags.filter(tag => tag.toLowerCase().includes(query.toLowerCase()))
        });
      }
    }
    return results;
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isRunning: this.stats.isRunning,
      stats: this.stats,
      bufferedFrames: this.frames.length,
      maxFrames: this.config.maxFrames,
      lastFrame: this.frames.length > 0 ? this.frames[this.frames.length - 1] : null
    };
  }

  /**
   * Clear all frames
   */
  clear() {
    this.frames = [];
    this.frameIndex.clear();
  }
}

// Express server integration
export function createScreenCaptureServer(options = {}) {
  const app = express();
  const PORT = process.env.SCREEN_CAPTURE_PORT || 3011;
  const service = new ScreenCaptureService(options);

  app.use(cors());
  app.use(express.json());

  // Health endpoint
  app.get('/health', (req, res) =>
    res.json({ ok: true, server: 'screen-capture', time: new Date().toISOString() })
  );

  // Start capture loop
  app.post('/api/v1/screen/start', async (req, res) => {
    try {
      await service.start();
      res.json({ ok: true, status: service.getStatus() });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // Stop capture loop
  app.post('/api/v1/screen/stop', (req, res) => {
    try {
      service.stop();
      res.json({ ok: true, status: service.getStatus() });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // Get last N frames
  app.get('/api/v1/screen/frames', (req, res) => {
    try {
      const count = Number(req.query.count) || 5;
      const frames = service.getLastFrames(count);
      res.json({ ok: true, frames });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // Get specific frame
  app.get('/api/v1/screen/frame/:id', (req, res) => {
    try {
      const frame = service.getFrame(req.params.id);
      if (!frame) {
        return res.status(404).json({ ok: false, error: 'Frame not found' });
      }
      res.json({ ok: true, frame });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // Search frames by content
  app.get('/api/v1/screen/search', (req, res) => {
    try {
      const query = req.query.q || '';
      if (!query) {
        return res.status(400).json({ ok: false, error: 'Missing query parameter' });
      }
      const results = service.searchFrames(query);
      res.json({ ok: true, query, results });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // Get status
  app.get('/api/v1/screen/status', (req, res) => {
    try {
      res.json({ ok: true, status: service.getStatus() });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // Clear frame buffer
  app.post('/api/v1/screen/clear', (req, res) => {
    try {
      service.clear();
      res.json({ ok: true, status: service.getStatus() });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // Analyze current screen (snapshot)
  app.post('/api/v1/screen/analyze', async (req, res) => {
    try {
      const frame = await service.captureFrame();
      res.json({ ok: true, frame, analysis: { ocrTagCount: frame.ocrTags.length, elementCount: frame.tags.length } });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // Start server
  app.listen(PORT, () => {
    console.log(`screen-capture-server listening on http://localhost:${PORT}`);
    service.start().catch(e => console.error('Failed to start capture:', e));
  });

  return { app, service };
}

export default ScreenCaptureService;
