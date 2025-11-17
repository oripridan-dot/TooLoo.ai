# Phase 4.4: Slack Integration - Quick Start Blueprint

**Timeline:** November 19-21, 2025 (2-3 days)  
**Status:** ⏳ READY FOR IMMEDIATE START  
**Pattern:** Follow GitHub Integration model (Engine + REST Endpoints)

---

## Phase Overview

Phase 4.4 extends TooLoo.ai's collaboration capabilities to Slack, enabling:

- **Real-time notifications** of analysis completions
- **Channel-based alerts** for anomalies and findings
- **Threaded discussions** of analysis results
- **Webhook integration** for bidirectional communication
- **Slack app integration** for native Slack experience

---

## Architecture Pattern (Proven in Phase 4.3)

### Step 1: Create SlackNotificationEngine (/engine/slack-notification-engine.js)

**Based on:** GitHubIntegrationEngine pattern (537 lines)

**Key Methods:**
```javascript
class SlackNotificationEngine {
  constructor(slackProvider) {
    this.slackProvider = slackProvider;
    this.channelConfig = {};
    this.notificationStats = {
      sent: 0,
      failed: 0,
      channels: 0
    };
  }

  // Send analysis result to Slack
  async sendAnalysisNotification(analysis, options = {})
  
  // Send finding alert with formatting
  async sendFindingAlert(finding, severity, options = {})
  
  // Create threaded discussion
  async createAnalysisThread(analysis, messages = [])
  
  // Configure channel routing rules
  configureChannelRouting(rules = {})
  
  // Get notification statistics
  getStats()
  
  // Reset statistics
  resetStats()
}
```

### Step 2: Enhance SlackProvider (/engine/slack-provider.js)

**Similar to:** GitHubProvider write methods

**Key Methods:**
```javascript
class SlackProvider {
  // Send message to channel
  async sendMessage(channelId, message)
  
  // Send rich formatted blocks
  async sendBlocks(channelId, blocks)
  
  // Post to webhook
  async postToWebhook(webhookUrl, payload)
  
  // Create thread
  async createThread(channelId, threadTs, message)
  
  // Upload file
  async uploadFile(channelId, filename, content)
  
  // Update user status
  async updateStatus(status, emoji)
  
  // Validate webhook
  isConfigured()
}
```

### Step 3: Add REST Endpoints (servers/web-server.js)

**Pattern:** 8 endpoints (like GitHub)

```
GET  /api/v1/slack/status              - Workspace connection status
POST /api/v1/slack/send-message        - Send message to channel
POST /api/v1/slack/send-analysis       - Send analysis notification
POST /api/v1/slack/send-alert          - Send finding alert
POST /api/v1/slack/create-thread       - Create analysis thread
POST /api/v1/slack/configure-routing   - Set channel routing rules
GET  /api/v1/slack/notification-stats  - Get notification statistics
POST /api/v1/slack/reset-stats         - Reset statistics
```

---

## Implementation Roadmap (2-3 Days)

### Day 1 (Nov 19): Core Engine & Provider
**Estimated Time:** 4-5 hours

**Tasks:**
1. Create SlackNotificationEngine (537 lines)
   - [ ] Constructor and initialization
   - [ ] sendAnalysisNotification() method
   - [ ] sendFindingAlert() method
   - [ ] createAnalysisThread() method
   - [ ] configureChannelRouting() method
   - [ ] Statistics tracking

2. Create SlackProvider (300+ lines)
   - [ ] sendMessage() method
   - [ ] sendBlocks() method (for rich formatting)
   - [ ] postToWebhook() method
   - [ ] createThread() method
   - [ ] Error handling and validation
   - [ ] Configuration checking

3. Testing
   - [ ] Unit tests for all methods (8-10 tests)
   - [ ] Syntax verification
   - [ ] Import/export validation

### Day 2 (Nov 20): REST Endpoints & Integration
**Estimated Time:** 4-5 hours

**Tasks:**
1. Add 8 REST endpoints to web-server.js
   - [ ] GET /api/v1/slack/status
   - [ ] POST /api/v1/slack/send-message
   - [ ] POST /api/v1/slack/send-analysis
   - [ ] POST /api/v1/slack/send-alert
   - [ ] POST /api/v1/slack/create-thread
   - [ ] POST /api/v1/slack/configure-routing
   - [ ] GET /api/v1/slack/notification-stats
   - [ ] POST /api/v1/slack/reset-stats

