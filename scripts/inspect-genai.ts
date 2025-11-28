// @version 2.2.76

import { GoogleGenAI } from "@google/genai";

const client = new GoogleGenAI({ apiKey: "test" });
console.log(Object.keys(client));
console.log(Object.keys(client.models));
