#!/usr/bin/env node

/**
 * Design System Enhancement Test Suite
 * Tests all four new capabilities:
 * 1. Component Detection
 * 2. Design Maturity Scoring
 * 3. Cross-Site Comparison
 * 4. Semantic Token Naming
 */

import { default as DesignSystemEnhancer } from './lib/design-system-enhancer.js';

// Test HTML with rich component patterns
const testHtml = `
  <html>
    <head>
      <style>
        .btn { padding: 8px 16px; border-radius: 4px; }
        .btn-primary { background: #007bff; color: white; }
        .btn-secondary { background: #6c757d; color: white; }
        .card { border: 1px solid #ddd; border-radius: 8px; padding: 16px; }
        .form-group { margin-bottom: 16px; }
        .nav { display: flex; gap: 16px; }
        .alert { padding: 12px; border-radius: 4px; margin-bottom: 16px; }
        .alert-success { background: #d4edda; color: #155724; }
        .badge { padding: 4px 8px; border-radius: 999px; font-size: 12px; }
      </style>
    </head>
    <body>
      <header>
        <nav class="nav nav-horizontal">
          <a href="/">Home</a>
          <a href="/about">About</a>
        </nav>
      </header>
      
      <main>
        <div class="alert alert-success">Success message</div>
        
        <button class="btn btn-primary">Primary Button</button>
        <button class="btn btn-secondary">Secondary Button</button>
        <a href="#" class="btn btn-primary">Link Button</a>
        
        <div class="card">
          <h2>Card Title</h2>
          <p>Card content goes here</p>
        </div>
        
        <form>
          <div class="form-group">
            <label>Name</label>
            <input type="text" />
          </div>
          <div class="form-group">
            <label>Message</label>
            <textarea></textarea>
          </div>
        </form>
        
        <span class="badge">New</span>
        <span class="badge badge-success">Active</span>
      </main>
    </body>
  </html>
`;

// Test design system
const testSystem = {
  colors: {
    '#007bff': { hex: '#007bff', role: 'primary' },
    '#28a745': { hex: '#28a745', role: 'success' },
    '#dc3545': { hex: '#dc3545', role: 'danger' },
    '#ffc107': { hex: '#ffc107', role: 'warning' },
    '#17a2b8': { hex: '#17a2b8', role: 'info' },
    '#6c757d': { hex: '#6c757d', role: 'secondary' },
    '#f8f9fa': { hex: '#f8f9fa', role: 'background-light' },
    '#343a40': { hex: '#343a40', role: 'text-primary' }
  },
  typography: [
    { family: 'Inter', weight: 400, size: 16 },
    { family: 'Inter', weight: 500, size: 16 },
    { family: 'Inter', weight: 600, size: 16 },
    { family: 'JetBrains Mono', weight: 400, size: 14 }
  ],
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px'
  },
  effects: {
    shadows: [
      '0 1px 3px rgba(0,0,0,0.1)',
      '0 4px 6px rgba(0,0,0,0.1)',
      '0 10px 20px rgba(0,0,0,0.15)'
    ],
    borders: [
      '1px solid #ddd',
      '1px solid #ccc',
      '2px solid #007bff'
    ],
    radiuses: ['4px', '8px', '999px']
  }
};

console.log('\n🎨 DESIGN SYSTEM ENHANCEMENT TEST SUITE\n');
console.log('=' .repeat(60));

// Test 1: Component Detection
console.log('\n1️⃣ COMPONENT DETECTION TEST');
console.log('-'.repeat(60));

const enhancer1 = new DesignSystemEnhancer();
const components = await enhancer1.detectComponents(testHtml);

console.log('✓ Components detected:');
Object.entries(components).forEach(([type, items]) => {
  const count = Object.keys(items).length;
  console.log(`  • ${type}: ${count} pattern(s)`);
});

console.log('\nDetailed findings:');
if (components.buttons) {
  console.log(`  Buttons: ${Object.keys(components.buttons).length} unique patterns`);
  Object.entries(components.buttons).slice(0, 2).forEach(([pattern, data]) => {
    console.log(`    - "${pattern}": count=${data.count}, type=${data.type}`);
  });
}

if (components.cards) {
  console.log(`  Cards: ${Object.keys(components.cards).length} pattern(s)`);
}

if (components.forms) {
  console.log(`  Forms: ${Object.keys(components.forms).length} structure(s)`);
}

// Test 2: Design Maturity Scoring
console.log('\n2️⃣ DESIGN MATURITY SCORING TEST');
console.log('-'.repeat(60));

const enhancer2 = new DesignSystemEnhancer(testSystem);
const maturityScore = enhancer2.scoreDesignMaturity(testSystem);

