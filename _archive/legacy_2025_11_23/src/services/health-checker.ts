/**
 * Enhanced Health Check Utility
 * Waits for services with exponential backoff and detailed feedback
 */

export class HealthChecker {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Wait for a service to be healthy
   * Uses exponential backoff and detailed logging
   */
  async waitForService(url, name, opts = {}) {
    const {
      maxAttempts = 30,
      initialDelay = 200,
      maxDelay = 2000,
      timeout = 1000
    } = opts;

    let delay = initialDelay;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const res = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          headers: { 'Connection': 'close' }
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const duration = (attempt - 1) * delay;
          this.logger?.event(name, 'ready', { duration });
          return { success: true, attempt, duration };
        }

        lastError = `HTTP ${res.status}`;
      } catch (err) {
        lastError = err.message || 'Unknown error';
      }

      this.logger?.event(name, 'health-check', {
        attempt,
        maxAttempts,
        lastError
      });

      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, delay));
        delay = Math.min(delay * 1.5, maxDelay);
      }
    }

    // Timeout
    this.logger?.event(name, 'timeout', {
      maxAttempts,
      lastError
    });

    return {
      success: false,
      attempt: maxAttempts,
      error: lastError
    };
  }

  /**
   * Verify all endpoints for a service
   */
  async verifyEndpoints(baseUrl, endpoints, name, opts = {}) {
    const results = {};

    for (const [key, path] of Object.entries(endpoints)) {
      const url = `${baseUrl}${path}`;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), opts.timeout || 1000);

        const res = await fetch(url, {
          method: 'GET',
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        results[key] = { ok: res.ok, status: res.status };
      } catch (err) {
        results[key] = { ok: false, error: err.message };
      }
    }

    return results;
  }

  /**
   * Check if port is available
   */
  async isPortAvailable(port) {
    try {
      await fetch(`http://127.0.0.1:${port}/`, {
        method: 'GET',
        timeout: 500
      });
      return false; // Port is in use
    } catch {
      return true; // Port is available
    }
  }
}

export default HealthChecker;
