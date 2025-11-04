# UI Placeholder Standards

## Purpose
This document defines standards for input placeholders and demo content across the TooLoo.ai UI components to ensure consistency and provide clear user guidance.

## Placeholder Audit Results

### ✅ Intentional UX Placeholders (Approved)

These placeholders provide context-appropriate user guidance and should be maintained:

1. **web-app/src/App.jsx (line 328)**
   - Text: `"Describe what you want to build... (e.g., 'Create a simple blog website')"`
   - Context: Main project creation input
   - Rationale: Provides clear example of expected input format
   - Status: ✅ Approved - Good UX hint

2. **packages/web/src/components/ChatInterface.tsx (line 209)**
   - Text: `"Ask me anything about development..."`
   - Context: Chat interface input
   - Rationale: Open-ended but contextually appropriate for chat interface
   - Status: ✅ Approved - Good UX hint

### 🔄 Updated Placeholders

These placeholders were generic and have been improved with specific examples:

1. **packages/web/public/mission-control-demo.html (line 117)**
   - Previous: `"YOUR PROMPT HERE..."`
   - Updated: `"Type your request... (e.g., 'Analyze system performance' or 'Show recent activity')"`
   - Rationale: Generic ALL-CAPS placeholder replaced with context-specific examples
   - Status: ✅ Updated

2. **packages/web/src/components/MissionControl.tsx (line 182)**
   - Previous: `"YOUR PROMPT HERE..."`
   - Updated: `"Type your request... (e.g., 'Analyze system performance' or 'Show recent activity')"`
   - Rationale: Generic ALL-CAPS placeholder replaced with context-specific examples
   - Status: ✅ Updated

### 📁 Demo Files

1. **packages/web/public/mission-control-demo.html**
   - Status: ✅ Clearly marked as demo in title and comments
   - Contains demo controls for testing different states
   - Placeholder has been updated to be more user-friendly
   - Recommendation: Keep as demonstration tool

2. **personal-projects/MyFirstApp-with-a-simple-todo-list/test.html**
   - Status: ✅ Personal project test file - intentional
   - Location: personal-projects folder (appropriate location)

## Placeholder Guidelines

### DO ✅

1. **Be Specific**: Provide concrete examples rather than generic text
   - Good: `"Enter task name (e.g., 'Review quarterly reports')"`
   - Bad: `"TYPE HERE"`

2. **Use Sentence Case**: Write naturally, not in ALL CAPS
   - Good: `"Describe what you want to build..."`
   - Bad: `"YOUR PROMPT HERE"`

3. **Include Examples**: When appropriate, show 1-2 examples
   - Format: `"Input purpose... (e.g., 'example 1' or 'example 2')"`

4. **Match Context**: Tailor placeholder to the specific use case
   - Chat interface: Conversational tone
   - Form fields: Specific data format examples
   - Mission control: Action-oriented commands

### DON'T ❌

1. **Avoid Generic Text**: Don't use placeholders like "ENTER TEXT HERE" or "YOUR INPUT"
2. **No ALL CAPS**: Avoid aggressive capitalization unless it's a brand name
3. **Don't Leave Implementation Hints**: Remove developer notes like "TODO: Add placeholder"
4. **Avoid Ambiguity**: Be clear about expected input format

## Code Review Checklist

When adding new input fields, verify:

- [ ] Placeholder text is contextually appropriate
- [ ] Examples are provided where helpful
- [ ] Text uses sentence case (not ALL CAPS)
- [ ] No generic "TYPE HERE" or "YOUR X HERE" placeholders
- [ ] Text matches the tone of the component (casual chat vs. formal command)

## Audit Summary

### Findings
- Total placeholder occurrences: 4
- Approved without changes: 2
- Updated for clarity: 2
- Demo files identified: 2 (both appropriately marked)
- TODO/FIXME markers: 0 (no incomplete implementation markers found)

### Status: ✅ Complete

All placeholders have been audited and categorized. Generic placeholders have been replaced with context-specific examples. No incomplete implementation markers were found. Demo files are clearly marked and serve valid testing purposes.

---

**Last Updated**: November 4, 2025  
**Version**: 1.0  
**Reviewed by**: Copilot SWE Agent
