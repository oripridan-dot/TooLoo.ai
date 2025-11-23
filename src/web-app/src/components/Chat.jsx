// @version 2.1.28
import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { io } from 'socket.io-client';
import ReactMarkdown from 'react-markdown';

const Chat = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'initial-welcome',
      type: 'assistant',
      content: 'Welcome to TooLoo.ai! How can I help you today?',
      timestamp: new Date(),
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('thinking', () => setIsLoading(true));

    newSocket.on('response', (data) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'assistant',
        content: data.content,
        timestamp: new Date(),
      }]);
      setIsLoading(false);
    });

    newSocket.on('error', (data) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        content: `Error: ${data.message}`,
        timestamp: new Date(),
      }]);
      setIsLoading(false);
    });

    return () => newSocket.close();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    
    if (socket) {
      socket.emit('generate', { prompt: input.trim() });
    }

    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-lg lg:max-w-2xl px-4 py-2 rounded-lg ${
              msg.type === 'user' ? 'bg-blue-500 text-white' : 
              msg.type === 'assistant' ? 'bg-gray-200 text-gray-800' : 'bg-red-500 text-white'
            }`}>
              <ReactMarkdown
                components={{
                  code({node, inline, className, children, ...props}) {
                    const match = /language-(\w+)/.exec(className || '')
                    return !inline && match ? (
                      <div className="bg-gray-800 text-white p-2 rounded my-2">
                        <pre><code className={className} {...props}>{children}</code></pre>
                      </div>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    )
                  }
                }}
              >
                {msg.content}
              </ReactMarkdown>
              <div className="text-xs opacity-75 mt-1 text-right">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-lg lg:max-w-2xl px-4 py-2 rounded-lg bg-gray-200 text-gray-800">
              <div className="flex items-center">
                <Loader2 className="animate-spin mr-2" />
                <span>TooLoo.ai is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t bg-white">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask TooLoo.ai anything..."
            className="w-full p-2 pr-12 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="absolute inset-y-0 right-0 px-4 flex items-center text-gray-500 hover:text-blue-500"
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
