# Quick Command Reference – Restoration Session

## Test Events/Webhooks Endpoints

```bash
# Check status
curl http://127.0.0.1:3007/api/v1/events/status | jq .

# List GitHub events
curl http://127.0.0.1:3007/api/v1/events/provider/github | jq .

# List Slack events
curl http://127.0.0.1:3007/api/v1/events/provider/slack | jq .

# Send test GitHub event
curl -X POST http://127.0.0.1:3007/api/v1/events/webhook \
  -H 'Content-Type: application/json' \
  -d '{"provider":"github","type":"push","data":{"repo":"TooLoo.ai","commits":3}}'

# Send test Slack event
curl -X POST http://127.0.0.1:3007/api/v1/events/webhook \
  -H 'Content-Type: application/json' \
  -d '{"provider":"slack","type":"message","data":{"channel":"C123","text":"Test"}}'

# Analyze events (last 60 minutes)
curl -X POST http://127.0.0.1:3007/api/v1/events/analyze \
  -H 'Content-Type: application/json' \
  -d '{"windowMinutes":60}' | jq .

# Clear GitHub events
curl -X DELETE http://127.0.0.1:3007/api/v1/events/clear/github | jq .

# Clear Slack events
curl -X DELETE http://127.0.0.1:3007/api/v1/events/clear/slack | jq .
```

## Test OAuth Endpoints

```bash
# Check OAuth status
curl http://127.0.0.1:3000/api/v1/oauth/status | jq .

# Start GitHub OAuth (returns authorization URL)
curl -X POST http://127.0.0.1:3000/api/v1/oauth/github/authorize | jq .

# Start Slack OAuth (returns authorization URL)
curl -X POST http://127.0.0.1:3000/api/v1/oauth/slack/authorize | jq .
```

## System Health Checks

```bash
# Check services running
ps aux | grep 'node servers'

# Check web server health
curl http://127.0.0.1:3000/health

# Check segmentation server health
curl http://127.0.0.1:3007/health

# Check all services on expected ports
lsof -i :3000
lsof -i :3007
lsof -i :3008 (reports, needed for Priority #3)
```

## Start/Stop Services

```bash
# Start full system
npm run dev

# Start individual servers
node servers/web-server.js &
node servers/segmentation-server.js &
node servers/reports-server.js &

# Stop all node processes
npm run stop:all

# Kill specific service (port 3007)
lsof -i :3007 | grep node | awk '{print $2}' | xargs kill -9
```

## View Control Center

```bash
# Open in browser
http://127.0.0.1:3000/phase3-control-center.html

# Test via curl
curl http://127.0.0.1:3000/phase3-control-center.html | head -50
```

## View Documentation

```bash
# Browse all documentation files
ls -lh *.md | grep -E "(EVENTS|OAUTH|SESSION|FEATURE|RESTORATION)"

# Read specific guide
cat EVENTS_WEBHOOKS_COMPLETE.md | less
cat OAUTH_RESTORATION_COMPLETE.md | less
cat SESSION_SUMMARY.md | less

# File locations
/workspaces/TooLoo.ai/servers/segmentation-server.js       (events: lines 346-545)
/workspaces/TooLoo.ai/servers/web-server.js               (oauth: lines 826-1021)
/workspaces/TooLoo.ai/web-app/phase3-control-center.html  (ui: lines 425-475)
```

## Check Event Data

```bash
# Check current event store (if you modify code to export)
curl http://127.0.0.1:3007/api/v1/events/provider/github?limit=100 | jq '.events | length'

# Get specific event details
curl http://127.0.0.1:3007/api/v1/events/provider/github | jq '.events[0]'

# Count events by type
curl http://127.0.0.1:3007/api/v1/events/analyze | jq '.insights.byType'
```

## Next Priority (#3) Preparation

```bash
# Check reports server status
curl http://127.0.0.1:3008/health

# View reports server code
cat servers/reports-server.js | head -50

# Expected new endpoints (not yet implemented)
# GET /api/v1/reports/analytics
# GET /api/v1/reports/performance
# GET /api/v1/reports/usage
# POST /api/v1/reports/export
```

## Useful File Paths

```
# Documentation Index
SESSION_SUMMARY.md                        ← Start here for complete overview
FEATURE_2_SUMMARY.md                     ← Events/Webhooks quick summary
FEATURE_2_COMPLETE.md                    ← Implementation details

# Main Implementation Files
servers/segmentation-server.js            ← Events endpoints (lines 346-545)
servers/web-server.js                     ← OAuth endpoints (lines 826-1021)
web-app/phase3-control-center.html       ← UI integration (lines 425-475)

# Detailed Guides
EVENTS_WEBHOOKS_COMPLETE.md              ← Full Events reference
OAUTH_RESTORATION_COMPLETE.md            ← Full OAuth reference
MISSED_FEATURES_ANALYSIS.md              ← Roadmap for all 5 features
RESTORATION_PROGRESS.md                  ← Session progress tracking
```

## Todo List Status

```bash
# Check progress
cat RESTORATION_SESSION_UPDATE.md | grep -A 20 "Completion Summary"

# Todo status:
# ✅ Priority #1: OAuth Integration (COMPLETE)
# ✅ Priority #2: Events & Webhooks (COMPLETE)
# 📍 Priority #3: Analytics & Monitoring (NOT STARTED)
# 📍 Priority #4: Self-Improvement Loop (NOT STARTED)
# 📍 Priority #5: UI Activity Monitoring (NOT STARTED)
```

## Quick Stats

```
Session Duration:       5 hours ✅
Code Added:            624 lines
Documentation:          87 KB (8 files)
Features Complete:     2/5 (40%)
System Health:        12/12 services ✅
Test Pass Rate:       33/33 (100%) ✅
Console Errors:       0 ✅

Next Feature:         Priority #3 (2-3 hours estimated)
Remaining Total:      6-8 hours (all 3 features)
```

---

**Last Updated**: 2025-11-05T01:40:00Z  
**Status**: ✅ Session 2 Complete – Ready for Session 3
