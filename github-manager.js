/**
 * GitHubManager - minimal GitHub API client using native fetch (Node 18+)
 * Supports public repos without a token and uses GITHUB_TOKEN when provided.
 */
class GitHubManager {
  constructor(options = {}) {
    this.defaultOwner = options.defaultOwner || process.env.GITHUB_DEFAULT_OWNER || 'oripridan-dot';
    this.defaultRepo = options.defaultRepo || process.env.GITHUB_DEFAULT_REPO || 'TooLoo.ai';
    this.token = options.token || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || null;
    this.baseUrl = 'https://api.github.com';
  }

  getHeaders() {
    const headers = {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'TooLoo.ai-GitHub-Client'
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
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
}

module.exports = GitHubManager;
