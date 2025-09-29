import React, { useState } from 'react';
import MissionControl from './components/MissionControl';
import './App.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function AppMissionControl() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [systemStatus, setSystemStatus] = useState('Systems normal. Awaiting your next directive.');

  // Simulate sending a message to TooLoo.ai
  const handleSendMessage = async (messageText: string) => {
    // Add user message to the conversation
    setMessages([...messages, { role: 'user', content: messageText }]);
    
    // Set thinking state to true to trigger animations
    setIsThinking(true);
    setSystemStatus('Processing your request...');
    
    // Simulate API call delay
    setTimeout(() => {
      // Generate a response (in a real app, this would come from your API)
      const response: Message = {
        role: 'assistant',
        content: `I've processed your request: "${messageText}". Here's what I found...`,
      };
      
      // Add assistant response to the conversation
      setMessages([...messages, { role: 'user', content: messageText }, response]);
      
      // Update system status and stop thinking animation
      setSystemStatus('Ready for your next command.');
      setIsThinking(false);
    }, 3000);
  };

  return (
    <div className="app">
      <MissionControl
        isThinking={isThinking}
        systemStatus={systemStatus}
        onSendMessage={handleSendMessage}
      />
      
      {/* You can add a separate messages view if needed */}
      {/* <div className="messages-container">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
      </div> */}
    </div>
  );
}

export default AppMissionControl;