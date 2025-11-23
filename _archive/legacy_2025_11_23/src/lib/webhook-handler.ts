import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export class WebhookHandler {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.webhookSigningSecrets = new Map();
  }

  registerWebhookSecret(provider, secret) {
    this.webhookSigningSecrets.set(provider, secret);
  }

  verifyGitHubSignature(payload, signature) {
    const secret = this.webhookSigningSecrets.get('github');
    if (!secret) return false;
    const hash = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const expectedSignature = `sha256=${hash}`;
    return crypto.timingSafeEqual(expectedSignature, signature);
  }

  verifySlackSignature(timestamp) {
    const secret = this.webhookSigningSecrets.get('slack');
    if (!secret) return false;
    const timeWindow = 5 * 60 * 1000;
    if (Math.abs(Date.now() - parseInt(timestamp) * 1000) > timeWindow) return false;
    return true;
  }

  async handleGitHubWebhook(event, payload) {
    try {
      const eventData = {
        id: uuidv4(),
        provider: 'github',
        webhookEvent: event,
        timestamp: Date.now(),
      };

      switch (event) {
      case 'push': {
        const { repository, pusher, commits, ref } = payload;
        eventData.type = 'vcs.push';
        eventData.data = {
          repo: repository.full_name,
          branch: ref.split('/').pop(),
          author: pusher.name,
          commits: commits.length,
          commitMessages: commits.map((c) => c.message),
        };
        break;
      }
      case 'pull_request': {
        const { action, pull_request, repository } = payload;
        eventData.type = 'vcs.pull-request';
        eventData.data = {
          action,
          repo: repository.full_name,
          prNumber: pull_request.number,
          title: pull_request.title,
          author: pull_request.user.login,
          branch: pull_request.head.ref,
          additions: pull_request.additions,
          deletions: pull_request.deletions,
          files: pull_request.changed_files,
        };
        break;
      }
      case 'issues': {
        const { action, issue, repository } = payload;
        eventData.type = 'vcs.issue';
        eventData.data = {
          action,
          repo: repository.full_name,
          issueNumber: issue.number,
          title: issue.title,
          author: issue.user.login,
          labels: issue.labels.map((l) => l.name),
          state: issue.state,
        };
        break;
      }
      case 'issue_comment': {
        const { action, issue, comment, repository } = payload;
        eventData.type = 'vcs.comment';
        eventData.data = {
          action,
          repo: repository.full_name,
          issueNumber: issue.number,
          author: comment.user.login,
          body: comment.body.substring(0, 200),
          createdAt: comment.created_at,
        };
        break;
      }
      case 'release': {
        const { action, release, repository } = payload;
        eventData.type = 'vcs.release';
        eventData.data = {
          action,
          repo: repository.full_name,
          tag: release.tag_name,
          author: release.author.login,
          isDraft: release.draft,
          isPrerelease: release.prerelease,
          assets: release.assets.length,
        };
        break;
      }
      default:
        return { processed: false, message: `Unknown GitHub event: ${event}` };
      }

      if (this.eventBus) {
        await this.eventBus.emit(eventData);
      }

      return { processed: true, eventId: eventData.id, type: eventData.type };
    } catch (error) {
      console.error('GitHub webhook handling error:', error.message);
      return { processed: false, error: error.message };
    }
  }

  async handleSlackWebhook(payload) {
    try {
      const { type } = payload;

      if (type === 'url_verification') {
        return { challenge: payload.challenge };
      }

      if (type !== 'event_callback') {
        return { processed: false, message: 'Not an event callback' };
      }

      const event = payload.event;
      const eventData = {
        id: uuidv4(),
        provider: 'slack',
        webhookEvent: event.type,
        timestamp: Date.now(),
      };

      switch (event.type) {
      case 'message': {
        if (event.subtype) {
          return { processed: false, message: 'Subtype message ignored' };
        }
        eventData.type = 'chat.message';
        eventData.data = {
          user: event.user,
          channel: event.channel,
          text: event.text.substring(0, 500),
          ts: event.ts,
          threadTs: event.thread_ts,
        };
        break;
      }
      case 'app_mention': {
        eventData.type = 'chat.mention';
        eventData.data = {
          user: event.user,
          channel: event.channel,
          text: event.text.substring(0, 500),
          ts: event.ts,
        };
        break;
      }
      case 'reaction_added': {
        eventData.type = 'chat.reaction';
        eventData.data = {
          user: event.user,
          reaction: event.reaction,
          itemUser: event.item_user,
          ts: event.item.ts,
        };
        break;
      }
      case 'member_joined_channel': {
        eventData.type = 'chat.member-joined';
        eventData.data = {
          user: event.user,
          channel: event.channel,
        };
        break;
      }
      default:
        return { processed: false, message: `Unknown Slack event: ${event.type}` };
      }

      if (this.eventBus) {
        await this.eventBus.emit(eventData);
      }

      return { processed: true, eventId: eventData.id, type: eventData.type };
    } catch (error) {
      console.error('Slack webhook handling error:', error.message);
      return { processed: false, error: error.message };
    }
  }

  async handleGenericWebhook(provider, event, payload) {
    try {
      const eventData = {
        id: uuidv4(),
        provider,
        webhookEvent: event,
        type: `${provider}.webhook`,
        data: payload,
        timestamp: Date.now(),
      };

      if (this.eventBus) {
        await this.eventBus.emit(eventData);
      }

      return { processed: true, eventId: eventData.id };
    } catch (error) {
      console.error(`${provider} webhook handling error:`, error.message);
      return { processed: false, error: error.message };
    }
  }

  getWebhookUrl(provider) {
    const baseUrl = process.env.WEBHOOK_BASE_URL || 'http://localhost:3400';
    return `${baseUrl}/api/v1/webhooks/${provider}`;
  }

  getGitHubWebhookUrl() {
    return this.getWebhookUrl('github');
  }

  getSlackWebhookUrl() {
    return this.getWebhookUrl('slack');
  }
}

export default WebhookHandler;
