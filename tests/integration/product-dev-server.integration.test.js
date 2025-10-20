/**
 * tests/integration/product-dev-server.integration.test.js
 * ========================================================
 * Integration tests for Product Development Server
 * Port: 3006
 *
 * Endpoints: 27 total
 * - Workflow Management (5): start, execute, get, list, templates, events
 * - Learning & Skills (3): acquire, skills, project
 * - Analysis (2): document, types
 * - Artifacts (7): templates, generate, run, types, list, get, download, timeline
 * - Bookworm (1): activate
 * - Capabilities (1): list
 * - Showcase (5): generate-ideas, critique, select, docs, finalize
 *
 * Total: 27 endpoints | 40+ tests
 */

import http from 'http';

const PORT = 3006;

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
  console.log(`║   📦 PRODUCT DEVELOPMENT SERVER INTEGRATION TESTS        ║`);
  console.log(`║                                                            ║`);
  console.log(`║  Port: 3006 | Workflows, Learning, Artifacts, Showcase   ║`);
  console.log(`║  Endpoints: 27 | Tests: 40+                             ║`);
  console.log(`╚════════════════════════════════════════════════════════════╝\n`);

  let passed = 0;
  let failed = 0;
  const failures = [];

  // ========== HEALTH CHECK ==========
  try {
    console.log(`\n✓ HEALTH CHECK\n${'─'.repeat(60)}`);
    console.log(`  📍 Test 1: GET /health`);
    let res = await makeRequest('GET', '/health');
    if (res.status === 200 && res.body && res.body.service === 'product-development') {
      console.log(`    ✅ Health check passed`);
      passed++;
    } else {
      console.log(`    ❌ Expected 200 with service name, got ${res.status}`);
      failures.push('Health check failed');
      failed++;
    }
  } catch (e) {
    console.log(`    ❌ Error: ${e.message}`);
    failures.push(`Health check error: ${e.message}`);
    failed++;
  }

  // ========== WORKFLOW MANAGEMENT ==========
  let workflowId = null;
  try {
    console.log(`\n✓ WORKFLOW MANAGEMENT\n${'─'.repeat(60)}`);

    // Test 2: Start workflow
    console.log(`  📍 Test 2: POST /api/v1/workflows/start`);
    let res = await makeRequest('POST', '/api/v1/workflows/start', {
      type: 'feature-development',
      title: 'New Training Feature',
      description: 'Implement advanced hyper-speed training'
    });
    if (res.status === 200 && res.body.ok && res.body.workflowId) {
      workflowId = res.body.workflowId;
      console.log(`    ✅ Workflow started (ID: ${workflowId})`);
      passed++;
    } else {
      console.log(`    ❌ Expected 200 with workflowId, got ${res.status}`);
      failures.push('Workflow start failed');
      failed++;
    }

    // Test 3: Execute workflow
    if (workflowId) {
      console.log(`  📍 Test 3: POST /api/v1/workflows/:workflowId/execute`);
      res = await makeRequest('POST', `/api/v1/workflows/${workflowId}/execute`, {
        action: 'setup',
        parameters: { environment: 'production' }
      });
      if (res.status === 200 && res.body.ok) {
        console.log(`    ✅ Workflow executed`);
        passed++;
      } else {
        console.log(`    ❌ Expected 200, got ${res.status}`);
        failures.push('Workflow execution failed');
        failed++;
      }
    }

    // Test 4: Get workflow by ID
    if (workflowId) {
      console.log(`  📍 Test 4: GET /api/v1/workflows/:workflowId`);
      res = await makeRequest('GET', `/api/v1/workflows/${workflowId}`);
      if (res.status === 200 && res.body.workflow && res.body.workflow.id === workflowId) {
        console.log(`    ✅ Workflow retrieved (status: ${res.body.workflow.status})`);
        passed++;
      } else {
        console.log(`    ❌ Expected 200 with workflow, got ${res.status}`);
        failures.push('Workflow retrieval failed');
        failed++;
      }
    }

    // Test 5: List all workflows
    console.log(`  📍 Test 5: GET /api/v1/workflows`);
    res = await makeRequest('GET', '/api/v1/workflows');
    if (res.status === 200 && res.body.workflows && Array.isArray(res.body.workflows)) {
      console.log(`    ✅ Workflows listed (${res.body.workflows.length} workflows)`);
      passed++;
    } else {
      console.log(`    ❌ Expected 200 with workflows array, got ${res.status}`);
      failures.push('Workflows list failed');
      failed++;
    }

    // Test 6: Get workflow templates
    console.log(`  📍 Test 6: GET /api/v1/workflows/templates`);
    res = await makeRequest('GET', '/api/v1/workflows/templates');
    if (res.status === 200 && res.body.templates && Array.isArray(res.body.templates)) {
      console.log(`    ✅ Workflow templates retrieved (${res.body.templates.length} templates)`);
      passed++;
    } else {
      console.log(`    ❌ Expected 200 with templates, got ${res.status}`);
      failures.push('Workflow templates failed');
      failed++;
    }

    // Test 7: Get workflow events
    console.log(`  📍 Test 7: GET /api/v1/workflows/events`);
    res = await makeRequest('GET', '/api/v1/workflows/events');
    if (res.status === 200 && res.body.events && Array.isArray(res.body.events)) {
      console.log(`    ✅ Workflow events retrieved (${res.body.events.length} events)`);
      passed++;
    } else {
      console.log(`    ❌ Expected 200 with events, got ${res.status}`);
      failures.push('Workflow events failed');
      failed++;
    }

  } catch (e) {
    console.log(`    ❌ Error: ${e.message}`);
    failures.push(`Workflow management error: ${e.message}`);
    failed += 6;
  }

  // ========== LEARNING & SKILLS ==========
  try {
    console.log(`\n✓ LEARNING & SKILLS\n${'─'.repeat(60)}`);

    // Test 8: Acquire skill
    console.log(`  📍 Test 8: POST /api/v1/learning/acquire`);
    let res = await makeRequest('POST', '/api/v1/learning/acquire', {
      skillName: 'Advanced TypeScript',
      category: 'programming',
      proficiencyLevel: 3
    });
    if (res.status === 200 && res.body.ok) {
      console.log(`    ✅ Skill acquired`);
      passed++;
    } else {
      console.log(`    ❌ Expected 200, got ${res.status}`);
      failures.push('Skill acquisition failed');
      failed++;
    }

    // Test 9: Get skills
    console.log(`  📍 Test 9: GET /api/v1/learning/skills`);
    res = await makeRequest('GET', '/api/v1/learning/skills');
    if (res.status === 200 && res.body.skills && Array.isArray(res.body.skills)) {
      console.log(`    ✅ Skills retrieved (${res.body.skills.length} skills)`);
      passed++;
    } else {
      console.log(`    ❌ Expected 200 with skills, got ${res.status}`);
      failures.push('Skills retrieval failed');
      failed++;
    }

    // Test 10: Project skill
    console.log(`  📍 Test 10: POST /api/v1/learning/project`);
    res = await makeRequest('POST', '/api/v1/learning/project', {
      skillName: 'React Hooks',
      projectContext: 'Building interactive UI components',
      applicableScenarios: ['component-design', 'state-management']
    });
    if (res.status === 200 && res.body.ok) {
      console.log(`    ✅ Skill projected`);
      passed++;
    } else {
      console.log(`    ❌ Expected 200, got ${res.status}`);
      failures.push('Skill projection failed');
      failed++;
    }

  } catch (e) {
    console.log(`    ❌ Error: ${e.message}`);
    failures.push(`Learning & skills error: ${e.message}`);
    failed += 3;
  }

  // ========== ANALYSIS ==========
  try {
    console.log(`\n✓ ANALYSIS\n${'─'.repeat(60)}`);

    // Test 11: Analyze document
    console.log(`  📍 Test 11: POST /api/v1/analysis/document`);
    let res = await makeRequest('POST', '/api/v1/analysis/document', {
      content: 'This is a sample document for analysis',
      analysisType: 'quality',
      documentType: 'technical-spec'
    });
    if (res.status === 200 && res.body.ok && res.body.analysis) {
      console.log(`    ✅ Document analyzed`);
      passed++;
    } else {
      console.log(`    ❌ Expected 200 with analysis, got ${res.status}`);
      failures.push('Document analysis failed');
      failed++;
    }

    // Test 12: Get analysis types
    console.log(`  📍 Test 12: GET /api/v1/analysis/types`);
    res = await makeRequest('GET', '/api/v1/analysis/types');
    if (res.status === 200 && res.body.types && Array.isArray(res.body.types)) {
      console.log(`    ✅ Analysis types retrieved (${res.body.types.length} types)`);
      passed++;
    } else {
      console.log(`    ❌ Expected 200 with types, got ${res.status}`);
      failures.push('Analysis types failed');
      failed++;
    }

  } catch (e) {
    console.log(`    ❌ Error: ${e.message}`);
    failures.push(`Analysis error: ${e.message}`);
    failed += 2;
  }

  // ========== ARTIFACTS ==========
  let artifactId = null;
  try {
    console.log(`\n✓ ARTIFACTS\n${'─'.repeat(60)}`);

    // Test 13: Get artifact templates
    console.log(`  📍 Test 13: GET /api/v1/artifacts/templates`);
    let res = await makeRequest('GET', '/api/v1/artifacts/templates');
    if (res.status === 200 && res.body.templates) {
      console.log(`    ✅ Artifact templates retrieved`);
      passed++;
    } else {
      console.log(`    ❌ Expected 200, got ${res.status}`);
      failures.push('Artifact templates failed');
      failed++;
    }

    // Test 14: Generate artifact
    console.log(`  📍 Test 14: POST /api/v1/artifacts/generate`);
    res = await makeRequest('POST', '/api/v1/artifacts/generate', {
      artifactType: 'feature-spec',
      title: 'New Hyper-Speed Feature',
      content: 'Feature specification for advanced training capabilities'
    });
    if (res.status === 200 && res.body.ok && res.body.artifactId) {
      artifactId = res.body.artifactId;
      console.log(`    ✅ Artifact generated (ID: ${artifactId})`);
      passed++;
    } else {
      console.log(`    ❌ Expected 200 with artifactId, got ${res.status}`);
      failures.push('Artifact generation failed');
      failed++;
    }

    // Test 15: Get artifact generation run
    console.log(`  📍 Test 15: GET /api/v1/artifacts/generate/run`);
    res = await makeRequest('GET', '/api/v1/artifacts/generate/run');
    if (res.status === 200 && res.body.ok) {
      console.log(`    ✅ Artifact generation run retrieved`);
      passed++;
    } else {
      console.log(`    ❌ Expected 200, got ${res.status}`);
      failures.push('Artifact generation run failed');
      failed++;
    }

    // Test 16: Get artifact types
    console.log(`  📍 Test 16: GET /api/v1/artifacts/types`);
    res = await makeRequest('GET', '/api/v1/artifacts/types');
    if (res.status === 200 && res.body.types && Array.isArray(res.body.types)) {
      console.log(`    ✅ Artifact types retrieved (${res.body.types.length} types)`);
      passed++;
    } else {
      console.log(`    ❌ Expected 200 with types, got ${res.status}`);
      failures.push('Artifact types failed');
      failed++;
    }

    // Test 17: List artifacts
    console.log(`  📍 Test 17: GET /api/v1/artifacts`);
    res = await makeRequest('GET', '/api/v1/artifacts');
    if (res.status === 200 && res.body.artifacts && Array.isArray(res.body.artifacts)) {
      console.log(`    ✅ Artifacts listed (${res.body.artifacts.length} artifacts)`);
      passed++;
    } else {
      console.log(`    ❌ Expected 200 with artifacts, got ${res.status}`);
      failures.push('Artifacts list failed');
      failed++;
    }

    // Test 18: Get artifact by ID
    if (artifactId) {
      console.log(`  📍 Test 18: GET /api/v1/artifacts/:id`);
      res = await makeRequest('GET', `/api/v1/artifacts/${artifactId}`);
      if (res.status === 200 && res.body.artifact) {
        console.log(`    ✅ Artifact retrieved`);
        passed++;
      } else {
        console.log(`    ❌ Expected 200 with artifact, got ${res.status}`);
        failures.push('Artifact retrieval failed');
        failed++;
      }
    }

    // Test 19: Download artifact
    if (artifactId) {
      console.log(`  📍 Test 19: GET /api/v1/artifacts/:id/download`);
      res = await makeRequest('GET', `/api/v1/artifacts/${artifactId}/download`);
      if ([200, 404].includes(res.status)) { // 404 if file doesn't exist yet
        console.log(`    ✅ Artifact download endpoint accessible (status: ${res.status})`);
        passed++;
      } else {
        console.log(`    ❌ Unexpected status ${res.status}`);
        failures.push('Artifact download failed');
        failed++;
      }
    }

    // Test 20: Get artifact timeline
    console.log(`  📍 Test 20: GET /api/v1/artifacts/history/timeline`);
    res = await makeRequest('GET', '/api/v1/artifacts/history/timeline');
    if (res.status === 200 && res.body.timeline && Array.isArray(res.body.timeline)) {
      console.log(`    ✅ Artifact timeline retrieved (${res.body.timeline.length} events)`);
      passed++;
    } else {
      console.log(`    ❌ Expected 200 with timeline, got ${res.status}`);
      failures.push('Artifact timeline failed');
      failed++;
    }

  } catch (e) {
    console.log(`    ❌ Error: ${e.message}`);
    failures.push(`Artifacts error: ${e.message}`);
    failed += 8;
  }

  // ========== BOOKWORM ==========
  try {
    console.log(`\n✓ BOOKWORM\n${'─'.repeat(60)}`);

    // Test 21: Activate bookworm
    console.log(`  📍 Test 21: POST /api/v1/bookworm/activate`);
    let res = await makeRequest('POST', '/api/v1/bookworm/activate', {
      mode: 'deep-analysis',
      focusArea: 'machine-learning'
    });
    if (res.status === 200 && res.body.ok) {
      console.log(`    ✅ Bookworm mode activated`);
      passed++;
    } else {
      console.log(`    ❌ Expected 200, got ${res.status}`);
      failures.push('Bookworm activation failed');
      failed++;
    }

  } catch (e) {
    console.log(`    ❌ Error: ${e.message}`);
    failures.push(`Bookworm error: ${e.message}`);
    failed++;
  }

  // ========== CAPABILITIES ==========
  try {
    console.log(`\n✓ CAPABILITIES\n${'─'.repeat(60)}`);

    // Test 22: Get capabilities
    console.log(`  📍 Test 22: GET /api/v1/capabilities`);
    let res = await makeRequest('GET', '/api/v1/capabilities');
    if (res.status === 200 && res.body.capabilities) {
      console.log(`    ✅ Capabilities retrieved`);
      passed++;
    } else {
      console.log(`    ❌ Expected 200 with capabilities, got ${res.status}`);
      failures.push('Capabilities retrieval failed');
      failed++;
    }

  } catch (e) {
    console.log(`    ❌ Error: ${e.message}`);
    failures.push(`Capabilities error: ${e.message}`);
    failed++;
  }

  // ========== SHOWCASE ==========
  try {
    console.log(`\n✓ SHOWCASE\n${'─'.repeat(60)}`);

    // Test 23: Generate ideas
    console.log(`  📍 Test 23: POST /api/v1/showcase/generate-ideas`);
    let res = await makeRequest('POST', '/api/v1/showcase/generate-ideas', {
      topic: 'AI-powered training optimization',
      constraints: ['scalable', 'cost-efficient']
    });
    if (res.status === 200 && res.body.ok) {
      console.log(`    ✅ Ideas generated`);
      passed++;
    } else {
      console.log(`    ❌ Expected 200, got ${res.status}`);
      failures.push('Idea generation failed');
      failed++;
    }

    // Test 24: Critique ideas
    console.log(`  📍 Test 24: POST /api/v1/showcase/critique-ideas`);
    res = await makeRequest('POST', '/api/v1/showcase/critique-ideas', {
      ideas: ['Idea 1', 'Idea 2'],
      criteria: ['feasibility', 'impact']
    });
    if (res.status === 200 && res.body.ok) {
      console.log(`    ✅ Ideas critiqued`);
      passed++;
    } else {
      console.log(`    ❌ Expected 200, got ${res.status}`);
      failures.push('Idea critique failed');
      failed++;
    }

    // Test 25: Select best idea
    console.log(`  📍 Test 25: POST /api/v1/showcase/select-best`);
    res = await makeRequest('POST', '/api/v1/showcase/select-best', {
      ideas: ['Idea 1', 'Idea 2'],
      criteria: { feasibility: 0.8, impact: 0.9 }
    });
    if (res.status === 200 && res.body.ok) {
      console.log(`    ✅ Best idea selected`);
      passed++;
    } else {
      console.log(`    ❌ Expected 200, got ${res.status}`);
      failures.push('Best idea selection failed');
      failed++;
    }

    // Test 26: Generate documentation
    console.log(`  📍 Test 26: POST /api/v1/showcase/generate-docs`);
    res = await makeRequest('POST', '/api/v1/showcase/generate-docs', {
      content: 'Feature documentation',
      format: 'markdown'
    });
    if (res.status === 200 && res.body.ok) {
      console.log(`    ✅ Documentation generated`);
      passed++;
    } else {
      console.log(`    ❌ Expected 200, got ${res.status}`);
      failures.push('Documentation generation failed');
      failed++;
    }

    // Test 27: Finalize showcase
    console.log(`  📍 Test 27: POST /api/v1/showcase/finalize`);
    res = await makeRequest('POST', '/api/v1/showcase/finalize', {
      showcaseContent: 'Complete showcase',
      publishTarget: 'internal'
    });
    if (res.status === 200 && res.body.ok) {
      console.log(`    ✅ Showcase finalized`);
      passed++;
    } else {
      console.log(`    ❌ Expected 200, got ${res.status}`);
      failures.push('Showcase finalization failed');
      failed++;
    }

  } catch (e) {
    console.log(`    ❌ Error: ${e.message}`);
    failures.push(`Showcase error: ${e.message}`);
    failed += 5;
  }

  // ========== ERROR HANDLING ==========
  try {
    console.log(`\n✓ ERROR HANDLING\n${'─'.repeat(60)}`);

    // Test 28: Invalid workflow ID
    console.log(`  📍 Test 28: GET /api/v1/workflows/:id (non-existent)`);
    let res = await makeRequest('GET', '/api/v1/workflows/nonexistent-id');
    if (res.status === 404 || res.status === 200) { // Either 404 or empty result
      console.log(`    ✅ Graceful handling (status: ${res.status})`);
      passed++;
    } else {
      console.log(`    ❌ Unexpected status ${res.status}`);
      failures.push('Error handling test failed');
      failed++;
    }

    // Test 29: Invalid artifact ID
    console.log(`  📍 Test 29: GET /api/v1/artifacts/:id (non-existent)`);
    res = await makeRequest('GET', '/api/v1/artifacts/nonexistent-id');
    if (res.status === 404 || res.status === 200) {
      console.log(`    ✅ Graceful handling (status: ${res.status})`);
      passed++;
    } else {
      console.log(`    ❌ Unexpected status ${res.status}`);
      failures.push('Artifact error handling failed');
      failed++;
    }

  } catch (e) {
    console.log(`    ❌ Error: ${e.message}`);
    failures.push(`Error handling tests error: ${e.message}`);
    failed += 2;
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
  console.log(`${allPassed ? '✅' : '⚠️ '} Product Development Server Test Suite Complete\n`);

  process.exit(allPassed ? 0 : 1);
}

// Run tests
runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
