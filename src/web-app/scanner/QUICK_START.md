# 🚀 Quick Start - AI Chat Scanner

## 30-Second Setup

### Step 1: Open the Scanner

```bash
# Option A: Direct in browser (from project root)
cd /workspaces/TooLoo.ai
open web-app/scanner/index.html

# Option B: Via local server (recommended)
cd /workspaces/TooLoo.ai/web-app/scanner
python3 -m http.server 8000
# Then visit: http://localhost:8000
```

### Step 2: Analyze Your First Prompt

1. Paste a ChatGPT or Claude prompt into the textarea
2. Click **🔍 Analyze Prompt**
3. Watch the scores appear
4. See keyword analysis in the Keywords tab
5. Preview refinements in the Refinements tab

### Step 3: Apply Improvements

1. Review suggested refinements
2. Click refinement items to select them (checkboxes)
3. Click **Apply Selected Refinements**
4. View before/after comparison
5. Copy improved prompt to clipboard or download report

---

## What You'll See

### Tab 1: Keywords & Weights 🔑

Shows your prompt's important terms, ranked by "weight" (importance score)

```
Example output for "Create a blog post about AI":
- create (75% weight)
- blog (65% weight)
- post (60% weight)
- about (40% weight)
- AI (85% weight) ← Most important
```

**What this means**: "AI" is your strongest keyword. "blog" and "post" are weaker and could be replaced.

### Tab 2: Refinement Options ✨

Shows specific word replacements with estimated impact

```
Example output:
[Checkbox] create → develop/design (+25% impact)
           Reason: More active, specific for content creation

[Checkbox] blog → technical article (+30% impact)
           Reason: More specific audience and format
```

**What to do**: Check the boxes for changes you want, then click "Apply Selected Refinements"

### Tab 3: Impact Preview 📈

Shows before/after quality scores

```
Before: 45%  ▐████░░░░░░░░░░░░░░░░░░▌
After:  72%  ▐███████████████████░░░░▌
Improvement: +60%
```

### Tab 4: Before & After 🔄

Side-by-side comparison of your original vs. refined prompt

```
ORIGINAL: Create a blog post about AI
IMPROVED: Develop a comprehensive technical article about artificial intelligence
          for software engineers covering practical implementation strategies
```

---

## Real Example: Your First Refinement

### Start Here:

```
Write code that makes the app faster
```

### Scanner Results:

**Quality Score**: 2/10 ❌

- Clarity: 0/2 (Vague - what app? what code?)
- Format: 0/2 (No format specified)
- Completeness: 1/2 (Missing context)

**Keywords Detected**:

```
write (40%) ← weak verb
code (65%) ← generic
faster (35%) ← vague metric
app (50%) ← undefined
```

**Refinements Suggested**:

```
✅ write → implement/optimize
✅ code → performance optimization layer
✅ faster → sub-500ms latency improvements
✅ app → web application
```

### After Refinement:

```
Implement a performance optimization layer for the web application
to achieve sub-500ms latency improvements. Focus on:
- Database query optimization
- Caching strategy implementation
- Code profiling and bottleneck removal
```

**New Score**: 7.5/10 ✅
**Improvement**: +275%

---

## Key Concepts

### What is "Weight"?

A score (0-10) showing how important a keyword is. Calculated by:

- **35%** How often it appears (frequency)
- **30%** How early it appears (position)
- **35%** Emphasis (capitalization, punctuation)

**Higher weight = More important → Keep or strengthen**
**Lower weight = Weak term → Replace with refinement**

### What is "Impact"?

The estimated quality improvement if you apply that refinement.

```
+50% impact = This refinement adds significant strength to your prompt
+20% impact = Helpful but not critical
+5% impact = Minor improvement
```

### What is "Context"?

The type of task your prompt is describing:

- **Action** - Do something (implement, build, create)
- **Analysis** - Understand something (analyze, examine, study)
- **Learning** - Learn something (explain, teach, understand)
- **Problem-Solving** - Fix something (resolve, troubleshoot, debug)
- **Strategy** - Plan something (develop, strategize, plan)

---

## Common Prompt Types to Try

### 1. Programming Request

```
Write code to calculate factorial
```

👆 Try this! Watch it suggest specific language, algorithm type, error handling

### 2. Writing Request

```
Write an article about climate change
```

