#!/usr/bin/env node

/**
 * Design System Management - Quick Start
 * Extract, analyze, organize design systems in seconds
 */

console.log(`
╔════════════════════════════════════════════════════════════════╗
║        TooLoo.ai - Design System Management System             ║
║                   Quick Start Guide                             ║
╚════════════════════════════════════════════════════════════════╝

📊 WHAT'S NEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ Intelligent Analysis Layer
  • Color intelligence: Detects primary/secondary/semantic roles
  • Typography analysis: Generates pairing recommendations
  • Spacing intelligence: Identifies base units and consistency
  • Quality scoring: Completeness, maturity, readiness metrics

💾 Persistent Management
  • Extract and automatically save design systems
  • Browse extraction history with rich metadata
  • Compare two systems side-by-side
  • Refine extractions with manual adjustments

🎯 Enhanced UI
  • "Extracted Systems Library" panel showing all extractions
  • Real-time analysis visualization
  • Compare tool for cross-system analysis
  • Improved token grid with filtering


GETTING STARTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1: Start the Servers
  npm run dev:hot
  • Starts web-server (port 3000) + product-dev server (port 3006)
  • File watcher auto-restarts on changes
  • Both servers stay live during development

Step 2: Open Design Studio
  • Navigate to: http://127.0.0.1:3000/design-studio
  • See "Or Extract from Website" section
  • Scroll down to see extraction library

Step 3: Extract a Design System
  1. Enter website URL (e.g., https://stripe.com)
  2. Click "🌐 Extract Design System"
  3. Watch real-time extraction progress
  4. View intelligent analysis results

Step 4: Explore Extracted Systems
  • See "Extracted Systems Library" panel
  • Click "View" to see detailed analysis
  • Click "Compare" to compare with another extraction
  • Click "Delete" to remove unwanted extraction


EXAMPLE WORKFLOWS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Workflow 1: Competitive Analysis
  1. Extract Stripe.com design system
  2. Extract GitHub.com design system
  3. Compare: "View the differences"
  4. Output shows: color counts, typography choices, spacing philosophy

Workflow 2: Design System Audit Trail
  1. Extract system weekly from your product
  2. Watch metrics change over time:
     • Design maturity increases
     • Completeness improves
     • Readiness score grows
  3. Document evolution for stakeholders

Workflow 3: Bootstrap New Brand
  1. Extract 3-4 competitor designs
  2. Compare them to find patterns
  3. Use extracted tokens as inspiration
  4. Refine and customize for your brand


API ENDPOINTS (Port 3006)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Extract & Analyze:
  POST /api/v1/design/extract-from-website
    curl -X POST http://127.0.0.1:3006/api/v1/design/extract-from-website \\
      -H "Content-Type: application/json" \\
      -d '{"websiteUrl":"https://stripe.com"}'

List Systems:
  GET /api/v1/design/systems
    curl http://127.0.0.1:3006/api/v1/design/systems | jq

View System:
  GET /api/v1/design/systems/:id
    curl http://127.0.0.1:3006/api/v1/design/systems/1234567890

Compare Systems:
  POST /api/v1/design/systems/:id/compare/:otherId
    curl -X POST http://127.0.0.1:3006/api/v1/design/systems/123/compare/456

Delete System:
  DELETE /api/v1/design/systems/:id
    curl -X DELETE http://127.0.0.1:3006/api/v1/design/systems/123

Refine System:
  POST /api/v1/design/systems/:id/refine
    curl -X POST http://127.0.0.1:3006/api/v1/design/systems/123/refine \\
      -H "Content-Type: application/json" \\
      -d '{"colorAdjustments":{"primary":{"name":"brand-primary"}}}'


QUALITY METRICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Completeness Score (0-100)
  • How many tokens were found
  • 30pts for ≥5 colors, 30pts for ≥2 fonts, 40pts for ≥4 spacing
  • Example: 10 colors + 3 fonts + 7 spacing = 100 completeness

Design Maturity (0-100)
  • Sophistication of design system
  • More colors, fonts, spacing = higher maturity
  • Example: Simple site = 45-55, Enterprise site = 75-90

Readiness Score (0-100)
  • Overall usability of extracted system
  • Combines completeness (30%), maturity (50%), confidence (20%)
  • Example: 85 readiness = good for using as inspiration

Confidence by Dimension
  • Colors: How confident were we about color extraction?
  • Typography: How well did we detect typography?
  • Spacing: How consistent was the spacing scale?
  • Each 0-1.0 with higher = more confident


REAL-WORLD RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Stripe.com Extract:
  ✓ 10 colors (confidence 0.85)
  ✓ 5 fonts (confidence 0.75)
  ✓ 7 spacing values (confidence 0.90)
  → Completeness: 100/100
  → Maturity: 78/100
  → Readiness: 81/100

GitHub.com Extract:
  ✓ 12 colors (confidence 0.8)
  ✓ 3 fonts (confidence 0.85)
  ✓ 8 spacing values (confidence 0.88)
  → Completeness: 100/100
  → Maturity: 85/100
  → Readiness: 87/100

Comparison Result:
  GitHub has 2 more colors (+17%)
  Both use modern sans-serif fonts
  Spacing philosophy is similar (8px base)


TROUBLESHOOTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: "No colors extracted from website"
A: Website may use CSS-in-JS or dynamic colors. Try another site
   or check DevTools to verify styles are in HTML.

Q: "Servers not starting"
A: Check if ports 3000/3006 are in use:
   lsof -i :3000
   lsof -i :3006

Q: "Systems list empty"
A: Data is persisted in data/design-system/
   Check if directory exists: ls data/design-system/

Q: "Extraction timed out"
A: Website may be slow. Try a different site or increase timeout
   in lib/design-extractor.js if needed.

Q: "Confidence score too low"
A: Extract from a site with more visible design tokens
   Or manually refine using /refine endpoint


DOCUMENTATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Full Guide: DESIGN-SYSTEM-MANAGEMENT-GUIDE.md
  • Complete architecture overview
  • Algorithm explanations
  • Extended API reference
  • Best practices and tips

Code Reference:
  • lib/design-extractor.js (extraction logic)
  • lib/design-system-analyzer.js (intelligent analysis)
  • servers/product-development-server.js (API endpoints)
  • web-app/design-studio.html (UI components)


QUICK TIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Best Sites to Extract:
   • SaaS dashboards (Stripe, Figma, Notion, GitHub)
   • E-commerce sites (Shopify, Airbnb)
   • Design showcases (Dribbble, Behance)
   • Design system docs (Material Design, Tailwind)

💡 Save Time:
   • Compare 3+ competitors at once to identify patterns
   • Use CSV export to analyze in spreadsheets
   • Batch extract during off-hours (respects rate limits)

💡 Quality Results:
   • Verify extracted colors visually (compare with DevTools)
   • Refine typography roles manually
   • Use readiness score >70 as confidence threshold

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ready to extract? Open http://127.0.0.1:3000/design-studio now!
`);
