
import LLMProvider from './engine/llm-provider.js';
import { getProviderInstructions } from './services/provider-instructions.js';

async function testGeminiIdentity() {
  console.log('Testing Gemini Identity...');
  
  // 1. Check instructions
  const instructions = await getProviderInstructions();
  const geminiInstr = instructions.getForProvider('gemini');
  console.log('Instruction Model:', geminiInstr.model);
  console.log('Instruction Name:', geminiInstr.name);
  
  // 2. Call model
  const provider = new LLMProvider();
  try {
    // Use the specialized prompt from instructions to simulate real chat
    const systemPrompt = instructions.buildSpecializedPrompt('gemini', 'You are a helpful assistant.');
    
    const result = await provider.generate({
      prompt: 'Who are you? State your model version clearly.',
      provider: 'gemini',
      system: systemPrompt,
      taskType: 'chat'
    });
    
    console.log('Response:', result.content);
  } catch (error) {
    console.error('Gemini Call Failed:', error.message);
  }
}

testGeminiIdentity();
