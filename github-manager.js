/**
 * GitHubManager - Comprehensive GitHub API client using native fetch (Node 18+)
 * Supports both read and write operations with full GitHub integration
 * 
 * Features:
 * - Repository operations (read, create, update)
 * - File operations (read, create, update, delete)
 * - Branch management
 * - Commit operations
 * - Pull Request management
 * - Issue tracking
 * - GitHub Actions integration
 */
class GitHubManager {
  constructor(options = {}) {
    this.defaultOwner = options.defaultOwner || process.env.GITHUB_DEFAULT_OWNER || 'oripridan-dot';
    this.defaultRepo = options.defaultRepo || process.env.GITHUB_DEFAULT_REPO || 'TooLoo.ai';
    this.token = options.token || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || null;
    this.baseUrl = 'https://api.github.com';
    this.defaultBranch = 'main';
    
    console.log('🐙 GitHub Manager initialized');
    if (!this.token) {
      console.warn('⚠️  No GitHub token found - write operations will fail');
    }
  }

  getHeaders(contentType = null) {
    const headers = {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'TooLoo.ai-GitHub-Client',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    return headers;
  }

  requiresAuth() {
    if (!this.token) {
      throw new Error('GitHub token required for write operations. Set GITHUB_TOKEN in .env');
    }
  }

  async getRepo(owner = this.defaultOwner, repo = this.defaultRepo) {
    const url = `${this.baseUrl}/repos/${owner}/${repo}`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error(`GitHub repo fetch failed: ${res.status}`);
    return res.json();
  }

  async listContents({ owner = this.defaultOwner, repo = this.defaultRepo, path = '', ref = 'main' } = {}) {
    const escPath = encodeURIComponent(path).replace(/%2F/g, '/');
    const url = `${this.baseUrl}/repos/${owner}/${repo}/contents/${escPath}?ref=${encodeURIComponent(ref)}`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error(`GitHub contents fetch failed: ${res.status}`);
    return res.json();
  }

  async readFile({ owner = this.defaultOwner, repo = this.defaultRepo, path, ref = 'main' }) {
    if (!path) throw new Error('Missing path');
    const escPath = encodeURIComponent(path).replace(/%2F/g, '/');
    const url = `${this.baseUrl}/repos/${owner}/${repo}/contents/${escPath}?ref=${encodeURIComponent(ref)}`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error(`GitHub file fetch failed: ${res.status}`);
    const json = await res.json();
    if (json.type !== 'file') throw new Error('Not a file');
    const content = Buffer.from(json.content || '', json.encoding || 'base64').toString('utf8');
    return { path, content, sha: json.sha, size: json.size, encoding: 'utf8' };
  }

  // ========== WRITE OPERATIONS ==========

  /**
   * Create or update a file in the repository
   * @param {Object} options - File operation options
   * @returns {Promise<Object>} Commit information
   */
  async createOrUpdateFile({ 
    owner = this.defaultOwner, 
    repo = this.defaultRepo, 
    path, 
    content, 
    message, 
    branch = this.defaultBranch,
    sha = null // Required for updates
  }) {
    this.requiresAuth();
    if (!path || !content || !message) {
      throw new Error('Missing required parameters: path, content, message');
    }

    const escPath = encodeURIComponent(path).replace(/%2F/g, '/');
    const url = `${this.baseUrl}/repos/${owner}/${repo}/contents/${escPath}`;
    
    const body = {
      message,
      content: Buffer.from(content).toString('base64'),
      branch
    };
    
    if (sha) {
      body.sha = sha; // Required for updates
    }

    const res = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders('application/json'),
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(`GitHub file operation failed: ${res.status} - ${error.message}`);
    }

    return res.json();
  }

