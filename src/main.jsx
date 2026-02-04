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
import { NetworkProvider } from './shared/context/NetworkContext';
import { RulesProvider } from './shared/context/RulesContext';
import { ValuesProvider } from './shared/context/ValuesContext';
import { ServiceProvider } from './shared/context/ServiceContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <OverlayProvider>
      <AlertProvider>
        <ToastProvider>
          <ThemeProvider>
            <ServiceProvider>
              <NetworkProvider>
                <RulesProvider>
                  <ValuesProvider>
                    <App />
                  </ValuesProvider>
                </RulesProvider>
              </NetworkProvider>
            </ServiceProvider>
          </ThemeProvider>
        </ToastProvider>
      </AlertProvider>
    </OverlayProvider>
  </React.StrictMode>,
);
