// @version 2.1.28
/**
 * ERROR BOUNDARY HANDLER
 * ======================
 *
 * Comprehensive error handling for Workbench system
 * Provides graceful fallbacks and detailed error reporting
 */

export class ErrorBoundary {
  static ERROR_CODES = {
    SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
    TIMEOUT: "TIMEOUT",
    INVALID_INPUT: "INVALID_INPUT",
    ORCHESTRATION_FAILED: "ORCHESTRATION_FAILED",
    GITHUB_ERROR: "GITHUB_ERROR",
    SYNTHESIS_ERROR: "SYNTHESIS_ERROR",
    UNKNOWN: "UNKNOWN",
  };

  /**
   * Handle service error with fallback
   */
  static handleServiceError(serviceName, error, fallback = null) {
    const errorReport = {
      service: serviceName,
      timestamp: Date.now(),
      message: error.message,
      code: this.classifyError(error),
      fallback: fallback ? "using default response" : "no fallback available",
    };

    console.error(
      `[ErrorBoundary] Service Error in ${serviceName}:`,
      errorReport,
    );

    return {
      ok: false,
      error: errorReport,
      fallback,
    };
  }

  /**
   * Classify error type
   */
  static classifyError(error) {
    if (!error) return this.ERROR_CODES.UNKNOWN;

    const message = error.message?.toLowerCase() || "";

    if (message.includes("econnrefused") || message.includes("unavailable")) {
      return this.ERROR_CODES.SERVICE_UNAVAILABLE;
    }
    if (message.includes("timeout") || message.includes("econnaborted")) {
      return this.ERROR_CODES.TIMEOUT;
    }
    if (message.includes("invalid") || message.includes("malformed")) {
      return this.ERROR_CODES.INVALID_INPUT;
    }
    if (message.includes("github")) {
      return this.ERROR_CODES.GITHUB_ERROR;
    }

    return this.ERROR_CODES.UNKNOWN;
  }

  /**
   * Generate fallback result when services fail
   */
  static generateFallback(intent, goal) {
    return {
      summary: `Analysis based on goal: ${goal}`,
      analysis: {
        intent,
        goal,
        timestamp: new Date().toISOString(),
        note: "Generated as fallback due to service unavailability",
      },
      recommendations: [
        "Check service health: GET /api/v1/work/status",
        "Retry the request",
        "Check system logs for details",
      ],
      artifacts: [],
      warning: "This is a fallback response. Some services may be unavailable.",
    };
  }

  /**
   * Wrap async function with error handling
   */
  static async withErrorHandling(fn, context = {}) {
    try {
      return await fn();
    } catch (error) {
      console.error("[ErrorBoundary] Uncaught error:", error);
      return {
        ok: false,
        error: {
          message: error.message,
          code: this.classifyError(error),
          context,
          timestamp: Date.now(),
        },
      };
    }
  }

  /**
   * Retry logic with exponential backoff
   */
  static async withRetry(fn, maxAttempts = 3, baseDelay = 100) {
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Validate input with clear error messages
   */
  static validateInput(input, schema) {
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = input[field];

      if (
        rules.required &&
        (value === undefined || value === null || value === "")
      ) {
        errors.push(`${field} is required`);
      }

      if (rules.type && value !== null && typeof value !== rules.type) {
        errors.push(`${field} must be of type ${rules.type}`);
      }

      if (rules.minLength && value && value.length < rules.minLength) {
        errors.push(`${field} must be at least ${rules.minLength} characters`);
      }

      if (rules.enum && value && !rules.enum.includes(value)) {
        errors.push(`${field} must be one of: ${rules.enum.join(", ")}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create detailed error response
   */
  static createErrorResponse(code, message, details = {}) {
    return {
      ok: false,
      error: {
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
        traceId: Math.random().toString(36).substr(2, 9),
      },
    };
  }

  /**
   * Log error with context
   */
  static logError(context, error, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      context,
      error: {
        message: error.message,
        stack: error.stack,
        code: this.classifyError(error),
      },
      metadata,
    };

    console.error("[ErrorBoundary]", JSON.stringify(logEntry, null, 2));
    return logEntry;
  }

  /**
   * Safe JSON parse with fallback
   */
  static safeJsonParse(jsonString, fallback = {}) {
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      console.warn("[ErrorBoundary] JSON parse failed, using fallback");
      return fallback;
    }
  }

  /**
   * Timeout wrapper for async operations
   */
  static withTimeout(promise, ms = 30000) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Operation timed out after ${ms}ms`)),
          ms,
        ),
      ),
    ]);
  }
}

export default ErrorBoundary;
