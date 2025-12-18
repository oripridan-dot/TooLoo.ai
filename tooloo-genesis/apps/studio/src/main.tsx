/**
 * @file Studio browser entrypoint
 * @version 1.0.0
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { StudioApp } from './studio-app';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StudioApp />
  </React.StrictMode>,
);
