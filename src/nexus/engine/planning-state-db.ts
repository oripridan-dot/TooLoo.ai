// @version 2.1.28
/**
 * Planning State Database Schema
 * Manages persistent storage of user's planning, tasks, ideas, and roadmaps
 */

import sqlite3 from "sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "data", "planning-state.db");

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

class PlanningStateDB {
  constructor() {
    this.db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error("❌ Planning DB error:", err);
      } else {
        console.log("✅ Planning state DB connected");
        this.initTables();
      }
    });
  }

  initTables() {
    // Planning Sessions - top-level workspace sessions
    this.db.run(`
      CREATE TABLE IF NOT EXISTS planning_sessions (
        id TEXT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        name TEXT,
        mode TEXT,
        canvas TEXT,
        data JSON
      )
    `);

    // Tasks - individual task items
    this.db.run(`
      CREATE TABLE IF NOT EXISTS planning_tasks (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        title TEXT,
        description TEXT,
        priority TEXT,
        status TEXT,
        column TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES planning_sessions(id)
      )
    `);

    // Ideas - brainstorm cards
    this.db.run(`
      CREATE TABLE IF NOT EXISTS planning_ideas (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        title TEXT,
        description TEXT,
        icon TEXT,
        tags JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES planning_sessions(id)
      )
    `);

    // Roadmap Phases
    this.db.run(`
      CREATE TABLE IF NOT EXISTS planning_phases (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        title TEXT,
        timeline TEXT,
        sequence INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES planning_sessions(id)
      )
    `);

    // Phase Tasks (tasks within phases)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS planning_phase_tasks (
        id TEXT PRIMARY KEY,
        phase_id TEXT,
        title TEXT,
        completed BOOLEAN DEFAULT 0,
        sequence INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (phase_id) REFERENCES planning_phases(id)
      )
    `);

    // AI Query History (for context-aware responses)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS planning_ai_queries (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        query TEXT,
        mode TEXT,
        response TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES planning_sessions(id)
      )
    `);

    // Version History (for undo/redo)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS planning_versions (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        version_number INTEGER,
        snapshot JSON,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES planning_sessions(id)
      )
    `);
  }

  // Session Management
  createSession(name = "New Planning Session") {
    return new Promise((resolve, reject) => {
      const id = `session-${Date.now()}`;
      this.db.run(
        "INSERT INTO planning_sessions (id, name, mode, canvas) VALUES (?, ?, ?, ?)",
        [id, name, "planning", "ideation"],
        (err) => {
          if (err) reject(err);
          else resolve(id);
        },
      );
    });
  }

  getSession(sessionId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT * FROM planning_sessions WHERE id = ?",
        [sessionId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        },
      );
    });
  }

  saveSessionState(sessionId, state) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "UPDATE planning_sessions SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [JSON.stringify(state), sessionId],
        (err) => {
          if (err) reject(err);
          else resolve();
        },
      );
    });
  }

  // Task Management
  createTask(sessionId, task) {
    return new Promise((resolve, reject) => {
      const id = `task-${Date.now()}`;
      this.db.run(
        `INSERT INTO planning_tasks (id, session_id, title, description, priority, status, column) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          sessionId,
          task.title,
          task.description,
          task.priority,
          "backlog",
          task.column || "backlog",
        ],
        (err) => {
          if (err) reject(err);
          else resolve(id);
        },
      );
    });
  }

  updateTask(taskId, updates) {
    return new Promise((resolve, reject) => {
      const fields = Object.keys(updates)
        .map((k) => `${k} = ?`)
        .join(", ");
      const values = [...Object.values(updates), taskId];

      this.db.run(
        `UPDATE planning_tasks SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values,
        (err) => {
          if (err) reject(err);
          else resolve();
        },
      );
    });
  }

  getTasksBySession(sessionId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM planning_tasks WHERE session_id = ? ORDER BY created_at DESC",
        [sessionId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        },
      );
    });
  }

  // Idea Management
  createIdea(sessionId, idea) {
    return new Promise((resolve, reject) => {
      const id = `idea-${Date.now()}`;
      this.db.run(
        `INSERT INTO planning_ideas (id, session_id, title, description, icon, tags) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id,
          sessionId,
          idea.title,
          idea.description,
          idea.icon,
          JSON.stringify(idea.tags),
        ],
        (err) => {
          if (err) reject(err);
          else resolve(id);
        },
      );
    });
  }

  getIdeasBySession(sessionId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM planning_ideas WHERE session_id = ? ORDER BY created_at DESC",
        [sessionId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        },
      );
    });
  }

  // Roadmap Management
  createPhase(sessionId, phase) {
    return new Promise((resolve, reject) => {
      const id = `phase-${Date.now()}`;
      this.db.run(
        `INSERT INTO planning_phases (id, session_id, title, timeline, sequence) 
         VALUES (?, ?, ?, ?, ?)`,
        [id, sessionId, phase.title, phase.timeline, phase.sequence || 1],
        (err) => {
          if (err) reject(err);
          else resolve(id);
        },
      );
    });
  }

  getPhasesBySession(sessionId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM planning_phases WHERE session_id = ? ORDER BY sequence",
        [sessionId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        },
      );
    });
  }

  // AI Query History (for context)
  logAIQuery(sessionId, query, mode, response) {
    return new Promise((resolve, reject) => {
      const id = `query-${Date.now()}`;
      this.db.run(
        `INSERT INTO planning_ai_queries (id, session_id, query, mode, response) 
         VALUES (?, ?, ?, ?, ?)`,
        [id, sessionId, query, mode, response],
        (err) => {
          if (err) reject(err);
          else resolve();
        },
      );
    });
  }

  getAIQueryHistory(sessionId, limit = 10) {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM planning_ai_queries WHERE session_id = ? ORDER BY created_at DESC LIMIT ?",
        [sessionId, limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        },
      );
    });
  }

  // Version History
  saveVersion(sessionId, snapshot, description) {
    return new Promise((resolve, reject) => {
      const id = `version-${Date.now()}`;

      // Get current version number
      this.db.get(
        "SELECT MAX(version_number) as max_version FROM planning_versions WHERE session_id = ?",
        [sessionId],
        (err, row) => {
          const nextVersion = (row?.max_version || 0) + 1;

          this.db.run(
            `INSERT INTO planning_versions (id, session_id, version_number, snapshot, description) 
             VALUES (?, ?, ?, ?, ?)`,
            [id, sessionId, nextVersion, JSON.stringify(snapshot), description],
            (err2) => {
              if (err2) reject(err2);
              else resolve(id);
            },
          );
        },
      );
    });
  }

  getVersionHistory(sessionId, limit = 20) {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM planning_versions WHERE session_id = ? ORDER BY version_number DESC LIMIT ?",
        [sessionId, limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        },
      );
    });
  }

  // Export full session state
  async exportSession(sessionId) {
    try {
      const session = await this.getSession(sessionId);
      const tasks = await this.getTasksBySession(sessionId);
      const ideas = await this.getIdeasBySession(sessionId);
      const phases = await this.getPhasesBySession(sessionId);
      const queryHistory = await this.getAIQueryHistory(sessionId);

      return {
        session,
        tasks,
        ideas,
        phases,
        queryHistory,
        exportedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.error("Export error:", err);
      throw err;
    }
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

export default new PlanningStateDB();
