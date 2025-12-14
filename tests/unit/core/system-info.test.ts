// @version 3.3.577
import { describe, it, expect } from 'vitest';
import { SYSTEM_VERSION, SYSTEM_NAME, SYSTEM_ID, getUptime } from '../../../src/core/system-info';

describe('SystemInfo', () => {
  it('should export system constants', () => {
    expect(SYSTEM_VERSION).toBeDefined();
    expect(SYSTEM_NAME).toBe('TooLoo.ai');
    expect(SYSTEM_ID).toBeDefined();
  });

  it('should return uptime', () => {
    const uptime = getUptime();
    expect(typeof uptime).toBe('number');
    expect(uptime).toBeGreaterThanOrEqual(0);
  });
});
