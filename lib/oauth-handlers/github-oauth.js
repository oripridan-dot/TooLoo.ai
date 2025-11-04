// GitHub OAuth Handler
// Handles token exchange, refresh, and API calls

import fetch from 'node-fetch';

const GITHUB_OAUTH_URL = 'https://github.com/login/oauth';
const GITHUB_API_BASE = 'https://api.github.com';

export default {
  // Generate authorization URL
  getAuthUrl(clientId, redirectUri, state) {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      state: state,
      scope: 'repo,gist,user,workflow',
      allow_signup: 'true'
    });
    return `${GITHUB_OAUTH_URL}/authorize?${params}`;
  },

  // Exchange code for access token
  async exchangeCode(clientId, clientSecret, code, redirectUri) {
    try {
      const response = await fetch(`${GITHUB_OAUTH_URL}/access_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          redirect_uri: redirectUri
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(`OAuth error: ${data.error_description}`);
      
      return {
        accessToken: data.access_token,
        tokenType: data.token_type,
        scope: data.scope,
        expiresAt: Date.now() + (data.expires_in * 1000)
      };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  // Get user info
  async getUser(accessToken) {
    try {
      const response = await fetch(`${GITHUB_API_BASE}/user`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      return await response.json();
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  // List user repositories
  async listRepos(accessToken, page = 1) {
    try {
      const response = await fetch(
        `${GITHUB_API_BASE}/user/repos?per_page=30&page=${page}`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      const repos = await response.json();
      return {
        ok: true,
        repos: repos.map(r => ({
          name: r.name,
          url: r.html_url,
          description: r.description,
          language: r.language,
          stars: r.stargazers_count,
          private: r.private
        }))
      };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  // Get issues
  async getIssues(accessToken, owner, repo, state = 'open') {
    try {
      const response = await fetch(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues?state=${state}&per_page=50`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      const issues = await response.json();
      return {
        ok: true,
        issues: issues.map(i => ({
          number: i.number,
          title: i.title,
          state: i.state,
          url: i.html_url,
          labels: i.labels.map(l => l.name),
          created: i.created_at
        }))
      };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  // Get pull requests
  async getPullRequests(accessToken, owner, repo, state = 'open') {
    try {
      const response = await fetch(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls?state=${state}&per_page=50`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      const prs = await response.json();
      return {
        ok: true,
        pullRequests: prs.map(pr => ({
          number: pr.number,
          title: pr.title,
          state: pr.state,
          url: pr.html_url,
          draft: pr.draft,
          created: pr.created_at
        }))
      };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  // Create issue
  async createIssue(accessToken, owner, repo, title, body, labels = []) {
    try {
      const response = await fetch(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ title, body, labels })
        }
      );
      const issue = await response.json();
      return { ok: true, issue: { number: issue.number, url: issue.html_url } };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  // Get commits
  async getCommits(accessToken, owner, repo, branch = 'main', limit = 20) {
    try {
      const response = await fetch(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits?sha=${branch}&per_page=${limit}`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      const commits = await response.json();
      return {
        ok: true,
        commits: commits.map(c => ({
          sha: c.sha.substring(0, 7),
          message: c.commit.message,
          author: c.commit.author.name,
          date: c.commit.author.date,
          url: c.html_url
        }))
      };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }
};
