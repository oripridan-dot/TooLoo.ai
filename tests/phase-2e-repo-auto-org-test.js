/**
 * Phase 2e Repository Auto-Organization Tests
 * 
 * Tests repo auto-org functionality:
 * 1. Scope detection from descriptions
 * 2. Branch name generation
 * 3. PR template generation
 * 4. Commit message formatting
 * 5. Folder structure recommendations
 * 6. Organization plan generation
 */

import RepoAutoOrg from '../engine/repo-auto-org.js';

console.log('🧪 Phase 2e: Repository Auto-Organization Tests\n');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (e) {
    console.error(`❌ ${name}`);
    console.error(`   Error: ${e.message}`);
    testsFailed++;
  }
}

// ====== TESTS ======

await test('1. Service Initialization', () => {
  const engine = new RepoAutoOrg({
    repoRoot: '/tmp/repo',
    defaultBranchPrefix: 'feature',
    maxBranchNameLength: 50
  });

  assert(engine !== null, 'Engine created');
  assert(engine.config.maxBranchNameLength === 50, 'Config set');
  assert(Object.keys(engine.scopePatterns).length > 0, 'Scope patterns defined');
});

await test('2. Detect UI Scope', () => {
  const engine = new RepoAutoOrg();
  const scopes = engine.detectScope('Add a new button component to the dashboard');

  assert(Array.isArray(scopes), 'Returns array');
  assert(scopes.length > 0, 'Detected at least one scope');
  assert(scopes[0].scope === 'ui', 'Correctly detected UI scope');
  assert(scopes[0].score > 0, 'Has positive score');
});

await test('3. Detect API Scope', () => {
  const engine = new RepoAutoOrg();
  const scopes = engine.detectScope('Create new REST API endpoint for user management');

  assert(scopes.length > 0, 'Detected scope');
  assert(scopes[0].scope === 'api', 'Correctly detected API scope');
});

await test('4. Detect Database Scope', () => {
  const engine = new RepoAutoOrg();
  const scopes = engine.detectScope('Add database migration for user schema changes');

  assert(scopes.length > 0, 'Detected scope');
  assert(scopes.some(s => s.scope === 'database'), 'Includes database scope');
});

await test('5. Detect Security Scope', () => {
  const engine = new RepoAutoOrg();
  const scopes = engine.detectScope('Fix security vulnerability in authentication');

  assert(scopes.length > 0, 'Detected scope');
  assert(scopes.some(s => s.scope === 'security'), 'Includes security scope');
});

await test('6. Multiple Scope Detection', () => {
  const engine = new RepoAutoOrg();
  const scopes = engine.detectScope(
    'Build authentication API endpoint with database schema and UI component'
  );

  assert(scopes.length >= 2, 'Detected multiple scopes');
  const scopeNames = scopes.map(s => s.scope);
  assert(scopeNames.includes('api'), 'Includes API');
  assert(scopeNames.includes('database') || scopeNames.includes('auth'), 'Includes database or auth');
});

await test('7. Generate Branch Name', () => {
  const engine = new RepoAutoOrg();
  const name = engine.generateBranchName('Add login button component', 'ui');

  assert(typeof name === 'string', 'Returns string');
  assert(name.startsWith('ui/'), 'Starts with scope prefix');
  assert(!name.match(/[^a-z0-9\-\/]/), 'Only contains valid characters');
  assert(name.length <= 50, 'Respects max length');
});

await test('8. Branch Name Sanitization', () => {
  const engine = new RepoAutoOrg();
  const name = engine.generateBranchName('Add @#$% special chars!!!', 'api');

  assert(!name.match(/[^a-z0-9\-\/]/), 'Special characters removed');
  assert(name.includes('/'), 'Still has scope separator');
});

await test('9. Generate PR Template', () => {
  const engine = new RepoAutoOrg();
  const scopes = [{ scope: 'ui', score: 5 }];
  const template = engine.generatePRTemplate('Add button component', scopes, 'ui/add-button');

  assert(template.includes('Scope'), 'Includes scope section');
  assert(template.includes('Description'), 'Includes description section');
  assert(template.includes('Testing'), 'Includes testing section');
  assert(template.includes('ui/add-button'), 'Includes branch name');
  assert(template.includes('UI'), 'Includes uppercase scope');
});

await test('10. Generate Commit Template', () => {
  const engine = new RepoAutoOrg();
  const template = engine.generateCommitTemplate('ui', 'Add login button');

  assert(template.includes('feat(ui)'), 'Includes correct commit type');
  assert(template.includes('Add login button'), 'Includes description');
  assert(template.includes('Describe your changes'), 'Includes prompt for details');
});

await test('11. Generate Commit Pattern', () => {
  const engine = new RepoAutoOrg();
  const scopes = [{ scope: 'api', score: 5 }, { scope: 'database', score: 3 }];
  const pattern = engine.generateCommitPattern(scopes);

  assert(pattern.pattern, 'Has pattern');
  assert(Array.isArray(pattern.examples), 'Has examples');
  assert(pattern.examples.length > 0, 'Has at least one example');
  assert(pattern.description, 'Has description');
});

