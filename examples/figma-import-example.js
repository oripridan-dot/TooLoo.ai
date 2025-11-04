#!/usr/bin/env node

/**
 * Example script demonstrating Figma design import
 * 
 * Usage:
 *   node examples/figma-import-example.js
 */

import { FigmaAdapter } from '../lib/adapters/figma-adapter.js';

// Example: Using the Figma adapter directly (without the server)
async function exampleDirectAdapter() {
  console.log('📋 Example 1: Using FigmaAdapter directly\n');
  
  // You would normally get these from user input or environment
  const figmaUrl = 'https://figma.com/file/ABC123XYZ/MyDesignSystem';
  const apiToken = process.env.FIGMA_API_TOKEN || 'your-token-here';
  
  try {
    const adapter = new FigmaAdapter(apiToken);
    
    console.log('🔍 Extracting file key from URL...');
    const fileKey = adapter.extractFileKey(figmaUrl);
    console.log(`   File key: ${fileKey}\n`);
    
    console.log('📥 Importing design system from Figma...');
    console.log('   (This would make a real API call with a valid token)\n');
    
    // Note: This will fail without a real token and file
    // const result = await adapter.importDesignSystem(figmaUrl);
    
    console.log('Expected result structure:');
    console.log(JSON.stringify({
      ok: true,
      design_system: {
        colors: { primary: '#0066FF', secondary: '#FF3366' },
        typography: {
          h1: { fontSize: 32, fontWeight: 700, fontFamily: 'Inter' }
        },
        spacing: { xs: 4, sm: 8, md: 16 },
        shadows: { card: { offsetY: 4, blur: 8 } },
        components: [{ name: 'Button', instances: [] }]
      },
      metadata: {
        fileName: 'MyDesignSystem',
        fileKey: 'ABC123XYZ'
      }
    }, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Example: Making HTTP request to the server
async function exampleServerAPI() {
  console.log('\n' + '='.repeat(60) + '\n');
  console.log('📋 Example 2: Using Design Integration Server API\n');
  
  console.log('Start the server first:');
  console.log('  $ node servers/design-integration-server.js\n');
  
  console.log('Then make a POST request:');
  console.log(`
curl -X POST http://localhost:3008/api/v1/design/import-figma \\
  -H 'Content-Type: application/json' \\
  -d '{
    "figmaUrl": "https://figma.com/file/ABC123XYZ/MyDesignSystem",
    "apiToken": "figd_your_token_here"
  }'
`);
  
  console.log('Or using fetch in JavaScript:');
  console.log(`
const response = await fetch('http://localhost:3008/api/v1/design/import-figma', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    figmaUrl: 'https://figma.com/file/ABC123XYZ/MyDesignSystem',
    apiToken: 'figd_your_token_here'
  })
});

const data = await response.json();
console.log('Design System:', data.design_system);
`);
}

// Example: Color extraction
function exampleColorExtraction() {
  console.log('\n' + '='.repeat(60) + '\n');
  console.log('📋 Example 3: Color Extraction\n');
  
  const adapter = new FigmaAdapter('dummy-token');
  
  // Example Figma color format (RGB with values 0-1)
  const figmaColors = [
    { type: 'SOLID', color: { r: 0, g: 0.4, b: 1, a: 1 } },      // Blue
    { type: 'SOLID', color: { r: 1, g: 0.2, b: 0.4, a: 1 } },     // Red-pink
    { type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 0.1 } },       // Transparent black
  ];
  
  console.log('Converting Figma colors to CSS format:\n');
  figmaColors.forEach((paint, i) => {
    const cssColor = adapter.extractColor(paint);
    console.log(`  Color ${i + 1}:`, {
      figma: paint.color,
      css: cssColor
    });
  });
}

// Example: Component structure
function exampleComponentStructure() {
  console.log('\n' + '='.repeat(60) + '\n');
  console.log('📋 Example 4: Component Structure\n');
  
  console.log('Figma components are extracted with full hierarchy:\n');
  console.log(JSON.stringify([
    {
      id: '6:1',
      name: 'Button',
      description: 'Primary button component',
      instances: [
        {
          id: '7:1',
          name: 'Button - Login',
          position: { x: 100, y: 200 }
        },
        {
          id: '7:2',
          name: 'Button - Submit',
          position: { x: 100, y: 280 }
        }
      ],
      properties: {
        width: 120,
        height: 40
      }
    }
  ], null, 2));
}

// Run examples
console.log('🎨 Figma Design Import - Usage Examples');
console.log('='.repeat(60) + '\n');

exampleDirectAdapter()
  .then(() => exampleServerAPI())
  .then(() => exampleColorExtraction())
  .then(() => exampleComponentStructure())
  .then(() => {
    console.log('\n' + '='.repeat(60));
    console.log('✨ Examples completed!');
    console.log('\nNext steps:');
    console.log('1. Get a Figma API token from https://www.figma.com/settings');
    console.log('2. Start the server: node servers/design-integration-server.js');
    console.log('3. Make your first import request!');
    console.log('='.repeat(60) + '\n');
  })
  .catch(error => {
    console.error('Error running examples:', error);
  });
