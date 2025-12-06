// @version 2.1.32
import { Router } from 'express';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const PROJECTS_DIR = path.join(process.cwd(), 'projects');

// Ensure projects dir exists
fs.ensureDirSync(PROJECTS_DIR);

// Helper to get project path
const getProjectPath = (id: string) => path.join(PROJECTS_DIR, id);

// List Projects
router.get('/', async (req, res) => {
  try {
    const dirs = await fs.readdir(PROJECTS_DIR);
    const projects = [];

    for (const dir of dirs) {
      const configPath = path.join(PROJECTS_DIR, dir, 'tooloo.json');
      if (await fs.pathExists(configPath)) {
        const config = await fs.readJson(configPath);
        projects.push(config);
      }
    }

    res.json({ ok: true, projects });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Create Project
/**
 * @description Create a new project
 * @param {string} name - Project name
 * @param {string} [description] - Project description
 * @param {string} [type] - Project type (default: general)
 */
router.post('/', async (req, res) => {
  const { name, description, type } = req.body;
  if (!name) return res.status(400).json({ ok: false, error: 'Name required' });

  const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const projectPath = getProjectPath(id);

  if (await fs.pathExists(projectPath)) {
    return res.status(409).json({ ok: false, error: 'Project already exists' });
  }

  try {
    await fs.ensureDir(projectPath);

    const config = {
      id,
      name,
      description,
      type: type || 'general',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await fs.writeJson(path.join(projectPath, 'tooloo.json'), config, {
      spaces: 2,
    });

    // Initialize structure
    await fs.ensureDir(path.join(projectPath, 'src'));
    await fs.ensureDir(path.join(projectPath, 'docs'));
    await fs.writeJson(path.join(projectPath, 'memory.json'), {
      shortTerm: '',
      longTerm: '',
    });
    await fs.writeJson(path.join(projectPath, 'tasks.json'), []);

    res.json({ ok: true, project: config });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Get Project Details
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const projectPath = getProjectPath(id);

  if (!(await fs.pathExists(projectPath))) {
    return res.status(404).json({ ok: false, error: 'Project not found' });
  }

  try {
    const project = await fs.readJson(path.join(projectPath, 'tooloo.json'));
    const memory = await fs.readJson(path.join(projectPath, 'memory.json'));

    res.json({ ok: true, project, memory });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Get Tasks
router.get('/:id/tasks', async (req, res) => {
  const { id } = req.params;
  const projectPath = getProjectPath(id);

  try {
    const tasks = await fs.readJson(path.join(projectPath, 'tasks.json'));
    res.json({ ok: true, tasks });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Update Tasks
router.post('/:id/tasks', async (req, res) => {
  const { id } = req.params;
  const { tasks } = req.body;
  const projectPath = getProjectPath(id);

  try {
    await fs.writeJson(path.join(projectPath, 'tasks.json'), tasks, {
      spaces: 2,
    });
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Update Memory
router.post('/:id/memory', async (req, res) => {
  const { id } = req.params;
  const { type, content } = req.body;
  const projectPath = getProjectPath(id);

  try {
    const memoryPath = path.join(projectPath, 'memory.json');
    const memory = await fs.readJson(memoryPath);

    if (type === 'short-term') memory.shortTerm = content;
    if (type === 'long-term') memory.longTerm = content;

    await fs.writeJson(memoryPath, memory, { spaces: 2 });
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// List Files
router.get('/:id/files', async (req, res) => {
  const { id } = req.params;
  const subPath = (req.query['path'] as string) || '.';
  const projectPath = getProjectPath(id);
  const targetPath = path.join(projectPath, subPath);

  // Security check
  if (!targetPath.startsWith(projectPath)) {
    return res.status(403).json({ ok: false, error: 'Access denied' });
  }

  try {
    const items = await fs.readdir(targetPath, { withFileTypes: true });
    const files = items.map((item) => ({
      name: item.name,
      type: item.isDirectory() ? 'folder' : 'file',
      path: path.join(subPath, item.name),
    }));

    res.json({ ok: true, files });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Get File Content
router.get('/:id/files/content', async (req, res) => {
  const { id } = req.params;
  const subPath = req.query['path'] as string;
  const projectPath = getProjectPath(id);
  const targetPath = path.join(projectPath, subPath);

  if (!targetPath.startsWith(projectPath)) {
    return res.status(403).json({ ok: false, error: 'Access denied' });
  }

  try {
    const content = await fs.readFile(targetPath, 'utf-8');
    res.json({ ok: true, content });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Save File Content
router.post('/:id/files/content', async (req, res) => {
  const { id } = req.params;
  const { path: subPath, content } = req.body;
  const projectPath = getProjectPath(id);
  const targetPath = path.join(projectPath, subPath);

  if (!targetPath.startsWith(projectPath)) {
    return res.status(403).json({ ok: false, error: 'Access denied' });
  }

  try {
    await fs.outputFile(targetPath, content);
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Deploy Project
router.post('/:id/deploy', async (req, res) => {
  const { id } = req.params;
  const { target, config } = req.body;
  const projectPath = getProjectPath(id);

  if (!(await fs.pathExists(projectPath))) {
    return res.status(404).json({ ok: false, error: 'Project not found' });
  }

  try {
    console.log(`[Nexus] Deploying project ${id} to ${target}`);
    // In a real scenario, this would trigger a build/deploy pipeline
    // For now, we just acknowledge the request

    // Simulate deployment delay
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
