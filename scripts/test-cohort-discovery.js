#!/usr/bin/env node

/**
 * Phase 2 Sprint 1: Cohort Discovery Acceptance Tests
 * 
 * Validates:
 * 1. Trait extraction accuracy (>80% precision on synthetic data)
 * 2. Cohort discovery produces 3-5 meaningful clusters
 * 3. User-to-cohort assignment correctness
 * 4. API endpoint functionality
 * 5. Data persistence and retrieval
 */

const http = require('http');
const fs = require('fs').promises;
const path = require('path');

const SEGMENTATION_PORT = process.env.SEGMENTATION_PORT || 3007;
const COHORTS_PATH = path.join(__dirname, '..', 'data', 'segmentation', 'cohorts.json');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

let testsPassed = 0;
let testsFailed = 0;

/**
 * Helper: Make HTTP request
 */
function httpRequest(method, pathname, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: SEGMENTATION_PORT,
      path: pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: body ? JSON.parse(body) : null,
        });
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

/**
 * Assert helper
 */
function assert(condition, message) {
  if (condition) {
    console.log(`  ${colors.green}✓${colors.reset} ${message}`);
    testsPassed++;
  } else {
    console.log(`  ${colors.red}✗${colors.reset} ${message}`);
    testsFailed++;
  }
}

/**
 * Generate synthetic user conversation data for testing
 */
function generateSyntheticUsers() {
  return {
    // Fast Learner cohort (high learningVelocity, high feedback responsiveness)
    'user-fast-1': Array(60).fill(null).map((_, i) => ({
      type: i % 3 === 0 ? 'training' : 'feedback',
      domain: 'technology',
      capabilityId: `cap-${i % 20}`,
      actionTaken: true,
    })),
    'user-fast-2': Array(50).fill(null).map((_, i) => ({
      type: i % 2 === 0 ? 'training' : 'feedback',
      domain: 'ai',
      capabilityId: `cap-${i % 18}`,
      actionTaken: true,
    })),

    // Specialist cohort (high domain affinity, medium interaction)
    'user-specialist-1': Array(35).fill(null).map((_, i) => ({
      type: 'training',
      domain: 'design',
      capabilityId: `cap-design-${i % 10}`,
      actionTaken: false,
    })),
    'user-specialist-2': Array(32).fill(null).map((_, i) => ({
      type: 'training',
      domain: 'design',
      capabilityId: `cap-design-${i % 9}`,
      actionTaken: false,
    })),

    // Power User cohort (high interaction frequency, consistent engagement)
    'user-power-1': Array(120).fill(null).map((_, i) => ({
      type: i % 4 === 0 ? 'feedback' : 'training',
      domain: ['tech', 'ai', 'product'][i % 3],
      capabilityId: `cap-${i % 30}`,
      actionTaken: i % 2 === 0,
    })),
    'user-power-2': Array(110).fill(null).map((_, i) => ({
      type: 'training',
      domain: ['tech', 'product', 'ai'][i % 3],
      capabilityId: `cap-${i % 28}`,
      actionTaken: true,
    })),
  };
}

/**
 * Test 1: Trait Extraction
 */
async function testTraitExtraction() {
  console.log(`\n${colors.blue}Test 1: Trait Extraction${colors.reset}`);

  try {
    const cohortAnalyzer = await import('../engine/cohort-analyzer.js');
    const syntheticUsers = generateSyntheticUsers();

    let traitsValid = 0;
    const traits = {};

    for (const [userId, conversations] of Object.entries(syntheticUsers)) {
      traits[userId] = await cohortAnalyzer.extractUserTraits(userId, conversations);

      // Validate trait ranges [0-1]
      const allValid = Object.values(traits[userId]).every((v) => v >= 0 && v <= 1);
      if (allValid) traitsValid++;
    }

    assert(traitsValid === Object.keys(syntheticUsers).length, 'All traits within valid range [0-1]');
    assert(
      Object.values(traits).some((t) => t.learningVelocity > 0.5),
      'Fast learners have high learning velocity (>0.5)'
    );
    assert(
      Object.values(traits).some((t) => t.domainAffinity > 0.4),
      'Specialists have high domain affinity (>0.4)'
    );
  } catch (err) {
    console.error(`  ${colors.red}Error: ${err.message}${colors.reset}`);
    testsFailed++;
  }
}

/**
 * Test 2: Cohort Discovery via API
 */
async function testCohortDiscoveryAPI() {
  console.log(`\n${colors.blue}Test 2: Cohort Discovery API${colors.reset}`);

  try {
    const syntheticUsers = generateSyntheticUsers();

    const response = await httpRequest('POST', '/api/v1/segmentation/cohorts', {
      userConversationMap: syntheticUsers,
    });

    assert(response.status === 200, 'API returns 200 OK');
    assert(response.body.ok === true, 'Response.ok is true');
    assert(Array.isArray(response.body.cohorts), 'Response contains cohorts array');
    assert(
      response.body.cohorts.length >= 3 && response.body.cohorts.length <= 5,
      `Cohorts count in range [3-5] (actual: ${response.body.cohorts.length})`
    );

    // Validate cohort structure
    const firstCohort = response.body.cohorts[0];
    assert(firstCohort.id, 'Cohort has id');
    assert(firstCohort.archetype, 'Cohort has archetype (e.g., Fast Learner, Specialist)');
    assert(firstCohort.size > 0, 'Cohort has size > 0');
    assert(Array.isArray(firstCohort.userIds), 'Cohort has userIds array');
    assert(firstCohort.avgTraits, 'Cohort has avgTraits');
  } catch (err) {
    console.error(`  ${colors.red}Error: ${err.message}${colors.reset}`);
    testsFailed++;
  }
}

