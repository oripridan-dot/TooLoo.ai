// @version 2.2.333
import fs from 'fs-extra';
import path from 'path';

export class FeedbackLoop {
  private patternsPath: string;

  constructor(workspaceRoot: string) {
    this.patternsPath = path.join(workspaceRoot, 'data/patterns.json');
  }

  async recordFeedback(taskId: string, positive: boolean, comment?: string) {
    // Load patterns
    let patterns: any = { successful: [], failed: [] };
    try {
      if (await fs.pathExists(this.patternsPath)) {
        patterns = await fs.readJson(this.patternsPath);
      }
    } catch (e) {
      // ignore
    }

    // Update patterns
    const entry = { taskId, comment, timestamp: Date.now() };
    if (positive) {
      patterns.successful.push(entry);
    } else {
      patterns.failed.push(entry);
    }

    // Limit size
    if (patterns.successful.length > 1000) patterns.successful = patterns.successful.slice(-1000);
    if (patterns.failed.length > 1000) patterns.failed = patterns.failed.slice(-1000);

    // Save
    try {
      await fs.ensureFile(this.patternsPath);
      await fs.writeJson(this.patternsPath, patterns, { spaces: 2 });
      console.log(
        `[FeedbackLoop] Recorded ${positive ? 'positive' : 'negative'} feedback for task ${taskId}`
      );
    } catch (e) {
      console.error('[FeedbackLoop] Failed to save patterns:', e);
    }
  }
}
