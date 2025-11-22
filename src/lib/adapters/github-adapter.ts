import fetch from 'node-fetch';

export class GitHubAdapter {
  constructor() {
    this.baseUrl = 'https://api.github.com';
  }

  async execute(action, params, tokenData) {
    const { token } = tokenData;
    const headers = {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };

    switch (action) {
      case 'get-repos':
        return this.getRepos(headers);
      case 'get-user':
        return this.getUser(headers);
      case 'create-issue':
        return this.createIssue(headers, params);
      case 'create-pr':
        return this.createPR(headers, params);
      case 'commit':
        return this.commit(headers, params);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  async getUser(headers) {
    const r = await fetch(`${this.baseUrl}/user`, { headers });
    if (!r.ok) throw new Error(`GitHub API error: ${r.status}`);
    return r.json();
  }

  async getRepos(headers) {
    const r = await fetch(`${this.baseUrl}/user/repos?per_page=100`, { headers });
    if (!r.ok) throw new Error(`GitHub API error: ${r.status}`);
    return r.json();
  }

  async createIssue(headers, { owner, repo, title, body }) {
    if (!owner || !repo || !title) throw new Error('owner, repo, title required');
    const r = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ title, body: body || '' })
    });
    if (!r.ok) throw new Error(`GitHub API error: ${r.status}`);
    return r.json();
  }

  async createPR(headers, { owner, repo, title, head, base, body }) {
    if (!owner || !repo || !title || !head || !base) throw new Error('owner, repo, title, head, base required');
    const r = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ title, head, base, body: body || '' })
    });
    if (!r.ok) throw new Error(`GitHub API error: ${r.status}`);
    return r.json();
  }

  async commit(headers, { owner, repo, branch, path, content, message }) {
    if (!owner || !repo || !path || !content || !message) throw new Error('owner, repo, path, content, message required');
    // Get existing file SHA if it exists
    let sha = null;
    try {
      const r = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/contents/${path}?ref=${branch || 'main'}`, { headers });
      if (r.ok) {
        const data = await r.json();
        sha = data.sha;
      }
    } catch {}
    
    const encoded = Buffer.from(content).toString('base64');
    const body = { message, content: encoded };
    if (sha) body.sha = sha;
    
    const r = await fetch(`${this.baseUrl}/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error(`GitHub API error: ${r.status}`);
    return r.json();
  }
}

export default new GitHubAdapter();
