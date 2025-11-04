import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiProvider {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  async generateResponse(prompt) {
    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  async generateChat(messages) {
    const chat = this.model.startChat({
      history: messages.slice(0, -1).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }))
    });

    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    const response = await result.response;
    return response.text();
  }
}

export default GeminiProvider;