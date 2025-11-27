// @version 2.2.30
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const SRC_DIR = path.join(process.cwd(), 'src');
const IGNORE_PATTERNS = ['**/*.d.ts', '**/*.test.ts', '**/*.spec.ts', '**/node_modules/**'];

// Entry points that are implicitly "used"
const ENTRY_POINTS = [
  'src/main.ts',
  'src/cli/index.ts',
  'src/nexus/index.ts', // Often imported by main, but good to be safe
  'src/web-app/src/main.jsx', // Frontend entry
  'src/web-app/src/main.tsx',
  'src/web-app/vite.config.ts',
  'src/web-app/tailwind.config.js',
  'src/web-app/postcss.config.js'
];

async function audit() {
  console.log('🔍 Starting Codebase Audit...');

  // 1. Get all source files
  const allFiles = await glob('src/**/*.{ts,tsx,js,jsx,cjs,mjs}', { ignore: IGNORE_PATTERNS });
  const allFilesSet = new Set(allFiles.map(f => path.relative(process.cwd(), f).replace(/\\/g, '/')));

  console.log(`Found ${allFiles.length} source files.`);

  // 2. Build Import Graph
  const imports = new Set<string>();

  for (const file of allFiles) {
    if (!fs.statSync(file).isFile()) continue;
    const content = fs.readFileSync(file, 'utf-8');
    const fileDir = path.dirname(file);

    // Regex for imports
    // import ... from '...'
    // export ... from '...'
    // require('...')
    const importRegex = /(?:import|export)\s+(?:[\s\S]*?from\s+)?['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\)/g;
    
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1] || match[2];
      if (!importPath) continue;

      if (importPath.startsWith('.')) {
        // Resolve relative path
        try {
            let resolved = path.resolve(fileDir, importPath);
            // Try extensions
            const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.json', '.cjs', '.mjs'];
            let found = false;
            
            // Handle directory imports (index.ts/js)
            if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
                 resolved = path.join(resolved, 'index');
            }

            for (const ext of extensions) {
                const probe = resolved + ext;
                if (fs.existsSync(probe) && fs.statSync(probe).isFile()) {
                    imports.add(path.relative(process.cwd(), probe).replace(/\\/g, '/'));
                    found = true;
                    break;
                }
            }
        } catch (e) {
            // Ignore resolution errors
        }
      }
    }
  }

  // 3. Find Orphans
  const orphans = [];
  for (const file of allFilesSet) {
    if (!imports.has(file) && !ENTRY_POINTS.includes(file)) {
        // Check if it's in an entry point directory but not explicitly an entry point?
        // No, strict check.
        
        // Exclude some known patterns
        if (file.includes('/routes/')) continue; // Routes are often dynamically loaded or just not imported by other files (mounted in index)
        if (file.endsWith('index.ts')) continue; // Index files are often entry points for modules
        
        orphans.push(file);
    }
  }

  console.log(`\n🚫 Found ${orphans.length} potential orphans (files not imported by others):`);
  orphans.sort().forEach(f => console.log(`- ${f}`));

  // 4. Check for TODOs
  let todoCount = 0;
  for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes('TODO') || content.includes('FIXME')) {
          todoCount++;
      }
  }
  console.log(`\n📝 Found ${todoCount} files with TODO/FIXME comments.`);

}

audit().catch(console.error);
