import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { EventBus } from '../lib/event-bus.js';
import { OAuthManager } from '../lib/oauth-manager.js';
import { WebhookHandler } from '../lib/webhook-handler.js';
import { ExternalAPIClient } from '../lib/external-api-client.js';

const PORT = process.env.INTEGRATION_PORT || 3400;
const app = express();

let eventBus;
let oauthManager;
let webhookHandler;
let apiClient;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.raw({ type: 'application/x-www-form-urlencoded', limit: '1mb' }));

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'integration-service',
    port: PORT,
    uptime: process.uptime(),
    oauth: !!oauthManager,
    webhooks: !!webhookHandler,
    api: !!apiClient,
  });
});

app.post('/api/v1/oauth/github/authorize', (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const result = oauthManager.initiateGitHubOAuth(userId);
    res.json(result);
  } catch (error) {
    console.error('GitHub auth error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/oauth/github/callback', async (req, res) => {
  try {
    const { code, state } = req.body;
    if (!code || !state) return res.status(400).json({ error: 'code and state required' });

    const result = await oauthManager.completeGitHubOAuth(code, state);
    res.json(result);
  } catch (error) {
    console.error('GitHub callback error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/v1/oauth/slack/authorize', (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const result = oauthManager.initiateSlackOAuth(userId);
    res.json(result);
  } catch (error) {
    console.error('Slack auth error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/oauth/slack/callback', async (req, res) => {
  try {
    const { code, state } = req.body;
    if (!code || !state) return res.status(400).json({ error: 'code and state required' });

    const result = await oauthManager.completeSlackOAuth(code, state);
    res.json(result);
  } catch (error) {
    console.error('Slack callback error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/v1/oauth/providers/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const providers = oauthManager.getConnectedProviders(userId);
    res.json({ userId, providers });
  } catch (error) {
    console.error('Get providers error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/oauth/disconnect/:userId/:provider', async (req, res) => {
  try {
    const { userId, provider } = req.params;
    const success = await oauthManager.revokeToken(userId, provider);
    res.json({ userId, provider, disconnected: success });
  } catch (error) {
    console.error('Disconnect error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/webhooks/github', async (req, res) => {
  try {
    const signature = req.headers['x-hub-signature-256'];
    const payload = JSON.stringify(req.body);

    if (!webhookHandler.verifyGitHubSignature(payload, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.headers['x-github-event'];
    const result = await webhookHandler.handleGitHubWebhook(event, req.body);

    res.json(result);
  } catch (error) {
    console.error('GitHub webhook error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/webhooks/slack', async (req, res) => {
  try {
    const timestamp = req.headers['x-slack-request-timestamp'];
    if (!webhookHandler.verifySlackSignature(timestamp)) {
      return res.status(401).json({ error: 'Request too old' });
    }

    const result = await webhookHandler.handleSlackWebhook(req.body);

    if (result.challenge) {
      return res.json({ challenge: result.challenge });
    }

    res.json(result);
  } catch (error) {
    console.error('Slack webhook error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/github/repo/:owner/:repo', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    if (!apiClient.isConfigured('github')) {
      return res.status(503).json({ error: 'GitHub not configured' });
    }

    const result = await apiClient.getGitHubRepository(owner, repo);
    res.json(result);
  } catch (error) {
    console.error('GitHub repo error:', error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/v1/github/repo/:owner/:repo/issues', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { state } = req.query;
    if (!apiClient.isConfigured('github')) {
      return res.status(503).json({ error: 'GitHub not configured' });
    }

    const result = await apiClient.getGitHubIssues(owner, repo, state);
    res.json({ owner, repo, issues: result });
  } catch (error) {
    console.error('GitHub issues error:', error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/v1/github/repo/:owner/:repo/pulls', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { state } = req.query;
    if (!apiClient.isConfigured('github')) {
      return res.status(503).json({ error: 'GitHub not configured' });
    }

    const result = await apiClient.getGitHubPullRequests(owner, repo, state);
    res.json({ owner, repo, pullRequests: result });
  } catch (error) {
    console.error('GitHub PRs error:', error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/v1/slack/channels', async (req, res) => {
  try {
    if (!apiClient.isConfigured('slack')) {
      return res.status(503).json({ error: 'Slack not configured' });
    }

    const channels = await apiClient.slackListChannels();
    res.json({ channels });
  } catch (error) {
    console.error('Slack channels error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/v1/slack/send', async (req, res) => {
  try {
    const { channelId, text, blocks } = req.body;
    if (!channelId || !text) {
      return res.status(400).json({ error: 'channelId and text required' });
    }
    if (!apiClient.isConfigured('slack')) {
      return res.status(503).json({ error: 'Slack not configured' });
    }

    const result = await apiClient.slackSendMessage(channelId, text, blocks);
    res.json(result);
  } catch (error) {
    console.error('Slack send error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/system/status', (req, res) => {
  res.json({
    service: 'integration-service',
    status: 'ready',
    components: {
      oauth: oauthManager ? 'initialized' : 'not-initialized',
      webhooks: webhookHandler ? 'initialized' : 'not-initialized',
      apiClient: apiClient ? 'initialized' : 'not-initialized',
      eventBus: eventBus ? 'connected' : 'disconnected',
    },
    uptime: process.uptime(),
  });
});

app.use((err, req, res) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

async function initializeService() {
  try {
    eventBus = new EventBus();
    oauthManager = new OAuthManager(eventBus);
    webhookHandler = new WebhookHandler(eventBus);
    apiClient = new ExternalAPIClient();

    webhookHandler.registerWebhookSecret('github', process.env.GITHUB_WEBHOOK_SECRET);
    webhookHandler.registerWebhookSecret('slack', process.env.SLACK_WEBHOOK_SECRET);

    apiClient.setGitHubToken(process.env.GITHUB_API_TOKEN);
    apiClient.setSlackToken(process.env.SLACK_API_TOKEN);

    console.log('✓ Service components initialized');
  } catch (error) {
    console.error('Initialization error:', error);
    process.exit(1);
  }
}

async function startServer() {
  await initializeService();

  const server = app.listen(PORT, () => {
    console.log(`Integration Service running on port ${PORT}`);
    console.log('Available endpoints:');
    console.log('  OAuth: /api/v1/oauth/*');
    console.log('  Webhooks: /api/v1/webhooks/*');
    console.log('  GitHub API: /api/v1/github/*');
    console.log('  Slack API: /api/v1/slack/*');
    console.log('  System: /api/v1/system/status');
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default app;
