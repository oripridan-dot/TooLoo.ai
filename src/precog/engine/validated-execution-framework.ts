// @version 2.1.28
/**
 * VALIDATED EXECUTION FRAMEWORK
 * TooLoo.ai's systematic approach to error prevention and code validation
 * Ensures code is validated, capable, and error-free from the start
 */

export class ValidatedExecutionFramework {
  constructor(options = {}) {
    this.strictMode = options.strictMode !== false; // Default ON
    this.timeoutMs = options.timeoutMs || 30000;
    this.maxRetries = options.maxRetries || 3;
    this.validationLevel = options.validationLevel || 'comprehensive'; // basic, comprehensive, strict
    this.logErrors = options.logErrors !== false;
  }

  /**
   * Execute any function with comprehensive validation and error prevention
   */
  async safeExecute(fn, params = {}, metadata = {}) {
    const execution = {
      id: this.generateExecutionId(),
      startTime: Date.now(),
      function: fn.name || 'anonymous',
      metadata,
      validation: { passed: false, checks: [] },
      result: null,
      errors: [],
      safeMode: false
    };

    try {
      // Pre-execution validation
      const preValidation = await this.validatePreExecution(fn, params, metadata);
      execution.validation = preValidation;

      if (!preValidation.passed && this.strictMode) {
        execution.safeMode = true;
        execution.errors.push('Pre-execution validation failed');
        return this.createSafeResult(execution);
      }

      // Execute with timeout and error isolation
      const result = await Promise.race([
        this.executeWithErrorIsolation(fn, params),
        this.createTimeoutPromise(execution.id)
      ]);

      // Post-execution validation
      const postValidation = await this.validateResult(result, metadata);
      execution.validation.postChecks = postValidation.checks;

      if (!postValidation.passed && this.strictMode) {
        execution.safeMode = true;
        execution.errors.push('Post-execution validation failed');
        return this.createSafeResult(execution);
      }

      execution.result = result;
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;

      return {
        ok: true,
        result,
        execution,
        validatedExecution: true,
        safeMode: false
      };

    } catch (error) {
      execution.errors.push(error.message);
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      
      if (this.logErrors) {
        console.error(`Validated execution failed [${execution.id}]:`, error);
      }

      return this.createSafeResult(execution, error);
    }
  }

  /**
   * Validate function and parameters before execution
   */
  async validatePreExecution(fn, params, metadata) {
    const checks = [];
    let passed = true;

    // Function validation
    if (typeof fn !== 'function') {
      checks.push({ name: 'function_type', passed: false, error: 'Not a function' });
      passed = false;
    } else {
      checks.push({ name: 'function_type', passed: true });
    }

    // Parameter validation
    if (params && typeof params !== 'object') {
      checks.push({ name: 'params_type', passed: false, error: 'Parameters must be an object' });
      passed = false;
    } else {
      checks.push({ name: 'params_type', passed: true });
    }

    // Domain-specific validations based on metadata
    if (metadata.requiredFields) {
      for (const field of metadata.requiredFields) {
        if (!params[field]) {
          checks.push({ name: `required_field_${field}`, passed: false, error: `Missing required field: ${field}` });
          passed = false;
        } else {
          checks.push({ name: `required_field_${field}`, passed: true });
        }
      }
    }

    // Type validations
    if (metadata.typeValidation) {
      for (const [field, expectedType] of Object.entries(metadata.typeValidation)) {
        if (params[field] && typeof params[field] !== expectedType) {
          checks.push({ name: `type_${field}`, passed: false, error: `${field} must be ${expectedType}` });
          passed = false;
        } else {
          checks.push({ name: `type_${field}`, passed: true });
        }
      }
    }

    return { passed, checks };
  }

  /**
   * Validate execution result
   */
  async validateResult(result, metadata) {
    const checks = [];
    let passed = true;

    // Basic result validation
    if (result === undefined || result === null) {
      checks.push({ name: 'result_exists', passed: false, error: 'Result is null or undefined' });
      passed = false;
    } else {
      checks.push({ name: 'result_exists', passed: true });
    }

    // Expected result structure validation
    if (metadata.expectedResult) {
      if (metadata.expectedResult.type && typeof result !== metadata.expectedResult.type) {
        checks.push({ name: 'result_type', passed: false, error: `Expected ${metadata.expectedResult.type}, got ${typeof result}` });
        passed = false;
      } else {
        checks.push({ name: 'result_type', passed: true });
      }

      if (metadata.expectedResult.properties) {
        for (const prop of metadata.expectedResult.properties) {
          if (typeof result === 'object' && !result.hasOwnProperty(prop)) {
            checks.push({ name: `result_property_${prop}`, passed: false, error: `Missing expected property: ${prop}` });
            passed = false;
          } else {
            checks.push({ name: `result_property_${prop}`, passed: true });
          }
        }
      }
    }

    return { passed, checks };
  }

  /**
   * Execute function with comprehensive error isolation
   */
  async executeWithErrorIsolation(fn, params) {
    try {
      // Add process isolation if needed
      const result = await fn(params);
      return result;
    } catch (error) {
      // Transform error for safe handling
      throw new ValidatedExecutionError(error.message, error.stack, {
        originalError: error,
        isolationLevel: 'function'
      });
    }
  }

  /**
   * Create timeout promise for execution limits
   */
  createTimeoutPromise(executionId) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new ValidatedExecutionError(
          `Execution timeout after ${this.timeoutMs}ms`,
          null,
          { executionId, type: 'timeout' }
        ));
      }, this.timeoutMs);
    });
  }

  /**
   * Create safe result for failed executions
   */
  createSafeResult(execution, error = null) {
    return {
      ok: false,
      error: error ? error.message : 'Validation failed',
      execution,
      safeMode: true,
      validatedExecution: true,
      recovery: {
        canRetry: execution.errors.length < this.maxRetries,
        suggestedAction: this.getSuggestedRecoveryAction(execution, error)
      }
    };
  }

  /**
   * Get suggested recovery action based on failure type
   */
  getSuggestedRecoveryAction(execution, error) {
    if (error && error.metadata && error.metadata.type === 'timeout') {
      return 'increase_timeout';
    }
    if (execution.validation && !execution.validation.passed) {
      return 'fix_validation_errors';
    }
    if (execution.errors.length >= this.maxRetries) {
      return 'manual_intervention_required';
    }
    return 'retry_with_backoff';
  }

  /**
   * Generate unique execution ID for tracking
   */
  generateExecutionId() {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Custom error class for validated execution failures
 */
export class ValidatedExecutionError extends Error {
  constructor(message, stack = null, metadata = {}) {
    super(message);
    this.name = 'ValidatedExecutionError';
    this.metadata = metadata;
    if (stack) {
      this.stack = stack;
    }
  }
}

/**
 * Factory function to create pre-configured validation frameworks
 */
export function createValidationFramework(type = 'default') {
  const configs = {
    default: {
      strictMode: true,
      timeoutMs: 30000,
      validationLevel: 'comprehensive'
    },
    development: {
      strictMode: false,
      timeoutMs: 60000,
      validationLevel: 'basic',
      logErrors: true
    },
    production: {
      strictMode: true,
      timeoutMs: 15000,
      validationLevel: 'strict',
      maxRetries: 5
    },
    training: {
      strictMode: true,
      timeoutMs: 45000,
      validationLevel: 'comprehensive',
      maxRetries: 3
    }
  };

  return new ValidatedExecutionFramework(configs[type] || configs.default);
}

export default ValidatedExecutionFramework;