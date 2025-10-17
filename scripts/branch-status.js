#!/usr/bin/env node

import { execSync } from 'child_process';
import process from 'process';

function run(cmd) {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
  } catch (error) {
    return null;
  }
}

function parseAheadBehind(raw) {
  if (!raw) return { ahead: null, behind: null };
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { ahead: null, behind: null };
  return { behind: Number(parts[0] || 0), ahead: Number(parts[1] || 0) };
}

const branch = run('git rev-parse --abbrev-ref HEAD') || 'unknown';
const upstream = run('git rev-parse --abbrev-ref HEAD@{upstream}');
const porcelain = run('git status --porcelain');
const dirtyCount = porcelain ? porcelain.split('\n').filter(Boolean).length : 0;
const aheadBehind = parseAheadBehind(run('git rev-list --left-right --count origin/main...HEAD'));

const lines = [];
lines.push(`Branch: ${branch}`);
if (upstream) {
  lines.push(`Upstream: ${upstream}`);
} else {
  lines.push('Upstream: (none)');
}
lines.push(`Working tree: ${dirtyCount > 0 ? `dirty (${dirtyCount} file${dirtyCount === 1 ? '' : 's'})` : 'clean'}`);
if (aheadBehind.ahead !== null && aheadBehind.behind !== null) {
  lines.push(`Ahead/behind origin/main: +${aheadBehind.ahead} / -${aheadBehind.behind}`);
} else {
  lines.push('Ahead/behind origin/main: (unavailable)');
}

if (dirtyCount > 0) {
  lines.push('\nNext: stash or commit local changes before branching');
} else if (aheadBehind.behind > 0) {
  lines.push('\nNext: pull updates from origin/main');
} else {
  lines.push('\nNext: ready for feature work or PR checkout');
}

process.stdout.write(lines.join('\n') + '\n');
