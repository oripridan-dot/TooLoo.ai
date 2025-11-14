/**
 * ServiceFoundation - Unified service initialization & middleware
 * 
 * Eliminates boilerplate across all services by providing:
 * - Standardized CORS configuration
 * - Unified error handling with consistent response format
 * - Built-in request metrics and logging
 * - Health endpoint with uptime/metrics
 * - Graceful shutdown support
 * 
 * Usage:
 * ```javascript
 * import { ServiceFoundation } from './service-foundation.js';
 * 
 * const svc = new ServiceFoundation('training-server', 3001);
 * svc.setupMiddleware();
 * svc.registerHealthEndpoint();
 * 
 * svc.app.post('/api/v1/training/start', async (req, res) => {
 *   try {
 *     const result = await trainingCamp.start();
 *     res.json({ ok: true, result });
 *   } catch (err) {
 *     svc.handleError(res, err);
 *   }
 * });
 * 
 * await svc.start();
 * ```
 */

import express from 'express';
import cors from 'cors';

export class ServiceFoundation {
  constructor(serviceName, port = null, options = {}) {
    this.serviceName = serviceName;
    this.port = port || Number(process.env.PORT || process.env[`${serviceName.toUpperCase()}_PORT`] || 3000);
    this.env = options.env || 'development';
    
    this.app = express();
    this.server = null;
    
    // Metrics
    this.metrics = {
      requests: 0,
      errors: 0,
      successfulRequests: 0,
      totalLatency: 0,
      startTime: Date.now(),
      errors_by_code: {},
      endpoints: {}
    };
    
    // Health tracking
    this.dependencies = options.dependencies || [];
    this.dependencyHealth = new Map();
    this.isReady = false;
  }

  /**
   * Setup all standard middleware
   */
  setupMiddleware(options = {}) {
    // CORS - standard whitelist
    this.app.use(cors(this.getCORSOptions(options.corsOrigins)));

    // Request body parsing
    const jsonLimit = options.jsonLimit || '2mb';
    this.app.use(express.json({ limit: jsonLimit }));
    this.app.use(express.urlencoded({ extended: true, limit: jsonLimit }));

    // Request metrics & logging middleware
    this.app.use((req, res, next) => {
      const startTime = Date.now();
      const originalSend = res.send;

      res.send = function(data) {
        const duration = Date.now() - startTime;
        const endpoint = `${req.method} ${req.path}`;

        // Track metrics
        this.metrics.requests++;
        this.metrics.totalLatency += duration;

        if (!this.metrics.endpoints[endpoint]) {
          this.metrics.endpoints[endpoint] = { count: 0, totalLatency: 0, errors: 0 };
        }
        this.metrics.endpoints[endpoint].count++;
        this.metrics.endpoints[endpoint].totalLatency += duration;

        if (res.statusCode >= 400) {
          this.metrics.errors++;
          this.metrics.endpoints[endpoint].errors++;
          const code = res.statusCode;
          this.metrics.errors_by_code[code] = (this.metrics.errors_by_code[code] || 0) + 1;
        } else {
          this.metrics.successfulRequests++;
        }

        // Log in development
        if (this.env === 'development') {
          const status = res.statusCode >= 400 ? '❌' : '✓';
          console.log(`[${this.serviceName}] ${status} ${req.method} ${req.path} ${res.statusCode} +${duration}ms`);
        }

        return originalSend.call(this, data);
      }.bind(this);

      next();
    });

    // Error handler (must be last)
    this.app.use(this.errorHandler.bind(this));
  }

  /**
   * Register standard /health endpoint with metrics
   */
  registerHealthEndpoint() {
    this.app.get('/health', (req, res) => {
      const uptime = Date.now() - this.metrics.startTime;
      const avgLatency = this.metrics.requests > 0
        ? Math.round(this.metrics.totalLatency / this.metrics.requests)
        : 0;

      res.json({
        ok: true,
        service: this.serviceName,
        time: new Date().toISOString(),
        uptime,
        ready: this.isReady,
        metrics: {
          requests: this.metrics.requests,
          successfulRequests: this.metrics.successfulRequests,
          errors: this.metrics.errors,
          avgLatency,
          errorsByCode: this.metrics.errors_by_code
        }
      });
    });
  }

