/**
 * GitHub Backend Manager - High-level workflows for using GitHub as TooLoo.ai's backend
 * 
 * This manager orchestrates complex GitHub operations:
 * - Auto-commit generated code
 * - Sync personal-projects to GitHub
 * - Create self-improvement PRs
 * - Issue-driven development
 * - CI/CD integration
 */

const GitHubManager = require('./github-manager');
const PersonalFilesystemManager = require('./personal-filesystem-manager');
const path = require('path');
const fs = require('fs').promises;

class GitHubBackendManager {
  constructor(options = {}) {
    this.github = new GitHubManager(options);
    this.filesystem = new PersonalFilesystemManager({
      workspaceRoot: options.workspaceRoot || process.cwd(),
      projectsDir: options.projectsDir || path.join(process.cwd(), 'personal-projects')
    });
    this.autoCommit = options.autoCommit !== false; // Default true
    this.autoBranch = options.autoBranch !== false; // Default true
    this.commitPrefix = options.commitPrefix || '[TooLoo.ai]';
    
    console.log('🚀 GitHub Backend Manager initialized');
    console.log(`   Auto-commit: ${this.autoCommit ? '✅' : '❌'}`);
    console.log(`   Auto-branch: ${this.autoBranch ? '✅' : '❌'}`);
  }

  // ========== CODE GENERATION WORKFLOWS ==========

