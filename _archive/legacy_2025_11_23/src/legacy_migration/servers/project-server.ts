import express from "express";
import cors from "cors";
import fs from "fs-extra";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { ServiceFoundation } from "../../lib/service-foundation.js";

const execAsync = promisify(exec);

class ProjectServer {
  private svc: ServiceFoundation;
  private app: express.Application;
  private port: number;
  private projectsDir: string;

  constructor() {
    this.svc = new ServiceFoundation(
      "project-server",
      process.env.PROJECT_SERVER_PORT
        ? parseInt(process.env.PROJECT_SERVER_PORT)
        : 3011
    );
    this.svc.setupMiddleware();
    this.svc.registerHealthEndpoint();

    this.app = this.svc.app;
    this.port = this.svc.port;
    this.projectsDir = path.join(process.cwd(), "projects");

    this.initializeStorage();
    this.setupRoutes();
    this.start();
  }

  async initializeStorage() {
    try {
      await fs.ensureDir(this.projectsDir);
      console.log("📁 Projects directory initialized");
    } catch (error: any) {
      console.warn("⚠️ Storage initialization failed:", error.message);
    }
  }

  setupRoutes() {
    // List projects
    this.app.get("/api/v1/projects", async (req, res) => {
      try {
        const projects = [];
        const items = await fs.readdir(this.projectsDir, {
          withFileTypes: true,
        });

        for (const item of items) {
          if (item.isDirectory()) {
            const projectPath = path.join(this.projectsDir, item.name);
            const configPath = path.join(projectPath, "tooloo.json");
            let config = {};
            if (await fs.pathExists(configPath)) {
              config = await fs.readJson(configPath);
            }
            projects.push({
              id: item.name,
              name: item.name,
              path: projectPath,
              ...config,
            });
          }
        }

        res.json({ ok: true, projects });
      } catch (error: any) {
        res.status(500).json({ ok: false, error: error.message });
      }
    });

    // Create project
    this.app.post("/api/v1/projects", async (req, res) => {
      try {
        const { name, description, type } = req.body;
        if (!name)
          return res.status(400).json({ error: "Project name required" });

        const projectId = name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
        const projectPath = path.join(this.projectsDir, projectId);

        if (await fs.pathExists(projectPath)) {
          return res
            .status(409)
            .json({ ok: false, error: "Project already exists" });
        }

        await fs.ensureDir(projectPath);

        // Initialize git
        await execAsync("git init", { cwd: projectPath });
        await execAsync("git checkout -b main", { cwd: projectPath }); // Ensure main branch

        // Create memory structure
        const memoryDir = path.join(projectPath, ".memory");
        await fs.ensureDir(memoryDir);
        await fs.writeFile(
          path.join(memoryDir, "long-term.md"),
          `# Long Term Memory for ${name}\n\n${description || ""}`
        );
        await fs.writeFile(
          path.join(memoryDir, "short-term.md"),
          `# Short Term Memory for ${name}\n\n- Project initialized`
        );

        // Create config
        const config = {
          id: projectId,
          name,
          description,
          type: type || "general",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await fs.writeJson(path.join(projectPath, "tooloo.json"), config, {
          spaces: 2,
        });

        res.json({
          ok: true,
          project: config,
          message: "Project created successfully",
        });
      } catch (error: any) {
        console.error("Failed to create project:", error);
        res.status(500).json({ ok: false, error: error.message });
      }
    });

    // Delete project
    this.app.delete("/api/v1/projects/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const projectPath = path.join(this.projectsDir, id);

        if (!(await fs.pathExists(projectPath))) {
          return res.status(404).json({ error: "Project not found" });
        }

        await fs.remove(projectPath);
        res.json({ ok: true, message: "Project deleted successfully" });
      } catch (error: any) {
        res.status(500).json({ ok: false, error: error.message });
      }
    });

