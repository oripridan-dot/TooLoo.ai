/**
 * Phase 2c: Artifact Ledger Integration Test
 * 
 * Tests the Artifact Ledger system:
 * 1. Artifact registration & versioning
 * 2. Verdict tracking (scores, decisions, evidence)
 * 3. Provenance chain (complete decision history)
 * 4. Rollback capability
 * 5. History diff timeline
 * 6. Integrity verification
 * 7. Search & export
 * 8. Statistics aggregation
 */

import ArtifactLedger from '../engine/artifact-ledger.js';

const ledger = new ArtifactLedger();

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  ✗ FAIL: ${message}`);
    testsFailed++;
  } else {
    console.log(`  ✓ PASS: ${message}`);
    testsPassed++;
  }
}

async function test1() {
  console.log('\nTEST 1: Artifact Registration & Versioning');
  try {
    const result = ledger.registerArtifact({
      type: 'code',
      title: 'Authentication Module',
      description: 'OAuth2 implementation',
      content: 'function authenticate(token) { /* auth logic */ }',
      createdBy: 'builder-station',
      tags: ['auth', 'security'],
      relatedIntentId: 'intent-1'
    });

    assert(result.artifactId !== undefined, 'Artifact has unique ID');
    assert(result.versionId === 1, 'First version is v1');
    assert(result.timestamp !== undefined, 'Timestamp recorded');

    const artifact = ledger.getArtifact(result.artifactId);
    assert(artifact !== null, 'Artifact retrievable');
    assert(artifact.currentVersion.versionId === 1, 'Current version is v1');
    assert(artifact.type === 'code', 'Artifact type preserved');
    assert(artifact.metadata.tags.length === 2, 'Tags preserved');

    console.log(`    → Registered artifact: ${artifact.title} (v${artifact.currentVersion.versionId})`);
  } catch (e) {
    console.error(`TEST 1 ERROR: ${e.message}`);
    testsFailed++;
  }
}

async function test2() {
  console.log('\nTEST 2: Multi-Version Updates');
  try {
    const reg = ledger.registerArtifact({
      type: 'code',
      title: 'Payment API',
      content: 'function processPayment(amount) { /* v1 */ }',
      createdBy: 'builder'
    });

    // Update 1: Add Stripe integration
    const update1 = ledger.updateArtifact(reg.artifactId, 
      'function processPayment(amount) { stripe.charge(amount); /* v2 */ }',
      { changes: 'Added Stripe integration', author: 'builder', confidence: 0.85 }
    );
    assert(update1.versionId === 2, 'Version incremented to 2');

    // Update 2: Add error handling
    const update2 = ledger.updateArtifact(reg.artifactId,
      'function processPayment(amount) { try { stripe.charge(amount); } catch(e) { /* v3 */ } }',
      { changes: 'Added error handling', author: 'builder', confidence: 0.92 }
    );
    assert(update2.versionId === 3, 'Version incremented to 3');

    const artifact = ledger.getArtifact(reg.artifactId);
    assert(artifact.versions.length === 3, 'All 3 versions stored');
    assert(artifact.currentVersion.versionId === 3, 'Current is v3');

    const history = ledger.getHistory(reg.artifactId);
    assert(history.versions[0].changes === 'Initial version', 'V1 has initial marker');
    assert(history.versions[1].changes === 'Added Stripe integration', 'V2 change tracked');
    assert(history.versions[2].confidence === 0.92, 'V3 confidence tracked');

    console.log(`    → Updated artifact: ${history.versions.length} versions with complete change log`);
  } catch (e) {
    console.error(`TEST 2 ERROR: ${e.message}`);
    testsFailed++;
  }
}

async function test3() {
  console.log('\nTEST 3: Verdict Tracking & Decision Chain');
  try {
    const reg = ledger.registerArtifact({
      type: 'code',
      title: 'User Service',
      content: 'function getUser(id) { /* user service */ }',
      createdBy: 'builder'
    });

    // Verdict 1: Confidence score
    const v1 = ledger.addVerdict(reg.artifactId, {
      type: 'confidence',
      score: 0.88,
      decision: 'accept',
      evidence: { tests: 'passing', coverage: 0.92 },
      reviewer: 'confidence-scorer'
    });
    assert(v1.verdictCount === 1, 'First verdict recorded');

    // Verdict 2: Security review
    const v2 = ledger.addVerdict(reg.artifactId, {
      type: 'security',
      score: 0.95,
      decision: 'accept',
      evidence: { sql_injection: 'safe', auth: 'validated' },
      reviewer: 'auditor-station'
    });
    assert(v2.verdictCount === 2, 'Second verdict recorded');

    // Verdict 3: Test validation
    const v3 = ledger.addVerdict(reg.artifactId, {
      type: 'test',
      score: 0.91,
      decision: 'accept',
      evidence: { unit_tests: 45, integration_tests: 12, passed: 57 },
      reviewer: 'tester-station'
    });
    assert(v3.verdictCount === 3, 'Third verdict recorded');

    const provenance = ledger.getProvenance(reg.artifactId);
    assert(provenance.verdicts.length === 3, 'All 3 verdicts in provenance');
    assert(provenance.scoreTimeline.length === 3, 'Score timeline tracked');

    console.log(`    → Decision chain: confidence(0.88) → security(0.95) → test(0.91)`);
  } catch (e) {
    console.error(`TEST 3 ERROR: ${e.message}`);
    testsFailed++;
  }
}

async function test4() {
  console.log('\nTEST 4: Rollback Capability');
  try {
    const reg = ledger.registerArtifact({
      type: 'code',
      title: 'Database Schema',
      content: 'CREATE TABLE users (id INT, name VARCHAR);',
      createdBy: 'builder'
    });

    // V2
    ledger.updateArtifact(reg.artifactId, 
      'CREATE TABLE users (id INT, name VARCHAR, email VARCHAR);',
      { changes: 'Added email column' }
    );

    // V3 (buggy)
    ledger.updateArtifact(reg.artifactId,
      'CREATE TABLE users (id INT, name VARCHAR, email VARCHAR, INVALID_SYNTAX);',
      { changes: 'Bad update (syntax error)' }
    );

    let artifact = ledger.getArtifact(reg.artifactId);
    assert(artifact.currentVersion.versionId === 3, 'At buggy v3');
    assert(artifact.currentVersion.content.includes('INVALID_SYNTAX'), 'Bug present in v3');

    // Rollback to v2
    const rollback = ledger.rollback(reg.artifactId, 2);
    assert(rollback.newVersionId === 4, 'Rollback creates new version (v4)');

    artifact = ledger.getArtifact(reg.artifactId);
    assert(artifact.currentVersion.versionId === 4, 'Now at v4 (rollback version)');
    assert(!artifact.currentVersion.content.includes('INVALID_SYNTAX'), 'Bug fixed');
    assert(artifact.currentVersion.content.includes('email VARCHAR'), 'Good content restored');
    assert(artifact.currentVersion.changes.includes('Rolled back to version 2'), 'Rollback annotated');

    console.log(`    → Rollback: v3(buggy) → v4(restored from v2)`);
  } catch (e) {
    console.error(`TEST 4 ERROR: ${e.message}`);
    testsFailed++;
  }
}

async function test5() {
  console.log('\nTEST 5: History Diff Timeline');
  try {
    const reg = ledger.registerArtifact({
      type: 'document',
      title: 'API Documentation',
      content: '# API Docs\n## Endpoints\nNone yet',
      createdBy: 'writer'
    });

    ledger.updateArtifact(reg.artifactId, 
      '# API Docs\n## Endpoints\n- GET /users\n- POST /users',
      { changes: 'Added basic endpoints' }
    );

    ledger.updateArtifact(reg.artifactId,
      '# API Docs\n## Endpoints\n- GET /users\n- POST /users\n- PUT /users/{id}\n- DELETE /users/{id}',
      { changes: 'Added CRUD endpoints' }
    );

    const history = ledger.getHistory(reg.artifactId);

    assert(history.versions.length === 3, 'All 3 versions in history');
    assert(history.versions[0].versionId === 1, 'V1 tracked');
    assert(history.versions[1].changes === 'Added basic endpoints', 'V2 changes captured');
    assert(history.versions[2].changes === 'Added CRUD endpoints', 'V3 changes captured');
    assert(history.versions[2].contentLength > history.versions[0].contentLength, 'Content growth tracked');

    // Verify hashes are different per version
    const hashes = history.versions.map(v => v.hash);
    const uniqueHashes = new Set(hashes);
    assert(uniqueHashes.size === 3, 'Each version has unique hash');

    console.log(`    → History: v1(${history.versions[0].contentLength}B) → v2(${history.versions[1].contentLength}B) → v3(${history.versions[2].contentLength}B)`);
  } catch (e) {
    console.error(`TEST 5 ERROR: ${e.message}`);
    testsFailed++;
  }
}

async function test6() {
  console.log('\nTEST 6: Integrity Verification');
  try {
    const reg = ledger.registerArtifact({
      type: 'code',
      title: 'Security Module',
      content: 'function encrypt(data) { /* secure */ }',
      createdBy: 'builder'
    });

    // Verify integrity of v1
    const check1 = ledger.verifyIntegrity(reg.artifactId, 1);
    assert(check1.isValid === true, 'V1 integrity valid');
    assert(check1.storedHash === check1.computedHash, 'Hash matches');

    // Update
    ledger.updateArtifact(reg.artifactId,
      'function encrypt(data, key) { /* secure with key */ }',
      { changes: 'Added key parameter' }
    );

    // Verify v1 still valid
    const check2 = ledger.verifyIntegrity(reg.artifactId, 1);
    assert(check2.isValid === true, 'V1 still valid after v2 created');

    // Verify v2 valid
    const check3 = ledger.verifyIntegrity(reg.artifactId, 2);
    assert(check3.isValid === true, 'V2 integrity valid');
    assert(check3.storedHash !== check1.storedHash, 'V1 and V2 have different hashes');

    console.log(`    → Integrity: v1(${check1.storedHash}) ✓, v2(${check3.storedHash}) ✓`);
  } catch (e) {
    console.error(`TEST 6 ERROR: ${e.message}`);
    testsFailed++;
  }
}

async function test7() {
  console.log('\nTEST 7: Search & Filtering');
  try {
    // Create various artifacts
    ledger.registerArtifact({
      type: 'code',
      title: 'Auth Service',
      tags: ['auth', 'backend'],
      relatedIntentId: 'intent-A',
      content: '// auth code',
      createdBy: 'builder'
    });

    ledger.registerArtifact({
      type: 'code',
      title: 'Payment Service',
      tags: ['payment', 'backend'],
      relatedIntentId: 'intent-B',
      content: '// payment code',
      createdBy: 'builder'
    });

    ledger.registerArtifact({
      type: 'design',
      title: 'Login UI',
      tags: ['ui', 'auth'],
      relatedIntentId: 'intent-A',
      content: '<div>Login UI</div>',
      createdBy: 'designer'
    });

    ledger.registerArtifact({
      type: 'document',
      title: 'API Reference',
      tags: ['docs'],
      relatedIntentId: 'intent-C',
      content: '# API Reference',
      createdBy: 'writer'
    });

    // Search by type
    const codeArtifacts = ledger.searchArtifacts({ type: 'code' });
    assert(codeArtifacts.length >= 2, 'Search by type returns at least 2 code artifacts');

    // Search by tag
    const authArtifacts = ledger.searchArtifacts({ tag: 'auth' });
    assert(authArtifacts.length >= 2, 'Search by tag finds Auth Service + Login UI');

    // Search by title substring
    const serviceSearch = ledger.searchArtifacts({ title: 'Service' });
    assert(serviceSearch.length >= 2, 'Title substring search finds Auth + Payment Services');

    // Search by intent
    const intentASearch = ledger.searchArtifacts({ intentId: 'intent-A' });
    assert(intentASearch.length >= 2, 'Intent search finds artifacts linked to intent-A');

    console.log(`    → Search results: code(${codeArtifacts.length}) | tag:auth(${authArtifacts.length}) | title:Service(${serviceSearch.length}) | intent-A(${intentASearch.length})`);
  } catch (e) {
    console.error(`TEST 7 ERROR: ${e.message}`);
    testsFailed++;
  }
}

async function test8() {
  console.log('\nTEST 8: Export with Full Provenance');
  try {
    const reg = ledger.registerArtifact({
      type: 'code',
      title: 'Rate Limiter',
      description: 'Redis-based rate limiter',
      content: 'function rateLimit(userId, limit) { /* limiter */ }',
      createdBy: 'builder',
      tags: ['performance'],
      relatedIntentId: 'intent-perf-opt'
    });

    ledger.updateArtifact(reg.artifactId,
      'function rateLimit(userId, limit) { redis.incr(userId); /* v2 */ }',
      { changes: 'Added Redis', author: 'builder', confidence: 0.89 }
    );

    ledger.addVerdict(reg.artifactId, {
      type: 'confidence',
      score: 0.87,
      decision: 'accept',
      evidence: { tests: 'passing' },
      reviewer: 'scorer'
    });

    ledger.addVerdict(reg.artifactId, {
      type: 'performance',
      score: 0.93,
      decision: 'accept',
      evidence: { latency: '< 5ms', throughput: '10k req/s' },
      reviewer: 'optimizer'
    });

    const exported = ledger.exportArtifact(reg.artifactId);

    assert(exported.artifact.title === 'Rate Limiter', 'Artifact metadata exported');
    assert(exported.artifact.currentVersion === 2, 'Current version tracked');
    assert(exported.artifact.totalVersions === 2, 'Version count exported');
    assert(exported.provenance.verdicts.length === 2, 'All verdicts exported');
    assert(exported.history.versions.length === 2, 'Full history exported');
    assert(exported.exportedAt !== undefined, 'Export timestamp included');

    console.log(`    → Export: ${exported.artifact.title}, v${exported.artifact.currentVersion}, ${exported.provenance.verdicts.length} verdicts, full provenance`);
  } catch (e) {
    console.error(`TEST 8 ERROR: ${e.message}`);
    testsFailed++;
  }
}

async function test9() {
  console.log('\nTEST 9: Statistics Aggregation');
  try {
    // Create several artifacts to build stats
    for (let i = 0; i < 5; i++) {
      const reg = ledger.registerArtifact({
        type: 'code',
        title: `Module ${i + 1}`,
        content: `// module ${i + 1}`,
        createdBy: 'builder'
      });

      // Add random updates
      const updateCount = Math.floor(Math.random() * 3) + 1;
      for (let j = 0; j < updateCount; j++) {
        ledger.updateArtifact(reg.artifactId,
          `// module ${i + 1} v${j + 2}`,
          { changes: `Update ${j + 1}` }
        );
      }
    }

    const stats = ledger.getStats();

    assert(stats.totalArtifacts >= 5, 'Total artifacts tracked');
    assert(stats.totalVersions > 0, 'Total versions tracked');
    assert(stats.avgVersionsPerArtifact > 0, 'Average calculated');
    assert(stats.avgVersionsPerArtifact >= 1, 'Average >= 1 (all have at least v1)');

    console.log(`    → Stats: ${stats.totalArtifacts} artifacts, ${stats.totalVersions} versions, avg ${stats.avgVersionsPerArtifact.toFixed(1)} v/artifact`);
  } catch (e) {
    console.error(`TEST 9 ERROR: ${e.message}`);
    testsFailed++;
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('Phase 2c: Artifact Ledger Integration Tests');
  console.log('='.repeat(70));

  await test1();
  await test2();
  await test3();
  await test4();
  await test5();
  await test6();
  await test7();
  await test8();
  await test9();

  console.log('\n' + '='.repeat(70));
  console.log(`RESULTS: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('='.repeat(70));

  process.exit(testsFailed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('FATAL ERROR:', e);
  process.exit(1);
});
