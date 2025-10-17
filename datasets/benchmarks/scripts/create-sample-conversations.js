// Sample Real-World Test Conversations
// Create test files in various formats for validation

import fs from 'fs';
import path from 'path';

const sampleDir = './sample-conversations';

// Create sample directory
if (!fs.existsSync(sampleDir)) {
  fs.mkdirSync(sampleDir, { recursive: true });
}

// Sample 1: Discord-style conversation
const discordSample = {
  "guild": { "name": "Test Server" },
  "channel": { "name": "general" },
  "messages": [
    {
      "id": "1001",
      "timestamp": "2025-10-08T10:00:00.000Z",
      "author": { "name": "Alice", "id": "user1" },
      "content": "Hey team, I've been thinking about our upcoming project launch. We need to make sure we cover all the risks before we proceed."
    },
    {
      "id": "1002", 
      "timestamp": "2025-10-08T10:02:00.000Z",
      "author": { "name": "Bob", "id": "user2" },
      "content": "Good point Alice. What specific risks are you thinking about? I'd like to get this moving quickly if possible."
    },
    {
      "id": "1003",
      "timestamp": "2025-10-08T10:05:00.000Z", 
      "author": { "name": "Alice", "id": "user1" },
      "content": "Well, we haven't fully tested the integration with the payment system. That could cause major issues if it fails in production. Should we do more thorough testing first?"
    },
    {
      "id": "1004",
      "timestamp": "2025-10-08T10:07:00.000Z",
      "author": { "name": "Bob", "id": "user2" },
      "content": "You're right about the payment integration. Let's set up a comprehensive testing phase. Can you create a structured plan for that?"
    },
    {
      "id": "1005",
      "timestamp": "2025-10-08T10:10:00.000Z",
      "author": { "name": "Alice", "id": "user1" },
      "content": "Absolutely! I'll create a detailed testing checklist with priority levels. We should also consider what happens if we find critical issues during testing."
    },
    {
      "id": "1006",
      "timestamp": "2025-10-08T10:12:00.000Z",
      "author": { "name": "Bob", "id": "user2" },
      "content": "Perfect. Once you have that plan ready, should we proceed with implementation or do we need another approval round?"
    }
  ]
};

fs.writeFileSync(path.join(sampleDir, 'discord-sample.json'), JSON.stringify(discordSample, null, 2));

// Sample 2: WhatsApp-style conversation  
const whatsappSample = `[08/10/2025, 14:30:15] Sarah: I'm really struggling with this decision. There are so many factors to consider.
[08/10/2025, 14:32:22] Mike: What's the main thing that's bothering you about it?
[08/10/2025, 14:35:10] Sarah: Well, if we go with option A, it's faster but riskier. Option B is safer but takes much longer.
[08/10/2025, 14:36:45] Mike: Hmm, what does your gut tell you? Sometimes the obvious choice is right.
[08/10/2025, 14:38:30] Sarah: My gut says go with A, but my head says B is smarter. I hate being stuck like this.
[08/10/2025, 14:40:12] Mike: Why don't we make a quick list of pros and cons for each? That might help clarify things.
[08/10/2025, 14:42:00] Sarah: Good idea! Can you help me think through the worst-case scenarios for each option?
[08/10/2025, 14:44:30] Mike: Sure! For option A, worst case is we fail fast but learn quickly. For B, worst case is we succeed slowly but miss the opportunity window.
[08/10/2025, 14:46:15] Sarah: That actually helps a lot. I think I'm leaning toward A now. Should we just go for it?`;

fs.writeFileSync(path.join(sampleDir, 'whatsapp-sample.txt'), whatsappSample);

