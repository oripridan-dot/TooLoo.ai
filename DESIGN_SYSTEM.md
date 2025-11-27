# Design System: Synapsys Dark

This document defines the visual language for the TooLoo.ai Synapsys interface, based on the "Cyberpunk/Sci-Fi" aesthetic.

## Core Principles
- **Dark Mode Only**: Deep backgrounds (#050505, #0f1117) to reduce eye strain and enhance the "hacker" feel.
- **Neon Accents**: Cyan (#00f3ff) as the primary action color, with Purple (#bc13fe) and Red (#ff003c) for state indicators.
- **Monospace Typography**: `JetBrains Mono` or `Fira Code` for data, code, and system status. `Inter` for UI labels.
- **Glassmorphism**: Subtle transparency and blur for panels to create depth.

## Color Palette

### Backgrounds
- **Obsidian**: `#050505` (Main Background)
- **Void**: `#0f1117` (Sidebar/Panels)
- **Glass**: `rgba(17, 24, 39, 0.7)` (Overlays)

### Accents
- **Cyan (Primary)**: `#00f3ff` (Active states, primary buttons, glow)
- **Purple (Secondary)**: `#bc13fe` (AI/Neural states)
- **Green (Success)**: `#0aff0a` (Online, Ready)
- **Red (Danger)**: `#ff003c` (Offline, Error, Restricted)
- **Orange (Warning)**: `#ffaa00` (Processing, Latency)

## Typography

### Fonts
- **Sans**: `Inter`, system-ui
- **Mono**: `JetBrains Mono`, monospace

### Hierarchy
- **H1**: Inter, Bold, White, Tracking-tight
- **H2**: Inter, Semibold, Gray-200
- **Label**: Inter, Medium, Gray-400
- **Data**: JetBrains Mono, Regular, Accent Color

## Components

### Sidebar
- Background: `#0f1117`
- Border: `1px solid #1f2937`
- Active Item: Cyan text, subtle cyan glow or border-left.

### Cards / Panels
- Background: `rgba(17, 24, 39, 0.7)` (Glass)
- Border: `1px solid rgba(255, 255, 255, 0.08)`
- Backdrop Filter: `blur(12px)`

### Buttons
- **Primary**: Cyan text, Cyan border (1px), transparent background. Hover: Cyan background (10%), Cyan glow.
- **Danger**: Red text, Red border (1px). Hover: Red background (10%).

## Implementation Guide (Tailwind)
Use the `tailwind.config.js` extensions:
- `bg-obsidian`
- `text-neon-cyan`
- `font-mono`
- `border-white/10`

---
*Established: 2025-11-27*
