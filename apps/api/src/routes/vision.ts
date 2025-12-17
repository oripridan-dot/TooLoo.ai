/**
 * @tooloo/api - Vision Routes
 * Multi-modal image processing endpoints
 *
 * Supports:
 * - Anthropic Claude (claude-sonnet-4, claude-3.5-sonnet)
 * - OpenAI GPT-4V (gpt-4o, gpt-4o-mini)
 * - Google Gemini (gemini-2.0-flash, gemini-1.5-pro)
 *
 * @version 1.0.0
 * @skill-os true
 */

import { Router, type Request, type Response } from 'express';
import type { Server as SocketIOServer } from 'socket.io';
import type { Orchestrator } from '@tooloo/engine';
import type { APIResponse } from '../types.js';

// =============================================================================
// TYPES
// =============================================================================

interface VisionRouterDeps {
  io: SocketIOServer;
  orchestrator?: Orchestrator;
}

/**
 * Vision request payload
 */
interface VisionRequest {
  /** Image as base64 data URL or public URL */
  image: string;
  /** Prompt/question about the image */
  prompt: string;
  /** Optional: Specific provider to use */
  provider?: 'anthropic' | 'openai' | 'gemini';
  /** Optional: Specific model to use */
  model?: string;
  /** Optional: Max tokens for response */
  maxTokens?: number;
  /** Optional: Session ID for conversation continuity */
  sessionId?: string;
}

/**
 * Vision response
 */
interface VisionResponse {
  content: string;
  provider: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
}

/**
 * Image content block for multi-modal APIs
 */
interface ImageContentBlock {
  type: 'image';
  source: {
    type: 'base64' | 'url';
    mediaType?: string;
    data?: string;
    url?: string;
  };
}

interface TextContentBlock {
  type: 'text';
  text: string;
}

type ContentBlock = ImageContentBlock | TextContentBlock;

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Parse image input and extract media type and data
 */
function parseImageInput(image: string): {
  isUrl: boolean;
  mediaType: string;
  data: string;
  url?: string;
} {
  // Check if it's a data URL (base64)
  if (image.startsWith('data:')) {
    const match = image.match(/^data:([^;]+);base64,(.+)$/);
    if (match && match[1] && match[2]) {
      return {
        isUrl: false,
        mediaType: match[1],
        data: match[2],
      };
    }
    throw new Error('Invalid data URL format');
  }

  // Check if it's a regular URL
  if (image.startsWith('http://') || image.startsWith('https://')) {
    // Infer media type from URL extension
    const ext = image.split('.').pop()?.toLowerCase() || '';
    const mediaTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };
    return {
      isUrl: true,
      mediaType: mediaTypes[ext] || 'image/jpeg',
      data: '',
      url: image,
    };
  }

  // Assume raw base64 (defaulting to JPEG)
  return {
    isUrl: false,
    mediaType: 'image/jpeg',
    data: image,
  };
}

/**
 * Call Anthropic Claude Vision API
 */
async function callAnthropicVision(
  image: string,
  prompt: string,
  model: string = 'claude-sonnet-4-20250514',
  maxTokens: number = 1024
): Promise<VisionResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const startTime = Date.now();
  const parsed = parseImageInput(image);

  // Build content blocks
  const content: ContentBlock[] = [
    {
      type: 'image',
      source: parsed.isUrl
        ? { type: 'url' as const, url: parsed.url }
        : { type: 'base64' as const, mediaType: parsed.mediaType, data: parsed.data },
    },
    { type: 'text', text: prompt },
  ];

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as {
    id: string;
    content: Array<{ type: string; text?: string }>;
    model: string;
    usage: { input_tokens: number; output_tokens: number };
  };

  return {
    content: data.content.find((c) => c.type === 'text')?.text || '',
    provider: 'anthropic',
    model: data.model,
    usage: {
      promptTokens: data.usage.input_tokens,
      completionTokens: data.usage.output_tokens,
      totalTokens: data.usage.input_tokens + data.usage.output_tokens,
    },
    latencyMs: Date.now() - startTime,
  };
}

