// @version 2.1.197

import { io } from "socket.io-client";
import fetch from "node-fetch";

const API_URL = "http://localhost:4000/api/v1";
const SOCKET_URL = "http://localhost:4000";

async function runTest() {
  console.log("Starting Intervention Mode Test...");

  // 1. Enable Intervention Mode
  console.log("1. Enabling Intervention Mode...");
  await fetch(`${API_URL}/intervention/mode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled: true }),
  });

  // 2. Connect Socket
  const socket = io(SOCKET_URL);
  
  const requestId = `req-test-${Date.now()}`;
  let planId = "";

  socket.on("connect", () => {
    console.log("2. Socket Connected.");
    
    // 3. Send Request
    console.log("3. Sending Chat Request...");
    fetch(`${API_URL}/chat/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "create a file named intervention_test.txt with content 'paused'",
        requestId: requestId,
      }),
    });
  });

  socket.on("synapsys:event", async (event) => {
    const { type, payload } = event;
    
    if (type === "planning:plan:created") {
        console.log("4. Plan Created:", payload.plan.id);
        planId = payload.plan.id;
    }

    if (type === "planning:awaiting_approval") {
        console.log("5. Received Awaiting Approval for step:", payload.step.description);
        
        // Wait a bit to simulate user thinking
        setTimeout(async () => {
            console.log("6. Approving (Resuming)...");
            await fetch(`${API_URL}/intervention/resume`, { method: "POST" });
        }, 1000);
    }

    if (type === "cortex:tool:result") {
        console.log("7. Tool Executed:", payload.result.ok ? "Success" : "Failed");
    }

    if (type === "planning:plan:completed") {
        console.log("8. Plan Completed!");
        
        // Cleanup
        await fetch(`${API_URL}/intervention/mode`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ enabled: false }),
        });
        
        socket.disconnect();
        process.exit(0);
    }
  });
}

runTest().catch(console.error);
