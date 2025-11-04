/**
 * Secure Code Executor for TooLoo.ai Personal Assistant
 * 
 * SECURITY NOTE: This replaces the vulnerable vm2 package with a safer approach
 * for personal use. For production, consider isolated-vm or external sandboxes.
 */

import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SecureCodeExecutor {
  constructor(options = {}) {
    this.timeout = options.timeout || 30000; // 30 seconds
    this.memoryLimit = options.memoryLimit || 128; // 128MB
    this.allowedModules = new Set([
      'math', 'date', 'json', 'string', 'array', 'object'
    ]);
  }

  async execute(code, language = 'javascript', options = {}) {
    const startTime = Date.now();
    
    // Validate input
    if (!this.validateCode(code, language)) {
      throw new Error('Code validation failed: potentially unsafe code detected');
    }

    // Sanitize code
    const sanitizedCode = this.sanitizeCode(code);
    
    try {
      const result = await this.runInWorker(sanitizedCode, {
        timeout: options.timeout || this.timeout,
        language
      });

      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        output: result.output || '',
        error: null,
        executionTime,
        memoryUsed: result.memoryUsed || 0,
        complexity: this.analyzeComplexity(code)
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        success: false,
        output: '',
        error: error.message,
        executionTime,
        memoryUsed: 0,
        complexity: null
      };
    }
  }

  validateCode(code, language) {
    // Strict validation for personal use
    const dangerousPatterns = [
      // File system access
      /require\s*\(\s*['"]fs['"]\s*\)/,
      /import.*fs/,
      /readFile|writeFile|unlink/,
      
      // Process control
      /require\s*\(\s*['"]child_process['"]\s*\)/,
      /process\s*\./,
      /exec|spawn|fork/,
      
      // Network access
      /require\s*\(\s*['"]http['"]\s*\)/,
      /require\s*\(\s*['"]https['"]\s*\)/,
      /require\s*\(\s*['"]net['"]\s*\)/,
      /fetch\s*\(/,
      /XMLHttpRequest/,
      
      // Dynamic evaluation
      /eval\s*\(/,
      /Function\s*\(/,
      /new\s+Function/,
      /setTimeout|setInterval/,
      
      // Global access
      /global\s*\[/,
      /globalThis/,
      /window\s*\./,
      
      // Module loading
      /require\s*\(/,
      /import\s*\(/,
      /__dirname|__filename/,
    ];

    // Check for dangerous patterns
    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        return false;
      }
    }

    // Additional JavaScript-specific checks
    if (language === 'javascript') {
      // Check for prototype pollution attempts
      if (code.includes('__proto__') || code.includes('constructor.prototype')) {
        return false;
      }
      
      // Check for with statements (can be dangerous)
      if (/\bwith\s*\(/.test(code)) {
        return false;
      }
    }

    return true;
  }

  sanitizeCode(code) {
    // Remove or replace dangerous constructs
    let sanitized = code;
    
    // Remove comments that might contain hidden code
    sanitized = sanitized.replace(/\/\*[\s\S]*?\*\//g, '');
    sanitized = sanitized.replace(/\/\/.*$/gm, '');
    
    // Limit string length to prevent memory issues
    if (sanitized.length > 10000) {
      throw new Error('Code too long - maximum 10,000 characters for personal use');
    }
    
    return sanitized;
  }

  runInWorker(code, options) {
    return new Promise((resolve, reject) => {
      const workerCode = `
        import { parentPort } from 'worker_threads';
        
        // Create safe execution environment
        const safeGlobals = {
          console: {
            log: (...args) => parentPort.postMessage({ type: 'log', data: args.join(' ') })
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
          isNaN,
          isFinite
        };
        
        // Execute code in limited scope
        try {
          const func = new Function(...Object.keys(safeGlobals), \`
            "use strict";
            let output = "";
            const originalLog = console.log;
            console.log = (...args) => {
              output += args.join(" ") + "\\n";
              originalLog(...args);
            };
            
            try {
              const result = (() => {
                \${code}
              })();
              
              return {
                success: true,
                output: output || (result !== undefined ? String(result) : ""),
                memoryUsed: process.memoryUsage().heapUsed / 1024 / 1024
              };
            } catch (error) {
              return {
                success: false,
                error: error.message,
                output: output
              };
            }
          \`);
          
          const result = func(...Object.values(safeGlobals));
          parentPort.postMessage({ type: 'result', data: result });
        } catch (error) {
          parentPort.postMessage({ 
            type: 'result', 
            data: { 
              success: false, 
              error: error.message,
              output: ""
            }
          });
        }
      `;

      // Create temporary worker file
      const workerPath = path.join(__dirname, `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.js`);
      fs.writeFileSync(workerPath, workerCode.replace('${code}', code.replace(/\\/g, '\\\\').replace(/`/g, '\\`')));

      const worker = new Worker(workerPath);
      let output = '';
      
      // Set timeout
      const timeout = setTimeout(() => {
        worker.terminate();
        fs.unlinkSync(workerPath);
        reject(new Error('Code execution timed out'));
      }, options.timeout);

      worker.on('message', (message) => {
        if (message.type === 'log') {
          output += message.data + '\n';
        } else if (message.type === 'result') {
          clearTimeout(timeout);
          worker.terminate();
          fs.unlinkSync(workerPath);
          
          if (message.data.success) {
            resolve({
              output: message.data.output || output,
              memoryUsed: message.data.memoryUsed || 0
            });
          } else {
            reject(new Error(message.data.error || 'Unknown execution error'));
          }
        }
      });

      worker.on('error', (error) => {
        clearTimeout(timeout);
        fs.unlinkSync(workerPath);
        reject(error);
      });

      worker.on('exit', (code) => {
        clearTimeout(timeout);
        if (fs.existsSync(workerPath)) {
          fs.unlinkSync(workerPath);
        }
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });
  }

  analyzeComplexity(code) {
    // Simple complexity analysis for educational purposes
    const lines = code.split('\n').filter(line => line.trim()).length;
    
    // Count control structures
    const controlStructures = [
      /\bif\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bswitch\b/g,
      /\bcatch\b/g,
      /&&/g,
      /\|\|/g
    ];
    
    let complexity = 1; // Base complexity
    controlStructures.forEach(pattern => {
      const matches = code.match(pattern);
      if (matches) complexity += matches.length;
    });

    // Estimate time complexity
    let timeComplexity = 'O(1)';
    if (code.includes('for') && code.match(/for/g).length > 1) {
      timeComplexity = 'O(n²)';
    } else if (code.includes('for') || code.includes('while')) {
      timeComplexity = 'O(n)';
    } else if (code.includes('sort')) {
      timeComplexity = 'O(n log n)';
    }

    return {
      lines,
      cyclomaticComplexity: complexity,
      timeComplexity,
      spaceComplexity: code.includes('[]') || code.includes('Array') ? 'O(n)' : 'O(1)'
    };
  }
}

export default SecureCodeExecutor;
module.exports = SecureCodeExecutor;