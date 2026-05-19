/**
 * SettingsPage.jsx
 * Settings configuration including server connection.
 * Styled with Atelier Zero typography.
 */

import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/shared/Button';
import { createSubsonicClient, NetworkException, AuthException, ServerException } from '../api/subsonic';

export const SettingsPage = () => {
  const { serverUrl, username: storeUsername, password: storePassword, clearConfig, setServerConfig } = useSettingsStore();
  const navigate = useNavigate();

  const [url, setUrl] = useState(serverUrl || '');
  const [username, setUsername] = useState(storeUsername || '');
  const [password, setPassword] = useState(storePassword || '');
  
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    setUrl(serverUrl || '');
    setUsername(storeUsername || '');
    setPassword(storePassword || '');
  }, [serverUrl, storeUsername, storePassword]);

  const handleLogout = () => {
    clearConfig();
    navigate('/login');
  };

  const handleTestConnection = async () => {
    setTestResult(null);
    setIsTesting(true);

    try {
      const formattedUrl = url.trim().replace(/\/$/, '');
      const config = { serverUrl: formattedUrl, username: username.trim(), password };
      
      const client = createSubsonicClient(config);
      const startTime = Date.now();
      await client.ping();
      const latency = Date.now() - startTime;
      
      setTestResult({ type: 'success', message: `Connected · ${latency}ms` });
    } catch (err) {
      if (err instanceof AuthException) {
        setTestResult({ type: 'error', message: 'Authentication failed. Please check your username and password.' });
      } else if (err instanceof ServerException) {
        setTestResult({ type: 'error', message: `Server error: ${err.message}` });
      } else if (err instanceof NetworkException) {
        setTestResult({ type: 'error', message: 'Network error. Please check the Server URL and your connection.' });
      } else {
        setTestResult({ type: 'error', message: err.message || 'An unexpected error occurred.' });
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    const formattedUrl = url.trim().replace(/\/$/, '');
    const config = { serverUrl: formattedUrl, username: username.trim(), password };
    setServerConfig(config);
  };

  return (
    <div className="animate-in fade-in duration-300">
      <div className="mb-12">
        <h1 className="font-serif text-4xl font-medium text-ink mb-3 flex items-baseline gap-3">
          <span className="font-mono text-[10px] text-coral tracking-widest uppercase">Nº 02</span>
          Settings
        </h1>
        <p className="font-body text-base text-ink-mute leading-relaxed max-w-2xl">
          Configure your application preferences, audio settings, and connection details.
        </p>
      </div>
      
      <div className="max-w-2xl">
        <h2 className="font-sans text-[11px] tracking-[0.2em] uppercase text-ink-faint border-b border-ink/10 pb-1 mb-6">
          Server Connection
        </h2>
        
        <div className="space-y-5 mb-8">
          <div>
            <label className="block text-sm font-sans font-medium text-ink-mute mb-1">Server URL</label>
            <input 
              type="url" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://music.example.com"
              className="w-full px-4 py-3 bg-paper-warm border border-ink/20 rounded-md text-ink font-body focus:outline-none focus:border-coral transition-colors"
            />
          </div>
          
          <div>
            <label className="block text-sm font-sans font-medium text-ink-mute mb-1">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-paper-warm border border-ink/20 rounded-md text-ink font-body focus:outline-none focus:border-coral transition-colors"
            />
          </div>
          
          <div>
            <label className="block text-sm font-sans font-medium text-ink-mute mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-paper-warm border border-ink/20 rounded-md text-ink font-body focus:outline-none focus:border-coral transition-colors"
            />
          </div>

          {testResult && (
            <div className={`p-4 rounded-md border ${testResult.type === 'success' ? 'bg-olive/10 border-olive/20 text-olive' : 'bg-coral/10 border-coral/20 text-coral'}`}>
              <p className="text-sm font-sans font-medium">{testResult.message}</p>
            </div>
          )}
        </div>
        
        <div className="flex gap-4">
          <Button variant="ghost" onClick={handleLogout}>
            Disconnect Server
          </Button>
          <Button variant="ghost" onClick={handleTestConnection} disabled={isTesting}>
            {isTesting ? 'Testing...' : 'Test Connection'}
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
};
