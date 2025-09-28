import { VM } from 'vm2';
import { CodeExecutor } from './interfaces.js';

export class SafeCodeExecutor implements CodeExecutor {
  private vmOptions = {
    timeout: 30000, // 30 seconds
    sandbox: {
      console: {
        log: (...args: any[]) => console.log('[VM]', ...args),
        error: (...args: any[]) => console.error('[VM]', ...args),
      },
      Math,
      Date,
      JSON,
      parseInt,
      parseFloat,
      String,
      Number,
      Boolean,
      Array,
      Object,
    },
  };

  async execute(code: string, language: string, timeout: number = 30000): Promise<any> {
    if (!this.validateCode(code, language)) {
      throw new Error('Code validation failed: potentially unsafe code detected');
    }

    const startTime = Date.now();
    let result: any;
    let error: string | undefined;

    try {
      const vm = new VM({
        ...this.vmOptions,
        timeout,
      });

      if (language === 'javascript' || language === 'typescript') {
        result = vm.run(code);
      } else {
        throw new Error(`Language ${language} not supported`);
      }
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }

    const executionTime = Date.now() - startTime;
    
    return {
      success: !error,
      output: result !== undefined ? String(result) : '',
      error,
      executionTime,
      memoryUsed: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      complexity: await this.getComplexityAnalysis(code, language),
    };
  }

  validateCode(code: string, language: string): boolean {
    // Basic security checks
    const dangerousPatterns = [
      /require\s*\(\s*['"]fs['"]\s*\)/, // File system access
      /require\s*\(\s*['"]child_process['"]\s*\)/, // Process spawning
      /require\s*\(\s*['"]net['"]\s*\)/, // Network access
      /require\s*\(\s*['"]http['"]\s*\)/, // HTTP access
      /eval\s*\(/, // Dynamic evaluation
      /Function\s*\(/, // Function constructor
      /process\s*\./, // Process access
      /global\s*\./, // Global access
      /\bimport\s.*fs\b/, // ES6 fs import
      /\bfrom\s+['"]fs['"]/, // ES6 fs import
    ];

    return !dangerousPatterns.some(pattern => pattern.test(code));
  }

  async getComplexityAnalysis(code: string, language: string): Promise<any> {
    // Simple complexity analysis
    const lines = code.split('\n').length;
    const cyclomaticComplexity = this.calculateCyclomaticComplexity(code);
    
    return {
      lines,
      cyclomaticComplexity,
      timeComplexity: this.estimateTimeComplexity(code),
      spaceComplexity: this.estimateSpaceComplexity(code),
    };
  }

  private calculateCyclomaticComplexity(code: string): number {
    // Count decision points: if, while, for, switch, catch, &&, ||, ?
    const patterns = [
      /\bif\b/g,
      /\bwhile\b/g,
      /\bfor\b/g,
      /\bswitch\b/g,
      /\bcatch\b/g,
      /&&/g,
      /\|\|/g,
      /\?/g,
    ];

    let complexity = 1; // Base complexity
    patterns.forEach(pattern => {
      const matches = code.match(pattern);
      complexity += matches ? matches.length : 0;
    });

    return complexity;
  }

  private estimateTimeComplexity(code: string): string {
    if (code.includes('for') && code.includes('for')) {
      return 'O(n²)'; // Nested loops
    } else if (code.includes('for') || code.includes('while')) {
      return 'O(n)'; // Single loop
    } else if (code.includes('sort')) {
      return 'O(n log n)'; // Sorting
    } else {
      return 'O(1)'; // Constant time
    }
  }

  private estimateSpaceComplexity(code: string): string {
    if (code.includes('new Array') || code.includes('[]')) {
      return 'O(n)'; // Array allocation
    } else {
      return 'O(1)'; // Constant space
    }
  }
}