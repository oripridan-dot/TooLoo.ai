
import LLMProvider from './engine/llm-provider.js';
import fetch from 'node-fetch';

async function listGeminiModels() {
  console.log('Listing Gemini models...');
  const provider = new LLMProvider();
  const config = provider.providers.gemini; // This returns boolean, wait.
  
  // We need the key.
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error('No GEMINI_API_KEY found');
    return;
  }
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.models) {
      console.log('Available Models:');
      data.models.forEach(m => console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`));
    } else {
      console.log('No models found or error:', data);
    }
  } catch (e) {
    console.error('Error listing models:', e);
  }
}

listGeminiModels();
