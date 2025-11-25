// @version 2.1.253
import { precog } from "../src/precog/index.js";
import { bus } from "../src/core/event-bus.js";

async function test() {
    console.log("Starting Gemini Integration Test...");
    
    bus.subscribe("synapsys", (event) => {
        if (event.type === "thought") {
            console.log("[EVENT] Thought:", event.payload.text);
        }
    });

    try {
        const result = await precog.providers.generate({
            prompt: "Hello, are you Gemini 3 Pro?",
            system: "You are Gemini 3 Pro.",
            taskType: "chat"
        });
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}

test();
