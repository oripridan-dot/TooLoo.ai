// @version 2.2.100

import fetch from "node-fetch";
import { io } from "socket.io-client";

const BASE_URL = "http://localhost:4000";

async function runTest() {
  console.log("🔍 Starting Deep Connectivity Test...");

  // 1. Backend Health Check
  try {
    const res = await fetch(`${BASE_URL}/health`);
    if (res.ok) {
      console.log("✅ Backend Health: OK");
    } else {
      console.error(`❌ Backend Health: FAILED (${res.status})`);
    }
  } catch (e) {
    console.error("❌ Backend Health: UNREACHABLE", e.message);
    process.exit(1);
  }

  // 2. Self-Improvement API Check
  try {
    const res = await fetch(`${BASE_URL}/api/v1/learning/report`);
    const data = await res.json();
    if (res.ok && data.success) {
      console.log("✅ Self-Improvement API: OK");
      console.log(`   - First Try Success: ${(data.data.improvements.firstTrySuccess.current * 100).toFixed(1)}%`);
    } else {
      console.error("❌ Self-Improvement API: FAILED", data);
    }
  } catch (e) {
    console.error("❌ Self-Improvement API: ERROR", e.message);
  }

  // 3. Provider Status Check
  try {
    const res = await fetch(`${BASE_URL}/api/v1/providers/status`);
    if (res.ok) {
      console.log("✅ Provider Status API: OK");
    } else {
      console.error(`❌ Provider Status API: FAILED (${res.status})`);
    }
  } catch (e) {
    console.error("❌ Provider Status API: ERROR", e.message);
  }

  // 4. Socket.io Connection
  console.log("🔌 Testing Socket.io Connection...");
  const socket = io(BASE_URL);
  
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.error("❌ Socket.io: TIMEOUT");
      socket.close();
      resolve();
    }, 5000);

    socket.on("connect", () => {
      console.log("✅ Socket.io: CONNECTED");
      clearTimeout(timeout);
      socket.close();
      resolve();
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Socket.io: ERROR", err.message);
      clearTimeout(timeout);
      resolve();
    });
  });

  console.log("\n✨ Connectivity Test Complete.");
}

runTest();
