import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';

const SANDBOX_DIR = path.join(process.cwd(), 'tmp', 'sandbox');
const TIMEOUT_MS = 5000;
const MAX_OUTPUT_SIZE = 50000;

class SafeSandbox {
  constructor() {
    this.ensureSandboxDir();
  }

  ensureSandboxDir() {
    if (!fs.existsSync(SANDBOX_DIR)) {
      fs.mkdirSync(SANDBOX_DIR, { recursive: true });
    }
  }

  async executeJavaScript(code) {
    const id = uuid();
    const scriptPath = path.join(SANDBOX_DIR, `${id}.js`);

    try {
      // Write code to file
      await fs.promises.writeFile(scriptPath, code);

      // Execute with timeout and resource limits
      return new Promise((resolve) => {
        let output = '';
        let error = '';
        let timedOut = false;

        const proc = spawn('node', ['--max-old-space-size=128', scriptPath], {
          timeout: TIMEOUT_MS,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        const timer = setTimeout(() => {
          timedOut = true;
          proc.kill('SIGTERM');
        }, TIMEOUT_MS);

        proc.stdout.on('data', (data) => {
          output += data.toString();
          if (output.length > MAX_OUTPUT_SIZE) {
            proc.kill('SIGTERM');
          }
        });

        proc.stderr.on('data', (data) => {
          error += data.toString();
        });

        proc.on('close', (code) => {
          clearTimeout(timer);
          resolve({
            ok: true,
            output: output.slice(0, MAX_OUTPUT_SIZE),
            error: error.slice(0, MAX_OUTPUT_SIZE),
            exitCode: code,
            timedOut,
            duration: TIMEOUT_MS
          });
        });

        proc.on('error', (err) => {
          clearTimeout(timer);
          resolve({
            ok: false,
            error: err.message,
            exitCode: -1
          });
        });
      });
    } catch (e) {
      return {
        ok: false,
        error: e.message,
        exitCode: -1
      };
    } finally {
      // Clean up
      try {
        await fs.promises.unlink(scriptPath);
      } catch {}
    }
  }

  async executePython(code) {
    const id = uuid();
    const scriptPath = path.join(SANDBOX_DIR, `${id}.py`);

    try {
      await fs.promises.writeFile(scriptPath, code);

      return new Promise((resolve) => {
        let output = '';
        let error = '';
        let timedOut = false;

        const proc = spawn('python3', [scriptPath], {
          timeout: TIMEOUT_MS,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        const timer = setTimeout(() => {
          timedOut = true;
          proc.kill('SIGTERM');
        }, TIMEOUT_MS);

        proc.stdout.on('data', (data) => {
          output += data.toString();
          if (output.length > MAX_OUTPUT_SIZE) {
            proc.kill('SIGTERM');
          }
        });

        proc.stderr.on('data', (data) => {
          error += data.toString();
        });

        proc.on('close', (code) => {
          clearTimeout(timer);
          resolve({
            ok: true,
            output: output.slice(0, MAX_OUTPUT_SIZE),
            error: error.slice(0, MAX_OUTPUT_SIZE),
            exitCode: code,
            timedOut,
            duration: TIMEOUT_MS
          });
        });

        proc.on('error', (err) => {
          clearTimeout(timer);
          resolve({
            ok: false,
            error: err.message,
            exitCode: -1
          });
        });
      });
    } catch (e) {
      return {
        ok: false,
        error: e.message,
        exitCode: -1
      };
    } finally {
      try {
        await fs.promises.unlink(scriptPath);
      } catch {}
    }
  }

  async execute(code, language = 'javascript') {
    if (language === 'javascript' || language === 'js') {
      return this.executeJavaScript(code);
    } else if (language === 'python') {
      return this.executePython(code);
    }
    return { ok: false, error: `Language ${language} not supported` };
  }
}

export default new SafeSandbox();
