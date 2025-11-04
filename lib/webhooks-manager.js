// Webhooks Manager - Handles incoming webhooks from GitHub and Slack
// Processes events and syncs data back to TooLoo.ai

import crypto from 'crypto';

export default {
  // Verify GitHub webhook signature
  verifyGitHubSignature(payload, signature, secret) {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const computed = `sha256=${hmac.digest('hex')}`;
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computed));
  },

  // Verify Slack webhook signature
  verifySlackSignature(timestamp, signature, signingSecret) {
    // Reject if request is older than 5 minutes
    if (Math.abs(Date.now() - parseInt(timestamp) * 1000) > 300000) {
      return false;
    }
    
    const baseString = `v0:${timestamp}:${signature.split('=')[1]}`;
    const hmac = crypto.createHmac('sha256', signingSecret);
    hmac.update(`v0:${timestamp}:${baseString}`);
    const computed = `v0=${hmac.digest('hex')}`;
    return signature === computed;
  },

  // Handle GitHub push event
  handleGitHubPush(payload) {
    return {
      type: 'github:push',
      repository: payload.repository.full_name,
      branch: payload.ref.split('/').pop(),
      commits: payload.commits.map(c => ({
        sha: c.id.substring(0, 7),
        message: c.message,
        author: c.author.name,
        timestamp: c.timestamp
      })),
      pusher: payload.pusher.name,
      timestamp: new Date().toISOString()
    };
  },

  // Handle GitHub pull request event
  handleGitHubPullRequest(payload) {
    const action = payload.action;
    return {
      type: 'github:pull_request',
      action: action,
      repository: payload.repository.full_name,
      pr: {
        number: payload.pull_request.number,
        title: payload.pull_request.title,
        state: payload.pull_request.state,
        author: payload.pull_request.user.login,
        url: payload.pull_request.html_url
      },
      timestamp: new Date().toISOString()
    };
  },

  // Handle GitHub issue event
  handleGitHubIssue(payload) {
    const action = payload.action;
    return {
      type: 'github:issue',
      action: action,
      repository: payload.repository.full_name,
      issue: {
        number: payload.issue.number,
        title: payload.issue.title,
        state: payload.issue.state,
        author: payload.issue.user.login,
        url: payload.issue.html_url,
        labels: payload.issue.labels.map(l => l.name)
      },
      timestamp: new Date().toISOString()
    };
  },

  // Handle Slack message event
  handleSlackMessage(payload) {
    return {
      type: 'slack:message',
      channel: payload.event.channel,
      user: payload.event.user,
      text: payload.event.text,
      timestamp: payload.event.ts,
      teamId: payload.team_id
    };
  },

  // Handle Slack reaction event
  handleSlackReaction(payload) {
    return {
      type: 'slack:reaction',
      action: payload.event.type,
      reaction: payload.event.reaction,
      user: payload.event.user,
      item: payload.event.item,
      teamId: payload.team_id,
      timestamp: new Date().toISOString()
    };
  },

  // Handle Slack app mention event
  handleSlackAppMention(payload) {
    return {
      type: 'slack:app_mention',
      channel: payload.event.channel,
      user: payload.event.user,
      text: payload.event.text,
      teamId: payload.team_id,
      timestamp: new Date().toISOString()
    };
  },

  // Route GitHub event to handler
  processGitHubEvent(eventType, payload) {
    switch (eventType) {
      case 'push':
        return this.handleGitHubPush(payload);
      case 'pull_request':
        return this.handleGitHubPullRequest(payload);
      case 'issues':
        return this.handleGitHubIssue(payload);
      default:
        return { type: `github:${eventType}`, data: payload };
    }
  },

  // Route Slack event to handler
  processSlackEvent(eventType, payload) {
    switch (eventType) {
      case 'message':
        return this.handleSlackMessage(payload);
      case 'reaction_added':
      case 'reaction_removed':
        return this.handleSlackReaction(payload);
      case 'app_mention':
        return this.handleSlackAppMention(payload);
      default:
        return { type: `slack:${eventType}`, data: payload };
    }
  }
};
