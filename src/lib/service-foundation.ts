// @version 2.1.375
/**
 * Service Foundation - Unified service wrapper
 * Provides common functionality: health checks, status endpoints, middleware setup
 * Used by all microservices: web-server, training-server, segmentation-server, etc.
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { EventEmitter } from 'events';
import { EnvironmentHub } from '../core/environment-hub.js';

interface ServiceOptions {
  corsEnabled?: boolean;
  verbose?: boolean;
}

interface ServiceMetrics {
  requests: number;
  errors: number;
  totalLatency: number;
  startTime: number;
  endpoints: Record<string, { count: number; totalLatency: number; errors: number }>;
}

export class ServiceFoundation extends EventEmitter {
  public app: Express;
  public port: number;
  public serviceName: string;
  public isReady: boolean = false;
  public environmentHub: EnvironmentHub;
  private metrics: ServiceMetrics;
  private dependencyHealth: Map<string, boolean> = new Map();

  constructor(serviceName: string, port?: number | string, options: ServiceOptions = {}) {
    super();
    this.serviceName = serviceName;
    this.port = parseInt(String(port || 3000), 10);
    this.app = express();
    this.environmentHub = new EnvironmentHub();

    this.metrics = {
      requests: 0,
      errors: 0,
      totalLatency: 0,
      startTime: Date.now(),
      endpoints: {},
    };

    if (options.verbose) {
      console.log(`[ServiceFoundation] Initializing ${serviceName} on port ${this.port}`);
    }
  }

  /**
   * Setup standard middleware (CORS, JSON parsing, request logging)
   */
  setupMiddleware(options: ServiceOptions = {}): void {
    // CORS
    if (options.corsEnabled !== false) {
      this.app.use(cors());
    }

    // JSON body parser
    this.app.use(express.json({ limit: '100mb' }));
    this.app.use(express.urlencoded({ limit: '100mb', extended: true }));

    // Request logging middleware
    this.app.use((req: Request, res: Response, next) => {
      const startTime = Date.now();
      const originalSend = res.send;

      res.send = function (data: any) {
        const latency = Date.now() - startTime;
        this.metrics = this.metrics || {};
        this.metrics.requests = (this.metrics.requests || 0) + 1;
        this.metrics.totalLatency = (this.metrics.totalLatency || 0) + latency;

        // Track per-endpoint metrics
        const endpoint = `${req.method} ${req.path}`;
        if (!this.metrics.endpoints) {
          this.metrics.endpoints = {};
        }
        if (!this.metrics.endpoints[endpoint]) {
          this.metrics.endpoints[endpoint] = { count: 0, totalLatency: 0, errors: 0 };
        }
        this.metrics.endpoints[endpoint].count += 1;
        this.metrics.endpoints[endpoint].totalLatency += latency;

        if (res.statusCode >= 400) {
          this.metrics.errors = (this.metrics.errors || 0) + 1;
          this.metrics.endpoints[endpoint].errors = (this.metrics.endpoints[endpoint].errors || 0) + 1;
        }

        return originalSend.call(this, data);
      }.bind(this);

      next();
    });
  }

  /**
   * Register /health endpoint with basic health check
   */
  registerHealthEndpoint(): void {
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        service: this.serviceName,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    this.app.get('/api/v1/health', (req: Request, res: Response) => {
      res.json({
        ok: true,
        service: this.serviceName,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });
  }

  /**
   * Register /status endpoint with detailed service info
   */
  registerStatusEndpoint(): void {
    this.app.get('/status', (req: Request, res: Response) => {
      const uptime = Date.now() - this.metrics.startTime;
      const avgLatency =
        this.metrics.requests > 0 ? Math.round(this.metrics.totalLatency / this.metrics.requests) : 0;

      // Top endpoints
      const endpointStats = Object.entries(this.metrics.endpoints)
        .map(([name, stats]) => ({
          endpoint: name,
          requests: stats.count,
          avgLatency: Math.round(stats.totalLatency / stats.count),
          errorRate: stats.count > 0 ? ((stats.errors / stats.count) * 100).toFixed(1) : '0',
        }))
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 10);

      res.json({
        ok: true,
        service: this.serviceName,
        version: process.env.VERSION || '2.1.373',
        uptime,
        ready: this.isReady,
        metrics: {
          totalRequests: this.metrics.requests,
          totalErrors: this.metrics.errors,
          errorRate: this.metrics.requests > 0 ? ((this.metrics.errors / this.metrics.requests) * 100).toFixed(2) : '0',
          avgLatency,
          topEndpoints: endpointStats,
        },
        dependencies: Object.fromEntries(this.dependencyHealth),
      });
    });

    this.app.get('/api/v1/status', (req: Request, res: Response) => {
      const uptime = Date.now() - this.metrics.startTime;
      const avgLatency =
        this.metrics.requests > 0 ? Math.round(this.metrics.totalLatency / this.metrics.requests) : 0;

      res.json({
        ok: true,
        data: {
          service: this.serviceName,
          version: process.env.VERSION || '2.1.373',
          architecture: 'Synapsys 2.1',
          uptime,
          ready: this.isReady,
          metrics: {
            totalRequests: this.metrics.requests,
            totalErrors: this.metrics.errors,
            errorRate:
              this.metrics.requests > 0
                ? ((this.metrics.errors / this.metrics.requests) * 100).toFixed(2)
                : '0',
            avgLatency,
          },
        },
      });
    });

    this.app.get('/api/v1/system/status', (req: Request, res: Response) => {
      const uptime = Date.now() - this.metrics.startTime;

      res.json({
        ok: true,
        data: {
          version: process.env.VERSION || '2.1.373',
          architecture: 'Synapsys 2.1',
          service: this.serviceName,
          uptime,
          ready: this.isReady,
        },
      });
    });
  }

  /**
   * Unified error handler
   */
  errorHandler(err: any, req: Request, res: Response, next: any): void {
    console.error(`[${this.serviceName}] Error:`, err);

    this.metrics.errors += 1;

    res.status(err.status || 500).json({
      ok: false,
      error: err.message || 'Internal server error',
      service: this.serviceName,
    });
  }

  /**
   * Check if dependencies are healthy
   */
  async checkDependencies(): Promise<boolean> {
    // Override in subclasses to check specific dependencies
    return true;
  }

  /**
   * Start the service
   */
  async start(): Promise<void> {
    // Check dependencies
    const depsHealthy = await this.checkDependencies();
    if (!depsHealthy) {
      console.warn(`[${this.serviceName}] Some dependencies are unhealthy, starting in degraded mode`);
    }

    this.isReady = true;

    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        console.log(`[${this.serviceName}] Listening on port ${this.port}`);
        this.emit('ready');
        resolve();
      });
    });
  }

  /**
   * Graceful shutdown
   */
  async stop(): Promise<void> {
    this.isReady = false;
    this.emit('shutdown');
  }

  /**
   * Get standardized CORS options
   */
  getCorsOptions() {
    return {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
      optionsSuccessStatus: 200,
    };
  }

  /**
   * Register a dependency for health monitoring
   */
  registerDependency(name: string, isHealthy: boolean): void {
    this.dependencyHealth.set(name, isHealthy);
  }
}

export default ServiceFoundation;
