# 🧪 Step-by-Step Test Instructions

## System Status
- ✅ HTTP Server: Port 8888 (Scanner UI)
- ✅ Infographics Server: Port 3010 (API + SVG generation)
- ✅ Refinery Engine: Loaded with 8 categorization methods
- ✅ Integration: Scanner → Infographics wired

---

## Test A: Basic Flow (3 minutes)

### 1️⃣ Open Scanner
```
http://127.0.0.1:8888/web-app/scanner/index.html
```
**Expected:** Purple gradient background, white input box, empty tabs

### 2️⃣ Paste Test Prompt
Copy this low-quality prompt:
```
Please tell me how to get better at coding. I really think it's very important 
to learn more stuff about programming because it's good for your career. Can 
you show me some ways to do this? I want to understand more about the different 
languages and frameworks and how they work. It would be nice if you could help 
me with this because I'm not sure where to start. Thanks.
```

**Expected:** Prompt appears in textarea (800+ characters)

### 3️⃣ Click "Analyze Prompt"
**Expected:**
- Button shows "Analyzing..." briefly
- Spinner appears in Analysis tab
- After 1-2 seconds: Results populate

### 4️⃣ Verify Results Display

#### Tab 1: **Analysis** (should show)
- [ ] Overall Quality: 5.8/10 (or similar low score)
- [ ] Combined Score: (aggregate score)
- [ ] **WHERE QUALITY BREAKS DOWN** section with:
  - [ ] Clarity & Grammar Issues (with count)
  - [ ] Structure & Organization Issues
  - [ ] Specificity & Measurability Issues
  - [ ] Efficiency & Conciseness Issues
- [ ] For each category:
  - [ ] Root Cause explanation
  - [ ] Consequence (Immediate, Downstream, Business)
  - [ ] Estimated fix time
  - [ ] ✅ HOW TO FIX section

#### Tab 2: **Keywords & Weights**
- [ ] Top 15 keywords with % weights
- [ ] "good", "better", "important", "stuff" highlighted
- [ ] Distribution shows weak word concentration

#### Tab 3: **Refinement Options**
- [ ] 5-10 suggestions visible
- [ ] Each shows: original → suggested + impact %
- [ ] ✅ **Refinement Checklist** section with:
  - [ ] Clarity section (questions + how to fix)
  - [ ] Specificity section
  - [ ] Structure section
  - [ ] Efficiency section
  - [ ] Next action recommendation
  - [ ] Dialogue prompt: "What aspect would you like to refine first?"

#### Tab 4: **Impact Preview**
- [ ] Shows before/after quality improvement
- [ ] Estimated impact bars
- [ ] Token savings calculation

#### Tab 5: **Infographics** ⭐ NEW
- [ ] Buttons visible: Gauge | Matrix | Tree | Heatmap
- [ ] After ~1 second, **gauge visualization auto-generates**:
  - [ ] Circular gauge shape with needle
  - [ ] Score: 5.8 (or similar)
  - [ ] Label: "Prompt Quality Score"
  - [ ] Range: 0-10
- [ ] Info box shows: timestamp, description

### 5️⃣ Test Visualization Types

**Click "Matrix":**
- [ ] Loading spinner appears
- [ ] Before/After comparison matrix renders
- [ ] Shows 5 keywords vs refinement impact

**Click "Tree":**
- [ ] Hierarchical tree renders
- [ ] Shows quality issues as tree nodes
- [ ] Parent-child relationships visible

**Click "Heatmap":**
- [ ] Heatmap visualization with color gradients
- [ ] Categories on X-axis (Clarity, Structure, etc.)
- [ ] Intensity shown by color (red = high issues)

### 6️⃣ Test Downloads
- [ ] Click "⬇️ Download SVG"
- [ ] Browser downloads file (check Downloads folder)
- [ ] File named like: `infographic_*.svg`

### 7️⃣ Test Comparison Tab
- [ ] Click "Before & After"
- [ ] Original prompt on left
- [ ] Refined version on right
- [ ] Refinements applied
- [ ] Can copy refined prompt to clipboard

