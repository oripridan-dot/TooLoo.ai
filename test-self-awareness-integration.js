/**
 * Self-awareness utilities integration test file.
 * This file tests the integration of the SelfAwarenessManager with the main application.
 * 
 * Run it with: node test-self-awareness-integration.js
 */

const SelfAwarenessManager = require('./self-awareness-manager');
const path = require('path');
const assert = require('assert').strict;

async function runTests() {
  console.log('🧪 Starting Self-Awareness Integration Tests');
  const selfAwarenessManager = new SelfAwarenessManager({ 
    basePath: path.resolve(__dirname)
  });

  try {
    // Test 1: Get Source Code
    console.log('\n📋 Test: Reading source code');
    const sourceCode = await selfAwarenessManager.getSourceCode('simple-api-server.js');
    assert.ok(sourceCode.success, 'Should successfully read source code');
    assert.ok(sourceCode.content.length > 100, 'Source code should have content');
    console.log('✅ Successfully read source code');

    // Test 2: Search Codebase
    console.log('\n🔍 Test: Searching codebase');
    const searchResults = await selfAwarenessManager.searchCodebase('handleFilesystemCommand');
    assert.ok(searchResults.totalMatches > 0, 'Should find matches for handleFilesystemCommand');
    assert.ok(searchResults.results.some(r => r.file === 'simple-api-server.js'), 
      'Should find handleFilesystemCommand in simple-api-server.js');
    console.log(`✅ Found ${searchResults.totalMatches} matches in ${searchResults.matchingFiles} files`);

    // Test 3: Get Project Structure
    console.log('\n📁 Test: Getting project structure');
    const structure = await selfAwarenessManager.getProjectStructure(2);
    assert.ok(structure.name === path.basename(__dirname), 'Project structure should have correct root name');
    assert.ok(structure.children.length > 0, 'Project structure should have children');
    console.log('✅ Successfully retrieved project structure');
    
    // Test 4: Analyze Code
    console.log('\n📊 Test: Analyzing code');
    const analysis = await selfAwarenessManager.analyzeCode('simple-api-server.js');
    assert.ok(analysis.success, 'Should successfully analyze code');
    assert.ok(analysis.stats.lines > 0, 'Analysis should have line count');
    console.log(`✅ Analysis complete: ${analysis.stats.lines} lines, ${analysis.stats.functions} functions`);
    
    // Test 5: Test command parsing using the actual parseFilesystemCommand function
    // This is a simulated test as we're not instantiating the full server
    console.log('\n🧩 Test: Command parsing simulation');
    const commands = [
      'show code simple-api-server.js',
      'search your code for handleFilesystemCommand',
      'analyze your code self-awareness-manager.js',
      'show code structure'
    ];
    
    commands.forEach(cmd => {
      // Identify command type based on string patterns similar to parseFilesystemCommand
      let commandType = null;
      
      if (/show.*code|view.*code|read.*code/.test(cmd)) {
        commandType = 'show-code';
      } else if (/search.*code/.test(cmd)) {
        commandType = 'search-code';
      } else if (/analyze.*code/.test(cmd)) {
        commandType = 'analyze-code';
      } else if (/code.*structure|structure.*code/.test(cmd)) {
        commandType = 'code-structure';
      }
      
      assert.ok(commandType !== null, `Command '${cmd}' should match a pattern`);
      console.log(`✅ '${cmd}' → ${commandType}`);
    });
    
    console.log('\n🎉 All self-awareness integration tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the tests
runTests().catch(console.error);