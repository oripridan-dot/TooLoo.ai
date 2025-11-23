/**
 * Hot Update Manager
 * Dynamically registers/unregisters endpoints without server restart
 * Allows updating routes, handlers, and middleware on the fly
 */

import express from 'express';

export class HotUpdateManager {
  constructor(app, options = {}) {
    this.app = app;
    this.endpoints = new Map(); // Map of endpoint paths to handlers
    this.middleware = new Map(); // Map of middleware names to functions
    this.lastUpdate = null;
    this.updateHistory = [];
    this.maxHistory = options.maxHistory || 100;
    this.enabled = options.enabled !== true;
    this.verbose = options.verbose || false;
  }

  /**
   * Register a new endpoint dynamically
   */
  registerEndpoint(method, path, handler, options = {}) {
    const key = `${method.toUpperCase()} ${path}`;

    try {
      // Register on Express app
      const lowerMethod = method.toLowerCase();
      if (this.app[lowerMethod]) {
        this.app[lowerMethod](path, handler);
      } else {
        throw new Error(`Invalid HTTP method: ${method}`);
      }

      // Store in registry
      this.endpoints.set(key, {
        method: method.toUpperCase(),
        path,
        handler,
        timestamp: new Date().toISOString(),
        description: options.description || 'Dynamic endpoint'
      });

      this.recordUpdate('register', key, { method, path, description: options.description });
      this.log(`Registered endpoint: ${key}`);

      return { ok: true, endpoint: key };
    } catch (error) {
      console.error(`[HotUpdate] Failed to register ${key}:`, error.message);
      throw error;
    }
  }

  /**
   * Unregister an endpoint (note: Express doesn't provide easy way to remove routes)
   * This marks it as inactive but doesn't truly remove the route
   */
  unregisterEndpoint(method, path) {
    const key = `${method.toUpperCase()} ${path}`;

    try {
      if (this.endpoints.has(key)) {
        this.endpoints.delete(key);
        this.recordUpdate('unregister', key, {});
        this.log(`Unregistered endpoint: ${key}`);
        return { ok: true, endpoint: key };
      } else {
        throw new Error(`Endpoint not found: ${key}`);
      }
    } catch (error) {
      console.error(`[HotUpdate] Failed to unregister ${key}:`, error.message);
      throw error;
    }
  }

  /**
   * Update an existing endpoint's handler
   */
  updateEndpoint(method, path, newHandler, options = {}) {
    const key = `${method.toUpperCase()} ${path}`;

    try {
      if (!this.endpoints.has(key)) {
        return this.registerEndpoint(method, path, newHandler, options);
      }

      // Update the handler (note: this updates future calls)
      const endpoint = this.endpoints.get(key);
      endpoint.handler = newHandler;
      endpoint.updated = new Date().toISOString();
      endpoint.description = options.description || endpoint.description;

      this.recordUpdate('update', key, { handler: newHandler.toString().substring(0, 100) });
      this.log(`Updated endpoint: ${key}`);

      return { ok: true, endpoint: key, status: 'updated' };
    } catch (error) {
      console.error(`[HotUpdate] Failed to update ${key}:`, error.message);
      throw error;
    }
  }

  /**
   * Register middleware dynamically
   */
  registerMiddleware(name, handler, options = {}) {
    try {
      this.app.use(handler);
      this.middleware.set(name, {
        handler,
        timestamp: new Date().toISOString(),
        description: options.description || 'Dynamic middleware'
      });

      this.recordUpdate('register_middleware', name, { description: options.description });
      this.log(`Registered middleware: ${name}`);

      return { ok: true, middleware: name };
    } catch (error) {
      console.error(`[HotUpdate] Failed to register middleware ${name}:`, error.message);
      throw error;
    }
  }

  /**
   * Get all registered endpoints
   */
  getEndpoints() {
    return Array.from(this.endpoints.values()).map(ep => ({
      method: ep.method,
      path: ep.path,
      registered: ep.timestamp,
      updated: ep.updated || null,
      description: ep.description
    }));
  }

  /**
   * Get all registered middleware
   */
  getMiddleware() {
    return Array.from(this.middleware.values()).map(mw => ({
      timestamp: mw.timestamp,
      description: mw.description
    }));
  }

  /**
   * Get update history
   */
  getHistory(limit = 20) {
    return this.updateHistory.slice(-limit);
  }

  /**
   * Record an update in history
   */
  recordUpdate(action, target, details) {
    this.updateHistory.push({
      timestamp: new Date().toISOString(),
      action,
      target,
      details
    });

    if (this.updateHistory.length > this.maxHistory) {
      this.updateHistory.shift();
    }

    this.lastUpdate = new Date().toISOString();
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      enabled: this.enabled,
      endpoints: this.endpoints.size,
      middleware: this.middleware.size,
      lastUpdate: this.lastUpdate,
      historySize: this.updateHistory.length
    };
  }

  log(message) {
    if (this.verbose) {
      console.log(`[HotUpdate] ${message}`);
    }
  }
}

/**
 * Setup hot-update on Express app
 */
export function setupAppHotUpdate(app, options = {}) {
  const manager = new HotUpdateManager(app, options);

  // Admin endpoints for hot-update control
  app.get('/api/v1/admin/endpoints', (req, res) => {
    res.json({
      ok: true,
      endpoints: manager.getEndpoints(),
      status: manager.getStatus()
    });
  });

  app.post('/api/v1/admin/endpoints', (req, res) => {
    try {
      const { method, path, description } = req.body;
      
      // Placeholder handler - can be overridden
      const handler = (req, res) => {
        res.json({
          ok: true,
          message: `Dynamic endpoint: ${method} ${path}`,
          description
        });
      };

      const result = manager.registerEndpoint(method, path, handler, { description });
      res.json(result);
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.get('/api/v1/admin/update-history', (req, res) => {
    const limit = req.query.limit || 20;
    res.json({
      ok: true,
      history: manager.getHistory(limit),
      status: manager.getStatus()
    });
  });

  app.get('/api/v1/admin/middleware', (req, res) => {
    res.json({
      ok: true,
      middleware: manager.getMiddleware(),
      status: manager.getStatus()
    });
  });

  return manager;
}

export default HotUpdateManager;
