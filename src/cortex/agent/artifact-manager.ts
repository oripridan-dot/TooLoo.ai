// @version 3.3.0
/**
 * Artifact Manager - Code and File Artifact Storage
 *
 * Manages the storage, versioning, and retrieval of artifacts
 * created by the Agent Execution System.
 *
 * @module cortex/agent/artifact-manager
 */

import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { bus } from '../../core/event-bus.js';
import type { Artifact, ArtifactType, ArtifactVersion } from './types.js';

const ARTIFACTS_DIR = path.join(process.cwd(), 'data', 'artifacts');
const ARTIFACTS_INDEX = path.join(ARTIFACTS_DIR, 'index.json');

interface ArtifactIndex {
  version: string;
  artifacts: Artifact[];
  stats: {
    totalArtifacts: number;
    byType: Record<ArtifactType, number>;
    lastUpdated: string;
  };
}

export class ArtifactManager {
  private index: ArtifactIndex;
  private initialized = false;

  constructor() {
    this.index = {
      version: '3.3.0',
      artifacts: [],
      stats: {
        totalArtifacts: 0,
        byType: {} as Record<ArtifactType, number>,
        lastUpdated: new Date().toISOString(),
      },
    };
  }

  /**
   * Initialize the artifact manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Ensure directories exist
    await fs.ensureDir(ARTIFACTS_DIR);
    await fs.ensureDir(path.join(ARTIFACTS_DIR, 'code'));
    await fs.ensureDir(path.join(ARTIFACTS_DIR, 'component'));
    await fs.ensureDir(path.join(ARTIFACTS_DIR, 'test'));
    await fs.ensureDir(path.join(ARTIFACTS_DIR, 'config'));
    await fs.ensureDir(path.join(ARTIFACTS_DIR, 'documentation'));
    await fs.ensureDir(path.join(ARTIFACTS_DIR, 'data'));
    await fs.ensureDir(path.join(ARTIFACTS_DIR, 'versions'));

    // Load existing index
    if (await fs.pathExists(ARTIFACTS_INDEX)) {
      this.index = await fs.readJson(ARTIFACTS_INDEX);
    } else {
      await this.saveIndex();
    }

    this.initialized = true;
    console.log(`[ArtifactManager] Initialized with ${this.index.artifacts.length} artifacts`);
  }

  /**
   * Create a new artifact
   */
  async createArtifact(params: {
    type: ArtifactType;
    name: string;
    content: string;
    language?: string;
    description?: string;
    createdBy: string;
    metadata?: Record<string, unknown>;
    tags?: string[];
  }): Promise<Artifact> {
    await this.ensureInitialized();

    const artifact: Artifact = {
      id: uuidv4(),
      type: params.type,
      name: params.name,
      description: params.description,
      content: params.content,
      language: params.language,
      version: '1.0.0',
      createdAt: new Date(),
      createdBy: params.createdBy,
      metadata: params.metadata,
      tags: params.tags,
    };

    // Determine file path
    const extension = this.getExtension(params.type, params.language);
    const filename = `${artifact.id}${extension}`;
    artifact.path = path.join(params.type, filename);

    // Save content to file
    const fullPath = path.join(ARTIFACTS_DIR, artifact.path);
    await fs.outputFile(fullPath, params.content);

    // Save initial version
    await this.saveVersion(artifact.id, artifact.version, params.content);

    // Update index
    this.index.artifacts.push(artifact);
    this.index.stats.totalArtifacts++;
    this.index.stats.byType[params.type] = (this.index.stats.byType[params.type] || 0) + 1;
    await this.saveIndex();

    // Emit event
    bus.publish('cortex', 'agent:artifact:created', {
      artifactId: artifact.id,
      type: params.type,
      name: params.name,
      path: artifact.path,
    });

    console.log(`[ArtifactManager] Created artifact: ${artifact.name} (${artifact.id})`);
    return artifact;
  }

  /**
   * Update an existing artifact
   */
  async updateArtifact(
    id: string,
    content: string,
    options?: { bumpVersion?: 'major' | 'minor' | 'patch' }
  ): Promise<Artifact | null> {
    await this.ensureInitialized();

    const artifact = this.index.artifacts.find((a) => a.id === id);
    if (!artifact) {
      console.warn(`[ArtifactManager] Artifact not found: ${id}`);
      return null;
    }

    // Bump version
    const newVersion = this.bumpVersion(artifact.version, options?.bumpVersion || 'patch');

    // Save old version
    if (artifact.content) {
      await this.saveVersion(id, artifact.version, artifact.content);
    }

    // Update artifact
    artifact.content = content;
    artifact.version = newVersion;

    // Save to file
    if (artifact.path) {
      const fullPath = path.join(ARTIFACTS_DIR, artifact.path);
      await fs.outputFile(fullPath, content);
    }

    await this.saveIndex();

    // Emit event
    bus.publish('cortex', 'agent:artifact:updated', {
      artifactId: id,
      version: newVersion,
    });

    console.log(`[ArtifactManager] Updated artifact: ${artifact.name} → v${newVersion}`);
    return artifact;
  }

