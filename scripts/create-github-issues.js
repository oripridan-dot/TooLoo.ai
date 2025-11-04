#!/usr/bin/env node

/**
 * Automated GitHub Issue Creator
 * Reads .github/ISSUES/*.md files and creates real GitHub issues
 * Usage: node scripts/create-github-issues.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'oripridan-dot/TooLoo.ai';
const ISSUES_DIR = path.join(__dirname, '..', '.github', 'ISSUES');

if (!GITHUB_TOKEN) {
  console.error('❌ GITHUB_TOKEN not set in .env');
  process.exit(1);
}

/**
 * Parse issue markdown file into title, body, and labels
 */
function parseIssueFile(content) {
  const lines = content.split('\n');
  let title = '';
  let body = '';
  let labels = [];
  let inBody = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Extract title from first "Title: " line
    if (line.startsWith('Title:')) {
      title = line.replace('Title:', '').trim();
      continue;
    }

    // Everything after title is body until we see labels
    if (title && !inBody) {
      inBody = true;
      body = lines.slice(i).join('\n').trim();
      break;
    }
  }

  // Extract labels from body if present
  if (body.includes('Labels:')) {
    const match = body.match(/Labels:\s*([^\n]+)/);
    if (match) {
      labels = match[1].split(',').map(l => l.trim());
      body = body.replace(/Labels:\s*[^\n]+\n?/, '');
    }
  }

  return { title, body, labels };
}

/**
 * Create issue via GitHub API
 */
async function createIssue(title, body, labels) {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/issues`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title,
      body,
      labels
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${error}`);
  }

  return await response.json();
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting automated GitHub issue creation...\n');

  try {
    // Read all issue files
    const files = (await fs.readdir(ISSUES_DIR))
      .filter(f => f.startsWith('000') && f.endsWith('.md'))
      .sort();

    console.log(`📂 Found ${files.length} issue files\n`);

    const results = [];

    for (const file of files) {
      const filePath = path.join(ISSUES_DIR, file);
      const content = await fs.readFile(filePath, 'utf8');
      const { title, body, labels } = parseIssueFile(content);

      if (!title) {
        console.warn(`⚠️  Skipping ${file} - no title found`);
        continue;
      }

      console.log(`📝 Creating: ${file}`);
      console.log(`   Title: ${title}`);
      console.log(`   Labels: ${labels.join(', ') || 'none'}`);

      try {
        const issue = await createIssue(title, body, labels);
        console.log(`   ✅ Created as #${issue.number}`);
        console.log(`   🔗 ${issue.html_url}\n`);

        results.push({
          file,
          issueNumber: issue.number,
          url: issue.html_url,
          success: true
        });
      } catch (error) {
        console.error(`   ❌ Failed: ${error.message}\n`);
        results.push({
          file,
          error: error.message,
          success: false
        });
      }

      // Rate limit: wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 CREATION SUMMARY');
    console.log('='.repeat(70));

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`\n✅ Successfully created: ${successful.length}/${results.length}`);
    successful.forEach(r => {
      console.log(`   #${r.issueNumber}: ${r.file}`);
    });

    if (failed.length > 0) {
      console.log(`\n❌ Failed: ${failed.length}/${results.length}`);
      failed.forEach(r => {
        console.log(`   ${r.file}: ${r.error}`);
      });
      process.exit(1);
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎉 All issues created successfully!');
    console.log('='.repeat(70));
    console.log(`\n📍 View them at: https://github.com/${GITHUB_REPO}/issues\n`);

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

main();
