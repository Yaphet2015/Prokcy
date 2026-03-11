import './index.css';
import '@pikoloo/darwin-ui/styles.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  OverlayProvider,
  AlertProvider,
  ToastProvider,
} from '@pikoloo/darwin-ui';
import App from './App';
import { ThemeProvider } from './shared/context/ThemeContext';
import { ServiceProvider } from './shared/context/ServiceContext';

// Ensure root element exists before rendering
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <OverlayProvider>
      <AlertProvider>
        <ToastProvider>
          <ThemeProvider>
            <ServiceProvider>
              <App />
            </ServiceProvider>
          </ThemeProvider>
        </ToastProvider>
      </AlertProvider>
    </OverlayProvider>
  </React.StrictMode>,
);
