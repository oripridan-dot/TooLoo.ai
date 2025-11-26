// @version 2.1.260
import * as fs from 'fs-extra';
import * as path from 'path';
import * as chokidar from 'chokidar';
import { bus } from '../core/event-bus.js';

export interface SystemNode {
    id: string;
    type: 'server' | 'script' | 'engine' | 'doc' | 'other';
    path: string;
    metadata: Record<string, any>;
}

export class SystemModel {
    private nodes: Map<string, SystemNode> = new Map();
    private initialized: boolean = false;
    private watcher: chokidar.FSWatcher | null = null;

    constructor(private rootDir: string) {
    }

    async initialize() {
        if (this.initialized) return;
        
        // Load Legacy Map
        const legacyMapPath = path.join(this.rootDir, 'src/cortex/legacy-map.json');
        if (await fs.pathExists(legacyMapPath)) {
            const data = await fs.readJson(legacyMapPath);
            this.ingestLegacyData(data);
        }

        this.startWatch();

        this.initialized = true;
        console.log(`🧠 Cortex: System Model Initialized. Loaded ${this.nodes.size} nodes.`);
    }

    private startWatch() {
        console.log('👁️  Cortex: Starting real-time file watch...');
        this.watcher = chokidar.watch(this.rootDir, {
            ignored: [
                // eslint-disable-next-line no-useless-escape
                /(^|[\/\\])\../, // ignore dotfiles
                '**/node_modules/**',
                '**/dist/**',
                '**/.git/**'
            ],
            persistent: true,
            ignoreInitial: true
        });

        this.watcher
            .on('add', path => this.handleFileChange('add', path))
            .on('change', path => this.handleFileChange('change', path))
            .on('unlink', path => this.handleFileChange('unlink', path));
    }

    private handleFileChange(event: 'add' | 'change' | 'unlink', filePath: string) {
        const relativePath = path.relative(this.rootDir, filePath);
        
        if (event === 'unlink') {
            this.nodes.delete(relativePath);
        } else {
            // Simple ingestion for now
            this.nodes.set(relativePath, {
                id: path.basename(filePath),
                type: this.determineType(filePath),
                path: relativePath,
                metadata: { lastModified: Date.now() }
            });
        }

        bus.publish('cortex', 'system:file_changed', {
            event,
            path: relativePath,
            timestamp: Date.now()
        });
    }

    private determineType(filePath: string): SystemNode['type'] {
        if (filePath.includes('servers/')) return 'server';
        if (filePath.includes('scripts/')) return 'script';
        if (filePath.endsWith('.md')) return 'doc';
        if (filePath.includes('engine') || filePath.includes('lib')) return 'engine';
        return 'other';
    }

    private ingestLegacyData(data: any) {
        for (const module of data.modules) {
            this.nodes.set(module.path, {
                id: module.name,
                type: module.type,
                path: module.path,
                metadata: {
                    size: module.size,
                    legacy: true
                }
            });
        }
    }

    query(filter: (node: SystemNode) => boolean): SystemNode[] {
        return Array.from(this.nodes.values()).filter(filter);
    }

    getStats() {
        const stats = {
            total: this.nodes.size,
            byType: {} as Record<string, number>
        };
        
        for (const node of this.nodes.values()) {
            stats.byType[node.type] = (stats.byType[node.type] || 0) + 1;
        }
        return stats;
    }
}
