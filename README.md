# 🧠 TooLoo.ai - GitHub Copilot Partnership Workspace

> **Building proven, future-adaptive AI-human collaboration workflows**

## What Is This?

This is NOT an app project. This is a **workspace for developing a high-performance partnership** between a product visionary (human) and GitHub Copilot (AI).

### The Mission

Build a **proven, successful, and future-adaptive workflow** where:
- AI executes flawlessly based on product vision
- Communication is clear and action-first
- Context is remembered across sessions
- Decisions are intelligent and autonomous
- Results are tested and verified

Once the partnership workflow is proven, building actual products becomes trivial.

## Setup

### Prerequisites

- Node.js 18.x or 20.x
- npm (comes with Node.js)
- Git

### Environment Configuration

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Configure your API keys:**
   
   Open `.env` and replace all `REPLACE_ME` values with your actual API keys:

   - **OpenAI API Key**: Get from https://platform.openai.com/api-keys
   - **Anthropic (Claude) API Key**: Get from https://console.anthropic.com/settings/keys
   - **DeepSeek API Key**: Get from https://platform.deepseek.com/api_keys
   - **ProductHunt API Key**: Get from https://api.producthunt.com/v2/docs
   - **Reddit API Credentials**: Create an app at https://www.reddit.com/prefs/apps

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Verify setup:**
   ```bash
   npm run check:placeholders  # Validates no placeholder tokens remain
   npm run info               # Shows workspace information
   ```

### Important Security Notes

- **NEVER commit your `.env` file** - it contains sensitive API keys
- The `.env` file is already in `.gitignore` for protection
- Always use `REPLACE_ME` in example files, never real tokens
- CI pipeline automatically checks for placeholder tokens before deployment

## Core Principles

### Zero Code Visibility
Code is implementation detail (like DNA). The human focuses on outcomes, AI handles execution.

### Quality Over Speed
No deadline pressure. Supreme reliability, functionality, and quality always.

### Done + Verified + Tested + Next
Every response shows: what was accomplished, how it was verified, what the impact is, and what comes next.

### Context Memory
AI remembers all decisions, builds on previous work, anticipates needs before being asked.

### Timeline as Version Control
DAW-style project history: save states, branch decisions, rollback to any phase, compare versions.

## Workspace Contents

```
TooLoo.ai/
├── .github/copilot-instructions.md    # Partnership rules and AI behavior
├── .copilot-profile.md                 # Human profile and preferences
├── README.md                           # This file
├── .env.example                        # Template for future projects
└── .gitignore                          # Standard ignores
```

## How It Works

### 1. Learning Phase (Current)
- Human gives real tasks
- AI executes and reports results
- Human provides feedback on what worked/didn't
- AI adjusts communication and decision patterns

### 2. Refinement Phase
- Lock in proven communication protocols
- Establish decision-making intelligence
- Build reliable context memory
- Test edge cases and stress scenarios

### 3. Production Phase
- Consistent success across diverse tasks
- Fast, autonomous execution with verified results
- Future-adaptive patterns that scale to any project

## Current Status

**Phase:** Learning  
**Focus:** Understanding work style and building trust  
**Progress:** Workspace cleaned, partnership rules established

## Key Documents

- [**Copilot Instructions**](.github/copilot-instructions.md) - Complete AI behavior guide (741 lines)
- [**User Profile**](.copilot-profile.md) - Human preferences and work style
- [**License**](LICENSE) - MIT

## Philosophy

**Quality over speed.** No deadline pressure, supreme reliability always.

**Outcomes over process.** Show what changed for users, not how code works.

**Context memory.** Remember everything, build on all previous decisions.

**Timeline as version control.** DAW-style: save states, branch, rollback, compare.

---

**This workspace exists to prove that AI-human partnership can be better than either working alone.**
