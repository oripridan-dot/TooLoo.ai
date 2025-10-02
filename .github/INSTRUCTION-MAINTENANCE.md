# AI Agent Instruction Maintenance - Periodic Sequence

> Automated workflow for keeping AI agent instructions synchronized and up-to-date

## Purpose
This document defines the periodic sequence for maintaining AI agent instruction files across the TooLoo.ai repository. These instructions ensure all AI providers (GitHub Copilot, OpenAI GPT, Claude, Gemini) stay synchronized with the codebase.

## Instruction Files Maintained

```
.github/
├── copilot-instructions.md          # GitHub Copilot (VS Code)
├── OPENAI-GPT-INSTRUCTIONS.md       # OpenAI GPT-4/5
├── CLAUDE-INSTRUCTIONS.md           # Anthropic Claude
└── GEMINI-INSTRUCTIONS.md           # Google Gemini
```

## Maintenance Schedule

### 🔄 Daily Checks (Automated)
**Trigger**: 00:00 UTC daily  
**Duration**: ~2 minutes

```javascript
// simple-api-server.js
async dailyInstructionCheck() {
  const checks = {
    filesExist: await this.verifyInstructionFilesExist(),
    filesReadable: await this.verifyInstructionFilesReadable(),
    lastModified: await this.getInstructionFileAges()
  };
  
  if (checks.anyFileOlderThan30Days || !checks.filesExist) {
    await this.notifyInstructionUpdateNeeded();
  }
}
```

**Actions**:
1. ✅ Verify all 4 instruction files exist
2. ✅ Check files are readable and valid Markdown
3. ✅ Record last modification dates
4. ⚠️ Flag if any file not updated in 30+ days
5. 📝 Log to `logs/instruction-maintenance.log`

---

### 🔍 Weekly Analysis (Automated)
**Trigger**: Sunday 03:00 UTC  
**Duration**: ~10 minutes

```javascript
// self-inspection-manager.js
async analyzeCodebaseChanges() {
  const changes = await this.getChangesLastWeek();
  const impact = {
    newEndpoints: this.detectNewAPIEndpoints(changes),
    removedFeatures: this.detectRemovedFeatures(changes),
    architectureChanges: this.detectArchitectureChanges(changes),
    newDependencies: this.detectNewDependencies(changes)
  };
  
  if (impact.requiresInstructionUpdate) {
    await this.generateInstructionUpdateProposal(impact);
  }
}
```

**Actions**:
1. 📊 Analyze git commits from last 7 days
2. 🔍 Detect API endpoint changes (`/api/v1/*`)
3. 🏗️ Identify architectural modifications
4. 📦 Check for new npm packages installed
5. 🤖 Generate update proposals if needed
6. 📧 Notify maintainers of suggested updates

**Triggers Requiring Updates**:
- New API endpoints added/removed
- Major refactoring (>500 lines changed)
- New dependencies added to package.json
- Changes to self-awareness capabilities
- New provider integrations

---

### 📝 Monthly Comprehensive Update (Semi-Automated)
**Trigger**: 1st day of month, 10:00 UTC  
**Duration**: ~30 minutes (with human review)

```javascript
// self-awareness-manager.js
async comprehensiveInstructionUpdate() {
  const analysis = {
    codebase: await this.analyzeFullCodebase(),
    usage: await this.analyzeAIProviderUsage(),
    patterns: await this.detectNewPatterns(),
    antipatterns: await this.detectAntipatterns()
  };
  
  const updates = await this.generateInstructionUpdates(analysis);
  
  // Request human review before applying
  await this.requestHumanReview(updates);
}
```

**Actions**:
1. 🔬 Full codebase analysis (all source files)
2. 📈 Review AI provider usage statistics
   - Which providers called most?
   - Which tasks succeeded/failed?
   - Average response quality scores
3. 🎯 Identify new coding patterns
4. ⚠️ Detect antipatterns to warn about
5. ✍️ Generate comprehensive updates for all 4 files
6. 👤 Request maintainer approval
7. ✅ Apply approved updates with backups
8. 📊 Generate monthly instruction health report

**Report Includes**:
- Instruction file accuracy score (0-100)
- Outdated sections identified
- New sections recommended
- Provider-specific optimization suggestions
- Common AI mistakes detected
- Recommended prompt improvements

---

