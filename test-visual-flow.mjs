import { io } from "socket.io-client";

const socket = io("http://localhost:4000", {
  transports: ["websocket"],
  reconnection: true,
});

const requestId = "test-" + Date.now();

socket.on("connect", () => {
  console.log("✓ Connected to server");

  // Send chat message
  socket.emit("generate", {
    message: "What are the key features of a good API?",
    requestId,
  });
  console.log("✓ Sent generate request with ID:", requestId);
});

socket.on("thinking", (data) => {
  console.log("✓ Server thinking...", data);
});

socket.on("response", (data) => {
  console.log("✓ Got response:", {
    provider: data.provider,
    response: data.response?.substring(0, 100),
    visual: data.visual ? { type: data.visual.type, dataKeys: Object.keys(data.visual.data || {}) } : null,
  });
  process.exit(0);
});

socket.on("error", (err) => {
  console.error("✗ Socket error:", err);
  process.exit(1);
});

socket.on("disconnect", () => {
  console.error("✗ Socket disconnected before getting response");
  process.exit(1);
});

setTimeout(() => {
  console.error("✗ Timeout waiting for response");
  process.exit(1);
}, 15000);
