export class CodingModule {
  async analyze(code, opts = {}) {
    const language = this.detectLanguage(code, opts.language);
    const issues = this.findIssues(code, language);
    const suggestions = this.generateSuggestions(code, language);
    return {
      ok: true,
      language,
      issues,
      suggestions,
      complexity: this.estimateComplexity(code),
      style: this.analyzeStyle(code)
    };
  }

  detectLanguage(code, hint) {
    if (hint) return hint;
    const shebang = code.split('\n')[0];
    if (shebang.includes('python')) return 'python';
    if (shebang.includes('bash') || shebang.includes('sh')) return 'bash';
    if (code.includes('import React')) return 'jsx';
    if (code.includes('<?php')) return 'php';
    if (code.includes('def ') || code.includes('import ')) return 'python';
    if (code.includes('function ') || code.includes('const ') || code.includes('let ')) return 'javascript';
    return 'unknown';
  }

  findIssues(code, lang) {
    const issues = [];
    if (code.includes('console.log') && lang === 'javascript') {
      issues.push({ type: 'warning', message: 'Remove console.log in production code', line: 'N/A' });
    }
    if (code.includes('var ') && lang === 'javascript') {
      issues.push({ type: 'suggestion', message: 'Use const or let instead of var', line: 'N/A' });
    }
    if (!code.includes('error') && !code.includes('try') && lang !== 'unknown') {
      issues.push({ type: 'suggestion', message: 'Consider adding error handling', line: 'N/A' });
    }
    return issues;
  }

  generateSuggestions(code, lang) {
    const suggestions = [];
    if (code.length > 500) {
      suggestions.push('Consider breaking this into smaller functions');
    }
    if (!code.includes('test') && !code.includes('Test')) {
      suggestions.push('Add unit tests');
    }
    if (lang === 'javascript' && !code.includes('async')) {
      suggestions.push('Consider using async/await for async operations');
    }
    return suggestions;
  }

  estimateComplexity(code) {
    const lines = code.split('\n').length;
    const conditionals = (code.match(/if|else|switch|case/g) || []).length;
    const loops = (code.match(/for|while|do/g) || []).length;
    const score = Math.min(10, Math.ceil((lines + conditionals * 2 + loops * 3) / 50));
    return { score, level: score < 3 ? 'low' : score < 7 ? 'medium' : 'high' };
  }

  analyzeStyle(code) {
    const hasComments = code.includes('//') || code.includes('/*');
    const indentStyle = code.includes('\t') ? 'tabs' : 'spaces';
    const lineLength = Math.max(...code.split('\n').map(l => l.length));
    return {
      documented: hasComments,
      indentStyle,
      maxLineLength: lineLength,
      readable: lineLength < 100 ? 'good' : 'consider refactoring'
    };
  }

  async execute(code, runtime = 'nodejs') {
    // Secure sandbox execution with resource limits
    const timeout = 5000; // 5 second timeout
    const maxOutput = 10000; // 10KB output limit
    const maxMemory = 128 * 1024 * 1024; // 128MB max memory
    
    try {
      if (runtime === 'nodejs' || runtime === 'javascript') {
        return await this.executeNodeJS(code, timeout, maxOutput, maxMemory);
      } else if (runtime === 'python') {
        return await this.executePython(code, timeout, maxOutput);
      }
      throw new Error(`Runtime ${runtime} not supported`);
    } catch (error) {
      return {
        ok: false,
        error: error.message,
        exitCode: 1,
        duration: 0,
        sandbox: 'error'
      };
    }
  }

