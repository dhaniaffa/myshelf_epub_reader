import React from 'react';
import ReactDOM from 'react-dom/client';

import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import '@/styles/app.css';

import { App } from '@/App';
import { GlobalErrorBoundary } from '@/components/GlobalErrorBoundary';
import { initDesktopScrollFix } from '@/lib/desktopScrollFix';

// Ensure smooth mouse wheel scrolling in desktop Tauri / WebKitGTK Linux environments
initDesktopScrollFix();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>
);
