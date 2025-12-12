/**
 * @tooloo/providers - Streaming Utilities
 * Streaming response handling with validation
 * 
 * @version 2.0.0-alpha.0
 */

import { eventBus } from '@tooloo/core';
import type { StreamChunk, UsageStats } from './types.js';

// =============================================================================
// STREAMING TYPES
// =============================================================================

/**
 * Chunk validator function
 */
export type ChunkValidator = (chunk: StreamChunk, accumulated: string) => ValidationResult;

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  shouldAbort?: boolean;
  reason?: string;
}

/**
 * Accumulated stream state
 */
export interface StreamState {
  chunks: StreamChunk[];
  content: string;
  toolCalls: Map<string, { name: string; arguments: string }>;
  usage?: UsageStats;
  startTime: number;
  firstChunkTime?: number;
  lastChunkTime: number;
  aborted: boolean;
  error?: string;
}

// =============================================================================
// STREAM ACCUMULATOR
// =============================================================================

/**
 * StreamAccumulator - Collects and manages streaming chunks
 */
export class StreamAccumulator {
  private state: StreamState;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): StreamState {
    return {
      chunks: [],
      content: '',
      toolCalls: new Map(),
      startTime: Date.now(),
      lastChunkTime: Date.now(),
      aborted: false,
    };
  }

  /**
   * Add a chunk to the accumulator
   */
  addChunk(chunk: StreamChunk): void {
    const now = Date.now();
    
    if (!this.state.firstChunkTime) {
      this.state.firstChunkTime = now;
    }
    this.state.lastChunkTime = now;
    this.state.chunks.push(chunk);

    switch (chunk.type) {
      case 'content':
        if (chunk.content) {
          this.state.content += chunk.content;
        }
        break;
        
      case 'tool_call':
        if (chunk.toolCall?.id) {
          const existing = this.state.toolCalls.get(chunk.toolCall.id);
          if (existing) {
            existing.arguments += chunk.toolCall.function?.arguments ?? '';
          } else {
            this.state.toolCalls.set(chunk.toolCall.id, {
              name: chunk.toolCall.function?.name ?? '',
              arguments: chunk.toolCall.function?.arguments ?? '',
            });
          }
        }
        break;
        
      case 'usage':
        if (chunk.usage) {
          this.state.usage = chunk.usage;
        }
        break;
        
      case 'error':
        this.state.error = chunk.error;
        break;
        
      case 'done':
        // Final chunk, no additional processing needed
        break;
    }
  }

  /**
   * Mark stream as aborted
   */
  abort(reason: string): void {
    this.state.aborted = true;
    this.state.error = reason;
  }

  /**
   * Get current state
   */
  getState(): StreamState {
    return { ...this.state };
  }

  /**
   * Get accumulated content
   */
  getContent(): string {
    return this.state.content;
  }

  /**
   * Get time to first chunk (TTFT) in ms
   */
  getTTFT(): number | undefined {
    if (this.state.firstChunkTime) {
      return this.state.firstChunkTime - this.state.startTime;
    }
    return undefined;
  }

  /**
   * Get total duration in ms
   */
  getDuration(): number {
    return this.state.lastChunkTime - this.state.startTime;
  }

  /**
   * Reset the accumulator
   */
  reset(): void {
    this.state = this.createInitialState();
  }
}

// =============================================================================
// STREAMING UTILITIES
// =============================================================================

/**
 * Transform a stream with validation
 */
export async function* streamWithValidation(
  source: AsyncGenerator<StreamChunk>,
  validator: ChunkValidator,
  requestId?: string
): AsyncGenerator<StreamChunk> {
  const accumulator = new StreamAccumulator();

  for await (const chunk of source) {
    accumulator.addChunk(chunk);
    
    const result = validator(chunk, accumulator.getContent());
    
    if (!result.valid) {
      console.warn(`Stream validation failed: ${result.reason}`);
      
      if (result.shouldAbort) {
        accumulator.abort(result.reason ?? 'Validation failed');
        
        if (requestId) {
          eventBus.publish('system', 'execution:error', {
            requestId,
            error: result.reason ?? 'Stream validation failed',
            recoverable: false,
          });
        }
        
        yield {
          id: chunk.id,
          type: 'error',
          error: result.reason,
        };
        return;
      }
    }
    
    if (requestId && chunk.type === 'content') {
      eventBus.publish('system', 'execution:chunk', {
        requestId,
        chunk: {
          id: chunk.id,
          type: 'text',
          content: chunk.content ?? '',
        },
      });
    }
    
    yield chunk;
  }
}

