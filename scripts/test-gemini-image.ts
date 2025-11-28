
import 'dotenv/config';
import { GoogleGenAI } from "@google/genai";

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function testImageGen() {
  const modelName = "imagen-4.0-generate-001";
  console.log(`Testing image generation with ${modelName}...`);

  try {
    const response = await client.models.generateImages({
      model: modelName,
      prompt: "A futuristic city with flying cars, neon lights, cyberpunk style",
      config: {
        numberOfImages: 1,
      },
    });

    console.log("Response received.");
    if (response.generatedImages && response.generatedImages.length > 0) {
      console.log("Success! Image generated.");
      // console.log("Image data length:", response.generatedImages[0].image?.imageBytes?.length);
    } else {
      console.log("No images in response:", JSON.stringify(response, null, 2));
    }
  } catch (error) {
    console.error("Error generating image:", error);
  }
}

testImageGen();
