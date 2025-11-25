// @version 2.1.248

import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from root
const envPath = path.resolve(__dirname, "../.env");
console.log(`Loading .env from: ${envPath}`);
dotenv.config({ path: envPath });

console.log("--- Environment Check ---");
console.log(`GEMINI_ENABLED: ${process.env.GEMINI_ENABLED}`);
console.log(`GEMINI_API_KEY present: ${!!process.env.GEMINI_API_KEY}`);
if (process.env.GEMINI_API_KEY) {
    console.log(`GEMINI_API_KEY length: ${process.env.GEMINI_API_KEY.length}`);
    console.log(`GEMINI_API_KEY start: ${process.env.GEMINI_API_KEY.substring(0, 4)}...`);
}

console.log(`ANTHROPIC_ENABLED: ${process.env.ANTHROPIC_ENABLED}`);
console.log(`ANTHROPIC_API_KEY present: ${!!process.env.ANTHROPIC_API_KEY}`);

console.log(`OPENAI_ENABLED: ${process.env.OPENAI_ENABLED}`);
console.log(`OPENAI_API_KEY present: ${!!process.env.OPENAI_API_KEY}`);
