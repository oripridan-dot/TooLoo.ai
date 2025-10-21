# UI Activity Monitor - Implementation Checklist

## ✅ Pre-Flight Checklist

Before deploying, verify all components are in place and functioning:

### Files Created
- [ ] `servers/ui-activity-monitor.js` exists and is valid
- [ ] `web-app/js/tooloo-heartbeat.js` exists and is valid
- [ ] `scripts/test-ui-activity-monitor.js` exists and is valid
- [ ] `docs/UI-ACTIVE-SERVER-MANAGEMENT.md` exists
- [ ] `QUICK-START-UI-ACTIVE-SERVERS.md` exists
- [ ] `IMPLEMENTATION-UI-ACTIVE-SERVERS.md` exists
- [ ] `scripts/tooloo-commands.sh` exists
- [ ] `UI-ACTIVITY-MONITOR-SUMMARY.md` exists

### Files Modified
- [ ] `servers/web-server.js` has heartbeat injection middleware
- [ ] `servers/web-server.js` has activity monitor proxy endpoints
- [ ] `servers/orchestrator.js` includes ui-monitor service
- [ ] All modifications are backward compatible (no breaking changes)

### Syntax Validation
```bash
# Verify no syntax errors
node -c servers/ui-activity-monitor.js
node -c web-app/js/tooloo-heartbeat.js
node -c scripts/test-ui-activity-monitor.js
```
- [ ] All files have valid syntax

## 🚀 Deployment Checklist

### 1. Start System
```bash
npm run dev
```
- [ ] Web server starts on port 3000
- [ ] Orchestrator starts on port 3123
- [ ] No errors in console
- [ ] Services begin starting

### 2. Verify Activity Monitor
```bash
curl http://127.0.0.1:3050/health
```
- [ ] Returns `{"ok":true,"status":"monitoring"}`
- [ ] Takes < 500ms to respond

### 3. Test Heartbeat Injection
```bash
curl http://127.0.0.1:3000/control-room | grep tooloo-heartbeat
```
- [ ] HTML contains `tooloo-heartbeat.js` script tag
- [ ] Script tag is properly formatted

### 4. Check Web Server Proxy
```bash
curl -X POST http://127.0.0.1:3000/api/v1/activity/heartbeat \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"test","route":"/test"}'
```
- [ ] Returns JSON with `ok: true`
- [ ] Includes `serversActive` and `serverHealth`

### 5. Verify Session Tracking
```bash
curl http://127.0.0.1:3000/api/v1/activity/sessions
```
- [ ] Returns JSON array of sessions
- [ ] Shows at least one session if browser open

### 6. Check Server Health
```bash
curl http://127.0.0.1:3000/api/v1/activity/servers
```
- [ ] Returns list of all 13 services
- [ ] Shows health status for each
- [ ] At least 6 showing as healthy

### 7. Test Real Data Mode
```bash
curl -X POST http://127.0.0.1:3000/api/v1/activity/ensure-real-data
```
- [ ] Returns `realDataMode: true`
- [ ] Returns `providersActive: true`

### 8. Verify Provider Status
```bash
curl http://127.0.0.1:3000/api/v1/providers/status
```
- [ ] Returns status object
- [ ] At least one provider is `available: true`

## 📋 Functional Testing

### Test 1: Automatic Service Startup
1. [ ] Open browser to http://localhost:3000/
2. [ ] Wait 10 seconds
3. [ ] Run: `curl http://127.0.0.1:3000/api/v1/activity/servers | jq '.activeServers'`
4. [ ] Verify active servers >= 6

### Test 2: Session Tracking
1. [ ] Open 2-3 browser tabs to different pages
2. [ ] Run: `curl http://127.0.0.1:3000/api/v1/activity/sessions | jq '.activeSessions'`
3. [ ] Verify shows 2-3 sessions
4. [ ] Wait 5 minutes of inactivity
5. [ ] Sessions should clean up

