import { Router } from 'express';
import { exec } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { promisify } from 'util';
import { glob } from 'glob';

const execAsync = promisify(exec);
const router = Router();

// Helper to execute shell commands
async function execCommand(command: string, cwd: string = process.cwd()) {
  try {
    const { stdout, stderr } = await execAsync(command, { cwd });
    return { stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error: unknown) {
    const err = error as { stderr?: string; message?: string };
    throw new Error(err.stderr || err.message || String(error));
  }
}

// --- Health & Info ---

router.get('/health', async (req, res) => {
  try {
    await execCommand('gh --version');
    const { stdout } = await execCommand('gh auth status');
    res.json({
      ok: true,
      status: 'connected',
      details: stdout,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      ok: false,
      status: 'disconnected',
      error: message,
    });
  }
});

router.get('/info', async (req, res) => {
  try {
    const { stdout } = await execCommand(
      'gh repo view --json name,owner,description,url,defaultBranchRef'
    );
    res.json({ ok: true, info: JSON.parse(stdout) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: message });
  }
});

router.get('/issues', async (req, res) => {
  try {
    const limit = req.query['limit'] || 10;
    const { stdout } = await execCommand(
      `gh issue list --limit ${limit} --json number,title,state,url,createdAt,updatedAt`
    );
    res.json({ ok: true, issues: JSON.parse(stdout) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: message });
  }
});

// --- File Operations ---

router.post('/file', async (req, res) => {
  const { path: filePath } = req.body;
  if (!filePath) {
    return res.status(400).json({ ok: false, error: 'Path is required' });
  }

  try {
    const fullPath = path.resolve(process.cwd(), filePath);
    if (!fullPath.startsWith(process.cwd())) {
      return res.status(403).json({ ok: false, error: 'Access denied' });
    }

    if (!(await fs.pathExists(fullPath))) {
      return res.status(404).json({ ok: false, error: 'File not found' });
    }

    const content = await fs.readFile(fullPath, 'utf-8');
    res.json({ ok: true, content });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: message });
  }
});

router.post('/files', async (req, res) => {
  const { paths } = req.body;
  if (!Array.isArray(paths)) {
    return res.status(400).json({ ok: false, error: 'Paths array is required' });
  }

  try {
    const files: Record<string, string> = {};
    for (const filePath of paths) {
      const fullPath = path.resolve(process.cwd(), filePath);
      if (fullPath.startsWith(process.cwd()) && (await fs.pathExists(fullPath))) {
        files[filePath] = await fs.readFile(fullPath, 'utf-8');
      }
    }
    res.json({ ok: true, files });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: message });
  }
});

router.get('/structure', async (req, res) => {
  try {
    const files = glob.sync('**/*', {
      cwd: process.cwd(),
      ignore: ['node_modules/**', '.git/**', 'dist/**', 'coverage/**'],
      nodir: true,
    });
    res.json({ ok: true, structure: files });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: message });
  }
});

router.get('/context', async (req, res) => {
  try {
    // Get structure
    const structure = glob.sync('**/*', {
      cwd: process.cwd(),
      ignore: ['node_modules/**', '.git/**', 'dist/**', 'coverage/**'],
      nodir: true,
    });

    // Get key files content (README, package.json, tsconfig.json)
    const keyFiles = ['README.md', 'package.json', 'tsconfig.json'];
    const files: Record<string, string> = {};

    for (const file of keyFiles) {
      if (await fs.pathExists(file)) {
        files[file] = await fs.readFile(file, 'utf-8');
      }
    }

    res.json({
      ok: true,
      context: {
        structure,
        files,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: message });
  }
});

// --- Write Operations ---

router.post('/update-file', async (req, res) => {
  const { file, content, message, branch } = req.body;
  if (!file || content === undefined) {
    return res.status(400).json({ ok: false, error: 'File and content required' });
  }

  try {
    const fullPath = path.resolve(process.cwd(), file);
    await fs.outputFile(fullPath, content);

    // If message is provided, commit the change
    if (message) {
      const targetBranch = branch || 'main';
      // Check if we need to switch branch
      const { stdout: currentBranch } = await execCommand('git branch --show-current');

      if (currentBranch !== targetBranch) {
        // This is a simplified logic; in a real agent scenario, we might want to be more careful
        // For now, we assume we are working on the current branch or the user handles branching
      }

      await execCommand(`git add "${file}"`);
      await execCommand(`git commit -m "${message}"`);
      // await execCommand(`git push origin ${targetBranch}`); // Optional: push immediately
    }

    res.json({ ok: true, message: `File ${file} updated` });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: message });
  }
});

router.post('/create-branch', async (req, res) => {
  const { name, base } = req.body;
  if (!name) {
    return res.status(400).json({ ok: false, error: 'Branch name required' });
  }

  try {
    const baseBranch = base || 'main';
    await execCommand(`git checkout -b ${name} ${baseBranch}`);
    // await execCommand(`git push -u origin ${name}`); // Optional
    res.json({
      ok: true,
      message: `Branch ${name} created from ${baseBranch}`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: message });
  }
});

router.post('/create-pr', async (req, res) => {
  const { title, body, base, head } = req.body;
  if (!title || !body) {
    return res.status(400).json({ ok: false, error: 'Title and body required' });
  }

  try {
    const baseArg = base ? `--base ${base}` : '';
    const headArg = head ? `--head ${head}` : '';
    const { stdout } = await execCommand(
      `gh pr create --title "${title}" --body "${body}" ${baseArg} ${headArg}`
    );
    res.json({ ok: true, url: stdout });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: message });
  }
});

router.post('/create-issue', async (req, res) => {
  const { title, body, labels } = req.body;
  if (!title || !body) {
    return res.status(400).json({ ok: false, error: 'Title and body required' });
  }

  try {
    const labelsArg = labels ? `--label "${labels.join('","')}"` : '';
    const { stdout } = await execCommand(
      `gh issue create --title "${title}" --body "${body}" ${labelsArg}`
    );
    res.json({ ok: true, url: stdout });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: message });
  }
});

router.patch('/pr/:number', async (req, res) => {
  const { number } = req.params;
  const { title, body } = req.body;

  try {
    let command = `gh pr edit ${number}`;
    if (title) command += ` --title "${title}"`;
    if (body) command += ` --body "${body}"`;

    const { stdout } = await execCommand(command);
    res.json({ ok: true, url: stdout });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: message });
  }
});

router.put('/pr/:number/merge', async (req, res) => {
  const { number } = req.params;
  const { method } = req.body; // merge, squash, rebase

  try {
    const methodArg = method ? `--${method}` : '--merge';
    const { stdout } = await execCommand(`gh pr merge ${number} ${methodArg} --auto`);
    res.json({ ok: true, message: 'PR merged' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: message });
  }
});

router.post('/comment', async (req, res) => {
  const { issueNumber, body } = req.body;
  if (!issueNumber || !body) {
    return res.status(400).json({ ok: false, error: 'Issue number and body required' });
  }

  try {
    const { stdout } = await execCommand(`gh issue comment ${issueNumber} --body "${body}"`);
    res.json({ ok: true, url: stdout });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: message });
  }
});

export default router;
