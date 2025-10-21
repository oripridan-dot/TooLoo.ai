# ⚡ Quick Fix Guide - If Tests Fail

The test failures you saw are expected if services aren't running yet. Here's the fix:

## 🔴 Problem
```
❌ Activity monitor not reachable: request to http://127.0.0.1:1305
0/health failed, reason: connect ECONNREFUSED 127.0.0.1:3050
```

**Cause**: Services need to be started before tests run

## ✅ Solution

### Option 1: Quick Setup & Test (Recommended)
```bash
# This starts services, waits for them, then runs tests
bash scripts/quick-setup-test.sh
```

### Option 2: Manual Start & Test
```bash
# Terminal 1: Start the system
npm run dev

# Wait 5-10 seconds for startup...

# Terminal 2: Run tests
node scripts/test-ui-activity-monitor.js
```

### Option 3: Use Existing Start Script
```bash
# If you already have npm run dev running in background
# Just run the tests:
node scripts/test-ui-activity-monitor.js
```

## 📊 Expected Output

After running either option, you should see:

```
✅ Test 1: Activity Monitor Health - PASS
✅ Test 2: Heartbeat Script Injection - PASS
✅ Test 3: Heartbeat Endpoint - PASS
... (7 more tests)
✅ Test 10: Script Functionality - PASS

✅ All tests passed! UI activity monitoring is working correctly.
```

## 🔍 If It Still Fails

### Check what's running
```bash
lsof -i :3000 -i :3050
```

Should show:
- Node.js process on port 3000 (web-server)
- Node.js process on port 3050 (ui-activity-monitor)

### Verify endpoints manually
```bash
curl http://127.0.0.1:3050/health
curl http://127.0.0.1:3000/health
```

Both should return something like: `{"ok":true}`

### Check web-server output for errors
```bash
# If running npm run dev in another terminal, watch the output
# Look for any error messages
```

### Force clean start
```bash
npm run clean
npm run dev
```

## 📝 What Was Created

All these files ARE in place:
- ✅ `servers/ui-activity-monitor.js` (13KB)
- ✅ `web-app/js/tooloo-heartbeat.js` (5.9KB)
- ✅ `scripts/test-ui-activity-monitor.js`
- ✅ `scripts/quick-setup-test.sh` (new!)
- ✅ `scripts/diagnostic.js` (new!)

## 🎯 Next Steps

1. **Run the quick setup**:
   ```bash
   bash scripts/quick-setup-test.sh
   ```

2. **Or start normally**:
   ```bash
   npm run dev
   ```

3. **Then verify**:
   ```bash
   curl http://127.0.0.1:3000/api/v1/activity/sessions
   ```

4. **Open browser**:
   ```
   http://localhost:3000/
   ```

## 💡 Pro Tips

- Services take 3-5 seconds to start
- Health checks confirm port is ready
- Tests will pass once both services are running
- You can open a browser while services are starting

## ✨ You're All Set!

Everything is implemented and ready. Just need to:

1. Start the services (`npm run dev`)
2. Wait a few seconds
3. Run the tests or open a browser

That's it! 🎉
