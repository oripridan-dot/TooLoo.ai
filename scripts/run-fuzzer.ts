// @version 3.3.180
import { ContractFuzzer } from '../src/qa/fuzzing/contract-fuzzer.js';

async function main() {
  const fuzzer = new ContractFuzzer('http://localhost:4000');
  
  const targets = [
    'POST /api/v1/agent/task',
    'POST /api/v1/chat/generate',
    'POST /api/v1/github/file',
    'POST /api/v1/training/sources/github/issues/sync'
  ];
  
  let allPassed = true;

  for (const target of targets) {
    try {
      const results = await fuzzer.fuzzContract(target);
      
      console.log(`\n📊 Fuzzing Results for ${target}:`);
      results.forEach(r => {
        const icon = r.passed ? '✅' : '❌';
        console.log(`${icon} ${r.testCase}: Status ${r.status} ${r.error ? `(${r.error})` : ''}`);
        if (!r.passed) allPassed = false;
      });

    } catch (error) {
      console.error(`Fuzzing failed for ${target}:`, error);
      allPassed = false;
    }
  }

  if (!allPassed) {
    console.error('\n❌ Some fuzzing tests failed.');
    process.exit(1);
  } else {
    console.log('\n✨ All fuzzing tests passed!');
  }
}

main();
