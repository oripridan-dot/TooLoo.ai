# TooLoo.ai Modern UI Design System

## Mission
Build a **minimal, purposeful interface** that feels like a modern AI model (Claude, ChatGPT) but with TooLoo.ai's **unique superpowers**:
- 📊 **Conversation Hierarchy** - Multi-layer summaries (message → segment → full context)
- 🎯 **Smart Segmentation** - Real-time conversation phases with visual tracking
- 🚀 **Coaching Integration** - Unobtrusive coaching recommendations tied to capabilities
- 🔄 **Slack-like Threading** - Visual segment grouping with context preservation

## Design Principles

### 1. **Everything Has a Purpose**
- ✅ Only components that directly serve the user
- ✅ Backend features remain accessible via API, not UI clutter
- ✅ Admin/system controls isolated in minimal control surface
- ❌ No vanity metrics, flashing indicators, or "cool" but meaningless UI

### 2. **Hierarchy Over Noise**
- Primary: User message input + AI response (full screen width)
- Secondary: Segmentation sidebar (context, not interruption)
- Tertiary: Coaching hints (tooltip-like, in-context)
- System: Minimal indicators (only when relevant)

### 3. **Modern & Minimal**
- Clean typography (SF Pro, Inter, system fonts)
- Generous whitespace
- Smooth animations (micro-interactions)
- Dark mode first, light mode supported
- Consistent visual language across all components

### 4. **Real-time Awareness**
- Segment markers update as conversation grows
- Coaching recommendations appear contextually
- Provider status visible during requests (progress → hidden)
- No polling—push-based updates where possible

---

## Color Palette

### Light Mode
```
Background: #FFFFFF
Surface:   #F8F9FA
Text:      #0F1117 (dark gray)
Secondary: #57606A
Accent:    #0969DA (blue)
Success:   #1A7F0F (green)
Warning:   #9E6A03 (orange)
Danger:    #AE2A19 (red)
```

### Dark Mode (Primary)
```
Background:    #0D1117 (almost black)
Surface:       #161B22 (dark gray)
Surface+1:     #21262D (lighter gray)
Text:          #E6EDF3 (almost white)
Secondary:     #8B949E
Accent:        #58A6FF (light blue)
Success:       #3FB950 (bright green)
Warning:       #D29922 (bright orange)
Danger:        #F85149 (bright red)

Gradients:
- Primary: #0969DA → #58A6FF (blue)
- Success: #3FB950 → #56D364 (green)
- Coaching: #7C3AED → #58A6FF (purple-blue)
```

---

## Typography

### Font Stack
```
-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif
(Falls back through system fonts for optimal rendering)
```

### Type Scale
| Name       | Size  | Weight | Line-height | Usage                          |
|-----------|-------|--------|------------|--------------------------------|
| **H1**    | 32px  | 600    | 1.2        | Main headers (rare)            |
| **H2**    | 24px  | 600    | 1.3        | Section headers                |
| **H3**    | 20px  | 600    | 1.4        | Subsection headers             |
| **H4**    | 16px  | 600    | 1.4        | Card titles                    |
| **Body-L** | 16px  | 400    | 1.6        | Main text, input               |
| **Body**   | 14px  | 400    | 1.5        | Secondary text                 |
| **Small**  | 12px  | 400    | 1.4        | Labels, timestamps             |
| **Tiny**   | 11px  | 500    | 1.3        | Badge text                     |

---

## Spacing Scale

```
0:   0px      (none)
1:   4px      (tiny)
2:   8px      (extra small)
3:   12px     (small)
4:   16px     (medium)
5:   24px     (large)
6:   32px     (extra large)
7:   48px     (2xl)
8:   64px     (3xl)
```

---

## Component States

### Buttons
- **Idle**: Subtle gray background, hover effect
- **Hover**: Slight lift + color shift
- **Active**: Color shift + animation
- **Disabled**: Reduced opacity, no cursor change

### Cards/Surfaces
- **Elevated**: Shadow elevation 1 (subtle)
- **Hover**: Shadow elevation 2 + slight scale (1.01x)
- **Focus**: Border highlight + shadow

### Forms
- **Empty**: Light border, placeholder text
- **Focused**: Border color change + subtle glow
- **Filled**: Value visible, secondary text below
- **Error**: Red border + error message below

---

## Animations & Transitions

### Timing
```
Fast:   150ms (interactions, hover states)
Normal: 300ms (component movements, reveals)
Slow:   500ms (major state changes, page transitions)
```

### Easing
```
Ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)    (default smooth)
Ease-out:    cubic-bezier(0, 0, 0.2, 1)      (pop-in, arrive)
Ease-in:     cubic-bezier(0.4, 0, 1, 1)      (fade-out, dismiss)
```

### Common Animations
- **Slide-in**: translateX with fade (navigation items)
- **Fade**: opacity only (text reveals)
- **Scale**: scaleY for height changes (segment expand)
- **Micro-interactions**: Bounce for important state changes

---

## Component Library

### Chat Message Bubble
```
User:
  - Align right
  - Accent background (blue)
  - White text
  - Max 85% width (leaves margin)
  - Rounded corners, bottom-right sharp edge