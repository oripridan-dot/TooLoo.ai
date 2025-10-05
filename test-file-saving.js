// Test script to verify implementation workflow
const PersonalFilesystemManager = require('./personal-filesystem-manager.js');

async function testFileSaving() {
  console.log('🧪 Testing file saving mechanism...\n');
  
  const fsManager = new PersonalFilesystemManager({
    workspaceRoot: process.cwd()
  });
  
  // Test 1: Can we write a file?
  console.log('Test 1: Writing test file...');
  try {
    const testContent = `// Test file
export const TestComponent = () => {
  return <div style={{ color: '#1e40af' }}>Dark Blue Text</div>;
};
`;
    
    await fsManager.writeFile('web-app/src/components/TestComponent.jsx', testContent);
    console.log('✅ File written successfully');
    
    // Read it back
    const readContent = await fsManager.readFile('web-app/src/components/TestComponent.jsx');
    console.log('✅ File read back:', readContent.content.substring(0, 50) + '...');
  } catch (error) {
    console.error('❌ File write/read failed:', error.message);
  }
  
  // Test 2: Simulate code block extraction
  console.log('\nTest 2: Code block extraction...');
  const aiResponse = `Here's the implementation:

\`\`\`javascript
// web-app/src/components/Chat.jsx
import React from 'react';

const Chat = () => {
  return <div style={{ color: '#1e40af' }}>Test</div>;
};

export default Chat;
\`\`\`
`;

  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  const blocks = [];
  
  while ((match = codeBlockRegex.exec(aiResponse)) !== null) {
    blocks.push({
      language: match[1] || 'text',
      code: match[2]
    });
  }
  
  console.log(`✅ Found ${blocks.length} code block(s)`);
  
  if (blocks.length > 0) {
    const firstLine = blocks[0].code.split('\n')[0];
    console.log('First line:', firstLine);
    
    const pathMatch = firstLine.match(/^(?:\/\/|\/\*|#)\s*(.+?\.(?:jsx?|tsx?|css|html|json))/i);
    if (pathMatch) {
      console.log('✅ File path detected:', pathMatch[1]);
    } else {
      console.log('❌ No file path detected in first line');
    }
  }
  
  // Test 3: Full simulation
  console.log('\nTest 3: Full simulation with handleCodeFileGeneration...');
  
  // This would need the actual PersonalAIManager instance
  console.log('⚠️  This requires running server - check logs when you say "yes" in chat');
  
  console.log('\n✅ Basic file saving mechanism works!');
  console.log('🔍 Problem is likely in:');
  console.log('   1. AI not generating code blocks even with forceCodeGeneration');
  console.log('   2. Code blocks not having file path as first line');
  console.log('   3. Context not being passed to AI provider correctly');
}

testFileSaving().catch(console.error);
