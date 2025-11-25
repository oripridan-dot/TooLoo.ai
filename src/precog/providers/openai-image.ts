
import OpenAI from 'openai';

export class OpenAIImageProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateImage(prompt: string, options: any = {}): Promise<string> {
    console.log(`[OpenAIImageProvider] Generating image with model dall-e-3...`);
    
    try {
      const response = await this.client.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json",
        quality: "standard",
        style: "vivid",
      });

      const image = response.data[0];
      if (!image.b64_json) {
        throw new Error("No image data returned from OpenAI");
      }

      return `data:image/png;base64,${image.b64_json}`;
    } catch (error) {
      console.error('[OpenAIImageProvider] Error generating image:', error);
      throw error;
    }
  }
}
