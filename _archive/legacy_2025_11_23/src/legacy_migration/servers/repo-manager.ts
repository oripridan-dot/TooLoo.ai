import express from 'express';
import { ServiceFoundation } from '../lib/service-foundation.js';
import githubProvider from '../engine/github-provider.js';

// Initialize service
const svc = new ServiceFoundation('repo-manager', process.env.REPO_MANAGER_PORT || 3010);
svc.setupMiddleware();
svc.registerHealthEndpoint();
svc.registerStatusEndpoint();

const app = svc.app;

// Auto-Organization Endpoints

// 1. Stale Branch Cleanup
app.post('/api/v1/repo/cleanup-branches', async (req, res) => {
  try {
    const { dryRun = true, days = 30 } = req.body;
    
    // Logic to list branches and filter by last commit date
    // This is a placeholder for the actual git logic
    // In a real implementation, we'd use simple-git or octokit
    
    const branches = await githubProvider.listBranches(); // Assuming this method exists or we add it
    const staleBranches = branches.filter(b => {
      // Mock logic: random branches are stale
      return Math.random() > 0.8;
    });

    if (!dryRun) {
      // Delete branches
      // await githubProvider.deleteBranches(staleBranches);
    }

    res.json({
      ok: true,
      action: 'cleanup-branches',
      dryRun,
      staleBranches: staleBranches.map(b => b.name),
      count: staleBranches.length
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// 2. PR Triage
app.post('/api/v1/repo/triage-prs', async (req, res) => {
  try {
    // Logic to list open PRs and apply labels based on content
    const prs = await githubProvider.listPullRequests('open');
    
    const triaged = [];
    for (const pr of prs) {
      const labels = [];
      if (pr.title.includes('feat')) labels.push('enhancement');
      if (pr.title.includes('fix')) labels.push('bug');
      if (pr.title.includes('docs')) labels.push('documentation');
      
      if (labels.length > 0) {
        // await githubProvider.addLabels(pr.number, labels);
        triaged.push({ number: pr.number, labels });
      }
    }

    res.json({
      ok: true,
      action: 'triage-prs',
      triaged
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Start server
svc.start();
