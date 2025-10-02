#!/usr/bin/env node
/**
 * TooLoo.ai Simple Parallel Self-Improvement Test
 */

const https = require('https');
const http = require('http');
const fs = require('fs').promises;
const path = require('path');

// Self-improvement prompts
const prompts = [
    "Review your last 5 decisions in this session and identify three patterns or biases; propose concrete changes to improve your future decision-making.",
    "Here's a buggy code snippet. Fix it: function calculateTotal(items) { let total = 0; for (let i = 0; i <= items.length; i++) { total += items[i].price; } return total; }",
    "Design a new feature for the basketball-English coach app that adapts in real-time to user performance data; outline architecture, data flows and a learning loop.",
    "Teach yourself Svelte by generating a minimal tutorial and implementing a 'Hello World' example—then explain what you learned.",
    "Analyze your prompt-to-code conversion rate over the last 10 generate calls. Where did you go off track? Propose prompt-engineering strategies to improve.",
    "Refactor a selected module in the core engine to use functional programming principles; explain the benefits and how this exercise taught you new design patterns.",
    "Create and run a set of unit and integration tests for the Environment Hub; then reflect on how testing improved your reliability.",
    "Simulate collaborating with a second agent: assign roles, exchange messages to co-design a new API endpoint, and summarize what you learned.",
    "Given telemetry data on your CPU, memory and response times, identify performance bottlenecks in your code and suggest optimizations.",
    "Draft a 4-week self-improvement roadmap for yourself, listing topics, experiments and metrics you'll track."
];