/**
 * Collect all chunks from a stream into a string
 */
export async function collectStream(
  source: AsyncGenerator<StreamChunk>
): Promise<{ content: string; usage?: UsageStats; error?: string }> {
  const accumulator = new StreamAccumulator();
  
  for await (const chunk of source) {
    accumulator.addChunk(chunk);
    
    if (chunk.type === 'error') {
      return { content: accumulator.getContent(), error: chunk.error };
    }
  }
  
  const state = accumulator.getState();
  return {
    content: state.content,
    usage: state.usage,
    error: state.error,
  };
}

/**
 * Transform stream chunks for SSE (Server-Sent Events)
 */
export async function* streamToSSE(
  source: AsyncGenerator<StreamChunk>
): AsyncGenerator<string> {
  for await (const chunk of source) {
    const data = JSON.stringify(chunk);
    yield `data: ${data}\n\n`;
    
    if (chunk.type === 'done' || chunk.type === 'error') {
      yield `data: [DONE]\n\n`;
      return;
    }
  }
}

/**
 * Create a simple text stream from an async generator
 */
export async function* textStream(
  source: AsyncGenerator<StreamChunk>
): AsyncGenerator<string> {
  for await (const chunk of source) {
    if (chunk.type === 'content' && chunk.content) {
      yield chunk.content;
    }
  }
}

// =============================================================================
// COMMON VALIDATORS
// =============================================================================

/**
 * Create a max length validator
 */
export function createMaxLengthValidator(maxLength: number): ChunkValidator {
  return (_chunk: StreamChunk, accumulated: string): ValidationResult => {
    if (accumulated.length > maxLength) {
      return {
        valid: false,
        shouldAbort: true,
        reason: `Content exceeded maximum length of ${maxLength} characters`,
      };
    }
    return { valid: true };
  };
}

/**
 * Create a content filter validator
 */
export function createContentFilterValidator(
  blockedPatterns: RegExp[]
): ChunkValidator {
  return (_chunk: StreamChunk, accumulated: string): ValidationResult => {
    for (const pattern of blockedPatterns) {
      if (pattern.test(accumulated)) {
        return {
          valid: false,
          shouldAbort: true,
          reason: `Content matched blocked pattern: ${pattern.source}`,
        };
      }
    }
    return { valid: true };
  };
}

/**
 * Create a JSON structure validator (for JSON mode)
 */
export function createJSONValidator(): ChunkValidator {
  let braceCount = 0;
  let bracketCount = 0;
  let inString = false;
  let lastChar = '';

  return (chunk: StreamChunk, _accumulated: string): ValidationResult => {
    if (chunk.type !== 'content' || !chunk.content) {
      return { valid: true };
    }

    for (const char of chunk.content) {
      if (char === '"' && lastChar !== '\\') {
        inString = !inString;
      }
      
      if (!inString) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        if (char === '[') bracketCount++;
        if (char === ']') bracketCount--;
      }
      
      lastChar = char;
    }

    // Check for obviously invalid JSON (negative counts)
    if (braceCount < 0 || bracketCount < 0) {
      return {
        valid: false,
        shouldAbort: false,  // Don't abort, just warn
        reason: 'Invalid JSON structure detected',
      };
    }

    return { valid: true };
  };
}

/**
 * Combine multiple validators
 */
export function combineValidators(...validators: ChunkValidator[]): ChunkValidator {
  return (chunk: StreamChunk, accumulated: string): ValidationResult => {
    for (const validator of validators) {
      const result = validator(chunk, accumulated);
      if (!result.valid) {
        return result;
      }
    }
    return { valid: true };
  };
}
