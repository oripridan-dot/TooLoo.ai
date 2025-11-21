#!/usr/bin/env node

/**
 * Logical Design System Application Test
 * Shows how design tokens map to specific components
 */

console.log(`
╔════════════════════════════════════════════════════════════════╗
║     🎨 SEMANTIC DESIGN SYSTEM - LOGICAL COMPONENT MAPPING     ║
╚════════════════════════════════════════════════════════════════╝
`);

async function testLogicalDesignSystem() {
  const testDesign = {
    colors: {
      primary: '#ff00ff',    // Primary action color
      secondary: '#00ffff',  // Secondary action color
      bg: '#1a1a1a',        // Background
      text: '#ffffff'       // Text color
    },
    typography: {
      primary: 'Arial'
    }
  };

  try {
    console.log('📋 STEP 1: Analyzing design system input');
    console.log(`   ✓ Primary color: ${testDesign.colors.primary}`);
    console.log(`   ✓ Secondary color: ${testDesign.colors.secondary}`);
    console.log(`   ✓ Background: ${testDesign.colors.bg}`);
    console.log(`   ✓ Text: ${testDesign.colors.text}\n`);

    console.log('🔄 STEP 2: Calling API to map to semantic tokens...\n');
    
    const response = await fetch('http://127.0.0.1:3000/api/v1/design/apply-system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testDesign)
    });

    const data = await response.json();
    const { tokens, componentMap, componentCSS, tokenSystem } = data.content;

    // Show token mapping
    console.log('📊 STEP 3: Semantic tokens generated');
    const tokenCategories = {
      'Primary Colors': ['color-primary', 'color-primary-dark', 'color-primary-hover', 'color-primary-active'],
      'Secondary Colors': ['color-secondary', 'color-secondary-dark', 'color-secondary-hover'],
      'Surface Colors': ['color-surface', 'color-surface-secondary'],
      'Text Colors': ['color-text', 'color-text-inverse', 'color-text-secondary', 'color-text-muted'],
      'Border Colors': ['color-border', 'color-border-subtle'],
      'Typography': ['font-primary-xl', 'font-primary-lg', 'font-primary-md', 'font-primary-base', 'font-primary-sm', 'font-secondary']
    };

    Object.entries(tokenCategories).forEach(([category, tokenKeys]) => {
      const availableTokens = tokenKeys.filter(key => tokens[key]);
      if (availableTokens.length > 0) {
        console.log(`\n   ${category}:`);
        availableTokens.forEach(tokenKey => {
          const value = tokens[tokenKey];
          console.log(`     • ${tokenKey}: ${value}`);
        });
      }
    });

    // Show component mapping
    console.log(`\n\n📍 STEP 4: Component mapping (which components get affected)`);
    console.log(`   Total tokens: ${tokenSystem.totalTokens}`);
    console.log(`   Affected components: ${tokenSystem.affectedComponents}\n`);

    // Show which components get which colors
    console.log('   Component Updates:');
    const componentUpdates = {
      'Button (Primary)': componentMap['color-primary'],
      'Button (Secondary)': componentMap['color-secondary'],
      'Cards': componentMap['color-surface'],
      'Input Fields': componentMap['color-surface'],
      'Text': componentMap['color-text'],
      'Navigation': componentMap['color-primary']
    };

    Object.entries(componentUpdates).forEach(([component, affectedClasses]) => {
      if (affectedClasses && affectedClasses.length > 0) {
        console.log(`     ✓ ${component}: ${affectedClasses.join(', ')}`);
      }
    });

    // Show generated CSS
    console.log(`\n\n💅 STEP 5: Component-specific CSS generated`);
    const cssLines = componentCSS.split('\n').filter(line => line.trim());
    const classNames = cssLines.filter(line => line.startsWith('.'));
    console.log(`   Total CSS rules: ${classNames.length}`);
    console.log(`   CSS preview:\n`);
    
    const previewLines = componentCSS.split('\n').slice(0, 35);
    previewLines.forEach(line => {
      if (line.trim()) console.log(`   ${line}`);
    });
    if (componentCSS.split('\n').length > 35) {
      console.log(`   ... (${componentCSS.split('\n').length - 35} more lines)`);
    }

    console.log(`\n\n╔════════════════════════════════════════════════════════════════╗`);
    console.log(`║                    ✅ SYSTEM OVERVIEW                         ║`);
    console.log(`╚════════════════════════════════════════════════════════════════╝`);

    console.log(`
🎯 LOGICAL FLOW:

1️⃣  Input → Design System (colors, typography, spacing)
    └─ Primary: #ff00ff, Secondary: #00ffff, Background: #1a1a1a

2️⃣  Map → Semantic Tokens (meaningful names)
    └─ color-primary, color-surface, color-text, etc.
    └─ Derived states (hover, active, dark variants)

3️⃣  Generate → Component Map (which components use which tokens)
    └─ button.primary uses: color-primary, color-primary-dark, color-primary-hover
    └─ card uses: color-surface, color-border, color-text
    └─ input uses: color-surface, color-border, color-text

4️⃣  Apply → Component CSS (targeted rules)
    └─ Only affected components get CSS rules
    └─ No global variables polluting the system
    └─ Each component receives exactly what it needs

✅ Benefits of this approach:

  ✓ Semantic: Token names describe purpose, not values
  ✓ Logical: Components only get relevant tokens
  ✓ Traceable: componentMap shows exactly what's applied
  ✓ Debuggable: Can inspect which tokens affect each component
  ✓ Scalable: Easy to add new components and tokens
  ✓ Maintainable: Clear separation of concerns

📚 Next: Apply componentCSS to design-studio.html <style> tag
           or use localStorage to broadcast to other tabs
    `);

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

testLogicalDesignSystem();
