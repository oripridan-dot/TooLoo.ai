// @version 2.1.171

import { bus } from "../src/core/event-bus.js";
import { cortex } from "../src/cortex/index.js";
import { precog } from "../src/precog/index.js";
import * as fs from "fs";
import * as path from "path";

// Mock the LLM Provider to avoid real API calls and force specific scenarios
// We need to intercept the LLM calls in Reflector and Planner.
// Since we can't easily mock the internal classes without dependency injection or mocking libraries,
// we will rely on the real system but maybe we can spy on the bus events.

async function runTest() {
    console.log("Starting Cognitive Loop Test...");

    // Initialize System
    await cortex.init();
    await precog.init();

    const requestId = "test-req-001";
    const goal = "Create a file named 'src/test-component.ts' with a TypeScript error.";

    // We want to see if the Verifier catches the error and Reflector fixes it.
    // But the Planner needs to generate the bad code first.
    // Since we can't force the Planner to generate bad code easily with the real LLM,
    // we will manually inject a plan that has a bad file write.

    // 1. Construct a Plan with a deliberate error
    const badPlan = {
        id: "plan-test-bad",
        goal: goal,
        status: "pending",
        steps: [
            {
                id: "step-1",
                type: "file:write",
                description: "Write a file with a type error",
                status: "pending",
                payload: {
                    path: "src/test-component.ts",
                    content: "export const x: number = 'string'; // Type error"
                }
            }
        ]
    };

    console.log("Injecting Bad Plan...");
    
    // We need to access the Executive to execute this plan.
    // The Executive is private in Cortex.
    // However, Cortex listens for "planning:intent".
    // If we want to bypass the Planner, we can try to trigger the Executive directly?
    // No, Executive is private.
    
    // But we can listen to the bus.
    // Let's try to use the real Planner but give it a prompt that might cause an error?
    // Or better, let's just use the "planning:plan:completed" event to intercept and modify the plan before execution?
    // No, the Executive executes it immediately.

    // Let's try to simulate the Executive's behavior manually to test Reflector/Verifier specifically.
    // Or we can just trust the system.

    // Let's try to use the real system with a request.
    // "Create a TypeScript file src/temp-test.ts that exports a function adding two numbers."
    // This is simple.
    
    // To test the LOOP, we need a failure.
    // "Create a TypeScript file src/temp-fail.ts that assigns a string to a number variable."
    // The LLM might be too smart and fix it.
    // "Create a TypeScript file src/temp-fail.ts with content: const x: number = 'hello';"
    
    const testGoal = "Create a TypeScript file src/temp-fail.ts with content: const x: number = 'hello';";

    console.log(`Sending request: "${testGoal}"`);

    bus.publish("nexus:chat_request", {
        requestId,
        message: testGoal
    });

    // Listen for events
    bus.on("cortex:tool:call", (event) => {
        console.log(`[TOOL CALL] ${event.payload.type}`);
    });

    bus.on("cortex:tool:result", (event) => {
        console.log(`[TOOL RESULT] Success: ${event.payload.result.ok}`);
    });

    bus.on("cortex:response", (event) => {
        console.log("\n[FINAL RESPONSE]");
        console.log(event.payload.data.response);
        
        // Cleanup
        if (fs.existsSync("src/temp-fail.ts")) {
            console.log("Cleaning up src/temp-fail.ts");
            fs.unlinkSync("src/temp-fail.ts");
        }
        process.exit(0);
    });

    // Timeout
    setTimeout(() => {
        console.log("Test timed out.");
        process.exit(1);
    }, 60000);
}

runTest();
