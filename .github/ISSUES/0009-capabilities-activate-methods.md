Title: High – Capabilities Server must activate all 62 discovered methods

Description:
The Capabilities Server (`servers/capabilities-server.js`) lists 62 core methods but many are not fully wired or tested. Additionally, the autonomous capability evolution is not fully operational.

What's missing:
- 62 methods declared but not all have real implementations
- No true autonomous capability evolution
- No method performance metrics
- No recursive/hierarchical capability detection
- Several methods are stubs only

Requirements:
1. Implement all 62 core methods (or clearly mark as stubs)
2. Add performance telemetry per method
3. Wire capability evolution tracking
4. Implement method dependency detection
5. Create capability impact graphs
6. Add autonomous mode (can self-improve without user intervention)

Acceptance Criteria:
- [ ] All 62 methods callable (no "not implemented" errors)
- [ ] At least 50 methods have real implementations (> 80% coverage)
- [ ] Telemetry shows success/failure/latency for each method
- [ ] Capability dependency graph generated
- [ ] Evolution tracking records improvements
- [ ] Autonomous mode runs without user prompts
- [ ] Capability impact > 20% improvement (measurable)

Effort: 3 hours  
Priority: P1 (High – core system capability)  
Labels: high, backend, capabilities, evolution

Files affected:
- `servers/capabilities-server.js`
- Related methods in agent codebase

Test command (after fix):
```bash
# List all capabilities
curl http://127.0.0.1:3009/api/v1/capabilities/discovered

# Activate specific methods
curl -X POST http://127.0.0.1:3009/api/v1/capabilities/activate \
  -H 'Content-Type: application/json' \
  -d '{"methods":["analyzeUserBehavior","suggestBasedOnSkills"]}'

# Get status
curl http://127.0.0.1:3009/api/v1/capabilities/status
```

Expected: All methods activated and responding without errors
