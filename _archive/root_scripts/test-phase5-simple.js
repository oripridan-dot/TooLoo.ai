#!/usr/bin/env node

/**
 * Phase 5 Quick Test - Simpler version
 */

import DesignSystemAnalytics from './lib/design-system-analytics.js';
import DesignAutoRemediation from './lib/design-auto-remediation.js';

console.log('\n🧪 PHASE 5 QUICK TEST\n');

// Test 1: Analytics
try {
  const analytics = new DesignSystemAnalytics();
  console.log('✓ DesignSystemAnalytics instantiated');
  
  // Quick test
  const system = {
    timestamp: '2024-01-01',
    colors: { primary: '#007AFF' },
    typography: [{ family: 'Inter', size: 16 }],
    spacing: { sm: '8px', md: '16px' },
    components: {},
    metadata: { estimatedDesignMaturity: 50 }
  };
  
  const benchmark = analytics.benchmarkAgainstIndustry(system, 'saas');
  console.log('✓ Benchmarking works, score:', benchmark.overallScore);
} catch (e) {
  console.error('✗ Analytics failed:', e.message);
  process.exit(1);
}

// Test 2: Auto-Remediation
try {
  const remediation = new DesignAutoRemediation({
    colors: { primary: '#007AFF' },
    typography: []
  });
  console.log('✓ DesignAutoRemediation instantiated');
  
  const analysis = remediation.analyzeForIssues();
  console.log('✓ Analysis works, issues:', analysis.totalIssues);
} catch (e) {
  console.error('✗ Remediation failed:', e.message);
  process.exit(1);
}

console.log('\n✅ Phase 5 core modules working!\n');
