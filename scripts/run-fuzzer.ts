// @version 3.3.173
import { ContractFuzzer } from '../src/qa/fuzzing/contract-fuzzer.js';

async function main() {
  const fuzzer = new ContractFuzzer('http://localhost:4000');
  
  // Fuzz the system status endpoint we enhanced earlier
  const target = 'GET /api/v1/system/status';
  
  try {
    const results = await fuzzer.fuzzContract(target);
    
    console.log(`\n📊 Fuzzing Results for ${target}:`);
    results.forEach(r => {
      const icon = r.passed ? '✅' : '❌';
      console.log(`${icon} ${r.testCase}: Status ${r.status} ${r.error ? `(${r.error})` : ''}`);
    });

  } catch (error) {
    console.error('Fuzzing failed:', error);
  }
}

main();