console.log('✓ Maturity Assessment:');
console.log(`  Overall Score: ${maturityScore.overall}/100 (${maturityScore.level})`);
console.log('\n  Breakdown:');
Object.entries(maturityScore.breakdown).forEach(([category, score]) => {
  const bar = '█'.repeat(Math.floor(score / 2)) + '░'.repeat(10 - Math.floor(score / 2));
  console.log(`    ${category.padEnd(15)} ${bar} ${score}/20`);
});

console.log('\n  Recommendations:');
maturityScore.recommendations.forEach((rec, i) => {
  console.log(`    ${i + 1}. ${rec}`);
});

// Test 3: Cross-Site Comparison
console.log('\n3️⃣ CROSS-SITE COMPARISON TEST');
console.log('-'.repeat(60));

// Create a second test system (different)
const testSystem2 = {
  colors: {
    '#3b82f6': { hex: '#3b82f6', role: 'primary' },
    '#10b981': { hex: '#10b981', role: 'success' },
    '#ef4444': { hex: '#ef4444', role: 'danger' },
    '#f59e0b': { hex: '#f59e0b', role: 'warning' }
  },
  typography: [
    { family: 'Poppins', weight: 400, size: 16 },
    { family: 'Poppins', weight: 600, size: 16 }
  ],
  spacing: {
    sm: '8px',
    md: '16px',
    lg: '24px'
  },
  effects: {
    shadows: ['0 2px 4px rgba(0,0,0,0.1)'],
    borders: ['1px solid #e5e7eb'],
    radiuses: ['6px', '8px']
  }
};

const enhancer3 = new DesignSystemEnhancer(testSystem);
const comparison = enhancer3.compareWithSystem(testSystem2);

console.log('✓ System 1 vs System 2 Comparison:');
console.log('\n  Colors:');
console.log(`    • System 1: ${comparison.colorComparison.total.system1} colors`);
console.log(`    • System 2: ${comparison.colorComparison.total.system2} colors`);
console.log(`    • Shared: ${comparison.colorComparison.shared.count} colors`);
console.log(`    • Similarity: ${comparison.colorComparison.similarity}%`);

console.log('\n  Typography:');
console.log(`    • System 1: ${comparison.typographyComparison.total.system1} families`);
console.log(`    • System 2: ${comparison.typographyComparison.total.system2} families`);
console.log(`    • Shared: ${comparison.typographyComparison.shared.count} families`);
console.log(`    • Similarity: ${comparison.typographyComparison.similarity}%`);

console.log('\n  Spacing:');
console.log(`    • System 1: ${comparison.spacingComparison.total.system1} values`);
console.log(`    • System 2: ${comparison.spacingComparison.total.system2} values`);
console.log(`    • Shared: ${comparison.spacingComparison.shared.count} values`);
console.log(`    • Similarity: ${comparison.spacingComparison.similarity}%`);

console.log('\n  Similarities:');
comparison.similarities.forEach(sim => {
  console.log(`    ✓ ${sim}`);
});

console.log('\n  Differences:');
comparison.differences.forEach(diff => {
  console.log(`    • ${diff}`);
});

// Test 4: Semantic Token Naming
console.log('\n4️⃣ SEMANTIC TOKEN NAMING TEST');
console.log('-'.repeat(60));

const enhancer4 = new DesignSystemEnhancer(testSystem);
const semanticNames = enhancer4.generateSemanticNames(testSystem);

console.log('✓ Semantic Names Generated:');

console.log('\n  Colors (sample):');
Object.entries(semanticNames.colors).slice(0, 3).forEach(([hex, data]) => {
  console.log(`    ${hex} → "${data.suggestedName}" (${data.semanticRole}) [${data.confidence}]`);
});

console.log('\n  Typography:');
Object.entries(semanticNames.typography).forEach(([family, data]) => {
  console.log(`    ${family} → Role: ${data.semantic}, Confidence: ${data.confidence}`);
});

console.log('\n  Spacing (sample):');
Object.entries(semanticNames.spacing).slice(0, 3).forEach(([_, data]) => {
  console.log(`    ${data.original} → "${data.suggestedScale}" (${data.semanticUsage})`);
});

console.log('\n  Effects (sample):');
if (semanticNames.effects.shadows) {
  semanticNames.effects.shadows.slice(0, 2).forEach(shadow => {
    console.log(`    "${shadow.original}" → ${shadow.suggestedName} (${shadow.intensity})`);
  });
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('\n✅ ALL ENHANCEMENT TESTS COMPLETED\n');
console.log('Summary:');
console.log(`  ✓ ${Object.keys(components).length} component types detected`);
console.log(`  ✓ Design maturity: ${maturityScore.overall}/100 (${maturityScore.level})`);
console.log(`  ✓ System comparison: ${comparison.colorComparison.similarity}% color similarity`);
console.log(`  ✓ ${Object.keys(semanticNames.colors).length} colors semantically named`);
console.log('\n');
