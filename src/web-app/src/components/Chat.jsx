// @version 2.2.46
import React, { useState, useEffect, useRef } from "react";
import { Send, Loader2 } from "lucide-react";
import { io } from "socket.io-client";
import ReactMarkdown from "react-markdown";
import VisualRegistry from "./VisualRegistry";
import PlanVisualizer from "./PlanVisualizer";
import NeuralState from "./NeuralState";

const Chat = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      id: "initial-welcome",
      type: "assistant",
      content: "Welcome to TooLoo.ai! How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);

  // Fetch history on mount
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch("/api/v1/chat/history");
        const data = await res.json();
        if (data.ok && data.data.history && data.data.history.length > 0) {
          // Transform history if needed, or just set it
          // Ensure timestamps are Date objects
          const history = data.data.history.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(history);
        }
      } catch (err) {
        console.error("Failed to fetch chat history:", err);
      }
    };

    fetchHistory();
  }, []);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    // Define handlers first, before using them
    const handleVisualEvent = (event) => {
      const payload = event.payload;
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: "assistant",
          content: "", // No text content, just visual
          visual: payload.visual,
          timestamp: new Date(),
        },
      ]);
    };

    const handlePlanningEvent = (event) => {
      setMessages((prev) => {
        const newMessages = [...prev];
        const payload = event.payload;
        
        // Find if we already have a message for this plan
        const planId = payload.plan?.id || payload.planId;
        const existingMsgIndex = newMessages.findIndex(
          m => m.type === "plan" && m.planId === planId
        );

        if (event.type === "planning:plan:start") {
          if (existingMsgIndex === -1) {
            // Add new plan message
            newMessages.push({
              id: `plan-${planId}`,
              type: "plan",
              planId: planId,
              content: payload.plan, // Store the whole plan object
              timestamp: new Date()
            });
          }
        } else if (existingMsgIndex !== -1) {
          // Update existing plan message
          const msg = newMessages[existingMsgIndex];
          const plan = { ...msg.content }; // Clone plan
          
          if (event.type === "planning:step:start") {
            if (plan.steps && plan.steps[payload.index]) {
              plan.steps[payload.index].status = "running";
            }
          } else if (event.type === "planning:step:complete") {
            if (plan.steps) {
              // Find step by ID or index
              const stepIndex = plan.steps.findIndex(s => s.id === payload.step.id);
              if (stepIndex !== -1) {
                plan.steps[stepIndex] = payload.step;
                plan.steps[stepIndex].status = "completed";
                plan.steps[stepIndex].result = payload.result;
              }
            }
          } else if (event.type === "planning:step:failed") {
             if (plan.steps) {
              const stepIndex = plan.steps.findIndex(s => s.id === payload.step.id);
              if (stepIndex !== -1) {
                plan.steps[stepIndex].status = "failed";
                plan.steps[stepIndex].result = { error: payload.error };
              }
            }
            plan.status = "failed";
          } else if (event.type === "planning:plan:complete") {
            plan.status = "completed";
          }

          newMessages[existingMsgIndex] = { ...msg, content: plan };
        }
        
        return newMessages;
      });
    };

    newSocket.on("thinking", () => setIsLoading(true));

    // Now use the handlers
    newSocket.on("synapsys:event", (event) => {
      if (event.type.startsWith("planning:")) {
        handlePlanningEvent(event);
      } else if (event.type === "visual:generated") {
        handleVisualEvent(event);
      }
    });

    newSocket.on("response", (data) => {
      // Check if response contains code-like content
      const content = data.response || data.content || "";
      let visual = data.visual;

      // Auto-detect generated images (Markdown image with base64 data)
      const imageMatch = content.match(/!\[([^\]]*)\]\((data:image\/[^)]+)\)/);
      if (!visual && imageMatch) {
        visual = {
          type: "image",
          data: {
            src: imageMatch[2],
            alt: imageMatch[1] || "Generated Image",
          },
        };
      }
      // Auto-detect code if not already marked as visual
      else if (
        !visual &&
        content &&
        (content.includes("{") ||
          content.includes("<") ||
          content.includes("function") ||
          content.includes("const "))
      ) {
        visual = {
          type: "code",
          data: content,
        };
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: "assistant",
          content: content,
          visual: visual,
          timestamp: new Date(),
        },
      ]);
      setIsLoading(false);
    });

    newSocket.on("error", (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: "error",
          content: `Error: ${data.message}`,
          timestamp: new Date(),
        },
      ]);
      setIsLoading(false);
    });

    return () => newSocket.close();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const clearHistory = async () => {
    if (!confirm("Are you sure you want to clear the chat history?")) return;
    try {
      await fetch("/api/v1/chat/history", { method: "DELETE" });
      setMessages([{
        id: "initial-welcome",
        type: "assistant",
        content: "History cleared. How can I help you?",
        timestamp: new Date(),
      }]);
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  };

  const handleStop = () => {
    if (socket) {
      socket.emit("stop_generation");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-obsidian text-gray-100">
      <div className="bg-[#0f1117] border-b border-gray-800 p-4 flex justify-between items-center shadow-sm z-10">
        <h2 className="text-lg font-semibold text-gray-100">Chat Stream</h2>
        <button 
          onClick={clearHistory}
          className="text-xs text-red-400 hover:text-red-300 px-3 py-1 border border-red-900/50 rounded hover:bg-red-900/20 transition-colors"
        >
          Clear History
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-lg lg:max-w-2xl px-4 py-2 rounded-lg ${
                msg.type === "user"
                  ? "bg-blue-600 text-white"
                  : msg.type === "assistant"
                    ? "bg-[#1a1d24] text-gray-100 border border-gray-800"
                    : msg.type === "plan"
                      ? "w-full max-w-3xl bg-transparent p-0" // Special styling for plan
                      : "bg-red-900/50 text-red-200 border border-red-900"
              }`}
            >
              {msg.type === "plan" ? (
                <PlanVisualizer plan={msg.content} />
              ) : msg.visual ? (
                <VisualRegistry type={msg.visual.type} data={msg.visual.data} />
              ) : msg.content &&
                (msg.content.includes("{") ||
                  msg.content.includes("<") ||
                  msg.content.includes("function") ||
                  msg.content.includes("const ")) &&
                msg.content.length > 50 ? (
                // Auto-detect code content and render as visual
                <VisualRegistry type="code" data={msg.content} />
              ) : (
                <ReactMarkdown
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || "");
                      return !inline && match ? (
                        <div className="bg-[#0d1117] border border-gray-700 text-gray-200 p-3 rounded-md my-2 overflow-x-auto">
                          <pre>
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </pre>
                        </div>
                      ) : (
                        <code className={`${className} bg-gray-800 px-1 py-0.5 rounded text-sm`} {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              )}
              <div className="text-xs opacity-60 mt-1 text-right text-gray-400">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-lg lg:max-w-2xl px-4 py-2 rounded-lg bg-[#1a1d24] text-gray-100 border border-gray-800">
              <div className="flex items-center">
                <Loader2 className="animate-spin mr-2 text-blue-400" />
                <span className="text-gray-300">TooLoo.ai is thinking...</span>
                <button 
                  onClick={handleStop}
                  className="ml-4 text-xs text-red-400 hover:text-red-300 underline"
                >
                  Stop
                </button>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-800 bg-[#0f1117]">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask TooLoo.ai anything..."
            className="w-full p-3 pr-12 bg-[#1a1d24] border border-gray-700 text-gray-100 rounded-lg focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="absolute inset-y-0 right-0 px-4 flex items-center text-gray-400 hover:text-blue-400 transition-colors"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;
