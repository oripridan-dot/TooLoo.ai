# TooLoo.ai Active Setup Snapshot (Oct 6, 2025)

This snapshot captures the current functional setup so a fresh chat or new assistant session can rapidly rehydrate context without rediscovering prior decisions.

## 1. Core Purpose
Action‑first personal AI environment that can: generate text, orchestrate multiple providers cost‑efficiently, modify its own code (self‑awareness), track budget, and offer voice (TTS) feedback workflow.

## 2. Active Architecture (Practical Layer)
- Runtime Mode: Simple Node server + scripts + workspace utilities (not the experimental packages layer)
- Branch: v2-idea-workshop (ensure pushed to remote)
- Self‑Awareness: Enabled conceptually (supports reading/modifying project files with backups)
- Voice Layer: ElevenLabs integrated via scripts + tasks (produces MP3 to /audio)
- Interaction Style: “Don’t explain how, just do it; hide code unless explicitly requested”

## 3. Key Capabilities Online
- AI Provider Orchestration (policy: cheapest viable first → fallback chain)
- Budget Tracking (limit: daily enforcement expectation; confirm DAILY_BUDGET_LIMIT in environment when used)
- File Operations with backup before modification
- Self‑Modification (guardrails: backup + logging expected)
- Timeline / Milestone logging potential (timeline.js present)
- Voice: Selection → Hotkey → MP3 generation

## 4. Persistence & What Survives a New Chat
Survives (because committed or commit‑ready):
- Scripts in scripts/
- VS Code tasks & keybindings (.vscode/)
- Documentation files (ENHANCEMENT-PLAN.md, QUICK-REFERENCE.md, this snapshot)
- Timeline/milestone helpers
- Any committed configuration decisions in this file
Does NOT auto‑persist:
- Environment variables (API keys, DAILY_BUDGET_LIMIT)
- In‑memory conversation history or reasoning chains
- Uncommitted changes
- Generated audio files if container reset (treat as disposable artifacts)

## 5. Environment Variables Required (not committed)
You should have a local .env (DO NOT COMMIT) containing at least:
- DEEPSEEK_API_KEY=...
- (Optional) OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY for fallback
- ELEVENLABS_API_KEY=... (for TTS scripts)
- DAILY_BUDGET_LIMIT=5.00 (or desired)
- OFFLINE_ONLY=false (when remote provider access desired)

## 6. Voice Workflow Summary
Flow: Select text in editor → Press Cmd+Shift+R (Mac) / Ctrl+Shift+R (Linux/Win) → Task runs speak-selection script → MP3 saved to audio/selection.mp3 → User can open or download.
Supporting tasks:
- Speak Selection (ElevenLabs)
- Voice Settings (voice/emotion tuning)
- Open Last Audio (helper to surface file if no native playback)
Limitations: Dev container cannot natively play audio; user downloads MP3 locally.

## 7. Hotkey Overview (Primary Custom)
- Cmd+Shift+R / Ctrl+Shift+R: Speak Selection
- Cmd+Shift+Alt+R: Voice Settings
- Additional Copilot Pro+ interactive editor enhancements (Explain / Fix / Optimize / Generate) retained

## 8. Budget & Cost Strategy
- Default provider: DeepSeek (cost efficiency)
- Fallback reasoning: Claude for complex planning, GPT‑4 only if others fail, Gemini for creative tasks
- Caching expectation: 1‑hour standard responses (describe policy in future provider manager file if not yet codified in code)
- Alerting: (Future improvement) 80% threshold notification

## 9. Self‑Awareness / Safety Pattern
Intended behavior when modifying own code:
1. Create .bak backup
2. Log change (logs/changes.log suggested)
3. Perform minimal diff
4. Run basic validation (syntax / quick test) before confirming
Current Gap: Ensure logs/ directory + logging utility present or add in next iteration.

## 10. Known Gaps / Open Todo Opportunities
High Value Next Steps:
- Add VOICE-WORKFLOW.md (user‑oriented quickstart) – (optional if this snapshot suffices)
- Implement budget status endpoint UI badge (already conceptually supported by backend pattern)
- Add automatic snapshot rehydrate script: “npm run context” that prints condensed bullet summary for new chat seeding
- Implement local simple audio webview player inside VS Code (avoid external download friction)
- Add provider success rate telemetry (selection heuristics improvement)
- Add change log auto‑append when self‑modifications executed

## 11. How To Rehydrate Context in a New Chat (Template Prompt)
Copy & paste this into a fresh assistant session to instantly restore shared mental model:
"Context seed: Using TooLoo.ai action-first workspace. Branch v2-idea-workshop. Voice TTS via ElevenLabs scripts + tasks (.vscode). Selection hotkey Cmd+Shift+R → generates audio/selection.mp3. Provider strategy: DeepSeek primary, fallback chain for reasoning & creativity. Budget limit env variable DAILY_BUDGET_LIMIT (~$5). Self‑awareness allowed with backups + future logging. Need to continue with improvements from sections 10 (starting with webview audio playback + budget badge). Proceed without showing code unless I ask."

## 12. Quick Validation Checklist (Use After Reset)
- [ ] .env present with required keys
- [ ] Run a selection → hotkey → MP3 file appears
- [ ] Budget endpoint (if implemented) responds
- [ ] Ability to modify a file and create backup (test manually)
- [ ] Snapshot file (this) accessible

## 13. Recovery / Failure Modes
If TTS fails: Check ELEVENLABS_API_KEY, rate limit, or network restrictions.
If provider calls fail: Fallback environment may have OFFLINE_ONLY true; toggle as needed.
If hotkeys fail: Reopen Command Palette → Tasks: Run Task → Speak Selection; validate tasks.json intact.
If self‑mod changes not backing up: Add missing backup logic before further edits.

## 14. Definition of “Working State” (Current)
- Can generate voice output from selected text reliably (core workflow achieved)
- Documentation + reproducibility captured (this file)
- Safe to start new chat and rehydrate with Section 11 template

## 15. Suggested Immediate Next Action
Automate context rehydration (add a script that prints a compressed version of this snapshot) to eliminate manual copy.

---
Maintainer Intent: Keep this snapshot updated whenever major capability changes (voice enhancements, provider policy adjustments, budget enforcement features).