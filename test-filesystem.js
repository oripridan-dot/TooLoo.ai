#!/usr/bin/env node

/**
 * Minimal filesystem test to isolate the issue
 */

import { promises as fs } from 'fs';
import path from 'path';

async function testFilesystemOperations() {
  console.log('🔍 Testing filesystem operations...');
  
  const testDir = './data/test';
  const testFile = path.join(testDir, 'test.json');
  const testData = { test: true, timestamp: new Date().toISOString() };
  
  try {
    // Create directory
    await fs.mkdir(testDir, { recursive: true });
    console.log('✅ Directory created successfully');
    
    // Write file
    await fs.writeFile(testFile, JSON.stringify(testData, null, 2));
    console.log('✅ File written successfully');
    
    // Read file
    const readData = await fs.readFile(testFile, 'utf8');
    console.log('✅ File read successfully');
    console.log('📄 File contents:', JSON.parse(readData));
    
    // Clean up
    await fs.unlink(testFile);
    console.log('✅ File deleted successfully');
    
  } catch (error) {
    console.error('❌ Filesystem test failed:', error.message);
    console.error('📍 Error stack:', error.stack);
  }
}

testFilesystemOperations();