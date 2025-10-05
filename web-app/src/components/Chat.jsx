import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Connect to backend (use relative path for Vite proxy)
  useEffect(() => {
    socketRef.current = io({
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Connected to TooLoo.ai');
      setIsConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ Disconnected from TooLoo.ai');
      setIsConnected(false);
    });

    socketRef.current.on('response', (data) => {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.content,
        timestamp: new Date()
      }]);
    });

    socketRef.current.on('error', (data) => {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        role: 'error',
        content: data.message || 'An error occurred',
        timestamp: new Date()
      }]);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const handleSend = () => {
    if (!input.trim() || !isConnected) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    socketRef.current.emit('message', {
      message: input,
      conversationId: 'default'
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">TooLoo.ai</h1>
              <p className="text-sm text-gray-500">Your AI Assistant</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-20">
              <div className="text-6xl mb-4">💬</div>
              <h2 className="text-xl font-medium mb-2">Start a conversation</h2>
              <p>Ask me anything about your projects, code, or ideas!</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl rounded-lg p-4 ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : msg.role === 'error'
                    ? 'bg-red-100 text-red-900 border border-red-300'
                    : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
                <div className={`text-xs mt-2 ${
                  msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                }`}>
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-900 border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex space-x-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message... (Shift+Enter for new line)"
              className="flex-1 border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows="3"
              disabled={!isConnected}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || !isConnected}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                input.trim() && isConnected
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;