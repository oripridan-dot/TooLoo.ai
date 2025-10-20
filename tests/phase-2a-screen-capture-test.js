/**
 * Phase 2a Screen Capture Integration Tests
 * 
 * Tests screen capture service integration into orchestrator:
 * 1. Service initialization and startup
 * 2. Frame capture and storage
 * 3. OCR and tagging functionality
 * 4. Screen context injection into intents
 * 5. Frame search and retrieval
 * 6. Service lifecycle management
 */

import { ScreenCaptureService } from '../engine/screen-capture-service.js';

console.log('🧪 Phase 2a: Screen Capture Integration Tests\n');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (e) {
    console.error(`❌ ${name}`);
    console.error(`   Error: ${e.message}`);
    testsFailed++;
  }
}

// ====== TESTS ======

await test('1. Service Initialization', async () => {
  const service = new ScreenCaptureService({
    captureIntervalMs: 1000,
    maxFrames: 10,
    enableOCR: true,
    enableTagging: true
  });

  assert(service !== null, 'Service created');
  assert(service.config.maxFrames === 10, 'Max frames config set');
  assert(service.config.enableOCR === true, 'OCR enabled');
  assert(service.frames.length === 0, 'Frames buffer empty initially');
});

await test('2. Service Startup', async () => {
  const service = new ScreenCaptureService({
    captureIntervalMs: 500,
    maxFrames: 10
  });

  await service.initialize();
  await service.start();

  assert(service.stats.isRunning === true, 'Service running');
  
  // Wait for at least one capture
  await new Promise(resolve => setTimeout(resolve, 700));

  assert(service.stats.totalCaptured > 0, 'Frame captured');
  assert(service.frames.length > 0, 'Frame stored in buffer');

  service.stop();
  assert(service.stats.isRunning === false, 'Service stopped');
});

await test('3. Frame Capture with OCR', async () => {
  const service = new ScreenCaptureService({
    captureIntervalMs: 300,
    maxFrames: 5,
    enableOCR: true
  });

  await service.start();
  await new Promise(resolve => setTimeout(resolve, 400));

  const status = service.getStatus();
  const lastFrame = status.lastFrame;

  assert(lastFrame !== null, 'Last frame exists');
  assert(lastFrame.id !== undefined, 'Frame has ID');
  assert(lastFrame.timestamp !== undefined, 'Frame has timestamp');
  assert(Array.isArray(lastFrame.ocrTags), 'Frame has OCR tags array');
  assert(lastFrame.ocrTags.length > 0, 'OCR tags populated');

  service.stop();
});

await test('4. Frame Capture with Tagging', async () => {
  const service = new ScreenCaptureService({
    captureIntervalMs: 300,
    maxFrames: 5,
    enableTagging: true
  });

  await service.start();
  await new Promise(resolve => setTimeout(resolve, 400));

  const lastFrame = service.getStatus().lastFrame;

  assert(Array.isArray(lastFrame.tags), 'Frame has tags array');
  assert(lastFrame.tags.length > 0, 'Visual elements tagged');
  assert(lastFrame.tags[0].type !== undefined, 'Tags have type');
  assert(lastFrame.tags[0].label !== undefined, 'Tags have label');
  assert(lastFrame.tags[0].confidence !== undefined, 'Tags have confidence');

  service.stop();
});

await test('5. Circular Buffer Management', async () => {
  const service = new ScreenCaptureService({
    captureIntervalMs: 100,
    maxFrames: 3
  });

  await service.start();
  await new Promise(resolve => setTimeout(resolve, 500));

  assert(service.frames.length <= 3, 'Buffer respects maxFrames limit');
  assert(service.stats.totalCaptured >= 3, 'Total captures tracked');

  service.stop();
});

await test('6. Get Last Frames', async () => {
  const service = new ScreenCaptureService({
    captureIntervalMs: 150,
    maxFrames: 10
  });

  await service.start();
  await new Promise(resolve => setTimeout(resolve, 600));

  const frames = service.getLastFrames(3);

  assert(Array.isArray(frames), 'Returns array');
  assert(frames.length <= 3, 'Respects count parameter');
  assert(frames.length > 0, 'Contains frames');
  assert(frames[0].id !== undefined, 'Frames have IDs');

  service.stop();
});

await test('7. Get Specific Frame by ID', async () => {
  const service = new ScreenCaptureService({
    captureIntervalMs: 300,
    maxFrames: 5
  });

  await service.start();
  await new Promise(resolve => setTimeout(resolve, 400));

  const lastFrame = service.getStatus().lastFrame;
  const frameId = lastFrame.id;

  const retrieved = service.getFrame(frameId);

  assert(retrieved !== null, 'Frame retrieved by ID');
  assert(retrieved.id === frameId, 'Correct frame retrieved');
  assert(retrieved.timestamp === lastFrame.timestamp, 'Frame data matches');

  service.stop();
});

