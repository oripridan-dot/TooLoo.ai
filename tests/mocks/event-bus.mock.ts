// @version 2.2.347
import { vi } from 'vitest';

export class MockEventBus {
  publish = vi.fn();
  on = vi.fn();
  emit = vi.fn();
  subscribe = vi.fn();
}