### Test 3: Real Data Pipeline
1. [ ] Go to chat page (e.g., http://localhost:3000/chat-nexus)
2. [ ] Send a message
3. [ ] Verify response is from actual provider (not demo)
4. [ ] Check response time is realistic (not instant)

### Test 4: Heartbeat Injection
1. [ ] Open DevTools (F12) on any page
2. [ ] Go to Sources tab
3. [ ] Search for `/js/tooloo-heartbeat.js`
4. [ ] Verify script loads successfully

### Test 5: Configuration API
1. [ ] Run: `curl -X POST http://127.0.0.1:3000/api/v1/activity/config -H 'Content-Type: application/json' -d '{"minActiveServers": 8}'`
2. [ ] Verify returns new config
3. [ ] Check: `curl http://127.0.0.1:3000/api/v1/activity/servers | jq '.config.minActiveServers'`

## 🧪 Full Test Suite

### Run Comprehensive Tests
```bash
node scripts/test-ui-activity-monitor.js
```

- [ ] Test 1: Activity Monitor Health - PASS
- [ ] Test 2: Heartbeat Script Injection - PASS
- [ ] Test 3: Heartbeat Endpoint - PASS
- [ ] Test 4: Session Tracking - PASS
- [ ] Test 5: Server Health Checks - PASS
- [ ] Test 6: Real Data Mode - PASS
- [ ] Test 7: Provider Status - PASS
- [ ] Test 8: Budget Status - PASS
- [ ] Test 9: Configuration Management - PASS
- [ ] Test 10: Heartbeat Script Functionality - PASS

**Expected Result**: All 10 tests pass ✅

## 📊 Performance Validation

### Monitor Overhead
```bash
# Measure heartbeat response time
time curl -X POST http://127.0.0.1:3000/api/v1/activity/heartbeat \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"test","route":"/test"}'
```
- [ ] Response time < 50ms
- [ ] Consistent across multiple requests

### Health Check Overhead
```bash
# Monitor CPU during health checks
# Should see brief spike every 15s, then return to baseline
```
- [ ] CPU usage < 5% during checks
- [ ] Memory stable < 150MB total

## 🔍 Integration Verification

### With Existing Systems
- [ ] All existing APIs still work
- [ ] No existing endpoints broken
- [ ] Backward compatibility maintained
- [ ] No conflicts with other services

### With Providers
- [ ] DeepSeek responds when active
- [ ] Claude responds when active
- [ ] Ollama responds when available
- [ ] Provider selection logic works

### With Browser
- [ ] Script works in Chrome
- [ ] Script works in Firefox
- [ ] Script works in Safari
- [ ] localStorage functional

## 🎯 User Experience Testing

### New User
- [ ] Can open any page without setup
- [ ] Real data appears automatically
- [ ] No console errors
- [ ] No visible performance impact

### Power User
- [ ] Can access all monitoring APIs
- [ ] Can configure settings
- [ ] Can view session history
- [ ] Can debug issues

### Administrator
- [ ] Can monitor system health
- [ ] Can adjust auto-start behavior
- [ ] Can check budget/costs
- [ ] Can view all active sessions

## 🚨 Error Handling

### Simulate Activity Monitor Down
```bash
pkill -f ui-activity-monitor
# Verify web server still works and gracefully fails
curl http://127.0.0.1:3000/
```
- [ ] Page loads normally
- [ ] Shows fallback in network logs
- [ ] No console errors visible to user

### Simulate All Providers Down
```bash
# Verify system degrades gracefully
curl http://127.0.0.1:3000/api/v1/activity/ensure-real-data
```
- [ ] Returns `providersActive: false`
- [ ] System continues functioning

## 📈 Scaling Verification

### Single User
- [ ] System works correctly
- [ ] All services running

### Multiple Users (5 concurrent)
- [ ] All sessions tracked
- [ ] Services stay healthy
- [ ] No session collisions

### High Activity (10+ requests/second)
- [ ] Heartbeat endpoint handles load
- [ ] No dropped sessions
- [ ] Performance degradation < 10%

## 📚 Documentation Verification

- [ ] `QUICK-START-UI-ACTIVE-SERVERS.md` is clear and complete
- [ ] `docs/UI-ACTIVE-SERVER-MANAGEMENT.md` covers all APIs
- [ ] `IMPLEMENTATION-UI-ACTIVE-SERVERS.md` explains architecture
- [ ] `scripts/tooloo-commands.sh` has all commands
- [ ] All code files have proper comments

## 🔒 Security Checks

- [ ] No hardcoded secrets
- [ ] No sensitive data in logs
- [ ] CORS properly configured
- [ ] Input validation on all endpoints
- [ ] No SQL injection vectors
- [ ] Session IDs are random

## 📦 Deployment Readiness

- [ ] All files properly formatted
- [ ] No debug logging left enabled
- [ ] Error handling in place
- [ ] Graceful degradation works
- [ ] Can be rolled back if needed
- [ ] No database migrations needed
- [ ] No external dependencies added

## ✨ Final Validation

### Visual Inspection
- [ ] Code follows project style
- [ ] Comments are clear
- [ ] No console.log left in production code
- [ ] Proper error handling throughout

### Functional Validation
```bash
# 1. Start fresh
npm run clean
npm run dev

# 2. Wait for startup
sleep 5

# 3. Run tests
node scripts/test-ui-activity-monitor.js

# 4. Open browser
open http://localhost:3000/

# 5. Final check
curl http://127.0.0.1:3000/api/v1/activity/sessions
```
- [ ] No errors during startup
- [ ] All tests pass
- [ ] Page loads with real data
- [ ] Session visible in API

## 🎉 Sign-Off

- [ ] Product Owner approval
- [ ] Code review completed
- [ ] QA testing completed
- [ ] Documentation approved
- [ ] Ready for production

---

## Deployment Commands

### Pre-Deployment
```bash
# Verify setup
node scripts/test-ui-activity-monitor.js

# Check syntax
for f in servers/ui-activity-monitor.js web-app/js/tooloo-heartbeat.js; do
  node -c "$f" && echo "✓ $f" || echo "✗ $f"
done
```

### Deployment
```bash
# Start system (handles everything automatically)
npm run dev
```

### Post-Deployment Verification
```bash
# Quick sanity check
curl http://127.0.0.1:3000/api/v1/activity/servers | jq '.activeServers'
curl http://127.0.0.1:3000/api/v1/activity/sessions | jq '.activeSessions'
```

---

**Last Updated**: October 21, 2025
**Version**: 1.0
**Status**: Ready for Deployment ✅
