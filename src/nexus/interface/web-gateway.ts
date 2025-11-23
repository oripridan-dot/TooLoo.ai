// @version 2.1.11
/**
 * Web Gateway Server
 * Routes static files and proxies API requests to downstream services
 * 
 * Port: 3100 (default, configurable via WEB_GATEWAY_PORT)
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.WEB_GATEWAY_PORT || 3100;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve static files from web-app directory
app.use(express.static(path.join(__dirname, '../web-app')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'web-gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// System health overview
app.get('/api/v1/system/health', async (req, res) => {
  try {
    const services = {
      webGateway: { status: 'ok', port: PORT },
      timestamp: new Date().toISOString()
    };

    // Try to reach key services
    const serviceChecks = [
      { name: 'web-server', port: 3000 },
      { name: 'training-server', port: 3001 },
      { name: 'meta-server', port: 3002 },
      { name: 'budget-server', port: 3003 },
      { name: 'coach-server', port: 3004 }
    ];

    for (const svc of serviceChecks) {
      try {
        const response = await fetch(`http://127.0.0.1:${svc.port}/health`, {
          timeout: 2000
        });
        services[svc.name] = {
          status: response.ok ? 'ok' : 'error',
          port: svc.port
        };
      } catch (error) {
        services[svc.name] = {
          status: 'unreachable',
          port: svc.port,
          error: error.message
        };
      }
    }

    res.json(services);
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// System info endpoint
app.get('/api/v1/system/info', (req, res) => {
  res.json({
    service: 'web-gateway',
    version: '1.0.0',
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Routing info endpoint
app.get('/api/v1/system/routing', (req, res) => {
  res.json({
    routes: {
      '/api/v1/training': 3001,
      '/api/v1/meta': 3002,
      '/api/v1/budget': 3003,
      '/api/v1/coach': 3004,
      '/api/v1/product': 3006,
      '/api/v1/segmentation': 3007,
      '/api/v1/reports': 3008,
      '/api/v1/capabilities': 3009
    },
    gateway: {
      port: PORT,
      service: 'web-gateway'
    }
  });
});

// Proxy API requests to appropriate services
const serviceMap = {
  '/api/v1/training': 3001,
  '/api/v1/meta': 3002,
  '/api/v1/budget': 3003,
  '/api/v1/coach': 3004,
  '/api/v1/product': 3006,
  '/api/v1/segmentation': 3007,
  '/api/v1/reports': 3008,
  '/api/v1/capabilities': 3009
};

// Generic API proxy
app.all('/api/v1/*', async (req, res) => {
  try {
    // Find matching service
    let targetPort = 3000; // default to web-server
    let matchedPath = '/api/v1';

    for (const [path, port] of Object.entries(serviceMap)) {
      if (req.path.startsWith(path)) {
        targetPort = port;
        matchedPath = path;
        break;
      }
    }

    // Build target URL
    const targetUrl = `http://127.0.0.1:${targetPort}${req.path}${req.url.includes('?') ? '?' + req.url.split('?')[1] : ''}`;

    // Forward request
    const options = {
      method: req.method,
      headers: {
        ...req.headers,
        host: `127.0.0.1:${targetPort}`
      },
      timeout: 30000
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      options.body = Object.keys(req.body).length > 0
        ? JSON.stringify(req.body)
        : undefined;
    }

    const response = await fetch(targetUrl, options);
    const contentType = response.headers.get('content-type');
    const body = contentType?.includes('application/json')
      ? await response.json()
      : await response.text();

    // Copy response headers and status
    response.headers.forEach((value, name) => {
      if (!['content-encoding', 'transfer-encoding'].includes(name.toLowerCase())) {
        res.setHeader(name, value);
      }
    });

    res.status(response.status).send(body);
  } catch (error) {
    res.status(503).json({
      ok: false,
      error: 'Service unavailable',
      details: error.message
    });
  }
});

// SPA fallback - serve index.html for any unmatched routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../web-app/index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Web Gateway Error:', error);
  res.status(500).json({
    ok: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`✓ Web Gateway running on port ${PORT}`);
    console.log('  Static files: /web-app');
    console.log('  API proxies: /api/v1/*');
    console.log('  Health: /health');
  });
}

export default app;
