// @version 2.1.11
import React from 'react';

const MainContent = ({ children }) => {
  return (
    <main className="flex-1 p-4">
      {children}
    </main>
  );
};

export default MainContent;
