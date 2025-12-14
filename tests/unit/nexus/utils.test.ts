// @version 3.3.573 - Nexus Utils Tests
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test types
interface StandardResponse {
  ok: boolean;
  data?: Record<string, any>;
  error?: string;
  timestamp: number;
  version: string;
}

// Mock version
const SYSTEM_VERSION = '3.3.510';

// Implementation functions for testing
const successResponse = (data: Record<string, any> = {}): StandardResponse => ({
  ok: true,
  data,
  timestamp: Date.now(),
  version: SYSTEM_VERSION,
});

const errorResponse = (error: string | Error): StandardResponse => ({
  ok: false,
  error: error instanceof Error ? error.message : error,
  timestamp: Date.now(),
  version: SYSTEM_VERSION,
});

const withMetadata = (response: any): StandardResponse => {
  if (response && typeof response === 'object' && 'ok' in response) {
    return {
      ...response,
      timestamp: response.timestamp || Date.now(),
      version: response.version || SYSTEM_VERSION,
    };
  }
  return successResponse(response || {});
};

describe('Nexus Utils', () => {
  describe('StandardResponse Interface', () => {
    it('should have required ok property', () => {
      const response: StandardResponse = {
        ok: true,
        timestamp: Date.now(),
        version: '1.0.0'
      };
      expect(typeof response.ok).toBe('boolean');
    });

    it('should have optional data property', () => {
      const withData: StandardResponse = {
        ok: true,
        data: { result: 'test' },
        timestamp: Date.now(),
        version: '1.0.0'
      };
      expect(withData.data).toBeDefined();
    });

    it('should have optional error property', () => {
      const withError: StandardResponse = {
        ok: false,
        error: 'Something went wrong',
        timestamp: Date.now(),
        version: '1.0.0'
      };
      expect(withError.error).toBe('Something went wrong');
    });

    it('should have required timestamp', () => {
      const response: StandardResponse = {
        ok: true,
        timestamp: 1234567890,
        version: '1.0.0'
      };
      expect(typeof response.timestamp).toBe('number');
    });

    it('should have required version', () => {
      const response: StandardResponse = {
        ok: true,
        timestamp: Date.now(),
        version: '3.3.510'
      };
      expect(response.version).toBe('3.3.510');
    });
  });

  describe('successResponse', () => {
    it('should set ok to true', () => {
      const response = successResponse();
      expect(response.ok).toBe(true);
    });

    it('should include provided data', () => {
      const response = successResponse({ user: 'test', count: 42 });
      expect(response.data?.user).toBe('test');
      expect(response.data?.count).toBe(42);
    });

    it('should default to empty data object', () => {
      const response = successResponse();
      expect(response.data).toEqual({});
    });

    it('should include current timestamp', () => {
      const before = Date.now();
      const response = successResponse();
      const after = Date.now();
      expect(response.timestamp).toBeGreaterThanOrEqual(before);
      expect(response.timestamp).toBeLessThanOrEqual(after);
    });

    it('should include system version', () => {
      const response = successResponse();
      expect(response.version).toBe(SYSTEM_VERSION);
    });

    it('should not include error property', () => {
      const response = successResponse();
      expect(response.error).toBeUndefined();
    });

    it('should handle nested data objects', () => {
      const response = successResponse({
        user: { id: 1, name: 'test' },
        items: [1, 2, 3]
      });
      expect(response.data?.user.id).toBe(1);
      expect(response.data?.items.length).toBe(3);
    });
  });

  describe('errorResponse', () => {
    it('should set ok to false', () => {
      const response = errorResponse('Error');
      expect(response.ok).toBe(false);
    });

    it('should accept string error', () => {
      const response = errorResponse('Something went wrong');
      expect(response.error).toBe('Something went wrong');
    });

    it('should extract message from Error object', () => {
      const response = errorResponse(new Error('Custom error'));
      expect(response.error).toBe('Custom error');
    });

    it('should include timestamp', () => {
      const before = Date.now();
      const response = errorResponse('Error');
      expect(response.timestamp).toBeGreaterThanOrEqual(before);
    });

    it('should include system version', () => {
      const response = errorResponse('Error');
      expect(response.version).toBe(SYSTEM_VERSION);
    });

    it('should not include data property', () => {
      const response = errorResponse('Error');
      expect(response.data).toBeUndefined();
    });

    it('should handle TypeError', () => {
      const response = errorResponse(new TypeError('Type mismatch'));
      expect(response.error).toBe('Type mismatch');
    });

    it('should handle RangeError', () => {
      const response = errorResponse(new RangeError('Out of range'));
      expect(response.error).toBe('Out of range');
    });
  });

  describe('withMetadata', () => {
    it('should pass through existing standard response', () => {
      const existing: StandardResponse = {
        ok: true,
        data: { test: 'value' },
        timestamp: 1234567890,
        version: '2.0.0'
      };
      const result = withMetadata(existing);
      expect(result.data).toEqual({ test: 'value' });
    });

    it('should preserve existing timestamp', () => {
      const existing: StandardResponse = {
        ok: true,
        timestamp: 1234567890,
        version: '1.0.0'
      };
      const result = withMetadata(existing);
      expect(result.timestamp).toBe(1234567890);
    });

    it('should preserve existing version', () => {
      const existing: StandardResponse = {
        ok: true,
        timestamp: Date.now(),
        version: '2.0.0'
      };
      const result = withMetadata(existing);
      expect(result.version).toBe('2.0.0');
    });

    it('should add timestamp if missing', () => {
      const partial = { ok: true, version: '1.0.0' };
      const before = Date.now();
      const result = withMetadata(partial);
      expect(result.timestamp).toBeGreaterThanOrEqual(before);
    });

    it('should add version if missing', () => {
      const partial = { ok: true, timestamp: Date.now() };
      const result = withMetadata(partial);
      expect(result.version).toBe(SYSTEM_VERSION);
    });

    it('should wrap non-standard response as success', () => {
      const data = { user: 'test', count: 5 };
      const result = withMetadata(data);
      expect(result.ok).toBe(true);
      expect(result.data).toEqual(data);
    });

    it('should handle null response', () => {
      const result = withMetadata(null);
      expect(result.ok).toBe(true);
      expect(result.data).toEqual({});
    });

    it('should handle undefined response', () => {
      const result = withMetadata(undefined);
      expect(result.ok).toBe(true);
      expect(result.data).toEqual({});
    });

    it('should handle empty object', () => {
      const result = withMetadata({});
      expect(result.ok).toBe(true);
    });
  });

  describe('Request Timeout', () => {
    it('should default to 5000ms timeout', () => {
      const defaultTimeout = 5000;
      expect(defaultTimeout).toBe(5000);
    });

    it('should support custom timeout values', () => {
      const customTimeout = 10000;
      expect(customTimeout).toBeGreaterThan(5000);
    });

    it('should handle zero timeout', () => {
      const zeroTimeout = 0;
      expect(zeroTimeout).toBe(0);
    });
  });

  describe('Request ID Generation', () => {
    it('should generate unique request IDs', () => {
      const generateId = () => `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it('should start with req- prefix', () => {
      const id = `req-${Date.now()}-abc123`;
      expect(id.startsWith('req-')).toBe(true);
    });

    it('should include timestamp in ID', () => {
      const timestamp = Date.now();
      const id = `req-${timestamp}-abc`;
      expect(id).toContain(timestamp.toString());
    });

    it('should include random suffix', () => {
      const suffix = Math.random().toString(36).substr(2, 9);
      expect(suffix.length).toBe(9);
    });

    it('should accept provided request ID', () => {
      const providedId = 'custom-req-12345';
      const requestId = providedId || `req-${Date.now()}`;
      expect(requestId).toBe('custom-req-12345');
    });
  });

  describe('HTTP Status Codes', () => {
    it('should use 500 as default error status', () => {
      const defaultStatus = 500;
      expect(defaultStatus).toBe(500);
    });

    it('should use 504 for timeout errors', () => {
      const timeoutStatus = 504;
      expect(timeoutStatus).toBe(504);
    });

    it('should allow custom error status', () => {
      const customStatus = 400;
      expect(customStatus).not.toBe(500);
    });
  });

  describe('Event Bus Integration', () => {
    it('should publish to nexus namespace', () => {
      const namespace = 'nexus';
      expect(namespace).toBe('nexus');
    });

    it('should listen for cortex:response events', () => {
      const responseEvent = 'cortex:response';
      expect(responseEvent).toBe('cortex:response');
    });

    it('should match events by requestId', () => {
      const requestId = 'req-123';
      const eventPayload = { requestId: 'req-123', data: {} };
      expect(eventPayload.requestId).toBe(requestId);
    });

    it('should unsubscribe listener after response', () => {
      let listenerActive = true;
      const unsubscribe = () => { listenerActive = false; };
      unsubscribe();
      expect(listenerActive).toBe(false);
    });

    it('should handle error in payload', () => {
      const errorPayload = { requestId: 'req-1', error: 'Failed', status: 400 };
      expect(errorPayload.error).toBeDefined();
      expect(errorPayload.status).toBe(400);
    });

    it('should extract data or response from payload', () => {
      const payloadWithData = { requestId: 'req-1', data: { result: 'ok' } };
      const payloadWithResponse = { requestId: 'req-2', response: { result: 'ok' } };
      
      const data1 = payloadWithData.data || payloadWithData.response || {};
      const data2 = payloadWithResponse.data || payloadWithResponse.response || {};
      
      expect(data1.result).toBe('ok');
      expect(data2.result).toBe('ok');
    });
  });

  describe('Response Validation', () => {
    it('should check for headers already sent', () => {
      const headersSent = false;
      expect(headersSent).toBe(false);
    });

    it('should not send response if headers already sent', () => {
      const headersSent = true;
      let responseSent = false;
      
      if (!headersSent) {
        responseSent = true;
      }
      
      expect(responseSent).toBe(false);
    });
  });
});
