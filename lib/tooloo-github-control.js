/**
 * TooLoo GitHub Control System
 * Provides full control over the TooLoo.ai repository
 * Manages branches, commits, PRs, and repository state
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';

const execAsync = promisify(exec);

export class GitHubControl {
  constructor(options = {}) {
    this.token = options.token || process.env.GITHUB_TOKEN;
    this.owner = options.owner || 'oripridan-dot';
    this.repo = options.repo || 'TooLoo.ai';
    this.basePath = options.basePath || process.cwd();
    this.apiBase = 'https://api.github.com';
  }

  /**
   * Get GitHub API headers with authentication
   */
  getHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };
  }

  /**
   * Get current branch
   */
  async getCurrentBranch() {
    try {
      const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: this.basePath });
      return stdout.trim();
    } catch (error) {
      throw new Error(`Failed to get current branch: ${error.message}`);
    }
  }

  /**
   * Create a new branch
   */
  async createBranch(branchName, baseBranch = 'main') {
    try {
      // Fetch latest from remote
      await execAsync('git fetch origin', { cwd: this.basePath });
      
      // Create and checkout branch
      await execAsync(`git checkout -b ${branchName} origin/${baseBranch}`, { cwd: this.basePath });
      
      return {
        success: true,
        branch: branchName,
        basedOn: baseBranch,
        message: `Branch '${branchName}' created from '${baseBranch}'`
      };
    } catch (error) {
      throw new Error(`Failed to create branch: ${error.message}`);
    }
  }

  /**
   * Switch to a branch
   */
  async switchBranch(branchName) {
    try {
      await execAsync(`git checkout ${branchName}`, { cwd: this.basePath });
      return {
        success: true,
        branch: branchName,
        message: `Switched to branch '${branchName}'`
      };
    } catch (error) {
      throw new Error(`Failed to switch branch: ${error.message}`);
    }
  }

  /**
   * Get list of branches
   */
  async listBranches(remote = false) {
    try {
      const flag = remote ? '-r' : '';
      const { stdout } = await execAsync(`git branch ${flag}`, { cwd: this.basePath });
      return stdout
        .trim()
        .split('\n')
        .map(b => b.trim())
        .filter(b => b.length > 0);
    } catch (error) {
      throw new Error(`Failed to list branches: ${error.message}`);
    }
  }

  /**
   * Get repository status
   */
  async getStatus() {
    try {
      const { stdout } = await execAsync('git status --porcelain', { cwd: this.basePath });
      const changes = stdout
        .trim()
        .split('\n')
        .filter(l => l.length > 0)
        .map(l => ({
          status: l.substring(0, 2),
          file: l.substring(3)
        }));

      return {
        branch: await this.getCurrentBranch(),
        changedFiles: changes.length,
        changes,
        clean: changes.length === 0
      };
    } catch (error) {
      throw new Error(`Failed to get status: ${error.message}`);
    }
  }

  /**
   * Stage changes for commit
   */
  async stageChanges(files = []) {
    try {
      if (files.length === 0) {
        // Stage all changes
        await execAsync('git add .', { cwd: this.basePath });
      } else {
        // Stage specific files
        for (const file of files) {
          await execAsync(`git add "${file}"`, { cwd: this.basePath });
        }
      }

      return {
        success: true,
        stagedFiles: files.length === 0 ? 'all' : files.length,
        message: 'Changes staged for commit'
      };
    } catch (error) {
      throw new Error(`Failed to stage changes: ${error.message}`);
    }
  }

  /**
   * Commit changes
   */
  async commit(message, author = { name: 'TooLoo.ai', email: 'tooloo@ai' }) {
    try {
      const authorFlag = `--author="${author.name} <${author.email}>"`;
      await execAsync(`git commit ${authorFlag} -m "${message}"`, { cwd: this.basePath });

      return {
        success: true,
        message,
        author,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to commit: ${error.message}`);
    }
  }

  /**
   * Push changes to remote
   */
  async push(branch = null, force = false) {
    try {
      const targetBranch = branch || await this.getCurrentBranch();
      const forceFlag = force ? '--force' : '';
      await execAsync(`git push origin ${targetBranch} ${forceFlag}`, { cwd: this.basePath });

      return {
        success: true,
        branch: targetBranch,
        message: `Pushed to origin/${targetBranch}`
      };
    } catch (error) {
      throw new Error(`Failed to push: ${error.message}`);
    }
  }

  /**
   * Create a pull request via GitHub API
   */
  async createPullRequest(title, body, head, base = 'main') {
    try {
      const response = await fetch(
        `${this.apiBase}/repos/${this.owner}/${this.repo}/pulls`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            title,
            body,
            head,
            base,
            maintainer_can_modify: true
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create PR');
      }

      const pr = await response.json();
      return {
        success: true,
        number: pr.number,
        url: pr.html_url,
        title: pr.title,
        branch: head
      };
    } catch (error) {
      throw new Error(`Failed to create PR: ${error.message}`);
    }
  }

  /**
   * Get recent commits
   */
  async getRecentCommits(limit = 10) {
    try {
      const { stdout } = await execAsync(
        `git log --oneline -${limit}`,
        { cwd: this.basePath }
      );

      return stdout
        .trim()
        .split('\n')
        .map(line => {
          const [hash, ...message] = line.split(' ');
          return { hash, message: message.join(' ') };
        });
    } catch (error) {
      throw new Error(`Failed to get commits: ${error.message}`);
    }
  }

  /**
   * Get repository info
   */
  async getRepositoryInfo() {
    try {
      const response = await fetch(
        `${this.apiBase}/repos/${this.owner}/${this.repo}`,
        { headers: this.getHeaders() }
      );

      if (!response.ok) throw new Error('Failed to fetch repo info');

      const repo = await response.json();
      return {
        name: repo.name,
        owner: repo.owner.login,
        url: repo.html_url,
        description: repo.description,
        stars: repo.stargazers_count,
        watchers: repo.watchers_count,
        forks: repo.forks_count,
        openIssues: repo.open_issues_count,
        defaultBranch: repo.default_branch,
        isPublic: !repo.private
      };
    } catch (error) {
      throw new Error(`Failed to get repo info: ${error.message}`);
    }
  }

  /**
   * Self-healing workflow: detect issues, fix, commit, push, PR
   */
  async autoFixAndPR(issues, title, description) {
    try {
      // Create feature branch
      const branchName = `fix/auto-${Date.now()}`;
      await this.createBranch(branchName);

      // Stage all changes
      await this.stageChanges();

      // Commit
      const status = await this.getStatus();
      if (status.changes.length > 0) {
        await this.commit(`${title}\n\n${description}`);
      }

      // Push
      await this.push(branchName);

      // Create PR
      const pr = await this.createPullRequest(title, description, branchName);

      return {
        success: true,
        branch: branchName,
        pullRequest: pr,
        message: `Auto-fix completed: ${pr.url}`
      };
    } catch (error) {
      throw new Error(`Auto-fix workflow failed: ${error.message}`);
    }
  }

  /**
   * Get full repository status for self-awareness
   */
  async getRepositoryStatus() {
    return {
      info: await this.getRepositoryInfo(),
      status: await this.getStatus(),
      branches: await this.listBranches(),
      remoteBranches: await this.listBranches(true),
      recentCommits: await this.getRecentCommits(5)
    };
  }
}

export default GitHubControl;
