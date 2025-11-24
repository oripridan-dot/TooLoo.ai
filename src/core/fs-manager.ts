// @version 2.1.229
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

interface FileTransaction {
    id: string;
    timestamp: number;
    backups: Map<string, string>; // originalPath -> backupPath
    status: 'active' | 'committed' | 'rolled_back';
}

interface ContextBundle {
    target: { path: string; content: string };
    dependencies: { path: string; content: string }[];
    projectMap: string;
    transactionId?: string;
}

export class SmartFSManager {
    private static instance: SmartFSManager;
    private activeTransactions: Map<string, FileTransaction> = new Map();
    private readonly RECOVERY_DIR = '.tooloo/recovery';
    private readonly PROJECT_ROOT = process.cwd();
    private readonly IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', '.tooloo']);

    private constructor() {
        this.ensureRecoveryDir();
    }

    public static getInstance(): SmartFSManager {
        if (!SmartFSManager.instance) {
            SmartFSManager.instance = new SmartFSManager();
        }
        return SmartFSManager.instance;
    }

    private async ensureRecoveryDir() {
        await fs.mkdir(this.RECOVERY_DIR, { recursive: true }).catch(() => {});
    }

    // ==========================================
    // 🧠 INTELLIGENCE LAYER (The "Golden Plate")
    // ==========================================

    /**
     * The "Golden Plate": Serves the file, its dependencies, and a map.
     * Drastically reduces AI "understanding time".
     */
    public async getGoldenPlate(filePath: string, transactionId?: string): Promise<ContextBundle> {
        const absolutePath = path.resolve(this.PROJECT_ROOT, filePath);
        
        // 1. Get Target Content
        let content = '';
        try {
            content = await this.read(absolutePath);
        } catch (e) {
            throw new Error(`File not found: ${filePath}`);
        }
        
        // 2. Resolve Dependencies (The "Whys" and "Whats")
        const dependencies = await this.resolveDependencies(absolutePath, content);

        // 3. Generate Project Map (The "Wheres")
        const projectMap = await this.getProjectStructure();

        // 4. Manage Transaction
        let txId = transactionId;
        if (!txId) {
            txId = this.startTransaction();
        }

        return {
            target: { path: filePath, content },
            dependencies,
            projectMap,
            transactionId: txId
        };
    }

