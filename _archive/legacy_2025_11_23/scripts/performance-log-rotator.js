#!/usr/bin/env node

/**
 * Performance Log Rotator
 * Rotates and archives performance logs to prevent disk space issues
 */

import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

async function rotatePerformanceLogs() {
  console.log('🔄 Rotating performance logs...');

  try {
    const logsDir = path.join(repoRoot, 'logs');
    const archiveDir = path.join(logsDir, 'archive');
    const performanceLogsDir = path.join(logsDir, 'performance');

    // Ensure directories exist
    await fs.mkdir(archiveDir, { recursive: true });
    await fs.mkdir(performanceLogsDir, { recursive: true });

    // Rotate performance logs
    await rotateLogs(performanceLogsDir, archiveDir, 'performance-*.log', 7); // Keep 7 days

    // Rotate general logs
    await rotateLogs(logsDir, archiveDir, '*.log', 30); // Keep 30 days

    // Compress old archives
    await compressOldArchives(archiveDir, 90); // Compress after 90 days

    // Clean up very old compressed archives
    await cleanupOldArchives(archiveDir, 365); // Delete after 1 year

    console.log('✅ Performance log rotation completed');
  } catch (error) {
    console.error('❌ Error rotating performance logs:', error);
    process.exit(1);
  }
}

async function rotateLogs(sourceDir, archiveDir, pattern, maxAgeDays) {
  try {
    const files = await fs.readdir(sourceDir);
    const now = Date.now();
    const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;

    for (const file of files) {
      if (file.match(pattern.replace('*', '.*'))) {
        const filePath = path.join(sourceDir, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtime.getTime() > maxAge) {
          const archivePath = path.join(archiveDir, `${file}.${Date.now()}.old`);
          await fs.rename(filePath, archivePath);
          console.log(`📦 Archived: ${file} → ${path.basename(archivePath)}`);
        }
      }
    }
  } catch (error) {
    console.log(`⚠️ Log rotation skipped for ${pattern}:`, error.message);
  }
}

async function compressOldArchives(archiveDir, compressAfterDays) {
  try {
    const files = await fs.readdir(archiveDir);
    const now = Date.now();
    const compressAfter = compressAfterDays * 24 * 60 * 60 * 1000;

    for (const file of files) {
      if (file.endsWith('.old') && !file.endsWith('.gz')) {
        const filePath = path.join(archiveDir, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtime.getTime() > compressAfter) {
          const compressedPath = `${filePath}.gz`;

          try {
            // Use gzip to compress
            execSync(`gzip -c "${filePath}" > "${compressedPath}"`, {
              cwd: repoRoot
            });

            // Remove original file after successful compression
            await fs.unlink(filePath);
            console.log(`🗜️ Compressed: ${file} → ${path.basename(compressedPath)}`);
          } catch (compressError) {
            console.log(`⚠️ Failed to compress ${file}:`, compressError.message);
          }
        }
      }
    }
  } catch (error) {
    console.log('⚠️ Archive compression skipped:', error.message);
  }
}

async function cleanupOldArchives(archiveDir, deleteAfterDays) {
  try {
    const files = await fs.readdir(archiveDir);
    const now = Date.now();
    const deleteAfter = deleteAfterDays * 24 * 60 * 60 * 1000;

    for (const file of files) {
      if (file.endsWith('.gz')) {
        const filePath = path.join(archiveDir, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtime.getTime() > deleteAfter) {
          await fs.unlink(filePath);
          console.log(`🗑️ Deleted old archive: ${file}`);
        }
      }
    }
  } catch (error) {
    console.log('⚠️ Archive cleanup skipped:', error.message);
  }
}

// Run the rotator
rotatePerformanceLogs();