import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import './lib/gsap';
import './index.css';

// ── Listening telemetry singleton — init once, subscribe to URL changes ──────
import * as ListeningLog from './services/listeningLog';
import { useSettingsStore } from './store/settingsStore';

ListeningLog.init(useSettingsStore.getState().localShuffleUrl);
useSettingsStore.subscribe(
  (s) => s.localShuffleUrl,
  (url) => ListeningLog.init(url),
);
// ─────────────────────────────────────────────────────────────────────────────

import { flushNow } from './store/affinityStore';

window.addEventListener('beforeunload', () => {
  flushNow();
});

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
