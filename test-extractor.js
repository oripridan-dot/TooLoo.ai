import StructuredExtractor from './engine/structured-extractor.js';

const extractor = new StructuredExtractor();
const result = extractor.extract({ 
  text: 'AI model shows 92% accuracy, 45ms latency, BLEU score 0.78, costs $0.25 per 1K tokens' 
});
console.log('Extraction result:', JSON.stringify(result, null, 2));
console.log('Number of extractions:', result.length);

// Test individual components
console.log('Testing sentence splitting...');
const sentences = extractor.splitSentences('AI model shows 92% accuracy, 45ms latency, BLEU score 0.78, costs $0.25 per 1K tokens');
console.log('Sentences:', sentences);

console.log('Testing number extraction...');
const nums = extractor.extractNumbers('AI model shows 92% accuracy, 45ms latency, BLEU score 0.78, costs $0.25 per 1K tokens');
console.log('Numbers:', nums);

console.log('Testing signal detection...');
const signals = extractor.findSignals('AI model shows 92% accuracy, 45ms latency, BLEU score 0.78, costs $0.25 per 1K tokens');
console.log('Signals:', signals);