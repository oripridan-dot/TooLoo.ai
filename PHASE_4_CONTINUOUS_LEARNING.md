# Phase 4: Continuous Learning & Adaptation

## Overview
Phase 4 introduces a Reinforcement Learning (RL) layer to the routing engine, allowing the system to learn from every interaction. Unlike the static weights of Phase 1 or the periodic benchmarks of Phase 2, Phase 4 adapts in real-time based on specific task types and user segments.

## Key Components

### 1. Q-Learning Optimizer (`src/precog/learning/q-learning-optimizer.ts`)
- **Algorithm**: Epsilon-Greedy Q-Learning.
- **State Space**: `TaskType` (Coding, Creative, Analysis, General) × `UserSegment` (Developer, Creative, etc.).
- **Action Space**: Available Providers (DeepSeek, Anthropic, OpenAI, Gemini).
- **Reward Function**: Composite score of Latency (speed), Success (reliability), and Quality (tokens/feedback).
- **Persistence**: Saves learned Q-values to `data/q-learning-state.json`.

### 2. Smart Router Integration (`src/precog/engine/smart-router.ts`)
- **Task Detection**: Automatically classifies prompts into task types.
- **Hybrid Ranking**:
    1.  Get base ranking from `ProviderScorecard` (Phase 1).
    2.  Consult `QLearningOptimizer` for the "learned best" provider.
    3.  Promote the learned provider to the top of the list.
- **Feedback Loop**:
    - On Success: Updates Q-value with positive reward (favors speed).
    - On Failure: Updates Q-value with negative penalty.

## How It Works
1.  **Request**: User sends "Write a Python script..."
2.  **Analysis**:
    - Segment: "Developer" (Phase 3)
    - Task: "CODING" (Phase 4)
3.  **Consultation**: Router asks Optimizer: "Who is best for CODING + Developer?"
4.  **Prediction**: Optimizer checks Q-table. Finds `DeepSeek` has highest Q-value (e.g., 0.85).
5.  **Execution**: Router tries `DeepSeek` first.
6.  **Learning**:
    - If successful and fast (100ms), reward is high (~1.0). Q-value increases.
    - If slow (2000ms), reward is lower (~0.6). Q-value increases slightly or decreases relative to others.
    - If failed, reward is -1.0. Q-value drops significantly.

## Verification
Verified via `tests/verify-q-learning.ts`:
- Simulated 10 iterations of a coding task.
- System started with Q=0.
- Quickly learned to prefer `DeepSeek` (100ms latency) over others (200-500ms).
- Demonstrated exploration (trying `OpenAI` once) and exploitation (sticking to `DeepSeek`).

## Next Steps
- Implement "Quality" feedback from user ratings (thumbs up/down).
- Add more granular task types.
- Tune hyperparameters (Alpha, Gamma, Epsilon) based on production data.
