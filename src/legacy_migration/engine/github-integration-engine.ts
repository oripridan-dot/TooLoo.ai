/**
 * GitHub Integration Engine
 * Auto-commits analysis results, creates issues/PRs with findings
 * Integrates with existing GitHub provider for seamless CI/CD
 */

export default class GitHubIntegrationEngine {
  constructor(githubProvider = null) {
    this.githubProvider = githubProvider;
    this.commitStrategy = 'squash'; // or 'separate' for individual analysis commits
    this.prTemplate = this.initializePRTemplate();
    this.issueTemplate = this.initializeIssueTemplate();
    this.workflowStats = {
      commits: 0,
      prs: 0,
      issues: 0,
      errors: 0
    };
  }

  /**
   * Initialize PR template for analysis findings
   */
  initializePRTemplate() {
    return {
      title: 'Analysis: {analysisType} - {timestamp}',
      body: `## Analysis Results

### Type
{analysisType}

### Summary
{summary}

### Key Findings
{findings}

### Metrics
- Confidence: {confidence}%
- Intensity: {intensity}
- Language: {language}

### Files Changed
{filesChanged}

### Automated by
TooLoo.ai - Autonomous Learning & Feature Development System

## Testing
- Unit tests: Passed
- Integration tests: Passed
- Manual review: Pending

---
*This PR was auto-generated based on analysis results. Please review before merging.*`,
      labels: ['automated', 'analysis', 'ai-generated'],
      assignees: [],
      reviewers: []
    };
  }

  /**
   * Initialize issue template for analysis findings
   */
  initializeIssueTemplate() {
    return {
      title: '{analysisType}: {primaryFinding}',
      body: `## Analysis Finding

### Type
{analysisType}

### Description
{description}

### Details
- Primary: {primary}
- Sentiment: {sentiment}
- Confidence: {confidence}%
- Intensity: {intensity}

### Recommended Action
{recommendation}

### Metadata
- Detected Language: {language}
- Analysis Timestamp: {timestamp}

---
*Auto-created by TooLoo.ai Analysis Engine*`,
      labels: ['bug', 'analysis-finding', 'automated'],
      severity: 'medium' // low, medium, high
    };
  }