    /**
     * Generates a high-speed ASCII tree of the project.
     * Helps AI orient itself instantly.
     */
    public async getProjectStructure(dir: string = this.PROJECT_ROOT, depth: number = 0, maxDepth: number = 3): Promise<string> {
        if (depth > maxDepth) return '';
        
        let structure = '';
        const prefix = '  '.repeat(depth);
        
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                if (entry.name.startsWith('.') || this.IGNORE_DIRS.has(entry.name)) continue;

                if (entry.isDirectory()) {
                    structure += `${prefix}📂 ${entry.name}/\n`;
                    structure += await this.getProjectStructure(path.join(dir, entry.name), depth + 1, maxDepth);
                } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.json') || entry.name.endsWith('.md'))) {
                    structure += `${prefix}📄 ${entry.name}\n`;
                }
            }
        } catch (e) {
            return `${prefix}Error reading directory`;
        }
        return structure;
    }

    private async resolveDependencies(sourcePath: string, content: string): Promise<{ path: string; content: string }[]> {
        const imports = this.scanImports(content);
        const dependencies: { path: string; content: string }[] = [];
        const processed = new Set<string>();

        for (const imp of imports) {
            try {
                const resolvedPath = this.resolveImportPath(sourcePath, imp);
                if (resolvedPath && resolvedPath.startsWith(this.PROJECT_ROOT) && !processed.has(resolvedPath)) {
                    // Avoid circular self-reference
                    if (resolvedPath !== sourcePath) {
                        const depContent = await this.read(resolvedPath);
                        dependencies.push({
                            path: path.relative(this.PROJECT_ROOT, resolvedPath),
                            content: depContent
                        });
                        processed.add(resolvedPath);
                    }
                }
            } catch (e) {
                // Ignore external or unresolvable modules
            }
        }
        return dependencies;
    }

    private scanImports(content: string): string[] {
        const importRegex = /import\s+.*?\s+from\s+['"](.*?)['"]/g;
        const matches = [...content.matchAll(importRegex)];
        return matches.map(m => m[1]);
    }

    private resolveImportPath(sourceFile: string, importPath: string): string | null {
        if (!importPath.startsWith('.')) return null; // Ignore node_modules
        
        const dir = path.dirname(sourceFile);
        let resolved = path.resolve(dir, importPath);
        
        // Naive TS resolution
        if (!resolved.endsWith('.ts') && !resolved.endsWith('.js')) {
            // Check if it's a file
            if (fs.stat(resolved + '.ts').then(() => true).catch(() => false)) {
                resolved += '.ts';
            } else if (fs.stat(resolved + '/index.ts').then(() => true).catch(() => false)) {
                resolved += '/index.ts';
            }
        }
        return resolved;
    }

    // ==========================================
    // 🛡️ RESILIENCE LAYER (Transactional FS)
    // ==========================================

    public startTransaction(): string {
        const id = crypto.randomUUID();
        this.activeTransactions.set(id, {
            id,
            timestamp: Date.now(),
            backups: new Map(),
            status: 'active'
        });
        return id;
    }

    public async read(filePath: string): Promise<string> {
        return await fs.readFile(filePath, 'utf-8');
    }

    public async writeSafe(filePath: string, content: string, transactionId?: string): Promise<void> {
        const absolutePath = path.resolve(this.PROJECT_ROOT, filePath);
        
        // Auto-start transaction if none provided
        const txId = transactionId || this.startTransaction();
        const tx = this.activeTransactions.get(txId);

        if (tx && tx.status === 'active') {
            // Snapshot original state if not already backed up
            if (!tx.backups.has(absolutePath)) {
                const backupPath = await this.createBackup(absolutePath);
                tx.backups.set(absolutePath, backupPath);
            }
        }

        // Atomic Write
        const tempPath = `${absolutePath}.tmp-${crypto.randomUUID()}`;
        await fs.writeFile(tempPath, content, 'utf-8');
        await fs.rename(tempPath, absolutePath);
    }

    public async rollback(transactionId: string): Promise<boolean> {
        const tx = this.activeTransactions.get(transactionId);
        if (!tx || tx.status !== 'active') return false;

        console.log(`[SmartFS] ⏪ Rolling back transaction ${transactionId}`);
        for (const [originalPath, backupPath] of tx.backups) {
            try {
                if (backupPath === 'NEW_FILE') {
                    await fs.unlink(originalPath).catch(() => {});
                } else {
                    await fs.copyFile(backupPath, originalPath);
                }
            } catch (err) {
                console.error(`[SmartFS] Failed to restore ${originalPath}`, err);
            }
        }

        tx.status = 'rolled_back';
        this.activeTransactions.delete(transactionId);
        return true;
    }

    public commit(transactionId: string): void {
        const tx = this.activeTransactions.get(transactionId);
        if (tx) {
            tx.status = 'committed';
            this.activeTransactions.delete(transactionId);
        }
    }

    private async createBackup(filePath: string): Promise<string> {
        try {
            await fs.access(filePath);
            const filename = path.basename(filePath);
            const hash = crypto.createHash('md5').update(filePath).digest('hex').substring(0, 8);
            const backupPath = path.join(this.RECOVERY_DIR, `${filename}.${hash}.${Date.now()}.bak`);
            await fs.copyFile(filePath, backupPath);
            return backupPath;
        } catch {
            return 'NEW_FILE';
        }
    }
}

export const smartFS = SmartFSManager.getInstance();