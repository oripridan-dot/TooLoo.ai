// engine/github-provider.js
// Gives AI providers access to your GitHub repo for analysis and context
// Providers can read issues, PRs, files, and repo metadata

import fetch from 'node-fetch';

// NOTE: Read from env dynamically at runtime, not import time
// This ensures .env is loaded before we check these values
export class GitHubProvider {
  constructor() {
    if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO) {
      console.warn('⚠️  GitHub integration not configured. Set GITHUB_TOKEN and GITHUB_REPO in .env');
    }
  }

  /**
   * Get repo metadata (name, description, stats, etc.)
   */
  async getRepoInfo() {
    if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO) return null;

    try {
      const res = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPO}`, {
        headers: { 'Authorization': `token ${process.env.GITHUB_TOKEN}` }
      });

      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

      const data = await res.json();

      return {
        name: data.name,
        description: data.description,
        url: data.html_url,
        stars: data.stargazers_count,
        forks: data.forks_count,
        language: data.language,
        topics: data.topics,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (e) {
      console.error('Error fetching repo info:', e.message);
      return null;
    }
  }

  /**
   * Get recent issues for provider context
   */
  async getRecentIssues(limit = 5) {
    if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO) return [];

    try {
      const res = await fetch(
        `https://api.github.com/repos/${process.env.GITHUB_REPO}/issues?state=all&per_page=${limit}&sort=updated`,
        { headers: { 'Authorization': `token ${process.env.GITHUB_TOKEN}` } }
      );

      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

      const issues = await res.json();

      return issues.map(issue => ({
        number: issue.number,
        title: issue.title,
        state: issue.state,
        labels: issue.labels.map(l => l.name),
        created: issue.created_at,
        updated: issue.updated_at,
        url: issue.html_url
      }));
    } catch (e) {
      console.error('Error fetching issues:', e.message);
      return [];
    }
  }

  /**
   * Get file content from repo
   */
  async getFileContent(filePath) {
    if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO) return null;

    try {
      const res = await fetch(
        `https://api.github.com/repos/${process.env.GITHUB_REPO}/contents/${filePath}`,
        { headers: { 'Authorization': `token ${process.env.GITHUB_TOKEN}` } }
      );

      if (!res.ok) throw new Error(`File not found or error: ${res.status}`);

      const data = await res.json();

      // GitHub returns content as base64
      const content = Buffer.from(data.content, 'base64').toString('utf-8');

      return {
        path: data.path,
        content,
        size: data.size,
        sha: data.sha
      };
    } catch (e) {
      console.error('Error fetching file:', e.message);
      return null;
    }
  }

  /**
   * Get multiple files (useful for providing context to providers)
   */
  async getMultipleFiles(filePaths) {
    const results = {};

    for (const filePath of filePaths) {
      const content = await this.getFileContent(filePath);
      if (content) {
        results[filePath] = content.content;
      }
    }

    return results;
  }

  /**
   * Get repo structure (tree of files)
   */
  async getRepoStructure(path = '', recursive = false) {
    if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO) return null;

    try {
      const url = `https://api.github.com/repos/${process.env.GITHUB_REPO}/git/trees/main?recursive=${recursive ? 1 : 0}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `token ${process.env.GITHUB_TOKEN}` }
      });

      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

      const data = await res.json();

      // Filter and format
      return data.tree
        .filter(item => !path || item.path.startsWith(path))
        .map(item => ({
          path: item.path,
          type: item.type, // 'blob' or 'tree'
          url: item.url
        }));
    } catch (e) {
      console.error('Error fetching repo structure:', e.message);
      return null;
    }
  }

  /**
   * Get README for context
   */
  async getReadme() {
    if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO) return null;

    const readmePaths = ['README.md', 'readme.md', 'README.txt', 'readme.txt'];

    for (const filePath of readmePaths) {
      const content = await this.getFileContent(filePath);
      if (content) {
        return content.content;
      }
    }

    return null;
  }

  /**
   * Format repo context for provider system prompt
   */
  async getContextForProviders() {
    if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO) return '';

    try {
      const [info, issues, readme] = await Promise.all([
        this.getRepoInfo(),
        this.getRecentIssues(3),
        this.getReadme()
      ]);

      let context = '';

      if (info) {
        context += '## Repository Context\n';
        context += `**Name**: ${info.name}\n`;
        context += `**Description**: ${info.description}\n`;
        context += `**URL**: ${info.url}\n`;
        context += `**Language**: ${info.language}\n`;
        context += `**Stars**: ${info.stars}\n\n`;
      }

      if (issues.length > 0) {
        context += '## Recent Issues\n';
        issues.forEach(issue => {
          context += `- [#${issue.number}](${issue.url}) ${issue.title} (${issue.state})\n`;
        });
        context += '\n';
      }

      if (readme) {
        context += `## Project README\n${readme}\n`;
      }

      return context;
    } catch (e) {
      console.error('Error building provider context:', e.message);
      return '';
    }
  }

  /**
   * Create or update a file in the repository
   */
  async createOrUpdateFile(filePath, content, message, branch = 'main') {
    if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO) {
      return { success: false, error: 'GitHub not configured' };
    }

    try {
      // First, try to get the file to see if it exists
      let sha = null;
      try {
        const existing = await this.getFileContent(filePath);
        if (existing) {
          sha = existing.sha;
        }
      } catch (e) {
        // File doesn't exist, that's fine
      }

      const url = `https://api.github.com/repos/${process.env.GITHUB_REPO}/contents/${filePath}`;
      
      const payload = {
        message,
        content: Buffer.from(content).toString('base64'),
        branch
      };

      if (sha) {
        payload.sha = sha;
      }

      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`GitHub API error: ${res.status} - ${error}`);
      }

      const data = await res.json();

      return {
        success: true,
        commit: {
          sha: data.commit.sha,
          message: data.commit.message,
          url: data.commit.html_url
        },
        file: {
          path: data.content.path,
          size: data.content.size
        }
      };
    } catch (e) {
      console.error('Error creating/updating file:', e.message);
      return { success: false, error: e.message };
    }
  }

  /**
   * Create a pull request
   */
  async createPullRequest(prData) {
    if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO) {
      return { success: false, error: 'GitHub not configured' };
    }

    try {
      const url = `https://api.github.com/repos/${process.env.GITHUB_REPO}/pulls`;

      const payload = {
        title: prData.title,
        body: prData.body,
        head: prData.head,
        base: prData.base || 'main',
        draft: prData.draft || false
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`GitHub API error: ${res.status} - ${error}`);
      }

      const data = await res.json();

      // Add labels if provided
      if (prData.labels && prData.labels.length > 0) {
        await this.addLabelsToIssue(data.number, prData.labels);
      }

      // Request reviewers if provided
      if (prData.reviewers && prData.reviewers.length > 0) {
        await this.requestReviewers(data.number, prData.reviewers);
      }

      return {
        success: true,
        number: data.number,
        html_url: data.html_url,
        title: data.title,
        state: data.state,
        createdAt: data.created_at
      };
    } catch (e) {
      console.error('Error creating PR:', e.message);
      return { success: false, error: e.message };
    }
  }

  /**
   * Create an issue
   */
  async createIssue(issueData) {
    if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO) {
      return { success: false, error: 'GitHub not configured' };
    }

    try {
      const url = `https://api.github.com/repos/${process.env.GITHUB_REPO}/issues`;

      const payload = {
        title: issueData.title,
        body: issueData.body,
        labels: issueData.labels || [],
        assignees: issueData.assignees || []
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`GitHub API error: ${res.status} - ${error}`);
      }

      const data = await res.json();

      return {
        success: true,
        number: data.number,
        html_url: data.html_url,
        title: data.title,
        state: data.state,
        createdAt: data.created_at
      };
    } catch (e) {
      console.error('Error creating issue:', e.message);
      return { success: false, error: e.message };
    }
  }

  /**
   * Add labels to a PR/issue
   */
  async addLabelsToIssue(issueNumber, labels) {
    if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO) return;

    try {
      const url = `https://api.github.com/repos/${process.env.GITHUB_REPO}/issues/${issueNumber}/labels`;

      await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ labels })
      });
    } catch (e) {
      console.error('Error adding labels:', e.message);
    }
  }

  /**
   * Request reviewers for a PR
   */
  async requestReviewers(prNumber, reviewers) {
    if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO) return;

    try {
      const url = `https://api.github.com/repos/${process.env.GITHUB_REPO}/pulls/${prNumber}/requested_reviewers`;

      await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reviewers })
      });
    } catch (e) {
      console.error('Error requesting reviewers:', e.message);
    }
  }

  /**
   * Check if GitHub access is configured
   */
  isConfigured() {
    return !!(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO);
  }
}

export default new GitHubProvider();
