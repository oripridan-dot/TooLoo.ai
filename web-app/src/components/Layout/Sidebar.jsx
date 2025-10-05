import React from 'react';
import './Sidebar.css';

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h3>Recent Chats</h3>
      </div>
      <div className="chat-history">
        <div className="chat-item active">
          <span className="chat-title">UI Improvements</span>
          <span className="chat-time">2 min ago</span>
        </div>
        <div className="chat-item">
          <span className="chat-title">Code Review</span>
          <span className="chat-time">1 hour ago</span>
        </div>
        <div className="chat-item">
          <span className="chat-title">Project Setup</span>
          <span className="chat-time">Yesterday</span>
        </div>
      </div>
      <div className="sidebar-footer">
        <button className="new-chat-btn">
          + New Chat
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;