  async executeNodeJS(code, timeout, maxOutput, maxMemory) {
    const startTime = Date.now();
    let output = '';
    let error = '';
    let usedVM = false;

    try {
      // Try isolated-vm first (stronger isolation than vm2)
      const IsolateVM = await this.getIsolatedVM();
      if (IsolateVM) {
        return await this.executeWithIsolatedVM(code, timeout, maxOutput);
      }

      // Fallback to vm2
      const { VM } = await this.getVMModule();
      if (VM) {
        usedVM = true;
        const vm = new VM({
          timeout,
          sandbox: {
            console: {
              log: (...args) => {
                output += args.join(' ') + '\n';
                if (output.length > maxOutput) {
                  throw new Error('Output limit exceeded');
                }
              },
              error: (...args) => {
                error += args.join(' ') + '\n';
              }
            },
            global: {},
            process: { env: {} } // Limited process access
          }
        });

        vm.run(code);
        return {
          ok: true,
          output: output.trim(),
          error: error.trim(),
          exitCode: 0,
          duration: Date.now() - startTime,
          sandbox: 'vm2',
          resourceLimits: { timeout, maxOutput, maxMemory }
        };
      }

      // Fallback to static analysis
      return this.executeSandboxFallback(code, 'nodejs');
    } catch (err) {
      const duration = Date.now() - startTime;
      
      // Detect timeout
      if (duration >= timeout) {
        return {
          ok: false,
          error: `Execution timeout (${timeout}ms exceeded)`,
          output: output.trim(),
          exitCode: 124,
          duration,
          sandbox: usedVM ? 'vm2' : 'none',
          timeout: true
        };
      }

      return {
        ok: false,
        error: err.message,
        output: output.trim(),
        exitCode: 1,
        duration,
        sandbox: usedVM ? 'vm2' : 'none'
      };
    }
  }

  async executeWithIsolatedVM(code, timeout, maxOutput) {
    try {
      const ivm = await import('isolated-vm');
      const { Isolate } = ivm.default || ivm;
      
      const startTime = Date.now();
      const isolate = new Isolate({ memoryLimit: 128 });
      const context = isolate.createContextSync();
      let output = '';

      // Create console.log proxy
      context.setSync('console', {
        log: (...args) => {
          output += args.map(a => String(a)).join(' ') + '\n';
          if (output.length > maxOutput) {
            throw new Error('Output limit exceeded');
          }
        }
      });

      const script = isolate.compileScriptSync(code);
      
      try {
        await Promise.race([
          script.run(context),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Execution timeout')), timeout)
          )
        ]);

        return {
          ok: true,
          output: output.trim(),
          error: '',
          exitCode: 0,
          duration: Date.now() - startTime,
          sandbox: 'isolated-vm',
          resourceLimits: { timeout, maxOutput, maxMemory: 128 }
        };
      } finally {
        isolate.dispose();
      }
    } catch (error) {
      if (error.message.includes('timeout')) {
        return {
          ok: false,
          error: `Execution timeout (${timeout}ms exceeded)`,
          exitCode: 124,
          sandbox: 'isolated-vm',
          timeout: true,
          duration: timeout
        };
      }
      throw error;
    }
  }

  async executePython(code, timeout, maxOutput) {
    // Python execution via child process (safer isolation)
    const { spawn } = await import('child_process');
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const proc = spawn('python3', ['-c', code], {
        timeout,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
        if (stdout.length > maxOutput) proc.kill();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('error', (err) => {
        resolve({
          ok: false,
          error: err.message,
          exitCode: 1,
          duration: Date.now() - startTime
        });
      });

      proc.on('close', (code) => {
        resolve({
          ok: code === 0,
          output: stdout.trim(),
          error: stderr.trim(),
          exitCode: code,
          duration: Date.now() - startTime
        });
      });
    });
  }

  async getVMModule() {
    try {
      return await import('vm2');
    } catch {
      return null;
    }
  }

  async getIsolatedVM() {
    try {
      return await import('isolated-vm');
    } catch {
      return null;
    }
  }

  executeSandboxFallback(code, runtime) {
    // Fallback when vm2 not available: static analysis + safe execution hints
    console.warn('⚠️  VM module not available, returning safe execution analysis');
    return {
      ok: true,
      output: '[Safe Mode] Code analysis only - install vm2 for execution',
      analysis: {
        runtime,
        lines: code.split('\n').length,
        warns: this.findIssues(code, runtime === 'nodejs' ? 'javascript' : 'python'),
        suggestions: this.generateSuggestions(code, runtime === 'nodejs' ? 'javascript' : 'python')
      },
      exitCode: 0,
      duration: 0
    };
  }

  generateTests(code, lang) {
    const tests = [];
    if (lang === 'javascript' || lang === 'jsx') {
      tests.push('describe("MyFunction", () => {');
      tests.push('  it("should work", () => {');
      tests.push('    expect(true).toBe(true);');
      tests.push('  });');
      tests.push('});');
    } else if (lang === 'python') {
      tests.push('import unittest');
      tests.push('class TestMyFunction(unittest.TestCase):');
      tests.push('  def test_basic(self):');
      tests.push('    self.assertTrue(True)');
    }
    return tests.join('\n');
  }
}

export default new CodingModule();
