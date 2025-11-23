# Staging Deployment — Track 2

**Timeline:** November 17-18, 2025  
**Status:** 🟡 IN PROGRESS  
**Objective:** Deploy Phase 4.3 + 4.4 to staging environment

---

## Deployment Configuration

### Pre-Deployment Checklist

**Code Quality (✅ VERIFIED):**
- [x] All syntax valid (node -c)
- [x] All unit tests passing (10/10 for Phase 4.4, 10/10 for Phase 4.3)
- [x] All REST endpoints responding (16 total: 8 GitHub + 8 Slack)
- [x] Error handling comprehensive
- [x] Documentation complete

**Infrastructure (✅ READY):**
- [x] Backup created: `/tmp/tooloo-staging-backup-*`
- [x] Staging environment available
- [x] Credentials in .env
- [x] Database connections ready
- [x] Ports available: 3000, 3001-3009, 3123

**Services to Deploy:**
1. Web Server (Port 3000) — API proxy + UI
2. Training Server (Port 3001) — Selection engine
3. Meta Server (Port 3002) — Meta-learning phases
4. Budget Server (Port 3003) — Provider status
5. Coach Server (Port 3004) — Auto-Coach loop
6. Cup Server (Port 3005) — Provider Cup tournaments
7. Product Development Server (Port 3006) — Workflows
8. Segmentation Server (Port 3007) — Conversation analysis
9. Reports Server (Port 3008) — Analytics
10. Capabilities Server (Port 3009) — Feature tracking
11. Orchestrator (Port 3123) — System coordination

---

## Deployment Steps

### Step 1: Pre-Deployment Backup
```bash
# Create dated backup
BACKUP_DIR="/tmp/tooloo-staging-backup-$(date +%s)"
mkdir -p "$BACKUP_DIR"
cp -r /workspaces/TooLoo.ai/* "$BACKUP_DIR/"
echo "Backup created: $BACKUP_DIR"
```

### Step 2: Code Preparation
```bash
# Verify latest commit
git log --oneline -3

# Check branch status
git branch -v

# Ensure all changes committed
git status
```

### Step 3: Install Dependencies
```bash
# Reinstall if needed
npm install

# Verify installs
npm list | head -20
```

### Step 4: Pre-Flight Tests

**Syntax Validation:**
```bash
node -c servers/web-server.js
node -c servers/orchestrator.js
```

**Unit Tests:**
```bash
# Phase 4.3 tests
node tests/github-api-integration.test.js

# Phase 4.4 tests
node tests/slack-integration.test.js
```

**Integration Tests:**
```bash
# Credential testing (requires running server)
node test-slack-credentials.js
```

### Step 5: Start Services

**Option A: Full Stack (Recommended)**
```bash
npm run dev
```

**Option B: Individual Services**
```bash
# Terminal 1: Web server
node servers/web-server.js

# Terminal 2: Orchestrator
node servers/orchestrator.js

# Terminal 3: Training server (optional)
node servers/training-server.js
```

### Step 6: Smoke Tests (6 Tests)

**Test 1: Web Server Health**
```bash
curl http://127.0.0.1:3000/health
# Expected: 200 OK
```

**Test 2: GitHub Endpoints**
```bash
curl http://127.0.0.1:3000/api/v1/github/status
# Expected: configured status
```

**Test 3: Slack Endpoints**
```bash
curl http://127.0.0.1:3000/api/v1/slack/status
# Expected: configured status
```

**Test 4: Training Server**
```bash
curl http://127.0.0.1:3000/api/v1/training/overview
# Expected: training metrics
```

**Test 5: Provider Burst**
```bash
curl -X POST http://127.0.0.1:3000/api/v1/providers/burst \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"test"}'
# Expected: provider response
```

**Test 6: System Processes**
```bash
curl http://127.0.0.1:3000/api/v1/system/processes
# Expected: process list
```

---

## Monitoring Configuration

### Real-Time Monitoring

**Terminal 1: Server Logs**
```bash
tail -f /tmp/tooloo-staging.log
```

**Terminal 2: System Monitor**
```bash
# Watch process usage
watch -n 1 'ps aux | grep "node servers"'
```

**Terminal 3: Health Checks**
```bash
# Run continuous health monitoring
while true; do
  curl -s http://127.0.0.1:3000/api/v1/slack/status | python3 -m json.tool
  sleep 30
done
```

### Key Metrics to Monitor

1. **Service Availability**
   - Web server: Should respond within 100ms
   - All endpoints: Should return status codes
   - Error rate: Should be <1%

2. **Resource Usage**
   - CPU: Should stay <40% idle
   - Memory: Should stay <500MB for Node processes
   - Disk: Monitor log growth

