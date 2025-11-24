// @version 2.1.169

import { EventBus } from "../src/core/event-bus.js";
import { SemanticParser } from "../src/cortex/sensory/semantic-parser.js";
import * as path from "path";

const bus = new EventBus();
const parser = new SemanticParser(bus, process.cwd());

// Mock the bus publish to see what gets stored
bus.publish = (channel: string, topic: string, payload: any) => {
    console.log(`[BUS] ${channel}:${topic}`, JSON.stringify(payload, null, 2).substring(0, 200) + "...");
};

async function run() {
    console.log("Starting Semantic Parser Test...");
    try {
        const result = await parser.analyzeProject();
        console.log("Analysis Complete.");
        console.log("Dependencies:", Object.keys(result.dependencies).length);
        console.log("Symbols Found:", result.symbols ? result.symbols.length : 0);
        
        if (result.symbols && result.symbols.length > 0) {
            console.log("First file symbols:", JSON.stringify(result.symbols[0], null, 2));
        }
    } catch (error) {
        console.error("Test Failed:", error);
    }
}

run();
