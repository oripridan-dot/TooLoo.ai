// @version 2.1.28
/**
 * VALIDATED EXECUTION FRAMEWORK
 * TooLoo.ai's systematic approach to error prevention and code validation
 * Ensures code is validated, capable, and error-free from the start
 */

interface ExecutionOptions {
  strictMode?: boolean;
  timeoutMs?: number;
  maxRetries?: number;
  validationLevel?: string;
  logErrors?: boolean;
}

interface Execution {
  id: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  function: string;
  metadata: Record<string, any>;
  validation: {
    passed: boolean;
    checks: Array<{ name: string; passed: boolean; error?: string }>;
    postChecks?: Array<{ name: string; passed: boolean; error?: string }>;
  };
  result: any;
  errors: string[];
  safeMode: boolean;
}

export class ValidatedExecutionFramework {
  private strictMode: boolean;
  private timeoutMs: number;
  private maxRetries: number;
  private validationLevel: string;
  private logErrors: boolean;

  constructor(options: ExecutionOptions = {}) {
    this.strictMode = options['strictMode'] !== false; // Default ON
    this.timeoutMs = options['timeoutMs'] || 30000;
    this.maxRetries = options['maxRetries'] || 3;
    this.validationLevel = options['validationLevel'] || 'comprehensive'; // basic, comprehensive, strict
    this.logErrors = options['logErrors'] !== false;
  }

  /**
   * Execute any function with comprehensive validation and error prevention
   */
  async safeExecute(
    fn: Function,
    params: Record<string, any> = {},
    metadata: Record<string, any> = {}
  ) {
    const execution: Execution = {
      id: this.generateExecutionId(),
      startTime: Date.now(),
      function: fn.name || 'anonymous',
      metadata,
      validation: { passed: false, checks: [] },
      result: null,
      errors: [],
      safeMode: false,
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
        this.createTimeoutPromise(execution.id),
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
        safeMode: false,
      };
    } catch (error: any) {
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
  async validatePreExecution(
    fn: Function,
    params: Record<string, any>,
    metadata: Record<string, any>
  ) {
    const checks: Array<{ name: string; passed: boolean; error?: string }> = [];
    let passed = true;

    // Function validation
    if (typeof fn !== 'function') {
      checks.push({
        name: 'function_type',
        passed: false,
        error: 'Not a function',
      });
      passed = false;
    } else {
      checks.push({ name: 'function_type', passed: true });
    }

    // Parameter validation
    if (params && typeof params !== 'object') {
      checks.push({
        name: 'params_type',
        passed: false,
        error: 'Parameters must be an object',
      });
      passed = false;
    } else {
      checks.push({ name: 'params_type', passed: true });
    }

    // Domain-specific validations based on metadata
    const requiredFields = metadata['requiredFields'] as string[] | undefined;
    if (requiredFields) {
      for (const field of requiredFields) {
        if (!params[field]) {
          checks.push({
            name: `required_field_${field}`,
            passed: false,
            error: `Missing required field: ${field}`,
          });
          passed = false;
        } else {
          checks.push({ name: `required_field_${field}`, passed: true });
        }
      }
    }

    // Type validations
    const typeValidation = metadata['typeValidation'] as Record<string, string> | undefined;
    if (typeValidation) {
      for (const [field, expectedType] of Object.entries(typeValidation)) {
        if (params[field] && typeof params[field] !== expectedType) {
          checks.push({
            name: `type_${field}`,
            passed: false,
            error: `${field} must be ${expectedType}`,
          });
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
  async validateResult(result: any, metadata: Record<string, any>) {
    const checks: Array<{ name: string; passed: boolean; error?: string }> = [];
    let passed = true;

    // Basic result validation
    if (result === undefined || result === null) {
      checks.push({
        name: 'result_exists',
        passed: false,
        error: 'Result is null or undefined',
      });
      passed = false;
    } else {
      checks.push({ name: 'result_exists', passed: true });
    }

    // Expected result structure validation
    const expectedResult = metadata['expectedResult'] as
      | { type?: string; properties?: string[] }
      | undefined;
    if (expectedResult) {
      if (expectedResult.type && typeof result !== expectedResult.type) {
        checks.push({
          name: 'result_type',
          passed: false,
          error: `Expected ${expectedResult.type}, got ${typeof result}`,
        });
        passed = false;
      } else {
        checks.push({ name: 'result_type', passed: true });
      }

      if (expectedResult.properties) {
        for (const prop of expectedResult.properties) {
          if (typeof result === 'object' && !result.hasOwnProperty(prop)) {
            checks.push({
              name: `result_property_${prop}`,
              passed: false,
              error: `Missing expected property: ${prop}`,
            });
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
  async executeWithErrorIsolation(fn: Function, params: Record<string, any>) {
    try {
      // Add process isolation if needed
      const result = await fn(params);
      return result;
    } catch (error: any) {
      // Transform error for safe handling
      throw new ValidatedExecutionError(error.message, error.stack, {
        originalError: error,
        isolationLevel: 'function',
      });
    }
  }

  /**
   * Create timeout promise for execution limits
   */
  createTimeoutPromise(executionId: string) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new ValidatedExecutionError(`Execution timeout after ${this.timeoutMs}ms`, null, {
            executionId,
            type: 'timeout',
          })
        );
      }, this.timeoutMs);
    });
  }

  /**
   * Create safe result for failed executions
   */
  createSafeResult(execution: Execution, error: any = null) {
    return {
      ok: false,
      error: error ? error.message : 'Validation failed',
      execution,
      safeMode: true,
      validatedExecution: true,
      recovery: {
        canRetry: execution.errors.length < this.maxRetries,
        suggestedAction: this.getSuggestedRecoveryAction(execution, error),
      },
    };
  }

  /**
   * Get suggested recovery action based on failure type
   */
  getSuggestedRecoveryAction(execution: Execution, error: any) {
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
  metadata: Record<string, any>;

  constructor(message: string, stack: string | null = null, metadata: Record<string, any> = {}) {
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
  const configs: Record<string, ExecutionOptions> = {
    default: {
      strictMode: true,
      timeoutMs: 30000,
      validationLevel: 'comprehensive',
    },
    development: {
      strictMode: false,
      timeoutMs: 60000,
      validationLevel: 'basic',
      logErrors: true,
    },
    production: {
      strictMode: true,
      timeoutMs: 15000,
      validationLevel: 'strict',
      maxRetries: 5,
    },
    training: {
      strictMode: true,
      timeoutMs: 45000,
      validationLevel: 'comprehensive',
      maxRetries: 3,
    },
  };

  const selectedConfig = configs[type];
  return new ValidatedExecutionFramework(selectedConfig ?? configs['default']);
}

export default ValidatedExecutionFramework;
