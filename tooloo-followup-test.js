#!/usr/bin/env node
/**
 * TooLoo.ai Follow-up Testing Suite
 * Based on comprehensive analysis recommendations
 */

const http = require('http');
const fs = require('fs').promises;

// Advanced follow-up prompts based on initial analysis
const followUpPrompts = [
    {
        id: 'response-optimization',
        prompt: "Implement a response time optimization strategy for TooLoo. Analyze the 77.8s vs 45ms variance and propose specific caching, load balancing, and request prioritization mechanisms.",
        category: 'performance-optimization',
        expectedImprovement: 'reduce response variance by 60%'
    },
    {
        id: 'learning-retention',
        prompt: "Design a cross-session learning retention system that remembers insights from previous tests and applies them to new challenges. Include memory architecture and knowledge transfer protocols.",
        category: 'cognitive-enhancement',
        expectedImprovement: 'improve learning continuity'
    },
    {
        id: 'collaborative-agents',
        prompt: "Create a multi-agent collaboration protocol where you work with another AI to solve complex problems. Demonstrate by co-designing a distributed system architecture with role delegation.",
        category: 'collaboration',
        expectedImprovement: 'enable agent coordination'
    },
    {
        id: 'predictive-difficulty',
        prompt: "Build a prompt difficulty assessment algorithm that predicts response complexity and resource requirements before processing. Include ML model architecture and training approach.",
        category: 'predictive-analysis',
        expectedImprovement: 'proactive resource allocation'
    },
    {
        id: 'real-time-monitoring',
        prompt: "Implement a real-time performance monitoring system for TooLoo that tracks response quality, resource usage, and learning progress. Design dashboards and alerting mechanisms.",
        category: 'monitoring',
        expectedImprovement: 'continuous quality assurance'
    }
];

async function runFollowUpTests() {
    console.log('🎯 Starting TooLoo Follow-up Testing Suite');
    console.log('📊 Running 5 improvement-focused prompts based on analysis\n');

    const startTime = Date.now();
    const results = [];

    try {
        for (let i = 0; i < followUpPrompts.length; i++) {
            const promptData = followUpPrompts[i];
            console.log(`🔄 [${i + 1}/5] Testing: ${promptData.id}`);
            
            const result = await makeRequest(promptData.prompt, i);
            result.category = promptData.category;
            result.expectedImprovement = promptData.expectedImprovement;
            result.id = promptData.id;
            
            results.push(result);
            
            // Brief pause between requests to avoid overwhelming
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const totalTime = Date.now() - startTime;
        const analysis = analyzeFollowUpResults(results, totalTime);
        
        await generateFollowUpReport(results, analysis);
        
        console.log('\n🎉 Follow-up testing completed!');
        console.log('📊 Check test-reports/tooloo-followup-report.md for detailed analysis');
        
        return { results, analysis };
    } catch (error) {
        console.error('❌ Follow-up testing failed:', error);
        throw error;
    }
}

function makeRequest(prompt, index) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ prompt });
        
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/v1/generate',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const startTime = Date.now();
        const req = http.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                const responseTime = Date.now() - startTime;
                try {
                    const result = JSON.parse(responseData);
                    console.log(`   ✅ Completed in ${responseTime}ms`);
                    resolve({
                        index: index + 1,
                        result: result.content,
                        responseTime,
                        success: true,
                        timestamp: new Date().toISOString()
                    });
                } catch (error) {
                    console.log(`   ❌ Parse error: ${error.message}`);
                    resolve({
                        index: index + 1,
                        error: error.message,
                        responseTime,
                        success: false,
                        timestamp: new Date().toISOString()
                    });
                }
            });
        });

        req.on('error', (error) => {
            const responseTime = Date.now() - startTime;
            console.log(`   ❌ Request error: ${error.message}`);
            resolve({
                index: index + 1,
                error: error.message,
                responseTime,
                success: false,
                timestamp: new Date().toISOString()
            });
        });

        req.write(data);
        req.end();
    });
}

function analyzeFollowUpResults(results, totalTime) {
    const successful = results.filter(r => r.success);
    const avgResponseTime = successful.length > 0 ? 
        successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length : 0;

    const improvements = {
        responseTimeConsistency: calculateResponseTimeImprovement(results),
        contentQuality: analyzeContentQuality(successful),
        categoryPerformance: analyzeCategoryPerformance(results),
        overallProgress: calculateOverallProgress(results)
    };

    return {
        successRate: (successful.length / results.length) * 100,
        avgResponseTime,
        totalTime,
        improvements,
        recommendations: generateAdvancedRecommendations(results, improvements)
    };
}

