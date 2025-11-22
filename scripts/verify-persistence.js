
import fs from 'fs';
import path from 'path';
import http from 'http';

const sessionId = `test-session-${Date.now()}`;
const sessionData = {
  sessionId: sessionId,
  messages: [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there!' }
  ],
  metadata: {
    test: true
  }
};

const postData = JSON.stringify(sessionData);

const options = {
  hostname: 'localhost',
  port: 3006,
  path: '/api/v1/product/session',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log(`Testing session persistence for ID: ${sessionId}`);

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
  res.on('end', () => {
    console.log('No more data in response.');
    
    // Verify file existence
    const filePath = path.join(process.cwd(), 'data', 'sessions', `${sessionId}.json`);
    setTimeout(() => {
      if (fs.existsSync(filePath)) {
        console.log(`✅ SUCCESS: Session file created at ${filePath}`);
        const content = fs.readFileSync(filePath, 'utf8');
        const json = JSON.parse(content);
        if (json.id === sessionId && json.messages.length === 2) {
          console.log('✅ SUCCESS: Content matches expected data');
        } else {
          console.log('❌ FAILURE: Content mismatch');
          console.log(json);
        }
      } else {
        console.log(`❌ FAILURE: Session file not found at ${filePath}`);
      }
    }, 1000); // Wait a bit for file system
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

// Write data to request body
req.write(postData);
req.end();