// Simple HTTP request function
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
                    console.log(`✅ [${index + 1}/10] Completed in ${responseTime}ms`);
                    resolve({
                        index: index + 1,
                        prompt: prompt.substring(0, 50) + '...',
                        result: result.content,
                        responseTime,
                        success: true,
                        timestamp: new Date().toISOString()
                    });
                } catch (error) {
                    console.log(`❌ [${index + 1}/10] Parse error: ${error.message}`);
                    resolve({
                        index: index + 1,
                        prompt: prompt.substring(0, 50) + '...',
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
            console.log(`❌ [${index + 1}/10] Request error: ${error.message}`);
            resolve({
                index: index + 1,
                prompt: prompt.substring(0, 50) + '...',
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

async function runParallelTest() {
    console.log('🚀 Starting TooLoo Parallel Self-Improvement Test');
    console.log('📊 Testing 10 improvement prompts concurrently\n');

    const startTime = Date.now();
    
    try {
        const results = await Promise.all(
            prompts.map((prompt, index) => makeRequest(prompt, index))
        );

        const totalTime = Date.now() - startTime;
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        const avgResponseTime = successful.length > 0 ? 
            successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length : 0;

        console.log(`\n🎉 Parallel test completed in ${totalTime}ms`);
        console.log(`✅ Successful: ${successful.length}/10`);
        console.log(`❌ Failed: ${failed.length}/10`);
        console.log(`⏱️ Avg Response Time: ${avgResponseTime.toFixed(2)}ms`);

        // Generate report
        const report = {
            testInfo: {
                timestamp: new Date().toISOString(),
                totalPrompts: 10,
                duration: totalTime,
                apiEndpoint: 'http://localhost:3001/api/v1/generate'
            },
            summary: {
                successful: successful.length,
                failed: failed.length,
                successRate: (successful.length / 10) * 100,
                avgResponseTime: avgResponseTime,
                totalContentGenerated: successful.reduce((sum, r) => sum + (r.result?.length || 0), 0)
            },
            results: results,
            decisions: {
                patterns: analyzePatterns(results),
                biases: identifyBiases(results),
                recommendations: generateRecommendations(results)
            }
        };

        // Save report
        const reportPath = '/workspaces/TooLoo.ai/test-reports';
        try {
            await fs.mkdir(reportPath, { recursive: true });
        } catch {}
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportFile = path.join(reportPath, `tooloo-test-${timestamp}.json`);
        await fs.writeFile(reportFile, JSON.stringify(report, null, 2));

        // Generate summary
        const summaryFile = path.join(reportPath, `tooloo-summary-${timestamp}.md`);
        await fs.writeFile(summaryFile, generateSummary(report));

        console.log(`\n📊 Reports saved:`);
        console.log(`📄 ${reportFile}`);
        console.log(`📋 ${summaryFile}`);

        // Display key insights
        console.log('\n🧠 Key Insights:');
        report.decisions.patterns.forEach(pattern => {
            console.log(`  • ${pattern}`);
        });
        
        console.log('\n⚠️ Identified Biases:');
        report.decisions.biases.forEach(bias => {
            console.log(`  • ${bias}`);
        });

        console.log('\n💡 Recommendations:');
        report.decisions.recommendations.forEach(rec => {
            console.log(`  • ${rec}`);
        });

        return report;
    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    }
}

function analyzePatterns(results) {
    const patterns = [];
    const successful = results.filter(r => r.success);
    
    if (successful.length > 0) {
        const responseTimes = successful.map(r => r.responseTime);
        const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        const minTime = Math.min(...responseTimes);
        const maxTime = Math.max(...responseTimes);
        
        patterns.push(`Response time range: ${minTime}ms - ${maxTime}ms (avg: ${avgTime.toFixed(0)}ms)`);
        
        if (maxTime > avgTime * 2) {
            patterns.push('High variance in response times detected');
        }
        
        const contentLengths = successful.map(r => r.result?.length || 0);
        const avgContent = contentLengths.reduce((a, b) => a + b, 0) / contentLengths.length;
        patterns.push(`Average response length: ${avgContent.toFixed(0)} characters`);
    }
    
    return patterns;
}

function identifyBiases(results) {
    const biases = [];
    const successful = results.filter(r => r.success);
    
    if (successful.length < results.length * 0.8) {
        biases.push('Low success rate may indicate processing difficulties with complex prompts');
    }
    
    const responseTimes = successful.map(r => r.responseTime);
    if (responseTimes.length > 0) {
        const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        const fastResponses = responseTimes.filter(t => t < avgTime * 0.5).length;
        
        if (fastResponses > successful.length * 0.4) {
            biases.push('Speed bias: May be prioritizing quick responses over thorough analysis');
        }
    }
    
    return biases;
}

function generateRecommendations(results) {
    const recommendations = [];
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    if (failed.length > 0) {
        recommendations.push(`Investigate ${failed.length} failed requests to improve reliability`);
    }
    
    if (successful.length > 0) {
        const avgTime = successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length;
        if (avgTime > 3000) {
            recommendations.push('Consider optimization to reduce response times below 3 seconds');
        }
    }
    
    recommendations.push('Run follow-up tests to validate suggested improvements');
    recommendations.push('Implement automated performance monitoring for continuous improvement');
    
    return recommendations;
}

function generateSummary(report) {
    return `# TooLoo.ai Self-Improvement Test Report

## Test Overview
- **Date**: ${report.testInfo.timestamp}
- **Duration**: ${(report.testInfo.duration / 1000).toFixed(2)} seconds
- **Success Rate**: ${report.summary.successRate.toFixed(1)}%
- **Average Response Time**: ${report.summary.avgResponseTime.toFixed(0)}ms

## Performance Analysis
- **Successful Requests**: ${report.summary.successful}/${report.testInfo.totalPrompts}
- **Total Content Generated**: ${(report.summary.totalContentGenerated / 1000).toFixed(1)}K characters

## Decision Patterns
${report.decisions.patterns.map(p => `- ${p}`).join('\n')}

## Identified Biases
${report.decisions.biases.map(b => `- ${b}`).join('\n')}

## Recommendations
${report.decisions.recommendations.map(r => `- ${r}`).join('\n')}

## Detailed Results
${report.results.map(r => `
### Prompt ${r.index}
- **Status**: ${r.success ? '✅ Success' : '❌ Failed'}
- **Response Time**: ${r.responseTime}ms
- **Content Length**: ${r.result ? r.result.length : 'N/A'} chars
${r.error ? `- **Error**: ${r.error}` : ''}
`).join('\n')}

---
*Generated by TooLoo.ai Parallel Testing Framework*
`;
}

// Run the test
if (require.main === module) {
    runParallelTest().catch(console.error);
}

module.exports = { runParallelTest };