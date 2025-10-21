import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.CHALLENGE_PORT || 3011;
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const TRAINING_PORT = process.env.TRAINING_PORT || 3001;
const TRAINING_BASE = `http://127.0.0.1:${TRAINING_PORT}`;

// System design challenges mapped to weak domain areas
const CHALLENGES = {
  distributed: [
    {
      id: 'consensus-basic',
      title: 'Consensus Algorithm Design',
      difficulty: 'intermediate',
      topics: ['Consensus Algorithms', 'Byzantine Fault Tolerance', 'Leader Election'],
      description: 'Design a consensus protocol for a distributed database that can tolerate up to 3 node failures out of 9.',
      objectives: [
        'Understand Raft vs Paxos trade-offs',
        'Implement leader election',
        'Handle network partitions',
        'Ensure consistency guarantees'
      ],
      scenario: `
Your company is building a distributed file system that needs to maintain 
consistent state across 9 data centers. You must design a consensus protocol that:
- Tolerates up to 3 Byzantine node failures
- Completes elections in <100ms
- Maintains 99.99% consistency
- Handles network splits gracefully

Questions:
1. Which consensus algorithm fits best? Why?
2. What are the trade-offs vs your alternative?
3. How do you handle split-brain scenarios?
4. What's your replication factor and why?
      `,
      hints: [
        'Hint 1: Raft is simpler, Paxos more fault-tolerant',
        'Hint 2: Quorum-based approaches require (n/2)+1 nodes',
        'Hint 3: Think about network partition recovery'
      ],
      realWorldExample: 'Kafka uses Raft for controller election. Zookeeper uses modified Paxos.',
      estimatedTime: '45 minutes'
    },
    {
      id: 'distributed-transactions',
      title: 'Distributed Transaction Handling',
      difficulty: 'hard',
      topics: ['Distributed Transactions', '2-Phase Commit', 'Eventual Consistency'],
      description: 'Design a transaction system that handles failures across multiple services.',
      scenario: `
You're building a payment system spanning 3 services:
- Account Service (transfers money)
- Ledger Service (records transactions)
- Notification Service (sends confirmation)

Challenge: Ensure all 3 services complete atomically, or all fail.
But the network is unreliable. Services can crash mid-transaction.

Design:
1. What protocol do you use? (2PC, Saga, Event Sourcing?)
2. How do you handle partial failures?
3. What are your consistency guarantees?
4. How do you recover from crashes?
      `,
      hints: [
        'Hint 1: 2PC is synchronous but blocks on failures',
        'Hint 2: Saga pattern allows asynchronous compensation',
        'Hint 3: Event sourcing provides audit trail'
      ],
      realWorldExample: 'Uber uses the Saga pattern. DynamoDB uses 2PC for transactions.',
      estimatedTime: '60 minutes'
    },
    {
      id: 'fault-tolerance',
      title: 'Byzantine Fault Tolerance Design',
      difficulty: 'hard',
      topics: ['Byzantine Faults', 'Fault Tolerance', 'State Replication'],
      description: 'Design a system that continues operating even when nodes behave arbitrarily.',
      scenario: `
You're designing a cryptocurrency network where:
- 1000 nodes must agree on transaction order
- Any node could crash, send wrong data, or act maliciously
- Network is unreliable (messages can be delayed/lost)
- You need consensus every 10 seconds

Design:
1. How many nodes do you need for fault tolerance?
2. What's the communication complexity?
3. How do you detect malicious nodes?
4. What's your finality guarantee?
      `,
      hints: [
        'Hint 1: Byzantine resilience requires 3f+1 nodes',
        'Hint 2: Communication is O(n²) in naive approaches',
        'Hint 3: Cryptographic proofs help detect dishonesty'
      ],
      realWorldExample: 'Bitcoin uses Proof of Work. Ethereum uses Proof of Stake.',
      estimatedTime: '90 minutes'
    }
  ],
  transactions: [
    {
      id: 'acid-design',
      title: 'ACID Guarantee Implementation',
      difficulty: 'intermediate',
      topics: ['ACID Properties', 'Locking', 'Logging'],
      description: 'Design a storage engine that guarantees ACID properties.',
      scenario: `
Implement a mini key-value database that guarantees:
- Atomicity: All-or-nothing transactions
- Consistency: No corruption across operations
- Isolation: Concurrent reads/writes don't interfere
- Durability: Crashed data survives

Design your approach for:
1. Write-ahead logging
2. Lock management
3. Conflict resolution
4. Recovery procedures
      `,
      estimatedTime: '60 minutes'
    }
  ],
  architecture: [
    {
      id: 'microservices-design',
      title: 'Microservices Architecture',
      difficulty: 'intermediate',
      topics: ['Microservices', 'Service Discovery', 'Circuit Breakers'],
      description: 'Design a resilient microservices system.',
      scenario: `
Your monolith is breaking into 12 services. Design:
1. Service communication protocol
2. Failure isolation (circuit breakers)
3. Service discovery mechanism
4. Distributed tracing
      `,
      estimatedTime: '45 minutes'
    }
  ]
};