  /**
   * Register /status endpoint with more detailed info
   */
  registerStatusEndpoint() {
    this.app.get('/api/v1/status', (req, res) => {
      const uptime = Date.now() - this.metrics.startTime;
      const avgLatency = this.metrics.requests > 0
        ? Math.round(this.metrics.totalLatency / this.metrics.requests)
        : 0;

      // Top endpoints
      const endpointStats = Object.entries(this.metrics.endpoints)
        .map(([name, stats]) => ({
          endpoint: name,
          requests: stats.count,
          avgLatency: Math.round(stats.totalLatency / stats.count),
          errorRate: stats.count > 0 ? (stats.errors / stats.count * 100).toFixed(1) : 0
        }))
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 10);

      res.json({
        ok: true,
        service: this.serviceName,
        version: process.env.VERSION || '2.1.0',
        uptime,
        ready: this.isReady,
        metrics: {
          totalRequests: this.metrics.requests,
          totalErrors: this.metrics.errors,
          errorRate: this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests * 100).toFixed(2) : 0,
          avgLatency,
          topEndpoints: endpointStats
        },
        dependencies: Object.fromEntries(this.dependencyHealth)
      });
    });
  }

  /**
   * Unified error handler - all errors return consistent format
   */
  errorHandler(err, req, res, next) {
    const errorCode = err.code || err.statusCode || 'INTERNAL_ERROR';
    const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;

    console.error(`[${this.serviceName}] ${req.method} ${req.path} - ${err.message}`);

    res.status(statusCode).json({
      ok: false,
      service: this.serviceName,
      error: err.message,
      code: errorCode,
      timestamp: new Date().toISOString(),
      ...(this.env === 'development' && { stack: err.stack })
    });
  }

  /**
   * Check if dependencies are healthy
   */
  async checkDependencies() {
    for (const dep of this.dependencies) {
      try {
        const response = await fetch(`http://127.0.0.1:${dep.port}/health`, { timeout: 2000 });
        const healthy = response.ok;
        this.dependencyHealth.set(dep.name, healthy);
      } catch {
        this.dependencyHealth.set(dep.name, false);
      }
    }

    // Ready if all critical dependencies are healthy
    const criticalDeps = this.dependencies.filter(d => d.critical);
    const allCriticalHealthy = criticalDeps.every(d => this.dependencyHealth.get(d.name));
    this.isReady = allCriticalHealthy;
    
    return this.isReady;
  }

  /**
   * Start the service
   */
  async start() {
    return new Promise((resolve) => {
      // Check dependencies periodically
      if (this.dependencies.length > 0) {
        this.checkDependencies();
        setInterval(() => this.checkDependencies(), 5000);
      }

      this.server = this.app.listen(this.port, '127.0.0.1', () => {
        console.log(`✨ [${this.serviceName}] ready on http://127.0.0.1:${this.port}`);
        if (this.dependencies.length === 0) this.isReady = true;
        resolve(this.server);
      });
    });
  }

  /**
   * Graceful shutdown
   */
  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        console.log(`🛑 [${this.serviceName}] shutting down gracefully...`);
        this.server.close(() => {
          console.log(`✓ [${this.serviceName}] closed`);
          resolve();
        });

        // Force close after 10 seconds
        setTimeout(() => {
          console.warn(`⚠️  [${this.serviceName}] forcing shutdown after timeout`);
          process.exit(1);
        }, 10000);
      } else {
        resolve();
      }
    });
  }

  /**
   * Get standardized CORS options
   */
  getCORSOptions(customOrigins = []) {
    const defaultOrigins = [
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1',
      'http://localhost',
      'https://tooloo.ai',
      'https://www.tooloo.ai'
    ];

    const allOrigins = [...defaultOrigins, ...customOrigins];

    return {
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, Postman)
        if (!origin || allOrigins.includes(origin)) {
          callback(null, true);
        } else if (this.env === 'development') {
          // In development, allow all origins
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS policy'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-User-ID', 'X-Request-ID'],
      maxAge: 86400
    };
  }

  /**
   * Helper to return success responses
   */
  json(data = {}) {
    return { ok: true, timestamp: new Date().toISOString(), ...data };
  }

  /**
   * Helper to create error responses
   */
  error(message, code = 'ERROR', statusCode = 400) {
    const error = new Error(message);
    error.code = code;
    error.statusCode = statusCode;
    return error;
  }
}

export default ServiceFoundation;
