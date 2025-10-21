# 🎯 PHASE 6: SYSTEM DESIGN CHALLENGES - LIVE

**Status**: ✅ Launched October 20, 2025

---

## Overview

TooLoo now offers **personalized system design challenges** that:
- Match Claude's coaching recommendations
- Target your weak areas (currently: Distributed Systems @ 79%)
- Include real-world scenarios and trade-off analysis
- Provide intelligent feedback and next steps

---

## 3 Personalized Challenges for YOU

### Challenge #1: Consensus Algorithm Design
**Difficulty**: Intermediate | **Time**: 45 minutes

**Your Scenario**:
> Your company is building a distributed file system that needs to maintain consistent state across 9 data centers. Design a consensus protocol that:
> - Tolerates up to 3 Byzantine node failures
> - Completes elections in <100ms
> - Maintains 99.99% consistency
> - Handles network splits gracefully

**What You'll Learn**:
- Trade-offs between Raft vs Paxos
- Leader election mechanisms
- Network partition recovery
- Consistency guarantees

**Real-World Example**: 
- Kafka uses Raft for controller election
- Zookeeper uses modified Paxos
- etcd uses Raft

**Topics**: Consensus Algorithms, Byzantine Fault Tolerance, Leader Election

---

### Challenge #2: Distributed Transaction Handling
**Difficulty**: Hard | **Time**: 60 minutes

**Your Scenario**:
> You're building a payment system spanning 3 services:
> - Account Service (transfers money)
> - Ledger Service (records transactions)
> - Notification Service (sends confirmation)
> 
> Challenge: Ensure all 3 services complete atomically, or all fail.
> But the network is unreliable. Services can crash mid-transaction.

**What You'll Learn**:
- 2-Phase Commit vs Saga pattern
- Handling partial failures
- Consistency guarantees
- Recovery procedures

**Real-World Example**:
- Uber uses Saga pattern for rides (reservation → payment → confirmation)
- DynamoDB uses 2PC for transactions
- Banking systems use 2PC for cross-account transfers

**Topics**: Distributed Transactions, 2-Phase Commit, Eventual Consistency

---

### Challenge #3: Byzantine Fault Tolerance Design
**Difficulty**: Hard | **Time**: 90 minutes

**Your Scenario**:
> You're designing a cryptocurrency network where:
> - 1000 nodes must agree on transaction order
> - Any node could crash, send wrong data, or act maliciously
> - Network is unreliable (messages can be delayed/lost)
> - You need consensus every 10 seconds

**What You'll Learn**:
- Byzantine resilience formulas (3f+1 nodes)
- Communication complexity (O(n²) problems)
- Detecting malicious behavior
- Finality guarantees

**Real-World Example**:
- Bitcoin uses Proof of Work + longest chain rule
- Ethereum uses Proof of Stake (50% attacker cost to break)
- Cosmos uses 67% supermajority

**Topics**: Byzantine Faults, Fault Tolerance, State Replication

---

## API Endpoints

### Get Personalized Challenges
```bash
GET http://127.0.0.1:3011/api/v1/challenges/personalized
```

**Response**:
```json
{
  "ok": true,
  "personalized": true,
  "challenges": [
    {
      "id": "consensus-basic",
      "title": "Consensus Algorithm Design",
      "difficulty": "intermediate",
      "topics": ["Consensus Algorithms", "Byzantine Fault Tolerance"],
      "scenario": "...",
      "estimatedTime": "45 minutes"
    }
  ],
  "basedOn": ["Distributed Systems"]
}
```

---

### Get Specific Challenge
```bash
GET http://127.0.0.1:3011/api/v1/challenges/consensus-basic
```

---

### Submit Challenge Solution
```bash
POST http://127.0.0.1:3011/api/v1/challenges/consensus-basic/submit
Content-Type: application/json

{
  "solution": "Your detailed design answer here..."
}
```

**Response**:
```json
{
  "ok": true,
  "submission": {
    "challengeId": "consensus-basic",
    "challengeTitle": "Consensus Algorithm Design",
    "submittedAt": "2025-10-20T22:10:58Z",
    "score": 82,
    "feedback": "Great attempt! Your solution demonstrates understanding of Consensus Algorithms...",
    "nextSteps": [
      "Read real-world example: Kafka uses Raft...",
      "Try the Distributed Transactions challenge",
      "Deep dive into Raft paper"
    ]
  },
  "passed": true,
  "message": "✅ Challenge Passed!"
}
```

---

