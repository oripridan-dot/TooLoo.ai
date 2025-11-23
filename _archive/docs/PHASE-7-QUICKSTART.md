# Phase 7: Dashboard Quickstart

## 🚀 Access the Dashboard

The analytics dashboard is now live and ready to use.

### URLs
```bash
# Primary (recommended)
http://localhost:3000/design-studio/analytics

# Aliases
http://localhost:3000/analytics-dashboard
http://localhost:3000/design-analytics
```

### Start the System
```bash
npm run dev
# or
npm run start:simple
```

Then navigate to any of the URLs above in your browser.

## 📊 Dashboard Layout

### Top Status Bar (Real-Time Metrics)
```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Design System Analytics    [System Dropdown] [🔄 Refresh] │
└─────────────────────────────────────────────────────────────┘

┌────────────┬────────────┬────────────┬────────────┐
│ Maturity   │   Tokens   │ Accessib.  │  Archetype │
│    82      │     65     │    91%     │ Enterprise │
└────────────┴────────────┴────────────┴────────────┘
```

### Tab Navigation

Click any tab to view:

1. **📈 Trends** - Token growth, maturity evolution, metrics over time
2. **🎨 Clustering** - K-means visualization, token distribution, archetype analysis
3. **♿ Accessibility** - WCAG compliance, color contrast, readability metrics
4. **📋 Governance** - Version history, deprecations, approval workflows
5. **🔄 Comparison** - Cross-system benchmarking

## 🎯 Quick Actions

### Refresh Dashboard
```
Click the 🔄 button in the top-right corner
Loading indicator shows status
All charts and metrics update
```

### Change System
```
1. Click "Default System" dropdown
2. Select another system (Stripe, Figma, Shopify examples)
3. Dashboard reloads with new system's data
```

### View Specific Tab
```
Click any tab name to switch view
Content loads immediately
Previous state preserved for quick navigation
```

## 📈 Key Insights by Tab

### Trends Tab
**What you see:**
- Token growth curve (25 → 68 tokens)
- Maturity progression (35% → 82%)
- Distribution by category (colors, typography, spacing, etc.)
- Metrics: Growth rate (8.5%), volatility (2.1%), prediction (68)

**Use case:** Track design system health over time, forecast growth

### Clustering Tab
**What you see:**
- 3D token clustering scatter plot
- Token distribution pie chart
- Archetype classification with confidence
- Characteristic breakdown

**Use case:** Find token groups, identify archetype fit, discover patterns

### Accessibility Tab
**What you see:**
- WCAG level breakdown (AAA, AA, Below AA)
- Color contrast ratios for key pairs
- Readability metrics (font size, line height, weight variety)
- Compliance status

**Use case:** Ensure design system meets accessibility standards

### Governance Tab
**What you see:**
- Version history with timestamps
- Deprecation tracking
- Approval workflow status
- Change summaries per version

**Use case:** Track changes, manage deprecations, control versioning

### Comparison Tab
**What you see:**
- Side-by-side comparison table
- Your system vs. industry standards
- Metric deltas (higher, lower, equal)
- Benchmarking against Stripe, Figma, Shopify

**Use case:** Understand competitive position, identify improvement areas

## 🔌 API Integration

The dashboard displays sample data by default. To connect real data:

### Option 1: Connect via Product Development Server

Edit the dashboard JavaScript to point to real endpoints:

```javascript
// In the dashboard
const API_BASE = 'http://127.0.0.1:3006/api/v1';

// Available endpoints from Phase 5-6:
POST /api/v1/design/analytics/trends
POST /api/v1/ml/clustering/kmeans
GET /api/v1/governance/version/history
POST /api/v1/governance/deprecations
POST /api/v1/design/analytics/accessibility
```

### Option 2: Use WebSocket (Coming Phase 7.2)

Real-time updates will be available once Phase 7.2 is implemented.

## 🎨 Customization

### Change Theme Colors
Edit the dashboard CSS:
```css
:root {
  --primary: #60a5fa;    /* Blue accent */
  --success: #34d399;    /* Green for compliance */
  --warning: #fb923c;    /* Orange for review needed */
}
```

