#!/usr/bin/env node

// TooLoo.ai Benchmark Runner
// Automated evaluation system for accuracy and calibration testing

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BenchmarkRunner {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3001';
    this.outputDir = options.outputDir || path.join(__dirname, '../runs');
    this.verbose = options.verbose || false;
  }

  async runBenchmarkSuite(suiteNames = ['basic-segmentation']) {
    console.log('🧪 Starting TooLoo.ai Benchmark Suite');
    
    const runId = `run_${Date.now()}`;
    const runDir = path.join(this.outputDir, runId);
    
    // Create output directory
    if (!fs.existsSync(runDir)) {
      fs.mkdirSync(runDir, { recursive: true });
    }

    const results = {
      runId,
      timestamp: new Date().toISOString(),
      suites: {},
      summary: {}
    };

    // Run each benchmark suite
    for (const suiteName of suiteNames) {
      console.log(`\n📊 Running ${suiteName} benchmark...`);
      try {
        const suiteResult = await this.runSuite(suiteName);
        results.suites[suiteName] = suiteResult;
        console.log(`✅ ${suiteName}: ${suiteResult.accuracy.toFixed(2)}% accuracy`);
      } catch (error) {
        console.error(`❌ ${suiteName} failed:`, error.message);
        results.suites[suiteName] = { error: error.message };
      }
    }

    // Calculate summary metrics
    results.summary = this.calculateSummary(results.suites);
    
    // Save results
    const resultFile = path.join(runDir, 'results.json');
    fs.writeFileSync(resultFile, JSON.stringify(results, null, 2));
    
    // Generate report
    this.generateReport(results, runDir);
    
    console.log(`\n📈 Benchmark complete! Results saved to: ${runDir}`);
    console.log(`📋 Overall accuracy: ${results.summary.accuracy.toFixed(2)}%`);
    
    return results;
  }

  async runSuite(suiteName) {
    const suiteFile = path.join(__dirname, '../benchmarks', `${suiteName}.json`);
    
    if (!fs.existsSync(suiteFile)) {
      throw new Error(`Benchmark suite not found: ${suiteName}`);
    }

    const suite = JSON.parse(fs.readFileSync(suiteFile, 'utf8'));
    const results = {
      name: suiteName,
      total: suite.cases.length,
      correct: 0,
      errors: [],
      predictions: [],
      confidence_scores: [],
      response_times: []
    };

    // Process each test case
    for (let i = 0; i < suite.cases.length; i++) {
      const testCase = suite.cases[i];
      if (this.verbose) {
        console.log(`  Processing case ${i + 1}/${suite.cases.length}: ${testCase.id}`);
      }

      try {
        const startTime = Date.now();
        const prediction = await this.makePrediction(testCase);
        const responseTime = Date.now() - startTime;
        
        const isCorrect = this.evaluatePrediction(prediction, testCase.expected);
        
        results.predictions.push({
          id: testCase.id,
          prediction,
          expected: testCase.expected,
          correct: isCorrect,
          confidence: prediction.confidence || 0.5,
          responseTime
        });

        results.confidence_scores.push(prediction.confidence || 0.5);
        results.response_times.push(responseTime);
        
        if (isCorrect) {
          results.correct++;
        } else {
          results.errors.push({
            id: testCase.id,
            prediction: prediction.result,
            expected: testCase.expected.result,
            confidence: prediction.confidence
          });
        }
        
      } catch (error) {
        console.error(`  Error in case ${testCase.id}:`, error.message);
        results.errors.push({
          id: testCase.id,
          error: error.message
        });
      }
    }

    // Calculate metrics
    results.accuracy = (results.correct / results.total) * 100;
    results.avg_confidence = results.confidence_scores.reduce((a, b) => a + b, 0) / results.confidence_scores.length || 0;
    results.avg_response_time = results.response_times.reduce((a, b) => a + b, 0) / results.response_times.length || 0;
    results.calibration = this.calculateCalibration(results.predictions);

    return results;
  }

  async makePrediction(testCase) {
    const endpoint = testCase.endpoint || '/api/v1/analyze-text';
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCase.input)
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  evaluatePrediction(prediction, expected) {
    // Simple evaluation - can be made more sophisticated
    if (expected.type === 'segments') {
      const predSegments = prediction.segments?.length || 0;
      const expectedSegments = expected.segments;
      const tolerance = expected.tolerance || 1;
      
      return Math.abs(predSegments - expectedSegments) <= tolerance;
    }

    if (expected.type === 'exact') {
      return prediction.result === expected.result;
    }

    if (expected.type === 'contains') {
      return prediction.result?.includes(expected.result);
    }

    return false;
  }

  calculateCalibration(predictions) {
    // Calculate Brier score for calibration
    let brierScore = 0;
    let validPredictions = 0;

    for (const pred of predictions) {
      if (typeof pred.confidence === 'number') {
        const outcome = pred.correct ? 1 : 0;
        brierScore += Math.pow(pred.confidence - outcome, 2);
        validPredictions++;
      }
    }

    return validPredictions > 0 ? brierScore / validPredictions : null;
  }

  calculateSummary(suites) {
    let totalCases = 0;
    let totalCorrect = 0;
    let allConfidenceScores = [];
    let allResponseTimes = [];

    Object.values(suites).forEach(suite => {
      if (!suite.error) {
        totalCases += suite.total;
        totalCorrect += suite.correct;
        allConfidenceScores.push(...(suite.confidence_scores || []));
        allResponseTimes.push(...(suite.response_times || []));
      }
    });

    return {
      accuracy: totalCases > 0 ? (totalCorrect / totalCases) * 100 : 0,
      total_cases: totalCases,
      correct_cases: totalCorrect,
      avg_confidence: allConfidenceScores.reduce((a, b) => a + b, 0) / allConfidenceScores.length || 0,
      avg_response_time: allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length || 0,
      suites_run: Object.keys(suites).length,
      suites_passed: Object.values(suites).filter(s => !s.error).length
    };
  }

  generateReport(results, outputDir) {
    const report = this.formatReport(results);
    const reportFile = path.join(outputDir, 'report.md');
    fs.writeFileSync(reportFile, report);
  }

  formatReport(results) {
    return `# TooLoo.ai Benchmark Report

**Run ID**: ${results.runId}  
**Timestamp**: ${results.timestamp}

## Summary

- **Overall Accuracy**: ${results.summary.accuracy.toFixed(2)}%
- **Total Cases**: ${results.summary.total_cases}
- **Correct Cases**: ${results.summary.correct_cases}
- **Average Confidence**: ${results.summary.avg_confidence.toFixed(3)}
- **Average Response Time**: ${results.summary.avg_response_time.toFixed(0)}ms
- **Suites Run**: ${results.summary.suites_run}

## Suite Results

${Object.entries(results.suites).map(([name, suite]) => {
  if (suite.error) {
    return `### ${name}
❌ **Failed**: ${suite.error}`;
  }
  
  return `### ${name}
- **Accuracy**: ${suite.accuracy.toFixed(2)}% (${suite.correct}/${suite.total})
- **Average Confidence**: ${suite.avg_confidence.toFixed(3)}
- **Average Response Time**: ${suite.avg_response_time.toFixed(0)}ms
- **Calibration (Brier)**: ${suite.calibration?.toFixed(3) || 'N/A'}
- **Errors**: ${suite.errors.length}`;
}).join('\n\n')}

## Error Analysis

${Object.entries(results.suites).map(([name, suite]) => {
  if (suite.error || !suite.errors.length) return '';
  
  return `### ${name} Errors
${suite.errors.slice(0, 5).map(error => 
    `- **${error.id}**: Expected "${error.expected}", got "${error.prediction}" (confidence: ${error.confidence || 'N/A'})`
  ).join('\n')}`;
}).join('\n\n')}

---
*Generated by TooLoo.ai Benchmark Runner*`;
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options = {};
  let suiteNames = ['basic-segmentation'];

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--verbose' || args[i] === '-v') {
      options.verbose = true;
    } else if (args[i] === '--base-url') {
      options.baseUrl = args[++i];
    } else if (args[i] === '--output') {
      options.outputDir = args[++i];
    } else if (args[i] === '--suite') {
      suiteNames = [args[++i]];
    }
  }

  const runner = new BenchmarkRunner(options);
  runner.runBenchmarkSuite(suiteNames)
    .then(results => {
      process.exit(results.summary.accuracy >= 75 ? 0 : 1);
    })
    .catch(error => {
      console.error('Benchmark runner failed:', error);
      process.exit(1);
    });
}

export default BenchmarkRunner;