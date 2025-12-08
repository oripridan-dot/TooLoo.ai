// @version 3.3.382
/**
 * Projects API Routes - Figma/GitHub-style Project Management
 *
 * Full-featured project management with:
 * - Versioning & Branching
 * - Starring & Forking
 * - Collaborator Management
 * - Rich Metadata & Activity Tracking
 *
 * @module nexus/routes/projects
 */

import { Router } from 'express';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type {
  Project,
  ProjectListItem,
  ProjectListFilter,
  CreateProjectInput,
  UpdateProjectInput,
  Branch,
  Version,
  ProjectActivity,
  Commit,
  BranchCreateInput,
  ForkProjectInput,
  ProjectTemplate,
  ProjectStats,
} from '../../shared/types/project.types.js';

const router = Router();
const PROJECTS_DIR = path.join(process.cwd(), 'projects');
const PROJECTS_INDEX = path.join(PROJECTS_DIR, '.index.json');

// Ensure projects dir exists
fs.ensureDirSync(PROJECTS_DIR);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getProjectPath = (id: string) => path.join(PROJECTS_DIR, id);

const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 64);
};

const generateHash = (): string => {
  return Math.random().toString(36).substring(2, 10);
};

const createDefaultStats = (): ProjectStats => ({
  stars: 0,
  forks: 0,
  views: 0,
  branches: 1,
  commits: 1,
  collaborators: 1,
  files: 0,
  sizeBytes: 0,
});

const createDefaultBranch = (projectId: string, name = 'main'): Branch => ({
  id: `branch-${uuidv4()}`,
  name,
  description: 'Default branch',
  status: 'active',
  isDefault: true,
  isProtected: true,
  createdAt: new Date().toISOString(),
  createdBy: 'system',
  lastCommitAt: new Date().toISOString(),
  aheadBy: 0,
  behindBy: 0,
});

const createInitialCommit = (branch: string): Commit => ({
  id: `commit-${uuidv4()}`,
  hash: generateHash(),
  message: 'Initial commit',
  author: 'system',
  timestamp: new Date().toISOString(),
  branch,
  files: [],
});

const createActivity = (
  type: ProjectActivity['type'],
  actor: string,
  description: string
): ProjectActivity => ({
  id: `activity-${uuidv4()}`,
  type,
  actor,
  description,
  timestamp: new Date().toISOString(),
});

// Load/save project index (for quick listing)
let projectIndex: Map<string, ProjectListItem> = new Map();

const loadProjectIndex = async () => {
  try {
    if (await fs.pathExists(PROJECTS_INDEX)) {
      const data = await fs.readJson(PROJECTS_INDEX);
      projectIndex = new Map(Object.entries(data));
    }
  } catch (e) {
    console.error('[Projects] Failed to load index:', e);
    projectIndex = new Map();
  }
};

const saveProjectIndex = async () => {
  try {
    const data = Object.fromEntries(projectIndex);
    await fs.writeJson(PROJECTS_INDEX, data, { spaces: 2 });
  } catch (e) {
    console.error('[Projects] Failed to save index:', e);
  }
};

const updateProjectIndex = (project: Project) => {
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
  projectIndex.set(project.id, item);
};

// Initialize index on module load
loadProjectIndex();

// ============================================================================
// PROJECT CRUD
// ============================================================================

/**
 * List all projects with filtering & pagination
 * GET /api/v1/projects
 */
