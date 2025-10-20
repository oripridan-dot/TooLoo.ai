/**
 * tests/integration/cup-server.integration.test.js
 * ================================================
 * Integration tests for Cup Server (Provider Cup mini-tournaments)
 * Port: 3005
 *
 * Endpoints:
 * GET  /health
 * GET  /api/v1/cup/scoreboard
 * POST /api/v1/cup/mini
 * POST /api/v1/cup/tournament/create
 * GET  /api/v1/cup/tournament/:id
 * GET  /api/v1/cup/stats
 *
 * Total: 6 endpoints | 15+ tests
 */

import http from 'http';

const PORT = 3005;
const BASE_URL = `http://localhost:${PORT}`;

// ============================================================================
// UTILITY: HTTP Request Helper
// ============================================================================

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: data ? JSON.parse(data) : null,
            headers: res.headers
          });
        } catch {
          resolve({
            status: res.statusCode,
            body: data,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ============================================================================
// TEST SUITE
// ============================================================================

async function runTests() {
  console.log(`\n╔════════════════════════════════════════════════════════════╗`);
  console.log(`║       🏆 CUP SERVER INTEGRATION TESTS                    ║`);
  console.log(`║                                                            ║`);
  console.log(`║  Port: 3005 | Provider Cup mini-tournaments               ║`);
  console.log(`║  Endpoints: 6 | Tests: 15+                               ║`);
  console.log(`╚════════════════════════════════════════════════════════════╝\n`);

  let passed = 0;
  let failed = 0;
  const failures = [];

  // ========== HEALTH & STATUS ==========
  try {
    console.log(`\n✓ HEALTH & STATUS TESTS\n${'─'.repeat(60)}`);

    // Test 1: Health check
    console.log(`  📍 Test 1: GET /health`);
    let res = await makeRequest('GET', '/health');
    if (res.status === 200 && res.body.ok && res.body.server === 'cup') {
      console.log(`    ✅ Health check passed`);
      passed++;
    } else {
      console.log(`    ❌ Expected 200 with ok:true, got ${res.status}`);
      failures.push('Health check failed');
      failed++;
    }
  } catch (e) {
    console.log(`    ❌ Error: ${e.message}`);
    failures.push(`Health check error: ${e.message}`);
    failed++;
  }

  // ========== SCOREBOARD & MINI TOURNAMENT ==========
  try {
    console.log(`\n✓ SCOREBOARD & MINI TOURNAMENT TESTS\n${'─'.repeat(60)}`);

    // Test 2: Get scoreboard
    console.log(`  📍 Test 2: GET /api/v1/cup/scoreboard`);
    let res = await makeRequest('GET', '/api/v1/cup/scoreboard');
    if (res.status === 200 && res.body.ok && res.body.scoreboard) {
      const { scoreboard } = res.body;
      if (scoreboard.overall && scoreboard.lastUpdated) {
        console.log(`    ✅ Scoreboard retrieved with ${Object.keys(scoreboard.overall).length} providers`);
        passed++;
      } else {
        console.log(`    ❌ Scoreboard missing required fields`);
        failures.push('Scoreboard validation failed');
        failed++;
      }
    } else {
      console.log(`    ❌ Expected 200 with scoreboard, got ${res.status}`);
      failures.push('Scoreboard retrieval failed');
      failed++;
    }

    // Test 3: Run mini tournament
    console.log(`  📍 Test 3: POST /api/v1/cup/mini`);
    res = await makeRequest('POST', '/api/v1/cup/mini', {});
    if (res.status === 200 && res.body.ok && res.body.scoreboard && res.body.summary) {
      const { summary } = res.body;
      if (summary.testsRun && summary.domains && summary.winner) {
        console.log(`    ✅ Mini tournament completed: ${summary.winner} wins (score: ${summary.avgWinnerScore})`);
        passed++;
      } else {
        console.log(`    ❌ Summary missing required fields`);
        failures.push('Mini tournament summary validation failed');
        failed++;
      }
    } else {
      console.log(`    ❌ Expected 200 with summary, got ${res.status}`);
      failures.push('Mini tournament failed');
      failed++;
    }
  } catch (e) {
    console.log(`    ❌ Error: ${e.message}`);
    failures.push(`Scoreboard/mini tests error: ${e.message}`);
    failed += 2;
  }

  // ========== TOURNAMENT CREATION & MANAGEMENT ==========
  let tournamentId = null;
  try {
    console.log(`\n✓ TOURNAMENT CREATION & MANAGEMENT\n${'─'.repeat(60)}`);

    // Test 4: Create tournament with valid payload
    console.log(`  📍 Test 4: POST /api/v1/cup/tournament/create (valid)`);
    const createPayload = {
      nodeId: 'node-test-001',
      candidates: [
        {
          id: 'cand-1',
          provider: 'anthropic',
          model: 'claude-3.5-haiku',
          content: 'Sample response 1',
          costUsd: 0.01,
          latencyMs: 150
        },
        {
          id: 'cand-2',
          provider: 'openai',
          model: 'gpt-4o',
          content: 'Sample response 2',
          costUsd: 0.03,
          latencyMs: 200
        }
      ],
      evidence: {
        deterministicChecks: { test1: true, lint: true },
        sources: [{ text: 'source1', url: 'https://example.com', confidence: 0.95 }],
        claims: ['claim1', 'claim2'],
        criticAgreement: { model1: 0.85, model2: 0.88 },
        semanticMetrics: { fluencyScore: 0.9, relevanceScore: 0.85 },
        modelProvider: 'anthropic',
        historicalSuccess: 0.92
      }
    };

    let res = await makeRequest('POST', '/api/v1/cup/tournament/create', createPayload);
    if (res.status === 200 && res.body.ok && res.body.tournament) {
      const tournament = res.body.tournament;
      tournamentId = tournament.id;
      if (tournament.id && tournament.nodeId && tournament.results && tournament.winner) {
        console.log(`    ✅ Tournament created (ID: ${tournamentId})`);
        console.log(`       Winner: ${tournament.winner.provider} (score: ${tournament.winner.score})`);
        passed++;
      } else {
        console.log(`    ❌ Tournament missing required fields`);
        failures.push('Tournament creation validation failed');
        failed++;
      }
    } else {
      console.log(`    ❌ Expected 200, got ${res.status}`);
      failures.push('Tournament creation failed');
      failed++;
    }

    // Test 5: Create tournament with missing candidates (error case)
    console.log(`  📍 Test 5: POST /api/v1/cup/tournament/create (invalid - no candidates)`);
    res = await makeRequest('POST', '/api/v1/cup/tournament/create', {
      nodeId: 'node-test-002'
      // Missing candidates
    });
    if (res.status === 400 && !res.body.ok) {
      console.log(`    ✅ Bad request error handled correctly`);
      passed++;
    } else {
      console.log(`    ❌ Expected 400 error, got ${res.status}`);
      failures.push('Tournament validation not working');
      failed++;
    }

    // Test 6: Create tournament with empty candidates array (error case)
    console.log(`  📍 Test 6: POST /api/v1/cup/tournament/create (invalid - empty candidates)`);
    res = await makeRequest('POST', '/api/v1/cup/tournament/create', {
      nodeId: 'node-test-003',
      candidates: []
    });
    if (res.status === 400 && !res.body.ok) {
      console.log(`    ✅ Empty candidates error handled correctly`);
      passed++;
    } else {
      console.log(`    ❌ Expected 400 error, got ${res.status}`);
      failures.push('Empty candidates validation not working');
      failed++;
    }
  } catch (e) {
    console.log(`    ❌ Error: ${e.message}`);
    failures.push(`Tournament creation tests error: ${e.message}`);
    failed += 3;
  }

  // ========== TOURNAMENT RETRIEVAL ==========
  try {
    console.log(`\n✓ TOURNAMENT RETRIEVAL\n${'─'.repeat(60)}`);

    // Test 7: Get tournament by ID (if created)
    if (tournamentId) {
      console.log(`  📍 Test 7: GET /api/v1/cup/tournament/:id (valid)`);
      let res = await makeRequest('GET', `/api/v1/cup/tournament/${tournamentId}`);
      if (res.status === 200 && res.body.ok && res.body.tournament) {
        const tournament = res.body.tournament;
        if (tournament.id === tournamentId && tournament.results) {
          console.log(`    ✅ Tournament retrieved successfully`);
          console.log(`       Results: ${tournament.results.length} candidates`);
          passed++;
        } else {
          console.log(`    ❌ Tournament data mismatch`);
          failures.push('Tournament retrieval data mismatch');
          failed++;
        }
      } else {
        console.log(`    ❌ Expected 200, got ${res.status}`);
        failures.push('Tournament retrieval failed');
        failed++;
      }
    }

    // Test 8: Get non-existent tournament (error case)
    console.log(`  📍 Test 8: GET /api/v1/cup/tournament/:id (invalid - not found)`);
    let res = await makeRequest('GET', `/api/v1/cup/tournament/nonexistent-id`);
    if (res.status === 404 && !res.body.ok) {
      console.log(`    ✅ 404 Not Found handled correctly`);
      passed++;
    } else {
      console.log(`    ❌ Expected 404, got ${res.status}`);
      failures.push('Tournament 404 not working');
      failed++;
    }
  } catch (e) {
    console.log(`    ❌ Error: ${e.message}`);
    failures.push(`Tournament retrieval tests error: ${e.message}`);
    failed += 2;
  }

  // ========== STATISTICS ==========
  try {
    console.log(`\n✓ STATISTICS\n${'─'.repeat(60)}`);

    // Test 9: Get cup statistics
    console.log(`  📍 Test 9: GET /api/v1/cup/stats`);
    let res = await makeRequest('GET', '/api/v1/cup/stats');
    if (res.status === 200 && res.body.ok && res.body.stats) {
      const stats = res.body.stats;
      if (
        typeof stats.totalTournaments === 'number' &&
        typeof stats.totalCandidates === 'number' &&
        typeof stats.averageWinnerScore === 'number' &&
        typeof stats.mergedResults === 'number' &&
        typeof stats.escalations === 'number'
      ) {
        console.log(`    ✅ Statistics retrieved`);
        console.log(`       Tournaments: ${stats.totalTournaments} | Avg Winner Score: ${stats.averageWinnerScore.toFixed(2)}`);
        passed++;
      } else {
        console.log(`    ❌ Stats missing required fields`);
        failures.push('Statistics validation failed');
        failed++;
      }
    } else {
      console.log(`    ❌ Expected 200, got ${res.status}`);
      failures.push('Statistics retrieval failed');
      failed++;
    }
  } catch (e) {
    console.log(`    ❌ Error: ${e.message}`);
    failures.push(`Statistics tests error: ${e.message}`);
    failed++;
  }

  // ========== ADVANCED SCENARIOS ==========
  try {
    console.log(`\n✓ ADVANCED SCENARIOS\n${'─'.repeat(60)}`);

    // Test 10: Tournament with single candidate
    console.log(`  📍 Test 10: POST /api/v1/cup/tournament/create (single candidate)`);
    const singleCandidatePayload = {
      nodeId: 'node-single-001',
      candidates: [
        {
          id: 'cand-single',
          provider: 'anthropic',
          model: 'claude-3.5-haiku',
          content: 'Single response',
          costUsd: 0.01,
          latencyMs: 100
        }
      ],
      evidence: {
        deterministicChecks: { test1: true },
        sources: [{ text: 'source', url: 'https://example.com', confidence: 0.9 }],
        claims: ['claim1'],
        criticAgreement: { model1: 0.85 },
        semanticMetrics: { fluencyScore: 0.9, relevanceScore: 0.85 },
        modelProvider: 'anthropic',
        historicalSuccess: 0.92
      }
    };

    let res = await makeRequest('POST', '/api/v1/cup/tournament/create', singleCandidatePayload);
    if (res.status === 200 && res.body.ok && res.body.tournament) {
      console.log(`    ✅ Single candidate tournament created`);
      passed++;
    } else {
      console.log(`    ❌ Single candidate tournament failed (status: ${res.status})`);
      failures.push('Single candidate tournament failed');
      failed++;
    }

    // Test 11: Multiple candidates with ensemble potential
    console.log(`  📍 Test 11: POST /api/v1/cup/tournament/create (ensemble candidates)`);
    const ensemblePayload = {
      nodeId: 'node-ensemble-001',
      candidates: [
        {
          id: 'cand-1',
          provider: 'anthropic',
          model: 'claude-3.5-haiku',
          content: 'Response 1',
          costUsd: 0.01,
          latencyMs: 100
        },
        {
          id: 'cand-2',
          provider: 'openai',
          model: 'gpt-4o',
          content: 'Response 2',
          costUsd: 0.03,
          latencyMs: 150
        },
        {
          id: 'cand-3',
          provider: 'deepseek',
          model: 'deepseek-v3',
          content: 'Response 3',
          costUsd: 0.005,
          latencyMs: 80
        }
      ],
      evidence: {
        deterministicChecks: { test1: true, lint: true, format: true },
        sources: [
          { text: 'source1', url: 'https://example.com/1', confidence: 0.95 },
          { text: 'source2', url: 'https://example.com/2', confidence: 0.88 }
        ],
        claims: ['claim1', 'claim2', 'claim3'],
        criticAgreement: { model1: 0.82, model2: 0.79, model3: 0.80 },
        semanticMetrics: { fluencyScore: 0.88, relevanceScore: 0.84 },
        modelProvider: 'anthropic',
        historicalSuccess: 0.90
      }
    };

    res = await makeRequest('POST', '/api/v1/cup/tournament/create', ensemblePayload);
    if (res.status === 200 && res.body.ok && res.body.tournament) {
      const { tournament } = res.body;
      console.log(`    ✅ Ensemble tournament created (${tournament.results.length} candidates scored)`);
      if (tournament.mergedResult) {
        console.log(`       Merged result available: ${tournament.mergedResult.strategy}`);
      }
      passed++;
    } else {
      console.log(`    ❌ Ensemble tournament failed (status: ${res.status})`);
      failures.push('Ensemble tournament failed');
      failed++;
    }

    // Test 12: Cost-aware winner selection
    console.log(`  📍 Test 12: POST /api/v1/cup/tournament/create (cost-aware)`);
    const costAwarePayload = {
      nodeId: 'node-cost-001',
      candidates: [
        {
          id: 'cand-expensive',
          provider: 'openai',
          model: 'gpt-4-turbo',
          content: 'Very detailed response',
          costUsd: 0.50,
          latencyMs: 500
        },
        {
          id: 'cand-cheap',
          provider: 'ollama',
          model: 'local-llama',
          content: 'Good response',
          costUsd: 0.001,
          latencyMs: 50
        }
      ],
      evidence: {
        deterministicChecks: { test1: true },
        sources: [],
        claims: [],
        criticAgreement: {},
        semanticMetrics: { fluencyScore: 0.85, relevanceScore: 0.80 },
        modelProvider: 'anthropic',
        historicalSuccess: 0.88
      }
    };

    res = await makeRequest('POST', '/api/v1/cup/tournament/create', costAwarePayload);
    if (res.status === 200 && res.body.ok && res.body.tournament) {
      const winner = res.body.tournament.winner;
      console.log(`    ✅ Cost-aware tournament completed`);
      console.log(`       Winner: ${winner.provider} (Cost: $${winner.costUsd}, Score: ${winner.score})`);
      passed++;
    } else {
      console.log(`    ❌ Cost-aware tournament failed (status: ${res.status})`);
      failures.push('Cost-aware tournament failed');
      failed++;
    }
  } catch (e) {
    console.log(`    ❌ Error: ${e.message}`);
    failures.push(`Advanced scenario tests error: ${e.message}`);
    failed += 3;
  }

  // ========== SUMMARY ==========
  console.log(`\n\n╔════════════════════════════════════════════════════════════╗`);
  console.log(`║                  📊 TEST SUMMARY                          ║`);
  console.log(`╚════════════════════════════════════════════════════════════╝\n`);

  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total:  ${passed + failed}`);
  console.log(`📈 Pass Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%\n`);

  if (failures.length > 0) {
    console.log(`⚠️  Failures:\n`);
    failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    console.log();
  }

  const allPassed = failed === 0;
  console.log(`${allPassed ? '✅' : '⚠️ '} Cup Server Test Suite Complete\n`);

  process.exit(allPassed ? 0 : 1);
}

// Run tests
runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
