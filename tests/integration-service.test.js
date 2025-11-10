import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OAuthManager } from '../lib/oauth-manager.js';
import { WebhookHandler } from '../lib/webhook-handler.js';
import { ExternalAPIClient } from '../lib/external-api-client.js';

describe('OAuthManager', () => {
  let oauthManager;
  let mockEventBus;

  beforeEach(() => {
    mockEventBus = {
      emit: vi.fn().mockResolvedValue(true),
    };
    oauthManager = new OAuthManager(mockEventBus);
  });

  it('should initiate GitHub OAuth flow', () => {
    const result = oauthManager.initiateGitHubOAuth('user123');
    expect(result).toHaveProperty('authorizationUrl');
    expect(result).toHaveProperty('state');
    expect(result.authorizationUrl).toContain('github.com');
    expect(result.authorizationUrl).toContain('client_id=');
  });

  it('should initiate Slack OAuth flow', () => {
    const result = oauthManager.initiateSlackOAuth('user456');
    expect(result).toHaveProperty('authorizationUrl');
    expect(result).toHaveProperty('state');
    expect(result.authorizationUrl).toContain('slack.com');
    expect(result.authorizationUrl).toContain('client_id=');
  });

  it('should get connected providers for user', () => {
    oauthManager.tokens.set('user123:github', {
      id: 'token1',
      userId: 'user123',
      provider: 'github',
      accessToken: 'abc123',
      createdAt: Date.now(),
      lastUsed: Date.now(),
      providerUsername: 'octocat',
    });

    const providers = oauthManager.getConnectedProviders('user123');
    expect(providers).toHaveLength(1);
    expect(providers[0].provider).toBe('github');
    expect(providers[0].username).toBe('octocat');
  });

  it('should return null for expired token', () => {
    oauthManager.tokens.set('user123:github', {
      id: 'token1',
      userId: 'user123',
      provider: 'github',
      accessToken: 'abc123',
      expiresAt: Date.now() - 1000,
      lastUsed: Date.now(),
    });

    const token = oauthManager.getStoredToken('user123', 'github');
    expect(token).toBeNull();
  });

  it('should check if token is expired', () => {
    const expiredToken = { expiresAt: Date.now() - 1000 };
    const validToken = { expiresAt: Date.now() + 1000 };
    const noExpiryToken = { expiresAt: null };

    expect(oauthManager.isTokenExpired(expiredToken)).toBe(true);
    expect(oauthManager.isTokenExpired(validToken)).toBe(false);
    expect(oauthManager.isTokenExpired(noExpiryToken)).toBe(false);
  });

  it('should revoke token', () => {
    oauthManager.tokens.set('user123:github', {
      id: 'token1',
      userId: 'user123',
      provider: 'github',
      accessToken: 'abc123',
    });

    const success = oauthManager.revokeToken('github', 'user123');
    expect(success).toBe(true);
    expect(oauthManager.getStoredToken('user123', 'github')).toBeNull();
  });
});

describe('WebhookHandler', () => {
  let webhookHandler;
  let mockEventBus;

  beforeEach(() => {
    mockEventBus = {
      emit: vi.fn().mockResolvedValue(true),
    };
    webhookHandler = new WebhookHandler(mockEventBus);
  });

  it('should handle GitHub push event', async () => {
    const payload = {
      ref: 'refs/heads/main',
      repository: { full_name: 'user/repo' },
      pusher: { name: 'Alice' },
      commits: [{ message: 'Fix bug' }, { message: 'Add feature' }],
    };

    const result = await webhookHandler.handleGitHubWebhook('push', payload);
    expect(result.processed).toBe(true);
    expect(result.type).toBe('vcs.push');
    expect(mockEventBus.emit).toHaveBeenCalled();
  });

  it('should handle GitHub pull request event', async () => {
    const payload = {
      action: 'opened',
      pull_request: {
        number: 123,
        title: 'Add feature',
        user: { login: 'bob' },
        head: { ref: 'feature-branch' },
        additions: 50,
        deletions: 10,
        changed_files: 5,
      },
      repository: { full_name: 'user/repo' },
    };

    const result = await webhookHandler.handleGitHubWebhook('pull_request', payload);
    expect(result.processed).toBe(true);
    expect(result.type).toBe('vcs.pull-request');
  });

  it('should handle GitHub issue event', async () => {
    const payload = {
      action: 'opened',
      issue: {
        number: 456,
        title: 'Bug report',
        state: 'open',
        user: { login: 'carol' },
        labels: [{ name: 'bug' }, { name: 'critical' }],
      },
      repository: { full_name: 'user/repo' },
    };

    const result = await webhookHandler.handleGitHubWebhook('issues', payload);
    expect(result.processed).toBe(true);
    expect(result.type).toBe('vcs.issue');
  });

  it('should handle Slack message event', async () => {
    const payload = {
      type: 'event_callback',
      event: {
        type: 'message',
        user: 'U123',
        channel: 'C456',
        text: 'Hello world',
        ts: '1234567890.123456',
      },
    };

    const result = await webhookHandler.handleSlackWebhook(payload);
    expect(result.processed).toBe(true);
    expect(result.type).toBe('chat.message');
  });

  it('should handle Slack app mention event', async () => {
    const payload = {
      type: 'event_callback',
      event: {
        type: 'app_mention',
        user: 'U123',
        channel: 'C456',
        text: '<@U_BOT> help',
        ts: '1234567890.123456',
      },
    };

    const result = await webhookHandler.handleSlackWebhook(payload);
    expect(result.processed).toBe(true);
    expect(result.type).toBe('chat.mention');
  });

  it('should return challenge for Slack verification', async () => {
    const payload = {
      type: 'url_verification',
      challenge: 'abc123xyz',
    };

    const result = await webhookHandler.handleSlackWebhook(payload);
    expect(result.challenge).toBe('abc123xyz');
  });

  it('should get GitHub webhook URL', () => {
    const url = webhookHandler.getGitHubWebhookUrl();
    expect(url).toContain('github');
    expect(url).toContain('webhooks');
  });

  it('should reject unknown GitHub event', async () => {
    const payload = {};
    const result = await webhookHandler.handleGitHubWebhook('unknown', payload);
    expect(result.processed).toBe(false);
  });

  it('should reject subtype Slack messages', async () => {
    const payload = {
      type: 'event_callback',
      event: {
        type: 'message',
        subtype: 'message_deleted',
      },
    };

    const result = await webhookHandler.handleSlackWebhook(payload);
    expect(result.processed).toBe(false);
  });
});

describe('ExternalAPIClient', () => {
  let apiClient;

  beforeEach(() => {
    apiClient = new ExternalAPIClient();
    apiClient.setGitHubToken('test-token');
    apiClient.setSlackToken('test-slack-token');
  });

  it('should indicate configured status', () => {
    expect(apiClient.isConfigured('github')).toBe(true);
    expect(apiClient.isConfigured('slack')).toBe(true);

    apiClient.setGitHubToken(null);
    expect(apiClient.isConfigured('github')).toBe(false);
  });

  it('should set and track tokens', () => {
    apiClient.setGitHubToken('new-github-token');
    expect(apiClient.isConfigured('github')).toBe(true);

    apiClient.setSlackToken('new-slack-token');
    expect(apiClient.isConfigured('slack')).toBe(true);
  });

  it('should track retry attempts', () => {
    expect(apiClient.retryAttempts).toBe(3);
    expect(apiClient.retryDelay).toBe(1000);
  });
});
