// Real-World Testing Harness
// Tests conversation intelligence pipeline with actual conversation exports
// Provides quality feedback and data collection for improvement

import fs from 'fs';
import path from 'path';
const __dirname = path.dirname(import.meta.url.replace('file://', ''));
import { parseConversationFile, validateConversation } from './real-world-parser.js';
import { runPatternExtraction } from '../engine/pattern-extractor.js';
import { computeTraitVector } from '../engine/trait-aggregator.js';
import { composeSnapshot } from '../engine/snapshot-composer.js';
import { exportConversationUI } from './ui-export.js';

/**
 * Test real-world conversation with full pipeline
 * @param {string} filePath - Path to conversation export file
 * @param {Object} options - Testing options
 * @returns {Object} Complete analysis results with feedback prompts
 */
function testRealWorldConversation(filePath, options = {}) {
  const startTime = Date.now();
  
  console.log(`\n🧪 Real-World Conversation Analysis`);
  console.log(`File: ${path.basename(filePath)}`);
  console.log(`==========================================`);
  
  try {
    // Step 1: Parse conversation
    console.log(`📄 Parsing conversation...`);
    const conversation = parseConversationFile(filePath, options.format);
    const parseTime = Date.now() - startTime;
    
    console.log(`  Platform: ${conversation.metadata.platform}`);
    console.log(`  Messages: ${conversation.metadata.messageCount}`);
    console.log(`  Participants: ${conversation.metadata.participantCount}`);
    console.log(`  Parse time: ${parseTime}ms`);
    
    // Step 2: Validate quality
    console.log(`\n🔍 Quality validation...`);
    const validation = validateConversation(conversation);
    console.log(`  Quality score: ${validation.quality}/1.0`);
    console.log(`  Valid for analysis: ${validation.valid ? '✅' : '❌'}`);
    
    if (validation.issues.length > 0) {
      console.log(`  Issues:`);
      validation.issues.forEach(issue => console.log(`    • ${issue}`));
    }
    
    if (!validation.valid && !options.forceAnalysis) {
      return {
        success: false,
        validation,
        conversation,
        parseTime
      };
    }
    
    // Step 3: Run full pipeline
    console.log(`\n⚙️ Running cognitive analysis pipeline...`);
    const pipelineStart = Date.now();
    
    // Pattern extraction
    console.log(`  🔍 Extracting patterns...`);
    const patterns = runPatternExtraction(conversation.messages, conversation.segments);
    console.log(`    Patterns detected: ${patterns.length}`);
    
    // Trait synthesis
    console.log(`  🧠 Computing cognitive traits...`);
    const traits = computeTraitVector(patterns);
    const traitSummary = Object.entries(traits).map(([trait, value]) => 
      `${trait}: ${Math.round(value * 100)}%`
    ).join(', ');
    console.log(`    Traits: ${traitSummary}`);
    
    // Snapshot assembly
    console.log(`  📊 Assembling cognitive snapshot...`);
    const snapshot = composeSnapshot({
      messages: conversation.messages,
      segments: conversation.segments,
      patterns,
      traits
    }, {
      processingTime: Date.now() - pipelineStart,
      scoringSpecVersion: '0.1.0'
    });
    
    // UI export generation
    console.log(`  🎨 Generating UI exports...`);
    const uiExports = exportConversationUI(conversation, ['dashboard', 'summary']);
    
    const totalTime = Date.now() - startTime;
    console.log(`  Pipeline time: ${snapshot.metadata.processingTime}ms`);
    console.log(`  Total time: ${totalTime}ms`);
    
    // Step 4: Present results
    console.log(`\n📋 Analysis Results:`);
    console.log(`  Conversation style: ${snapshot.summary.conversationStyle}`);
    console.log(`  Dominant trait: ${snapshot.summary.dominantTrait}`);
    console.log(`  Total insights: ${snapshot.summary.totalInsights}`);
    console.log(`  Recommendations: ${snapshot.recommendations.length}`);
    
    // Top patterns
    if (snapshot.patterns.length > 0) {
      console.log(`\n🎯 Top Detected Patterns:`);
      snapshot.patterns.slice(0, 5).forEach((pattern, i) => {
        console.log(`  ${i + 1}. ${pattern.id} (confidence: ${Math.round(pattern.confidence * 100)}%)`);
      });
    }
    
    // Trait breakdown
    console.log(`\n🧠 Cognitive Profile:`);
    Object.entries(snapshot.traits).forEach(([trait, data]) => {
      const percentage = Math.round(data.value * 100);
      const bar = '█'.repeat(Math.floor(percentage / 10)) + '░'.repeat(10 - Math.floor(percentage / 10));
      console.log(`  ${trait}: ${bar} ${percentage}% (${data.interpretation})`);
    });
    
    // Recommendations
    if (snapshot.recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`);
      snapshot.recommendations.forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec.message} (${rec.priority} priority)`);
      });
    }
    
    // Step 5: Feedback collection prompts
    console.log(`\n📝 Quality Feedback Collection:`);
    const feedbackQuestions = generateFeedbackQuestions(snapshot, conversation);
    feedbackQuestions.forEach((question, i) => {
      console.log(`  ${i + 1}. ${question}`);
    });
    
    return {
      success: true,
      conversation,
      validation,
      snapshot,
      uiExports,
      performance: {
        parseTime,
        pipelineTime: snapshot.metadata.processingTime,
        totalTime
      },
      feedbackQuestions
    };
    
  } catch (error) {
    console.log(`\n❌ Analysis failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      parseTime: Date.now() - startTime
    };
  }
}

/**
 * Generate feedback questions for quality assessment
 */
function generateFeedbackQuestions(snapshot, conversation) {
  const questions = [
    "Does the conversation style accurately reflect the actual interaction?",
    "Are the detected patterns meaningful and relevant to the conversation?",
    "Do the cognitive traits match your understanding of the participants?",
    "Which detected patterns are most/least accurate?",
    "What important behavioral patterns were missed?"
  ];
  
  // Add specific questions based on results
  if (snapshot.patterns.length === 0) {
    questions.push("Were there conversational patterns you expected to be detected?");
  }
  
  if (snapshot.summary.totalInsights > 10) {
    questions.push("Are there too many insights, making the analysis overwhelming?");
  }
  
  if (conversation.metadata.participantCount > 2) {
    questions.push("How well does the analysis handle multi-participant dynamics?");
  }
  
  return questions;
}

/**
 * Test multiple real-world conversations from a directory
 */
function testRealWorldBatch(directoryPath, options = {}) {
  const files = fs.readdirSync(directoryPath)
    .filter(file => file.match(/\.(json|txt|log)$/))
    .map(file => path.join(directoryPath, file));
  
  console.log(`\n🧪 Batch Real-World Testing`);
  console.log(`Directory: ${directoryPath}`);
  console.log(`Files found: ${files.length}`);
  console.log(`==========================================`);
  
  const results = [];
  
  for (const filePath of files) {
    const result = testRealWorldConversation(filePath, options);
    results.push({
      file: path.basename(filePath),
      ...result
    });
    
    // Brief pause between tests
    if (options.pauseBetween) {
      console.log(`\n⏸️ Press Enter to continue to next file...`);
      // In real implementation, would wait for user input
    }
  }
  
  // Batch summary
  console.log(`\n📊 Batch Test Summary:`);
  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;
  
  console.log(`  Files processed: ${results.length}`);
  console.log(`  Successful: ${successful}`);
  console.log(`  Failed: ${failed}`);
  
  if (successful > 0) {
    const avgQuality = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.validation.quality, 0) / successful;
    
    const avgPatterns = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.snapshot.patterns.length, 0) / successful;
      
    console.log(`  Average quality: ${Math.round(avgQuality * 100)}%`);
    console.log(`  Average patterns: ${Math.round(avgPatterns)}`);
  }
  
  return results;
}

/**
 * Save test results for analysis and improvement
 */
function saveTestResults(results, outputPath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `real-world-test-${timestamp}.json`;
  const fullPath = path.join(outputPath, filename);
  
  // Anonymize data before saving
  const anonymizedResults = {
    timestamp: new Date().toISOString(),
    testCount: Array.isArray(results) ? results.length : 1,
    results: Array.isArray(results) ? results : [results],
    summary: {
      successRate: Array.isArray(results) 
        ? results.filter(r => r.success).length / results.length
        : results.success ? 1 : 0,
      avgQuality: Array.isArray(results)
        ? results.filter(r => r.success).reduce((sum, r) => sum + (r.validation?.quality || 0), 0) / results.filter(r => r.success).length
        : results.validation?.quality || 0
    }
  };
  
  // Remove sensitive data
  anonymizedResults.results.forEach(result => {
    if (result.conversation) {
      // Keep only metadata, remove actual message content
      result.conversation = {
        metadata: result.conversation.metadata,
        messageCount: result.conversation.messages?.length || 0
      };
    }
  });
  
  fs.writeFileSync(fullPath, JSON.stringify(anonymizedResults, null, 2));
  console.log(`\n💾 Test results saved: ${fullPath}`);
  
  return fullPath;
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const filePath = args[0];
  
  if (!filePath) {
    console.log('Usage: node real-world-test.js <file-path> [options]');
    console.log('       node real-world-test.js <directory-path> --batch');
    process.exit(1);
  }
  
  const options = {
    format: args.includes('--format') ? args[args.indexOf('--format') + 1] : 'auto',
    forceAnalysis: args.includes('--force'),
    pauseBetween: args.includes('--pause')
  };
  
  if (args.includes('--batch')) {
    const results = testRealWorldBatch(filePath, options);
    saveTestResults(results, './output');
  } else {
    const result = testRealWorldConversation(filePath, options);
    saveTestResults(result, './output');
  }
}

export { 
  testRealWorldConversation, 
  testRealWorldBatch, 
  saveTestResults,
  generateFeedbackQuestions
};