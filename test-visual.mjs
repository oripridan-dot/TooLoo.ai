import { io } from "socket.io-client";

const socket = io("http://127.0.0.1:4000");

socket.on("connect", () => {
  console.log("Connected to server");
  socket.emit("generate", { prompt: "show me a deployment process" });
});

socket.on("thinking", () => {
  console.log("Server thinking...");
});

socket.on("response", (data) => {
  console.log("Response:", data.content.substring(0, 150));
  console.log("Visual:", data.visual ? `YES - ${data.visual.type}` : "NO");
  process.exit(0);
});

setTimeout(() => {
  console.error("Timeout");
  process.exit(1);
}, 10000);
