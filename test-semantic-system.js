#!/usr/bin/env node

/**
 * DESIGN APPLIER - LOGICAL SYSTEM TEST
 * Demonstrates semantic token mapping and component-specific CSS
 */

console.log(`
╔════════════════════════════════════════════════════════════════╗
║     🎨 DESIGN APPLIER - SEMANTIC COMPONENT SYSTEM TEST         ║
╚════════════════════════════════════════════════════════════════╝
`);

async function comprehensiveTest() {
  // Test with a real design system (Figma-style)
  const designSystem = {
    colors: {
      primary: '#6366f1',
      secondary: '#ec4899',
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      background: '#ffffff',
      surface: '#f3f4f6',
      text: '#1f2937',
      muted: '#9ca3af'
    },
    typography: {
      heading: 'Inter, sans-serif',
      body: 'Inter, sans-serif',
      mono: 'Menlo, monospace'
    }
  };

  try {
    console.log('📥 INPUT: Design System');
    console.log(`   Primary color: ${designSystem.colors.primary}`);
    console.log(`   Error color: ${designSystem.colors.error}`);
    console.log(`   Background: ${designSystem.colors.background}`);
    console.log(`   Font: ${designSystem.typography.heading}\n`);

    console.log('🔄 Step 1: Calling /api/v1/design/apply-system\n');

    const response = await fetch('http://127.0.0.1:3000/api/v1/design/apply-system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(designSystem)
    });

    const data = await response.json();
    const { tokens, componentMap, componentCSS, tokenSystem } = data.content;

    console.log('✅ Step 2: Semantic tokens mapped\n');
    console.log(`   Total tokens: ${tokenSystem.totalTokens}`);
    console.log(`   Token categories: ${tokenSystem.categories.join(', ')}`);
    console.log(`   Components affected: ${tokenSystem.affectedComponents}\n`);

    console.log('✅ Step 3: Component-specific CSS generated\n');
    
    // Parse CSS to show component distribution
    const cssLines = componentCSS.split('\n');
    const classRules = cssLines.filter(l => l.startsWith('.'));
    const properties = cssLines.filter(l => l.includes(':') && !l.startsWith('.') && l.trim());

    console.log(`   CSS Rules: ${classRules.length} components`);
    console.log(`   CSS Properties: ${properties.length} total rules\n`);

    console.log('📊 Step 4: Component mapping details\n');
    
    // Show which components get primary color
    console.log('   color-primary token affects:');
    componentMap['color-primary']?.forEach(comp => {
      console.log(`     • ${comp}`);
    });

    console.log('\n   color-surface token affects:');
    componentMap['color-surface']?.forEach(comp => {
      console.log(`     • ${comp}`);
    });

    console.log('\n   font-primary-base token affects:');
    componentMap['font-primary-base']?.forEach(comp => {
      console.log(`     • ${comp}`);
    });

    // Show first few CSS rules
    console.log('\n💅 Step 5: Sample generated CSS rules\n');
    const sampleCSS = componentCSS.split('\n').slice(0, 30).join('\n');
    sampleCSS.split('\n').forEach(line => {
      if (line.trim()) console.log(`   ${line}`);
    });

    console.log(`\n🎯 WORKFLOW SUMMARY:\n`);

    console.log(`
┌─────────────────────────────────────┐
│  INPUT: Design System               │
│  • Colors                           │
│  • Typography                       │
│  • Spacing                          │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  API: Map to Semantic Tokens        │
│  • color-primary                    │
│  • color-surface                    │
│  • color-text                       │
│  • font-primary-base                │
│  • (21 total tokens)                │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Build: Component Map               │
│  color-primary → [button, input]    │
│  color-surface → [card, panel]      │
│  (45 component mappings)            │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Generate: Component CSS            │
│  .button { color: #6366f1; }        │
│  .card { background: #f3f4f6; }     │
│  (18 CSS rules)                     │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  APPLY: Inject into pages           │
│  • design-applier.html              │
│  • design-studio.html               │
│  • Other apps via localStorage      │
└─────────────────────────────────────┘
    `);

    console.log(`\n✅ ADVANTAGES OF THIS APPROACH:\n`);
    console.log(`   ✓ Semantic: Tokens have meaningful names`);
    console.log(`   ✓ Logical: Each component gets exactly what it needs`);
    console.log(`   ✓ Traceable: componentMap shows every mapping`);
    console.log(`   ✓ Debuggable: Easy to inspect which tokens affect each component`);
    console.log(`   ✓ Scalable: Add new components without changing the system`);
    console.log(`   ✓ Maintainable: Clear separation of token logic and CSS generation\n`);

    console.log(`📚 HOW TO USE:\n`);
    console.log(`   1. Open http://127.0.0.1:3000/design-applier.html`);
    console.log(`   2. Upload a design system (JSON or CSS)`);
    console.log(`   3. Click "🚀 Transform TooLoo Now"`);
    console.log(`   4. Watch components update with semantic tokens\n`);

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

comprehensiveTest();