/**
 * Call OpenAI GPT-4 Vision API
 */
async function callOpenAIVision(
  image: string,
  prompt: string,
  model: string = 'gpt-4o',
  maxTokens: number = 1024
): Promise<VisionResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const startTime = Date.now();
  const parsed = parseImageInput(image);

  // OpenAI uses a different format
  const imageContent = parsed.isUrl
    ? { type: 'image_url' as const, image_url: { url: parsed.url! } }
    : {
        type: 'image_url' as const,
        image_url: { url: `data:${parsed.mediaType};base64,${parsed.data}` },
      };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: prompt }, imageContent],
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as {
    id: string;
    choices: Array<{ message: { content: string } }>;
    model: string;
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  };

  return {
    content: data.choices[0]?.message.content || '',
    provider: 'openai',
    model: data.model,
    usage: {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    },
    latencyMs: Date.now() - startTime,
  };
}

/**
 * Call Google Gemini Vision API
 */
async function callGeminiVision(
  image: string,
  prompt: string,
  model: string = 'gemini-2.0-flash',
  maxTokens: number = 1024
): Promise<VisionResponse> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_API_KEY not configured');

  const startTime = Date.now();
  const parsed = parseImageInput(image);

  // Gemini format
  const parts = [
    { text: prompt },
    {
      inline_data: {
        mime_type: parsed.mediaType,
        data: parsed.isUrl ? await fetchImageAsBase64(parsed.url!) : parsed.data,
      },
    },
  ];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    usageMetadata?: {
      promptTokenCount: number;
      candidatesTokenCount: number;
      totalTokenCount: number;
    };
  };

  return {
    content: data.candidates[0]?.content.parts[0]?.text || '',
    provider: 'gemini',
    model,
    usage: {
      promptTokens: data.usageMetadata?.promptTokenCount || 0,
      completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: data.usageMetadata?.totalTokenCount || 0,
    },
    latencyMs: Date.now() - startTime,
  };
}

/**
 * Fetch image from URL and convert to base64
 */
async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

/**
 * Select best available vision provider
 */
function selectProvider(): 'anthropic' | 'openai' | 'gemini' {
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.GOOGLE_API_KEY) return 'gemini';
  throw new Error('No vision-capable provider configured');
}

// =============================================================================
// ROUTER
// =============================================================================

