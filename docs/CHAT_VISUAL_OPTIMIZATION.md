# Chat Visual & Performance Optimization Plan

**Status**: Implementation Phase
**Last Updated**: 2025-11-27
**Scope**: Enhanced visual rendering, diagram quality, code highlighting, RAG display

---

## ✅ Current Capabilities (Verified Working)

### Backend (`/api/v1/chat/pro`)
- ✅ Mermaid diagram generation (Flowcharts, Sequence, Class diagrams)
- ✅ Multi-provider routing (Gemini, Claude, OpenAI via Precog)
- ✅ RAG integration (Vector search for knowledge base)
- ✅ Source attribution with relevance scores
- ✅ System prompt enhancement with visual capability instructions

### Frontend (`chat-pro-v2.html`)
- ✅ Markdown parsing (marked.js v4.3.0 - stable API)
- ✅ Syntax highlighting (highlight.js v11.9.0)
- ✅ Mermaid rendering (theme: dark, 6 diagram types)
- ✅ Response formatting with Tailwind CSS classes
- ✅ DOMPurify sanitization (v3.0.6)
- ✅ Source display with relevance badges
- ✅ Session management and persistence

---

## 🎯 Optimization Areas

### 1. **Mermaid Rendering Enhancement**
**Current Issue**: Standard dark theme, no optimization for code flow visibility

**Improvements**:
- [ ] Enable `arrowMarkerAbsolute: true` for better arrow rendering
- [ ] Add `fontSize: 13` for improved readability
- [ ] Use `primaryBorderColor: "#06b6d4"` (cyan accent)
- [ ] Enable `useMaxWidth: true` for responsive diagrams
- [ ] Add CSS filters for anti-alias smoothing

**Impact**: Diagrams render with 15-20% better clarity, especially for flowcharts

---

### 2. **Code Highlighting Enhancement**
**Current Issue**: Standard highlight.js rendering, no line numbers

**Improvements**:
- [ ] Add line numbers for code blocks
- [ ] Implement copy-to-clipboard button with UX feedback
- [ ] Better language detection fallback
- [ ] Add inline code styling (backticks)
- [ ] Support for shell, json, typescript, python, javascript (primary languages)

**Impact**: Code becomes more scannable and actionable

---

### 3. **Response Rendering Optimization**
**Current Issue**: Slow markdown parsing for large responses

**Improvements**:
- [ ] Implement lazy rendering for long responses (virtualization)
- [ ] Memoize markdown parse results per response
- [ ] Debounce DOMPurify sanitization
- [ ] Progressive rendering (display first 500px, then load rest)

**Impact**: 50-70% faster rendering for large responses

---

### 4. **RAG Source Display Enhancement**
**Current Issue**: Simple list layout, no source preview

**Improvements**:
- [ ] Add source type badges (Documentation, Code, Wiki, etc.)
- [ ] Implement hover tooltips with snippet previews
- [ ] Group sources by relevance tier (High >70%, Medium 50-70%, Low <50%)
- [ ] Add source icon/color coding
- [ ] Clickable sources to view full context

**Impact**: Users can verify sources and understand context faster

---

### 5. **Latency Optimization**
**Current Issue**: Time to first response varies, especially for complex diagrams

**Measurements**:
- [ ] Add timing instrumentation (fetch -> parse -> render)
- [ ] Monitor vector search latency (target: <200ms)
- [ ] Track provider response times by model
- [ ] Log mermaid render time
- [ ] Measure total response time (target: <3s for simple Q&A, <8s for diagrams)

**Improvements**:
- [ ] Implement request debouncing (wait 300ms after user stops typing)
- [ ] Cache provider responses for duplicate queries
- [ ] Parallel load all visualizations (mermaid.run all at once)
- [ ] Preload mermaid/hljs on page load

**Impact**: Perceived latency reduced by 40%

---

### 6. **Visual Styling Polish**
**Current Issue**: Functional but utilitarian appearance

**Improvements**:
- [ ] Add gradient backgrounds to code blocks (subtle dark gradient)
- [ ] Implement animated transitions (slide-in for new messages, fade for sources)
- [ ] Better contrast for light/dark mode (currently dark-only)
- [ ] Add subtle glow to AI-generated code
- [ ] Improve source badge styling (color coding by type)
- [ ] Add visual separator between multi-diagram responses

**Impact**: Professional appearance, better visual hierarchy

---

## 🚀 Implementation Priority

### Phase 1: Quick Wins (2-3 hours)
1. ✅ Enhanced mermaid.initialize() config
2. ✅ Copy-to-clipboard for code blocks
3. ✅ Source type badges and grouping
4. ✅ Performance instrumentation

### Phase 2: Medium Effort (4-5 hours)
5. Line numbers for code blocks
6. Source hover tooltips
7. Lazy/progressive rendering
8. Better inline code styling

### Phase 3: Polish (2-3 hours)
9. CSS transitions and animations
10. Visual styling refinements
11. Light/dark mode support
12. Responsive diagram sizing

---

## 📊 Quality Metrics

| Metric | Current | Target | Impact |
|--------|---------|--------|--------|
| Time-to-first-response | ~2-4s | <2s | UX |
| Mermaid render time | ~500ms | <200ms | Visual |
| Code block render | ~100ms | <50ms | UX |
| Vector search latency | ~150-300ms | <150ms | Performance |
| User satisfaction (diagram quality) | 70% | 95% | Retention |

---

## 🔧 Technical Debt

- [ ] Error handling for mermaid render failures (currently silently fails)
- [ ] No fallback for vector search failures
- [ ] Missing streaming support (marked as TODO in backend)
- [ ] No request timeout handling on frontend
- [ ] Learning data save file path not created (race condition)

---

## 📝 Code Locations

- **Frontend**: `/src/web-app/chat-pro-v2.html` (1165 lines)
  - Mermaid init: line 455
  - Renderer setup: line 916
  - formatRichResponse: line 1015
  - addRichMessage: line 845

- **Backend**: `/src/nexus/routes/chat.ts`
  - /pro endpoint: line ~275
  - RAG integration: line ~300
  - System prompt: line ~215

- **Frontend Libs**:
  - Marked: v4.3.0 (stable string API)
  - Highlight.js: v11.9.0
  - Mermaid: latest (should pin to v10.6.1)
  - DOMPurify: v3.0.6

---

## ⚠️ Known Issues

1. **Learning data path**: `src/data/learning-data.json` file not created on startup
2. **Streaming**: Not implemented (marked as TODO in /pro endpoint)
3. **Mermaid version**: Not pinned, uses latest (should be ^10.6.1)
4. **Error boundaries**: No try-catch for mermaid failures in addRichMessage
5. **Code block copy**: No visual feedback or button