router.get('/', async (req, res) => {
  try {
    const filter: ProjectListFilter = {
      type: req.query.type ? (req.query.type as string).split(',') as any : undefined,
      status: req.query.status ? (req.query.status as string).split(',') as any : undefined,
      visibility: req.query.visibility ? (req.query.visibility as string).split(',') as any : undefined,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      search: req.query.search as string,
      starred: req.query.starred === 'true',
      sortBy: (req.query.sortBy as any) || 'updatedAt',
      sortOrder: (req.query.sortOrder as any) || 'desc',
      limit: parseInt(req.query.limit as string) || 50,
      offset: parseInt(req.query.offset as string) || 0,
    };

    // Reload index to get latest
    await loadProjectIndex();

    let projects = Array.from(projectIndex.values());

    // Apply filters
    if (filter.type?.length) {
      projects = projects.filter((p) => filter.type!.includes(p.type));
    }
    if (filter.status?.length) {
      projects = projects.filter((p) => filter.status!.includes(p.status));
    }
    if (filter.visibility?.length) {
      projects = projects.filter((p) => filter.visibility!.includes(p.visibility));
    }
    if (filter.tags?.length) {
      projects = projects.filter((p) => filter.tags!.some((t) => p.tags.includes(t)));
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
      const aVal = a[sortKey as keyof ProjectListItem] ?? '';
      const bVal = b[sortKey as keyof ProjectListItem] ?? '';
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal) * sortDir;
      }
      return ((aVal as number) - (bVal as number)) * sortDir;
    });

    // Paginate
    const total = projects.length;
    const offset = filter.offset || 0;
    const limit = filter.limit || 50;
    projects = projects.slice(offset, offset + limit);

    res.json({
      ok: true,
      projects,
      total,
      hasMore: offset + projects.length < total,
    });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * Create a new project
 * POST /api/v1/projects
 */
