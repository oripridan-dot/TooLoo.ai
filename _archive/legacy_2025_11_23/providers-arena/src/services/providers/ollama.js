import fetch from 'node-fetch';

class OllamaProvider {
  constructor(endpoint = 'http://localhost:11434') {
    this.endpoint = endpoint;
    this.model = 'mistral'; // Default model, can be overridden
  }

  async generateResponse(prompt) {
    try {
      const response = await fetch(`${this.endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama returned ${response.status}`);
      }

      const data = await response.json();
      return data.response || 'No response from Ollama';
    } catch (error) {
      throw new Error(`Ollama error: ${error.message}`);
    }
  }
}

export default OllamaProvider;
