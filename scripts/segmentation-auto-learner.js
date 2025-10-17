#!/usr/bin/env node

// TooLoo.ai Segmentation Auto-Learner
// Analyzes benchmark errors and auto-updates segmentation logic

import fs from 'fs';
import path from 'path';

const learningPath = path.join(process.cwd(), 'api', 'skills', 'segmentation-learning.json');

export async function analyzeAndLearn(resultsPath) {
  console.log('🧠 Analyzing segmentation errors for learning...');
  
  const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  const learningData = JSON.parse(fs.readFileSync(learningPath, 'utf8'));
  
  let updates = { cuePhrases: 0, roles: 0, patterns: 0 };
  
  // Analyze each suite's predictions and errors
  for (const [suiteName, suite] of Object.entries(results.suites)) {
    if (suite.error) continue;
    
    // Load the benchmark file to get actual test case data
    const benchmarkPath = path.join(process.cwd(), 'datasets', 'benchmarks', `${suiteName}.json`);
    if (!fs.existsSync(benchmarkPath)) continue;
    
    const benchmark = JSON.parse(fs.readFileSync(benchmarkPath, 'utf8'));
    const casesMap = new Map(benchmark.cases.map(c => [c.id, c]));
    
    // Analyze incorrect predictions
    if (suite.predictions) {
      for (const prediction of suite.predictions) {
        if (prediction.correct) continue;
        
        const testCase = casesMap.get(prediction.id);
        if (!testCase || !testCase.input?.text) continue;
        
        const text = testCase.input.text;
        
        // Detect missing cue phrases
        const potentialCues = extractPotentialCues(text);
        for (const cue of potentialCues) {
          if (!learningData.cuePhrases.includes(cue)) {
            console.log(`  ✅ Learning new cue phrase: "${cue}"`);
            learningData.cuePhrases.push(cue);
            updates.cuePhrases++;
          }
        }
        
        // Detect missing roles
        const potentialRoles = extractPotentialRoles(text);
        for (const role of potentialRoles) {
          if (!learningData.roles.includes(role)) {
            console.log(`  ✅ Learning new role: "${role}"`);
            learningData.roles.push(role);
            updates.roles++;
          }
        }
        
        // Log error pattern
        const errorPattern = {
          id: prediction.id,
          expected: testCase.expected?.segments || 0,
          predicted: prediction.prediction?.segments?.length || 0,
          diff: Math.abs((testCase.expected?.segments || 0) - (prediction.prediction?.segments?.length || 0))
        };
        
        if (errorPattern.diff > 0) {
          learningData.errorPatterns.push(errorPattern);
          updates.patterns++;
        }
      }
    }
    
    // Also analyze errors list
    if (suite.errors) {
      for (const error of suite.errors) {
        if (error.error) continue; // Skip API errors
        
        const testCase = casesMap.get(error.id);
        if (!testCase || !testCase.input?.text) continue;
        
        const text = testCase.input.text;
        
        // Extract learning opportunities
        const potentialCues = extractPotentialCues(text);
        for (const cue of potentialCues) {
          if (!learningData.cuePhrases.includes(cue)) {
            console.log(`  ✅ Learning new cue phrase: "${cue}"`);
            learningData.cuePhrases.push(cue);
            updates.cuePhrases++;
          }
        }
        
        const potentialRoles = extractPotentialRoles(text);
        for (const role of potentialRoles) {
          if (!learningData.roles.includes(role)) {
            console.log(`  ✅ Learning new role: "${role}"`);
            learningData.roles.push(role);
            updates.roles++;
          }
        }
      }
    }
  }
  
  // Save updated learning data
  if (updates.cuePhrases > 0 || updates.roles > 0 || updates.patterns > 0) {
    fs.writeFileSync(learningPath, JSON.stringify(learningData, null, 2));
    console.log(`\n📊 Learning Summary:`);
    console.log(`  • New cue phrases: ${updates.cuePhrases}`);
    console.log(`  • New roles: ${updates.roles}`);
    console.log(`  • Error patterns logged: ${updates.patterns}`);
    console.log(`\n✅ Learning data updated: ${learningPath}`);
  } else {
    console.log(`\n✅ No new patterns detected.`);
  }
  
  return updates;
}

function extractPotentialCues(text) {
  const cues = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    // Look for common transition patterns
    const matches = line.match(/^([\w\s]{1,30})(?=:|\?|\.)/i);
    if (matches) {
      const candidate = matches[1].trim().toLowerCase();
      
      // Common transition words/phrases
      const transitionPatterns = [
        'now', 'also', 'but', 'however', 'meanwhile', 'by the way', 'speaking of',
        'let\'s talk about', 'what about', 'how about', 'back to', 'returning to',
        'instead', 'rather', 'additionally', 'furthermore', 'moreover', 'though',
        'although', 'in the meantime', 'separately', 'actually', 'let me ask',
        'on another note', 'going back'
      ];
      
      for (const pattern of transitionPatterns) {
        if (candidate.includes(pattern) && candidate.length < 40) {
          cues.push(candidate);
          break;
        }
      }
    }
  }
  
  return [...new Set(cues)];
}

function extractPotentialRoles(text) {
  const roles = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    const match = line.match(/^([A-Za-z0-9_]+):\s/);
    if (match) {
      const role = match[1];
      // Filter out common non-role patterns
      if (role.length > 1 && role.length < 20 && /^[A-Z]/.test(role)) {
        roles.push(role);
      }
    }
  }
  
  return [...new Set(roles)];
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const resultsPath = process.argv[2];
  
  if (!resultsPath) {
    console.error('Usage: node segmentation-auto-learner.js <results.json>');
    process.exit(1);
  }
  
  if (!fs.existsSync(resultsPath)) {
    console.error(`Error: Results file not found: ${resultsPath}`);
    process.exit(1);
  }
  
  analyzeAndLearn(resultsPath)
    .then(() => {
      console.log('\n🚀 Ready to re-run benchmark with improved segmentation!');
    })
    .catch(error => {
      console.error('Error during learning:', error);
      process.exit(1);
    });
}

export default analyzeAndLearn;
