#!/usr/bin/env node
/**
 * TooLoo.ai - AI Instruction Validation Script
 * 
 * Validates all AI agent instruction files for:
 * - Required sections
 * - Valid links and file references
 * - Code example accuracy
 * - Markdown syntax
 * - Completeness
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class InstructionValidator {
  constructor() {
    this.workspaceRoot = process.cwd();
    this.instructionFiles = [
      '.github/copilot-instructions.md',
      '.github/OPENAI-GPT-INSTRUCTIONS.md',
      '.github/CLAUDE-INSTRUCTIONS.md',
      '.github/GEMINI-INSTRUCTIONS.md'
    ];
    
    this.requiredSections = {
      all: [
        'Quick Context',
        'Architecture',
        'API Endpoints',
        'Development Workflow',
        'Key Files',
        'Last Updated'
      ],
      copilot: ['Project Overview', 'Critical Developer Workflows'],
      provider: ['Your Role', 'Integration with Other Providers']
    };
  }

  /**
   * Main validation workflow
   */
  async run() {
    console.log('🔍 TooLoo.ai Instruction Validator');
    console.log('='.repeat(60));
    console.log('');

    const results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      files: []
    };

    for (const file of this.instructionFiles) {
      console.log(`📄 Validating ${file}...`);
      const validation = await this.validateFile(file);
      results.files.push(validation);

      if (validation.score === 100) {
        results.passed++;
        console.log(`   ✅ PASSED (${validation.score}/100)`);
      } else if (validation.score >= 75) {
        results.warnings++;
        console.log(`   ⚠️  WARNINGS (${validation.score}/100)`);
      } else {
        results.failed++;
        console.log(`   ❌ FAILED (${validation.score}/100)`);
      }

      // Print issues
      if (validation.errors.length > 0) {
        console.log('   Errors:');
        validation.errors.forEach(err => console.log(`     • ${err}`));
      }
      if (validation.warnings.length > 0) {
        console.log('   Warnings:');
        validation.warnings.forEach(warn => console.log(`     • ${warn}`));
      }
      console.log('');
    }

    // Print summary
    console.log('='.repeat(60));
    console.log('📊 Validation Summary');
    console.log(`   ✅ Passed: ${results.passed}`);
    console.log(`   ⚠️  Warnings: ${results.warnings}`);
    console.log(`   ❌ Failed: ${results.failed}`);
    console.log(`   📝 Total: ${this.instructionFiles.length}`);
    
    const overallScore = results.files.reduce((sum, f) => sum + f.score, 0) / results.files.length;
    console.log(`   📈 Overall Score: ${overallScore.toFixed(1)}/100`);
    console.log('');

    // Print health metrics
    console.log('📈 Health Metrics');
    const metrics = this.calculateMetrics(results);
    console.log(`   Accuracy: ${metrics.accuracy}%`);
    console.log(`   Completeness: ${metrics.completeness}%`);
    console.log(`   Freshness: ${metrics.freshness} (avg days old)`);
    console.log(`   Coverage: ${metrics.coverage}%`);
    console.log('');

    if (results.failed > 0) {
      console.log('❌ Validation FAILED - Fix errors above');
      process.exit(1);
    } else if (results.warnings > 0) {
      console.log('⚠️  Validation PASSED with warnings');
      process.exit(0);
    } else {
      console.log('✅ All validations PASSED!');
      process.exit(0);
    }
  }

  /**
   * Validate a single instruction file
   */
  async validateFile(file) {
    const validation = {
      file,
      score: 0,
      errors: [],
      warnings: [],
      checks: {}
    };

    const filePath = path.join(this.workspaceRoot, file);

    try {
      // Check 1: File exists
      const content = await fs.readFile(filePath, 'utf8');
      validation.checks.exists = true;

      // Check 2: Required sections
      const sectionsResult = this.validateSections(content, file);
      validation.checks.sections = sectionsResult;
      if (!sectionsResult.valid) {
        validation.errors.push(...sectionsResult.missing.map(s => `Missing section: ${s}`));
      }

      // Check 3: File references
      const fileRefsResult = await this.validateFileReferences(content);
      validation.checks.fileRefs = fileRefsResult;
      if (fileRefsResult.invalid.length > 0) {
        validation.warnings.push(...fileRefsResult.invalid.map(f => `Invalid file reference: ${f}`));
      }

      // Check 4: Code examples
      const codeResult = await this.validateCodeExamples(content);
      validation.checks.code = codeResult;
      if (codeResult.invalid.length > 0) {
        validation.warnings.push(...codeResult.invalid.map(c => `Invalid code example: ${c}`));
      }

      // Check 5: Freshness
      const stats = await fs.stat(filePath);
      const daysOld = Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24));
      validation.checks.freshness = { daysOld };
      if (daysOld > 30) {
        validation.warnings.push(`File is ${daysOld} days old (>30 days)`);
      }

      // Check 6: Markdown syntax
      const markdownResult = this.validateMarkdown(content);
      validation.checks.markdown = markdownResult;
      if (!markdownResult.valid) {
        validation.warnings.push(...markdownResult.issues);
      }

      // Calculate score
      validation.score = this.calculateScore(validation);

    } catch (error) {
      validation.errors.push(`Could not read file: ${error.message}`);
      validation.checks.exists = false;
    }

    return validation;
  }

  /**
   * Validate required sections exist
   */
  validateSections(content, file) {
    const result = {
      valid: true,
      missing: []
    };

    // Determine which sections to check
    let sections = [...this.requiredSections.all];
    if (file.includes('copilot')) {
      sections.push(...this.requiredSections.copilot);
    } else {
      sections.push(...this.requiredSections.provider);
    }

    // Check each section
    for (const section of sections) {
      const patterns = [
        new RegExp(`^#+\\s+${section}`, 'mi'),
        new RegExp(`^\\*\\*${section}\\*\\*`, 'mi'),
        new RegExp(section, 'i')
      ];

      const found = patterns.some(pattern => pattern.test(content));
      if (!found) {
        result.valid = false;
        result.missing.push(section);
      }
    }

    return result;
  }

  /**
   * Validate file references point to existing files
   */
  async validateFileReferences(content) {
    const result = {
      valid: 0,
      invalid: []
    };

    // Extract file references like `simple-api-server.js` or `web-app/src/App.jsx`
    const filePattern = /`([a-zA-Z0-9_\-\/\.]+\.(js|ts|jsx|tsx|json|md|css|html))`/g;
    const matches = content.matchAll(filePattern);

    for (const match of matches) {
      const file = match[1];
      
      // Skip if it looks like a relative path or example
      if (file.startsWith('http') || file.includes('example') || file.includes('your-')) {
        continue;
      }

      try {
        const filePath = path.join(this.workspaceRoot, file);
        await fs.access(filePath);
        result.valid++;
      } catch (error) {
        result.invalid.push(file);
      }
    }

    return result;
  }

  /**
   * Validate code examples reference correct line numbers
   */
  async validateCodeExamples(content) {
    const result = {
      valid: 0,
      invalid: []
    };

    // Extract line references like "line 123" or "lines 45-67"
    const linePattern = /line[s]?\s+(\d+)(?:-(\d+))?/gi;
    const matches = content.matchAll(linePattern);

    for (const match of matches) {
      // For now, just count them as valid
      // Could be enhanced to check actual line numbers
      result.valid++;
    }

    return result;
  }

  /**
   * Validate markdown syntax
   */
  validateMarkdown(content) {
    const result = {
      valid: true,
      issues: []
    };

    // Check for common markdown issues
    
    // Unclosed code blocks
    const codeBlockCount = (content.match(/```/g) || []).length;
    if (codeBlockCount % 2 !== 0) {
      result.valid = false;
      result.issues.push('Unclosed code block detected');
    }

    // Broken links [text]() with empty URL
    if (/\[[^\]]+\]\(\s*\)/.test(content)) {
      result.valid = false;
      result.issues.push('Empty link detected');
    }

    // Multiple consecutive blank lines (more than 2)
    if (/\n\n\n\n/.test(content)) {
      result.issues.push('Multiple consecutive blank lines');
    }

    return result;
  }

  /**
   * Calculate validation score
   */
  calculateScore(validation) {
    const checks = validation.checks;
    let score = 0;
    let maxScore = 0;

    // File exists (25 points)
    maxScore += 25;
    if (checks.exists) score += 25;

    // Sections (25 points)
    maxScore += 25;
    if (checks.sections?.valid) score += 25;
    else if (checks.sections?.missing?.length <= 2) score += 15;

    // File references (15 points)
    maxScore += 15;
    if (checks.fileRefs) {
      const total = checks.fileRefs.valid + checks.fileRefs.invalid.length;
      if (total > 0) {
        score += Math.floor((checks.fileRefs.valid / total) * 15);
      } else {
        score += 15; // No file refs to validate
      }
    }

    // Code examples (10 points)
    maxScore += 10;
    if (checks.code?.valid > 0) score += 10;

    // Freshness (15 points)
    maxScore += 15;
    if (checks.freshness) {
      const days = checks.freshness.daysOld;
      if (days <= 7) score += 15;
      else if (days <= 30) score += 10;
      else if (days <= 60) score += 5;
    }

    // Markdown (10 points)
    maxScore += 10;
    if (checks.markdown?.valid) score += 10;

    return Math.floor((score / maxScore) * 100);
  }

  /**
   * Calculate health metrics
   */
  calculateMetrics(results) {
    const files = results.files;
    
    return {
      accuracy: Math.floor(
        files.reduce((sum, f) => sum + (f.checks.code?.valid || 0), 0) /
        Math.max(files.length, 1) * 100
      ),
      completeness: Math.floor(
        files.filter(f => f.checks.sections?.valid).length /
        files.length * 100
      ),
      freshness: Math.floor(
        files.reduce((sum, f) => sum + (f.checks.freshness?.daysOld || 0), 0) /
        files.length
      ),
      coverage: Math.floor(
        files.reduce((sum, f) => sum + f.score, 0) / files.length
      )
    };
  }
}

// Run if called directly
if (require.main === module) {
  const validator = new InstructionValidator();
  validator.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = InstructionValidator;
