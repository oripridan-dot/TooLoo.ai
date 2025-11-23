// @version 2.1.28
import fs from 'fs';
import path from 'path';

export default class FilesystemOrganizationManager {
  constructor({ workspaceRoot = process.cwd(), planDir = path.join(process.cwd(), 'data', 'fs-plans') } = {}){
    this.workspaceRoot = workspaceRoot;
    this.planDir = planDir;
    try { fs.mkdirSync(this.planDir, { recursive: true }); } catch {}
  }

  // Heuristic placement rules for common project files
  suggestHomeFor(filePath){
    const rel = path.relative(this.workspaceRoot, filePath);
    const name = path.basename(rel).toLowerCase();
    const ext = path.extname(name);
    if (name.endsWith('.test.js') || name.endsWith('.test.ts')) return 'tests/';
    if (['.md','.markdown'].includes(ext)) return 'docs/';
    if (name.includes('dashboard') || name.endsWith('.html')) return 'web-app/';
    if (name.endsWith('.sh')) return 'scripts/';
    if (name.endsWith('.json') && rel.startsWith('data/')) return 'data/';
    if (rel.startsWith('engine/')) return 'engine/';
    if (rel.startsWith('api/')) return 'api/';
    return path.dirname(rel) + '/';
  }

  // Scan workspace for files outside their "home" and propose moves
  async planOrganization(){
    const moves = [];
    const walk = (dir)=>{
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const ent of entries){
        if (ent.name.startsWith('.git') || ent.name === 'node_modules') continue;
        const abs = path.join(dir, ent.name);
        if (ent.isDirectory()) { walk(abs); continue; }
        const suggested = this.suggestHomeFor(abs);
        const rel = path.relative(this.workspaceRoot, abs);
        if (!rel.startsWith(suggested)){
          const destDir = path.join(this.workspaceRoot, suggested);
          const dest = path.join(destDir, path.basename(abs));
          moves.push({ from: rel, to: path.relative(this.workspaceRoot, dest) });
        }
      }
    };
    walk(this.workspaceRoot);
    const plan = { createdAt: new Date().toISOString(), moves };
    const planPath = path.join(this.planDir, `plan-${Date.now()}.json`);
    try { fs.writeFileSync(planPath, JSON.stringify(plan, null, 2)); } catch {}
    return { plan, planPath };
  }

  // Apply a subset of planned moves
  async applyMoves(moves = []){
    const applied = [];
    for (const m of moves){
      const src = path.join(this.workspaceRoot, m.from);
      const dst = path.join(this.workspaceRoot, m.to);
      try {
        const dstDir = path.dirname(dst);
        fs.mkdirSync(dstDir, { recursive: true });
        fs.renameSync(src, dst);
        applied.push(m);
      } catch (e) {
        applied.push({ ...m, error: e.message });
      }
    }
    // Persist record
    const rec = { appliedAt: new Date().toISOString(), applied };
    try { fs.appendFileSync(path.join(this.planDir, 'applied.log'), JSON.stringify(rec) + '\n'); } catch {}
    return rec;
  }
}
