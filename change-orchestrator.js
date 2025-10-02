/**
 * ChangeOrchestrator
 * -------------------
 * Central workflow engine for orchestrating safe self-modifications inside TooLoo.ai.
 *
 * Responsibilities:
 *  - Track change sessions with plan, actions, validations, and outcomes
 *  - Apply file updates through the trusted managers (SelfAwareness + Filesystem)
 *  - Run validation commands (tests, builds, inspections) and capture results
 *  - Persist detailed JSON logs for post-hoc analysis or UI display
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class ChangeOrchestrator {
  constructor(options = {}) {
    this.workspaceRoot = options.workspaceRoot || process.cwd();
    this.filesystemManager = options.filesystemManager;
    this.selfAwareness = options.selfAwareness;
    this.logDir = options.logDir || path.join(this.workspaceRoot, 'logs', 'change-sessions');

    if (!this.filesystemManager) {
      throw new Error('ChangeOrchestrator requires a filesystemManager instance');
    }

    if (!this.selfAwareness) {
      throw new Error('ChangeOrchestrator requires a selfAwareness manager');
    }

    this.sessions = new Map();
    fs.mkdir(this.logDir, { recursive: true }).catch(() => {});
  }

  /**
   * Begin a new change session.
   */
  async startSession({ prompt, description = '', metadata = {} }) {
    const sessionId = this.#createSessionId();
    const session = {
      id: sessionId,
      prompt,
      description,
      metadata,
      status: 'planning',
      createdAt: new Date().toISOString(),
      plan: [],
      changes: [],
      validations: [],
      notes: [],
      summary: null,
    };

    this.sessions.set(sessionId, session);
    await this.#writeSessionLog(sessionId);
    return session;
  }

  /**
   * Append a planning step to the session.
   */
  async addPlanStep(sessionId, title, details = '') {
    const session = this.#requireSession(sessionId);
    session.plan.push({
      title,
      details,
      timestamp: new Date().toISOString(),
    });
    await this.#writeSessionLog(sessionId);
    return session.plan[session.plan.length - 1];
  }

  /**
   * Apply a change (create/update/delete) to the repository.
   */
  async applyChange(sessionId, change) {
    const session = this.#requireSession(sessionId);
    const record = {
      ...change,
      startedAt: new Date().toISOString(),
      status: 'pending',
    };

    try {
      const resolvedPath = this.#resolvePath(change.path);

      switch (change.type) {
        case 'create': {
          const content = change.content ?? '';
          await this.filesystemManager.writeFile(resolvedPath, content, { backup: false });
          record.status = 'created';
          break;
        }
        case 'update': {
          const content = change.content ?? '';
          await this.selfAwareness.modifySourceCode(resolvedPath, content, { backup: change.backup !== false });
          record.status = 'updated';
          break;
        }
        case 'append': {
          const existing = await fs.readFile(resolvedPath, 'utf8').catch(() => '');
          const combined = existing + (change.content ?? '');
          await this.selfAwareness.modifySourceCode(resolvedPath, combined, { backup: change.backup !== false });
          record.status = 'updated';
          break;
        }
        case 'delete': {
          await this.filesystemManager.deleteItem(resolvedPath, { recursive: change.recursive === true });
          record.status = 'deleted';
          break;
        }
        default:
          throw new Error(`Unsupported change type: ${change.type}`);
      }

      record.finishedAt = new Date().toISOString();
    } catch (error) {
      record.status = 'failed';
      record.error = error.message;
      record.finishedAt = new Date().toISOString();
      session.status = session.status === 'planning' ? 'blocked' : session.status;
      await this.addNote(sessionId, `Change failed (${change.type} ${change.path}): ${error.message}`, 'error');
      throw error;
    } finally {
      session.changes.push(record);
      await this.#writeSessionLog(sessionId);
    }

    return record;
  }

  /**
   * Run a validation command (tests, build, lint, etc.)
   */
  async runValidation(sessionId, command, options = {}) {
    const session = this.#requireSession(sessionId);
    const startedAt = Date.now();
    const record = {
      command,
      cwd: options.cwd || this.workspaceRoot,
      startedAt: new Date(startedAt).toISOString(),
      status: 'running',
    };

    session.validations.push(record);
    await this.#writeSessionLog(sessionId);

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: record.cwd,
        env: { ...process.env, ...options.env },
        timeout: options.timeout ?? 120000,
        maxBuffer: options.maxBuffer ?? 1024 * 1024 * 5,
      });

      record.status = 'passed';
      record.durationMs = Date.now() - startedAt;
      record.stdout = this.#truncate(stdout, options.stdoutLimit);
      record.stderr = this.#truncate(stderr, options.stderrLimit);
      record.finishedAt = new Date().toISOString();
    } catch (error) {
      record.status = 'failed';
      record.durationMs = Date.now() - startedAt;
      record.stdout = this.#truncate(error.stdout, options.stdoutLimit);
      record.stderr = this.#truncate(error.stderr || error.message, options.stderrLimit);
      record.error = error.message;
      record.finishedAt = new Date().toISOString();
      session.status = 'blocked';
      await this.addNote(sessionId, `Validation failed: ${command}`, 'error');
      await this.#writeSessionLog(sessionId);
      throw error;
    } finally {
      await this.#writeSessionLog(sessionId);
    }

    return record;
  }

  /**
   * Attach an informational note to the session.
   */
  async addNote(sessionId, message, level = 'info') {
    const session = this.#requireSession(sessionId);
    session.notes.push({
      level,
      message,
      timestamp: new Date().toISOString(),
    });
    await this.#writeSessionLog(sessionId);
  }

  /**
   * Finalize a session and persist the summary.
   */
  async finalizeSession(sessionId, status = 'completed', summary = {}) {
    const session = this.#requireSession(sessionId);
    session.status = status;
    session.summary = summary;
    session.finishedAt = new Date().toISOString();
    await this.#writeSessionLog(sessionId);
    return session;
  }

  /**
   * Return a lightweight summary (suitable for API/UI responses).
   */
  getSessionSummary(sessionId) {
    const session = this.#requireSession(sessionId);
    return {
      id: session.id,
      prompt: session.prompt,
      description: session.description,
      metadata: session.metadata,
      status: session.status,
      plan: session.plan,
      changes: session.changes,
      validations: session.validations,
      notes: session.notes,
      summary: session.summary,
      createdAt: session.createdAt,
      finishedAt: session.finishedAt || null,
    };
  }

  /**
   * List all tracked sessions in-memory.
   */
  listSessions() {
    return Array.from(this.sessions.values()).map((session) => this.getSessionSummary(session.id));
  }

  // --------------------
  // Internal helpers
  // --------------------

  #createSessionId() {
    return `change-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  #resolvePath(filePath = '') {
    if (!filePath) {
      throw new Error('Change requires a file path');
    }
    return path.isAbsolute(filePath) ? path.normalize(filePath) : path.join(this.workspaceRoot, filePath);
  }

  #requireSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Unknown change session: ${sessionId}`);
    }
    return session;
  }

  async #writeSessionLog(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    await fs.mkdir(this.logDir, { recursive: true });
    const logPath = path.join(this.logDir, `${sessionId}.json`);
    await fs.writeFile(logPath, JSON.stringify(session, null, 2), 'utf8');
  }

  #truncate(output, limit = 4000) {
    if (!output) return '';
    return output.length > limit ? `${output.slice(0, limit)}\n…truncated…` : output;
  }
}

module.exports = ChangeOrchestrator;
