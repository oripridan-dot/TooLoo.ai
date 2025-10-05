# TooLoo.ai Architecture Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Patterns](#architecture-patterns)
3. [Component Diagram](#component-diagram)
4. [Data Flow](#data-flow)
5. [Technology Stack](#technology-stack)
6. [Design Decisions](#design-decisions)
7. [Deployment Architecture](#deployment-architecture)

---

## System Overview

TooLoo.ai is a **self-aware AI agent platform** that provides:
- Multi-provider AI orchestration (OpenAI, Anthropic, Gemini, Groq, Ollama)
- Real-time conversational interface via WebSocket
- Self-improvement capabilities through code introspection and modification
- Learning intelligence with pattern tracking and decision logging

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Web App    │  │  Mobile App  │  │     CLI      │     │
│  │   (React)    │  │   (Future)   │  │   (Future)   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                          │
                 ┌────────▼────────┐
                 │   API Gateway   │
                 │  (Express.js)   │
                 └────────┬────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼────────┐ ┌─────▼──────┐ ┌───────▼────────┐
│ Provider       │ │  Self-     │ │   Learning     │
│ Service        │ │  Awareness │ │   Intelligence │
│                │ │  Manager   │ │                │
└───────┬────────┘ └─────┬──────┘ └───────┬────────┘
        │                │                 │
        └────────────────┼─────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                  │
  ┌─────▼──────┐                  ┌───────▼────────┐
  │ AI         │                  │  Filesystem    │
  │ Providers  │                  │  & Storage     │
  └────────────┘                  └────────────────┘
```

---

## Architecture Patterns

### 1. Layered Architecture

```
┌─────────────────────────────────────────┐
│        Presentation Layer               │  ← React UI, WebSocket clients
├─────────────────────────────────────────┤
│        API Layer (Routes)               │  ← Express routes, validation
├─────────────────────────────────────────┤
│        Business Logic Layer             │  ← Services, managers
├─────────────────────────────────────────┤
│        Data Access Layer                │  ← Filesystem, databases
├─────────────────────────────────────────┤
│        External Services Layer          │  ← AI providers, webhooks
└─────────────────────────────────────────┘
```

### 2. Service-Oriented Architecture

Each major capability is encapsulated in a service:

- **ProviderService**: AI provider orchestration and failover
- **SelfAwarenessManager**: Code introspection and modification
- **LearningService**: Pattern tracking and decision logging
- **HealthCheckService**: System monitoring and diagnostics

### 3. Event-Driven Communication

```javascript
// Services emit events for loose coupling
providerService.on('provider:failed', ({ provider, error }) => {
  logger.error(`Provider ${provider} failed: ${error}`);
  notificationService.alert('provider_failure', { provider });
});

providerService.on('chat:success', ({ provider, duration }) => {
  metricsService.record('chat_latency', duration, { provider });
});
```

---

## Component Diagram

### Core Components

```
┌────────────────────────────────────────────────────────────┐
│                    simple-api-server.js                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    Route Layer                        │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐ │  │
│  │  │  Chat   │  │Learning │  │  File   │  │ Health │ │  │
│  │  │ Routes  │  │ Routes  │  │ Routes  │  │ Routes │ │  │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └───┬────┘ │  │
│  └───────┼────────────┼────────────┼───────────┼──────┘  │
│          │            │            │           │          │
│  ┌───────▼────────────▼────────────▼───────────▼──────┐  │
│  │              Service Layer                          │  │
│  │  ┌───────────┐  ┌──────────┐  ┌────────────────┐  │  │
│  │  │ Provider  │  │ Learning │  │ Self-Awareness │  │  │
│  │  │ Service   │  │ Service  │  │    Manager     │  │  │
│  │  └─────┬─────┘  └────┬─────┘  └────────┬───────┘  │  │
│  └────────┼─────────────┼─────────────────┼──────────┘  │
│           │             │                  │              │
│  ┌────────▼─────────────▼──────────────────▼──────────┐  │
│  │            Middleware & Utils                       │  │
│  │  ┌──────────┐  ┌────────┐  ┌───────────────────┐  │  │
│  │  │  Error   │  │ Logger │  │    Validation     │  │  │
│  │  │ Handler  │  │        │  │                   │  │  │
│  │  └──────────┘  └────────┘  └───────────────────┘  │  │
│  └─────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### Frontend Architecture

```
web-app/
├── src/
│   ├── components/
│   │   ├── Chat.jsx              ← Main chat interface
│   │   ├── Layout.jsx            ← App layout & navigation
│   │   ├── SelfImprovementDashboard.jsx
│   │   └── UICustomizer.jsx
│   ├── services/
│   │   ├── socket.js             ← WebSocket connection
│   │   └── api.js                ← HTTP client
│   ├── hooks/
│   │   ├── useChat.js
│   │   └── useWebSocket.js
│   └── utils/
│       ├── markdown.js
│       └── formatters.js
```

---

## Data Flow

### Chat Request Flow

```
1. User sends message
   ↓
2. Frontend: Chat.jsx → socket.emit('chat', message)
   ↓
3. Backend: Socket handler receives message
   ↓
4. Backend: ProviderService.chat(messages, options)
   ↓
5. Backend: Select provider (with failover)
   ↓
6. Backend: Call AI provider API
   ↓
7. Backend: Stream response via socket.emit('stream', chunk)
   ↓
8. Frontend: Receive chunks, update UI
   ↓
9. Backend: Log interaction, update learning data
   ↓
10. Frontend: Display complete response
```

### Self-Modification Flow

```
1. AI decides to modify code
   ↓
2. SelfAwarenessManager.modifyFile(path, changes)
   ↓
3. Create backup of current file
   ↓
4. Apply changes to file
   ↓
5. Log modification in change history
   ↓
6. Notify EnvironmentHub of changes
   ↓
7. Update component registry
   ↓
8. Emit 'self-modified' event
   ↓
9. Optional: Reload affected modules
```

---

## Technology Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **WebSocket**: Socket.IO
- **Logging**: Pino
- **Testing**: Vitest, Supertest
- **AI SDKs**: OpenAI, Anthropic, Google Generative AI, Groq

### Frontend
- **Framework**: React 18+
- **Build Tool**: Vite
- **UI Library**: Tailwind CSS
- **State Management**: React Hooks
- **Markdown**: react-markdown
- **Code Highlighting**: react-syntax-highlighter

### DevOps
- **CI/CD**: GitHub Actions
- **Container**: Docker (via Codespaces)
- **Version Control**: Git
- **Package Manager**: npm

---

## Design Decisions

### ADR-001: Why Monolithic simple-api-server.js?

**Context**: Initial implementation combined all logic in one file.

**Decision**: Keep monolithic structure initially, then refactor incrementally.

**Rationale**:
- Faster initial development
- Easier debugging during prototype phase
- Lower cognitive overhead for solo development

**Consequences**:
- Technical debt accumulated
- Harder to test in isolation
- Refactoring now prioritized

**Status**: ✅ Accepted → 🔄 Evolving to modular structure

---

### ADR-002: Multi-Provider Strategy

**Context**: Need resilience against single provider failures.

**Decision**: Implement automatic failover between providers.

**Rationale**:
- Provider outages are common
- Rate limits can be hit unexpectedly
- Different providers excel at different tasks

**Consequences**:
- Increased complexity in provider management
- Need to normalize responses across providers
- Better uptime and reliability

**Status**: ✅ Implemented

---

### ADR-003: Self-Modification Without Sandboxing

**Context**: AI agent needs to modify its own code.

**Decision**: Allow direct filesystem access initially.

**Rationale**:
- Faster iteration during development
- Simpler implementation
- Trust-based model for MVP

**Consequences**:
- ⚠️ Security risk in production
- Need to add sandboxing before public release
- Backup system critical

**Status**: ⚠️ Accepted with caveats → 🔜 Sandboxing planned

---

### ADR-004: WebSocket for Real-Time Communication

**Context**: Need streaming responses from AI providers.

**Decision**: Use Socket.IO for bidirectional communication.

**Rationale**:
- Native support for streaming
- Automatic reconnection
- Fallback to long-polling

**Consequences**:
- More complex than REST
- Need to manage connection state
- Better user experience

**Status**: ✅ Implemented

---

## Deployment Architecture

### Development Environment

```
┌──────────────────────────────────────┐
│      GitHub Codespaces               │
│  ┌────────────────────────────────┐  │
│  │   VS Code + Claude Plugin      │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │   Dev Server (Port 3001)       │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │   Frontend Dev (Port 5173)     │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

### Production Environment (Planned)

```
┌─────────────────────────────────────────────┐
│              Load Balancer                   │
└────────────┬────────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼───────┐   ┌────▼────────┐
│ Instance  │   │  Instance   │
│  Node 1   │   │   Node 2    │
└───┬───────┘   └────┬────────┘
    │                │
    └────────┬───────┘
             │
    ┌────────▼──────────┐
    │   Shared Storage  │
    │   (S3/NFS)        │
    └───────────────────┘
```

---

## Security Considerations

### Current Risks
1. ⚠️ **Self-modification without sandboxing**
2. ⚠️ **API keys in environment variables**
3. ⚠️ **No rate limiting on expensive operations**
4. ⚠️ **File operations lack permission checks**

### Mitigation Plan
1. Implement VM2 sandboxing for self-modifications
2. Migrate to secrets management (AWS Secrets Manager, HashiCorp Vault)
3. Add express-rate-limit middleware
4. Implement filesystem permission layer

---

## Performance Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| API Response Time (p95) | < 2000ms | TBD | 🔄 |
| Chat Latency (p95) | < 3000ms | TBD | 🔄 |
| Uptime | 99.9% | TBD | 🔄 |
| Error Rate | < 1% | TBD | 🔄 |
| Test Coverage | > 80% | 0% | 🚨 |

---

## Future Enhancements

### Phase 2 (Next 3 months)
- [ ] Complete backend modularization
- [ ] Achieve 80% test coverage
- [ ] Implement transactional self-modification
- [ ] Add comprehensive monitoring

### Phase 3 (3-6 months)
- [ ] Multi-instance support
- [ ] Plugin system for community extensions
- [ ] Advanced learning capabilities
- [ ] Production deployment

### Phase 4 (6-12 months)
- [ ] ML-driven optimization
- [ ] Distributed architecture
- [ ] Mobile applications
- [ ] Enterprise features

---

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for:
- Development setup
- Coding standards
- Pull request process
- Architecture change proposals

---

## References

- [Express.js Documentation](https://expressjs.com/)
- [Socket.IO Documentation](https://socket.io/docs/)
- [React Documentation](https://react.dev/)
- [Anthropic API Documentation](https://docs.anthropic.com/)
- [OpenAI API Documentation](https://platform.openai.com/docs/)

---

**Last Updated**: October 2025  
**Maintained By**: TooLoo.ai Development Team