    // Get project details
    this.app.get("/api/v1/projects/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const projectPath = path.join(this.projectsDir, id);

        if (!(await fs.pathExists(projectPath))) {
          return res.status(404).json({ error: "Project not found" });
        }

        const configPath = path.join(projectPath, "tooloo.json");
        const config = (await fs.pathExists(configPath))
          ? await fs.readJson(configPath)
          : { id, name: id };

        // Read memory
        const memoryDir = path.join(projectPath, ".memory");
        const longTerm = (await fs.pathExists(
          path.join(memoryDir, "long-term.md")
        ))
          ? await fs.readFile(path.join(memoryDir, "long-term.md"), "utf8")
          : "";
        const shortTerm = (await fs.pathExists(
          path.join(memoryDir, "short-term.md")
        ))
          ? await fs.readFile(path.join(memoryDir, "short-term.md"), "utf8")
          : "";

        res.json({
          ok: true,
          project: config,
          memory: { longTerm, shortTerm },
        });
      } catch (error: any) {
        res.status(500).json({ ok: false, error: error.message });
      }
    });

    // Update project memory
    this.app.post("/api/v1/projects/:id/memory", async (req, res) => {
      try {
        const { id } = req.params;
        const { type, content } = req.body; // type: 'long-term' | 'short-term'

        const projectPath = path.join(this.projectsDir, id);
        if (!(await fs.pathExists(projectPath))) {
          return res.status(404).json({ error: "Project not found" });
        }

        const memoryDir = path.join(projectPath, ".memory");
        await fs.ensureDir(memoryDir);

        if (type === "long-term") {
          await fs.writeFile(path.join(memoryDir, "long-term.md"), content);
        } else if (type === "short-term") {
          await fs.writeFile(path.join(memoryDir, "short-term.md"), content);
        } else {
          return res.status(400).json({ error: "Invalid memory type" });
        }

        res.json({ ok: true, message: "Memory updated" });
      } catch (error: any) {
        res.status(500).json({ ok: false, error: error.message });
      }
    });

    // --- Task Management ---
    this.app.get("/api/v1/projects/:id/tasks", async (req, res) => {
      try {
        const { id } = req.params;
        const projectPath = path.join(this.projectsDir, id);
        if (!(await fs.pathExists(projectPath)))
          return res.status(404).json({ error: "Project not found" });

        const tasksPath = path.join(projectPath, "tasks.json");
        const tasks = (await fs.pathExists(tasksPath))
          ? await fs.readJson(tasksPath)
          : [];
        res.json({ ok: true, tasks });
      } catch (error: any) {
        res.status(500).json({ ok: false, error: error.message });
      }
    });

    this.app.post("/api/v1/projects/:id/tasks", async (req, res) => {
      try {
        const { id } = req.params;
        const { tasks } = req.body;
        const projectPath = path.join(this.projectsDir, id);
        if (!(await fs.pathExists(projectPath)))
          return res.status(404).json({ error: "Project not found" });

        await fs.writeJson(path.join(projectPath, "tasks.json"), tasks, {
          spaces: 2,
        });
        res.json({ ok: true, message: "Tasks updated" });
      } catch (error: any) {
        res.status(500).json({ ok: false, error: error.message });
      }
    });

    // --- File Management ---
    this.app.get("/api/v1/projects/:id/files", async (req, res) => {
      try {
        const { id } = req.params;
        const relPath = (req.query.path as string) || ".";
        const projectPath = path.join(this.projectsDir, id);
        const targetPath = path.join(projectPath, relPath);

        if (!targetPath.startsWith(projectPath))
          return res.status(403).json({ error: "Access denied" });
        if (!(await fs.pathExists(targetPath)))
          return res.status(404).json({ error: "Path not found" });

        const stats = await fs.stat(targetPath);
        if (!stats.isDirectory())
          return res.status(400).json({ error: "Not a directory" });

        const items = await fs.readdir(targetPath, { withFileTypes: true });
        const files = items.map((item) => ({
          name: item.name,
          type: item.isDirectory() ? "folder" : "file",
          path: path.join(relPath, item.name),
        }));

        res.json({ ok: true, files });
      } catch (error: any) {
        res.status(500).json({ ok: false, error: error.message });
      }
    });

    this.app.get("/api/v1/projects/:id/files/content", async (req, res) => {
      try {
        const { id } = req.params;
        const relPath = req.query.path as string;
        if (!relPath) return res.status(400).json({ error: "Path required" });

        const projectPath = path.join(this.projectsDir, id);
        const targetPath = path.join(projectPath, relPath);

        if (!targetPath.startsWith(projectPath))
          return res.status(403).json({ error: "Access denied" });
        if (!(await fs.pathExists(targetPath)))
          return res.status(404).json({ error: "File not found" });

        const content = await fs.readFile(targetPath, "utf8");
        res.json({ ok: true, content });
      } catch (error: any) {
        res.status(500).json({ ok: false, error: error.message });
      }
    });

    this.app.post("/api/v1/projects/:id/files/content", async (req, res) => {
      try {
        const { id } = req.params;
        const { path: relPath, content } = req.body;
        if (!relPath) return res.status(400).json({ error: "Path required" });

        const projectPath = path.join(this.projectsDir, id);
        const targetPath = path.join(projectPath, relPath);

        if (!targetPath.startsWith(projectPath))
          return res.status(403).json({ error: "Access denied" });

        await fs.ensureDir(path.dirname(targetPath));
        await fs.writeFile(targetPath, content);
        res.json({ ok: true, message: "File saved" });
      } catch (error: any) {
        res.status(500).json({ ok: false, error: error.message });
      }
    });

    // --- Git Operations ---
    this.app.get("/api/v1/projects/:id/git/status", async (req, res) => {
      try {
        const { id } = req.params;
        const projectPath = path.join(this.projectsDir, id);
        if (!(await fs.pathExists(projectPath)))
          return res.status(404).json({ error: "Project not found" });

        const { stdout } = await execAsync("git status --porcelain", {
          cwd: projectPath,
        });
        res.json({ ok: true, status: stdout });
      } catch (error: any) {
        res.status(500).json({ ok: false, error: error.message });
      }
    });

    this.app.post("/api/v1/projects/:id/git/commit", async (req, res) => {
      try {
        const { id } = req.params;
        const { message } = req.body;
        const projectPath = path.join(this.projectsDir, id);
        if (!(await fs.pathExists(projectPath)))
          return res.status(404).json({ error: "Project not found" });

        await execAsync("git add .", { cwd: projectPath });
        await execAsync(`git commit -m "${message}"`, { cwd: projectPath });
        res.json({ ok: true, message: "Committed successfully" });
      } catch (error: any) {
        res.status(500).json({ ok: false, error: error.message });
      }
    });

    this.app.get("/api/v1/projects/:id/git/log", async (req, res) => {
      try {
        const { id } = req.params;
        const projectPath = path.join(this.projectsDir, id);
        if (!(await fs.pathExists(projectPath)))
          return res.status(404).json({ error: "Project not found" });

        const { stdout } = await execAsync(
          'git log --pretty=format:"%h - %an, %ar : %s" -n 10',
          { cwd: projectPath }
        );
        res.json({ ok: true, log: stdout });
      } catch (error: any) {
        res.status(500).json({ ok: false, error: error.message });
      }
    });
  }

  async start() {
    await this.svc.start();
    console.log(`🚀 Project Server running on port ${this.port}`);
  }
}

// Start the server
new ProjectServer();
