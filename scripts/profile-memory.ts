import http from 'http';

const BASE_URL = 'http://localhost:4000';

function getIntrospection(): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = http.get(`${BASE_URL}/api/v1/system/introspect`, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
  });
}

async function profileMemory() {
  console.log('Profiling Memory Usage (10 samples @ 1s interval)...');
  console.log('| Sample | RSS | Heap Total | Heap Used |');
  console.log('|---|---|---|---|');

  for (let i = 1; i <= 10; i++) {
    try {
      const data = await getIntrospection();
      const mem = data.introspection.process.memory;
      console.log(`| ${i} | ${mem.rss} | ${mem.heapTotal} | ${mem.heapUsed} |`);
    } catch (e) {
      console.log(`| ${i} | ERROR | ERROR | ERROR |`);
    }
    await new Promise(r => setTimeout(r, 1000));
  }
}

profileMemory();
