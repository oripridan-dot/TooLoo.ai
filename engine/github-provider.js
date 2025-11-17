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
   * Check if GitHub access is configured
   */
  isConfigured() {
    return !!(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO);
  }
}

export default new GitHubProvider();