await test('12. Generate Folder Structure', () => {
  const engine = new RepoAutoOrg();
  const scopes = [{ scope: 'ui', score: 5 }];
  const folders = engine.generateFolderStructure(scopes);

  assert(Array.isArray(folders), 'Returns array');
  assert(folders.length > 0, 'Has folder recommendations');
  assert(folders.some(f => f.includes('components') || f.includes('styles')), 'Includes UI folders');
});

await test('13. Generate Organization Plan - UI', () => {
  const engine = new RepoAutoOrg();
  const plan = engine.generateOrganizationPlan('Add new button component');

  assert(plan.id, 'Has unique ID');
  assert(plan.timestamp, 'Has timestamp');
  assert(plan.description === 'Add new button component', 'Has description');
  assert(Array.isArray(plan.detectedScopes), 'Has detected scopes');
  assert(plan.primaryScope, 'Has primary scope');
  assert(plan.branchName, 'Has branch name');
  assert(plan.prTemplate, 'Has PR template');
  assert(plan.commitTemplate, 'Has commit template');
  assert(plan.folders, 'Has folder recommendations');
  assert(plan.commands, 'Has commands');
});

await test('14. Organization Plan Commands', () => {
  const engine = new RepoAutoOrg();
  const plan = engine.generateOrganizationPlan('Add new endpoint');

  assert(plan.commands.createBranch, 'Has create branch command');
  assert(plan.commands.trackBranch, 'Has track branch command');
  assert(plan.commands.commitExample, 'Has commit example');
  assert(plan.commands.createPR, 'Has PR creation command');
  assert(plan.commands.allSteps, 'Has all steps combined');
  assert(plan.commands.createBranch.includes('git checkout'), 'Command is valid git syntax');
});

await test('15. File Organization Recommendations', () => {
  const engine = new RepoAutoOrg();
  const plan = engine.generateOrganizationPlan('Build API with database and UI');

  assert(plan.fileOrganization, 'Has file organization');
  assert(Array.isArray(plan.fileOrganization), 'Is array');
  assert(plan.fileOrganization.length > 0, 'Has recommendations');
  
  const rec = plan.fileOrganization[0];
  assert(rec.scope, 'Has scope');
  assert(rec.suggestedFolders, 'Has suggested folders');
  assert(rec.examples, 'Has examples');
});

await test('16. Stats Endpoint', () => {
  const engine = new RepoAutoOrg();
  const stats = engine.getStats();

  assert(stats.supportedScopes > 0, 'Has scope count');
  assert(Array.isArray(stats.scopes), 'Scopes is array');
  assert(stats.fileOrganizationScopes > 0, 'Has file org scopes');
  assert(stats.scopes.every(s => s.scope && s.keywordCount > 0), 'All scopes have keywords');
});

await test('17. Branch Name Length Limit', () => {
  const engine = new RepoAutoOrg({ maxBranchNameLength: 30 });
  const name = engine.generateBranchName('This is a very long description that should be truncated', 'feature');

  assert(name.length <= 30, 'Respects length limit');
});

await test('18. Different Scope Prefixes', () => {
  const engine = new RepoAutoOrg();
  
  const uiBranch = engine.generateBranchName('Add button', 'ui');
  const apiBranch = engine.generateBranchName('Add endpoint', 'api');
  const dbBranch = engine.generateBranchName('Add migration', 'database');

  assert(uiBranch.startsWith('ui/'), 'UI branch starts with ui');
  assert(apiBranch.startsWith('api/'), 'API branch starts with api');
  assert(dbBranch.startsWith('database/'), 'DB branch starts with database');
});

await test('19. Commit Type Mapping', () => {
  const engine = new RepoAutoOrg();

  assert(engine.getCommitType('ui') === 'feat', 'UI maps to feat');
  assert(engine.getCommitType('security') === 'security', 'Security stays security');
  assert(engine.getCommitType('performance') === 'perf', 'Performance maps to perf');
  assert(engine.getCommitType('testing') === 'test', 'Testing maps to test');
});

await test('20. Complex Feature Description', () => {
  const engine = new RepoAutoOrg();
  const description = `
    Implement user authentication system with OAuth2 support,
    including database migrations, new API endpoints,
    React components for login/signup, and security enhancements
    to prevent injection attacks.
  `;

  const plan = engine.generateOrganizationPlan(description);

  assert(plan.detectedScopes.length >= 3, 'Detects multiple scopes');
  assert(plan.detectedScopes.some(s => s.scope === 'auth'), 'Detects auth scope');
  assert(plan.detectedScopes.some(s => s.scope === 'security'), 'Detects security scope');
  assert(plan.branchName.includes('/'), 'Branch name is properly formatted');
});

// ====== SUMMARY ======

console.log(`\n${'='.repeat(60)}`);
console.log(`Tests: ${testsPassed} passed, ${testsFailed} failed`);
console.log(`${'='.repeat(60)}`);

if (testsFailed > 0) {
  process.exit(1);
}
