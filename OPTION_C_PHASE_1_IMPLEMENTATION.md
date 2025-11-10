# Option C - Phase 1: Event Bus & Web Gateway Implementation

**Timeline:** Week 1 (Days 1-5)  
**Objective:** Foundation layer for new architecture  
**Status:** Ready to implement  

---

## Day 1-2: Event Bus Implementation

### Task: Create `lib/event-bus.js`

**Location:** `/workspaces/TooLoo.ai/lib/event-bus.js`

**Features:**
- SQLite WAL-backed event store
- Event emission
- Event subscription / consumer pattern
- Event replay capability
- Deduplication

**Pseudo-code structure:**

```javascript
class EventBus {
  constructor(dbPath) {
    // Initialize SQLite with WAL mode
    // Create events table
    // Create consumers table (for tracking processed events)
  }

  async emit(event) {
    // Validate event schema
    // Check deduplication
    // Write to SQLite
    // Notify subscribers
    // Return event ID
  }

  subscribe(serviceName, eventTypes, callback) {
    // Register consumer
    // Provide events since last checkpoint
    // Call callback with each new event
  }

  async getEventsSince(lastEventId) {
    // Query SQLite for events after lastEventId
    // Return in order
  }

  async replay(fromEventId) {
    // Replay all events from given point
    // Used for service recovery
  }

  async getAllEvents(filter) {
    // Query events by service, type, timestamp
    // Used for auditing & debugging
  }
}
```

**Test file:** `/workspaces/TooLoo.ai/tests/unit/event-bus.test.js`

**Success criteria:**
- ✅ Can emit events
- ✅ Events persisted to SQLite
- ✅ Subscribers notified of new events
- ✅ Events retrievable by query
- ✅ Deduplication works (same event ID not emitted twice)

---

### Task: Create `lib/event-schema.js`

**Location:** `/workspaces/TooLoo.ai/lib/event-schema.js`

**Features:**
- Define valid event types
- Validate event structure
- Generate event IDs
- Extract metadata

**Pseudo-code structure:**

```javascript
const EVENT_TYPES = {
  'training.started': { /* schema */ },
  'training.paused': { /* schema */ },
  'mastery.improved': { /* schema */ },
  'provider.selected': { /* schema */ },
  'intent.created': { /* schema */ },
  // ... etc
};

function validateEvent(event) {
  // Check required fields
  // Validate data against schema
  // Throw on invalid
}

function createEvent(type, aggregateId, data) {
  // Create event object
  // Generate unique ID
  // Add timestamp
  // Add metadata
  return event;
}

function getEventSchema(type) {
  // Return schema for event type
}

module.exports = { validateEvent, createEvent, getEventSchema, EVENT_TYPES };
```

**Test file:** `/workspaces/TooLoo.ai/tests/unit/event-schema.test.js`

**Success criteria:**
- ✅ All event types defined
- ✅ Validation catches invalid events
- ✅ Valid events pass validation
- ✅ Event IDs are unique

---

## Day 3-4: Web Gateway Implementation

### Task: Create `services/web-gateway.js`

**Location:** `/workspaces/TooLoo.ai/servers/web-gateway.js`

**Features:**
- Static file serving
- Request routing to backend services
- Response caching
- Health check aggregation
- Minimal code (under 300 lines)

**Pseudo-code structure:**

```javascript
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.WEB_PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Static files
app.use(express.static(path.join(__dirname, '../web-app')));

// Service routes (proxy to backend)
const services = {
  training: { port: 3001, prefixes: ['/api/v1/training'] },
  provider: { port: 3200, prefixes: ['/api/v1/providers', '/api/v1/budget'] },
  orchestration: { port: 3100, prefixes: ['/api/v1/intent', '/api/v1/dag'] },
  analytics: { port: 3300, prefixes: ['/api/v1/analytics'] },
  integration: { port: 3400, prefixes: ['/api/v1/oauth', '/api/v1/github'] },
  context: { port: 3020, prefixes: ['/api/v1/context'] },
  product: { port: 3006, prefixes: ['/api/v1/workflows', '/api/v1/artifacts'] },
  design: { port: 3014, prefixes: ['/api/v1/design'] },
};

// Route requests to appropriate service
app.use((req, res, next) => {
  for (const [name, config] of Object.entries(services)) {
    if (config.prefixes.some(p => req.path.startsWith(p))) {
      // Proxy to service
      const target = `http://127.0.0.1:${config.port}`;
      const url = `${target}${req.path}`;
      
      fetch(url, {
        method: req.method,
        headers: req.headers,
        body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
      })
        .then(r => r.json())
        .then(data => res.json(data))
        .catch(err => res.status(500).json({ error: err.message }));
      return;
    }
  }
  next();
});