// Sample 3: Slack-style conversation
const slackSample = `{"type":"message","user":"U1234","text":"Quick question - do we have approval to move forward with the database migration?","ts":"1728385200.123456","user_profile":{"display_name":"Chris"}}
{"type":"message","user":"U5678","text":"I think we need to check with the security team first. This affects user data, right?","ts":"1728385320.234567","user_profile":{"display_name":"Dana"}}
{"type":"message","user":"U1234","text":"Yes, it involves user data. Should I set up a meeting with security or just send them the details?","ts":"1728385440.345678","user_profile":{"display_name":"Chris"}}
{"type":"message","user":"U5678","text":"Let's do a quick meeting. I prefer face-to-face for these kinds of discussions.","ts":"1728385560.456789","user_profile":{"display_name":"Dana"}}
{"type":"message","user":"U1234","text":"Perfect! I'll schedule something for this week. Want me to include the full technical specs?","ts":"1728385680.567890","user_profile":{"display_name":"Chris"}}`;

fs.writeFileSync(path.join(sampleDir, 'slack-sample.json'), slackSample);

// Sample 4: Plain text conversation
const plainTextSample = `Alex: I've been analyzing our customer feedback, and there's a clear pattern emerging.
Jordan: What kind of pattern? Good or concerning?
Alex: Mixed, but definitely something we should address. Customers love the core features but find the interface confusing.
Jordan: That's actually really valuable feedback. Do we have specific examples of what's confusing?
Alex: Yes, mainly the navigation and the way we present options. People want simpler, more direct paths to what they need.
Jordan: Makes sense. Should we prioritize a UI overhaul or focus on incremental improvements?
Alex: I think incremental is smarter. We can test changes with small groups first and see what works.
Jordan: Good approach. Can you put together a plan with the top 3 issues to tackle first?`;

fs.writeFileSync(path.join(sampleDir, 'plain-text-sample.txt'), plainTextSample);

// Sample 5: JSON standardized format
const jsonSample = {
  "messages": [
    {
      "id": "msg1",
      "timestamp": "2025-10-08T16:00:00.000Z",
      "author": "Taylor",
      "content": "I need to make a decision about the budget allocation, but I want to make sure we're not missing anything important."
    },
    {
      "id": "msg2", 
      "timestamp": "2025-10-08T16:02:00.000Z",
      "author": "Morgan",
      "content": "What's the main trade-off you're seeing? Is it about resources or timeline?"
    },
    {
      "id": "msg3",
      "timestamp": "2025-10-08T16:05:00.000Z",
      "author": "Taylor", 
      "content": "Both really. We can either invest heavily in marketing now and potentially see faster growth, or be more conservative and build up reserves."
    },
    {
      "id": "msg4",
      "timestamp": "2025-10-08T16:07:00.000Z",
      "author": "Morgan",
      "content": "That's a classic risk versus reward scenario. What does our data say about similar decisions in the past?"
    },
    {
      "id": "msg5",
      "timestamp": "2025-10-08T16:10:00.000Z",
      "author": "Taylor",
      "content": "Historical data suggests the aggressive approach works when market conditions are stable, but we're in uncertain times right now."
    },
    {
      "id": "msg6",
      "timestamp": "2025-10-08T16:12:00.000Z",
      "author": "Morgan",
      "content": "Given that uncertainty, maybe a hybrid approach? Moderate marketing spend with stronger reserves?"
    }
  ],
  "metadata": {
    "platform": "meeting-notes",
    "participants": ["Taylor", "Morgan"],
    "topic": "Budget Allocation Decision"
  }
};

fs.writeFileSync(path.join(sampleDir, 'json-sample.json'), JSON.stringify(jsonSample, null, 2));

console.log('✅ Sample conversation files created in ./sample-conversations/');
console.log('Files:');
console.log('  • discord-sample.json (Discord export format)');
console.log('  • whatsapp-sample.txt (WhatsApp export format)');
console.log('  • slack-sample.json (Slack export format)');  
console.log('  • plain-text-sample.txt (Simple text format)');
console.log('  • json-sample.json (Standardized JSON format)');
console.log('\nTest with: node scripts/real-world-test.js sample-conversations/discord-sample.json');