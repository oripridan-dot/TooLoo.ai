# TooLoo.ai Skills OS - Skill Definitions

> **Version:** 1.0.0 | Everything is a Skill

This directory contains YAML skill definitions - **the source of truth** for all TooLoo capabilities.

## 📦 Available Skills

| Skill | Description |
|-------|-------------|
| `coding-assistant` | TypeScript/Node.js expert |
| `architect` | System design & architecture |
| `research-analyst` | Research & analysis |
| `documentation-writer` | Technical documentation |
| `test-generator` | Unit & integration tests |
| `refactoring-expert` | Code optimization |
| `code-reviewer` | Code review & feedback |

## 📝 Skill File Format

```yaml
# skills/my-skill.yaml

# Required fields
id: my-skill                    # Unique identifier
name: My Custom Skill           # Display name
version: 1.0.0                  # Semantic version
description: What this skill does

# Intent routing
keywords:
  - keyword1
  - keyword2

# Input validation (Zod-compatible schema)
schema:
  type: object
  properties:
    task:
      type: string
      description: The task to perform
  required:
    - task

# LLM instructions (the prompt)
instructions: |
  You are an expert at...
  
  ## Guidelines
  - Always do X
  - Never do Y

# Available tools
tools:
  - file_read
  - file_write
  - terminal_run
```

## 🔧 Schema Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Unique skill identifier |
| `name` | string | ✅ | Display name |
| `version` | string | ✅ | Semantic version |
| `description` | string | ✅ | What the skill does |
| `keywords` | string[] | ❌ | Intent routing keywords |
| `schema` | object | ❌ | Input validation schema |
| `instructions` | string | ❌ | LLM system prompt |
| `tools` | string[] | ❌ | Available tools |
| `model` | string | ❌ | Preferred LLM model |
| `temperature` | number | ❌ | LLM temperature (0-1) |

## 🚀 Creating a New Skill

1. Create `skills/my-skill.yaml`
2. Define the required fields
3. Restart Skills OS: `pnpm dev`
4. Test: `curl http://localhost:4001/api/v2/skills`

## 🧪 Validating Skills

```bash
pnpm skills:validate
```

---

*Skills OS V1 - Genesis*
tools:
  - name: file_read
triggers:
  intents: [code]
  keywords: [typescript]
context:
  maxTokens: 64000
  ragSources: [codebase]
  memoryScope: project
composability:
  requires: []
  enhances: []
  conflicts: []
---

# Instructions

You are an expert at...

## Guidelines

The entire markdown body becomes the `instructions` field.
```

## Core Skills

- `coding-assistant.yaml` - TypeScript/Node.js expert
- `code-reviewer.yaml` - Code quality critic
- `architect.yaml` - System design specialist
- `research-analyst.yaml` - Deep research expert

## Creating Custom Skills

1. Create a `.yaml` or `.md` file in this directory
2. Follow the schema above
3. Skills are hot-reloaded in development mode

## Skill Composition

Skills can be composed together for complex tasks. Use the `composability` field to define:

- `requires`: Skills that must be active
- `enhances`: Skills that work well together
- `conflicts`: Skills that shouldn't be combined