// Health aggregation
app.get('/api/v1/health', async (req, res) => {
  const health = {};
  for (const [name, config] of Object.entries(services)) {
    try {
      const r = await fetch(`http://127.0.0.1:${config.port}/health`, { timeout: 1000 });
      health[name] = r.ok ? 'up' : 'down';
    } catch {
      health[name] = 'down';
    }
  }
  const allUp = Object.values(health).every(s => s === 'up');
  res.status(allUp ? 200 : 503).json({ ok: allUp, services: health });
});

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../web-app/index.html'));
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`✅ Web Gateway listening on port ${PORT}`);
});
```

**Test file:** `/workspaces/TooLoo.ai/tests/integration/web-gateway.test.js`

**Success criteria:**
- ✅ Serves static files
- ✅ Routes /api/v1/training to port 3001
- ✅ Routes /api/v1/providers to port 3200
- ✅ Health endpoint aggregates all services
- ✅ Responds with 503 if any service is down

---

## Day 5: Integration Testing

### Task: Create end-to-end test

**Location:** `/workspaces/TooLoo.ai/tests/integration/phase-1-e2e.test.js`

**Test cases:**

```javascript
describe('Phase 1: Event Bus + Web Gateway', () => {
  
  test('Event bus stores and retrieves event', async () => {
    const event = createEvent('training.started', 'user_1', {
      camp_id: 'dsa',
      topic: 'arrays'
    });
    
    const id = await eventBus.emit(event);
    expect(id).toBeDefined();
    
    const retrieved = await eventBus.getEventById(id);
    expect(retrieved.data.topic).toBe('arrays');
  });

  test('Event deduplication prevents duplicates', async () => {
    const event = createEvent('training.started', 'user_1', {});
    
    await eventBus.emit(event);
    await eventBus.emit(event); // Same event again
    
    const all = await eventBus.getAllEvents();
    const trainingStarted = all.filter(e => e.type === 'training.started');
    expect(trainingStarted.length).toBe(1); // Only one stored
  });

  test('Subscriber receives new events', async () => {
    const events = [];
    eventBus.subscribe('test-service', ['training.started'], (event) => {
      events.push(event);
    });
    
    await eventBus.emit(createEvent('training.started', 'user_1', {}));
    
    // Give subscriber time to process
    await new Promise(r => setTimeout(r, 100));
    expect(events.length).toBe(1);
  });

  test('Web gateway routes to correct service', async () => {
    const response = await fetch('http://localhost:3000/api/v1/health');
    const data = await response.json();
    expect(data.ok).toBeDefined();
    expect(data.services).toBeDefined();
  });

  test('Web gateway serves static files', async () => {
    const response = await fetch('http://localhost:3000/');
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html.includes('<!DOCTYPE')).toBe(true);
  });
});
```

---

## Checklist: Phase 1 Complete

- [ ] **Event Bus**
  - [ ] Create `lib/event-bus.js`
  - [ ] Create `lib/event-schema.js`
  - [ ] Implement SQLite WAL storage
  - [ ] Implement event subscription
  - [ ] Implement deduplication
  - [ ] Write unit tests

- [ ] **Web Gateway**
  - [ ] Create `servers/web-gateway.js`
  - [ ] Implement routing to all services
  - [ ] Implement static file serving
  - [ ] Implement health aggregation
  - [ ] Write integration tests

- [ ] **Testing**
  - [ ] Run event-bus tests
  - [ ] Run web-gateway tests
  - [ ] Run e2e tests
  - [ ] Verify all pass

- [ ] **Documentation**
  - [ ] Document event types
  - [ ] Document service routing
  - [ ] Create troubleshooting guide

---

## How to Run Phase 1

```bash
# Start Event Bus
node lib/event-bus-server.js &

# Start Web Gateway
node servers/web-gateway.js &

# Run tests
npm run test:phase-1

# Check health
curl http://localhost:3000/api/v1/health
```

---

## Expected Output

```
✅ Event Bus listening on port 3099 (internal only)
✅ Web Gateway listening on port 3000
✅ Health check shows 8 services (0/8 up initially, will improve as we build)

{
  "ok": false,
  "services": {
    "training": "down",
    "provider": "down",
    "orchestration": "down",
    "analytics": "down",
    "integration": "down",
    "context": "down",
    "product": "down",
    "design": "down"
  }
}
```

---

## Gotchas & Solutions

| Issue | Solution |
|-------|----------|
| SQLite file locked | Use WAL mode (default) |
| Event dedup not working | Ensure event ID is consistent for same event |
| Subscriber not receiving events | Ensure service name matches subscription |
| Routes not proxying | Check port numbers in `services` config |
| Static files 404 | Verify web-app directory exists |

---

## What's Next

Once Phase 1 is complete:
- **Week 2:** Build Learning Service (consumes events, emits training.started)
- **Week 3:** Build Provider Service (selects providers, tracks cost)
- **Week 4:** Build Integration Service (GitHub OAuth, webhooks)

Each service will:
1. Subscribe to Event Bus for relevant events
2. Process them according to business logic
3. Emit new events for downstream services
4. Persist its own state (no shared DB)

---

**Ready to start Phase 1? Let's build! 🚀**

