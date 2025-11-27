// @version 2.1.28
import React from 'react';

const MainContent = ({ children }) => {
  return (
    <main className="flex-1 p-4 overflow-y-auto bg-obsidian">
      {children}
    </main>
  );
};

export default MainContent;
