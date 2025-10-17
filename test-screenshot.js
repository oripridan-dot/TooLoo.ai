#!/usr/bin/env node

// Simple test of the screenshot capture
import LiveScreenshotCapture from './live-screenshot-capture.js';

console.log('🧪 Testing screenshot capture...');

const capturer = new LiveScreenshotCapture();
const result = await capturer.captureVSCodeWorkspace();

if (result.success) {
  console.log('✅ Screenshot captured successfully!');
  console.log('📁 File:', result.filepath);
  console.log('⏰ Timestamp:', result.timestamp);
} else {
  console.log('❌ Screenshot failed:', result.error);
}

process.exit(0);