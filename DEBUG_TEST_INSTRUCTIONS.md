# 🔍 **DEBUG INSTRUCTIONS** - Test Implementation Flow

## ✅ Server is Running with Full Logging

The API server is now running with detailed logging at every step. Here's what you need to do:

---

## 📋 Step-by-Step Testing

### 1. Open Two Terminal Windows

**Terminal 1 - Watch Logs:**
```bash
tail -f /workspaces/TooLoo.ai/logs/api-debug.log
```

**Terminal 2 - Or filter for important logs:**
```bash
tail -f /workspaces/TooLoo.ai/logs/api-debug.log | grep -E "(📨|🔍|✅|⚠️|❌|📞)"
```

### 2. Open the Web App

Navigate to: **http://localhost:5173**

### 3. Test the Flow

**Step 1:** Type this in chat:
```
make the text in the input box dark blue
```

**Watch the logs - You should see:**
```
📨 Received message from [socket-id]: "make the text in the input box dark blue"
🔍 generateResponse called:
   - Prompt: "make the text in the input box dark blue"
   - Is implement command: false
   - Provider: deepseek
📞 callDeepSeek called:
   - context.forceCodeGeneration: undefined
   - Using DISCUSSION mode prompt
✅ Generated response
   - Has code blocks: false
   - Saved files: 0
```

**Step 2:** TooLoo will respond with a visual description and ask "Should I implement this?"

**Step 3:** Type:
```
yes
```

**Watch the logs - You should see:**
```
📨 Received message from [socket-id]: "yes"
🔍 generateResponse called:
   - Prompt: "yes"
   - Is implement command: true
   ✅ IMPLEMENTATION MODE ACTIVATED
   - Replaced "yes" with implementation request
📞 callDeepSeek called:
   - context.forceCodeGeneration: true
   - Using IMPLEMENTATION mode prompt
🔍 handleCodeFileGeneration called:
   - shouldAutoSave: true
   - Has code blocks: true (hopefully!)
   - Found X code blocks
✅ Auto-saved: web-app/src/components/Chat.jsx
✅ Generated response
   - Saved files: 1
   - Should reload: true
```

---

## 🎯 What to Look For

### ✅ GOOD Signs:
- `context.forceCodeGeneration: true` appears
- `Using IMPLEMENTATION mode prompt` appears
- `Has code blocks: true`
- `Found X code blocks` where X > 0
- `Auto-saved: [filename]` appears
- `Should reload: true`

### ❌ BAD Signs (Problems):
- `context.forceCodeGeneration: undefined` when you say "yes"
- `Using DISCUSSION mode prompt` when you say "yes"
- `Has code blocks: false` in implementation mode
- `Found 0 code blocks`
- `No file path detected`
- `Could not determine filename`

---

## 🐛 Common Issues & Solutions

### Issue 1: forceCodeGeneration is undefined
**Diagnosis:** Context not being passed through
**Check:** Look for the log line showing context flags
**Fix:** Already implemented, should work now

### Issue 2: AI generates text but no code blocks
**Diagnosis:** AI ignoring the IMPLEMENTATION system prompt
**Possible causes:**
- DeepSeek API might have issues
- System prompt might be too long
- Need to be more explicit

**Solution:** Try using OpenAI instead:
```javascript
// In simple-api-server.js, change default provider
this.userPreferences.defaultProvider = 'openai';
```

### Issue 3: Code blocks found but no file path
**Diagnosis:** AI not following format instructions
**Solution:** The prompt explicitly asks for `// path/to/file.jsx` as first line
**Check logs for:** "No file path detected in first line"

### Issue 4: Files saved but page doesn't reload
**Diagnosis:** `shouldReload` not being set
**Check:** Look for `Should reload: true` in logs
**Verify:** `result.savedFiles.length > 0`

---

## 🧪 Manual Test (If Automated Fails)

If the flow still doesn't work, try this manual test:

```javascript
// In browser console:
const socket = io();

// Test 1: Discussion mode
socket.emit('generate', {
  prompt: 'change input text to dark blue',
  context: {}
});

// Wait for response, then test 2: Implementation mode
socket.emit('generate', {
  prompt: 'yes',
  context: {}
});

// Listen for response
socket.on('response', (data) => {
  console.log('=== RESPONSE ===');
  console.log('Content:', data.content);
  console.log('Saved files:', data.savedFiles);
  console.log('Should reload:', data.shouldReload);
});
```

---

## 📊 Expected Log Output (Success Case)

```
📨 Received message from xyz123: "make the text dark blue"
🔍 generateResponse called:
   - Prompt: "make the text dark blue"
   - Is implement command: false
   - Provider: deepseek
📞 callDeepSeek called:
   - sessionId: xyz123
   - context.forceCodeGeneration: undefined
   - prompt length: 26
   - history messages: 0
   - Using DISCUSSION mode prompt
✅ Generated response for xyz123
   - Provider: deepseek
   - Has code blocks: false
   - Saved files: 0
   - Should reload: false
   - Context implementMode: false
   - Context forceCodeGeneration: undefined

[User sees visual description and "Should I implement?"]

📨 Received message from xyz123: "yes"
🔍 generateResponse called:
   - Prompt: "yes"
   - Is implement command: true
   ✅ IMPLEMENTATION MODE ACTIVATED
   - Replaced "yes" with implementation request
   - Last AI message: "I'll make the text dark blue (#1e40af)..."
📞 callDeepSeek called:
   - sessionId: xyz123
   - context.forceCodeGeneration: true
   - prompt length: 250
   - history messages: 2
   - Using IMPLEMENTATION mode prompt
🔍 handleCodeFileGeneration called:
   - shouldAutoSave: true
   - Has code blocks: true
   - context.autoSaveFiles: true
   - context.implementMode: true
   - Found 1 code blocks
   - Block language: javascript, filename detected: web-app/src/components/Chat.jsx
   - Attempting to save: web-app/src/components/Chat.jsx
✅ Auto-saved: web-app/src/components/Chat.jsx
✅ Generated response for xyz123
   - Provider: deepseek
   - Has code blocks: true
   - Saved files: 1
   - Should reload: true
   - Context implementMode: true
   - Context forceCodeGeneration: true
```

---

## 🚀 Next Steps

1. **Start the log watcher** in a separate terminal
2. **Open the web app** at localhost:5173
3. **Follow the test flow** above
4. **Copy the logs** and send them to me
5. **We'll debug** based on what actually happens

The detailed logging will tell us EXACTLY where the flow breaks!

---

**Status:** ✅ Ready for testing with full debug logging
**Date:** October 4, 2025
