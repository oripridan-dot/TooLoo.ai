import React from 'react';
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <h1>TooLoo.ai</h1>
          <span>AI Development Assistant</span>
        </div>
        <nav className="nav">
          <button className="nav-btn active">Chat</button>
          <button className="nav-btn">Projects</button>
          <button className="nav-btn">Settings</button>
        </nav>
        <div className="user-actions">
          <button className="action-btn">GitHub</button>
          <div className="user-avatar">TP</div>
        </div>
      </div>
    </header>
  );
};

export default Header;