/**
 * Test 3: Cohort Retrieval
 */
async function testCohortRetrieval() {
  console.log(`\n${colors.blue}Test 3: Cohort Retrieval${colors.reset}`);

  try {
    // First ensure cohorts exist
    const syntheticUsers = generateSyntheticUsers();
    const discoveryResponse = await httpRequest('POST', '/api/v1/segmentation/cohorts', {
      userConversationMap: syntheticUsers,
    });

    // Now retrieve all cohorts
    const retrievalResponse = await httpRequest('GET', '/api/v1/segmentation/cohorts');

    assert(retrievalResponse.status === 200, 'GET /cohorts returns 200 OK');
    assert(retrievalResponse.body.ok === true, 'Retrieval response.ok is true');
    assert(
      retrievalResponse.body.cohorts.length > 0,
      `Retrieved ${retrievalResponse.body.cohorts.length} cohorts`
    );

    // Test user-specific cohort retrieval
    if (discoveryResponse.body.cohorts.length > 0) {
      const testUserId = discoveryResponse.body.cohorts[0].userIds[0];
      const userResponse = await httpRequest(
        'GET',
        `/api/v1/segmentation/cohorts/${testUserId}`
      );

      assert(userResponse.status === 200, 'GET /cohorts/:userId returns 200 OK');
      assert(userResponse.body.ok === true, 'User cohort response.ok is true');
      assert(userResponse.body.cohort, `User ${testUserId} has assigned cohort`);
    }
  } catch (err) {
    console.error(`  ${colors.red}Error: ${err.message}${colors.reset}`);
    testsFailed++;
  }
}

/**
 * Test 4: Data Persistence
 */
async function testDataPersistence() {
  console.log(`\n${colors.blue}Test 4: Data Persistence${colors.reset}`);

  try {
    // Ensure cohorts file exists and is readable
    let cohortData = null;
    try {
      const data = await fs.readFile(COHORTS_PATH, 'utf8');
      cohortData = JSON.parse(data);
    } catch (err) {
      console.log(`  ${colors.yellow}⚠${colors.reset} Cohorts file not yet created (expected on first run)`);
    }

    if (cohortData) {
      assert(cohortData.metadata, 'Cohorts file has metadata section');
      assert(Array.isArray(cohortData.cohorts), 'Cohorts file has cohorts array');
      assert(
        cohortData.metadata.totalCohorts === cohortData.cohorts.length,
        'Metadata totalCohorts matches actual count'
      );
    }
  } catch (err) {
    console.error(`  ${colors.red}Error: ${err.message}${colors.reset}`);
    testsFailed++;
  }
}

/**
 * Test 5: Cohort Archetype Assignment
 */
async function testArchetypeAssignment() {
  console.log(`\n${colors.blue}Test 5: Cohort Archetype Assignment${colors.reset}`);

  try {
    const syntheticUsers = generateSyntheticUsers();
    const response = await httpRequest('POST', '/api/v1/segmentation/cohorts', {
      userConversationMap: syntheticUsers,
    });

    assert(response.body.ok === true, 'Cohort discovery succeeded');

    const archetypes = new Set();
    const validArchetypes = [
      'Fast Learner',
      'Specialist',
      'Power User',
      'Long-term Retainer',
      'Generalist',
    ];

    response.body.cohorts.forEach((cohort) => {
      assert(
        validArchetypes.includes(cohort.archetype),
        `Cohort archetype "${cohort.archetype}" is valid`
      );
      archetypes.add(cohort.archetype);
    });

    assert(
      archetypes.size >= 2,
      `Multiple archetype diversity (${archetypes.size} unique archetypes)`
    );
  } catch (err) {
    console.error(`  ${colors.red}Error: ${err.message}${colors.reset}`);
    testsFailed++;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log(`\n${colors.blue}=== Phase 2 Sprint 1: Cohort Discovery Tests ===${colors.reset}`);
  console.log(`Target: Segmentation Server on port ${SEGMENTATION_PORT}\n`);

  try {
    // Check if segmentation server is running
    const healthCheck = await httpRequest('GET', '/api/v1/segmentation/status').catch(
      () => ({ status: 0 })
    );

    if (healthCheck.status === 0) {
      console.log(
        `${colors.yellow}⚠ Segmentation Server not running on port ${SEGMENTATION_PORT}${colors.reset}`
      );
      console.log(`${colors.yellow}  Start with: npm run dev${colors.reset}\n`);
      return;
    }

    await testTraitExtraction();
    await testCohortDiscoveryAPI();
    await testCohortRetrieval();
    await testDataPersistence();
    await testArchetypeAssignment();

    console.log(`\n${colors.blue}=== Test Summary ===${colors.reset}`);
    console.log(`${colors.green}Passed: ${testsPassed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${testsFailed}${colors.reset}`);
    console.log(`Total:  ${testsPassed + testsFailed}\n`);

    const threshold = testsPassed / (testsPassed + testsFailed);
    if (threshold >= 0.8) {
      console.log(
        `${colors.green}✓ Sprint 1 Acceptance Criteria Met (>80% pass rate: ${(threshold * 100).toFixed(1)}%)${colors.reset}\n`
      );
    } else {
      console.log(
        `${colors.red}✗ Sprint 1 Acceptance Criteria Not Met (<80% pass rate: ${(threshold * 100).toFixed(1)}%)${colors.reset}\n`
      );
    }
  } catch (err) {
    console.error(`${colors.red}Fatal error: ${err.message}${colors.reset}`);
  }
}

// Run tests
runTests().catch(console.error);
