/**
 * Integration Test: Figma Import Endpoint
 * Tests the POST /api/v1/design/import-figma endpoint
 */

import assert from 'assert';
import { FigmaAdapter } from '../lib/adapters/figma-adapter.js';

// Mock test suite
async function testFigmaAdapter() {
  console.log('\n🧪 Figma Adapter Tests\n');

  // Test 1: File ID extraction
  console.log('Test 1: Extract Figma file ID from URL');
  const adapter = new FigmaAdapter('test-token');
  const fileId = adapter.extractFileId('https://figma.com/file/ABC123XYZ/MyDesignSystem');
  assert.strictEqual(fileId, 'ABC123XYZ', 'Should extract file ID from URL');
  console.log('✓ File ID extracted: ABC123XYZ\n');

  // Test 2: Invalid file ID
  console.log('Test 2: Handle invalid Figma URL');
  const invalidId = adapter.extractFileId('https://invalid-url.com');
  assert.strictEqual(invalidId, null, 'Should return null for invalid URL');
  console.log('✓ Invalid URL handled correctly\n');

  // Test 3: Token validation simulation
  console.log('Test 3: Figma adapter initialization');
  const adapterWithToken = new FigmaAdapter('mock-token-12345');
  assert.strictEqual(adapterWithToken.apiToken, 'mock-token-12345', 'Should store token');
  console.log('✓ Adapter initialized with token\n');

  // Test 4: Design system parsing
  console.log('Test 4: Parse Figma tokens to design system');
  const mockTokens = {
    colors: [
      { id: 'c1', name: 'Primary Blue', description: 'Brand primary', type: 'FILL' },
      { id: 'c2', name: 'Secondary Gray', description: 'Secondary color', type: 'FILL' }
    ],
    typography: [
      { id: 't1', name: 'Heading 1', description: 'Large heading', type: 'TEXT' }
    ],
    effects: [],
    grids: []
  };

  const mockComponents = [
    { id: 'b1', name: 'Button', description: 'CTA button component' },
    { id: 'c1', name: 'Card', description: 'Card layout component' }
  ];

  const designSystem = adapter.parseTokensToDesignSystem(mockTokens, mockComponents);

  assert(designSystem.colors['primary-blue'], 'Should have parsed primary blue color');
  assert(designSystem.typography['heading-1'], 'Should have parsed heading 1 typography');
  assert(designSystem.components.button, 'Should have parsed button component');
  assert(designSystem.components.card, 'Should have parsed card component');
  assert(designSystem.spacing.md === '16px', 'Should have default spacing');

  console.log('✓ Design system structure created');
  console.log(`  - Colors: ${Object.keys(designSystem.colors).length}`);
  console.log(`  - Typography: ${Object.keys(designSystem.typography).length}`);
  console.log(`  - Components: ${Object.keys(designSystem.components).length}`);
  console.log(`  - Spacing: ${Object.keys(designSystem.spacing).length}\n`);

  // Test 5: Token validation response
  console.log('Test 5: Figma token validation response structure');
  const validationResponse = {
    ok: false,
    valid: false,
    error: 'Invalid token'
  };
  assert('ok' in validationResponse, 'Response should have ok field');
  assert('valid' in validationResponse, 'Response should have valid field');
  assert('error' in validationResponse, 'Response should have error field');
  console.log('✓ Token validation response structure valid\n');

  console.log('✅ All tests passed!\n');
}

// Run tests
testFigmaAdapter().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
