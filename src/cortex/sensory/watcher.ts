// @version 2.1.239
import * as chokidar from 'chokidar';
import { EventBus } from '../../core/event-bus.js';
import * as path from 'path';

export class FileWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  private isReady: boolean = false;

  constructor(
    private bus: EventBus,
    private workspaceRoot: string
  ) {}

  public start(paths: string[] = ['.']) {
    console.log(`[Sensory:FileWatcher] Starting watch on: ${paths.join(', ')}`);

    this.watcher = chokidar.watch(paths, {
      cwd: this.workspaceRoot,
      ignored: [
        /(^|[\/\\])\../, // ignore dotfiles
        '**/node_modules/**',
        '**/dist/**',
        '**/coverage/**',
        '**/.git/**',
        '**/temp/**',
        '**/data/**',
        '**/logs/**',
        '**/_archive/**',
        '**/*.log',
        'server.log',
        'data',
        'logs',
        '_archive',
      ],
      persistent: true,
      ignoreInitial: true, // Don't emit 'add' for existing files on startup
    });

    this.watcher
      .on('add', (path) => this.emitChange('add', path))
      .on('change', (path) => this.emitChange('change', path))
      .on('unlink', (path) => this.emitChange('unlink', path))
      .on('error', (error) => console.error(`[Sensory:FileWatcher] Error: ${error}`))
      .on('ready', () => {
        this.isReady = true;
        console.log('[Sensory:FileWatcher] Initial scan complete. Ready for changes.');
        this.bus.publish('cortex', 'sensory:watcher:ready', { ready: true });
      });
  }

  public async stop() {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      this.isReady = false;
    }
  }

  private emitChange(event: 'add' | 'change' | 'unlink', filePath: string) {
    // Debounce or filter logic could go here
    console.log(`[Sensory:FileWatcher] Detected ${event}: ${filePath}`);

    this.bus.publish('cortex', 'sensory:file:change', {
      type: event,
      path: filePath,
      timestamp: Date.now(),
    });
  }
}
