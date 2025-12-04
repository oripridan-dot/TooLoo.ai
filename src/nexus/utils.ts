// @version 2.1.325
import { Response } from 'express';
import { bus, SynapsysEvent } from '../core/event-bus.js';
import { SYSTEM_VERSION } from '../core/system-info.js';

// Standard response format for all API endpoints
export interface StandardResponse {
  ok: boolean;
  data?: Record<string, any>;
  error?: string;
  timestamp: number;
  version: string;
}

/**
 * Wrap successful response with standard schema
 * {ok: true, data: payload, timestamp, version}
 */
export const successResponse = (data: Record<string, any> = {}): StandardResponse => ({
  ok: true,
  data,
  timestamp: Date.now(),
  version: SYSTEM_VERSION,
});

/**
 * Wrap error response with standard schema
 * {ok: false, error: message, timestamp, version}
 */
export const errorResponse = (error: string | Error): StandardResponse => ({
  ok: false,
  error: error instanceof Error ? error.message : error,
  timestamp: Date.now(),
  version: SYSTEM_VERSION,
});

/**
 * Add metadata to existing response object
 * Wraps response data if not already wrapped
 */
export const withMetadata = (response: any): StandardResponse => {
  if (response && typeof response === 'object' && 'ok' in response) {
    // Already has standard schema, just ensure metadata
    return {
      ...response,
      timestamp: response.timestamp || Date.now(),
      version: response.version || SYSTEM_VERSION,
    };
  }
  // Wrap new response data
  return successResponse(response || {});
};

export const request = (
  event: string,
  payload: Record<string, any>,
  res: Response,
  timeout = 5000
) => {
  const requestId =
    payload['requestId'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const listener = (evt: SynapsysEvent) => {
    if (evt.payload['requestId'] === requestId) {
      if (evt.payload.error) {
        res.status(evt.payload.status || 500).json(errorResponse(evt.payload.error));
      } else {
        const data = evt.payload.data || evt.payload.response || {};
        res.json(successResponse(data));
      }
      bus.off('cortex:response', listener);
    }
  };

  bus.on('cortex:response', listener);

  bus.publish('nexus', event, { ...payload, requestId });

  setTimeout(() => {
    bus.off('cortex:response', listener);
    if (!res.headersSent) {
      res.status(504).json(errorResponse('Request timed out'));
    }
  }, timeout);
};
