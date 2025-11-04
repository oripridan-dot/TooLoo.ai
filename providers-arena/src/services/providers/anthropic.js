import Anthropic from '@anthropic-ai/sdk';

class AnthropicProvider {
  constructor(apiKey) {
    this.anthropic = new Anthropic({
      apiKey: apiKey,
    });
  }

  async generateResponse(prompt) {
    const message = await this.anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    return message.content[0].text;
  }
}

export default AnthropicProvider;