// @version 3.3.439
/**
 * Screen Capture Service - Real Implementation
 *
 * Provides real screenshot capture via Playwright and OCR text extraction
 * via Tesseract.js. This replaces any mock/simulation implementations.
 *
 * Features:
 * - Full page screenshots with Playwright
 * - Element-specific screenshots
 * - OCR text extraction from images
 * - Visual diff detection
 * - Automatic browser lifecycle management
 *
 * @module cortex/vision/screen-capture-service
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import Tesseract from 'tesseract.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import { bus } from '../../core/event-bus.js';

const SCREENSHOTS_DIR = path.join(process.cwd(), 'data', 'screenshots');
const MAX_SCREENSHOTS = 100; // Auto-cleanup threshold

export interface CaptureOptions {
  url?: string;
  selector?: string;
  fullPage?: boolean;
  waitForSelector?: string;
  waitMs?: number;
  viewport?: { width: number; height: number };
  extractText?: boolean;
  format?: 'png' | 'jpeg';
  quality?: number; // 0-100 for jpeg
}

export interface CaptureResult {
  success: boolean;
  imagePath?: string;
  imageBuffer?: Buffer;
  extractedText?: string[];
  metadata: {
    url?: string;
    timestamp: number;
    viewport: { width: number; height: number };
    format: string;
    ocrEnabled: boolean;
    ocrConfidence?: number;
  };
  error?: string;
}

export interface OCRResult {
  text: string;
  lines: string[];
  confidence: number;
  words: Array<{
    text: string;
    confidence: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
  }>;
}

export class ScreenCaptureService {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private initialized = false;
  private tesseractWorker: Tesseract.Worker | null = null;

  constructor() {
    // Ensure screenshots directory exists
    fs.ensureDirSync(SCREENSHOTS_DIR);
  }

  /**
   * Initialize the capture service (lazy - called on first use)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[ScreenCapture] Initializing vision system...');

    try {
      // Launch browser in headless mode
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      this.context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });

      this.initialized = true;
      console.log('[ScreenCapture] ✅ Vision system ready (Playwright + Tesseract)');

      bus.publish('cortex', 'vision:ready', { service: 'screen-capture' });
    } catch (error: any) {
      console.error('[ScreenCapture] Failed to initialize:', error.message);
      throw error;
    }
  }

  /**
   * Capture a screenshot of a URL or the current page
   */
  async capture(options: CaptureOptions = {}): Promise<CaptureResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const {
      url,
      selector,
      fullPage = true,
      waitForSelector,
      waitMs = 0,
      viewport = { width: 1920, height: 1080 },
      extractText = false,
      format = 'png',
      quality = 80,
    } = options;

    const timestamp = Date.now();
    const filename = `capture-${timestamp}.${format}`;
    const imagePath = path.join(SCREENSHOTS_DIR, filename);

    try {
      if (!this.context) {
        throw new Error('Browser context not initialized');
      }

      const page = await this.context.newPage();

      // Set viewport
      await page.setViewportSize(viewport);

      // Navigate if URL provided
      if (url) {
        await page.goto(url, { waitUntil: 'networkidle' });
      }

      // Wait for specific selector if requested
      if (waitForSelector) {
        await page.waitForSelector(waitForSelector, { timeout: 10000 });
      }

      // Additional wait time if specified
      if (waitMs > 0) {
        await page.waitForTimeout(waitMs);
      }

      // Capture screenshot
      let buffer: Buffer;
      if (selector) {
        const element = await page.$(selector);
        if (!element) {
          throw new Error(`Selector not found: ${selector}`);
        }
        buffer = await element.screenshot({ type: format as 'png' | 'jpeg' });
      } else {
        buffer = await page.screenshot({
          fullPage,
          type: format as 'png' | 'jpeg',
          ...(format === 'jpeg' && { quality }),
        });
      }

      // Save to file
      await fs.writeFile(imagePath, buffer);

      // Extract text via OCR if requested
      let extractedText: string[] | undefined;
      let ocrConfidence: number | undefined;

      if (extractText) {
        const ocrResult = await this.extractText(buffer);
        extractedText = ocrResult.lines;
        ocrConfidence = ocrResult.confidence;
      }

      await page.close();

      // Auto-cleanup old screenshots
      await this.cleanupOldScreenshots();

      // Publish event
      bus.publish('cortex', 'vision:capture_complete', {
        path: imagePath,
        url,
        hasOCR: extractText,
        textCount: extractedText?.length || 0,
      });

      return {
        success: true,
        imagePath,
        imageBuffer: buffer,
        extractedText,
        metadata: {
          url,
          timestamp,
          viewport,
          format,
          ocrEnabled: extractText,
          ocrConfidence,
        },
      };
    } catch (error: any) {
      console.error('[ScreenCapture] Capture failed:', error.message);
      return {
        success: false,
        error: error.message,
        metadata: {
          url,
          timestamp,
          viewport,
          format,
          ocrEnabled: extractText,
        },
      };
    }
  }

  /**
   * Extract text from an image using Tesseract OCR
   */
  async extractText(imageSource: Buffer | string): Promise<OCRResult> {
    console.log('[ScreenCapture] Running OCR text extraction...');

    try {
      // Create worker if not exists
      if (!this.tesseractWorker) {
        this.tesseractWorker = await Tesseract.createWorker('eng');
      }

      const result = await this.tesseractWorker.recognize(imageSource);

      const words = result.data.words.map((w) => ({
        text: w.text,
        confidence: w.confidence,
        bbox: w.bbox,
      }));

      const lines = result.data.text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      console.log(
        `[ScreenCapture] OCR extracted ${lines.length} lines, confidence: ${result.data.confidence.toFixed(1)}%`
      );

      return {
        text: result.data.text,
        lines,
        confidence: result.data.confidence,
        words,
      };
    } catch (error: any) {
      console.error('[ScreenCapture] OCR failed:', error.message);
      return {
        text: '',
        lines: [],
        confidence: 0,
        words: [],
      };
    }
  }

  /**
   * Capture a screenshot and extract all visible text
   */
  async captureWithOCR(
    url: string,
    options: Omit<CaptureOptions, 'url' | 'extractText'> = {}
  ): Promise<CaptureResult> {
    return this.capture({
      ...options,
      url,
      extractText: true,
    });
  }

  /**
   * Compare two screenshots for visual differences
   */
  async compareScreenshots(
    image1: Buffer | string,
    image2: Buffer | string
  ): Promise<{
    identical: boolean;
    diffPercentage: number;
    diffRegions?: Array<{ x: number; y: number; width: number; height: number }>;
  }> {
    // Basic implementation - could be enhanced with pixelmatch
    // For now, compare OCR text as a proxy for visual diff
    const text1 = await this.extractText(image1);
    const text2 = await this.extractText(image2);

    const identical = text1.text === text2.text;
    const words1 = new Set(text1.lines);
    const words2 = new Set(text2.lines);

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    const similarity = union.size > 0 ? intersection.size / union.size : 1;
    const diffPercentage = Math.round((1 - similarity) * 100);

    return {
      identical,
      diffPercentage,
    };
  }

  /**
   * Clean up old screenshots to prevent disk bloat
   */
  private async cleanupOldScreenshots(): Promise<void> {
    try {
      const files = await fs.readdir(SCREENSHOTS_DIR);
      const screenshots = files
        .filter((f) => f.startsWith('capture-'))
        .map((f) => ({
          name: f,
          path: path.join(SCREENSHOTS_DIR, f),
          timestamp: parseInt(f.split('-')[1] || '0', 10),
        }))
        .sort((a, b) => b.timestamp - a.timestamp);

      if (screenshots.length > MAX_SCREENSHOTS) {
        const toDelete = screenshots.slice(MAX_SCREENSHOTS);
        for (const file of toDelete) {
          await fs.unlink(file.path);
        }
        console.log(`[ScreenCapture] Cleaned up ${toDelete.length} old screenshots`);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  /**
   * Shutdown the capture service and release resources
   */
  async shutdown(): Promise<void> {
    console.log('[ScreenCapture] Shutting down vision system...');

    if (this.tesseractWorker) {
      await this.tesseractWorker.terminate();
      this.tesseractWorker = null;
    }

    if (this.context) {
      await this.context.close();
      this.context = null;
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }

    this.initialized = false;
    console.log('[ScreenCapture] Vision system shutdown complete');
  }

  /**
   * Get service status
   */
  getStatus(): {
    initialized: boolean;
    browserActive: boolean;
    ocrReady: boolean;
  } {
    return {
      initialized: this.initialized,
      browserActive: this.browser !== null,
      ocrReady: this.tesseractWorker !== null,
    };
  }
}

// Singleton instance
export const screenCapture = new ScreenCaptureService();

// Export for direct use
export default screenCapture;