function calculateResponseTimeImprovement(results) {
    const responseTimes = results.filter(r => r.success).map(r => r.responseTime);
    if (responseTimes.length === 0) return null;

    const variance = calculateVariance(responseTimes);
    const previousVariance = calculateVariance([49133, 13666, 75218, 40968, 45, 45485, 75800, 53442, 77841, 53349]);
    
    return {
        currentVariance: variance,
        previousVariance,
        improvement: ((previousVariance - variance) / previousVariance) * 100,
        consistencyScore: 100 - (Math.sqrt(variance) / Math.max(...responseTimes)) * 100
    };
}

function calculateVariance(numbers) {
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    return numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length;
}

function analyzeContentQuality(results) {
    const contentLengths = results.map(r => r.result?.length || 0);
    const avgLength = contentLengths.reduce((a, b) => a + b, 0) / contentLengths.length;
    
    const qualityMetrics = results.map(r => ({
        hasCodeExamples: /```/.test(r.result || ''),
        hasActionableSteps: /\d+\.\s/.test(r.result || ''),
        hasArchitecturalThinking: /system|architecture|design|component/i.test(r.result || ''),
        hasConcreteSolutions: /implement|create|build|develop/i.test(r.result || '')
    }));

    return {
        avgLength,
        codeExampleRate: qualityMetrics.filter(m => m.hasCodeExamples).length / qualityMetrics.length,
        actionableStepsRate: qualityMetrics.filter(m => m.hasActionableSteps).length / qualityMetrics.length,
        architecturalThinkingRate: qualityMetrics.filter(m => m.hasArchitecturalThinking).length / qualityMetrics.length,
        concreteSolutionsRate: qualityMetrics.filter(m => m.hasConcreteSolutions).length / qualityMetrics.length
    };
}

function analyzeCategoryPerformance(results) {
    const categories = {};
    
    results.forEach(result => {
        const category = result.category;
        if (!categories[category]) {
            categories[category] = { total: 0, successful: 0, avgResponseTime: 0, totalTime: 0 };
        }
        categories[category].total++;
        if (result.success) {
            categories[category].successful++;
            categories[category].totalTime += result.responseTime;
        }
    });

    Object.keys(categories).forEach(cat => {
        const data = categories[cat];
        data.successRate = (data.successful / data.total) * 100;
        data.avgResponseTime = data.successful > 0 ? data.totalTime / data.successful : 0;
    });

    return categories;
}

function calculateOverallProgress(results) {
    const successRate = results.filter(r => r.success).length / results.length;
    const avgResponseTime = results.filter(r => r.success).reduce((sum, r) => sum + r.responseTime, 0) / results.filter(r => r.success).length;
    
    // Compare with baseline from initial test
    const baselineSuccessRate = 1.0; // 100% from initial test
    const baselineAvgResponseTime = 48494.7;
    
    return {
        successRateChange: ((successRate - baselineSuccessRate) / baselineSuccessRate) * 100,
        responseTimeChange: ((baselineAvgResponseTime - avgResponseTime) / baselineAvgResponseTime) * 100,
        overallScore: (successRate * 0.4 + (1 - avgResponseTime / 60000) * 0.6) * 100 // Weighted score
    };
}

function generateAdvancedRecommendations(results, improvements) {
    const recommendations = [];
    
    if (improvements.responseTimeConsistency && improvements.responseTimeConsistency.improvement < 30) {
        recommendations.push({
            priority: 'high',
            area: 'response-consistency',
            action: 'Implement adaptive timeout mechanisms and request queuing',
            expectedOutcome: 'Reduce response time variance by 50%'
        });
    }
    
    if (improvements.contentQuality.codeExampleRate < 0.8) {
        recommendations.push({
            priority: 'medium',
            area: 'content-quality',
            action: 'Enhance code example generation and technical depth',
            expectedOutcome: 'Increase practical implementation guidance'
        });
    }
    
    recommendations.push({
        priority: 'strategic',
        area: 'continuous-improvement',
        action: 'Establish automated testing pipeline with weekly optimization cycles',
        expectedOutcome: 'Systematic performance enhancement over time'
    });

    return recommendations;
}

async function generateFollowUpReport(results, analysis) {
    const reportPath = '/workspaces/TooLoo.ai/test-reports';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    const report = `# TooLoo.ai Follow-up Testing Report

## Executive Summary
**Test Date:** ${new Date().toISOString().split('T')[0]}  
**Test Type:** Advanced Capability Assessment  
**Success Rate:** ${analysis.successRate.toFixed(1)}%  
**Average Response Time:** ${analysis.avgResponseTime.toFixed(0)}ms  
**Total Duration:** ${(analysis.totalTime / 1000).toFixed(2)}s  

## Performance Improvements Analysis

### Response Time Consistency
${analysis.improvements.responseTimeConsistency ? `
- **Current Variance:** ${analysis.improvements.responseTimeConsistency.currentVariance.toFixed(0)}
- **Previous Variance:** ${analysis.improvements.responseTimeConsistency.previousVariance.toFixed(0)}
- **Improvement:** ${analysis.improvements.responseTimeConsistency.improvement.toFixed(1)}%
- **Consistency Score:** ${analysis.improvements.responseTimeConsistency.consistencyScore.toFixed(1)}%
` : 'Data insufficient for comparison'}

### Content Quality Metrics
- **Average Length:** ${analysis.improvements.contentQuality.avgLength.toFixed(0)} characters
- **Code Example Rate:** ${(analysis.improvements.contentQuality.codeExampleRate * 100).toFixed(1)}%
- **Actionable Steps Rate:** ${(analysis.improvements.contentQuality.actionableStepsRate * 100).toFixed(1)}%
- **Architectural Thinking:** ${(analysis.improvements.contentQuality.architecturalThinkingRate * 100).toFixed(1)}%
- **Concrete Solutions:** ${(analysis.improvements.contentQuality.concreteSolutionsRate * 100).toFixed(1)}%

### Category Performance
${Object.entries(analysis.improvements.categoryPerformance).map(([cat, data]) => `
**${cat}:**
- Success Rate: ${data.successRate.toFixed(1)}%
- Avg Response Time: ${data.avgResponseTime.toFixed(0)}ms
`).join('')}

### Overall Progress Assessment
- **Success Rate Change:** ${analysis.improvements.overallProgress.successRateChange.toFixed(1)}%
- **Response Time Change:** ${analysis.improvements.overallProgress.responseTimeChange.toFixed(1)}%
- **Overall Score:** ${analysis.improvements.overallProgress.overallScore.toFixed(1)}/100

## Advanced Recommendations

${analysis.recommendations.map((rec, i) => `
### ${i + 1}. ${rec.area.toUpperCase()} (Priority: ${rec.priority})
**Action:** ${rec.action}  
**Expected Outcome:** ${rec.expectedOutcome}
`).join('')}

## Detailed Test Results

${results.map((result, i) => `
### Test ${i + 1}: ${result.id}
- **Category:** ${result.category}
- **Status:** ${result.success ? '✅ Success' : '❌ Failed'}
- **Response Time:** ${result.responseTime}ms
- **Expected Improvement:** ${result.expectedImprovement}
- **Content Length:** ${result.result ? result.result.length : 'N/A'} characters
${result.error ? `- **Error:** ${result.error}` : ''}
`).join('')}

## Next Steps

1. **Immediate (Week 1):**
   - Implement response time optimization mechanisms
   - Deploy real-time monitoring systems
   - Begin automated testing pipeline setup

2. **Short-term (Weeks 2-4):**
   - Enhance cross-session learning retention
   - Develop collaborative agent protocols
   - Deploy predictive difficulty assessment

3. **Long-term (Months 2-3):**
   - Full multi-agent coordination capabilities
   - Advanced performance prediction models
   - Comprehensive self-optimization framework

---
*Generated by TooLoo.ai Follow-up Testing Suite*  
*Report Date: ${new Date().toISOString()}*
`;

    const reportFile = `/workspaces/TooLoo.ai/test-reports/tooloo-followup-report-${timestamp}.md`;
    await fs.writeFile(reportFile, report);
    
    console.log(`📊 Follow-up report saved: ${reportFile}`);
}

// Run follow-up tests if called directly
if (require.main === module) {
    runFollowUpTests().catch(console.error);
}

module.exports = { runFollowUpTests };