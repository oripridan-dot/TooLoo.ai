/**
 * Tests for Figma Adapter
 * Tests design token extraction, component parsing, and API integration
 */

import { FigmaAdapter } from '../lib/adapters/figma-adapter.js';
import assert from 'assert';

// Mock Figma API response
const mockFigmaResponse = {
  name: 'Test Design System',
  lastModified: '2024-11-04T12:00:00Z',
  version: '1.0',
  document: {
    id: '0:0',
    name: 'Document',
    type: 'DOCUMENT',
    children: [
      {
        id: '1:1',
        name: 'Colors',
        type: 'FRAME',
        children: [
          {
            id: '2:1',
            name: 'Primary',
            type: 'RECTANGLE',
            fills: [
              {
                type: 'SOLID',
                color: { r: 0, g: 0.4, b: 1, a: 1 }
              }
            ]
          },
          {
            id: '2:2',
            name: 'Secondary',
            type: 'RECTANGLE',
            fills: [
              {
                type: 'SOLID',
                color: { r: 1, g: 0.2, b: 0.4, a: 1 }
              }
            ]
          }
        ]
      },
      {
        id: '3:1',
        name: 'Typography',
        type: 'FRAME',
        children: [
          {
            id: '4:1',
            name: 'Heading 1',
            type: 'TEXT',
            style: {
              fontSize: 32,
              fontWeight: 700,
              fontFamily: 'Inter',
              lineHeightPx: 40
            }
          },
          {
            id: '4:2',
            name: 'Body',
            type: 'TEXT',
            style: {
              fontSize: 16,
              fontWeight: 400,
              fontFamily: 'Inter',
              lineHeightPx: 24
            }
          }
        ]
      },
      {
        id: '5:1',
        name: 'Components',
        type: 'FRAME',
        children: [
          {
            id: '6:1',
            name: 'Button',
            type: 'COMPONENT',
            description: 'Primary button component',
            absoluteBoundingBox: { width: 120, height: 40 }
          },
          {
            id: '7:1',
            name: 'Button Instance',
            type: 'INSTANCE',
            componentId: '6:1',
            absoluteBoundingBox: { x: 100, y: 200 }
          }
        ]
      },
      {
        id: '8:1',
        name: 'Card with Shadow',
        type: 'FRAME',
        effects: [
          {
            type: 'DROP_SHADOW',
            offset: { x: 0, y: 4 },
            radius: 8,
            spread: 0,
            color: { r: 0, g: 0, b: 0, a: 0.1 }
          }
        ]
      }
    ]
  }
};

