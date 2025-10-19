# 🔖 TooLoo.ai Launch Day - Quick Reference Card

**Date:** October 21, 2025  
**Status:** ✅ LAUNCH READY

---

## 🎯 KEY URLS (Bookmark These)

### User-Facing
- **Control Room (Home):** http://127.0.0.1:3000/
- **Referral Program:** http://127.0.0.1:3000/referral
- **Feedback:** http://127.0.0.1:3000/feedback
- **Chat:** http://127.0.0.1:3000/tooloo-chat
- **Capabilities:** http://127.0.0.1:3000/capabilities-dashboard

### Legal
- **Beta Disclaimer:** http://127.0.0.1:3000/BETA-DISCLAIMER.html
- **Privacy Policy:** http://127.0.0.1:3000/PRIVACY-POLICY.html
- **Terms of Service:** http://127.0.0.1:3000/TERMS-OF-SERVICE.html

### Admin/Monitoring
- **Advanced Control Room:** http://127.0.0.1:3000/control-room/advanced
- **System Status:** http://127.0.0.1:3000/system/status
- **Feedback Logs:** `ls -la /workspaces/TooLoo.ai/feedback-logs/`
- **Referral Data:** `cat /workspaces/TooLoo.ai/.data/referrals.json`

---

## 🛠️ COMMAND QUICK REFERENCE

### Start System
```bash
cd /workspaces/TooLoo.ai
npm run dev
# Wait 15-20 seconds for startup
```

### Stop System
```bash
npm run stop:all
# OR
pkill -f 'node servers'
```

### Health Checks (Run 4x Daily)
```bash
bash /tmp/daily-monitor.sh
# Logs to: /tmp/canary-monitoring-log.txt
```

### Emergency Response
```bash
bash /tmp/canary-runbook.sh help       # Show all options
bash /tmp/canary-runbook.sh status     # Check status
bash /tmp/canary-runbook.sh restart    # Restart services
bash /tmp/canary-runbook.sh incident "Description of issue"
```

### View Logs
```bash
# Web server
tail -f /tmp/tooloo-web.log

# Orchestrator
tail -f /tmp/tooloo-orch.log

# Health check history
cat /tmp/canary-monitoring-log.txt
```

---

## 📊 MONITORING SCHEDULE

| Time | Action | Command |
|------|--------|---------|
| 9:00 AM | Health check | `bash /tmp/daily-monitor.sh` |
| 1:00 PM | Health check | `bash /tmp/daily-monitor.sh` |
| 5:00 PM | Health check | `bash /tmp/daily-monitor.sh` |
| 9:00 PM | Health check | `bash /tmp/daily-monitor.sh` |

**Weekly Briefing:** Friday, 10 AM  
**Template:** `/tmp/weekly-briefing-template.md`

---

## 📈 SUCCESS METRICS (Track Daily)

| Metric | Week 1 Target | How to Check |
|--------|--------------|--------------|
| New Users | 400-500 | Watch dashboard + logs |
| Active Users | 150-200 | Referral page stats |
| Feedback Submissions | 10+ | `ls feedback-logs/ \| wc -l` |
| Referral Codes | 30-50 | `cat .data/referrals.json \| grep code` |
| Error Rate | <0.1% | Health check logs |
| Uptime | >99.5% | Health check logs |

---

## 🎯 LAUNCH DAY CHECKLIST (Oct 21)

### 8:00 AM (Pre-Launch)
- [ ] Run health check: `bash /tmp/daily-monitor.sh`
- [ ] Verify all URLs load correctly
- [ ] Check disk space: `df -h`
- [ ] Review system status: `curl -s http://127.0.0.1:3000/system/status | jq`

### 9:00 AM (Launch Hour)
- [ ] Health check #1
- [ ] Post to Hacker News (launch post)
- [ ] Monitor feedback submissions
- [ ] Watch logs for errors

### 1:00 PM (Mid-Day)
- [ ] Health check #2
- [ ] Check new user count
- [ ] Respond to feedback
- [ ] Monitor referral activations

### 5:00 PM (Afternoon)
- [ ] Health check #3
- [ ] Review error rate
- [ ] Update team on signups
- [ ] Plan Week 1 actions

