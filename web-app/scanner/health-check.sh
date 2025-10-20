#!/bin/bash
# Scanner System Health Check
# Run from: /workspaces/TooLoo.ai/web-app/scanner/

echo "🔍 AI Chat Scanner - System Check"
echo "=================================="
echo ""

# Check core files
echo "📋 Core Files:"
files=(
  "index.html"
  "refinery-engine.js"
  "refinery-ui.js"
  "scanner-refinery-integration.js"
  "chat-parser.js"
  "prompt-analyzer.js"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    size=$(wc -c < "$file" | numfmt --to=iec-i --suffix=B 2>/dev/null || wc -c < "$file")
    echo "  ✅ $file ($size)"
  else
    echo "  ❌ $file (MISSING)"
  fi
done

echo ""
echo "📚 Documentation:"
docs=(
  "README.md"
  "QUICK_START.md"
  "INTEGRATION_GUIDE.md"
  "REAL_WORLD_EXAMPLES.md"
  "REFINERY_GUIDE.md"
  "REFINERY_QUICK_REFERENCE.md"
)

for doc in "${docs[@]}"; do
  if [ -f "$doc" ]; then
    lines=$(wc -l < "$doc")
    echo "  ✅ $doc ($lines lines)"
  else
    echo "  ❌ $doc (MISSING)"
  fi
done

echo ""
echo "🧪 Quick Test:"
if [ -f "index.html" ]; then
  # Check if HTML has required scripts
  if grep -q "refinery-engine.js" index.html && \
     grep -q "scanner-refinery-integration.js" index.html && \
     grep -q "prompt-analyzer.js" index.html; then
    echo "  ✅ All script references present"
  else
    echo "  ⚠️  Missing some script references"
  fi
  
  # Check if HTML has UI elements
  if grep -q "analysisContent" index.html && \
     grep -q "keywordsList" index.html && \
     grep -q "refinementsList" index.html; then
    echo "  ✅ All UI containers present"
  else
    echo "  ⚠️  Missing some UI containers"
  fi
  
  # Check for main functions
  if grep -q "function analyzePrompt()" index.html && \
     grep -q "function displayKeywords()" index.html; then
    echo "  ✅ Main functions defined"
  else
    echo "  ⚠️  Missing main functions"
  fi
fi

echo ""
echo "📊 File Statistics:"
total_js=0
total_docs=0

for file in *.js; do
  if [ -f "$file" ]; then
    lines=$(wc -l < "$file")
    total_js=$((total_js + lines))
  fi
done

for doc in *.md; do
  if [ -f "$doc" ]; then
    lines=$(wc -l < "$doc")
    total_docs=$((total_docs + lines))
  fi
done

echo "  JavaScript: ~$total_js lines of code"
echo "  Documentation: ~$total_docs lines"
echo "  Total: ~$((total_js + total_docs)) lines"

echo ""
echo "🚀 Ready to Launch:"
echo "  1. cd /workspaces/TooLoo.ai/web-app/scanner"
echo "  2. python3 -m http.server 8000"
echo "  3. Visit http://localhost:8000"
echo ""
echo "✅ System check complete!"