### 🚀 On Major Version Release (Manual Trigger)
**Trigger**: Manual via `npm run update-instructions`  
**Duration**: ~1 hour (thorough)

```javascript
// self-implementation-wizard.js
async updateInstructionsForRelease() {
  const release = {
    version: await this.getCurrentVersion(),
    changes: await this.getChangelogSinceLastRelease(),
    breaking: await this.identifyBreakingChanges(),
    newFeatures: await this.listNewFeatures(),
    deprecations: await this.listDeprecations()
  };
  
  // Comprehensive rewrite, not just patches
  await this.rewriteInstructionsForVersion(release);
}
```

**Actions**:
1. 📋 Review full CHANGELOG.md
2. ⚠️ Identify all breaking changes
3. ✨ Document all new features
4. 🔧 Update development workflow sections
5. 🗑️ Remove deprecated feature documentation
6. 🎯 Update "Quick Start" sections
7. 🔄 Refresh code examples with current syntax
8. 📸 Update architecture diagrams if changed
9. ✅ Full validation against current codebase
10. 🚀 Deploy updated instructions to repository

---

## Automated Update Workflow

### Step 1: Detection
```javascript
// Runs continuously in background
class InstructionMaintenanceManager {
  constructor() {
    this.checkInterval = 6 * 60 * 60 * 1000; // 6 hours
    this.startMonitoring();
  }
  
  startMonitoring() {
    setInterval(async () => {
      const needsUpdate = await this.detectUpdateTriggers();
      if (needsUpdate.urgent) {
        await this.triggerEmergencyUpdate(needsUpdate);
      } else if (needsUpdate.recommended) {
        await this.queueScheduledUpdate(needsUpdate);
      }
    }, this.checkInterval);
  }
}
```

### Step 2: Analysis
```javascript
async analyzeUpdateRequirements(changes) {
  return {
    affectedFiles: this.identifyAffectedInstructionFiles(changes),
    urgency: this.calculateUrgency(changes),
    sections: this.identifySectionsToUpdate(changes),
    newSections: this.generateNewSections(changes),
    obsoleteSections: this.identifyObsoleteSections(changes)
  };
}
```

### Step 3: Generation
```javascript
async generateInstructionUpdates(analysis) {
  const updates = [];
  
  for (const file of analysis.affectedFiles) {
    const current = await this.readInstructionFile(file);
    const updated = await this.applyAnalysisToInstructions(current, analysis);
    const diff = this.generateDiff(current, updated);
    
    updates.push({
      file,
      current,
      updated,
      diff,
      confidence: this.calculateConfidence(diff)
    });
  }
  
  return updates;
}
```

### Step 4: Review & Apply
```javascript
async applyInstructionUpdates(updates, requireHumanReview = true) {
  if (requireHumanReview) {
    await this.notifyMaintainer(updates);
    const approval = await this.waitForApproval();
    if (!approval) return { status: 'cancelled' };
  }
  
  // Create backups
  for (const update of updates) {
    await this.createBackup(update.file);
    await this.applyUpdate(update);
    await this.validateUpdate(update);
  }
  
  return { status: 'success', updatesApplied: updates.length };
}
```

---

## Update Triggers

### 🔴 Urgent (Immediate Update Required)
- Breaking API changes
- Security-related code modifications
- Self-awareness capability changes
- Provider integration failures

### 🟡 High Priority (Update Within 24 Hours)
- New API endpoints
- Major refactoring (>500 lines)
- New npm packages
- Development workflow changes

### 🟢 Normal Priority (Update Within 7 Days)
- Minor code improvements
- Documentation updates
- New examples added
- Performance optimizations

### ⚪ Low Priority (Update Monthly)
- Code style changes
- Minor bug fixes
- Comment updates
- Cosmetic changes

---

## Validation & Testing

### Instruction File Validation
```javascript
async validateInstructionFile(filePath) {
  const checks = {
    markdown: await this.validateMarkdownSyntax(filePath),
    links: await this.validateInternalLinks(filePath),
    codeExamples: await this.validateCodeExamples(filePath),
    references: await this.validateFileReferences(filePath),
    completeness: await this.checkRequiredSections(filePath)
  };
  
  return {
    valid: Object.values(checks).every(c => c.valid),
    checks,
    score: this.calculateValidityScore(checks)
  };
}
```