// Test suite
async function runTests() {
  console.log('🧪 Running Figma Adapter Tests...\n');
  
  let passed = 0;
  let failed = 0;

  // Test 1: URL parsing
  try {
    const adapter = new FigmaAdapter('test-token');
    
    const fileKey1 = adapter.extractFileKey('https://figma.com/file/ABC123XYZ/MyDesignSystem');
    assert.strictEqual(fileKey1, 'ABC123XYZ', 'Should extract file key from /file/ URL');
    
    const fileKey2 = adapter.extractFileKey('https://www.figma.com/design/XYZ789ABC/AnotherFile');
    assert.strictEqual(fileKey2, 'XYZ789ABC', 'Should extract file key from /design/ URL');
    
    try {
      adapter.extractFileKey('https://invalid-url.com/not-figma');
      assert.fail('Should throw error for invalid URL');
    } catch (e) {
      assert.ok(e.message.includes('Invalid Figma URL'), 'Should throw error for invalid URL');
    }
    
    console.log('✅ Test 1: URL parsing - PASSED');
    passed++;
  } catch (error) {
    console.log('❌ Test 1: URL parsing - FAILED');
    console.log('   Error:', error.message);
    failed++;
  }

  // Test 2: Color extraction
  try {
    const adapter = new FigmaAdapter('test-token');
    
    const solidColor = adapter.extractColor({
      type: 'SOLID',
      color: { r: 0, g: 0.4, b: 1, a: 1 }
    });
    assert.strictEqual(solidColor, '#0066FF', 'Should convert RGB to hex');
    
    const transparentColor = adapter.extractColor({
      type: 'SOLID',
      color: { r: 1, g: 0, b: 0, a: 0.5 }
    });
    assert.ok(transparentColor.startsWith('rgba('), 'Should use rgba for transparent colors');
    
    const noColor = adapter.extractColor({ type: 'IMAGE' });
    assert.strictEqual(noColor, null, 'Should return null for non-solid paints');
    
    console.log('✅ Test 2: Color extraction - PASSED');
    passed++;
  } catch (error) {
    console.log('❌ Test 2: Color extraction - FAILED');
    console.log('   Error:', error.message);
    failed++;
  }

  // Test 3: Design token extraction
  try {
    const adapter = new FigmaAdapter('test-token');
    const tokens = adapter.extractDesignTokens(mockFigmaResponse);
    
    // Check colors
    assert.ok(tokens.colors, 'Should extract colors object');
    assert.ok(Object.keys(tokens.colors).length > 0, 'Should extract at least one color');
    assert.strictEqual(tokens.colors.primary, '#0066FF', 'Should extract primary color correctly');
    
    // Check typography
    assert.ok(tokens.typography, 'Should extract typography object');
    assert.ok(Object.keys(tokens.typography).length > 0, 'Should extract at least one typography style');
    const heading = tokens.typography['heading-1'];
    assert.ok(heading, 'Should extract heading-1 typography');
    assert.strictEqual(heading.fontSize, 32, 'Should extract correct font size');
    assert.strictEqual(heading.fontWeight, 700, 'Should extract correct font weight');
    
    // Check spacing
    assert.ok(tokens.spacing, 'Should extract spacing object');
    
    // Check shadows
    assert.ok(tokens.shadows, 'Should extract shadows object');
    assert.ok(Object.keys(tokens.shadows).length > 0, 'Should extract at least one shadow');
    
    console.log('✅ Test 3: Design token extraction - PASSED');
    passed++;
  } catch (error) {
    console.log('❌ Test 3: Design token extraction - FAILED');
    console.log('   Error:', error.message);
    failed++;
  }

  // Test 4: Component extraction
  try {
    const adapter = new FigmaAdapter('test-token');
    const components = adapter.extractComponents(mockFigmaResponse);
    
    assert.ok(Array.isArray(components), 'Should return array of components');
    assert.strictEqual(components.length, 1, 'Should extract 1 component');
    
    const button = components[0];
    assert.strictEqual(button.name, 'Button', 'Should extract component name');
    assert.strictEqual(button.description, 'Primary button component', 'Should extract component description');
    assert.strictEqual(button.instances.length, 1, 'Should find 1 instance');
    
    console.log('✅ Test 4: Component extraction - PASSED');
    passed++;
  } catch (error) {
    console.log('❌ Test 4: Component extraction - FAILED');
    console.log('   Error:', error.message);
    failed++;
  }

  // Test 5: Shadow extraction
  try {
    const adapter = new FigmaAdapter('test-token');
    const tokens = adapter.extractDesignTokens(mockFigmaResponse);
    
    const shadows = Object.values(tokens.shadows);
    assert.ok(shadows.length > 0, 'Should extract shadows');
    
    const shadow = shadows[0];
    assert.strictEqual(shadow.offsetY, 4, 'Should extract shadow offset Y');
    assert.strictEqual(shadow.blur, 8, 'Should extract shadow blur');
    assert.strictEqual(shadow.type, 'drop', 'Should identify drop shadow type');
    
    console.log('✅ Test 5: Shadow extraction - PASSED');
    passed++;
  } catch (error) {
    console.log('❌ Test 5: Shadow extraction - FAILED');
    console.log('   Error:', error.message);
    failed++;
  }

  // Test 6: Error handling
  try {
    try {
      new FigmaAdapter(null);
      assert.fail('Should throw error for missing API token');
    } catch (e) {
      assert.ok(e.message.includes('API token is required'), 'Should throw error for missing API token');
    }
    
    console.log('✅ Test 6: Error handling - PASSED');
    passed++;
  } catch (error) {
    console.log('❌ Test 6: Error handling - FAILED');
    console.log('   Error:', error.message);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`Tests completed: ${passed + failed}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('='.repeat(50));

  return failed === 0;
}

// Run tests
runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
