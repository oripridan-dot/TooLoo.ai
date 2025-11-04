/**
 * Repository Auto-Organization Engine (Phase 2e)
 * 
 * Automatic repository management:
 * 1. Feature scope detection from descriptions
 * 2. Auto-branch creation based on scope
 * 3. PR template generation
 * 4. Commit message formatting & enforcement
 * 5. Folder structure recommendations
 * 6. File organization suggestions
 * 
 * Transforms feature request → auto-organized branch + templates
 */

import { v4 as uuidv4 } from 'uuid';

export class RepoAutoOrg {
  constructor(options = {}) {
    this.config = {
      repoRoot: options.repoRoot || process.cwd(),
      defaultBranchPrefix: options.defaultBranchPrefix || 'feature',
      maxBranchNameLength: options.maxBranchNameLength || 50,
      ...options
    };

    this.scopePatterns = {
      ui: ['button', 'component', 'interface', 'layout', 'css', 'style', 'design', 'visual'],
      api: ['endpoint', 'route', 'server', 'handler', 'middleware', 'api', 'request', 'response'],
      database: ['database', 'schema', 'migration', 'query', 'sql', 'postgres', 'mongo', 'cache'],
      auth: ['authentication', 'authorization', 'login', 'password', 'token', 'oauth', 'session'],
      performance: ['optimization', 'performance', 'speed', 'caching', 'memory', 'cpu', 'latency'],
      security: ['security', 'vulnerability', 'encryption', 'sanitize', 'injection', 'xss', 'csrf'],
      testing: ['test', 'unit', 'integration', 'e2e', 'coverage', 'jest', 'mocha'],
      documentation: ['doc', 'readme', 'guide', 'tutorial', 'comment', 'jsdoc'],
      devops: ['ci', 'cd', 'deployment', 'docker', 'kubernetes', 'infrastructure', 'env'],
      refactor: ['refactor', 'cleanup', 'restructure', 'improve', 'simplify']
    };

    this.fileOrganization = {
      ui: {
        folders: ['components/', 'styles/', 'assets/'],
        ext: ['.jsx', '.tsx', '.css', '.scss']
      },
      api: {
        folders: ['routes/', 'controllers/', 'middleware/'],
        ext: ['.js', '.ts']
      },
      database: {
        folders: ['migrations/', 'schemas/', 'models/'],
        ext: ['.sql', '.js']
      },
      testing: {
        folders: ['tests/', '__tests__/', 'spec/'],
        ext: ['.test.js', '.spec.js', '.test.ts']
      }
    };
  }

  /**
   * Detect scope from feature description
   */
  detectScope(description) {
    const lower = description.toLowerCase();
    const scores = {};

    // Score each scope category
    for (const [scope, keywords] of Object.entries(this.scopePatterns)) {
      let score = 0;
      for (const keyword of keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'g');
        const matches = lower.match(regex);
        if (matches) {
          score += matches.length;
        }
      }
      if (score > 0) {
        scores[scope] = score;
      }
    }

