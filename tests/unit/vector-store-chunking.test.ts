// @version 2.1.288
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VectorStore } from '../../src/cortex/memory/vector-store.js';
import { precog } from '../../src/precog/index.js';

// Mock the precog module
vi.mock('../../src/precog/index.js', () => ({
  precog: {
    providers: {
      getProvider: vi.fn()
    }
  }
}));

// Mock fs/promises to avoid writing to disk
vi.mock('fs/promises', () => ({
  writeFile: vi.fn(),
  readFile: vi.fn().mockResolvedValue('[]'),
  mkdir: vi.fn().mockResolvedValue(undefined),
  access: vi.fn().mockResolvedValue(undefined)
}));

describe('VectorStore Chunking', () => {
  let vectorStore: VectorStore;
  const mockEmbed = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock provider
    (precog.providers.getProvider as any).mockReturnValue({
      embed: mockEmbed
    });

    vectorStore = new VectorStore('/tmp/test-workspace');
    // Manually initialize to avoid reading from disk in constructor if it does that (it doesn't, but initialize() does)
    // We won't call initialize() to avoid loading from disk, we just want to test add()
    // But add() pushes to this.documents, which is initialized to []
  });

  it('should chunk large text into multiple documents', async () => {
    // Create a text larger than the 8000 char limit
    // 8000 + 2000 = 10000
    const largeText = 'a'.repeat(10000);
    
    mockEmbed.mockResolvedValue([0.1, 0.2, 0.3]); // Mock embedding vector

    await vectorStore.add(largeText, { source: 'test' });

    // Should have called embed twice (8000 + 2000)
    expect(mockEmbed).toHaveBeenCalledTimes(2);
    
    // Verify the chunks passed to embed
    expect(mockEmbed).toHaveBeenNthCalledWith(1, 'a'.repeat(8000));
    expect(mockEmbed).toHaveBeenNthCalledWith(2, 'a'.repeat(2000));
  });

  it('should handle text smaller than chunk size', async () => {
    const smallText = 'hello world';
    mockEmbed.mockResolvedValue([0.1]);

    await vectorStore.add(smallText, { source: 'test' });

    expect(mockEmbed).toHaveBeenCalledTimes(1);
    expect(mockEmbed).toHaveBeenCalledWith(smallText);
  });
});
