# TooLoo.ai - Design Enhancement Plan

## Vision

To evolve "TooLoo.ai - DeSign" from a visual generation tool into a comprehensive, AI-driven design system architect that can generate, critique, and implement UI/UX patterns directly into the codebase.

## Phase 1: Consolidation (Completed)

- [x] **Unified Interface**: Merged "Nano Banana Studio" and "Design Studio" into "TooLoo.ai - DeSign".
- [x] **Tool Integration**: Integrated URL Extraction and Figma Import directly into the visual designer.
- [x] **Rebranding**: Established a consistent identity across the design suite.

## Phase 2: Intelligent Design Agents (Next Steps)

### 1. The "Creative Director" Agent

- **Role**: Critiques generated visuals and code against the `design-system.json`.
- **Capabilities**:
  - Analyzes color contrast and accessibility.
  - Enforces brand consistency (fonts, spacing).
  - Suggests improvements before code generation.

### 3. Design-to-Code Engine

- **Goal**: Convert generated visuals directly into React/Tailwind components.
- **Implementation**:
  - Use `gpt-4o` or `gemini-1.5-pro` with vision capabilities to analyze the generated image.
  - Output clean, componentized JSX code.
  - Provide a "Copy Code" or "Save to Project" button in the gallery.

### 4. Voice-Controlled Design

- **Goal**: Enable hands-free design iteration.
- **Interaction**:
  - "Make the background darker."
  - "Generate a hero section for a SaaS app."
  - "Import the color palette from stripe.com."

## Phase 3: System Evolution

### 1. Auto-Evolving Design System

- The system should learn from user preferences and automatically update `design-system.json`.
- If the user frequently overrides the primary color, the system should propose a permanent update.

### 2. Component Library Generation

- Automatically generate a Storybook-like library based on the project's design tokens.
- Create variations of components (buttons, cards, inputs) automatically.

## Technical Roadmap

1.  **Backend**: Enhance `src/nexus/routes/design.ts` to support component generation.
2.  **Frontend**: Add a "Code View" to the `VisualDesigner` gallery items.
3.  **AI**: Fine-tune a prompt chain for "Image -> Design Tokens -> React Code".
