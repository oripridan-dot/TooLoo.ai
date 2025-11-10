import axios from 'axios';

export class ExternalAPIClient {
  constructor() {
    this.githubToken = process.env.GITHUB_API_TOKEN;
    this.slackToken = process.env.SLACK_API_TOKEN;
    this.retryAttempts = 3;
    this.retryDelay = 1000;
  }

  async _retryRequest(fn) {
    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === this.retryAttempts - 1) throw error;
        if (error.response?.status >= 500 || !error.response) {
          await new Promise((r) => setTimeout(r, this.retryDelay * (attempt + 1)));
        } else {
          throw error;
        }
      }
    }
  }

  async getGitHubRepository(owner, repo) {
    return this._retryRequest(async () => {
      const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          Authorization: `token ${this.githubToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      return {
        name: response.data.name,
        description: response.data.description,
        url: response.data.html_url,
        owner: response.data.owner.login,
        stars: response.data.stargazers_count,
        forks: response.data.forks_count,
        language: response.data.language,
        isPrivate: response.data.private,
        topics: response.data.topics,
      };
    });
  }

  async getGitHubIssues(owner, repo, state = 'open') {
    return this._retryRequest(async () => {
      const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/issues`,
        {
          params: { state, per_page: 50 },
          headers: {
            Authorization: `token ${this.githubToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
      return response.data.map((issue) => ({
        number: issue.number,
        title: issue.title,
        state: issue.state,
        author: issue.user.login,
        labels: issue.labels.map((l) => l.name),
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        comments: issue.comments,
      }));
    });
  }

  async getGitHubPullRequests(owner, repo, state = 'open') {
    return this._retryRequest(async () => {
      const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/pulls`,
        {
          params: { state, per_page: 50 },
          headers: {
            Authorization: `token ${this.githubToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
      return response.data.map((pr) => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        author: pr.user.login,
        branch: pr.head.ref,
        additions: pr.additions,
        deletions: pr.deletions,
        changedFiles: pr.changed_files,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        reviewComments: pr.review_comments,
      }));
    });
  }

  async getGitHubBranches(owner, repo) {
    return this._retryRequest(async () => {
      const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/branches`,
        {
          params: { per_page: 50 },
          headers: {
            Authorization: `token ${this.githubToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
      return response.data.map((branch) => ({
        name: branch.name,
        protected: branch.protected,
        commit: branch.commit.sha.substring(0, 7),
      }));
    });
  }

  async getGitHubFileContent(owner, repo, path) {
    return this._retryRequest(async () => {
      const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        {
          headers: {
            Authorization: `token ${this.githubToken}`,
            Accept: 'application/vnd.github.v3.raw',
          },
        }
      );
      return response.data;
    });
  }

  async searchGitHubRepositories(query, language = null) {
    return this._retryRequest(async () => {
      let searchQuery = query;
      if (language) searchQuery += ` language:${language}`;

      const response = await axios.get('https://api.github.com/search/repositories', {
        params: { q: searchQuery, per_page: 30, sort: 'stars', order: 'desc' },
        headers: {
          Authorization: `token ${this.githubToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      return response.data.items.map((repo) => ({
        name: repo.name,
        owner: repo.owner.login,
        description: repo.description,
        url: repo.html_url,
        stars: repo.stargazers_count,
        language: repo.language,
      }));
    });
  }

  async slackSendMessage(channelId, text, blocks = null) {
    return this._retryRequest(async () => {
      const payload = {
        channel: channelId,
        text,
      };
      if (blocks) payload.blocks = blocks;

      const response = await axios.post('https://slack.com/api/chat.postMessage', payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.slackToken}`,
        },
      });

      if (!response.data.ok) {
        throw new Error(`Slack error: ${response.data.error}`);
      }

      return {
        channelId: response.data.channel,
        timestamp: response.data.ts,
        messageId: response.data.message.ts,
      };
    });
  }

  async slackUpdateMessage(channelId, timestamp, text) {
    return this._retryRequest(async () => {
      const response = await axios.post(
        'https://slack.com/api/chat.update',
        { channel: channelId, ts: timestamp, text },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.slackToken}`,
          },
        }
      );

      if (!response.data.ok) {
        throw new Error(`Slack error: ${response.data.error}`);
      }

      return { updated: true, timestamp: response.data.ts };
    });
  }

  async slackListChannels() {
    return this._retryRequest(async () => {
      const response = await axios.get('https://slack.com/api/conversations.list', {
        params: { types: 'public_channel,private_channel' },
        headers: {
          Authorization: `Bearer ${this.slackToken}`,
        },
      });

      if (!response.data.ok) {
        throw new Error(`Slack error: ${response.data.error}`);
      }

      return response.data.channels.map((channel) => ({
        id: channel.id,
        name: channel.name,
        isPrivate: channel.is_private,
        isMember: channel.is_member,
        numMembers: channel.num_members,
        topic: channel.topic?.value,
        purpose: channel.purpose?.value,
      }));
    });
  }

  async slackGetUserInfo(userId) {
    return this._retryRequest(async () => {
      const response = await axios.get('https://slack.com/api/users.info', {
        params: { user: userId },
        headers: {
          Authorization: `Bearer ${this.slackToken}`,
        },
      });

      if (!response.data.ok) {
        throw new Error(`Slack error: ${response.data.error}`);
      }

      const user = response.data.user;
      return {
        id: user.id,
        name: user.name,
        displayName: user.real_name,
        email: user.profile?.email,
        isAdmin: user.is_admin,
        isBot: user.is_bot,
        isActive: !user.deleted,
      };
    });
  }

  async slackAddReaction(channelId, timestamp, emoji) {
    return this._retryRequest(async () => {
      const response = await axios.post(
        'https://slack.com/api/reactions.add',
        { channel: channelId, timestamp, name: emoji },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.slackToken}`,
          },
        }
      );

      if (!response.data.ok) {
        throw new Error(`Slack error: ${response.data.error}`);
      }

      return { added: true, emoji };
    });
  }

  setGitHubToken(token) {
    this.githubToken = token;
  }

  setSlackToken(token) {
    this.slackToken = token;
  }

  isConfigured(provider) {
    if (provider === 'github') return !!this.githubToken;
    if (provider === 'slack') return !!this.slackToken;
    return false;
  }
}

export default ExternalAPIClient;