  /**
   * Delete a file from the repository
   */
  async deleteFile({ 
    owner = this.defaultOwner, 
    repo = this.defaultRepo, 
    path, 
    message, 
    sha,
    branch = this.defaultBranch
  }) {
    this.requiresAuth();
    if (!path || !message || !sha) {
      throw new Error('Missing required parameters: path, message, sha');
    }

    const escPath = encodeURIComponent(path).replace(/%2F/g, '/');
    const url = `${this.baseUrl}/repos/${owner}/${repo}/contents/${escPath}`;

    const res = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders('application/json'),
      body: JSON.stringify({ message, sha, branch })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(`GitHub file deletion failed: ${res.status} - ${error.message}`);
    }

    return res.json();
  }

  // ========== BRANCH OPERATIONS ==========

  /**
   * List all branches
   */
  async listBranches({ owner = this.defaultOwner, repo = this.defaultRepo } = {}) {
    const url = `${this.baseUrl}/repos/${owner}/${repo}/branches`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error(`Failed to list branches: ${res.status}`);
    return res.json();
  }

  /**
   * Get a specific branch
   */
  async getBranch({ owner = this.defaultOwner, repo = this.defaultRepo, branch = this.defaultBranch }) {
    const url = `${this.baseUrl}/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error(`Failed to get branch: ${res.status}`);
    return res.json();
  }

  /**
   * Create a new branch
   */
  async createBranch({ 
    owner = this.defaultOwner, 
    repo = this.defaultRepo, 
    newBranch, 
    fromBranch = this.defaultBranch 
  }) {
    this.requiresAuth();
    if (!newBranch) throw new Error('Branch name required');

    // Get the SHA of the source branch
    const sourceBranch = await this.getBranch({ owner, repo, branch: fromBranch });
    const sha = sourceBranch.commit.sha;

    const url = `${this.baseUrl}/repos/${owner}/${repo}/git/refs`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders('application/json'),
      body: JSON.stringify({
        ref: `refs/heads/${newBranch}`,
        sha
      })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Failed to create branch: ${res.status} - ${error.message}`);
    }

    return res.json();
  }

  // ========== COMMIT OPERATIONS ==========

  /**
   * Get commits for a repository
   */
  async getCommits({ 
    owner = this.defaultOwner, 
    repo = this.defaultRepo, 
    sha = null, 
    path = null,
    perPage = 30 
  } = {}) {
    let url = `${this.baseUrl}/repos/${owner}/${repo}/commits?per_page=${perPage}`;
    if (sha) url += `&sha=${encodeURIComponent(sha)}`;
    if (path) url += `&path=${encodeURIComponent(path)}`;

    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error(`Failed to get commits: ${res.status}`);
    return res.json();
  }

  /**
   * Get a specific commit
   */
  async getCommit({ owner = this.defaultOwner, repo = this.defaultRepo, ref }) {
    if (!ref) throw new Error('Commit ref required');
    const url = `${this.baseUrl}/repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error(`Failed to get commit: ${res.status}`);
    return res.json();
  }

  // ========== PULL REQUEST OPERATIONS ==========

  /**
   * List pull requests
   */
  async listPullRequests({ 
    owner = this.defaultOwner, 
    repo = this.defaultRepo, 
    state = 'open',
    perPage = 30 
  } = {}) {
    const url = `${this.baseUrl}/repos/${owner}/${repo}/pulls?state=${state}&per_page=${perPage}`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error(`Failed to list PRs: ${res.status}`);
    return res.json();
  }

  /**
   * Get a specific pull request
   */
  async getPullRequest({ owner = this.defaultOwner, repo = this.defaultRepo, pullNumber }) {
    if (!pullNumber) throw new Error('Pull request number required');
    const url = `${this.baseUrl}/repos/${owner}/${repo}/pulls/${pullNumber}`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error(`Failed to get PR: ${res.status}`);
    return res.json();
  }

  /**
   * Create a pull request
   */
  async createPullRequest({ 
    owner = this.defaultOwner, 
    repo = this.defaultRepo, 
    title, 
    body, 
    head, 
    base = this.defaultBranch 
  }) {
    this.requiresAuth();
    if (!title || !head) throw new Error('Title and head branch required');

    const url = `${this.baseUrl}/repos/${owner}/${repo}/pulls`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders('application/json'),
      body: JSON.stringify({ title, body, head, base })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Failed to create PR: ${res.status} - ${error.message}`);
    }

    return res.json();
  }

  /**
   * Update a pull request
   */
  async updatePullRequest({ 
    owner = this.defaultOwner, 
    repo = this.defaultRepo, 
    pullNumber, 
    title, 
    body, 
    state 
  }) {
    this.requiresAuth();
    if (!pullNumber) throw new Error('Pull request number required');

    const updates = {};
    if (title) updates.title = title;
    if (body) updates.body = body;
    if (state) updates.state = state;

    const url = `${this.baseUrl}/repos/${owner}/${repo}/pulls/${pullNumber}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: this.getHeaders('application/json'),
      body: JSON.stringify(updates)
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Failed to update PR: ${res.status} - ${error.message}`);
    }

    return res.json();
  }

  /**
   * Merge a pull request
   */
  async mergePullRequest({ 
    owner = this.defaultOwner, 
    repo = this.defaultRepo, 
    pullNumber, 
    commitMessage,
    mergeMethod = 'merge' // 'merge', 'squash', or 'rebase'
  }) {
    this.requiresAuth();
    if (!pullNumber) throw new Error('Pull request number required');

    const url = `${this.baseUrl}/repos/${owner}/${repo}/pulls/${pullNumber}/merge`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders('application/json'),
      body: JSON.stringify({
        commit_message: commitMessage,
        merge_method: mergeMethod
      })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Failed to merge PR: ${res.status} - ${error.message}`);
    }

    return res.json();
  }

  // ========== ISSUE OPERATIONS ==========

  /**
   * List issues
   */
  async listIssues({ 
    owner = this.defaultOwner, 
    repo = this.defaultRepo, 
    state = 'open',
    labels = null,
    perPage = 30 
  } = {}) {
    let url = `${this.baseUrl}/repos/${owner}/${repo}/issues?state=${state}&per_page=${perPage}`;
    if (labels) url += `&labels=${encodeURIComponent(labels)}`;
    
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error(`Failed to list issues: ${res.status}`);
    return res.json();
  }

  /**
   * Get a specific issue
   */
  async getIssue({ owner = this.defaultOwner, repo = this.defaultRepo, issueNumber }) {
    if (!issueNumber) throw new Error('Issue number required');
    const url = `${this.baseUrl}/repos/${owner}/${repo}/issues/${issueNumber}`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error(`Failed to get issue: ${res.status}`);
    return res.json();
  }

  /**
   * Create an issue
   */
  async createIssue({ 
    owner = this.defaultOwner, 
    repo = this.defaultRepo, 
    title, 
    body, 
    labels = [],
    assignees = []
  }) {
    this.requiresAuth();
    if (!title) throw new Error('Issue title required');

    const url = `${this.baseUrl}/repos/${owner}/${repo}/issues`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders('application/json'),
      body: JSON.stringify({ title, body, labels, assignees })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Failed to create issue: ${res.status} - ${error.message}`);
    }

    return res.json();
  }

  /**
   * Update an issue
   */
  async updateIssue({ 
    owner = this.defaultOwner, 
    repo = this.defaultRepo, 
    issueNumber, 
    title, 
    body, 
    state,
    labels 
  }) {
    this.requiresAuth();
    if (!issueNumber) throw new Error('Issue number required');

    const updates = {};
    if (title) updates.title = title;
    if (body) updates.body = body;
    if (state) updates.state = state;
    if (labels) updates.labels = labels;

    const url = `${this.baseUrl}/repos/${owner}/${repo}/issues/${issueNumber}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: this.getHeaders('application/json'),
      body: JSON.stringify(updates)
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Failed to update issue: ${res.status} - ${error.message}`);
    }

    return res.json();
  }

  /**
   * Add comment to issue or PR
   */
  async createComment({ 
    owner = this.defaultOwner, 
    repo = this.defaultRepo, 
    issueNumber, 
    body 
  }) {
    this.requiresAuth();
    if (!issueNumber || !body) throw new Error('Issue number and comment body required');

    const url = `${this.baseUrl}/repos/${owner}/${repo}/issues/${issueNumber}/comments`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders('application/json'),
      body: JSON.stringify({ body })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Failed to create comment: ${res.status} - ${error.message}`);
    }

    return res.json();
  }

  // ========== GITHUB ACTIONS ==========

  /**
   * List workflow runs
   */
  async listWorkflowRuns({ 
    owner = this.defaultOwner, 
    repo = this.defaultRepo,
    workflowId = null,
    branch = null,
    status = null,
    perPage = 30 
  } = {}) {
    let url;
    if (workflowId) {
      url = `${this.baseUrl}/repos/${owner}/${repo}/actions/workflows/${workflowId}/runs?per_page=${perPage}`;
    } else {
      url = `${this.baseUrl}/repos/${owner}/${repo}/actions/runs?per_page=${perPage}`;
    }
    
    if (branch) url += `&branch=${encodeURIComponent(branch)}`;
    if (status) url += `&status=${status}`;

    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error(`Failed to list workflow runs: ${res.status}`);
    return res.json();
  }

  /**
   * Get a workflow run
   */
  async getWorkflowRun({ owner = this.defaultOwner, repo = this.defaultRepo, runId }) {
    if (!runId) throw new Error('Run ID required');
    const url = `${this.baseUrl}/repos/${owner}/${repo}/actions/runs/${runId}`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error(`Failed to get workflow run: ${res.status}`);
    return res.json();
  }

  /**
   * Trigger a workflow dispatch event
   */
  async triggerWorkflow({ 
    owner = this.defaultOwner, 
    repo = this.defaultRepo, 
    workflowId, 
    ref = this.defaultBranch,
    inputs = {}
  }) {
    this.requiresAuth();
    if (!workflowId) throw new Error('Workflow ID required');

    const url = `${this.baseUrl}/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders('application/json'),
      body: JSON.stringify({ ref, inputs })
    });

    if (res.status !== 204) {
      const error = await res.json();
      throw new Error(`Failed to trigger workflow: ${res.status} - ${error.message}`);
    }

    return { success: true, message: 'Workflow triggered successfully' };
  }

  // ========== UTILITY METHODS ==========

  /**
   * Get authenticated user info
   */
  async getAuthenticatedUser() {
    this.requiresAuth();
    const url = `${this.baseUrl}/user`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error(`Failed to get user info: ${res.status}`);
    return res.json();
  }

  /**
   * Check GitHub API rate limit
   */
  async getRateLimit() {
    const url = `${this.baseUrl}/rate_limit`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error(`Failed to get rate limit: ${res.status}`);
    return res.json();
  }

  /**
   * Get repository statistics
   */
  async getRepoStats({ owner = this.defaultOwner, repo = this.defaultRepo } = {}) {
    const repoInfo = await this.getRepo(owner, repo);
    const branches = await this.listBranches({ owner, repo });
    const recentCommits = await this.getCommits({ owner, repo, perPage: 10 });
    const openPRs = await this.listPullRequests({ owner, repo, state: 'open' });
    const openIssues = await this.listIssues({ owner, repo, state: 'open' });

    return {
      repository: {
        name: repoInfo.name,
        description: repoInfo.description,
        private: repoInfo.private,
        defaultBranch: repoInfo.default_branch,
        language: repoInfo.language,
        size: repoInfo.size,
        stars: repoInfo.stargazers_count,
        forks: repoInfo.forks_count,
        watchers: repoInfo.watchers_count,
        openIssues: repoInfo.open_issues_count,
        createdAt: repoInfo.created_at,
        updatedAt: repoInfo.updated_at
      },
      branches: branches.length,
      recentCommits: recentCommits.slice(0, 5).map(c => ({
        sha: c.sha.substring(0, 7),
        message: c.commit.message.split('\n')[0],
        author: c.commit.author.name,
        date: c.commit.author.date
      })),
      openPullRequests: openPRs.length,
      openIssues: openIssues.length
    };
  }
}

module.exports = GitHubManager;