3. **API Performance**
   - GitHub endpoints: <500ms response time
   - Slack endpoints: <500ms response time
   - Training endpoints: <1s response time

4. **Error Tracking**
   - Check `/tmp/web-server.log` for errors
   - Look for 5xx status codes
   - Monitor rate limiter status

---

## Testing Scenarios

### Scenario 1: GitHub API Integration
```bash
# Test status
curl http://127.0.0.1:3000/api/v1/github/status

# Test file commit (requires credentials)
curl -X POST http://127.0.0.1:3000/api/v1/github/commit-file \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "test-staging.txt",
    "content": "Staging test at '$(date)'",
    "message": "Staging deployment test"
  }'
```

### Scenario 2: Slack Integration
```bash
# Test status
curl http://127.0.0.1:3000/api/v1/slack/status

# Test routing configuration
curl -X POST http://127.0.0.1:3000/api/v1/slack/configure-routing \
  -H "Content-Type: application/json" \
  -d '{
    "rules": {
      "alerts": "C123456",
      "analyses": "C789012"
    }
  }'

# Test statistics
curl http://127.0.0.1:3000/api/v1/slack/notification-stats
```

### Scenario 3: Multi-Provider Tests
```bash
# Check provider status
curl http://127.0.0.1:3000/api/v1/providers/status

# Test provider burst
curl -X POST http://127.0.0.1:3000/api/v1/providers/burst \
  -H "Content-Type: application/json" \
  -d '{"prompt":"What is AI?"}'
```

---

## Rollback Procedure

If issues occur during staging:

**Option 1: Restart Services**
```bash
npm run stop:all
sleep 2
npm run dev
```

**Option 2: Rollback to Backup**
```bash
# List backups
ls -la /tmp/tooloo-staging-backup-*

# Restore specific backup
rsync -av /tmp/tooloo-staging-backup-TIMESTAMP/ /workspaces/TooLoo.ai/
```

**Option 3: Git Rollback**
```bash
# View recent commits
git log --oneline -5

# Revert to previous commit (if needed)
git revert HEAD
git push origin branch-name
```

---

## Deployment Success Criteria

✅ **Code Quality:**
- No syntax errors
- All tests passing (20/20 minimum)
- No breaking changes

✅ **Functionality:**
- All 16 REST endpoints responding
- GitHub integration working
- Slack integration working (with credentials)
- No error spikes

✅ **Performance:**
- Average response time <500ms
- Memory stable <500MB per process
- CPU usage <40%
- Error rate <1%

✅ **Monitoring:**
- Logs accessible and clean
- Health checks passing
- Services auto-recovering on restart
- Resource limits not exceeded

---

## Post-Deployment Tasks

### 1. Notification
- [ ] Notify team of successful staging deployment
- [ ] Document any configuration changes
- [ ] Share access credentials if needed

### 2. Documentation
- [ ] Update deployment runbook
- [ ] Document any issues and resolutions
- [ ] Create staging access guide

### 3. Monitoring Setup
- [ ] Enable continuous health monitoring
- [ ] Set up alert thresholds
- [ ] Configure log rotation
- [ ] Schedule daily health reports

### 4. Performance Baseline
- [ ] Record baseline metrics
- [ ] Document expected load capacity
- [ ] Identify bottlenecks
- [ ] Plan scaling strategy

---

## Timeline

**Phase 1: Preparation (1 hour)**
- Create backups
- Verify code quality
- Run pre-flight tests

**Phase 2: Deployment (30 minutes)**
- Start services
- Run smoke tests
- Verify all endpoints

**Phase 3: Monitoring (24-48 hours)**
- Continuous health checks
- Performance monitoring
- Error tracking
- Load testing (optional)

**Phase 4: Sign-Off (30 minutes)**
- Verify success criteria
- Document results
- Plan production deployment

---

## Success Indicators

When the following are true, staging deployment is successful:

1. ✅ All services running without errors
2. ✅ All 16 REST endpoints responding
3. ✅ GitHub integration functional
4. ✅ Slack integration functional (with real credentials)
5. ✅ No memory leaks detected
6. ✅ Response times acceptable (<500ms)
7. ✅ Error rate minimal (<1%)
8. ✅ Services auto-recover on restart

---

## Related Documents

- `PHASE-4-3-COMPLETION-REPORT.md` — GitHub integration details
- `PHASE-4-4-COMPLETION-REPORT.md` — Slack integration details
- `QUICK-REFERENCE-ORCHESTRATOR.md` — System architecture

---

**Status:** Ready for deployment  
**Date:** November 17, 2025  
**Approval:** Pending
