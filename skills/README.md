# TooLoo.ai Skills Directory
# Declarative skill definitions for Synapsys V2

This directory contains skill definitions that define how TooLoo behaves for different tasks.

## Skill File Format

Skills can be defined as:

### YAML Files (.yaml, .yml)

```yaml
id: my-skill
name: My Custom Skill
version: 1.0.0
description: What this skill does

instructions: |
  You are an expert at...
  
  ## Guidelines
  - Always do X
  - Never do Y

tools:
  - name: file_read
  - name: terminal_execute

triggers:
  intents: [code, fix]
  keywords: [debug, error, fix]

context:
  maxTokens: 64000
  ragSources: [codebase, docs]
  memoryScope: project

composability:
  requires: []
  enhances: [code-reviewer]
  conflicts: []
```

### Markdown Files (.md)

```markdown
---
name: My Custom Skill
version: 1.0.0
description: What this skill does
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
