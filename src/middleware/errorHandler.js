/**
 * Error Handling Middleware
 * 
 * Provides centralized error handling with proper logging,
 * response formatting, and error categorization
 */

import pino from 'pino';

const logger = pino({ name: 'ErrorHandler' });

/**
 * Custom application error classes
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(message, 400);
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429);
  }
}

export class ProviderError extends AppError {
  constructor(message, provider = null) {
    super(message, 503);
    this.provider = provider;
  }
}

/**
 * Format error response based on environment
 */
function formatErrorResponse(error, env) {
  const isProduction = env === 'production';
  
  const response = {
    error: {
      message: error.message,
      type: error.name,
      statusCode: error.statusCode || 500
    }
  };

  // Add additional details in non-production
  if (!isProduction) {
    response.error.stack = error.stack;
    if (error.details) {
      response.error.details = error.details;
    }
  }

  // Add provider info if available
  if (error.provider) {
    response.error.provider = error.provider;
  }

  return response;
}

/**
 * Main error handling middleware
 */
export function errorHandler(error, req, res, next) {
  // Log error with context
  const logContext = {
    error: {
      message: error.message,
      name: error.name,
      stack: error.stack
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent')
    }
  };

  if (error.statusCode >= 500) {
    logger.error(logContext, 'Server error occurred');
  } else {
    logger.warn(logContext, 'Client error occurred');
  }

  // Determine status code
  const statusCode = error.statusCode || 500;
  
  // Format and send response
  const response = formatErrorResponse(error, process.env.NODE_ENV);
  res.status(statusCode).json(response);
}

/**
 * Async route wrapper to catch errors
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 handler for unknown routes
 */
export function notFoundHandler(req, res, next) {
  const error = new NotFoundError(`Route ${req.method} ${req.url}`);
  next(error);
}

/**
 * Validate that error is operational
 */
export function isOperationalError(error) {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Graceful shutdown on critical errors
 */
export function handleCriticalError(error) {
  logger.fatal({ error: error.message, stack: error.stack }, 'Critical error - shutting down');
  
  // Give time for logging and cleanup
  setTimeout(() => {
    process.exit(1);
  }, 1000);
}

/**
 * Request validation middleware
 */
export function validateRequest(schema) {
  return (req, res, next) => {
    try {
      // Validate request body against schema
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const details = error.details.reduce((acc, detail) => {
          acc[detail.path.join('.')] = detail.message;
          return acc;
        }, {});

        throw new ValidationError('Validation failed', details);
      }

      req.body = value;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Timeout middleware
 */
export function timeoutMiddleware(timeoutMs = 30000) {
  return (req, res, next) => {
    const timeout = setTimeout(() => {
      const error = new AppError('Request timeout', 408);
      next(error);
    }, timeoutMs);

    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));
    
    next();
  };
}

/**
 * Request ID middleware for tracing
 */
export function requestIdMiddleware(req, res, next) {
  req.id = req.get('X-Request-ID') || 
           `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.id);
  next();
}

export default {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  isOperationalError,
  handleCriticalError,
  validateRequest,
  timeoutMiddleware,
  requestIdMiddleware,
  // Error classes
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  RateLimitError,
  ProviderError
};
