const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { randomUUID } = require('crypto');

class ChangeOrchestrator {
  constructor(options = {}) {
    this.workspaceRoot = options.workspaceRoot || process.cwd();
    this.filesystemManager = options.filesystemManager || null;
    this.selfAwareness = options.selfAwareness || null;
    this.sessions = new Map();
    this.logsDir = path.join(this.workspaceRoot, 'logs', 'change-sessions');

    this.loadExistingSessions().catch((error) => {
      console.warn('⚠️ ChangeOrchestrator: unable to load previous sessions:', error.message);
    });

    fs.mkdir(this.logsDir, { recursive: true }).catch(() => {});
    console.log('🧭 Change Orchestrator initialized');
  }

  async loadExistingSessions() {
    try {
      const entries = await fs.readdir(this.logsDir);
      for (const entry of entries) {
        if (!entry.endsWith('.json')) continue;
        const filePath = path.join(this.logsDir, entry);
        try {
          const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
          if (data && data.id) {
            this.sessions.set(data.id, data);
          }
        } catch (error) {
          console.warn(`⚠️ Could not parse session log ${entry}:`, error.message);
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  generateSessionId() {
    return `change-${Date.now()}-${randomUUID().slice(0, 6)}`;
  }

  async startSession({ prompt, description = '', metadata = {} }) {
    const id = this.generateSessionId();
    const now = new Date().toISOString();
    const session = {
      id,
      prompt,
      description,
      metadata,
      status: 'in-progress',
      createdAt: now,
      updatedAt: now,
      plan: [],
      changes: [],
      validations: [],
      notes: []
    };

    this.sessions.set(id, session);
    await this.persistSession(session);
    return session;
  }

  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Unknown change session: ${sessionId}`);
    }
    return session;
  }

  async addPlanStep(sessionId, step) {
    const session = this.getSession(sessionId);
    session.plan.push({ ...step, timestamp: new Date().toISOString() });
    session.updatedAt = new Date().toISOString();
    await this.persistSession(session);
    return session;
  }

  async recordChange(sessionId, change) {
    const session = this.getSession(sessionId);
    session.changes.push({ ...change, timestamp: new Date().toISOString() });
    session.updatedAt = new Date().toISOString();
    await this.persistSession(session);
    return session;
  }

  async addNote(sessionId, note) {
    const session = this.getSession(sessionId);
    session.notes.push({ message: note, timestamp: new Date().toISOString() });
    session.updatedAt = new Date().toISOString();
    await this.persistSession(session);
    return session;
  }

  async runValidation(sessionId, command, options = {}) {
    const session = this.getSession(sessionId);
    const startedAt = new Date();

    return new Promise((resolve, reject) => {
      const child = exec(command, {
        cwd: options.cwd || this.workspaceRoot,
        timeout: options.timeout ?? 240000,
        maxBuffer: options.maxBuffer ?? 1024 * 1024 * 10,
        env: { ...process.env, ...options.env }
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (chunk) => {
        stdout += chunk;
      });

      child.stderr?.on('data', (chunk) => {
        stderr += chunk;
      });

      child.on('error', (error) => {
        const result = {
          sessionId,
          command,
          success: false,
          error: error.message,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          startedAt: startedAt.toISOString(),
          finishedAt: new Date().toISOString()
        };
        session.validations.push(result);
        session.updatedAt = new Date().toISOString();
        this.persistSession(session).catch(() => {});
        reject(Object.assign(new Error(`Validation command failed: ${error.message}`), { validation: result }));
      });

      child.on('exit', (code) => {
        const success = code === 0;
        const result = {
          sessionId,
          command,
          success,
          exitCode: code,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          startedAt: startedAt.toISOString(),
          finishedAt: new Date().toISOString()
        };
        session.validations.push(result);
        session.updatedAt = new Date().toISOString();
        this.persistSession(session).catch(() => {});

        if (success) {
          resolve(result);
        } else {
          const error = new Error(`Validation command exited with code ${code}`);
          error.validation = result;
          reject(error);
        }
      });
    });
  }

  async finalizeSession(sessionId, status = 'completed', details = {}) {
    const session = this.getSession(sessionId);
    session.status = status;
    session.updatedAt = new Date().toISOString();
    session.completedAt = session.updatedAt;

    if (details.validations) {
      session.validations = details.validations;
    }
    if (details.plan) {
      session.plan = details.plan;
    }
    if (details.notes) {
      session.notes = session.notes.concat(details.notes);
    }
    if (details.summary) {
      session.summary = details.summary;
    }

    await this.persistSession(session);
    return session;
  }

  listSessions() {
    return Array.from(this.sessions.values());
  }

  async persistSession(session) {
    try {
      await fs.mkdir(this.logsDir, { recursive: true });
      const filePath = path.join(this.logsDir, `${session.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(session, null, 2), 'utf8');
    } catch (error) {
      console.warn('⚠️ ChangeOrchestrator: failed to persist session:', error.message);
    }
  }
}

module.exports = ChangeOrchestrator;
