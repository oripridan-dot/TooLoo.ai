import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Readable } from 'stream';
import fetch from 'node-fetch';

// Mock node-fetch
vi.mock('node-fetch', () => {
  return {
    default: vi.fn(),
  };
});

// Mock env
vi.mock('../../src/nexus/engine/env-loader.js', () => ({
  default: () => {},
}));

// Import LLMProvider AFTER mocking
import LLMProvider from '../../src/precog/providers/llm-provider.js';

process.env.OPENAI_API_KEY = 'test-key';
process.env.ANTHROPIC_API_KEY = 'test-key';
process.env.GEMINI_API_KEY = 'test-key';

describe('LLMProvider Streaming', () => {
  let provider: LLMProvider;
  const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    provider = new LLMProvider();
    fetchMock.mockReset();
  });

  it('should stream OpenAI responses correctly', async () => {
    const stream = new Readable({
      read() {
        this.push(Buffer.from('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n'));
        this.push(Buffer.from('data: {"choices":[{"delta":{"content":" World"}}]}\n\n'));
        this.push(Buffer.from('data: [DONE]\n\n'));
        this.push(null);
      },
    });

    fetchMock.mockResolvedValue({
      ok: true,
      body: stream,
    });

    const chunks: string[] = [];
    await provider.streamOpenAI('test', '', [], (chunk) => chunks.push(chunk));

    expect(chunks).toEqual(['Hello', ' World']);
  });

  it('should stream Claude responses correctly', async () => {
    const stream = new Readable({
      read() {
        this.push(Buffer.from('event: message_start\ndata: ...\n\n'));
        this.push(
          Buffer.from(
            'event: content_block_delta\ndata: {"type": "content_block_delta", "delta": {"type": "text_delta", "text": "Hello"}}\n\n'
          )
        );
        this.push(
          Buffer.from(
            'event: content_block_delta\ndata: {"type": "content_block_delta", "delta": {"type": "text_delta", "text": " Claude"}}\n\n'
          )
        );
        this.push(null);
      },
    });

    fetchMock.mockResolvedValue({
      ok: true,
      body: stream,
    });

    const chunks: string[] = [];
    await provider.streamClaude('test', '', [], (chunk) => chunks.push(chunk));

    expect(chunks).toEqual(['Hello', ' Claude']);
  });

  it('should stream Gemini responses correctly', async () => {
    const stream = new Readable({
      read() {
        // Simulate Gemini array format
        this.push(Buffer.from('['));
        this.push(
          Buffer.from('{\n"candidates": [{"content": {"parts": [{"text": "Hello"}]}}]\n},')
        );
        this.push(
          Buffer.from('{\n"candidates": [{"content": {"parts": [{"text": " Gemini"}]}}]\n}')
        );
        this.push(Buffer.from(']'));
        this.push(null);
      },
    });

    fetchMock.mockResolvedValue({
      ok: true,
      body: stream,
    });

    const chunks: string[] = [];
    await provider.streamGemini('test', '', [], 'pro', (chunk) => chunks.push(chunk));

    expect(chunks).toEqual(['Hello', ' Gemini']);
  });

  it('should handle split chunks in Gemini stream', async () => {
    const stream = new Readable({
      read() {
        const chunk1 = '[{\n"candidates": [{"content": {"parts": [{"text": "He';
        const chunk2 = 'llo"}]}}]\n}]';
        // console.log("Pushing chunk 1:", chunk1);
        this.push(Buffer.from(chunk1));
        // console.log("Pushing chunk 2:", chunk2);
        this.push(Buffer.from(chunk2));
        this.push(null);
      },
    });

    fetchMock.mockResolvedValue({
      ok: true,
      body: stream,
    });

    const chunks: string[] = [];
    await provider.streamGemini('test', '', [], 'pro', (chunk) => chunks.push(chunk));

    expect(chunks).toEqual(['Hello']);
  });
});
