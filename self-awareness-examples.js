/**
 * Example integrations for the Self-Awareness module.
 * These examples demonstrate how TooLoo.ai can read and modify its own code.
 */

const SelfAwarenessManager = require('./self-awareness-manager');

// Usage examples

// Initialize the self-awareness manager
const selfAwareness = new SelfAwarenessManager({
  workspaceRoot: process.cwd()
});

async function listAllProjectFiles() {
  const files = await selfAwareness.listProjectFiles();
  console.log(`Found ${files.length} files in the project`);
  
  // Show first 5 files
  console.log('Sample files:');
  files.slice(0, 5).forEach(file => {
    console.log(`- ${file.relativePath} (${file.size} bytes)`);
  });
}

async function viewSourceCodeExample() {
  // View a specific source file
  const fileResult = await selfAwareness.getSourceCode('simple-api-server.js');
  
  if (fileResult.success) {
    console.log(`File: ${fileResult.path}`);
    console.log(`Size: ${fileResult.size} bytes`);
    console.log('First 10 lines:');
    console.log(fileResult.content.split('\n').slice(0, 10).join('\n'));
  } else {
    console.error(`Error: ${fileResult.error}`);
  }
}

async function searchCodebaseExample() {
  // Search for a pattern in the code
  const searchResult = await selfAwareness.searchCodebase('handleFilesystemCommand');
  console.log(`Found ${searchResult.totalMatches} matches in ${searchResult.matchingFiles} files`);
  
  if (searchResult.results.length > 0) {
    console.log('First match:');
    console.log(`File: ${searchResult.results[0].file}`);
    console.log(`Match: ${searchResult.results[0].matches[0].context}`);
  }
}

async function analyzeCodeExample() {
  // Analyze a specific file
  const analysis = await selfAwareness.analyzeCode('simple-api-server.js');
  
  if (analysis.success) {
    console.log(`Analysis for ${analysis.path}:`);
    console.log(`- Lines: ${analysis.stats.lines}`);
    console.log(`- Functions: ${analysis.stats.functions}`);
    console.log(`- Imports: ${analysis.stats.imports.length} dependencies`);
  }
}

async function getProjectStructureExample() {
  // Get overall project structure
  const structure = await selfAwareness.getProjectStructure(2); // Depth of 2
  console.log('Project structure:');
  console.log(JSON.stringify(structure, null, 2).substring(0, 500) + '...');
}

// Run examples
async function runExamples() {
  console.log('=== Self-Awareness Examples ===');
  
  console.log('\n1. List Project Files:');
  await listAllProjectFiles();
  
  console.log('\n2. View Source Code:');
  await viewSourceCodeExample();
  
  console.log('\n3. Search Codebase:');
  await searchCodebaseExample();
  
  console.log('\n4. Analyze Code:');
  await analyzeCodeExample();
  
  console.log('\n5. Project Structure:');
  await getProjectStructureExample();
}

// Export examples to be run
module.exports = runExamples;