  /**
   * Get artifact by ID
   */
  async getArtifact(id: string): Promise<Artifact | null> {
    await this.ensureInitialized();

    const artifact = this.index.artifacts.find((a) => a.id === id);
    if (!artifact) return null;

    // Load content if path exists
    if (artifact.path && !artifact.content) {
      const fullPath = path.join(ARTIFACTS_DIR, artifact.path);
      if (await fs.pathExists(fullPath)) {
        artifact.content = await fs.readFile(fullPath, 'utf-8');
      }
    }

    return artifact;
  }

  /**
   * Get artifact versions
   */
  async getVersions(id: string): Promise<ArtifactVersion[]> {
    await this.ensureInitialized();

    const versionsDir = path.join(ARTIFACTS_DIR, 'versions', id);
    if (!(await fs.pathExists(versionsDir))) {
      return [];
    }

    const files = await fs.readdir(versionsDir);
    const versions: ArtifactVersion[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const versionData = await fs.readJson(path.join(versionsDir, file));
        versions.push(versionData);
      }
    }

    return versions.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * List artifacts with filters
   */
  async listArtifacts(filters?: {
    type?: ArtifactType;
    language?: string;
    tags?: string[];
    createdBy?: string;
    limit?: number;
  }): Promise<Artifact[]> {
    await this.ensureInitialized();

    let results = [...this.index.artifacts];

    if (filters?.type) {
      results = results.filter((a) => a.type === filters.type);
    }

    if (filters?.language) {
      results = results.filter((a) => a.language === filters.language);
    }

    if (filters?.tags && filters.tags.length > 0) {
      results = results.filter((a) => a.tags && (filters.tags as string[]).some((tag) => (a.tags as string[]).includes(tag)));
    }

    if (filters?.createdBy) {
      results = results.filter((a) => a.createdBy === filters.createdBy);
    }

    if (filters?.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  /**
   * Delete artifact
   */
  async deleteArtifact(id: string): Promise<boolean> {
    await this.ensureInitialized();

    const index = this.index.artifacts.findIndex((a) => a.id === id);
    if (index === -1) return false;

    const artifact = this.index.artifacts[index];
    if (!artifact) return false;

    // Delete file
    if (artifact.path) {
      const fullPath = path.join(ARTIFACTS_DIR, artifact.path);
      await fs.remove(fullPath);
    }

    // Delete versions
    const versionsDir = path.join(ARTIFACTS_DIR, 'versions', id);
    await fs.remove(versionsDir);

    // Update index
    this.index.artifacts.splice(index, 1);
    this.index.stats.totalArtifacts--;
    const artifactType = artifact.type;
    if (artifactType && this.index.stats.byType[artifactType]) {
      this.index.stats.byType[artifactType]--;
    }
    await this.saveIndex();

    console.log(`[ArtifactManager] Deleted artifact: ${artifact.name} (${id})`);
    return true;
  }

  /**
   * Get statistics
   */
  getStats(): ArtifactIndex['stats'] {
    return this.index.stats;
  }

  // ============= Private Methods =============

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private async saveIndex(): Promise<void> {
    this.index.stats.lastUpdated = new Date().toISOString();
    await fs.writeJson(ARTIFACTS_INDEX, this.index, { spaces: 2 });
  }

  private async saveVersion(artifactId: string, version: string, content: string): Promise<void> {
    const versionsDir = path.join(ARTIFACTS_DIR, 'versions', artifactId);
    await fs.ensureDir(versionsDir);

    const versionData: ArtifactVersion = {
      version,
      content,
      createdAt: new Date(),
    };

    await fs.writeJson(path.join(versionsDir, `${version}.json`), versionData, { spaces: 2 });
  }

  private getExtension(type: ArtifactType, language?: string): string {
    if (language) {
      const langExtensions: Record<string, string> = {
        typescript: '.ts',
        javascript: '.js',
        python: '.py',
        jsx: '.jsx',
        tsx: '.tsx',
        html: '.html',
        css: '.css',
        json: '.json',
        yaml: '.yaml',
        markdown: '.md',
      };
      return langExtensions[language.toLowerCase()] || '.txt';
    }

    const typeExtensions: Record<ArtifactType, string> = {
      code: '.ts',
      component: '.tsx',
      test: '.test.ts',
      config: '.json',
      documentation: '.md',
      data: '.json',
      binary: '.bin',
    };

    return typeExtensions[type] || '.txt';
  }

  private bumpVersion(current: string, bump: 'major' | 'minor' | 'patch'): string {
    const parts = current.split('.').map(Number);
    if (parts.length !== 3) return '1.0.0';

    const major = parts[0] ?? 1;
    const minor = parts[1] ?? 0;
    const patch = parts[2] ?? 0;

    switch (bump) {
      case 'major':
        return `${major + 1}.0.0`;
      case 'minor':
        return `${major}.${minor + 1}.0`;
      case 'patch':
      default:
        return `${major}.${minor}.${patch + 1}`;
    }
  }
}

// Singleton export
export const artifactManager = new ArtifactManager();
