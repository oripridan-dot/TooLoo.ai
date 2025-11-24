// @version 2.1.189

import { io } from "socket.io-client";
import fetch from "node-fetch";

const API_URL = "http://localhost:4000";
const requestId = `req-test-${Date.now()}`;

async function runTest() {
    console.log("Starting Thought Bubble Test...");
    
    // 1. Connect Socket
    const socket = io(API_URL);
    
    socket.on("connect", () => {
        console.log("✅ Socket Connected");
    });

    socket.on("synapsys:event", (event) => {
        // In a real scenario, we'd filter by requestId if the event has it.
        // Most events currently don't carry the requestId at the top level payload, 
        // but the Cortex loop events usually have it in the `result` or `payload`.
        // For this test, we just log everything to see if the stream works.
        console.log(`[SOCKET] ${event.type}`);
        if (event.type === "planning:plan:created") {
            console.log("   -> Plan Created!");
        }
        if (event.type === "cortex:tool:call") {
            console.log(`   -> Tool Call: ${event.payload.type}`);
        }
    });

    // 2. Send Request
    console.log(`Sending request with ID: ${requestId}`);
    try {
        const response = await fetch(`${API_URL}/api/v1/chat/message`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: "Create a file named thought-test.txt with content 'thinking'",
                requestId: requestId
            })
        });
        
        const data = await response.json();
        console.log("Response received:", data);
        
        // Cleanup
        socket.disconnect();
        process.exit(0);
    } catch (error) {
        console.error("Request failed:", error);
        socket.disconnect();
        process.exit(1);
    }
}

runTest();
