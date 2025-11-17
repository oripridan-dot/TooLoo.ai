/**
 * Hot Reload Manager
 * Monitors file changes and reloads modules without restarting the server
 * Supports ES modules with cache invalidation and dynamic re-imports
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

export class HotReloadManager {
  constructor(options = {}) {
    this.watchedFiles = new Map(); // Map of file paths to watchers
    this.reloadCallbacks = new Map(); // Map of file patterns to callbacks
    this.moduleCache = new Map(); // Cache of imported modules for reloading
    this.debounceTimers = new Map(); // Debounce timers to prevent multiple reloads
    this.debounceDelay = options.debounceDelay || 300; // ms
    this.enabled = options.enabled !== false;
    this.verbose = options.verbose || false;
    this.watchPatterns = options.watchPatterns || ['servers/**/*.js', 'lib/**/*.js', 'engine/**/*.js'];
    this.ignorePatterns = options.ignorePatterns || ['node_modules', '.git', 'logs', 'cache'];
  }

  /**
   * Start watching a file for changes
   */
  watchFile(filePath, callback, options = {}) {
    if (!this.enabled) return;

    const absolutePath = path.resolve(PROJECT_ROOT, filePath);

    if (this.watchedFiles.has(absolutePath)) {
      this.log(`Already watching: ${filePath}`);
      return;
    }

    try {
      const watcher = fs.watch(absolutePath, { persistent: false }, (eventType, filename) => {
        // Debounce: prevent multiple triggers for the same file
        if (this.debounceTimers.has(absolutePath)) {
          clearTimeout(this.debounceTimers.get(absolutePath));
        }

        const timer = setTimeout(async () => {
          this.debounceTimers.delete(absolutePath);
          
          if (eventType === 'change') {
            try {
              this.log(`File changed: ${filePath}`);
              await callback({ filePath, eventType });
            } catch (error) {
              console.error(`[HotReload] Error reloading ${filePath}:`, error.message);
            }
          }
        }, this.debounceDelay);

        this.debounceTimers.set(absolutePath, timer);
      });

      this.watchedFiles.set(absolutePath, watcher);
      this.log(`Watching: ${filePath}`);
    } catch (error) {
      console.error(`[HotReload] Failed to watch ${filePath}:`, error.message);
    }
  }

  /**
   * Watch a directory pattern and reload on changes
   */
  watchPattern(pattern, callback, options = {}) {
    if (!this.enabled) return;

    this.reloadCallbacks.set(pattern, callback);
    this.log(`Watching pattern: ${pattern}`);
  }

  /**
   * Dynamically reload an ES module by clearing require cache and re-importing
   */
  async reloadModule(filePath) {
    const absolutePath = path.resolve(PROJECT_ROOT, filePath);
    const moduleUrl = `file://${absolutePath}?t=${Date.now()}`;

    try {
      // Clear from cache
      delete require.cache[absolutePath];
      
      // Re-import with cache-busting query param
      const reloadedModule = await import(moduleUrl);
      this.moduleCache.set(filePath, reloadedModule);
      
      this.log(`Module reloaded: ${filePath}`);
      return reloadedModule;
    } catch (error) {
      console.error(`[HotReload] Failed to reload module ${filePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Reload all watched files
   */
  async reloadAll() {
    const reloadPromises = Array.from(this.reloadCallbacks.values()).map(callback => 
      callback().catch(err => console.error('[HotReload] Error during reload:', err.message))
    );

    await Promise.allSettled(reloadPromises);
    this.log('All files reloaded');
  }

  /**
   * Stop watching all files
   */
  stop() {
    this.watchedFiles.forEach((watcher, path) => {
      try {
        watcher.close();
      } catch (error) {
        console.error(`[HotReload] Error closing watcher for ${path}:`, error.message);
      }
    });

    this.watchedFiles.clear();
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();

    this.log('Hot reload stopped');
  }

  /**
   * Get status of hot reload manager
   */
  getStatus() {
    return {
      enabled: this.enabled,
      watchedFiles: this.watchedFiles.size,
      patterns: Array.from(this.reloadCallbacks.keys()),
      debounceDelay: this.debounceDelay
    };
  }

  log(message) {
    if (this.verbose) {
      console.log(`[HotReload] ${message}`);
    }
  }
}

/**
 * Helper: Create a hot-reload wrapper for an Express app
 */
export function setupAppHotReload(app, options = {}) {
  const manager = new HotReloadManager(options);

  // Add admin endpoints for reload control
  app.post('/api/v1/admin/reload', async (req, res) => {
    try {
      await manager.reloadAll();
      res.json({
        ok: true,
        message: 'All modules reloaded',
        status: manager.getStatus()
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error.message,
        status: manager.getStatus()
      });
    }
  });

  app.get('/api/v1/admin/reload-status', (req, res) => {
    res.json({
      ok: true,
      status: manager.getStatus()
    });
  });

  return manager;
}

export default HotReloadManager;
