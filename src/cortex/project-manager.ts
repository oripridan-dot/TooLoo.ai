// @version 2.1.228
import * as fs from 'fs/promises';
import * as path from 'path';
import { generateLLM } from '../precog/providers/llm-provider.js';
import { smartFS } from '../core/fs-manager.js';

export interface Project {
  id: string;
  name: string;
  created: number;
  memory: {
    shortTerm: string;
    longTerm: string;
  };
}

export class ProjectManager {
  private projects: Project[] = [];
  private dataPath: string;
  private initialized: boolean = false;

  constructor(private workspaceRoot: string) {
    this.dataPath = path.join(workspaceRoot, 'data', 'projects.json');
  }

  async init() {
    if (this.initialized) return;
    await this.ensureStorage();
    await this.load();
    this.initialized = true;
    console.log(`[ProjectManager] Loaded ${this.projects.length} projects.`);
  }

  private async ensureStorage() {
    const dir = path.dirname(this.dataPath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch {
      // Ignore
    }
  }

  private async load() {
    try {
      const data = await fs.readFile(this.dataPath, 'utf-8');
      this.projects = JSON.parse(data);
    } catch {
      this.projects = [];
    }
  }

  private async save() {
    await smartFS.writeSafe(this.dataPath, JSON.stringify(this.projects, null, 2));
  }

  async listProjects() {
    await this.init();
    return this.projects.map((p) => ({
      id: p.id,
      name: p.name,
      created: p.created,
    }));
  }

  async createProject(name: string) {
    await this.init();
    if (this.projects.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('Project already exists');
    }

    const newProject: Project = {
      id: `proj-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name,
      created: Date.now(),
      memory: {
        shortTerm: '',
        longTerm: '',
      },
    };

    this.projects.push(newProject);
    await this.save();
    return newProject;
  }

  async getProject(id: string) {
    await this.init();
    return this.projects.find((p) => p.id === id);
  }

  async updateMemory(id: string, type: 'short-term' | 'long-term', content: string) {
    await this.init();
    const project = this.projects.find((p) => p.id === id);
    if (!project) throw new Error('Project not found');

    if (type === 'short-term') {
      project.memory.shortTerm = content;
    } else {
      project.memory.longTerm = content;
    }

    await this.save();
    return project;
  }

  async autoUpdateMemory(id: string, userMessage: string, assistantResponse: string) {
    await this.init();
    const project = this.projects.find((p) => p.id === id);
    if (!project) return;

    console.log(`[ProjectManager] Auto-updating memory for project ${project.name}...`);

    const prompt = `
You are the Memory Manager for the project "${project.name}".
Current Short-Term Memory:
"${project.memory.shortTerm}"

Current Long-Term Memory:
"${project.memory.longTerm}"

New Interaction:
User: "${userMessage}"
Assistant: "${assistantResponse}"

Task:
1. Update the Short-Term Memory to include the key context from this new interaction. Keep it concise (max 500 chars).
2. If there are significant, permanent details (architectural decisions, core requirements), add them to Long-Term Memory.
3. Return the result as a JSON object: { "shortTerm": "...", "longTerm": "..." }.
If no change is needed for a field, return the current value.
`;

    try {
      const result = await generateLLM({
        prompt,
        provider: 'gemini', // Use a fast/smart model
        system: 'You are a JSON generator. Output ONLY valid JSON.',
        maxTokens: 1000,
      });

      // Parse JSON (handle potential markdown wrapping)
      const jsonStr = result
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      const memoryUpdate = JSON.parse(jsonStr);

      if (memoryUpdate.shortTerm) project.memory.shortTerm = memoryUpdate.shortTerm;
      if (memoryUpdate.longTerm) project.memory.longTerm = memoryUpdate.longTerm;

      await this.save();
      console.log(`[ProjectManager] Memory updated for ${project.name}`);
    } catch (e) {
      console.error('[ProjectManager] Auto-memory update failed:', e);
    }
  }
}
