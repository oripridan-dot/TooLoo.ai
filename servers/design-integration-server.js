/**
 * Design Integration Server
 * Provides API endpoints for design system imports from Figma and other tools
 * 
 * Key endpoints:
 * - POST /api/v1/design/import-figma - Import design system from Figma
 * - GET /api/v1/design/cache-status - Check cache status
 */

import http from 'http';
import { URL } from 'url';
import { FigmaAdapter } from '../lib/adapters/figma-adapter.js';

class DesignIntegrationServer {
  constructor(port = 3008) {
    this.port = port;
    this.cache = new Map();
    this.CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
  }

  /**
   * Get cached data if available and not expired
   */
  getCached(key) {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Set cached data with timestamp
   */
  setCached(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Parse request body (JSON)
   */
  async parseBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error('Invalid JSON in request body'));
        }
      });
      req.on('error', reject);
    });
  }

  /**
   * Send JSON response
   */
  sendJson(res, statusCode, data) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
  }

  /**
   * Handle CORS
   */
  setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  /**
   * Handle POST /api/v1/design/import-figma
   * Import design system from Figma file
   */
  async handleImportFigma(req, res) {
    try {
      const body = await this.parseBody(req);
      
      // Validate request
      if (!body.figmaUrl) {
        return this.sendJson(res, 400, {
          ok: false,
          error: 'Missing required field: figmaUrl',
        });
      }

      if (!body.apiToken) {
        return this.sendJson(res, 400, {
          ok: false,
          error: 'Missing required field: apiToken',
        });
      }

      // Check cache
      const cacheKey = `figma:${body.figmaUrl}`;
      const cached = this.getCached(cacheKey);
      if (cached) {
        console.log(`[Design Server] Cache hit for ${body.figmaUrl}`);
        return this.sendJson(res, 200, {
          ...cached,
          cached: true,
          cacheTimestamp: this.cache.get(cacheKey).timestamp,
        });
      }

      // Import from Figma
      console.log(`[Design Server] Importing from Figma: ${body.figmaUrl}`);
      const adapter = new FigmaAdapter(body.apiToken);
      const result = await adapter.importDesignSystem(body.figmaUrl);

      if (!result.ok) {
        return this.sendJson(res, 400, result);
      }

      // Cache the result
      this.setCached(cacheKey, result);
      console.log(`[Design Server] Import successful, cached with TTL ${this.CACHE_TTL / 1000}s`);

      // Return result
      this.sendJson(res, 200, {
        ...result,
        cached: false,
      });

    } catch (error) {
      console.error('[Design Server] Import error:', error);
      this.sendJson(res, 500, {
        ok: false,
        error: error.message,
      });
    }
  }

  /**
   * Handle GET /api/v1/design/cache-status
   * Get cache statistics
   */
  handleCacheStatus(req, res) {
    const now = Date.now();
    const cacheEntries = [];

    for (const [key, value] of this.cache.entries()) {
      const age = now - value.timestamp;
      const ttl = this.CACHE_TTL - age;
      
      cacheEntries.push({
        key,
        age: Math.round(age / 1000), // seconds
        ttlRemaining: Math.round(Math.max(0, ttl) / 1000), // seconds
        expired: ttl <= 0,
      });
    }

    this.sendJson(res, 200, {
      ok: true,
      cache: {
        entries: cacheEntries,
        count: this.cache.size,
        ttl: this.CACHE_TTL / 1000, // seconds
      },
    });
  }

  /**
   * Handle GET /api/v1/design/health
   * Health check endpoint
   */
  handleHealth(req, res) {
    this.sendJson(res, 200, {
      ok: true,
      service: 'Design Integration Server',
      version: '1.0.0',
      uptime: process.uptime(),
      cache: {
        size: this.cache.size,
        ttl: this.CACHE_TTL / 1000,
      },
    });
  }

  /**
   * Main request handler
   */
  async handleRequest(req, res) {
    this.setCorsHeaders(res);

    // Handle OPTIONS for CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    // Parse URL
    const url = new URL(req.url, `http://localhost:${this.port}`);
    const path = url.pathname;

    console.log(`[Design Server] ${req.method} ${path}`);

    // Route requests
    if (req.method === 'POST' && path === '/api/v1/design/import-figma') {
      return await this.handleImportFigma(req, res);
    }

    if (req.method === 'GET' && path === '/api/v1/design/cache-status') {
      return this.handleCacheStatus(req, res);
    }

    if (req.method === 'GET' && path === '/api/v1/design/health') {
      return this.handleHealth(req, res);
    }

    // 404 for unknown routes
    this.sendJson(res, 404, {
      ok: false,
      error: 'Not found',
      availableEndpoints: [
        'POST /api/v1/design/import-figma',
        'GET /api/v1/design/cache-status',
        'GET /api/v1/design/health',
      ],
    });
  }

  /**
   * Start the server
   */
  start() {
    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res).catch(error => {
        console.error('[Design Server] Unhandled error:', error);
        this.sendJson(res, 500, {
          ok: false,
          error: 'Internal server error',
        });
      });
    });

    this.server.listen(this.port, () => {
      console.log(`[Design Server] Running on http://localhost:${this.port}`);
      console.log(`[Design Server] Endpoints:`);
      console.log(`  POST /api/v1/design/import-figma - Import Figma design system`);
      console.log(`  GET  /api/v1/design/cache-status - Check cache status`);
      console.log(`  GET  /api/v1/design/health - Health check`);
    });

    return this.server;
  }

  /**
   * Stop the server
   */
  stop() {
    if (this.server) {
      this.server.close();
    }
  }
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = process.env.DESIGN_SERVER_PORT || 3008;
  const server = new DesignIntegrationServer(port);
  server.start();

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[Design Server] Shutting down...');
    server.stop();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('[Design Server] Shutting down...');
    server.stop();
    process.exit(0);
  });
}

export { DesignIntegrationServer };
export default DesignIntegrationServer;