### Required Sections (All Files)
- ✅ Project Overview
- ✅ Architecture Snapshot
- ✅ Your Role/Specialty
- ✅ API Endpoints Reference
- ✅ Development Workflow
- ✅ Key Files to Understand
- ✅ Common Pitfalls & Solutions
- ✅ Integration with Other Providers
- ✅ Periodic Maintenance Tasks

### Code Example Validation
```javascript
async validateCodeExamples(instructionFile) {
  const examples = this.extractCodeBlocks(instructionFile);
  
  for (const example of examples) {
    // Check if referenced files exist
    const fileRefs = this.extractFileReferences(example);
    for (const ref of fileRefs) {
      if (!await this.fileExists(ref)) {
        warnings.push(`File ${ref} referenced but doesn't exist`);
      }
    }
    
    // Check if line numbers are accurate
    const lineRefs = this.extractLineReferences(example);
    for (const lineRef of lineRefs) {
      if (!await this.lineRangeValid(lineRef.file, lineRef.lines)) {
        errors.push(`Invalid line range in ${lineRef.file}`);
      }
    }
  }
}
```

---

## Metrics & Monitoring

### Instruction Health Dashboard
```javascript
async getInstructionHealthMetrics() {
  return {
    accuracy: await this.calculateAccuracyScore(),
    completeness: await this.calculateCompletenessScore(),
    freshness: await this.calculateFreshnessScore(),
    usability: await this.calculateUsabilityScore(),
    coverage: await this.calculateCoverageScore()
  };
}
```

**Metrics Tracked**:
- **Accuracy**: % of code examples that work
- **Completeness**: % of required sections present
- **Freshness**: Days since last update
- **Usability**: Readability score (Flesch-Kincaid)
- **Coverage**: % of codebase features documented

### Target Scores
- 🎯 Accuracy: >95%
- 🎯 Completeness: 100%
- 🎯 Freshness: <30 days
- 🎯 Usability: >60 (college level)
- 🎯 Coverage: >80%

---

## Implementation in TooLoo.ai

### Integration Points

**1. simple-api-server.js**
```javascript
// Add to PersonalAIManager constructor
this.instructionMaintenance = new InstructionMaintenanceManager({
  workspaceRoot: process.cwd(),
  checkInterval: '6h',
  autoUpdate: false // Require human approval
});

// Start monitoring
this.instructionMaintenance.startMonitoring();
```

**2. self-inspection-manager.js**
```javascript
// Add to inspection checks
async checkInstructionHealth() {
  const health = await this.instructionMaintenance.getHealthMetrics();
  
  if (health.accuracy < 0.95 || health.freshness > 30) {
    this.issuesFound.push({
      category: 'documentation',
      severity: 'medium',
      message: 'AI agent instructions may be outdated',
      recommendation: 'Run: npm run update-instructions'
    });
  }
}
```

**3. New npm script**
```json
// package.json
{
  "scripts": {
    "update-instructions": "node scripts/update-ai-instructions.js",
    "validate-instructions": "node scripts/validate-ai-instructions.js",
    "instruction-health": "node scripts/check-instruction-health.js"
  }
}
```

---

## Manual Override Commands

```bash
# Force immediate update
npm run update-instructions -- --force

# Validate all instruction files
npm run validate-instructions

# Check instruction health
npm run instruction-health

# Update specific provider
npm run update-instructions -- --provider=claude

# Generate update preview (no changes)
npm run update-instructions -- --dry-run
```

---

## Rollback Procedures

If an instruction update causes issues:

```bash
# Automatic backups stored in .github/.backups/
ls -la .github/.backups/

# Restore from backup
npm run restore-instructions -- --date=2025-10-01

# Or manually
cp .github/.backups/copilot-instructions.md.backup.1727740800 \
   .github/copilot-instructions.md
```

---

## Success Criteria

✅ All 4 instruction files remain accurate and synchronized  
✅ Instruction health scores above target thresholds  
✅ No outdated code examples (all work with current codebase)  
✅ All file references valid (files exist, line numbers correct)  
✅ Updates applied within SLA (urgent/high/normal/low priority)  
✅ Human maintainer notified of all changes  
✅ Backups created before every update  
✅ Validation passes after every update  

---

**Last Updated**: October 1, 2025  
**Version**: 1.0.0  
**Owner**: TooLoo.ai Self-Inspection System  
**Review Cycle**: Monthly (1st of month)  
**Next Review**: November 1, 2025
