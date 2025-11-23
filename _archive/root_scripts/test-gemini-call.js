
import LLMProvider from './engine/llm-provider.js';

async function testGeminiCall() {
  console.log('Testing Gemini 3 Pro generation... UNIQUE_ID_123');
  const provider = new LLMProvider();
  
  try {
    const result = await provider.generate({
      prompt: 'Hello! Who are you and what model are you?',
      provider: 'gemini',
      taskType: 'chat'
    });
    
    console.log('Result:', result);
  } catch (error) {
    console.error('Gemini Generation Failed:', error.message);
  }
}

testGeminiCall();