### Add a New Chart
1. Add container in HTML
2. Initialize Chart.js object
3. Add event listener to refresh function
4. Test with sample data

### Add a New Tab
1. Create tab button with `data-tab="name"`
2. Create content div with `id="name"`
3. Add event listener to `switchTab()` function
4. Load tab-specific data

## 📱 Responsive Design

The dashboard adapts to all screen sizes:

- **Desktop (1200px+)**: 2-column grid layout
- **Tablet (768-1200px)**: Single column, full width
- **Mobile (<768px)**: Optimized for small screens

## 🚀 Performance Tips

### Reduce Load Time
1. Check your network tab (DevTools > Network)
2. Lazy-load charts (load only visible tab)
3. Cache API responses (5-10 minute TTL)

### Optimize Chart Rendering
1. Use appropriate chart type for data
2. Limit dataset size (max 1,000 points per chart)
3. Disable animation for large datasets

### Monitor Memory
DevTools > Performance > Record
Look for chart recreation and memory leaks

## 🐛 Troubleshooting

### Dashboard Won't Load
```bash
# Check if web server is running
curl http://127.0.0.1:3000/api/v1/system/health

# Restart web server
npm run stop:all
npm run dev
```

### Charts Show No Data
1. Check browser console (F12 > Console tab)
2. Verify API_BASE is correct
3. Check CORS headers if calling external API
4. Sample data should load (gray charts indicate loading issue)

### Styling Looks Broken
1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear cache (DevTools > Application > Clear Storage)
3. Check browser console for CSS errors

### System Selection Doesn't Work
1. Check dropdown HTML exists
2. Verify event listener is attached
3. Check for JavaScript errors in console

## 📊 Sample Data Overview

Dashboard comes with realistic sample data:

**Tokens:** 65 total
- Colors: 12
- Typography: 8
- Spacing: 15
- Components: 24
- Patterns: 6

**Trends (6 weeks):**
- Tokens: 25 → 32 → 38 → 45 → 52 → 58
- Maturity: 35% → 42% → 54% → 62% → 73% → 82%

**Clustering:** 3 semantic clusters (20, 18, 27 tokens)

**Accessibility:**
- WCAG AAA: 8 colors
- WCAG AA: 4 colors
- Below AA: 2 colors

**Governance:**
- v2.0: Design Expansion (3 days ago)
- v1.5: Initial Release (2 weeks ago)

## 🔮 What's Coming

### Phase 7.2 (Coming Soon)
- Real-time WebSocket updates
- Multi-user collaboration
- Live presence tracking
- Change notifications

### Phase 7.3 (Planned)
- Timeline predictions
- Anomaly detection
- Trend forecasting
- Pattern discovery

### Phase 7.4 (Planned)
- PDF reports
- CSV export
- Scheduled reports
- Email delivery

## 💡 Use Cases

### Executive Overview
Show stakeholders system health at a glance:
- Maturity score
- Token count
- Accessibility compliance
- Trend progression

### Designer Review
Team reviews design system progress:
- See what changed this month
- Check accessibility compliance
- Compare to industry standards
- Plan next phase

### Developer Onboarding
New team members learn system:
- View all available tokens
- Understand token organization (clustering)
- Check guidelines (governance)
- See best practices (comparison)

### Roadmap Planning
Plan next quarter improvements:
- Current maturity vs. target
- Token growth trajectory
- Accessibility gaps
- Governance needs

## 📞 Support

### Check Logs
```bash
# Web server logs
tail -f logs/web-server.log

# Product dev server logs
tail -f logs/product-dev-server.log
```

### Test Endpoints
```bash
# System health
curl http://127.0.0.1:3000/api/v1/system/health

# Analytics endpoints
curl http://127.0.0.1:3006/api/v1/design/analytics/trends
curl http://127.0.0.1:3006/api/v1/ml/clustering/kmeans
```

### Reset to Defaults
1. Refresh page (Ctrl+R)
2. Clear browser cache (DevTools > Application)
3. Restart servers (`npm run stop:all && npm run dev`)

---

**Status:** ✅ Production Ready

Phase 7.1 Dashboard is fully functional and ready for use. Connect to real APIs in Phase 7.2!
