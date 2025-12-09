// @version 3.3.440
/**
 * Vision Routes - Real Screen Capture & OCR API
 *
 * Exposes the ScreenCaptureService via REST API endpoints.
 * Enables real screenshot capture and text extraction.
 *
 * @module nexus/routes/vision
 */

import { Router, Request, Response } from 'express';
import { screenCapture } from '../../cortex/vision/screen-capture-service.js';

const router = Router();

/**
 * GET /vision/status
 * Get vision service status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = screenCapture.getStatus();
    res.json({
      ok: true,
      status,
      capabilities: ['screenshot', 'ocr', 'visual-diff'],
    });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /vision/capture
 * Capture a screenshot of a URL
 *
 * Body:
 * - url: string (required) - URL to capture
 * - fullPage: boolean - Capture full scrollable page
 * - selector: string - CSS selector for specific element
 * - extractText: boolean - Run OCR on the captured image
 * - viewport: { width, height } - Browser viewport size
 */
router.post('/capture', async (req: Request, res: Response) => {
  try {
    const { url, fullPage = true, selector, extractText = false, viewport, waitMs } = req.body;

    if (!url) {
      return res.status(400).json({ ok: false, error: 'URL is required' });
    }

    console.log(`[Vision] Capturing screenshot: ${url}`);

    const result = await screenCapture.capture({
      url,
      fullPage,
      selector,
      extractText,
      viewport,
      waitMs,
    });

    if (result.success) {
      res.json({
        ok: true,
        imagePath: result.imagePath,
        extractedText: result.extractedText,
        metadata: result.metadata,
      });
    } else {
      res.status(500).json({
        ok: false,
        error: result.error,
      });
    }
  } catch (error: any) {
    console.error('[Vision] Capture error:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /vision/ocr
 * Extract text from an image file or URL
 *
 * Body:
 * - imagePath: string - Path to local image file
 * - imageUrl: string - URL of image to analyze
 * - base64: string - Base64-encoded image data
 */
router.post('/ocr', async (req: Request, res: Response) => {
  try {
    const { imagePath, imageUrl, base64 } = req.body;

    let imageSource: Buffer | string;

    if (base64) {
      imageSource = Buffer.from(base64, 'base64');
    } else if (imagePath) {
      imageSource = imagePath;
    } else if (imageUrl) {
      // Capture the URL first
      const captureResult = await screenCapture.capture({
        url: imageUrl,
        extractText: false,
      });
      if (!captureResult.success || !captureResult.imageBuffer) {
        throw new Error('Failed to capture URL for OCR');
      }
      imageSource = captureResult.imageBuffer;
    } else {
      return res.status(400).json({
        ok: false,
        error: 'Provide imagePath, imageUrl, or base64 image data',
      });
    }

    console.log('[Vision] Running OCR extraction...');
    const result = await screenCapture.extractText(imageSource);

    res.json({
      ok: true,
      text: result.text,
      lines: result.lines,
      confidence: result.confidence,
      wordCount: result.words.length,
    });
  } catch (error: any) {
    console.error('[Vision] OCR error:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /vision/capture-with-ocr
 * Capture screenshot and extract text in one call
 *
 * Body:
 * - url: string (required) - URL to capture and analyze
 * - fullPage: boolean - Capture full scrollable page
 */
router.post('/capture-with-ocr', async (req: Request, res: Response) => {
  try {
    const { url, fullPage = true, viewport } = req.body;

    if (!url) {
      return res.status(400).json({ ok: false, error: 'URL is required' });
    }

    console.log(`[Vision] Capturing with OCR: ${url}`);

    const result = await screenCapture.captureWithOCR(url, { fullPage, viewport });

    if (result.success) {
      res.json({
        ok: true,
        imagePath: result.imagePath,
        extractedText: result.extractedText,
        textLineCount: result.extractedText?.length || 0,
        confidence: result.metadata.ocrConfidence,
        metadata: result.metadata,
      });
    } else {
      res.status(500).json({
        ok: false,
        error: result.error,
      });
    }
  } catch (error: any) {
    console.error('[Vision] Capture with OCR error:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /vision/compare
 * Compare two screenshots for visual differences
 *
 * Body:
 * - image1: string - Path or URL to first image
 * - image2: string - Path or URL to second image
 */
router.post('/compare', async (req: Request, res: Response) => {
  try {
    const { image1, image2 } = req.body;

    if (!image1 || !image2) {
      return res.status(400).json({
        ok: false,
        error: 'Both image1 and image2 are required',
      });
    }

    console.log('[Vision] Comparing screenshots...');
    const result = await screenCapture.compareScreenshots(image1, image2);

    res.json({
      ok: true,
      identical: result.identical,
      diffPercentage: result.diffPercentage,
      diffRegions: result.diffRegions,
    });
  } catch (error: any) {
    console.error('[Vision] Compare error:', error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;
