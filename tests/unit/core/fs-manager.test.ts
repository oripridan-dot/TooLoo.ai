// @version 3.3.573
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SmartFSManager } from '../../../src/core/fs-manager';
import fs from 'fs/promises';

vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    access: vi.fn(),
  }
}));

describe('SmartFSManager', () => {
  beforeEach(() => {
    // Reset singleton instance
    (SmartFSManager as any).instance = undefined;
    vi.clearAllMocks();
  });

  it('should be a singleton', () => {
    const instance1 = SmartFSManager.getInstance();
    const instance2 = SmartFSManager.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should ensure recovery directory on initialization', () => {
    SmartFSManager.getInstance();
    expect(fs.mkdir).toHaveBeenCalledWith(expect.stringContaining('.tooloo/recovery'), { recursive: true });
  });
});