router.post('/', async (req, res) => {
  const input: CreateProjectInput = req.body;

  if (!input.name) {
    return res.status(400).json({ ok: false, error: 'Project name is required' });
  }

  const id = uuidv4();
  const slug = generateSlug(input.name);
  const projectPath = getProjectPath(id);

  // Check for slug collision
  const existingWithSlug = Array.from(projectIndex.values()).find((p) => p.slug === slug);
  if (existingWithSlug) {
    return res.status(409).json({ ok: false, error: 'A project with a similar name already exists' });
  }

  try {
    const now = new Date().toISOString();
    const defaultBranch = createDefaultBranch(id);

    const project: Project = {
      id,
      slug,
      name: input.name,
      description: input.description || '',
      type: input.type || 'general',
      status: 'active',
      thumbnail: undefined,
      icon: input.icon || '📁',
      color: input.color || '#6366f1',
      owner: 'user', // TODO: Get from auth
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
      defaultBranch: defaultBranch.name,
      tags: input.tags || [],
      stats: createDefaultStats(),
      settings: {
        defaultBranch: defaultBranch.name,
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
      recentActivity: [createActivity('commit', 'system', 'Project created')],
      createdAt: now,
      updatedAt: now,
      templateId: input.templateId,
    };

    // Create project directory structure
    await fs.ensureDir(projectPath);
    await fs.ensureDir(path.join(projectPath, 'src'));
    await fs.ensureDir(path.join(projectPath, 'docs'));
    await fs.ensureDir(path.join(projectPath, 'assets'));
    await fs.ensureDir(path.join(projectPath, '.tooloo'));
    await fs.ensureDir(path.join(projectPath, '.tooloo', 'branches'));
    await fs.ensureDir(path.join(projectPath, '.tooloo', 'versions'));

    // Save project config
    await fs.writeJson(path.join(projectPath, 'tooloo.json'), project, { spaces: 2 });

    // Save initial commit
    const initialCommit = createInitialCommit(defaultBranch.name);
    await fs.writeJson(
      path.join(projectPath, '.tooloo', 'commits.json'),
      [initialCommit],
      { spaces: 2 }
    );

    // Create README
    await fs.writeFile(
      path.join(projectPath, 'README.md'),
      `# ${input.name}\n\n${input.description || 'A TooLoo.ai project'}\n\n## Getting Started\n\nThis project was created with TooLoo.ai.\n`
    );

    // Update index
    updateProjectIndex(project);
    await saveProjectIndex();

    console.log(`[Projects] Created project: ${project.name} (${project.id})`);

    res.json({ ok: true, project });
  } catch (error: any) {
    // Cleanup on error
    await fs.remove(projectPath).catch(() => {});
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * Get project by ID
 * GET /api/v1/projects/:id
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const projectPath = getProjectPath(id);

  if (!(await fs.pathExists(projectPath))) {
    return res.status(404).json({ ok: false, error: 'Project not found' });
  }

  try {
    const project: Project = await fs.readJson(path.join(projectPath, 'tooloo.json'));

    // Increment view count
    project.stats.views++;
    project.lastOpenedAt = new Date().toISOString();
    await fs.writeJson(path.join(projectPath, 'tooloo.json'), project, { spaces: 2 });

    res.json({ ok: true, project });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * Update project
 * PATCH /api/v1/projects/:id
 */
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const updates: UpdateProjectInput = req.body;
  const projectPath = getProjectPath(id);

  if (!(await fs.pathExists(projectPath))) {
    return res.status(404).json({ ok: false, error: 'Project not found' });
  }

  try {
    const project: Project = await fs.readJson(path.join(projectPath, 'tooloo.json'));
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
    project.recentActivity.unshift(createActivity('update', 'user', 'Project updated'));
    project.recentActivity = project.recentActivity.slice(0, 50); // Keep last 50 activities

    await fs.writeJson(path.join(projectPath, 'tooloo.json'), project, { spaces: 2 });

    // Update index
    updateProjectIndex(project);
    await saveProjectIndex();

    res.json({ ok: true, project });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * Delete project
 * DELETE /api/v1/projects/:id
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const projectPath = getProjectPath(id);

  if (!(await fs.pathExists(projectPath))) {
    return res.status(404).json({ ok: false, error: 'Project not found' });
  }

  try {
    await fs.remove(projectPath);
    projectIndex.delete(id);
    await saveProjectIndex();

    console.log(`[Projects] Deleted project: ${id}`);
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// STARRING
// ============================================================================

/**
 * Star/unstar a project
 * POST /api/v1/projects/:id/star
 */
router.post('/:id/star', async (req, res) => {
  const { id } = req.params;
  const { starred } = req.body;
  const projectPath = getProjectPath(id);

  if (!(await fs.pathExists(projectPath))) {
    return res.status(404).json({ ok: false, error: 'Project not found' });
  }

  try {
    const project: Project = await fs.readJson(path.join(projectPath, 'tooloo.json'));

    if (starred) {
      project.stats.stars++;
      project.recentActivity.unshift(createActivity('star', 'user', 'Project starred'));
    } else {
      project.stats.stars = Math.max(0, project.stats.stars - 1);
    }

    await fs.writeJson(path.join(projectPath, 'tooloo.json'), project, { spaces: 2 });
    updateProjectIndex(project);
    await saveProjectIndex();

    res.json({ ok: true, stars: project.stats.stars });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// FORKING
// ============================================================================

/**
 * Fork a project
 * POST /api/v1/projects/:id/fork
 */
router.post('/:id/fork', async (req, res) => {
  const { id } = req.params;
  const input: ForkProjectInput = { ...req.body, sourceId: id };
  const sourceProjectPath = getProjectPath(id);

  if (!(await fs.pathExists(sourceProjectPath))) {
    return res.status(404).json({ ok: false, error: 'Source project not found' });
  }

  try {
    const sourceProject: Project = await fs.readJson(
      path.join(sourceProjectPath, 'tooloo.json')
    );

    // Check if forking is allowed
    if (!sourceProject.access.allowForks && sourceProject.access.visibility !== 'public') {
      return res.status(403).json({ ok: false, error: 'Forking is not allowed for this project' });
    }

    const newId = uuidv4();
    const newName = input.name || `${sourceProject.name} (Fork)`;
    const newSlug = generateSlug(newName);
    const newProjectPath = getProjectPath(newId);

    // Copy project
    await fs.copy(sourceProjectPath, newProjectPath);

    // Update forked project
    const now = new Date().toISOString();
    const newProject: Project = {
      ...sourceProject,
      id: newId,
      slug: newSlug,
      name: newName,
      description: input.description || sourceProject.description,
      parentId: id,
      owner: 'user', // TODO: Get from auth
      access: {
        ...sourceProject.access,
        visibility: input.visibility || 'private',
        collaborators: [
          {
            id: 'user',
            name: 'Owner',
            role: 'owner',
            addedAt: now,
          },
        ],
      },
      stats: createDefaultStats(),
      recentActivity: [createActivity('fork', 'user', `Forked from ${sourceProject.name}`)],
      createdAt: now,
      updatedAt: now,
    };

    await fs.writeJson(path.join(newProjectPath, 'tooloo.json'), newProject, { spaces: 2 });

    // Update source project stats
    sourceProject.stats.forks++;
    sourceProject.recentActivity.unshift(
      createActivity('fork', 'user', `Project forked by user`)
    );
    await fs.writeJson(path.join(sourceProjectPath, 'tooloo.json'), sourceProject, { spaces: 2 });

    // Update indexes
    updateProjectIndex(newProject);
    updateProjectIndex(sourceProject);
    await saveProjectIndex();

    console.log(`[Projects] Forked project: ${sourceProject.name} -> ${newProject.name}`);

    res.json({ ok: true, project: newProject });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// BRANCHING
// ============================================================================

/**
 * List branches
 * GET /api/v1/projects/:id/branches
 */
router.get('/:id/branches', async (req, res) => {
  const { id } = req.params;
  const projectPath = getProjectPath(id);

  if (!(await fs.pathExists(projectPath))) {
    return res.status(404).json({ ok: false, error: 'Project not found' });
  }

  try {
    const project: Project = await fs.readJson(path.join(projectPath, 'tooloo.json'));
    res.json({ ok: true, branches: project.branches });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * Create branch
 * POST /api/v1/projects/:id/branches
 */
router.post('/:id/branches', async (req, res) => {
  const { id } = req.params;
  const input: BranchCreateInput = { ...req.body, projectId: id };
  const projectPath = getProjectPath(id);

  if (!input.name) {
    return res.status(400).json({ ok: false, error: 'Branch name is required' });
  }

  if (!(await fs.pathExists(projectPath))) {
    return res.status(404).json({ ok: false, error: 'Project not found' });
  }

  try {
    const project: Project = await fs.readJson(path.join(projectPath, 'tooloo.json'));

    // Check if branch already exists
    if (project.branches.some((b) => b.name === input.name)) {
      return res.status(409).json({ ok: false, error: 'Branch already exists' });
    }

    const now = new Date().toISOString();
    const newBranch: Branch = {
      id: `branch-${uuidv4()}`,
      name: input.name,
      description: input.description || '',
      status: 'active',
      isDefault: false,
      isProtected: false,
      createdAt: now,
      createdBy: 'user',
      lastCommitAt: now,
      aheadBy: 0,
      behindBy: 0,
      parentBranch: input.fromBranch || project.defaultBranch,
    };

    project.branches.push(newBranch);
    project.stats.branches++;
    project.updatedAt = now;
    project.recentActivity.unshift(createActivity('branch', 'user', `Created branch: ${input.name}`));

    await fs.writeJson(path.join(projectPath, 'tooloo.json'), project, { spaces: 2 });

    res.json({ ok: true, branch: newBranch });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * Delete branch
 * DELETE /api/v1/projects/:id/branches/:branchName
 */
router.delete('/:id/branches/:branchName', async (req, res) => {
  const { id, branchName } = req.params;
  const projectPath = getProjectPath(id);

  if (!(await fs.pathExists(projectPath))) {
    return res.status(404).json({ ok: false, error: 'Project not found' });
  }

  try {
    const project: Project = await fs.readJson(path.join(projectPath, 'tooloo.json'));

    const branchIndex = project.branches.findIndex((b) => b.name === branchName);
    if (branchIndex === -1) {
      return res.status(404).json({ ok: false, error: 'Branch not found' });
    }

    const branch = project.branches[branchIndex];
    if (branch.isDefault) {
      return res.status(400).json({ ok: false, error: 'Cannot delete default branch' });
    }
    if (branch.isProtected) {
      return res.status(400).json({ ok: false, error: 'Cannot delete protected branch' });
    }

    project.branches.splice(branchIndex, 1);
    project.stats.branches = Math.max(1, project.stats.branches - 1);
    project.updatedAt = new Date().toISOString();
    project.recentActivity.unshift(createActivity('branch', 'user', `Deleted branch: ${branchName}`));

    await fs.writeJson(path.join(projectPath, 'tooloo.json'), project, { spaces: 2 });

    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// VERSIONING
// ============================================================================

/**
 * List versions
 * GET /api/v1/projects/:id/versions
 */
router.get('/:id/versions', async (req, res) => {
  const { id } = req.params;
  const projectPath = getProjectPath(id);

  if (!(await fs.pathExists(projectPath))) {
    return res.status(404).json({ ok: false, error: 'Project not found' });
  }

  try {
    const project: Project = await fs.readJson(path.join(projectPath, 'tooloo.json'));
    res.json({ ok: true, versions: project.versions });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * Create version (release)
 * POST /api/v1/projects/:id/versions
 */
router.post('/:id/versions', async (req, res) => {
  const { id } = req.params;
  const { number, name, description, isRelease = false } = req.body;
  const projectPath = getProjectPath(id);

  if (!number) {
    return res.status(400).json({ ok: false, error: 'Version number is required' });
  }

  if (!(await fs.pathExists(projectPath))) {
    return res.status(404).json({ ok: false, error: 'Project not found' });
  }

  try {
    const project: Project = await fs.readJson(path.join(projectPath, 'tooloo.json'));

    // Check if version already exists
    if (project.versions.some((v) => v.number === number)) {
      return res.status(409).json({ ok: false, error: 'Version already exists' });
    }

    const now = new Date().toISOString();
    const newVersion: Version = {
      id: `ver-${uuidv4()}`,
      number,
      name: name || `Version ${number}`,
      description: description || '',
      createdAt: now,
      createdBy: 'user',
      commitHash: generateHash(),
      tags: isRelease ? ['release'] : [],
      isRelease,
    };

    project.versions.push(newVersion);
    project.currentVersion = number;
    project.updatedAt = now;
    project.recentActivity.unshift(
      createActivity('commit', 'user', `Created version: ${number}${isRelease ? ' (release)' : ''}`)
    );

    // Create version snapshot
    const versionDir = path.join(projectPath, '.tooloo', 'versions', number);
    await fs.ensureDir(versionDir);
    await fs.writeJson(path.join(versionDir, 'version.json'), newVersion, { spaces: 2 });

    await fs.writeJson(path.join(projectPath, 'tooloo.json'), project, { spaces: 2 });
    updateProjectIndex(project);
    await saveProjectIndex();

    res.json({ ok: true, version: newVersion });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// MEMORY (AI Context)
// ============================================================================

/**
 * Get project memory
 * GET /api/v1/projects/:id/memory
 */
router.get('/:id/memory', async (req, res) => {
  const { id } = req.params;
  const projectPath = getProjectPath(id);

  if (!(await fs.pathExists(projectPath))) {
    return res.status(404).json({ ok: false, error: 'Project not found' });
  }

  try {
    const project: Project = await fs.readJson(path.join(projectPath, 'tooloo.json'));
    res.json({ ok: true, memory: project.memory });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * Update project memory
 * POST /api/v1/projects/:id/memory
 */
router.post('/:id/memory', async (req, res) => {
  const { id } = req.params;
  const { shortTerm, longTerm, context, preferences } = req.body;
  const projectPath = getProjectPath(id);

  if (!(await fs.pathExists(projectPath))) {
    return res.status(404).json({ ok: false, error: 'Project not found' });
  }

  try {
    const project: Project = await fs.readJson(path.join(projectPath, 'tooloo.json'));

    if (shortTerm !== undefined) project.memory.shortTerm = shortTerm;
    if (longTerm !== undefined) project.memory.longTerm = longTerm;
    if (context !== undefined) project.memory.context = context;
    if (preferences !== undefined) project.memory.preferences = preferences;

    project.updatedAt = new Date().toISOString();

    await fs.writeJson(path.join(projectPath, 'tooloo.json'), project, { spaces: 2 });

    res.json({ ok: true, memory: project.memory });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// FILES
// ============================================================================

/**
 * List files in project
 * GET /api/v1/projects/:id/files
 */
router.get('/:id/files', async (req, res) => {
  const { id } = req.params;
  const subPath = (req.query['path'] as string) || '.';
  const projectPath = getProjectPath(id);
  const targetPath = path.join(projectPath, subPath);

  // Security check
  if (!targetPath.startsWith(projectPath)) {
    return res.status(403).json({ ok: false, error: 'Access denied' });
  }

  if (!(await fs.pathExists(projectPath))) {
    return res.status(404).json({ ok: false, error: 'Project not found' });
  }

  try {
    const items = await fs.readdir(targetPath, { withFileTypes: true });
    const files = await Promise.all(
      items
        .filter((item) => !item.name.startsWith('.')) // Hide dotfiles
        .map(async (item) => {
          const itemPath = path.join(targetPath, item.name);
          const stats = await fs.stat(itemPath);
          return {
            name: item.name,
            type: item.isDirectory() ? 'folder' : 'file',
            path: path.join(subPath, item.name),
            size: stats.size,
            modifiedAt: stats.mtime.toISOString(),
          };
        })
    );

    // Sort: folders first, then files
    files.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    res.json({ ok: true, files, path: subPath });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * Get file content
 * GET /api/v1/projects/:id/files/content
 */
router.get('/:id/files/content', async (req, res) => {
  const { id } = req.params;
  const subPath = req.query['path'] as string;
  const projectPath = getProjectPath(id);
  const targetPath = path.join(projectPath, subPath);

  if (!subPath) {
    return res.status(400).json({ ok: false, error: 'File path is required' });
  }

  if (!targetPath.startsWith(projectPath)) {
    return res.status(403).json({ ok: false, error: 'Access denied' });
  }

  try {
    const content = await fs.readFile(targetPath, 'utf-8');
    const stats = await fs.stat(targetPath);

    res.json({
      ok: true,
      content,
      path: subPath,
      size: stats.size,
      modifiedAt: stats.mtime.toISOString(),
    });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ ok: false, error: 'File not found' });
    }
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * Save file content
 * POST /api/v1/projects/:id/files/content
 */
router.post('/:id/files/content', async (req, res) => {
  const { id } = req.params;
  const { path: subPath, content, message } = req.body;
  const projectPath = getProjectPath(id);
  const targetPath = path.join(projectPath, subPath);

  if (!subPath || content === undefined) {
    return res.status(400).json({ ok: false, error: 'File path and content are required' });
  }

  if (!targetPath.startsWith(projectPath)) {
    return res.status(403).json({ ok: false, error: 'Access denied' });
  }

  try {
    await fs.outputFile(targetPath, content);

    // Update project activity
    const project: Project = await fs.readJson(path.join(projectPath, 'tooloo.json'));
    project.updatedAt = new Date().toISOString();
    project.recentActivity.unshift(
      createActivity('commit', 'user', message || `Updated file: ${subPath}`)
    );
    project.recentActivity = project.recentActivity.slice(0, 50);

    await fs.writeJson(path.join(projectPath, 'tooloo.json'), project, { spaces: 2 });
    updateProjectIndex(project);
    await saveProjectIndex();

    res.json({ ok: true, path: subPath });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * Delete file or folder
 * DELETE /api/v1/projects/:id/files
 */
router.delete('/:id/files', async (req, res) => {
  const { id } = req.params;
  const subPath = req.query['path'] as string;
  const projectPath = getProjectPath(id);
  const targetPath = path.join(projectPath, subPath);

  if (!subPath) {
    return res.status(400).json({ ok: false, error: 'File path is required' });
  }

  if (!targetPath.startsWith(projectPath)) {
    return res.status(403).json({ ok: false, error: 'Access denied' });
  }

  // Prevent deleting root or config
  const protectedPaths = ['tooloo.json', '.tooloo'];
  if (protectedPaths.some((p) => subPath === p || subPath.startsWith(p + '/'))) {
    return res.status(403).json({ ok: false, error: 'Cannot delete protected files' });
  }

  try {
    await fs.remove(targetPath);

    // Update project activity
    const project: Project = await fs.readJson(path.join(projectPath, 'tooloo.json'));
    project.updatedAt = new Date().toISOString();
    project.recentActivity.unshift(createActivity('commit', 'user', `Deleted: ${subPath}`));
    project.recentActivity = project.recentActivity.slice(0, 50);

    await fs.writeJson(path.join(projectPath, 'tooloo.json'), project, { spaces: 2 });

    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// ACTIVITY
// ============================================================================

/**
 * Get project activity
 * GET /api/v1/projects/:id/activity
 */
router.get('/:id/activity', async (req, res) => {
  const { id } = req.params;
  const limit = parseInt(req.query.limit as string) || 20;
  const projectPath = getProjectPath(id);

  if (!(await fs.pathExists(projectPath))) {
    return res.status(404).json({ ok: false, error: 'Project not found' });
  }

  try {
    const project: Project = await fs.readJson(path.join(projectPath, 'tooloo.json'));
    const activity = project.recentActivity.slice(0, limit);

    res.json({ ok: true, activity, total: project.recentActivity.length });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// TEMPLATES
// ============================================================================

/**
 * List project templates
 * GET /api/v1/projects/templates
 */
router.get('/templates/list', async (_req, res) => {
  const templates: ProjectTemplate[] = [
    {
      id: 'blank',
      name: 'Blank Project',
      description: 'Start from scratch with an empty project',
      category: 'General',
      icon: '📄',
      color: '#6366f1',
      structure: {
        folders: ['src', 'docs', 'assets'],
        files: [{ path: 'README.md', template: '# {{name}}\n\n{{description}}' }],
        settings: {},
      },
      tags: ['blank', 'empty'],
      usageCount: 0,
    },
    {
      id: 'web-app',
      name: 'Web Application',
      description: 'Full-stack web application with React and Node.js',
      category: 'Web',
      icon: '🌐',
      color: '#06b6d4',
      structure: {
        folders: ['src/client', 'src/server', 'src/shared', 'docs', 'tests'],
        files: [
          { path: 'README.md', template: '# {{name}}\n\n{{description}}\n\n## Getting Started\n\n```bash\nnpm install\nnpm run dev\n```' },
          { path: 'package.json', template: '{\n  "name": "{{slug}}",\n  "version": "0.1.0"\n}' },
        ],
        settings: { enableAI: true, aiAssistLevel: 'full' },
      },
      tags: ['web', 'react', 'nodejs'],
      usageCount: 0,
    },
    {
      id: 'api',
      name: 'API Service',
      description: 'RESTful API with Express and TypeScript',
      category: 'Backend',
      icon: '🔌',
      color: '#10b981',
      structure: {
        folders: ['src/routes', 'src/services', 'src/models', 'tests'],
        files: [
          { path: 'README.md', template: '# {{name}} API\n\n{{description}}' },
        ],
        settings: {},
      },
      tags: ['api', 'rest', 'express'],
      usageCount: 0,
    },
    {
      id: 'design-system',
      name: 'Design System',
      description: 'Component library with Storybook and tokens',
      category: 'Design',
      icon: '🎨',
      color: '#f43f5e',
      structure: {
        folders: ['src/components', 'src/tokens', 'src/themes', 'stories'],
        files: [],
        settings: {},
      },
      tags: ['design', 'components', 'storybook'],
      usageCount: 0,
    },
    {
      id: 'documentation',
      name: 'Documentation Site',
      description: 'Documentation with MDX and search',
      category: 'Content',
      icon: '📚',
      color: '#f59e0b',
      structure: {
        folders: ['docs', 'guides', 'api-reference', 'assets'],
        files: [],
        settings: {},
      },
      tags: ['docs', 'documentation', 'mdx'],
      usageCount: 0,
    },
  ];

  res.json({ ok: true, templates });
});

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

/**
 * Get tasks (legacy compatibility)
 * GET /api/v1/projects/:id/tasks
 */
router.get('/:id/tasks', async (req, res) => {
  const { id } = req.params;
  const projectPath = getProjectPath(id);
  const tasksPath = path.join(projectPath, 'tasks.json');

  try {
    if (await fs.pathExists(tasksPath)) {
      const tasks = await fs.readJson(tasksPath);
      res.json({ ok: true, tasks });
    } else {
      res.json({ ok: true, tasks: [] });
    }
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * Update tasks (legacy compatibility)
 * POST /api/v1/projects/:id/tasks
 */
router.post('/:id/tasks', async (req, res) => {
  const { id } = req.params;
  const { tasks } = req.body;
  const projectPath = getProjectPath(id);

  try {
    await fs.writeJson(path.join(projectPath, 'tasks.json'), tasks, { spaces: 2 });
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * Deploy project
 * POST /api/v1/projects/:id/deploy
 */
router.post('/:id/deploy', async (req, res) => {
  const { id } = req.params;
  const { target, config } = req.body;
  const projectPath = getProjectPath(id);

  if (!(await fs.pathExists(projectPath))) {
    return res.status(404).json({ ok: false, error: 'Project not found' });
  }

  try {
    console.log(`[Projects] Deploying project ${id} to ${target}`);

    // Update project activity
    const project: Project = await fs.readJson(path.join(projectPath, 'tooloo.json'));
    project.recentActivity.unshift(createActivity('update', 'user', `Deployed to ${target}`));
    await fs.writeJson(path.join(projectPath, 'tooloo.json'), project, { spaces: 2 });

    // Simulate deployment
    await new Promise((resolve) => setTimeout(resolve, 1500));

    res.json({
      ok: true,
      deploymentId: uuidv4(),
      status: 'deployed',
      target,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;