---

## Test B: High Quality Prompt (2 minutes)

### 1️⃣ Clear Input
Click "Clear" button or select all and delete

### 2️⃣ Paste High Quality Prompt
```
Create a comprehensive guide on prompt engineering for AI models, including:
(1) Structure principles with examples, (2) Specificity techniques, 
(3) Context window optimization strategies, (4) Refinement workflows.
Success criteria: users can write production-grade prompts achieving 85%+ 
first-pass satisfaction without refinement cycles.
```

### 3️⃣ Analyze

**Expected:**
- [ ] Quality Score: 8.5+/10 (high quality)
- [ ] Fewer refinement suggestions (or none)
- [ ] Most categories show 0 issues
- [ ] Gauge needle points to "Good" zone (7+)
- [ ] Message: "Your prompt is well-structured"

---

## Test C: API Direct Testing (Optional)

### Gauge Test
```bash
curl -X POST http://127.0.0.1:3010/api/v1/infographics/generate \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "gauge",
    "data": {"label":"Test","value":7.5,"max":10}
  }'
```
**Expected:** JSON with SVG embedded (801 character SVG)

### Templates Test
```bash
curl http://127.0.0.1:3010/api/v1/infographics/templates
```
**Expected:** Array of 8 templates (gauge, matrix, tree, flow, timeline, network, heatmap, sankey)

---

## 🐛 Troubleshooting

### Problem: "Infographic generated but SVG not available"
- Check browser console (F12)
- Verify infographics server is running: `curl http://localhost:3010/api/v1/infographics/templates`
- Restart server if needed

### Problem: Gauge not auto-generating
- Check browser console for errors
- Verify CORS not blocking request
- Try clicking "Gauge" button manually
- Check infographics server logs: `tail -f /tmp/infographics.log`

### Problem: "Analysis error"
- Refresh page (F5)
- Check console for JavaScript errors
- Verify refinery-engine.js loaded: `console.log(window.RefineryEngine)`

### Problem: No grouped issues showing
- Verify refinery engine has new methods:
  - `console.log(new window.RefineryEngine().groupRefinementsByCategory.toString().substring(0, 50))`
- Should show method definition (not undefined)

---

## ✅ Success Checklist

- [ ] Scanner opens without errors
- [ ] Analysis completes in <3 seconds
- [ ] All 5 tabs populate with data
- [ ] Grouped issues show 4 categories
- [ ] Root causes display with consequences
- [ ] Framework checklist visible with sections
- [ ] Gauge auto-generates in Infographics tab
- [ ] All 4 visualization types render on click
- [ ] SVG renders without broken layout
- [ ] Downloads work correctly
- [ ] No console errors (F12 → Console tab)

---

## 📊 Expected Console Output

When page loads, you should see:
```
✅ Scanner initialized successfully
✅ RefineryEngine instantiated
✅ PromptAnalyzer ready
✅ AnalysisScanner ready
```

When analysis completes:
```
✅ Analysis complete: 8 refinements found
✅ Grouped into 4 categories
✅ Gauge infographic generating...
```

If anything shows ❌, check that section's error.

---

## 🎯 What You're Testing

1. **End-to-End Pipeline**: Prompt → Analysis → Visualization
2. **Multiple Issue Categories**: 4 distinct quality dimensions
3. **Root Cause System**: Consequences at 3 levels (immediate/downstream/business)
4. **Framework Generation**: Reusable checklist for fixing
5. **Visual Reasoning**: SVG infographics from data
6. **API Integration**: Scanner → Server communication
7. **User Experience**: 5 tabs, clear hierarchy, actionable guidance

---

## 📈 Expected Quality Scores

| Prompt Type | Expected Score | Issues | Recommendations |
|------------|----------------|--------|-----------------|
| Low Quality | 4-6/10 | 8-12 | High priority fixes |
| Medium Quality | 6-7/10 | 4-6 | Some refinements |
| High Quality | 8-10/10 | 0-2 | Minor tweaks only |

---

Ready? Start with **Test A** above! 🚀