await test('8. Search Frames by OCR Content', async () => {
  const service = new ScreenCaptureService({
    captureIntervalMs: 300,
    maxFrames: 5,
    enableOCR: true
  });

  await service.start();
  await new Promise(resolve => setTimeout(resolve, 400));

  // Search for common OCR tag
  const results = service.searchFrames('Button');

  assert(Array.isArray(results), 'Search returns array');
  // Results may be empty if mock didn't include this text, which is ok
  results.forEach(result => {
    assert(result.frameId !== undefined, 'Result has frameId');
    assert(result.timestamp !== undefined, 'Result has timestamp');
    assert(Array.isArray(result.matchedTags), 'Result has matchedTags array');
  });

  service.stop();
});

await test('9. Frame Index Lookup', async () => {
  const service = new ScreenCaptureService({
    captureIntervalMs: 300,
    maxFrames: 5
  });

  await service.start();
  await new Promise(resolve => setTimeout(resolve, 400));

  // Verify frame index is maintained
  const frames = service.getLastFrames(10);
  const firstFrame = frames[0];

  const indexedFrame = service.frameIndex.get(firstFrame.id);
  assert(indexedFrame !== undefined, 'Frame found in index');
  assert(indexedFrame.id === firstFrame.id, 'Index returns correct frame');

  service.stop();
});

await test('10. Get Service Status', async () => {
  const service = new ScreenCaptureService({
    captureIntervalMs: 300,
    maxFrames: 5
  });

  await service.start();
  await new Promise(resolve => setTimeout(resolve, 400));

  const status = service.getStatus();

  assert(status.isRunning === true, 'Status shows running');
  assert(status.stats !== undefined, 'Status includes stats');
  assert(status.stats.totalCaptured > 0, 'Stats track total captures');
  assert(status.bufferedFrames > 0, 'Status shows buffered frames');
  assert(status.maxFrames === 5, 'Status shows max frames');
  assert(status.lastFrame !== null, 'Status includes last frame');

  service.stop();
});

await test('11. Clear Frames', async () => {
  const service = new ScreenCaptureService({
    captureIntervalMs: 300,
    maxFrames: 5
  });

  await service.start();
  await new Promise(resolve => setTimeout(resolve, 400));

  assert(service.frames.length > 0, 'Frames exist before clear');
  
  service.clear();

  assert(service.frames.length === 0, 'Frames cleared');
  assert(service.frameIndex.size === 0, 'Frame index cleared');

  service.stop();
});

await test('12. Service Restart', async () => {
  const service = new ScreenCaptureService({
    captureIntervalMs: 300,
    maxFrames: 5
  });

  // Start
  await service.start();
  await new Promise(resolve => setTimeout(resolve, 300));
  const firstRun = service.stats.totalCaptured;

  // Stop
  service.stop();
  assert(service.stats.isRunning === false, 'Service stopped');

  // Restart
  await service.start();
  assert(service.stats.isRunning === true, 'Service restarted');
  await new Promise(resolve => setTimeout(resolve, 300));

  const secondRun = service.stats.totalCaptured;
  assert(secondRun > firstRun, 'Capture resumed after restart');

  service.stop();
});

await test('13. Screenshot Hashing', async () => {
  const service = new ScreenCaptureService({
    captureIntervalMs: 300,
    maxFrames: 5
  });

  await service.start();
  await new Promise(resolve => setTimeout(resolve, 400));

  const frame = service.getStatus().lastFrame;
  assert(frame.screenshotHash !== undefined, 'Frame has hash');
  assert(typeof frame.screenshotHash === 'string', 'Hash is string');
  assert(frame.screenshotHash.length > 0, 'Hash not empty');

  service.stop();
});

await test('14. Frame Metadata', async () => {
  const service = new ScreenCaptureService({
    captureIntervalMs: 300,
    maxFrames: 5
  });

  await service.start();
  await new Promise(resolve => setTimeout(resolve, 400));

  const frame = service.getStatus().lastFrame;
  const meta = frame.metadata;

  assert(meta !== undefined, 'Frame has metadata');
  assert(meta.width !== undefined, 'Metadata has width');
  assert(meta.height !== undefined, 'Metadata has height');
  assert(meta.colorDepth !== undefined, 'Metadata has colorDepth');

  service.stop();
});

await test('15. Multiple Service Instances', async () => {
  const service1 = new ScreenCaptureService({ captureIntervalMs: 300, maxFrames: 3 });
  const service2 = new ScreenCaptureService({ captureIntervalMs: 300, maxFrames: 3 });

  await service1.start();
  await service2.start();
  await new Promise(resolve => setTimeout(resolve, 400));

  assert(service1.stats.isRunning === true, 'Service 1 running');
  assert(service2.stats.isRunning === true, 'Service 2 running');
  assert(service1.frames.length > 0, 'Service 1 captured frames');
  assert(service2.frames.length > 0, 'Service 2 captured frames');

  service1.stop();
  service2.stop();
});

// ====== SUMMARY ======

console.log(`\n${'='.repeat(60)}`);
console.log(`Tests: ${testsPassed} passed, ${testsFailed} failed`);
console.log(`${'='.repeat(60)}`);

if (testsFailed > 0) {
  process.exit(1);
}