// Load learner profile to personalize challenges
async function getLearnerProfile() {
  try {
    const resp = await fetch(`${TRAINING_BASE}/api/v1/training/overview`);
    const data = await resp.json();
    if (data?.data?.domains) {
      return data.data.domains;
    }
  } catch (e) {
    console.error('Failed to fetch learner profile:', e.message);
  }
  return null;
}

// Generate personalized challenges based on weak areas
async function getPersonalizedChallenges(learnerProfile) {
  if (!learnerProfile) return [];
  
  // Find weak areas (< 80%)
  const weakAreas = learnerProfile
    .filter(d => d.mastery < 80)
    .map(d => d.topic)
    .sort((a, b) => {
      // Prioritize by how far below 80%
      const aGap = 80 - learnerProfile.find(x => x.topic === a).mastery;
      const bGap = 80 - learnerProfile.find(x => x.topic === b).mastery;
      return bGap - aGap;
    });

  // Map topics to challenge categories
  const topicToCategory = {
    distributed: 'distributed',
    transactions: 'transactions',
    architecture: 'architecture'
  };

  // Get challenges for weak areas
  const recommended = [];
  for (const area of weakAreas.slice(0, 3)) {
    const category = topicToCategory[area] || area;
    const categoryChalls = CHALLENGES[category] || [];
    if (categoryChalls.length > 0) {
      recommended.push(...categoryChalls);
    }
  }

  return recommended;
}

// API Endpoints

app.get('/health', (req, res) => {
  res.json({ ok: true, server: 'challenge', time: new Date().toISOString() });
});

