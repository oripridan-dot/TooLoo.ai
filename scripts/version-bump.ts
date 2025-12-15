/**
 * @file Version Bump Script
 * @description Auto-increments the Skills OS version
 * @version 1.0.0
 * @skill-os true
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const VERSION_FILE = join(process.cwd(), 'version.json');

interface VersionInfo {
  name: string;
  version: string;
  codename: string;
  build: number;
  releaseDate: string;
  autoIncrement: boolean;
}

function bumpVersion(): void {
  // Read current version
  const content = readFileSync(VERSION_FILE, 'utf-8');
  const version: VersionInfo = JSON.parse(content);

  // Increment build number
  version.build += 1;

  // Update version string (1.0.X where X is build)
  const [major, minor] = version.version.split('.').map(Number);
  version.version = `${major}.${minor}.${version.build}`;

  // Update release date
  version.releaseDate = new Date().toISOString().split('T')[0];

  // Write back
  writeFileSync(VERSION_FILE, JSON.stringify(version, null, 2) + '\n');

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    VERSION BUMPED                            ║
╚══════════════════════════════════════════════════════════════╝

  Name:     ${version.name}
  Version:  ${version.version}
  Codename: ${version.codename}
  Build:    ${version.build}
  Date:     ${version.releaseDate}

`);
}

bumpVersion();
