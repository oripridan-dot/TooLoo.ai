// @version 2.2.77

import { GoogleGenAI } from "@google/genai";

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function listModels() {
  try {
    const response = await client.models.list();
    console.log("Available Models:");
    for (const model of response.models || []) {
      console.log(`- ${model.name} (${model.supportedGenerationMethods?.join(", ")})`);
    }
  } catch (error) {
    console.error("Error listing models:", error);
  }
}

listModels();
