/**
 * Web Gateway - Central HTTP entry point
 * 
 * Provides:
 * - Static file serving (web-app/)
 * - Request routing to backend services
 * - Health aggregation
 * - CORS support
 * - Request/response logging
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const app = express();
const PORT = process.env.WEB_PORT || 3000;
const HOST = '127.0.0.1';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Orchestrator process management
let orchestratorProcess = null;
let orchestratorStarted = false;

// Service topology - v3 Clean Architecture
const SERVICES = {
  learning: { port: 3001, prefixes: ['/api/v1/training', '/api/v1/coach'] },
  provider: { port: 3200, prefixes: ['/api/v1/providers', '/api/v1/budget'] },
  orchestration: { port: 3100, prefixes: ['/api/v1/intent', '/api/v1/dag', '/api/v1/task'] },
  analytics: { port: 3300, prefixes: ['/api/v1/analytics', '/api/v1/badges'] },
  integration: { port: 3400, prefixes: ['/api/v1/oauth', '/api/v1/github', '/api/v1/slack'] },
  context: { port: 3020, prefixes: ['/api/v1/context', '/api/v1/repos'] }
};

// Middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));

// Request logging
app.use((req, res, next) => {
  const startTime = Date.now();
  const originalJson = res.json;

  res.json = function(data) {
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    return originalJson.call(this, data);
  };

  next();
});

// Static files - serve web-app directory
const webAppPath = path.join(__dirname, '../web-app');
if (fs.existsSync(webAppPath)) {
  app.use(express.static(webAppPath));
  console.log(`✅ Static files: ${webAppPath}`);
} else {
  console.warn(`⚠️  web-app directory not found at ${webAppPath}`);
}

/**
 * Route requests to appropriate backend service
 */
app.use((req, res, next) => {
  // Skip health checks from routing
  if (req.path === '/health') {
    return next();
  }

  // Find matching service
  for (const [serviceName, config] of Object.entries(SERVICES)) {
    if (config.prefixes.some(prefix => req.path.startsWith(prefix))) {
      const target = `http://${HOST}:${config.port}`;
      const url = `${target}${req.path}`;

      // Build fetch options
      const fetchOptions = {
        method: req.method,
        headers: req.headers,
        timeout: 30000
      };

      // Include body for POST/PUT/PATCH
      if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
        fetchOptions.body = JSON.stringify(req.body);
      }

      // Proxy request
      fetch(url, fetchOptions)
        .then(proxyRes => {
          // Copy status and headers
          res.status(proxyRes.status);
          proxyRes.headers.forEach((value, name) => {
            res.setHeader(name, value);
          });

          // Stream or return response
          if (proxyRes.headers.get('content-type')?.includes('application/json')) {
            return proxyRes.json().then(data => res.json(data));
          } else {
            return proxyRes.text().then(data => res.send(data));
          }
        })
        .catch(err => {
          console.error(`[${serviceName}] Proxy error:`, err.message);
          res.status(502).json({
            error: 'Bad Gateway',
            service: serviceName,
            message: err.message
          });
        });

      return;
    }
  }

  // No matching service found
  next();
});

/**
 * Health check endpoint - aggregates all service status
 */
app.get('/health', async (req, res) => {
  const health = {
    gateway: 'up',
    services: {}
  };

  // Check each service in parallel
  const promises = Object.entries(SERVICES).map(async ([name, config]) => {
    try {
      const response = await fetch(`http://${HOST}:${config.port}/health`, {
        timeout: 2000
      });
      health.services[name] = response.ok ? 'up' : 'down';
    } catch (err) {
      health.services[name] = 'down';
    }
  });

  await Promise.all(promises);

  // Determine overall health
  const allUp = Object.values(health.services).every(s => s === 'up');
  health.ok = allUp;
  health.timestamp = new Date().toISOString();

  res.status(allUp ? 200 : 503).json(health);
});

/**
 * System info endpoint
 */
app.get('/api/v1/system/info', (req, res) => {
  res.json({
    name: 'TooLoo.ai Web Gateway',
    version: '3.0.0',
    arch: 'event-driven microservices',
    services: Object.keys(SERVICES),
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  });
});

/**
 * Start orchestrator - spawns all backend services
 */
app.post('/system/start', (req, res) => {
  if (orchestratorStarted) {
    return res.json({
      status: 'already_running',
      message: 'Orchestrator already started'
    });
  }

  orchestratorStarted = true;

  // Spawn orchestrator process (detached, will manage services)
  orchestratorProcess = spawn('node', ['servers/orchestrator.js'], {
    stdio: 'inherit',
    detached: true
  });

  orchestratorProcess.on('error', (err) => {
    console.error('Orchestrator spawn error:', err);
    orchestratorStarted = false;
  });

  res.json({
    status: 'running',
    message: 'Orchestrator started, services initializing',
    orchestratorPID: orchestratorProcess.pid
  });
});

/**
 * Orchestrator stop endpoint
 */
app.post('/system/stop', (req, res) => {
  if (orchestratorProcess && !orchestratorProcess.killed) {
    orchestratorProcess.kill('SIGTERM');
    orchestratorStarted = false;
    res.json({
      status: 'stopping',
      message: 'Orchestrator termination signal sent'
    });
  } else {
    res.json({
      status: 'not_running',
      message: 'Orchestrator not running'
    });
  }
});

/**
 * System processes endpoint
 */
app.get('/api/v1/system/processes', (req, res) => {
  res.json({
    orchestrator: {
      running: orchestratorProcess && !orchestratorProcess.killed,
      pid: orchestratorProcess ? orchestratorProcess.pid : null
    },
    services: Object.fromEntries(
      Object.entries(SERVICES).map(([name, config]) => [name, { port: config.port }])
    )
  });
});

/**
 * Service routing info endpoint
 */
app.get('/api/v1/system/routing', (req, res) => {
  const routing = {};
  Object.entries(SERVICES).forEach(([name, config]) => {
    routing[name] = {
      port: config.port,
      prefixes: config.prefixes
    };
  });
  res.json(routing);
});

/**
 * Fallback - serve index.html for SPA routing
 */
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../web-app/index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({
      error: 'Not Found',
      path: req.path,
      note: 'Static files not configured'
    });
  }
});

/**
 * Error handler
 */
app.use((err, req, res) => {
  console.error('Gateway error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    path: req.path
  });
});

/**
 * Start server
 */
const server = app.listen(PORT, HOST, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║ 🌐 TooLoo.ai Web Gateway (Event-Driven v3)    ║');
  console.log('╚═══════════════════════════════════════════════╝');
  console.log('');
  console.log(`📍 Listening on http://${HOST}:${PORT}`);
  console.log('');
  console.log('🔗 Service Routing:');
  Object.entries(SERVICES).forEach(([name, config]) => {
    console.log(`   ${name.padEnd(16)} → :${config.port} ${config.prefixes.join(', ')}`);
  });
  console.log('');
  console.log('📊 Health Check:');
  console.log(`   GET http://${HOST}:${PORT}/health`);
  console.log('');
  console.log('ℹ️  System Info:');
  console.log(`   GET http://${HOST}:${PORT}/api/v1/system/info`);
  console.log('');
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Gateway shutdown complete');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Gateway shutdown complete');
    process.exit(0);
  });
});

export default app;
