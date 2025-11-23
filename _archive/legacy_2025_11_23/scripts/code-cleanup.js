#!/usr/bin/env node

/**
 * Code Cleanup Script
 * Performs automated code cleanup and maintenance tasks
 */

import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

async function performCodeCleanup() {
  console.log('🧹 Performing code cleanup...');

  try {
    // Remove node_modules and reinstall for consistency
    await cleanNodeModules();

    // Remove temporary files
    await removeTempFiles();

    // Clean up build artifacts
    await cleanBuildArtifacts();

    // Format code
    await formatCode();

    // Lint and fix issues
    await lintAndFix();

    // Update dependencies
    await updateDependencies();

    // Generate fresh lockfile
    await generateLockfile();

    console.log('✅ Code cleanup completed');
  } catch (error) {
    console.error('❌ Error during code cleanup:', error);
    process.exit(1);
  }
}

async function cleanNodeModules() {
  try {
    console.log('📦 Cleaning node_modules...');

    const nodeModulesPath = path.join(repoRoot, 'node_modules');

    // Check if node_modules exists
    try {
      await fs.access(nodeModulesPath);
      await fs.rm(nodeModulesPath, { recursive: true, force: true });
      console.log('✅ Removed node_modules');
    } catch (error) {
      // node_modules doesn't exist, skip
    }

    // Reinstall dependencies
    execSync('npm install', {
      cwd: repoRoot,
      stdio: 'inherit'
    });

    console.log('✅ Reinstalled dependencies');
  } catch (error) {
    console.log('⚠️ Node modules cleanup skipped:', error.message);
  }
}

async function removeTempFiles() {
  try {
    console.log('🗑️ Removing temporary files...');

    const tempPatterns = [
      '**/*.tmp',
      '**/*.temp',
      '**/*.bak',
      '**/*.swp',
      '**/*.swo',
      '**/.DS_Store',
      '**/Thumbs.db',
      '**/desktop.ini'
    ];

    for (const pattern of tempPatterns) {
      try {
        execSync(`find . -name "${pattern.split('/').pop()}" -type f -delete`, {
          cwd: repoRoot
        });
      } catch (error) {
        // Continue with other patterns
      }
    }

    console.log('✅ Temporary files removed');
  } catch (error) {
    console.log('⚠️ Temp file removal skipped:', error.message);
  }
}

async function cleanBuildArtifacts() {
  try {
    console.log('🏗️ Cleaning build artifacts...');

    const buildDirs = [
      'dist',
      'build',
      'out',
      '.next',
      '.nuxt',
      '.output',
      'target',
      'bin',
      'obj'
    ];

    for (const dir of buildDirs) {
      const dirPath = path.join(repoRoot, dir);

      try {
        await fs.access(dirPath);
        await fs.rm(dirPath, { recursive: true, force: true });
        console.log(`✅ Removed build directory: ${dir}`);
      } catch (error) {
        // Directory doesn't exist, skip
      }
    }

    // Clean npm cache
    try {
      execSync('npm cache clean --force', {
        cwd: repoRoot,
        stdio: 'inherit'
      });
      console.log('✅ NPM cache cleaned');
    } catch (error) {
      console.log('⚠️ NPM cache clean skipped:', error.message);
    }

  } catch (error) {
    console.log('⚠️ Build artifact cleanup skipped:', error.message);
  }
}

async function formatCode() {
  try {
    console.log('🎨 Formatting code...');

    // Check if prettier is available
    try {
      execSync('npx prettier --version', { cwd: repoRoot, stdio: 'pipe' });

      // Format with prettier
      execSync('npx prettier --write "**/*.{js,ts,json,md,css,html}"', {
        cwd: repoRoot,
        stdio: 'inherit'
      });

      console.log('✅ Code formatted with Prettier');
    } catch (error) {
      console.log('⚠️ Prettier not available, skipping code formatting');
    }
  } catch (error) {
    console.log('⚠️ Code formatting skipped:', error.message);
  }
}

async function lintAndFix() {
  try {
    console.log('🔍 Running linter...');

    // Check if eslint is available
    try {
      execSync('npx eslint --version', { cwd: repoRoot, stdio: 'pipe' });

      // Run eslint with auto-fix
      execSync('npx eslint . --ext .js,.ts --fix', {
        cwd: repoRoot,
        stdio: 'inherit'
      });

      console.log('✅ ESLint fixes applied');
    } catch (error) {
      console.log('⚠️ ESLint not available, skipping linting');
    }
  } catch (error) {
    console.log('⚠️ Linting skipped:', error.message);
  }
}

async function updateDependencies() {
  try {
    console.log('⬆️ Updating dependencies...');

    // Update to latest compatible versions
    execSync('npm update', {
      cwd: repoRoot,
      stdio: 'inherit'
    });

    // Check for outdated packages
    try {
      const outdated = execSync('npm outdated --json', {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: 'pipe'
      });

      if (outdated.trim()) {
        console.log('📋 Outdated packages found:');
        console.log(outdated);
      } else {
        console.log('✅ All dependencies are up to date');
      }
    } catch (error) {
      console.log('⚠️ Could not check for outdated packages');
    }

  } catch (error) {
    console.log('⚠️ Dependency update skipped:', error.message);
  }
}

async function generateLockfile() {
  try {
    console.log('🔒 Generating fresh lockfile...');

    // Remove existing lockfile
    const lockfilePath = path.join(repoRoot, 'package-lock.json');
    try {
      await fs.unlink(lockfilePath);
      console.log('✅ Removed old package-lock.json');
    } catch (error) {
      // Lockfile doesn't exist, continue
    }

    // Generate new lockfile
    execSync('npm install', {
      cwd: repoRoot,
      stdio: 'inherit'
    });

    console.log('✅ Fresh lockfile generated');
  } catch (error) {
    console.log('⚠️ Lockfile generation skipped:', error.message);
  }
}

// Run the cleanup
performCodeCleanup();