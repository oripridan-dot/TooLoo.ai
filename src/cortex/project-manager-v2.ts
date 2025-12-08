// @version 3.3.391
/**
 * Project Manager - Figma/GitHub-style Project Management
 *
 * Manages projects with:
 * - Versioning & Branching
 * - Collaboration & Permissions
 * - AI-powered Memory Management
 * - Activity Tracking
 *
 * @module cortex/project-manager
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { generateLLM } from '../precog/providers/llm-provider.js';
import { smartFS } from '../core/fs-manager.js';
import type {
  Project,
  ProjectListItem,
  ProjectListFilter,
  CreateProjectInput,
  UpdateProjectInput,
  Branch,
  Version,
} from '../shared/types/project.types.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const PROJECTS_DIR = path.join(process.cwd(), 'projects');
const PROJECTS_INDEX = path.join(PROJECTS_DIR, '.index.json');

// ============================================================================
// LEGACY INTERFACE (for backwards compatibility)
// ============================================================================

export interface LegacyProject {
  id: string;
  name: string;
  created: number;
  memory: {
    shortTerm: string;
    longTerm: string;
  };
}

// ============================================================================
// PROJECT MANAGER CLASS
// ============================================================================

export class ProjectManager {
  private projectIndex: Map<string, ProjectListItem> = new Map();
  private initialized: boolean = false;

  constructor(private workspaceRoot: string = process.cwd()) {}

  // =========================================================================
  // INITIALIZATION
  // =========================================================================

  async init(): Promise<void> {
    if (this.initialized) return;

    // Ensure projects directory exists
    await fs.mkdir(PROJECTS_DIR, { recursive: true }).catch(() => {});

    // Load project index
    await this.loadIndex();

    this.initialized = true;
    console.log(`[ProjectManager] Initialized with ${this.projectIndex.size} projects`);
  }

  private async loadIndex(): Promise<void> {
    try {
      const data = await fs.readFile(PROJECTS_INDEX, 'utf-8');
      const parsed = JSON.parse(data);
      this.projectIndex = new Map(Object.entries(parsed));
    } catch {
      // Rebuild index from project directories
      await this.rebuildIndex();
    }
  }

  private async saveIndex(): Promise<void> {
    const data = Object.fromEntries(this.projectIndex);
    await smartFS.writeSafe(PROJECTS_INDEX, JSON.stringify(data, null, 2));
  }

  private async rebuildIndex(): Promise<void> {
    console.log('[ProjectManager] Rebuilding project index...');
    this.projectIndex.clear();

    try {
      const entries = await fs.readdir(PROJECTS_DIR, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

        const configPath = path.join(PROJECTS_DIR, entry.name, 'tooloo.json');
        try {
          const config = await fs.readFile(configPath, 'utf-8');
          const project: Project = JSON.parse(config);
          this.updateIndex(project);
        } catch {
          // Skip invalid projects
        }
      }

      await this.saveIndex();
      console.log(`[ProjectManager] Index rebuilt with ${this.projectIndex.size} projects`);
    } catch (e) {
      console.error('[ProjectManager] Failed to rebuild index:', e);
    }
  }

  private updateIndex(project: Project): void {
    const item: ProjectListItem = {
      id: project.id,
      slug: project.slug,
      name: project.name,
      description: project.description,
      type: project.type,
      status: project.status,
      visibility: project.access.visibility,
      thumbnail: project.thumbnail,
      icon: project.icon,
      color: project.color,
      owner: project.owner,
      stats: {
        stars: project.stats.stars,
        forks: project.stats.forks,
        collaborators: project.stats.collaborators,
      },
      tags: project.tags,
      updatedAt: project.updatedAt,
    };
    this.projectIndex.set(project.id, item);
  }

  // =========================================================================
  // PROJECT CRUD
  // =========================================================================

  async listProjects(filter?: ProjectListFilter): Promise<{
    projects: ProjectListItem[];
    total: number;
  }> {
    await this.init();

    let projects = Array.from(this.projectIndex.values());

    // Apply filters
    if (filter) {
      if (filter.type && filter.type.length > 0) {
        const filterTypes = filter.type;
        projects = projects.filter((p) => filterTypes.includes(p.type));
      }
      if (filter.status && filter.status.length > 0) {
        const filterStatuses = filter.status;
        projects = projects.filter((p) => filterStatuses.includes(p.status));
      }
      if (filter.visibility && filter.visibility.length > 0) {
        const filterVisibilities = filter.visibility;
        projects = projects.filter((p) => filterVisibilities.includes(p.visibility));
      }
      if (filter.tags && filter.tags.length > 0) {
        const filterTags = filter.tags;
        projects = projects.filter((p) => filterTags.some((t) => p.tags.includes(t)));
      }
      if (filter.search) {
        const search = filter.search.toLowerCase();
        projects = projects.filter(
          (p) =>
            p.name.toLowerCase().includes(search) ||
            p.description.toLowerCase().includes(search) ||
            p.tags.some((t) => t.toLowerCase().includes(search))
        );
      }

      // Sort
      const sortKey = filter.sortBy || 'updatedAt';
      const sortDir = filter.sortOrder === 'asc' ? 1 : -1;
      projects.sort((a, b) => {
        const aVal = (a as any)[sortKey] ?? '';
        const bVal = (b as any)[sortKey] ?? '';
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return aVal.localeCompare(bVal) * sortDir;
        }
        return (aVal - bVal) * sortDir;
      });

      // Paginate
      const total = projects.length;
      const offset = filter.offset || 0;
      const limit = filter.limit || 50;
      projects = projects.slice(offset, offset + limit);

      return { projects, total };
    }

    return { projects, total: projects.length };
  }

  async getProject(id: string): Promise<Project | null> {
    await this.init();

    const projectPath = path.join(PROJECTS_DIR, id, 'tooloo.json');
    try {
      const data = await fs.readFile(projectPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async createProject(input: CreateProjectInput): Promise<Project> {
    await this.init();

    const { v4: uuidv4 } = await import('uuid');
    const id = uuidv4();
    const slug = this.generateSlug(input.name);
    const projectPath = path.join(PROJECTS_DIR, id);

    const now = new Date().toISOString();
    const defaultBranch: Branch = {
      id: `branch-${uuidv4()}`,
      name: 'main',
      description: 'Default branch',
      status: 'active',
      isDefault: true,
      isProtected: true,
      createdAt: now,
      createdBy: 'system',
      lastCommitAt: now,
      aheadBy: 0,
      behindBy: 0,
    };

    const project: Project = {
      id,
      slug,
      name: input.name,
      description: input.description || '',
      type: input.type || 'general',
      status: 'active',
      icon: input.icon || '📁',
      color: input.color || '#6366f1',
      owner: 'user',
      access: {
        visibility: input.visibility || 'private',
        allowForks: true,
        allowComments: true,
        requireApproval: false,
        collaborators: [
          {
            id: 'user',
            name: 'Owner',
            role: 'owner',
            addedAt: now,
          },
        ],
      },
      currentVersion: '0.1.0',
      versions: [
        {
          id: `ver-${uuidv4()}`,
          number: '0.1.0',
          name: 'Initial Version',
          description: 'Project created',
          createdAt: now,
          createdBy: 'system',
          tags: ['initial'],
          isRelease: false,
        },
      ],
      branches: [defaultBranch],
      defaultBranch: 'main',
      tags: input.tags || [],
      stats: {
        stars: 0,
        forks: 0,
        views: 0,
        branches: 1,
        commits: 1,
        collaborators: 1,
        files: 0,
        sizeBytes: 0,
      },
      settings: {
        defaultBranch: 'main',
        autoSave: true,
        autoVersion: false,
        requireReview: false,
        enableAI: true,
        aiAssistLevel: 'moderate',
        notifyOnChanges: true,
        customFields: {},
      },
      memory: {
        shortTerm: '',
        longTerm: '',
        context: [],
        preferences: {},
      },
      recentActivity: [
        {
          id: `activity-${uuidv4()}`,
          type: 'commit',
          actor: 'system',
          description: 'Project created',
          timestamp: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
      templateId: input.templateId,
    };

    // Create directory structure
    await fs.mkdir(projectPath, { recursive: true });
    await fs.mkdir(path.join(projectPath, 'src'));
    await fs.mkdir(path.join(projectPath, 'docs'));
    await fs.mkdir(path.join(projectPath, 'assets'));
    await fs.mkdir(path.join(projectPath, '.tooloo'));
    await fs.mkdir(path.join(projectPath, '.tooloo', 'branches'));
    await fs.mkdir(path.join(projectPath, '.tooloo', 'versions'));

    // Save project config
    await smartFS.writeSafe(
      path.join(projectPath, 'tooloo.json'),
      JSON.stringify(project, null, 2)
    );

    // Create README
    await fs.writeFile(
      path.join(projectPath, 'README.md'),
      `# ${input.name}\n\n${input.description || 'A TooLoo.ai project'}\n`
    );

    // Update index
    this.updateIndex(project);
    await this.saveIndex();

    console.log(`[ProjectManager] Created project: ${project.name} (${project.id})`);
    return project;
  }

  async updateProject(id: string, updates: UpdateProjectInput): Promise<Project | null> {
    await this.init();

    const project = await this.getProject(id);
    if (!project) return null;

    const now = new Date().toISOString();

    // Apply updates
    if (updates.name !== undefined) project.name = updates.name;
    if (updates.description !== undefined) project.description = updates.description;
    if (updates.type !== undefined) project.type = updates.type;
    if (updates.status !== undefined) project.status = updates.status;
    if (updates.visibility !== undefined) project.access.visibility = updates.visibility;
    if (updates.tags !== undefined) project.tags = updates.tags;
    if (updates.icon !== undefined) project.icon = updates.icon;
    if (updates.color !== undefined) project.color = updates.color;
    if (updates.settings) {
      project.settings = { ...project.settings, ...updates.settings };
    }

    project.updatedAt = now;
    project.recentActivity.unshift({
      id: `activity-${Date.now()}`,
      type: 'update',
      actor: 'user',
      description: 'Project updated',
      timestamp: now,
    });
    project.recentActivity = project.recentActivity.slice(0, 50);

    // Save
    const projectPath = path.join(PROJECTS_DIR, id, 'tooloo.json');
    await smartFS.writeSafe(projectPath, JSON.stringify(project, null, 2));

    // Update index
    this.updateIndex(project);
    await this.saveIndex();

    return project;
  }

  async deleteProject(id: string): Promise<boolean> {
    await this.init();

    const projectPath = path.join(PROJECTS_DIR, id);
    try {
      await fs.rm(projectPath, { recursive: true, force: true });
      this.projectIndex.delete(id);
      await this.saveIndex();
      console.log(`[ProjectManager] Deleted project: ${id}`);
      return true;
    } catch {
      return false;
    }
  }

  // =========================================================================
  // MEMORY MANAGEMENT
  // =========================================================================

  async updateMemory(
    id: string,
    type: 'short-term' | 'long-term',
    content: string
  ): Promise<Project | null> {
    await this.init();

    const project = await this.getProject(id);
    if (!project) return null;

    if (type === 'short-term') {
      project.memory.shortTerm = content;
    } else {
      project.memory.longTerm = content;
    }

    project.updatedAt = new Date().toISOString();

    const projectPath = path.join(PROJECTS_DIR, id, 'tooloo.json');
    await smartFS.writeSafe(projectPath, JSON.stringify(project, null, 2));

    return project;
  }

  async autoUpdateMemory(
    id: string,
    userMessage: string,
    assistantResponse: string
  ): Promise<void> {
    await this.init();

    const project = await this.getProject(id);
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
        provider: 'gemini',
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

      project.updatedAt = new Date().toISOString();

      const projectPath = path.join(PROJECTS_DIR, id, 'tooloo.json');
      await smartFS.writeSafe(projectPath, JSON.stringify(project, null, 2));

      console.log(`[ProjectManager] Memory updated for project ${project.name}`);
    } catch (e) {
      console.error(`[ProjectManager] Memory update failed:`, e);
    }
  }

  // =========================================================================
  // BRANCHING
  // =========================================================================

  async createBranch(
    projectId: string,
    name: string,
    fromBranch?: string
  ): Promise<Branch | null> {
    await this.init();

    const project = await this.getProject(projectId);
    if (!project) return null;

    if (project.branches.some((b) => b.name === name)) {
      throw new Error('Branch already exists');
    }

    const { v4: uuidv4 } = await import('uuid');
    const now = new Date().toISOString();

    const newBranch: Branch = {
      id: `branch-${uuidv4()}`,
      name,
      description: '',
      status: 'active',
      isDefault: false,
      isProtected: false,
      createdAt: now,
      createdBy: 'user',
      lastCommitAt: now,
      aheadBy: 0,
      behindBy: 0,
      parentBranch: fromBranch || project.defaultBranch,
    };

    project.branches.push(newBranch);
    project.stats.branches++;
    project.updatedAt = now;
    project.recentActivity.unshift({
      id: `activity-${uuidv4()}`,
      type: 'branch',
      actor: 'user',
      description: `Created branch: ${name}`,
      timestamp: now,
    });

    const projectPath = path.join(PROJECTS_DIR, projectId, 'tooloo.json');
    await smartFS.writeSafe(projectPath, JSON.stringify(project, null, 2));

    return newBranch;
  }

  async deleteBranch(projectId: string, branchName: string): Promise<boolean> {
    await this.init();

    const project = await this.getProject(projectId);
    if (!project) return false;

    const branchIndex = project.branches.findIndex((b) => b.name === branchName);
    if (branchIndex === -1) return false;

    const branch = project.branches[branchIndex];
    if (!branch) return false;
    
    if (branch.isDefault || branch.isProtected) {
      throw new Error('Cannot delete default or protected branch');
    }

    project.branches.splice(branchIndex, 1);
    project.stats.branches = Math.max(1, project.stats.branches - 1);
    project.updatedAt = new Date().toISOString();

    const projectPath = path.join(PROJECTS_DIR, projectId, 'tooloo.json');
    await smartFS.writeSafe(projectPath, JSON.stringify(project, null, 2));

    return true;
  }

  // =========================================================================
  // VERSIONING
  // =========================================================================

  async createVersion(
    projectId: string,
    number: string,
    name?: string,
    description?: string,
    isRelease = false
  ): Promise<Version | null> {
    await this.init();

    const project = await this.getProject(projectId);
    if (!project) return null;

    if (project.versions.some((v) => v.number === number)) {
      throw new Error('Version already exists');
    }

    const { v4: uuidv4 } = await import('uuid');
    const now = new Date().toISOString();

    const newVersion: Version = {
      id: `ver-${uuidv4()}`,
      number,
      name: name || `Version ${number}`,
      description: description || '',
      createdAt: now,
      createdBy: 'user',
      commitHash: Math.random().toString(36).substring(2, 10),
      tags: isRelease ? ['release'] : [],
      isRelease,
    };

    project.versions.push(newVersion);
    project.currentVersion = number;
    project.updatedAt = now;
    project.recentActivity.unshift({
      id: `activity-${uuidv4()}`,
      type: 'commit',
      actor: 'user',
      description: `Created version: ${number}${isRelease ? ' (release)' : ''}`,
      timestamp: now,
    });

    const projectPath = path.join(PROJECTS_DIR, projectId, 'tooloo.json');
    await smartFS.writeSafe(projectPath, JSON.stringify(project, null, 2));

    this.updateIndex(project);
    await this.saveIndex();

    return newVersion;
  }

  // =========================================================================
  // STARRING
  // =========================================================================

  async starProject(id: string, starred: boolean): Promise<number> {
    await this.init();

    const project = await this.getProject(id);
    if (!project) throw new Error('Project not found');

    if (starred) {
      project.stats.stars++;
    } else {
      project.stats.stars = Math.max(0, project.stats.stars - 1);
    }

    project.updatedAt = new Date().toISOString();

    const projectPath = path.join(PROJECTS_DIR, id, 'tooloo.json');
    await smartFS.writeSafe(projectPath, JSON.stringify(project, null, 2));

    this.updateIndex(project);
    await this.saveIndex();

    return project.stats.stars;
  }

  // =========================================================================
  // HELPERS
  // =========================================================================

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 64);
  }

  // =========================================================================
  // LEGACY COMPATIBILITY
  // =========================================================================

  /**
   * Get projects in legacy format (for backwards compatibility)
   */
  async listProjectsLegacy(): Promise<
    Array<{ id: string; name: string; created: number }>
  > {
    const { projects } = await this.listProjects();
    return projects.map((p) => ({
      id: p.id,
      name: p.name,
      created: new Date(p.updatedAt).getTime(),
    }));
  }
}

// Export singleton instance
export const projectManager = new ProjectManager();