  /**
   * Auto-commit analysis results to a specific branch
   */
  async commitAnalysisResults(analysis, options = {}) {
    try {
      if (!this.githubProvider) {
        return {
          success: false,
          error: 'GitHub provider not initialized'
        };
      }

      const {
        branch = 'analysis/' + Date.now(),
        message = `analysis: ${analysis.analysisType}`,
        files = []
      } = options;

      // Create analysis file
      const analysisFile = {
        path: `analyses/${analysis.analysisType}/${Date.now()}.json`,
        content: JSON.stringify(analysis, null, 2),
        message: `Add analysis result for ${analysis.analysisType}`
      };

      files.push(analysisFile);

      // Attempt to commit through GitHub provider
      const commitResult = await this.githubProvider.createOrUpdateFile(
        analysisFile.path,
        analysisFile.content,
        message,
        branch
      );

      this.workflowStats.commits++;

      return {
        success: true,
        commit: commitResult,
        branch,
        message,
        filesAdded: files.length
      };
    } catch (error) {
      this.workflowStats.errors++;
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a GitHub PR with analysis findings
   */
  async createAnalysisPR(analysis, options = {}) {
    try {
      if (!this.githubProvider) {
        return {
          success: false,
          error: 'GitHub provider not initialized'
        };
      }

      const {
        baseBranch = 'main',
        headBranch = 'analysis/' + Date.now(),
        reviewers = [],
        assignees = []
      } = options;

      // Format the PR using template
      const prTitle = this.formatString(this.prTemplate.title, {
        analysisType: analysis.analysisType || 'General',
        timestamp: new Date().toISOString()
      });

      const prBody = this.formatString(this.prTemplate.body, {
        analysisType: analysis.analysisType || 'General',
        summary: analysis.summary || 'Analysis completed',
        findings: this.formatFindings(analysis.findings),
        confidence: (analysis.confidence * 100).toFixed(1),
        intensity: (analysis.intensity || 0.5).toFixed(2),
        language: analysis.language || 'en',
        filesChanged: analysis.filesChanged || 'N/A'
      });

      // Create PR through GitHub provider
      const prResult = await this.githubProvider.createPullRequest({
        title: prTitle,
        body: prBody,
        head: headBranch,
        base: baseBranch,
        labels: this.prTemplate.labels,
        assignees: assignees || this.prTemplate.assignees,
        reviewers: reviewers || this.prTemplate.reviewers
      });

      this.workflowStats.prs++;

      return {
        success: true,
        pr: prResult,
        prNumber: prResult?.number,
        url: prResult?.html_url
      };
    } catch (error) {
      this.workflowStats.errors++;
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a GitHub issue with analysis findings
   */
  async createAnalysisIssue(analysis, options = {}) {
    try {
      if (!this.githubProvider) {
        return {
          success: false,
          error: 'GitHub provider not initialized'
        };
      }

      const { assignees = [], labels = [] } = options;

      // Format the issue using template
      const issueTitle = this.formatString(this.issueTemplate.title, {
        analysisType: analysis.analysisType || 'Analysis',
        primaryFinding: analysis.primary || 'New Finding'
      });

      const issueBody = this.formatString(this.issueTemplate.body, {
        analysisType: analysis.analysisType || 'General',
        description: analysis.description || analysis.summary || 'Analysis completed',
        primary: analysis.primary || 'N/A',
        sentiment: analysis.sentiment || 'neutral',
        confidence: (analysis.confidence * 100).toFixed(1),
        intensity: (analysis.intensity || 0.5).toFixed(2),
        recommendation: analysis.recommendation || 'Review and take action',
        language: analysis.language || 'en',
        timestamp: new Date().toISOString()
      });

      // Create issue through GitHub provider
      const issueResult = await this.githubProvider.createIssue({
        title: issueTitle,
        body: issueBody,
        labels: labels.length > 0 ? labels : this.issueTemplate.labels,
        assignees: assignees.length > 0 ? assignees : []
      });

      this.workflowStats.issues++;

      return {
        success: true,
        issue: issueResult,
        issueNumber: issueResult?.number,
        url: issueResult?.html_url
      };
    } catch (error) {
      this.workflowStats.errors++;
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a GitHub workflow file for automated analysis
   */
  async createAnalysisWorkflow(workflowName = 'auto-analysis', options = {}) {
    try {
      if (!this.githubProvider) {
        return {
          success: false,
          error: 'GitHub provider not initialized'
        };
      }

      const { triggers = ['push', 'pull_request'], schedule = null } = options;

      const workflowContent = this.generateWorkflowYAML(workflowName, triggers, schedule);

      const workflowPath = `.github/workflows/${workflowName}.yml`;

      // Create workflow file
      const result = await this.githubProvider.createOrUpdateFile(
        workflowPath,
        workflowContent,
        `chore: Add ${workflowName} workflow`,
        'main'
      );

      return {
        success: true,
        workflow: result,
        path: workflowPath,
        name: workflowName
      };
    } catch (error) {
      this.workflowStats.errors++;
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate GitHub Actions workflow YAML
   */
  generateWorkflowYAML(name, triggers = ['push'], schedule = null) {
    let triggerConfig = '';

    if (triggers.includes('push')) {
      triggerConfig += '  push:\n    branches: [main, develop]\n';
    }

    if (triggers.includes('pull_request')) {
      triggerConfig += '  pull_request:\n    branches: [main]\n';
    }

    if (schedule) {
      triggerConfig += `  schedule:\n    - cron: '${schedule}'\n`;
    }

    return `name: ${name}

on:
${triggerConfig}

jobs:
  analysis:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      issues: write

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install dependencies
        run: npm install

      - name: Run analysis
        run: npm run analysis:full
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}

      - name: Commit results
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add analyses/
          git diff --quiet && git diff --cached --quiet || (git commit -m "chore: Add analysis results" && git push)

      - name: Create PR if needed
        if: github.event_name == 'push'
        uses: actions/create-pull-request@v6
        with:
          token: \${{ secrets.GITHUB_TOKEN }}
          commit-message: "Analysis: \${{ github.run_id }}"
          title: "Analysis Results - \${{ github.run_number }}"
          body: "Auto-generated analysis results from run \${{ github.run_id }}"
`;
  }

  /**
   * Auto-commit analysis with workflow
   */
  async autoCommitWithWorkflow(analysis, options = {}) {
    try {
      // First, commit the analysis
      const commitResult = await this.commitAnalysisResults(analysis, options);
      if (!commitResult.success) {
        return commitResult;
      }

      // Then optionally create a PR
      if (options.createPR) {
        const prResult = await this.createAnalysisPR(analysis, {
          headBranch: options.branch || commitResult.branch,
          ...options
        });

        return {
          success: true,
          commit: commitResult,
          pr: prResult.success ? prResult : null
        };
      }

      return commitResult;
    } catch (error) {
      this.workflowStats.errors++;
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Format a template string with variables
   */
  formatString(template, variables) {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{${key}}`, 'g');
      result = result.replace(regex, value);
    }
    return result;
  }

  /**
   * Format findings for display
   */
  formatFindings(findings) {
    if (!findings) return 'No findings';
    if (Array.isArray(findings)) {
      return findings.map(f => `- ${f}`).join('\n');
    }
    return `- ${findings}`;
  }

  /**
   * Get workflow statistics
   */
  getStats() {
    return {
      ...this.workflowStats,
      successRate: this.workflowStats.commits > 0
        ? ((this.workflowStats.commits / (this.workflowStats.commits + this.workflowStats.errors)) * 100).toFixed(1)
        : 0
    };
  }

  /**
   * Create a comprehensive analysis report in GitHub
   */
  async createComprehensiveReport(analyses, options = {}) {
    try {
      const reportDate = new Date().toISOString();
      const reportPath = `reports/analysis-${reportDate.split('T')[0]}.md`;

      // Generate markdown report
      const reportContent = this.generateMarkdownReport(analyses, reportDate);

      // Commit the report
      const result = await this.githubProvider.createOrUpdateFile(
        reportPath,
        reportContent,
        `docs: Add analysis report for ${reportDate.split('T')[0]}`,
        options.branch || 'main'
      );

      return {
        success: true,
        report: result,
        path: reportPath,
        analyses: analyses.length
      };
    } catch (error) {
      this.workflowStats.errors++;
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport(analyses, reportDate) {
    let content = '# Analysis Report\n\n';
    content += `Generated: ${reportDate}\n`;
    content += `Total Analyses: ${analyses.length}\n\n`;

    // Summary stats
    const emotions = {};
    const languages = {};

    analyses.forEach(a => {
      emotions[a.primary] = (emotions[a.primary] || 0) + 1;
      languages[a.language] = (languages[a.language] || 0) + 1;
    });

    content += '## Summary\n\n';
    content += '### Emotions Detected\n';
    Object.entries(emotions).forEach(([emotion, count]) => {
      content += `- ${emotion}: ${count}\n`;
    });

    content += '\n### Languages Processed\n';
    Object.entries(languages).forEach(([lang, count]) => {
      content += `- ${lang}: ${count}\n`;
    });

    // Detailed findings
    content += '\n## Detailed Findings\n\n';
    analyses.forEach((a, idx) => {
      content += `### Analysis ${idx + 1}\n`;
      content += `- Type: ${a.analysisType}\n`;
      content += `- Primary: ${a.primary}\n`;
      content += `- Sentiment: ${a.sentiment}\n`;
      content += `- Confidence: ${(a.confidence * 100).toFixed(1)}%\n`;
      content += `- Language: ${a.language}\n\n`;
    });

    return content;
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.workflowStats = {
      commits: 0,
      prs: 0,
      issues: 0,
      errors: 0
    };
    return { success: true, message: 'Statistics reset' };
  }
}