### 9:00 PM (Evening)
- [ ] Health check #4
- [ ] Day 1 summary
- [ ] Verify overnight backup
- [ ] Plan next morning actions

---

## 🚨 INCIDENT RESPONSE QUICK LINKS

**If Tool is Down:**
1. Check status: `bash /tmp/canary-runbook.sh status`
2. Run diagnostics: `bash /tmp/canary-runbook.sh full-check`
3. Restart services: `bash /tmp/canary-runbook.sh restart`
4. Log incident: `bash /tmp/canary-runbook.sh incident "description"`

**If Error Rate Spikes:**
1. Check errors: `bash /tmp/canary-runbook.sh error-rate`
2. View web logs: `tail -20 /tmp/tooloo-web.log`
3. Check provider status: `bash /tmp/canary-runbook.sh providers`

**If API Slow:**
1. Monitor: `bash /tmp/daily-monitor.sh`
2. Check services: `curl -s http://127.0.0.1:3000/system/status`
3. Restart if needed: `bash /tmp/canary-runbook.sh restart`

---

## 📋 FILES TO KNOW

| File | Purpose | Location |
|------|---------|----------|
| Health Log | Daily monitoring history | `/tmp/canary-monitoring-log.txt` |
| Feedback Logs | User feedback submissions | `/workspaces/TooLoo.ai/feedback-logs/` |
| Referral Data | Referral codes & tracking | `/workspaces/TooLoo.ai/.data/referrals.json` |
| Web Logs | Server logs | `/tmp/tooloo-web.log` |
| Orchestrator Logs | Service orchestration logs | `/tmp/tooloo-orch.log` |

---

## 💡 MARKETING LAUNCH POSTS (Ready to Send)

### Hacker News
```
Title: TooLoo.ai – Analyze conversation patterns with AI (YC-adjacent)
URL: http://127.0.0.1:3000/
Text: Show HN: Built a free tool that analyzes conversations to extract 
thinking frameworks & patterns. Uses Claude + OpenAI. Early beta, would 
love feedback from the community.
```

### Twitter/X (Thread)
```
1/ Just launched TooLoo.ai – a free tool that analyzes conversation patterns 
to extract how people think through problems. Upload any conversation, get 
instant insights into reasoning frameworks.

2/ Why this matters: Understanding thinking patterns is hard. ChatGPT helps 
but you need the right prompts. TooLoo is purpose-built for this. Works with 
any conversation type.

3/ Try it free: [URL]. It's early beta but fully functional. Feedback welcome!
```

### Reddit (r/MachineLearning, r/learnprogramming, etc.)
```
Title: Built a free tool to analyze how people think through conversations
Text: Hey r/MachineLearning! I built TooLoo.ai – a free tool that analyzes 
conversation patterns using Claude/GPT. You upload a conversation and get 
insights into thinking frameworks.

Would love feedback from this community. Early beta, totally free. 
Link: [URL]
```

---

## 🎯 WEEK 1 GROWTH TARGETS

- **Day 1-2:** 100-200 users (Hacker News + Reddit)
- **Day 3-4:** 200-300 users (Twitter + Reddit growth)
- **Day 5-7:** 400-500 users (organic + referrals starting)
- **Week 1 Goal:** 500 users minimum, 50+ pieces of feedback

---

## ✅ SYSTEM STATUS

**Last Health Check:** Oct 19, 06:00 UTC
- ✅ Services: 10/10 healthy
- ✅ Web Server: Healthy
- ✅ API Endpoints: Healthy
- ✅ Providers: Healthy
- ⚠️ Disk: 93% (cleanup before launch if possible)

**Ready for Launch:** YES ✅

---

## 📞 SUPPORT DURING BETA

**For Technical Issues:**
- Check: `/tmp/canary-runbook.sh status`
- Restart: `/tmp/canary-runbook.sh restart`
- Emergency kill: `/tmp/canary-runbook.sh kill-all`

**For User Feedback:**
- View: `ls /workspaces/TooLoo.ai/feedback-logs/`
- Respond: Email directly (they provide contact info)

**For Incidents:**
- Log it: `bash /tmp/canary-runbook.sh incident "..."`
- Review: `cat /tmp/incident-*.log`

---

**Good luck with launch! You're ready. 🚀**
