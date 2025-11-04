# Unimplemented Features Scan – TooLoo.ai
**Generated:** November 4, 2025  
**Scope:** Full codebase filesystem scan for TODO, FIXME, stubs, and incomplete implementations

---

## 🔴 Critical Unimplemented Features

### 1. **Provider Support – Not Yet Implemented**
**File:** `simple-api-server.js` (Line 1432)
```javascript
throw new Error(`Provider ${providerName} not implemented yet`);
```
**Status:** ERROR PATH  
**Impact:** Any unknown provider passed to the API will throw a hard error instead of gracefully handling.  
**Risk:** HIGH – Production blocker if new providers are added without implementation.

**Related Files:**
- `simple-api-server.js` – Provider routing logic
- Port 3003 (budget-server) – Provider status management

---

## 🟡 Medium-Priority Stubs & Placeholders

### 2. **Fact-Checking Module**
**File:** `lib/domains/research-module.js` (Line 86)
```javascript
factCheck(claim) {
  // Stub: would connect to fact-checking API
  return { claim, verified: 'pending', confidence: 0.5 };
}
```
**Status:** STUB  
**Impact:** Research module always returns `pending` verification status.  
**TODO:** Connect to external fact-checking API (e.g., Google Fact Check API, ClaimBuster).

---

### 3. **Email Adapter – Production Integration Missing**
**File:** `lib/adapters/email-adapter.js` (Line 17)
```javascript
// Stub: In production would use nodemailer or SendGrid
return {
  ok: true,
  messageId: `msg-${Date.now()}`,
  to,
  subject,
  timestamp: new Date().toISOString()
};
```
**Status:** STUB (Mock Implementation)  
**Impact:** Emails are never actually sent; only simulated returns.  
**TODO:** Implement nodemailer or SendGrid integration for production email delivery.

---

### 4. **Code Execution Sandbox – Disabled for Safety**
**File:** `lib/domains/coding-module.js` (Line 81)
```javascript
output: '[Sandbox execution - code execution disabled for safety]\nCode would execute here.',
```
**Status:** DISABLED  
**Impact:** Code suggestions cannot be validated by execution; only returned as text.  
**Security:** Intentional – prevents arbitrary code execution.  
**TODO:** Evaluate sandboxed execution environment (e.g., vm2, isolated-vm, or Docker container).

---

## 🟢 Low-Priority / Design-Related

### 5. **Provider-Aware Burst Cache – Placeholder Demo**
**File:** `web-app/control-room-redesigned.html` (Line 1103)
```javascript
// Provider‑aware burst (placeholder demo)
```
**Status:** COMMENT  
**Impact:** Burst caching logic may not be fully provider-specific.  
**Severity:** LOW – Likely functional but marked as incomplete in UI layer.

---

### 6. **Placeholder Results in UI**
**File:** `IMPLEMENTATION-UI-ACTIVE-SERVERS.md` (Line 331)
```
❌ Placeholder results
```
**Status:** DOCUMENTATION FLAG  
**Impact:** Some UI screens may render mock/placeholder data instead of live data.

---

## 📊 Feature Implementation Summary

| Feature | File | Status | Impact | Priority |
|---------|------|--------|--------|----------|
| Provider routing | `simple-api-server.js:1432` | ERROR | Crashes on unknown provider | 🔴 HIGH |
| Fact-checking | `lib/domains/research-module.js:86` | STUB | Always returns "pending" | 🟡 MEDIUM |
| Email delivery | `lib/adapters/email-adapter.js:17` | MOCK | No actual emails sent | 🟡 MEDIUM |
| Code execution | `lib/domains/coding-module.js:81` | DISABLED | Text-only suggestions | 🟢 LOW |
| Burst caching | `web-app/control-room-redesigned.html:1103` | COMMENT | May lack provider specificity | 🟢 LOW |

---

## 🎯 Recommended Actions

### Immediate (Next Sprint)
1. **Provider Router Enhancement**
   - Add default fallback handler for unknown providers
   - Document supported provider list
   - Add validation in orchestrator

2. **Email Adapter Production**
   - Set up SendGrid or Mailgun account
   - Implement async email queue
   - Add retry logic and error handling

### Follow-up (Current Quarter)
3. **Fact-Checking Integration**
   - Evaluate Google Fact Check API, ClaimBuster, or Perplexity Integration
   - Cache verified claims to reduce API calls
   - Add confidence scoring

4. **Code Sandbox Evaluation**
   - Test vm2, isolated-vm, or Deno runtime
   - Implement timeout and resource limits
   - Document security model

### Nice-to-Have
5. **UI Placeholder Cleanup**
   - Audit all placeholder results in dashboards
   - Replace with live data sources
   - Update `IMPLEMENTATION-UI-ACTIVE-SERVERS.md`

---

## 📂 Files to Review

**Core Implementation:**
- `simple-api-server.js` – Provider routing
- `servers/orchestrator.js` – System coordination
- `lib/domains/` – Domain-specific modules
- `lib/adapters/` – External integrations

**UI/Web App:**
- `web-app/control-room-redesigned.html` – Burst cache UI
- `web-app/provider-performance-dashboard.html` – Dashboard placeholders

---

## ✅ Next Steps

1. Triage critical provider router issue
2. Create feature branch for email adapter production implementation
3. File issues for fact-checking and sandbox evaluation
4. Update documentation with implementation roadmap

