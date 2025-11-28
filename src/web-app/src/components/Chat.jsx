// @version 2.2.68
import React, { useState, useEffect, useRef } from "react";
import { Send, Loader2, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { io } from "socket.io-client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import VisualRegistry from "./VisualRegistry";
import PlanVisualizer from "./PlanVisualizer";
import NeuralState from "./NeuralState";

const ThoughtBubble = ({ steps, isCollapsed, onToggle }) => {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="my-2 border border-white/10 rounded-lg bg-gray-900/50 overflow-hidden text-sm">
      <div 
        className="px-3 py-2 bg-black/20 flex items-center gap-2 cursor-pointer hover:bg-black/30 select-none"
        onClick={onToggle}
      >
        <span className="text-gray-400 font-medium flex-1">
          {isCollapsed ? "Thinking Complete" : "Thinking..."}
        </span>
        {isCollapsed ? <ChevronRight size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
      </div>
      {!isCollapsed && (
        <div className="p-3 border-t border-white/10 flex flex-col gap-2">
          {steps.map((step, idx) => (
            <div key={idx} className="flex gap-2 items-start text-xs font-mono text-gray-400">
              <span>{step.icon || "•"}</span>
              <span>{step.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SourceBadge = ({ source, relevance }) => {
  const getSourceType = (src) => {
    if (src.includes("Code") || src.includes("src/")) return "🔧";
    if (src.includes("Doc") || src.includes("README")) return "📚";
    if (src.includes("Config") || src.includes("config")) return "⚙️";
    if (src.includes("Test") || src.includes("test")) return "✅";
    return "📖";
  };

  const getSourceColor = (rel) => {
    if (rel >= 0.7) return "bg-cyan-500/20 border-cyan-500 text-cyan-300";
    if (rel >= 0.5) return "bg-blue-500/20 border-blue-500 text-blue-300";
    return "bg-gray-700/20 border-gray-600 text-gray-400";
  };

  const filename = source.split("/").pop() || source;

  return (
    <div className={`flex items-center gap-2 px-2 py-1.5 rounded border text-xs ${getSourceColor(relevance)} transition hover:brightness-110 cursor-help`} title={source}>
      <span>{getSourceType(source)}</span>
      <span className="font-mono">[{Math.round(relevance * 100)}%]</span>
      <span className="truncate max-w-[150px]">{filename}</span>
    </div>
  );
};

const Chat = ({ currentSessionId, setCurrentSessionId }) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const [responsePreference, setResponsePreference] = useState("context-driven");
  const [activeThought, setActiveThought] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Initialize Session
  useEffect(() => {
    if (!currentSessionId) {
      // Check if there's a last active session in localStorage
      const lastSessionId = localStorage.getItem("tooloo_current_session_id");
      if (lastSessionId && localStorage.getItem(`tooloo_session_${lastSessionId}`)) {
        if (setCurrentSessionId) setCurrentSessionId(lastSessionId);
      } else {
        // Create new session
        const sessionId = "session-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
        const newSession = {
          id: sessionId,
          name: `Session ${new Date().toLocaleTimeString()}`,
          created: new Date(),
          messages: [
            {
              id: "initial-welcome",
              type: "assistant",
              content: "Welcome to TooLoo.ai! How can I help you today?",
              timestamp: new Date(),
            }
          ]
        };
        localStorage.setItem(`tooloo_session_${sessionId}`, JSON.stringify(newSession));
        localStorage.setItem("tooloo_current_session_id", sessionId);
        if (setCurrentSessionId) setCurrentSessionId(sessionId);
      }
    }
  }, [currentSessionId, setCurrentSessionId]);

  // Load Messages when Session Changes
  useEffect(() => {
    if (currentSessionId) {
      const savedSession = localStorage.getItem(`tooloo_session_${currentSessionId}`);
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);
          // Ensure timestamps are Date objects
          const loadedMessages = (session.messages || []).map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(loadedMessages);
        } catch (e) {
          console.error("Failed to load session", e);
        }
      } else {
        setMessages([]);
      }
    }
  }, [currentSessionId]);

  // Save Messages to LocalStorage
  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      const savedSession = localStorage.getItem(`tooloo_session_${currentSessionId}`);
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);
          session.messages = messages;
          localStorage.setItem(`tooloo_session_${currentSessionId}`, JSON.stringify(session));
        } catch (e) {
          if (e.name === 'QuotaExceededError') {
            console.warn("LocalStorage quota exceeded. Trimming history...");
            // Try to save only the last 20 messages
            try {
              const session = JSON.parse(savedSession);
              session.messages = messages.slice(-20);
              localStorage.setItem(`tooloo_session_${currentSessionId}`, JSON.stringify(session));
            } catch (retryError) {
              console.error("Failed to save trimmed history:", retryError);
            }
          } else {
            console.error("Failed to save session:", e);
          }
        }
      }
    }
  }, [messages, currentSessionId]);

  // Socket Connection
  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on("synapsys:event", (event) => {
      if (event.type.startsWith("planning:") || event.type.startsWith("cortex:tool:")) {
        setActiveThought(prev => {
          const steps = prev?.steps || [];
          let newStep = null;

          if (event.type === "planning:plan:created") {
            newStep = { icon: "📋", text: `Plan created: ${event.payload.plan.goal}` };
          } else if (event.type === "cortex:tool:call") {
            newStep = { icon: "🛠️", text: `Executing: ${event.payload.type}` };
          } else if (event.type === "cortex:tool:result") {
            newStep = { icon: event.payload.result.ok ? "✅" : "❌", text: `Result: ${event.payload.result.ok ? "Success" : "Failed"}` };
          }

          if (newStep) {
            return { ...prev, steps: [...steps, newStep], isCollapsed: false };
          }
          return prev;
        });
      } else if (event.type === "visual:generated") {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            type: "assistant",
            content: "",
            visual: event.payload.visual,
            timestamp: new Date(),
          },
        ]);
      }
    });

    return () => newSocket.close();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setActiveThought({ steps: [], isCollapsed: false });

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const response = await fetch("/api/v1/chat/pro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          sessionId: currentSessionId,
          responseType: responsePreference,
        }),
      });

      const data = await response.json();
      
      if (data.ok && data.data) {
        const responseData = data.data;
        const assistantMessage = {
          id: Date.now(),
          type: "assistant",
          content: responseData.response || responseData.message || "",
          provider: responseData.provider,
          sources: responseData.sources,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: "error",
          content: `Error: ${err.message}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setActiveThought(prev => prev ? { ...prev, isCollapsed: true } : null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeThought]);

  return (
    <div className="flex h-full bg-obsidian text-gray-100">
      <div className="flex-1 flex flex-col h-full relative">
        {/* Header */}
        <div className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-gray-900/30 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-mono text-xs text-emerald-400">GEMINI PRO // ONLINE</span>
          </div>
          <div className="flex gap-4 items-center">
             {/* Project Selector Placeholder */}
             <button className="text-xs text-gray-400 hover:text-white flex items-center gap-2">
               <span>Select Project</span>
               <ChevronDown size={12} />
             </button>
          </div>
        </div>

        {/* Chat Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          {messages.map((msg) => (
            <div key={msg.id} className="flex gap-4 max-w-3xl mx-auto mb-6 animate-fade-in">
              <div className={`w-8 h-8 rounded-full border flex items-center justify-center flex-shrink-0 text-xs ${msg.type === "user" ? "bg-gray-800 border-white/10" : "bg-cyan-500/20 border-cyan-500 text-cyan-400"}`}>
                {msg.type === "user" ? "U" : "AI"}
              </div>
              <div className="space-y-1 w-full min-w-0">
                <div className={`text-xs mono ${msg.type === "user" ? "text-gray-500" : "text-cyan-400"}`}>
                  {msg.type === "user" ? "USER // NOW" : "TOOLOO // NOW"}
                  {msg.provider && <span className="ml-2 opacity-50">via {msg.provider}</span>}
                </div>
                
                <div className="text-gray-300 leading-relaxed">
                  {msg.visual ? (
                    <VisualRegistry type={msg.visual.type} data={msg.visual.data} />
                  ) : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ node, inline, className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || "");
                          const codeContent = String(children).replace(/\n$/, "");
                          
                          if (!inline && match) {
                            if (match[1] === 'mermaid') {
                                return <VisualRegistry type="diagram" data={codeContent} />;
                            }
                            return <VisualRegistry type="code" data={{ code: codeContent, language: match[1] }} />;
                          }
                          return (
                            <code className={`${className} bg-gray-800 px-1 py-0.5 rounded text-sm`} {...props}>
                              {children}
                            </code>
                          );
                        },
                        p: ({node, ...props}) => <div {...props} className={`mb-2 ${props.className || ''}`} />,
                        img({ src, alt }) {
                            return <VisualRegistry type="image" data={{ src, alt }} />;
                        }
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  )}
                </div>

                {/* Sources */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="text-[10px] uppercase text-gray-500 font-bold mb-3">📌 Knowledge Sources</div>
                    <div className="flex flex-wrap gap-2">
                      {msg.sources.map((s, i) => (
                        <SourceBadge key={i} source={s.source} relevance={s.relevance} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Active Thought Bubble */}
          {isLoading && activeThought && (
            <div className="max-w-3xl mx-auto pl-12">
              <ThoughtBubble 
                steps={activeThought.steps} 
                isCollapsed={activeThought.isCollapsed} 
                onToggle={() => setActiveThought(prev => ({ ...prev, isCollapsed: !prev.isCollapsed }))} 
              />
            </div>
          )}

          {isLoading && !activeThought && (
             <div className="flex justify-start max-w-3xl mx-auto pl-12">
                <div className="flex items-center text-gray-400 text-sm">
                  <Loader2 className="animate-spin mr-2 w-4 h-4 text-cyan-400" />
                  Thinking...
                </div>
             </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Matrix */}
        <div className="p-6 border-t border-white/10 bg-gray-900/50 backdrop-blur flex-shrink-0">
          <div className="max-w-3xl mx-auto relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Input directive for Synapsys..."
              className="w-full bg-gray-950/80 border border-white/10 rounded-lg p-4 pl-4 pr-32 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 text-gray-200 placeholder-gray-600 resize-none min-h-[6rem] max-h-[20rem] font-mono text-sm"
              disabled={isLoading}
            />
            <div className="absolute bottom-4 right-4 flex gap-2">
              <select
                value={responsePreference}
                onChange={(e) => setResponsePreference(e.target.value)}
                className="bg-gray-900 border border-white/10 text-gray-400 text-xs rounded px-2 py-1 focus:outline-none"
              >
                <option value="context-driven">Auto</option>
                <option value="detailed">Detailed</option>
                <option value="concise">Concise</option>
                <option value="code">Code</option>
              </select>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold tracking-wide transition flex items-center gap-2"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="animate-spin w-3 h-3" /> : "EXECUTE"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar: Neural State */}
      <NeuralState socket={socket} sessionId={currentSessionId} />
    </div>
  );
};

export default Chat;
