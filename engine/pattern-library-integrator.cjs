// Pattern Library Integrator
// Safely appends learned patterns to the pattern extractor, with backup
const fs = require('fs');
const path = require('path');

const extractorPath = path.join(__dirname, 'pattern-extractor.js');
const backupDir = path.join(__dirname, '../real-engine-backups');

function backupExtractor() {
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `pattern-extractor.${timestamp}.bak.js`);
  fs.copyFileSync(extractorPath, backupPath);
  return backupPath;
}

function normalizeId(str){
  return str.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}

function levenshtein(a,b){
  if(a===b) return 0; const m=a.length, n=b.length; if(!m) return n; if(!n) return m; const dp=Array.from({length:m+1},()=>Array(n+1).fill(0));
  for(let i=0;i<=m;i++) dp[i][0]=i; for(let j=0;j<=n;j++) dp[0][j]=j; for(let i=1;i<=m;i++){ for(let j=1;j<=n;j++){ const cost=a[i-1]===b[j-1]?0:1; dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+cost);} }
  return dp[m][n];
}

function appendPatterns(newPatterns) {
  if(!newPatterns || !newPatterns.length) return;
  backupExtractor();
  let extractorCode = fs.readFileSync(extractorPath, 'utf8');
  const patternListMatch = extractorCode.match(/export const patterns = \[(.|\s)*?\]/);
  if (!patternListMatch) throw new Error('Pattern list not found');
  let patternList = patternListMatch[0];
  // Collect existing IDs
  const existingIds = [...patternList.matchAll(/id:\s*'([^']+)'/g)].map(m=>m[1]);
  const existingNorm = existingIds.map(normalizeId);
  const filtered = [];
  for(const raw of newPatterns){
    if(!raw) continue; const candidate = typeof raw === 'string'? {id:raw} : raw;
    if(!candidate.id) continue; const norm = normalizeId(candidate.id);
    if(existingNorm.includes(norm)) continue; // exact duplicate after normalization
    // Near-duplicate suppression via Levenshtein distance ratio
    const isNear = existingNorm.some(e=>{
      const dist = levenshtein(e,norm);
      const maxLen = Math.max(e.length,norm.length)||1;
      const similarity = 1 - dist / maxLen;
      return similarity > 0.8; // too similar
    });
    if(isNear) continue;
    // sanitize final id
    candidate.id = norm;
    filtered.push(candidate);
  }
  if(!filtered.length) return;
  const insertIndex = patternList.lastIndexOf(']');
  const before = patternList.slice(0, insertIndex);
  const after = patternList.slice(insertIndex);
  const additions = filtered.map(p => `  ${JSON.stringify(p)}`).join(',\n');
  const newPatternList = before + ',\n' + additions + after;
  extractorCode = extractorCode.replace(patternList, newPatternList);
  fs.writeFileSync(extractorPath, extractorCode, 'utf8');
}

module.exports = { backupExtractor, appendPatterns };