// Get all available challenges
app.get('/api/v1/challenges/all', (req, res) => {
  try {
    const allChallenges = Object.values(CHALLENGES).flat();
    res.json({ ok: true, challenges: allChallenges, count: allChallenges.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get personalized challenges based on learner profile
app.get('/api/v1/challenges/personalized', async (req, res) => {
  try {
    const profile = await getLearnerProfile();
    const challenges = await getPersonalizedChallenges(profile);
    
    res.json({
      ok: true,
      personalized: true,
      challenges,
      count: challenges.length,
      basedOn: profile ? profile.filter(d => d.mastery < 80).map(d => d.name) : []
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get specific challenge by ID
app.get('/api/v1/challenges/:id', (req, res) => {
  try {
    const { id } = req.params;
    const challenge = Object.values(CHALLENGES)
      .flat()
      .find(c => c.id === id);
    
    if (!challenge) {
      return res.status(404).json({ ok: false, error: 'Challenge not found' });
    }
    
    res.json({ ok: true, challenge });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Call Claude for deep challenge analysis
async function analyzeWithClaude(challenge, solution) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('⚠️  ANTHROPIC_API_KEY not set, using fallback analysis');
    return generateFallbackAnalysis(challenge, solution);
  }

  try {
    const systemPrompt = `You are an expert system design coach evaluating a student's solution to a distributed systems challenge.

Challenge: ${challenge.title}
Topics: ${challenge.topics.join(', ')}

Your task:
1. Evaluate the solution depth and correctness (0-100 score)
2. Identify what they got RIGHT (strengths)
3. Identify conceptual GAPS (areas to improve)
4. Compare to REAL-WORLD implementations: ${challenge.realWorldExample}
5. Recommend SPECIFIC follow-up topics
6. Suggest the NEXT challenge they should tackle

Respond in JSON format:
{
  "score": 75,
  "strengths": ["Clear understanding of X", "Correctly identified Y"],
  "gaps": ["Missing consideration of Z", "Didn't address A"],
  "realWorldComparison": "How their approach compares to actual implementations",
  "focusAreas": ["Topic 1", "Topic 2", "Topic 3"],
  "nextChallenge": "challenge-id-or-topic",
  "deepFeedback": "Paragraph of personalized coaching"
}`;

    const userMessage = `Please analyze this solution to "${challenge.title}":

${solution}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Claude API error:', err);
      return generateFallbackAnalysis(challenge, solution);
    }

    const data = await response.json();
    const claudeResponse = data.content?.[0]?.text || '';
    
    // Parse Claude's JSON response
    const jsonMatch = claudeResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return generateFallbackAnalysis(challenge, solution);
  } catch (e) {
    console.error('Claude analysis failed:', e.message);
    return generateFallbackAnalysis(challenge, solution);
  }
}

// Fallback analysis when Claude unavailable
function generateFallbackAnalysis(challenge, solution) {
  const solutionLC = solution.toLowerCase();
  let score = 70;
  const strengths = [];
  const gaps = [];

  // Analyze based on key terms
  if (challenge.id === 'consensus-basic') {
    if (solutionLC.includes('raft')) score += 10;
    if (solutionLC.includes('quorum')) score += 5;
    if (solutionLC.includes('partition')) score += 5;
    if (solutionLC.includes('paxos')) score += 3;
    
    if (solutionLC.includes('raft')) strengths.push('Correctly identified Raft as suitable algorithm');
    if (solutionLC.includes('majority')) strengths.push('Understood majority-based replication');
    if (!solutionLC.includes('split-brain')) gaps.push('Missing analysis of split-brain scenarios');
    if (!solutionLC.includes('election')) gaps.push('Could elaborate more on leader election');
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    strengths: strengths.length > 0 ? strengths : ['Shows conceptual understanding'],
    gaps: gaps.length > 0 ? gaps : ['Consider deeper analysis of trade-offs'],
    realWorldComparison: challenge.realWorldExample,
    focusAreas: challenge.topics,
    nextChallenge: 'distributed-transactions',
    deepFeedback: `Good attempt on "${challenge.title}". Your solution demonstrates understanding of the core concepts. To improve, focus on the areas mentioned and explore the real-world implementations.`
  };
}

// Submit challenge solution (with Claude integration)
app.post('/api/v1/challenges/:id/submit', async (req, res) => {
  try {
    const { id } = req.params;
    const { solution } = req.body;
    
    if (!solution || solution.trim().length < 50) {
      return res.status(400).json({ ok: false, error: 'Solution must be at least 50 characters' });
    }
    
    const challenge = Object.values(CHALLENGES)
      .flat()
      .find(c => c.id === id);
    
    if (!challenge) {
      return res.status(404).json({ ok: false, error: 'Challenge not found' });
    }
    
    // Get Claude's analysis
    const analysis = await analyzeWithClaude(challenge, solution);
    
    // Build comprehensive feedback
    const feedback = {
      challengeId: id,
      challengeTitle: challenge.title,
      submittedAt: new Date().toISOString(),
      solutionLength: solution.length,
      score: analysis.score,
      strengths: analysis.strengths,
      gaps: analysis.gaps,
      realWorldContext: analysis.realWorldComparison,
      deepFeedback: analysis.deepFeedback,
      focusAreas: analysis.focusAreas,
      nextRecommendation: analysis.nextChallenge,
      nextSteps: [
        `Focus on these areas: ${analysis.focusAreas.slice(0, 2).join(', ')}`,
        `Study real-world implementation: ${challenge.realWorldExample}`,
        `Next challenge: ${analysis.nextChallenge || 'Try the next difficulty level'}`
      ]
    };
    
    res.json({
      ok: true,
      submission: feedback,
      passed: analysis.score >= 75,
      message: analysis.score >= 75 ? '✅ Challenge Passed!' : '⏳ Keep Improving'
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get challenges by difficulty
app.get('/api/v1/challenges/difficulty/:level', (req, res) => {
  try {
    const { level } = req.params;
    const challenges = Object.values(CHALLENGES)
      .flat()
      .filter(c => c.difficulty === level);
    
    res.json({ ok: true, difficulty: level, challenges, count: challenges.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get challenges by topic
app.get('/api/v1/challenges/topic/:topic', (req, res) => {
  try {
    const { topic } = req.params;
    const allChallenges = Object.values(CHALLENGES).flat();
    const challenges = allChallenges.filter(c =>
      c.topics.some(t => t.toLowerCase().includes(topic.toLowerCase()))
    );
    
    res.json({ ok: true, topic, challenges, count: challenges.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get challenge statistics
app.get('/api/v1/challenges/stats', async (req, res) => {
  try {
    const allChallenges = Object.values(CHALLENGES).flat();
    const difficulties = {};
    const topics = {};
    
    allChallenges.forEach(c => {
      difficulties[c.difficulty] = (difficulties[c.difficulty] || 0) + 1;
      c.topics.forEach(t => {
        topics[t] = (topics[t] || 0) + 1;
      });
    });
    
    res.json({
      ok: true,
      totalChallenges: allChallenges.length,
      byDifficulty: difficulties,
      byTopic: topics,
      avgEstimatedTime: Math.round(
        allChallenges.reduce((sum, c) => {
          const time = parseInt(c.estimatedTime);
          return sum + (isNaN(time) ? 45 : time);
        }, 0) / allChallenges.length
      )
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Listen
app.listen(PORT, () => {
  console.log(`✅ Challenge Server running on port ${PORT}`);
});
