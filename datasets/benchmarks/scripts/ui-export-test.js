// UI Export Test - Validates frontend-ready JSON generation
// Tests all export formats: dashboard, timeline, summary, insights

import fs from 'fs';
import path from 'path';
const __dirname = path.dirname(import.meta.url.replace('file://', ''));
import { exportConversationUI, generateDashboardExport, generateTimelineExport, generateSummaryExport, generateInsightsExport } from './ui-export.js';

const SESSIONS_DIR = path.join(__dirname, '../conversation-synthetic/sessions');

function loadSession(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function runUIExportTest() {
  console.log('UI Export Test Results:');
  console.log('======================');
  
  // Test with session-001 (most comprehensive)
  const session = loadSession(path.join(SESSIONS_DIR, 'session-001.json'));
  
  // Test all export formats
  const formats = ['dashboard', 'timeline', 'summary', 'insights'];
  const exports = exportConversationUI(session, formats);
  
  console.log(`\nExport Package Generated:`);
  console.log(`  Formats: ${Object.keys(exports.formats).join(', ')}`);
  console.log(`  Exported at: ${exports.metadata.exportedAt}`);
  console.log(`  Source: ${exports.metadata.sourceSnapshot.messageCount} messages, ${exports.metadata.sourceSnapshot.patternCount} patterns`);
  
  // Test each format individually
  for (const format of formats) {
    console.log(`\n--- ${format.toUpperCase()} FORMAT ---`);
    const exportData = exports.formats[format];
    
    switch (format) {
      case 'dashboard':
        console.log(`  Overview: ${exportData.overview.totalInsights} insights, ${exportData.overview.confidence}% confidence`);
        console.log(`  Style: ${exportData.overview.conversationStyle}`);
        console.log(`  Dominant trait: ${exportData.overview.dominantTrait}`);
        console.log(`  Top patterns: ${exportData.topPatterns.map(p => p.name).join(', ')}`);
        console.log(`  Trait profile: ${exportData.traitProfile.length} traits`);
        console.log(`  Recommendations: ${exportData.recommendations.length} items`);
        break;
        
      case 'timeline':
        console.log(`  Segments: ${exportData.timeline.length}`);
        console.log(`  Total patterns: ${exportData.metadata.totalPatterns}`);
        exportData.timeline.forEach(segment => {
          console.log(`    ${segment.segmentId}: ${segment.patternCount} patterns (${segment.dominantTheme} theme)`);
        });
        break;
        
      case 'summary':
        console.log(`  Quick insights: ${exportData.quickInsights.length} items`);
        console.log(`    - ${exportData.quickInsights.join('\n    - ')}`);
        console.log(`  Key findings: ${exportData.keyFindings.style} style, ${exportData.keyFindings.strength} strength`);
        console.log(`  High-priority recommendations: ${exportData.recommendations.length}`);
        break;
        
      case 'insights':
        console.log(`  Categories: ${exportData.insights.length}`);
        exportData.insights.forEach(insight => {
          console.log(`    ${insight.category}: ${insight.title}`);
          if (Array.isArray(insight.data)) {
            console.log(`      ${insight.data.length} items`);
          } else {
            console.log(`      ${Object.keys(insight.data).length} dimensions`);
          }
        });
        console.log(`  Correlations: ${exportData.correlations.length} found`);
        console.log(`  Enhanced recommendations: ${exportData.recommendations.length} with rationale`);
        break;
    }
  }
  
  // Validate JSON structure
  console.log(`\n--- VALIDATION ---`);
  let validationErrors = 0;
  
  for (const [format, data] of Object.entries(exports.formats)) {
    try {
      JSON.stringify(data);
      console.log(`  ${format}: ✓ Valid JSON`);
    } catch (error) {
      console.log(`  ${format}: ✗ JSON Error - ${error.message}`);
      validationErrors++;
    }
  }
  
  // Check required fields
  const dashboard = exports.formats.dashboard;
  const requiredDashboardFields = ['overview', 'topPatterns', 'traitProfile', 'recommendations'];
  const missingFields = requiredDashboardFields.filter(field => !dashboard[field]);
  
  if (missingFields.length === 0) {
    console.log(`  Dashboard schema: ✓ All required fields present`);
  } else {
    console.log(`  Dashboard schema: ✗ Missing fields: ${missingFields.join(', ')}`);
    validationErrors++;
  }
  
  // Performance test
  const startTime = Date.now();
  const perfTest = exportConversationUI(session, ['dashboard']);
  const exportTime = Date.now() - startTime;
  
  console.log(`\n--- PERFORMANCE ---`);
  console.log(`  Export time: ${exportTime}ms`);
  console.log(`  Target: <100ms for real-time UI updates`);
  console.log(`  Status: ${exportTime < 100 ? '✓ PASS' : '⚠ REVIEW'}`);
  
  // Summary
  console.log(`\n--- SUMMARY ---`);
  console.log(`  Formats tested: ${formats.length}`);
  console.log(`  Validation errors: ${validationErrors}`);
  console.log(`  Overall status: ${validationErrors === 0 ? '✓ ALL TESTS PASS' : '✗ REVIEW NEEDED'}`);
  
  return exports;
}

// Save sample exports for frontend integration
function saveSampleExports() {
  const session = loadSession(path.join(SESSIONS_DIR, 'session-001.json'));
  const exports = exportConversationUI(session, ['dashboard', 'timeline', 'summary', 'insights']);
  
  const outputDir = path.join(__dirname, '../output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Save each format as separate JSON file
  for (const [format, data] of Object.entries(exports.formats)) {
    const filename = path.join(outputDir, `ui-export-${format}.json`);
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`Saved: ${filename}`);
  }
  
  // Save complete export package
  const packageFile = path.join(outputDir, 'ui-export-package.json');
  fs.writeFileSync(packageFile, JSON.stringify(exports, null, 2));
  console.log(`Saved: ${packageFile}`);
  
  return outputDir;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const results = runUIExportTest();
  console.log('\nSaving sample exports for frontend integration...');
  const outputDir = saveSampleExports();
  console.log(`Sample files saved to: ${outputDir}`);
}

export { runUIExportTest, saveSampleExports };