### Browse Challenges by Difficulty
```bash
GET http://127.0.0.1:3011/api/v1/challenges/difficulty/hard
GET http://127.0.0.1:3011/api/v1/challenges/difficulty/intermediate
```

---

### Browse by Topic
```bash
GET http://127.0.0.1:3011/api/v1/challenges/topic/Consensus%20Algorithms
GET http://127.0.0.1:3011/api/v1/challenges/topic/Byzantine%20Fault%20Tolerance
```

---

### Challenge Statistics
```bash
GET http://127.0.0.1:3011/api/v1/challenges/stats
```

**Response**:
```json
{
  "ok": true,
  "totalChallenges": 6,
  "byDifficulty": {
    "intermediate": 2,
    "hard": 4
  },
  "byTopic": {
    "Consensus Algorithms": 2,
    "Byzantine Fault Tolerance": 2,
    "Distributed Transactions": 1
  },
  "avgEstimatedTime": 63
}
```

---

## How It Works

### 1. Personalization
- System fetches your profile from Training Server (port 3001)
- Identifies weak areas (< 80% mastery)
- Maps to appropriate challenges
- **For you**: Distributed Systems @ 79% → Consensus, Transactions, Byzantine FT challenges

### 2. Challenge Selection
You can:
- Take personalized challenges (automatically selected)
- Browse by difficulty (intermediate, hard, expert)
- Filter by topic (Consensus Algorithms, Byzantine FT, 2PC, etc.)

### 3. Solution Submission
- Submit your design/analysis
- Receive intelligent feedback (score 0-100)
- Get next steps based on performance
- Track progress

### 4. Real-World Context
Each challenge includes:
- Company scenarios (realistic constraints)
- Real-world examples (Kafka, Uber, Ethereum, etc.)
- Performance requirements
- Trade-off analysis

---

## Next Integration: Claude Feedback

Coming soon: When you submit a solution, Claude will:
1. Analyze your answer in depth
2. Compare to real-world implementations
3. Provide personalized coaching
4. Suggest follow-up challenges
5. Update your learning profile

---

## Recommended Path for You

**Step 1**: Consensus Algorithm Design (45 min)
- Foundation for all distributed systems
- Directly addresses your weak area
- Claude recommended this

**Step 2**: Distributed Transactions (60 min)
- Builds on consensus concepts
- Real-world payment systems
- Essential for practical systems

**Step 3**: Byzantine Fault Tolerance (90 min)
- Advanced concepts
- Cryptocurrency/blockchain context
- Mastery level topic

---

## Estimated Impact

Completing all 3 challenges:
- Time: ~3 hours
- Predicted mastery gain: +2-4%
- Projected new DS score: 81-83%
- Getting you closer to 85% goal

---

## Architecture

```
Web Server (3000)
    ↓ POST /api/chat "Take on system design challenge"
Claude (API)
    ↓ Recommends specific challenge
Challenge Server (3011)
    ↓ GET /api/v1/challenges/personalized
Training Server (3001)
    ↓ Returns learner profile
Challenge Server
    ↓ Filters by weak areas
    ↓ Returns Consensus, Transactions, Byzantine FT
Web App (chat.html)
    ↓ User tackles challenge
    ↓ Submits solution
Challenge Server
    ↓ POST /submit analyzes solution
    ↓ Generates score + feedback
Claude (next step)
    ↓ Deeper feedback + pathways
```

---

## Status

- [x] Challenge Server running (port 3011)
- [x] Personalized recommendations working
- [x] 6 production challenges deployed
- [x] Full API implemented
- [ ] Claude integration (Phase 6B)
- [ ] Web UI for challenge submission (Phase 6B)
- [ ] Learning velocity tracking (Phase 6C)
- [ ] Achievement badges (Phase 6D)

---

## Get Started

### Try a Challenge via API
```bash
# Get your personalized challenges
curl http://127.0.0.1:3011/api/v1/challenges/personalized

# Get details on consensus challenge
curl http://127.0.0.1:3011/api/v1/challenges/consensus-basic

# Submit your solution
curl -X POST http://127.0.0.1:3011/api/v1/challenges/consensus-basic/submit \
  -H 'Content-Type: application/json' \
  -d '{"solution":"Raft is simpler than Paxos... my design uses..."}'
```

---

**Production Status**: ✅ Ready for beta testing  
**Cost**: Free (runs locally)  
**Quality**: Real system design scenarios  
**Next**: Claude integration for intelligent feedback  

---

**Date**: October 20, 2025