export function createVisionRouter(deps: VisionRouterDeps): Router {
  const router = Router();

  /**
   * GET /vision/providers
   * List available vision-capable providers
   */
  router.get('/providers', (_req: Request, res: Response) => {
    const providers = [];

    if (process.env.ANTHROPIC_API_KEY) {
      providers.push({
        id: 'anthropic',
        name: 'Anthropic Claude',
        models: [
          'claude-sonnet-4-20250514',
          'claude-3-5-sonnet-20241022',
          'claude-3-opus-20240229',
        ],
        default: 'claude-sonnet-4-20250514',
      });
    }

    if (process.env.OPENAI_API_KEY) {
      providers.push({
        id: 'openai',
        name: 'OpenAI GPT-4V',
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
        default: 'gpt-4o',
      });
    }

    if (process.env.GOOGLE_API_KEY) {
      providers.push({
        id: 'gemini',
        name: 'Google Gemini',
        models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
        default: 'gemini-2.0-flash',
      });
    }

    const response: APIResponse = {
      ok: true,
      data: {
        providers,
        defaultProvider: providers[0]?.id || null,
      },
    };

    res.json(response);
  });

  /**
   * POST /vision/analyze
   * Analyze an image with a vision model
   */
  router.post('/analyze', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const body = req.body as VisionRequest;

    // Validate request
    if (!body.image) {
      const response: APIResponse = {
        ok: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Image is required (base64 data URL or public URL)',
        },
      };
      res.status(400).json(response);
      return;
    }

    if (!body.prompt) {
      const response: APIResponse = {
        ok: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Prompt is required',
        },
      };
      res.status(400).json(response);
      return;
    }

    try {
      const provider = body.provider || selectProvider();
      let result: VisionResponse;

      switch (provider) {
        case 'anthropic':
          result = await callAnthropicVision(
            body.image,
            body.prompt,
            body.model || 'claude-sonnet-4-20250514',
            body.maxTokens || 1024
          );
          break;

        case 'openai':
          result = await callOpenAIVision(
            body.image,
            body.prompt,
            body.model || 'gpt-4o',
            body.maxTokens || 1024
          );
          break;

        case 'gemini':
          result = await callGeminiVision(
            body.image,
            body.prompt,
            body.model || 'gemini-2.0-flash',
            body.maxTokens || 1024
          );
          break;

        default:
          throw new Error(`Unknown provider: ${provider}`);
      }

      // Emit via WebSocket for real-time updates
      deps.io.emit('vision:complete', {
        sessionId: body.sessionId,
        result,
      });

      const response: APIResponse<VisionResponse> = {
        ok: true,
        data: result,
        meta: {
          requestId: (req as any).requestId,
          timestamp: new Date().toISOString(),
          latencyMs: Date.now() - startTime,
        },
      };

      res.json(response);
    } catch (error) {
      console.error('[Vision] Error:', error);

      const response: APIResponse = {
        ok: false,
        error: {
          code: 'VISION_ERROR',
          message: error instanceof Error ? error.message : 'Vision processing failed',
        },
      };

      res.status(500).json(response);
    }
  });

  /**
   * POST /vision/describe
   * Quick image description (uses fastest available model)
   */
  router.post('/describe', async (req: Request, res: Response) => {
    const body = req.body as { image: string };

    if (!body.image) {
      res.status(400).json({
        ok: false,
        error: { code: 'INVALID_REQUEST', message: 'Image is required' },
      });
      return;
    }

    try {
      // Use Gemini Flash for speed, fallback to others
      let result: VisionResponse;
      const prompt =
        'Describe this image in detail. Include objects, text, colors, and any notable features.';

      if (process.env.GOOGLE_API_KEY) {
        result = await callGeminiVision(body.image, prompt, 'gemini-2.0-flash', 512);
      } else if (process.env.OPENAI_API_KEY) {
        result = await callOpenAIVision(body.image, prompt, 'gpt-4o-mini', 512);
      } else if (process.env.ANTHROPIC_API_KEY) {
        result = await callAnthropicVision(body.image, prompt, 'claude-3-5-sonnet-20241022', 512);
      } else {
        throw new Error('No vision provider available');
      }

      res.json({ ok: true, data: result });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: {
          code: 'VISION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to describe image',
        },
      });
    }
  });

  /**
   * POST /vision/ocr
   * Extract text from image
   */
  router.post('/ocr', async (req: Request, res: Response) => {
    const body = req.body as { image: string };

    if (!body.image) {
      res.status(400).json({
        ok: false,
        error: { code: 'INVALID_REQUEST', message: 'Image is required' },
      });
      return;
    }

    try {
      const prompt =
        'Extract ALL text visible in this image. Output ONLY the extracted text, preserving formatting where possible. If there is no text, respond with "[No text detected]".';
      const provider = selectProvider();
      let result: VisionResponse;

      switch (provider) {
        case 'anthropic':
          result = await callAnthropicVision(body.image, prompt);
          break;
        case 'openai':
          result = await callOpenAIVision(body.image, prompt);
          break;
        case 'gemini':
          result = await callGeminiVision(body.image, prompt);
          break;
      }

      res.json({
        ok: true,
        data: {
          text: result.content,
          provider: result.provider,
          model: result.model,
          latencyMs: result.latencyMs,
        },
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: {
          code: 'OCR_ERROR',
          message: error instanceof Error ? error.message : 'OCR failed',
        },
      });
    }
  });

  return router;
}