2. Web-server integration
   - [ ] Initialize SlackNotificationEngine
   - [ ] Register in environment hub
   - [ ] Error handling on all endpoints
   - [ ] Response formatter integration

3. Testing
   - [ ] Endpoint functionality tests
   - [ ] Integration tests with engine
   - [ ] Error handling validation

### Day 3 (Nov 21): Advanced Features & Testing
**Estimated Time:** 3-4 hours

**Tasks:**
1. Advanced Features
   - [ ] Webhook integration
   - [ ] Message formatting templates
   - [ ] Channel routing logic
   - [ ] File upload support (optional)

2. Testing & Documentation
   - [ ] Complete test suite
   - [ ] Endpoint testing guide
   - [ ] Implementation documentation
   - [ ] Success criteria validation

3. Deployment Prep
   - [ ] Code review
   - [ ] Performance testing
   - [ ] Git commits and documentation
   - [ ] Ready for Phase 4.5

---

## Configuration Setup

### Slack Workspace Prerequisites

1. **Create Slack Workspace** (if not exists)
   - [ ] Go to slack.com/get-started
   - [ ] Create new workspace
   - [ ] Create notification channels (#analysis, #alerts, #automation)

2. **Create Slack App**
   - [ ] Go to api.slack.com/apps
   - [ ] "Create New App" → "From scratch"
   - [ ] Name: "TooLoo.ai Phase 4.4"
   - [ ] Workspace: Select your workspace
   - [ ] Create App

3. **Configure Bot Token**
   - [ ] In app settings: OAuth & Permissions
   - [ ] Under "Scopes", add:
     - `chat:write` - Send messages
     - `chat:write.public` - Send to public channels
     - `files:write` - Upload files
     - `users:write` - Update status (optional)
   - [ ] Install to workspace
   - [ ] Copy Bot User OAuth Token → `SLACK_BOT_TOKEN`
   - [ ] Copy App-Level Token → `SLACK_APP_TOKEN`

4. **Get Workspace ID**
   - [ ] In Slack workspace: Settings & Administration → Organization Settings
   - [ ] Find Workspace ID → `SLACK_WORKSPACE_ID`

5. **Get Channel IDs**
   - [ ] In Slack: Right-click channel → View channel details
   - [ ] Copy Channel ID for each channel
   - [ ] Store in config or environment

### Environment Variables

```bash
# .env
SLACK_BOT_TOKEN=xoxb-...         # Bot token
SLACK_APP_TOKEN=xapp-...         # App-level token
SLACK_WORKSPACE_ID=T...          # Workspace ID
SLACK_CHANNEL_ALERTS=#alerts     # Default alerts channel
SLACK_CHANNEL_ANALYSIS=#analysis # Default analysis channel
SLACK_WEBHOOK_URL=https://...    # Optional incoming webhook
```

---

## Code Templates (Boilerplate)

### SlackNotificationEngine Skeleton

```javascript
export default class SlackNotificationEngine {
  constructor(slackProvider = null) {
    this.slackProvider = slackProvider;
    this.channelConfig = {
      defaultAlerts: '#alerts',
      defaultAnalysis: '#analysis',
      routingRules: {}
    };
    this.notificationStats = {
      sent: 0,
      failed: 0,
      channels: 0
    };
  }

  async sendAnalysisNotification(analysis, options = {}) {
    try {
      if (!this.slackProvider) return { success: false, error: 'Slack not configured' };
      
      const channel = options.channel || this.channelConfig.defaultAnalysis;
      const message = this.formatAnalysisMessage(analysis);
      
      const result = await this.slackProvider.sendBlocks(channel, message.blocks);
      this.notificationStats.sent++;
      
      return { success: true, messageTs: result.ts, channel };
    } catch (error) {
      this.notificationStats.failed++;
      return { success: false, error: error.message };
    }
  }

  formatAnalysisMessage(analysis) {
    // Format analysis into Slack blocks
    return {
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: `Analysis: ${analysis.analysisType}` }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Primary*: ${analysis.primary}` },
            { type: 'mrkdwn', text: `*Confidence*: ${(analysis.confidence * 100).toFixed(1)}%` },
            { type: 'mrkdwn', text: `*Language*: ${analysis.language}` },
            { type: 'mrkdwn', text: `*Sentiment*: ${analysis.sentiment}` }
          ]
        }
      ]
    };
  }

  getStats() {
    return { ...this.notificationStats };
  }

  resetStats() {
    this.notificationStats = { sent: 0, failed: 0, channels: 0 };
    return { success: true };
  }
}
```

### REST Endpoint Template

```javascript
// POST /api/v1/slack/send-analysis
app.post('/api/v1/slack/send-analysis', async (req, res) => {
  try {
    const { analysis, channel } = req.body;
    if (!analysis) {
      return res.status(400).json({ error: 'Analysis object required' });
    }

    const result = await slackNotificationEngine.sendAnalysisNotification(analysis, {
      channel: channel || '#analysis'
    });

    res.json({
      success: result.success,
      title: 'Slack Analysis Notification',
      message: result.success ? 'Notification sent' : 'Notification failed',
      data: {
        success: result.success,
        messageTs: result.messageTs,
        channel: result.channel,
        error: result.error
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

## Testing Strategy

### Unit Tests (10+ tests)
1. SlackProvider method existence
2. Message formatting
3. Channel validation
4. Statistics tracking
5. Error handling
6. Thread creation
7. Block formatting
8. Webhook validation

### Integration Tests
1. End-to-end notification flow
2. Channel routing
3. Thread conversations
4. Error recovery

### Manual Testing (Slack Workspace)
1. Send message to channel
2. Verify message appears
3. Check message formatting
4. Verify statistics increment
5. Test error handling
6. Verify webhook delivery (if enabled)

---

## Success Criteria

For Phase 4.4 to be COMPLETE:

- [ ] SlackNotificationEngine implemented (537+ lines)
- [ ] SlackProvider with 6+ methods (300+ lines)
- [ ] 8 REST endpoints created
- [ ] 10+ unit tests passing
- [ ] All syntax verified
- [ ] Integration tests passing
- [ ] Documentation complete
- [ ] Ready for staging deployment

---

## Timeline & Milestones

| Date | Task | Status |
|------|------|--------|
| Nov 19 | SlackNotificationEngine + Provider | 🔵 Ready to start |
| Nov 19 | Unit tests (10/10) | 🔵 Ready to start |
| Nov 20 | REST endpoints (8/8) | 🔵 Ready to start |
| Nov 20 | Integration tests | 🔵 Ready to start |
| Nov 21 | Advanced features & documentation | 🔵 Ready to start |
| Nov 21 | Final validation | 🔵 Ready to start |

**Estimated Completion:** Nov 21 evening  
**Phase 4 Progress:** 75% (4.1 ✅ 4.2 ✅ 4.3 ✅ 4.4 🔵 4.5 ⏳)

---

## Resources

### Documentation to Create
- `/PHASE-4-4-SLACK-INTEGRATION.md` (technical specs)
- `/SLACK-TESTING-GUIDE.md` (step-by-step testing)
- `/tests/slack-integration.test.js` (unit tests)

### Reference Files
- Phase 4.3 implementation: `PHASE-4-3-GITHUB-API-IMPLEMENTATION-COMPLETE.md`
- Phase 4.3 code: `engine/github-integration-engine.js`
- GitHub provider code: `engine/github-provider.js`
- Web-server endpoints: `servers/web-server.js`

### Slack API Docs
- [Slack Web API](https://api.slack.com/methods)
- [Block Kit](https://api.slack.com/block-kit)
- [Interactive Components](https://api.slack.com/interactivity)
- [Webhooks](https://api.slack.com/messaging/webhooks)

---

## Notes & Tips

### Reuse What Works
- Use the same architecture as Phase 4.3
- Follow existing error handling patterns
- Use response formatter middleware (already exists)
- Follow existing endpoint structure

### Slack-Specific Considerations
- Slack API has rate limits (60 requests/minute for bots)
- Messages have 4000 character limit
- Block Kit for rich formatting (more flexible than markdown)
- Threads are ideal for analysis discussions
- Webhooks for incoming integrations

### Testing Without Real Slack
- Use mock slackProvider for unit tests
- Test message formatting separately
- Validate block structure before sending
- Use slack-cli for local testing (optional)

---

**Ready to Start Phase 4.4?**

1. ✅ Complete Phase 4.3 credential testing (Nov 18)
2. ✅ Start Phase 4.4 implementation (Nov 19)
3. ✅ Follow the timeline and tasks above
4. ✅ Test thoroughly before moving to Phase 4.5
5. ✅ Complete by Nov 21 evening

**Estimated Total Effort:** 10-12 hours over 3 days

Let's build this! 🚀
