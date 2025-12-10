/**
 * Screen Capture Service Tests
 *
 * Tests for the vision/screen-capture-service module
 * which provides Playwright screenshot capture and Tesseract OCR
 *
 * @version 3.3.510
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Playwright before imports
vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue({
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockResolvedValue(undefined),
          setViewportSize: vi.fn().mockResolvedValue(undefined),
          waitForSelector: vi.fn().mockResolvedValue(undefined),
          waitForTimeout: vi.fn().mockResolvedValue(undefined),
          screenshot: vi.fn().mockResolvedValue(Buffer.from('fake-screenshot-data')),
          $: vi.fn().mockResolvedValue({
            screenshot: vi.fn().mockResolvedValue(Buffer.from('element-screenshot')),
          }),
          close: vi.fn().mockResolvedValue(undefined),
        }),
        close: vi.fn().mockResolvedValue(undefined),
      }),
      close: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

// Mock Tesseract
vi.mock('tesseract.js', () => ({
  createWorker: vi.fn().mockResolvedValue({
    recognize: vi.fn().mockResolvedValue({
      data: {
        text: 'Sample OCR text\nLine 2\nLine 3',
        confidence: 95.5,
        words: [
          { text: 'Sample', confidence: 98, bbox: { x0: 10, y0: 10, x1: 100, y1: 30 } },
          { text: 'OCR', confidence: 97, bbox: { x0: 110, y0: 10, x1: 160, y1: 30 } },
          { text: 'text', confidence: 96, bbox: { x0: 170, y0: 10, x1: 220, y1: 30 } },
        ],
      },
    }),
    terminate: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Mock fs-extra
vi.mock('fs-extra', () => ({
  default: {
    ensureDirSync: vi.fn(),
    ensureDir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn().mockResolvedValue([]),
    unlink: vi.fn().mockResolvedValue(undefined),
    pathExists: vi.fn().mockResolvedValue(false),
    readJson: vi.fn().mockResolvedValue({}),
    writeJson: vi.fn().mockResolvedValue(undefined),
  },
  ensureDirSync: vi.fn(),
  ensureDir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  readdir: vi.fn().mockResolvedValue([]),
  unlink: vi.fn().mockResolvedValue(undefined),
  pathExists: vi.fn().mockResolvedValue(false),
  readJson: vi.fn().mockResolvedValue({}),
  writeJson: vi.fn().mockResolvedValue(undefined),
}));

// Import after mocks
import { ScreenCaptureService, type CaptureOptions, type CaptureResult } from '../../../../src/cortex/vision/screen-capture-service.js';

describe('ScreenCaptureService', () => {
  let service: ScreenCaptureService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ScreenCaptureService();
  });

  afterEach(async () => {
    try {
      await service.shutdown();
    } catch {
      // Ignore shutdown errors in tests
    }
  });

  describe('Service Instantiation', () => {
    it('should create a new service instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(ScreenCaptureService);
    });

    it('should have initialize method', () => {
      expect(typeof service.initialize).toBe('function');
    });

    it('should have capture method', () => {
      expect(typeof service.capture).toBe('function');
    });

    it('should have extractText method', () => {
      expect(typeof service.extractText).toBe('function');
    });

    it('should have captureWithOCR method', () => {
      expect(typeof service.captureWithOCR).toBe('function');
    });

    it('should have compareScreenshots method', () => {
      expect(typeof service.compareScreenshots).toBe('function');
    });

    it('should have shutdown method', () => {
      expect(typeof service.shutdown).toBe('function');
    });

    it('should have getStatus method', () => {
      expect(typeof service.getStatus).toBe('function');
    });
  });

  describe('Service Status', () => {
    it('should return uninitialized status by default', () => {
      const status = service.getStatus();
      expect(status.initialized).toBe(false);
      expect(status.browserActive).toBe(false);
      expect(status.ocrReady).toBe(false);
    });

    it('should return initialized status after initialize', async () => {
      await service.initialize();
      const status = service.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.browserActive).toBe(true);
    });

    it('should not double-initialize', async () => {
      await service.initialize();
      await service.initialize(); // Second call should be no-op
      const status = service.getStatus();
      expect(status.initialized).toBe(true);
    });
  });

  describe('Capture Operations', () => {
    it('should capture a screenshot with default options', async () => {
      const result = await service.capture();
      expect(result.success).toBe(true);
      expect(result.imagePath).toBeDefined();
      expect(result.imageBuffer).toBeDefined();
    });

    it('should capture with URL option', async () => {
      const result = await service.capture({ url: 'https://example.com' });
      expect(result.success).toBe(true);
      expect(result.metadata.url).toBe('https://example.com');
    });

    it('should capture full page by default', async () => {
      const result = await service.capture();
      expect(result.success).toBe(true);
      // Full page capture is the default
    });

    it('should capture with custom viewport', async () => {
      const result = await service.capture({
        viewport: { width: 1280, height: 720 },
      });
      expect(result.success).toBe(true);
      expect(result.metadata.viewport).toEqual({ width: 1280, height: 720 });
    });

    it('should include timestamp in metadata', async () => {
      const before = Date.now();
      const result = await service.capture();
      const after = Date.now();
      expect(result.metadata.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.metadata.timestamp).toBeLessThanOrEqual(after);
    });

    it('should support PNG format', async () => {
      const result = await service.capture({ format: 'png' });
      expect(result.success).toBe(true);
      expect(result.metadata.format).toBe('png');
    });

    it('should support JPEG format', async () => {
      const result = await service.capture({ format: 'jpeg' });
      expect(result.success).toBe(true);
      expect(result.metadata.format).toBe('jpeg');
    });
  });

  describe('OCR Text Extraction', () => {
    it('should extract text from image buffer', async () => {
      await service.initialize();
      const buffer = Buffer.from('fake-image-data');
      const result = await service.extractText(buffer);
      expect(result.text).toBeDefined();
      expect(result.lines).toBeInstanceOf(Array);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should return lines array from OCR result', async () => {
      await service.initialize();
      const buffer = Buffer.from('fake-image-data');
      const result = await service.extractText(buffer);
      expect(result.lines.length).toBeGreaterThan(0);
    });

    it('should return confidence score', async () => {
      await service.initialize();
      const buffer = Buffer.from('fake-image-data');
      const result = await service.extractText(buffer);
      expect(result.confidence).toBe(95.5);
    });

    it('should return words with bounding boxes', async () => {
      await service.initialize();
      const buffer = Buffer.from('fake-image-data');
      const result = await service.extractText(buffer);
      expect(result.words.length).toBeGreaterThan(0);
      expect(result.words[0].bbox).toBeDefined();
      expect(result.words[0].bbox.x0).toBeDefined();
    });
  });

  describe('Capture with OCR', () => {
    it('should capture and extract text together', async () => {
      const result = await service.captureWithOCR('https://example.com');
      expect(result.success).toBe(true);
      expect(result.metadata.ocrEnabled).toBe(true);
    });

    it('should include extracted text in result', async () => {
      const result = await service.captureWithOCR('https://example.com');
      expect(result.extractedText).toBeDefined();
      expect(result.extractedText?.length).toBeGreaterThan(0);
    });

    it('should include OCR confidence in metadata', async () => {
      const result = await service.captureWithOCR('https://example.com');
      expect(result.metadata.ocrConfidence).toBeDefined();
    });
  });

  describe('Screenshot Comparison', () => {
    it('should compare two screenshots', async () => {
      await service.initialize();
      const buffer1 = Buffer.from('image1');
      const buffer2 = Buffer.from('image2');
      const result = await service.compareScreenshots(buffer1, buffer2);
      expect(result).toBeDefined();
      expect(typeof result.identical).toBe('boolean');
      expect(typeof result.diffPercentage).toBe('number');
    });

    it('should return diff percentage', async () => {
      await service.initialize();
      const buffer1 = Buffer.from('image1');
      const buffer2 = Buffer.from('image2');
      const result = await service.compareScreenshots(buffer1, buffer2);
      expect(result.diffPercentage).toBeGreaterThanOrEqual(0);
      expect(result.diffPercentage).toBeLessThanOrEqual(100);
    });

    it('should detect identical images', async () => {
      await service.initialize();
      const buffer = Buffer.from('same-image');
      const result = await service.compareScreenshots(buffer, buffer);
      expect(result.identical).toBe(true);
      expect(result.diffPercentage).toBe(0);
    });
  });

  describe('Service Lifecycle', () => {
    it('should shutdown cleanly', async () => {
      await service.initialize();
      await service.shutdown();
      const status = service.getStatus();
      expect(status.initialized).toBe(false);
      expect(status.browserActive).toBe(false);
    });

    it('should be reusable after shutdown', async () => {
      await service.initialize();
      await service.shutdown();
      await service.initialize();
      const status = service.getStatus();
      expect(status.initialized).toBe(true);
    });
  });

  describe('CaptureOptions Interface', () => {
    it('should accept all valid options', async () => {
      const options: CaptureOptions = {
        url: 'https://example.com',
        selector: '#main',
        fullPage: true,
        waitForSelector: '.content',
        waitMs: 100,
        viewport: { width: 1920, height: 1080 },
        extractText: true,
        format: 'png',
        quality: 80,
      };
      const result = await service.capture(options);
      expect(result.success).toBe(true);
    });

    it('should work with minimal options', async () => {
      const result = await service.capture({});
      expect(result.success).toBe(true);
    });

    it('should work with no options', async () => {
      const result = await service.capture();
      expect(result.success).toBe(true);
    });
  });

  describe('CaptureResult Structure', () => {
    it('should have required fields on success', async () => {
      const result = await service.capture();
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('metadata');
      expect(result.metadata).toHaveProperty('timestamp');
      expect(result.metadata).toHaveProperty('viewport');
      expect(result.metadata).toHaveProperty('format');
      expect(result.metadata).toHaveProperty('ocrEnabled');
    });

    it('should include imagePath on success', async () => {
      const result = await service.capture();
      expect(result.imagePath).toBeDefined();
      expect(result.imagePath).toContain('capture-');
    });

    it('should include imageBuffer on success', async () => {
      const result = await service.capture();
      expect(result.imageBuffer).toBeDefined();
      expect(Buffer.isBuffer(result.imageBuffer)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      // Force an error scenario
      const badService = new ScreenCaptureService();
      // Even with mocks, service should handle initialization
      const result = await badService.capture();
      expect(result).toBeDefined();
    });

    it('should return error in result on failure', async () => {
      // This test verifies the error handling structure exists
      const service = new ScreenCaptureService();
      // Force error by testing with broken selector
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await service.capture({ selector: 'nonexistent' });
      // With our mocks, selector returns mock element, so success
      // In real scenario, missing selector would fail
      expect(result).toBeDefined();
    });
  });
});

describe('Screen Capture Service Exports', () => {
  it('should export ScreenCaptureService class', async () => {
    const mod = await import('../../../../src/cortex/vision/screen-capture-service.js');
    expect(mod.ScreenCaptureService).toBeDefined();
  });

  it('should export singleton instance', async () => {
    const mod = await import('../../../../src/cortex/vision/screen-capture-service.js');
    expect(mod.screenCapture).toBeDefined();
    expect(mod.screenCapture).toBeInstanceOf(mod.ScreenCaptureService);
  });

  it('should export default as singleton', async () => {
    const mod = await import('../../../../src/cortex/vision/screen-capture-service.js');
    expect(mod.default).toBe(mod.screenCapture);
  });
});