👆 Try this! See how it refines audience, length, tone, and structure

### 3. Analysis Request

```
Analyze the data
```

👆 Try this! Watch the refinements add specificity about metrics, format, audience

### 4. Learning Request

```
Teach me about JavaScript
```

👆 Try this! See how it adjusts for experience level and learning objectives

### 5. Complex Request (Best Results)

```
Create a comprehensive guide for junior developers on implementing CI/CD pipelines.
Include: 1) core concepts, 2) tool comparison (GitHub Actions vs Jenkins vs GitLab CI),
3) step-by-step setup for a Node.js app, 4) best practices. Use code examples.
Avoid: excessive jargon, DevOps-specific terminology, enterprise complexity.
Target audience: 2-3 years of development experience, no DevOps background.
```

👆 Try this! Already strong - see minimal refinements needed

---

## Hidden Features

### Feature 1: Load ChatGPT Export

1. Click **📤 Load JSON** button
2. Select a ChatGPT conversation JSON file
3. Scanner extracts your prompts automatically
4. Analyzes the first prompt

### Feature 2: Download Report

1. After analyzing, go to **Before & After** tab
2. Click **💾 Download Report**
3. Get JSON file with:
   - Quality scores
   - All keywords and weights
   - Refinement suggestions
   - Before/after text
   - Impact calculation

### Feature 3: Copy to Clipboard

1. After refinement, click **📋 Copy Improved Prompt**
2. Paste directly into ChatGPT/Claude
3. Use your improved prompt

---

## Why This Matters

### Before Refinement

```
Write a tutorial
```

→ ChatGPT response: Generic, might miss key details, wrong length/depth

### After Refinement

```
Create a step-by-step Node.js tutorial for junior developers (2-3 years experience)
on implementing GraphQL APIs. Include: architecture overview (500 words), setup instructions
with npm packages (300 words), 5 code examples (100 words each), and troubleshooting section (200 words).
Assume familiarity with Express.js but not GraphQL. Avoid: excessive type system complexity,
unrelated performance optimization, advanced federation patterns.
```

→ ChatGPT response: Precise, targeted, correct length/depth, includes everything you need

**Result**: You get what you actually wanted instead of a generic response.

---

## Quick Tips

### ✅ DO

- Use specific metrics ("sub-100ms" vs "fast")
- Define your audience clearly
- Specify format and length
- Include constraints (what NOT to do)
- Add examples of what you want

### ❌ DON'T

- Use vague verbs (do, make, help, get)
- Assume the AI knows context (specify it!)
- Skip constraints (AI needs boundaries)
- Ask for the "best" (best for whom? measured how?)
- Use "you" without defining reader

---

## Keyboard Shortcuts

(If implemented in future versions)

| Shortcut       | Action               |
| -------------- | -------------------- |
| `Ctrl+Enter`   | Analyze prompt       |
| `Ctrl+Shift+C` | Copy improved prompt |
| `Ctrl+Shift+D` | Download report      |

---

## Troubleshooting

### "No keywords detected"

✅ **Normal for very short prompts**
Try: Add more detail to your prompt

### "Impact preview shows 0%"

✅ **Means your prompt is already excellent**
Result: You don't need many changes!

### "Browser says file not found"

✅ **Make sure you're serving the files**
Try: `python3 -m http.server 8000` in the scanner directory

### "Scripts not loading (blank page)"

✅ **JavaScript files need to load first**
Try:

1. Refresh the page (Ctrl+R)
2. Check browser console for errors (F12)
3. Make sure all `.js` files exist in the directory

---

## Next Steps

1. ✅ **Analyze 3-5 of your old prompts** - See how the scanner evaluates them
2. ✅ **Refine one prompt** - Apply suggested improvements and use it in ChatGPT
3. ✅ **Track results** - Compare AI responses before/after refinement
4. ✅ **Share findings** - Tell us how much better your results got!

---

## Questions?

Check out:

- 📖 `INTEGRATION_GUIDE.md` - Technical details
- 💡 `REAL_WORLD_EXAMPLES.md` - 6 detailed examples
- 🔍 `REFINERY_GUIDE.md` - Keyword weighting explained
- 📊 `REFINERY_QUICK_REFERENCE.md` - API reference

---

**Ready? Open `index.html` in your browser and start refining! 🚀**
