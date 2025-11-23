/**
 * RetryPolicy - Graceful retry with exponential backoff
 * 
 * Automatically retries failed operations with exponential backoff
 * and optional jitter to prevent thundering herd.
 * 
 * Usage:
 * ```javascript
 * import { retry } from './retry-policy.js';
 * 
 * const response = await retry(
 *   async () => fetch('http://127.0.0.1:3001/api/v1/training/start'),
 *   {
 *     maxAttempts: 3,
 *     backoffMs: 100,
 *     jitter: true,
 *     onRetry: (attempt, err) => console.log(`Retry ${attempt}: ${err.message}`)
 *   }
 * );
 * ```
 */

export async function retry(fn, options = {}) {
  const {
    maxAttempts = 3,
    backoffMs = 100,
    jitter = true,
    timeout = 5000,
    onRetry = null,
    shouldRetry = defaultShouldRetry
  } = options;

  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Execute with timeout
      const result = await Promise.race([
        fn(),
        new Promise((resolve, reject) =>
          setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
        )
      ]);

      return result;
    } catch (err) {
      lastError = err;

      // Check if we should retry this error
      if (!shouldRetry(err, attempt, maxAttempts)) {
        throw err;
      }

      // Not the last attempt - calculate backoff
      if (attempt < maxAttempts) {
        const baseDelay = backoffMs * Math.pow(2, attempt - 1);
        const delay = jitter
          ? baseDelay * (0.5 + Math.random() * 0.5)
          : baseDelay;

        if (onRetry) {
          onRetry(attempt, err, delay);
        }

        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Default retry logic - retry on transient errors
 */
function defaultShouldRetry(err, attempt, maxAttempts) {
  if (attempt >= maxAttempts) return false;

  // Don't retry on client errors
  if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
    return false;
  }

  // Don't retry on auth errors
  if (err.code === 'EAUTH' || err.message.includes('unauthorized')) {
    return false;
  }

  // Retry on network errors, timeouts, 5xx
  const retryableErrors = [
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'EHOSTUNREACH',
    'Timeout',
    '502',
    '503',
    '504'
  ];

  return retryableErrors.some(e => 
    err.code === e || err.message.includes(e)
  );
}

/**
 * Sleep for N milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default retry;