    // Sort by score and return top scopes
    return Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .map(([scope, score]) => ({ scope, score }))
      .slice(0, 3);
  }

  /**
   * Generate branch name from description
   */
  generateBranchName(description, scope) {
    // Extract key words (max 3-4)
    const words = description
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !['this', 'that', 'with', 'from', 'will', 'should'].includes(w))
      .slice(0, 3);

    const branchName = `${scope || this.config.defaultBranchPrefix}/${words.join('-')}`.substring(
      0,
      this.config.maxBranchNameLength
    );

    return branchName.toLowerCase().replace(/[^a-z0-9\-\/]/g, '');
  }

  /**
   * Generate PR template
   */
  generatePRTemplate(description, scopes, branchName) {
    const scopeStr = scopes.map(s => s.scope).join(', ').toUpperCase();

    return `# ${description}

## Scope
${scopeStr}

## Description
[Provide a brief description of what this PR does]

## Related Issues
- Closes #
- Related to #

## Changes Made
- [ ] Change 1
- [ ] Change 2
- [ ] Change 3

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests passed
- [ ] Manual testing completed

## Breaking Changes
- [ ] No breaking changes
- [ ] Breaking changes (list below)

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests pass locally

## Screenshots (if applicable)
[Add screenshots here]

---

**Branch:** \`${branchName}\`  
**Detection Confidence:** ${(scopes[0]?.score || 0).toFixed(2)}  
**Auto-generated:** ${new Date().toISOString()}
`;
  }

  /**
   * Generate folder structure recommendations
   */
  generateFolderStructure(scopes) {
    const structure = {};

    for (const { scope } of scopes) {
      const org = this.fileOrganization[scope];
      if (org) {
        for (const folder of org.folders) {
          structure[folder] = (structure[folder] || 0) + 1;
        }
      }
    }

    return Object.keys(structure).sort((a, b) => structure[b] - structure[a]);
  }

  /**
   * Generate commit message template
   */
  generateCommitTemplate(scope, description) {
    const typeMap = {
      ui: 'feat(ui)',
      api: 'feat(api)',
      database: 'feat(db)',
      auth: 'feat(auth)',
      security: 'security',
      performance: 'perf',
      testing: 'test',
      documentation: 'docs',
      devops: 'ci',
      refactor: 'refactor'
    };

    const type = typeMap[scope] || 'feat';
    const shortDesc = description.substring(0, 50);

    return `${type}: ${shortDesc}

# Describe your changes here

# Why this change?

# Testing performed

# Breaking changes?
`;
  }

  /**
   * Generate commit message pattern/regex
   */
  generateCommitPattern(scopes) {
    const types = scopes.map(s => this.getCommitType(s.scope)).filter(Boolean);
    const typePattern = types.join('|');

    return {
      pattern: `^(${typePattern})(\\(.+\\))?!?: .{1,50}$`,
      examples: [
        `feat(ui): add login button component`,
        `fix(api): handle missing user id`,
        `perf(db): optimize query performance`,
        `security: sanitize user input`,
        `docs: update API documentation`
      ],
      description: 'Commit messages must follow conventional commits format'
    };
  }

  /**
   * Get commit type from scope
   */
  getCommitType(scope) {
    const map = {
      ui: 'feat',
      api: 'feat',
      database: 'feat',
      auth: 'feat',
      security: 'security',
      performance: 'perf',
      testing: 'test',
      documentation: 'docs',
      devops: 'ci',
      refactor: 'refactor'
    };
    return map[scope];
  }

  /**
   * Generate complete organization plan
   */
  generateOrganizationPlan(description) {
    const id = uuidv4();
    const scopes = this.detectScope(description);
    const primaryScope = scopes[0]?.scope || this.config.defaultBranchPrefix;
    const branchName = this.generateBranchName(description, primaryScope);
    const prTemplate = this.generatePRTemplate(description, scopes, branchName);
    const folders = this.generateFolderStructure(scopes);
    const commitTemplate = this.generateCommitTemplate(primaryScope, description);
    const commitPattern = this.generateCommitPattern(scopes);

    return {
      id,
      timestamp: new Date().toISOString(),
      description,
      detectedScopes: scopes,
      primaryScope,
      branchName,
      folders,
      prTemplate,
      commitTemplate,
      commitPattern,
      commands: this.generateCommands(branchName),
      fileOrganization: this.generateFileOrganization(scopes)
    };
  }

  /**
   * Generate shell commands for setup
   */
  generateCommands(branchName) {
    return {
      createBranch: `git checkout -b ${branchName}`,
      trackBranch: `git push -u origin ${branchName}`,
      commitExample: `git commit -m "feat: implement awesome feature"`,
      createPR: `gh pr create --base main --head ${branchName} --title "Your PR Title" --body "$(cat PR_TEMPLATE.md)"`,
      allSteps: [
        `# Create and switch to feature branch`,
        `git checkout -b ${branchName}`,
        ``,
        `# Make your changes...`,
        ``,
        `# Stage and commit (follows conventional commits)`,
        `git add .`,
        `git commit -m "feat: your change description"`,
        ``,
        `# Push to remote`,
        `git push -u origin ${branchName}`,
        ``,
        `# Create PR`,
        `gh pr create --base main --head ${branchName}`
      ].join('\n')
    };
  }

  /**
   * Generate file organization recommendations
   */
  generateFileOrganization(scopes) {
    const recommendations = [];

    for (const { scope } of scopes) {
      const org = this.fileOrganization[scope];
      if (org) {
        recommendations.push({
          scope,
          suggestedFolders: org.folders,
          suggestedExtensions: org.ext,
          examples: this.getExamplesForScope(scope)
        });
      }
    }

    return recommendations;
  }

  /**
   * Get file examples for scope
   */
  getExamplesForScope(scope) {
    const examples = {
      ui: ['components/Button.jsx', 'styles/button.css', 'components/__tests__/Button.test.jsx'],
      api: ['routes/users.js', 'controllers/userController.js', 'middleware/auth.js'],
      database: ['migrations/20251020_add_users_table.sql', 'models/User.js'],
      testing: ['tests/unit/utils.test.js', 'tests/integration/api.test.js'],
      auth: ['middleware/authenticate.js', 'services/TokenService.js']
    };
    return examples[scope] || [];
  }

  /**
   * Get statistics about scope distribution
   */
  getStats() {
    return {
      supportedScopes: Object.keys(this.scopePatterns).length,
      scopes: Object.entries(this.scopePatterns).map(([scope, keywords]) => ({
        scope,
        keywordCount: keywords.length
      })),
      fileOrganizationScopes: Object.keys(this.fileOrganization).length,
      maxBranchNameLength: this.config.maxBranchNameLength
    };
  }
}

export default RepoAutoOrg;