  /**
   * Generate code and automatically commit to GitHub
   * Use this after AI generates code to version it immediately
   */
  async generateAndCommit({ 
    filePath, 
    content, 
    message, 
    branch = null,
    createPR = false,
    prTitle = null,
    prBody = null
  }) {
    try {
      console.log(`📝 Generating code: ${filePath}`);
      
      // Write file locally first
      await this.filesystem.writeFile(filePath, content, { backup: true });
      console.log('✅ File written locally');

      if (!this.autoCommit) {
        return { 
          success: true, 
          local: true, 
          message: 'File created locally (auto-commit disabled)' 
        };
      }

      // Determine branch strategy
      let targetBranch = branch;
      if (!targetBranch && this.autoBranch) {
        const timestamp = Date.now();
        targetBranch = `tooloo/generated-${timestamp}`;
        console.log(`🌿 Creating branch: ${targetBranch}`);
        await this.github.createBranch({ newBranch: targetBranch });
      }

      // Get existing file SHA if it exists (for updates)
      let sha = null;
      try {
        const existing = await this.github.readFile({ 
          path: filePath, 
          ref: targetBranch || this.github.defaultBranch 
        });
        sha = existing.sha;
      } catch (error) {
        // File doesn't exist, that's fine for new files
      }

      // Commit to GitHub
      const commitMessage = `${this.commitPrefix} ${message || `Generated ${path.basename(filePath)}`}`;
      const result = await this.github.createOrUpdateFile({
        path: filePath,
        content,
        message: commitMessage,
        branch: targetBranch || this.github.defaultBranch,
        sha
      });

      console.log('✅ Code committed to GitHub');

      // Optionally create PR
      if (createPR && targetBranch) {
        const pr = await this.github.createPullRequest({
          title: prTitle || `AI Generated: ${path.basename(filePath)}`,
          body: prBody || `Automatically generated code by TooLoo.ai\n\n${commitMessage}`,
          head: targetBranch,
          base: this.github.defaultBranch
        });
        console.log(`✅ Pull Request created: #${pr.number}`);
        return { success: true, commit: result, pullRequest: pr };
      }

      return { success: true, commit: result, branch: targetBranch };
    } catch (error) {
      console.error('❌ Generate and commit failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync entire personal-projects directory to GitHub
   * Creates a repository for each project if needed
   */
  async syncPersonalProjects() {
    try {
      console.log('🔄 Syncing personal projects to GitHub...');
      
      const projectsDir = this.filesystem.projectsDir;
      const projects = await fs.readdir(projectsDir, { withFileTypes: true });
      const synced = [];
      const errors = [];

      for (const project of projects) {
        if (!project.isDirectory()) continue;

        try {
          const projectPath = path.join(projectsDir, project.name);
          const result = await this.syncProjectToGitHub(projectPath, project.name);
          synced.push({ project: project.name, ...result });
        } catch (error) {
          errors.push({ project: project.name, error: error.message });
        }
      }

      console.log(`✅ Synced ${synced.length} projects`);
      if (errors.length > 0) {
        console.warn(`⚠️  ${errors.length} projects failed to sync`);
      }

      return { success: true, synced, errors };
    } catch (error) {
      console.error('❌ Project sync failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync a single project directory to GitHub
   */
  async syncProjectToGitHub(projectPath, projectName) {
    // This would recursively read the project directory
    // and commit all files to a GitHub repo
    // For now, return a placeholder
    console.log(`  📦 Syncing ${projectName}...`);
    
    // TODO: Implement full directory sync
    // 1. Read all files recursively
    // 2. Batch commit them to GitHub
    // 3. Handle .gitignore patterns
    
    return { 
      success: true, 
      message: 'Project sync not yet fully implemented',
      files: 0 
    };
  }

  // ========== SELF-IMPROVEMENT WORKFLOWS ==========

  /**
   * Create a self-improvement PR
   * TooLoo analyzes its own code and creates a PR with improvements
   */
  async createSelfImprovementPR({ 
    files, 
    improvements, 
    analysisDetails 
  }) {
    try {
      console.log('🤖 Creating self-improvement PR...');
      
      const branchName = `tooloo/self-improvement-${Date.now()}`;
      await this.github.createBranch({ newBranch: branchName });

      // Commit each improved file
      for (const file of files) {
        await this.github.createOrUpdateFile({
          path: file.path,
          content: file.content,
          message: `${this.commitPrefix} Improve ${path.basename(file.path)}`,
          branch: branchName,
          sha: file.sha
        });
      }

      // Create PR with detailed analysis
      const prBody = `
## 🤖 Self-Improvement Analysis

**TooLoo.ai has analyzed its own code and identified improvements.**

### Changes Made
${improvements.map(imp => `- ${imp}`).join('\n')}

### Analysis Details
${analysisDetails}

### Files Modified
${files.map(f => `- \`${f.path}\``).join('\n')}

---
*This PR was automatically generated by TooLoo.ai's self-awareness system.*
`;

      const pr = await this.github.createPullRequest({
        title: '🤖 Self-Improvement: Code Quality Enhancements',
        body: prBody,
        head: branchName,
        base: this.github.defaultBranch
      });

      console.log(`✅ Self-improvement PR created: #${pr.number}`);
      return { success: true, pullRequest: pr, branch: branchName };
    } catch (error) {
      console.error('❌ Self-improvement PR failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ========== ISSUE-DRIVEN DEVELOPMENT ==========

  /**
   * Fetch an issue, generate solution, commit fix
   */
  async solveIssue({ issueNumber }) {
    try {
      console.log(`🎯 Solving issue #${issueNumber}...`);
      
      // Get issue details
      const issue = await this.github.getIssue({ issueNumber });
      console.log(`   Title: ${issue.title}`);

      // TODO: Integration with AI to generate solution
      // For now, return structure
      
      return {
        success: true,
        issue: {
          number: issue.number,
          title: issue.title,
          body: issue.body,
          state: issue.state
        },
        solution: 'AI solution generation not yet implemented',
        message: 'Use this with PersonalAIManager to generate code solutions'
      };
    } catch (error) {
      console.error('❌ Issue solving failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create an issue from AI-detected problem
   */
  async reportIssue({ title, description, labels = ['tooloo-detected'] }) {
    try {
      console.log(`📝 Creating issue: ${title}`);
      
      const issue = await this.github.createIssue({
        title: `[TooLoo.ai] ${title}`,
        body: description,
        labels
      });

      console.log(`✅ Issue created: #${issue.number}`);
      return { success: true, issue };
    } catch (error) {
      console.error('❌ Issue creation failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ========== CI/CD INTEGRATION ==========

  /**
   * Trigger GitHub Actions workflow
   */
  async triggerDeployment({ workflowId, inputs = {} }) {
    try {
      console.log(`🚀 Triggering workflow: ${workflowId}`);
      
      const result = await this.github.triggerWorkflow({ 
        workflowId, 
        inputs 
      });

      console.log('✅ Workflow triggered');
      return { success: true, ...result };
    } catch (error) {
      console.error('❌ Workflow trigger failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Monitor workflow status
   */
  async checkWorkflowStatus({ runId }) {
    try {
      const run = await this.github.getWorkflowRun({ runId });
      
      return {
        success: true,
        status: run.status,
        conclusion: run.conclusion,
        name: run.name,
        createdAt: run.created_at,
        updatedAt: run.updated_at,
        htmlUrl: run.html_url
      };
    } catch (error) {
      console.error('❌ Workflow status check failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ========== COLLABORATION ==========

  /**
   * Get repository activity summary
   */
  async getActivitySummary() {
    try {
      const stats = await this.github.getRepoStats();
      const recentWorkflows = await this.github.listWorkflowRuns({ perPage: 5 });
      
      return {
        success: true,
        repository: stats.repository,
        branches: stats.branches,
        recentCommits: stats.recentCommits,
        openPullRequests: stats.openPullRequests,
        openIssues: stats.openIssues,
        recentWorkflows: recentWorkflows.workflow_runs?.slice(0, 5).map(w => ({
          name: w.name,
          status: w.status,
          conclusion: w.conclusion,
          createdAt: w.created_at
        }))
      };
    } catch (error) {
      console.error('❌ Activity summary failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Review and comment on PR
   */
  async reviewPullRequest({ pullNumber, comment, approve = false }) {
    try {
      console.log(`📝 Reviewing PR #${pullNumber}...`);
      
      // Add comment
      await this.github.createComment({ 
        issueNumber: pullNumber, 
        body: `${this.commitPrefix} ${comment}` 
      });

      // TODO: Add approval workflow
      if (approve) {
        console.log('   ✅ Approval workflow not yet implemented');
      }

      return { success: true, commented: true, approved: approve };
    } catch (error) {
      console.error('❌ PR review failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ========== UTILITY ==========

  /**
   * Check if GitHub integration is properly configured
   */
  async checkConfiguration() {
    try {
      const hasToken = !!this.github.token;
      let authenticated = false;
      let user = null;
      let rateLimit = null;

      if (hasToken) {
        try {
          user = await this.github.getAuthenticatedUser();
          authenticated = true;
        } catch (error) {
          console.warn('Token present but authentication failed:', error.message);
        }
      }

      try {
        rateLimit = await this.github.getRateLimit();
      } catch (error) {
        console.warn('Rate limit check failed:', error.message);
      }

      return {
        configured: hasToken,
        authenticated,
        user: user ? { login: user.login, name: user.name } : null,
        defaultRepo: `${this.github.defaultOwner}/${this.github.defaultRepo}`,
        autoCommit: this.autoCommit,
        autoBranch: this.autoBranch,
        rateLimit: rateLimit ? {
          remaining: rateLimit.rate.remaining,
          limit: rateLimit.rate.limit,
          reset: new Date(rateLimit.rate.reset * 1000).toISOString()
        } : null
      };
    } catch (error) {
      return {
        configured: false,
        error: error.message
      };
    }
  }
}

module.exports = GitHubBackendManager;
