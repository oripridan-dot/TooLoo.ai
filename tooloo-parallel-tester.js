#!/usr/bin/env node
/**
 * TooLoo.ai Parallel Self-Improvement Testing Framework
 * Tests TooLoo's ability to enhance itself through concurrent prompts
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

class TooLooParallelTester {
    constructor() {
        this.apiUrl = 'http://localhost:3001/api/v1/generate';
        this.results = [];
        this.decisions = [];
        this.startTime = Date.now();
        this.reportPath = '/workspaces/TooLoo.ai/test-reports';
    }

    // Self-improvement prompts for TooLoo
    selfImprovementPrompts = [
        {
            id: 'decision-analysis',
            prompt: "Review your last 5 decisions in this session and identify three patterns or biases; propose concrete changes to improve your future decision-making.",
            category: 'metacognition'
        },
        {
            id: 'bug-diagnosis',
            prompt: "Here's a small buggy code snippet (paste below). Diagnose the root cause, fix it, and explain how you learned from this error to avoid similar bugs.\n\n```js\nfunction calculateTotal(items) {\n    let total = 0;\n    for (let i = 0; i <= items.length; i++) {\n        total += items[i].price;\n    }\n    return total;\n}\n```",
            category: 'debugging'
        },
        {
            id: 'adaptive-feature',
            prompt: "Design a new feature for the basketball-English coach app that adapts in real-time to user performance data; outline architecture, data flows and a learning loop.",
            category: 'architecture'
        },
        {
            id: 'framework-learning',
            prompt: "Teach yourself a new JavaScript framework (e.g. Svelte) by generating a minimal tutorial and implementing a 'Hello World' example—then explain what you learned.",
            category: 'learning'
        },
        {
            id: 'prompt-analysis',
            prompt: "Analyze your prompt-to-code conversion rate over the last 10 generate calls. Where did you go off track? Propose prompt-engineering strategies to improve.",
            category: 'optimization'
        },
        {
            id: 'functional-refactor',
            prompt: "Refactor a selected module in the core engine to use functional programming principles; explain the benefits and how this exercise taught you new design patterns.",
            category: 'refactoring'
        },
        {
            id: 'testing-suite',
            prompt: "Create and run a set of unit and integration tests for the Environment Hub; then reflect on how testing improved your reliability and what you'll do differently next time.",
            category: 'testing'
        },
        {
            id: 'multi-agent',
            prompt: "Simulate collaborating with a second agent: assign roles, exchange messages to co-design a new API endpoint, and summarize what you learned from the multi-agent process.",
            category: 'collaboration'
        },
        {
            id: 'performance-optimization',
            prompt: "Given telemetry data on your CPU, memory and response times, identify performance bottlenecks in your code, suggest optimizations, and explain how you'd incorporate that learning.",
            category: 'performance'
        },
        {
            id: 'roadmap-creation',
            prompt: "Draft a 4-week self-improvement roadmap for yourself, listing topics, experiments and metrics you'll track; after each week, give a progress report on what you learned and what to adjust.",
            category: 'planning'
        }
    ];

    async ensureReportDirectory() {
        try {
            await fs.mkdir(this.reportPath, { recursive: true });
        } catch (error) {
            console.log('Report directory exists or created');
        }
    }

    async executeParallelTest() {
        console.log('🚀 Starting TooLoo Parallel Self-Improvement Test');
        console.log(`📊 Testing ${this.selfImprovementPrompts.length} improvement prompts concurrently\n`);

        const startTime = Date.now();
        
        try {
            // Execute all prompts in parallel
            const responses = await Promise.all(
                this.selfImprovementPrompts.map(async (promptData, index) => {
                    const requestStart = Date.now();
                    
                    try {
                        const response = await fetch(this.apiUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                prompt: promptData.prompt,
                                context: {
                                    testId: promptData.id,
                                    category: promptData.category,
                                    parallelTest: true
                                }
                            })
                        });

                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                        }

                        const result = await response.json();
                        const responseTime = Date.now() - requestStart;

                        console.log(`✅ [${index + 1}/${this.selfImprovementPrompts.length}] ${promptData.id} completed in ${responseTime}ms`);

                        return {
                            ...promptData,
                            result: result.content,
                            metadata: result.metadata,
                            responseTime,
                            success: true,
                            timestamp: new Date().toISOString()
                        };
                    } catch (error) {
                        const responseTime = Date.now() - requestStart;
                        console.error(`❌ [${index + 1}/${this.selfImprovementPrompts.length}] ${promptData.id} failed: ${error.message}`);
                        
                        return {
                            ...promptData,
                            result: null,
                            error: error.message,
                            responseTime,
                            success: false,
                            timestamp: new Date().toISOString()
                        };
                    }
                })
            );

            const totalTime = Date.now() - startTime;
            this.results = responses;
            
            console.log(`\n🎉 Parallel test completed in ${totalTime}ms`);
            
            // Analyze results and generate reports
            await this.analyzeResults();
            await this.generateReports();
            
            return this.results;
        } catch (error) {
            console.error('❌ Parallel test failed:', error);
            throw error;
        }
    }

    analyzeResults() {
        const successful = this.results.filter(r => r.success);
        const failed = this.results.filter(r => !r.success);
        const avgResponseTime = successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length;
        
        // Extract decision patterns from responses
        this.decisions = successful.map(result => ({
            category: result.category,
            promptId: result.id,
            responseLength: result.result?.length || 0,
            responseTime: result.responseTime,
            hasCodeExamples: /```/.test(result.result || ''),
            hasConcretePlans: /\d+\.\s/.test(result.result || ''),
            mentionsLearning: /learn|improve|better|enhance/i.test(result.result || '')
        }));

        console.log('\n📈 Analysis Results:');
        console.log(`✅ Successful: ${successful.length}/${this.results.length}`);
        console.log(`❌ Failed: ${failed.length}/${this.results.length}`);
        console.log(`⏱️ Avg Response Time: ${avgResponseTime.toFixed(2)}ms`);
        console.log(`📝 Total Content Generated: ${successful.reduce((sum, r) => sum + (r.result?.length || 0), 0)} chars`);
    }

    async generateReports() {
        await this.ensureReportDirectory();
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // Generate comprehensive test report
        const testReport = {
            testInfo: {
                timestamp,
                totalPrompts: this.selfImprovementPrompts.length,
                duration: Date.now() - this.startTime,
                apiEndpoint: this.apiUrl
            },
            summary: {
                successful: this.results.filter(r => r.success).length,
                failed: this.results.filter(r => !r.success).length,
                avgResponseTime: this.results.filter(r => r.success)
                    .reduce((sum, r) => sum + r.responseTime, 0) / 
                    this.results.filter(r => r.success).length,
                totalContentGenerated: this.results.filter(r => r.success)
                    .reduce((sum, r) => sum + (r.result?.length || 0), 0)
            },
            categoryAnalysis: this.analyzeCategoryPerformance(),
            decisionPatterns: this.analyzeDecisionPatterns(),
            detailedResults: this.results,
            recommendations: this.generateRecommendations()
        };

        // Write comprehensive report
        const reportFile = path.join(this.reportPath, `tooloo-parallel-test-${timestamp}.json`);
        await fs.writeFile(reportFile, JSON.stringify(testReport, null, 2));

        // Generate human-readable summary
        const summaryFile = path.join(this.reportPath, `tooloo-test-summary-${timestamp}.md`);
        await fs.writeFile(summaryFile, this.generateMarkdownSummary(testReport));

        console.log(`\n📊 Reports generated:`);
        console.log(`📄 Detailed Report: ${reportFile}`);
        console.log(`📋 Summary Report: ${summaryFile}`);
    }

    analyzeCategoryPerformance() {
        const categories = {};
        
        this.results.forEach(result => {
            if (!categories[result.category]) {
                categories[result.category] = {
                    total: 0,
                    successful: 0,
                    totalResponseTime: 0,
                    totalContent: 0
                };
            }
            
            categories[result.category].total++;
            if (result.success) {
                categories[result.category].successful++;
                categories[result.category].totalResponseTime += result.responseTime;
                categories[result.category].totalContent += result.result?.length || 0;
            }
        });

        // Calculate averages
        Object.keys(categories).forEach(cat => {
            const data = categories[cat];
            data.successRate = (data.successful / data.total) * 100;
            data.avgResponseTime = data.successful > 0 ? data.totalResponseTime / data.successful : 0;
            data.avgContentLength = data.successful > 0 ? data.totalContent / data.successful : 0;
        });

        return categories;
    }

    analyzeDecisionPatterns() {
        const patterns = {
            preferredCategories: [],
            responseCharacteristics: {
                includesCode: this.decisions.filter(d => d.hasCodeExamples).length,
                includesPlans: this.decisions.filter(d => d.hasConcretePlans).length,
                mentionsLearning: this.decisions.filter(d => d.mentionsLearning).length
            },
            biases: []
        };

        // Find category preferences
        const categoryPerf = this.analyzeCategoryPerformance();
        patterns.preferredCategories = Object.entries(categoryPerf)
            .sort((a, b) => b[1].successRate - a[1].successRate)
            .slice(0, 3)
            .map(([cat, data]) => ({ category: cat, successRate: data.successRate }));

        // Identify potential biases
        const avgResponseTime = this.decisions.reduce((sum, d) => sum + d.responseTime, 0) / this.decisions.length;
        const fastResponses = this.decisions.filter(d => d.responseTime < avgResponseTime * 0.7);
        
        if (fastResponses.length > this.decisions.length * 0.6) {
            patterns.biases.push('Speed bias: May prioritize fast responses over thorough analysis');
        }

        const shortResponses = this.decisions.filter(d => d.responseLength < 500);
        if (shortResponses.length > this.decisions.length * 0.5) {
            patterns.biases.push('Brevity bias: May provide shorter responses than optimal');
        }

        return patterns;
    }

    generateRecommendations() {
        const recommendations = [];
        const categoryPerf = this.analyzeCategoryPerformance();
        const patterns = this.analyzeDecisionPatterns();

        // Performance recommendations
        const weakCategories = Object.entries(categoryPerf)
            .filter(([cat, data]) => data.successRate < 80)
            .map(([cat, data]) => cat);

        if (weakCategories.length > 0) {
            recommendations.push({
                type: 'improvement',
                priority: 'high',
                area: 'category-performance',
                description: `Focus on improving performance in: ${weakCategories.join(', ')}`,
                action: 'Analyze failed prompts in these categories and adjust processing approach'
            });
        }

        // Response time optimization
        const avgResponseTime = this.results.filter(r => r.success)
            .reduce((sum, r) => sum + r.responseTime, 0) / 
            this.results.filter(r => r.success).length;

        if (avgResponseTime > 5000) {
            recommendations.push({
                type: 'optimization',
                priority: 'medium',
                area: 'response-time',
                description: 'Average response time exceeds 5 seconds',
                action: 'Implement caching, optimize prompt processing, or parallel processing improvements'
            });
        }

        // Content quality
        const hasCodeBias = patterns.responseCharacteristics.includesCode / this.decisions.length;
        if (hasCodeBias < 0.3) {
            recommendations.push({
                type: 'enhancement',
                priority: 'low',
                area: 'code-examples',
                description: 'Low frequency of code examples in responses',
                action: 'Consider including more practical code examples in technical responses'
            });
        }

        return recommendations;
    }

    generateMarkdownSummary(report) {
        const { testInfo, summary, categoryAnalysis, decisionPatterns, recommendations } = report;
        
        return `# TooLoo.ai Parallel Self-Improvement Test Report

## Test Overview
- **Timestamp**: ${testInfo.timestamp}
- **Total Prompts**: ${testInfo.totalPrompts}
- **Duration**: ${(testInfo.duration / 1000).toFixed(2)} seconds
- **API Endpoint**: ${testInfo.apiEndpoint}

## Performance Summary
- **Success Rate**: ${summary.successful}/${testInfo.totalPrompts} (${((summary.successful/testInfo.totalPrompts)*100).toFixed(1)}%)
- **Average Response Time**: ${summary.avgResponseTime.toFixed(2)}ms
- **Total Content Generated**: ${(summary.totalContentGenerated / 1000).toFixed(1)}K characters

## Category Performance
${Object.entries(categoryAnalysis).map(([cat, data]) => 
`### ${cat}
- Success Rate: ${data.successRate.toFixed(1)}%
- Avg Response Time: ${data.avgResponseTime.toFixed(2)}ms
- Avg Content Length: ${data.avgContentLength.toFixed(0)} chars`
).join('\n\n')}

## Decision Patterns Analysis
### Preferred Categories
${decisionPatterns.preferredCategories.map((item, i) => 
`${i+1}. **${item.category}** (${item.successRate.toFixed(1)}% success rate)`
).join('\n')}

### Response Characteristics
- **Includes Code Examples**: ${decisionPatterns.responseCharacteristics.includesCode}/${testInfo.totalPrompts}
- **Includes Concrete Plans**: ${decisionPatterns.responseCharacteristics.includesPlans}/${testInfo.totalPrompts}
- **Mentions Learning/Improvement**: ${decisionPatterns.responseCharacteristics.mentionsLearning}/${testInfo.totalPrompts}

### Identified Biases
${decisionPatterns.biases.length > 0 ? 
decisionPatterns.biases.map(bias => `- ${bias}`).join('\n') : 
'- No significant biases detected'}

## Recommendations
${recommendations.map((rec, i) => 
`### ${i+1}. ${rec.type.toUpperCase()}: ${rec.area}
**Priority**: ${rec.priority}
**Issue**: ${rec.description}
**Action**: ${rec.action}`
).join('\n\n')}

## Next Steps
1. Review failed prompts and identify common failure patterns
2. Implement recommended optimizations
3. Re-run test to measure improvements
4. Consider expanding test suite with additional self-improvement prompts

---
*Report generated by TooLoo.ai Parallel Testing Framework*
`;
    }

    async runContinuousTest(intervalMinutes = 60, iterations = 24) {
        console.log(`🔄 Starting continuous testing: ${iterations} iterations, every ${intervalMinutes} minutes`);
        
        for (let i = 0; i < iterations; i++) {
            console.log(`\n🔄 Iteration ${i + 1}/${iterations}`);
            await this.executeParallelTest();
            
            if (i < iterations - 1) {
                console.log(`⏳ Waiting ${intervalMinutes} minutes for next iteration...`);
                await new Promise(resolve => setTimeout(resolve, intervalMinutes * 60 * 1000));
            }
        }
    }
}

// CLI Interface
async function main() {
    const tester = new TooLooParallelTester();
    
    const args = process.argv.slice(2);
    const mode = args[0] || 'single';
    
    try {
        switch (mode) {
            case 'single':
                await tester.executeParallelTest();
                break;
            case 'continuous':
                const interval = parseInt(args[1]) || 60;
                const iterations = parseInt(args[2]) || 24;
                await tester.runContinuousTest(interval, iterations);
                break;
            case 'help':
                console.log(`
TooLoo.ai Parallel Testing Framework

Usage:
  node tooloo-parallel-tester.js [mode] [options]

Modes:
  single                    Run single parallel test (default)
  continuous [interval] [iterations]  Run continuous testing
  help                     Show this help

Examples:
  node tooloo-parallel-tester.js
  node tooloo-parallel-tester.js continuous 30 48
                `);
                break;
            default:
                throw new Error(`Unknown mode: ${mode}`);
        }
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export default TooLooParallelTester;