/**
 * Logging Configuration
 * 
 * Provides structured logging with:
 * - Multiple transports (console, file, external services)
 * - Log levels per environment
 * - Request/response logging
 * - Performance tracking
 */

import pino from 'pino';
import pinoPretty from 'pino-pretty';

const isDevelopment = process.env.NODE_ENV !== 'production';
const isTest = process.env.NODE_ENV === 'test';

/**
 * Base logger configuration
 */
const baseConfig = {
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    }
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      headers: {
        host: req.headers.host,
        userAgent: req.headers['user-agent']
      },
      remoteAddress: req.remoteAddress,
      remotePort: req.remotePort
    }),
    res: (res) => ({
      statusCode: res.statusCode,
      headers: res.getHeaders()
    }),
    err: pino.stdSerializers.err
  }
};

/**
 * Create logger based on environment
 */
export function createLogger(name = 'app') {
  if (isTest) {
    // Minimal logging in tests
    return pino({
      ...baseConfig,
      level: 'silent'
    });
  }

  if (isDevelopment) {
    // Pretty print in development
    return pino(
      {
        ...baseConfig,
        name
      },
      pinoPretty({
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
        singleLine: false
      })
    );
  }

  // JSON output in production
  return pino({
    ...baseConfig,
    name
  });
}

/**
 * Express middleware for request logging
 */
export function requestLogger(logger) {
  return (req, res, next) => {
    const startTime = Date.now();

    // Log request
    logger.info({
      req,
      event: 'request'
    }, `${req.method} ${req.url}`);

    // Capture response
    const originalSend = res.send;
    res.send = function (data) {
      res.send = originalSend;
      
      const duration = Date.now() - startTime;
      const level = res.statusCode >= 400 ? 'error' : 'info';

      logger[level]({
        res,
        duration,
        event: 'response'
      }, `${req.method} ${req.url} ${res.statusCode} ${duration}ms`);

      return res.send(data);
    };

    next();
  };
}

/**
 * Performance tracking decorator
 */
export function trackPerformance(logger, operationName) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args) {
      const startTime = Date.now();
      
      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;
        
        logger.debug({
          operation: operationName,
          method: propertyKey,
          duration,
          success: true
        }, `${operationName} completed in ${duration}ms`);
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        logger.error({
          operation: operationName,
          method: propertyKey,
          duration,
          success: false,
          error: error.message
        }, `${operationName} failed after ${duration}ms`);
        
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Child logger factory
 */
export function createChildLogger(parent, context) {
  return parent.child(context);
}

/**
 * Log aggregation helper
 */
export class LogAggregator {
  constructor(logger, flushInterval = 5000) {
    this.logger = logger;
    this.buffer = [];
    this.flushInterval = flushInterval;
    this.startFlushTimer();
  }

  add(entry) {
    this.buffer.push({
      ...entry,
      timestamp: new Date().toISOString()
    });

    if (this.buffer.length >= 100) {
      this.flush();
    }
  }

  flush() {
    if (this.buffer.length === 0) return;

    this.logger.info({
      aggregatedLogs: this.buffer,
      count: this.buffer.length
    }, 'Flushing aggregated logs');

    this.buffer = [];
  }

  startFlushTimer() {
    this.timer = setInterval(() => this.flush(), this.flushInterval);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.flush();
    }
  }
}

/**
 * Metrics logger
 */
export class MetricsLogger {
  constructor(logger) {
    this.logger = logger;
    this.metrics = new Map();
  }

  increment(metric, value = 1, tags = {}) {
    const key = this.getMetricKey(metric, tags);
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + value);
  }

  gauge(metric, value, tags = {}) {
    const key = this.getMetricKey(metric, tags);
    this.metrics.set(key, value);
  }

  timing(metric, duration, tags = {}) {
    this.logger.debug({
      metric,
      duration,
      tags,
      type: 'timing'
    }, `Timing: ${metric} = ${duration}ms`);
  }

  getMetricKey(metric, tags) {
    const tagString = Object.entries(tags)
      .map(([k, v]) => `${k}:${v}`)
      .join(',');
    return `${metric}${tagString ? `|${tagString}` : ''}`;
  }

  snapshot() {
    const snapshot = Object.fromEntries(this.metrics);
    this.logger.info({
      metrics: snapshot,
      timestamp: new Date().toISOString()
    }, 'Metrics snapshot');
    return snapshot;
  }

  reset() {
    this.metrics.clear();
  }
}

// Create default logger instance
export const logger = createLogger('tooloo-ai');

export default {
  createLogger,
  requestLogger,
  trackPerformance,
  createChildLogger,
  LogAggregator,
  MetricsLogger,
  logger
};
