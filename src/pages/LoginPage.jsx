/**
 * LoginPage.jsx
 * Collects server URL and credentials, validates via ping(), and saves to settingsStore.
 * Styled with Atelier Zero.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../store/settingsStore';
import { createSubsonicClient, NetworkException, AuthException, ServerException } from '../api/subsonic';
import { Music } from 'lucide-react';

export const LoginPage = () => {
  const navigate = useNavigate();
  const setServerConfig = useSettingsStore((state) => state.setServerConfig);
  
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const formattedUrl = url.trim().replace(/\/$/, '');
      const config = { serverUrl: formattedUrl, username: username.trim(), password };
      
      const client = createSubsonicClient(config);
      await client.ping();
      
      setServerConfig(config);
      navigate('/library');
    } catch (err) {
      if (err instanceof AuthException) {
        setError('Authentication failed. Please check your username and password.');
      } else if (err instanceof ServerException) {
        setError(`Server error: ${err.message}`);
      } else if (err instanceof NetworkException) {
        setError('Network error. Please check the Server URL and your connection.');
      } else {
        setError(err.message || 'An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-paper-warm p-10 rounded-lg shadow-sm border border-ink/16 relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-coral/10 rounded-full flex items-center justify-center mb-4 text-coral">
            <Music size={32} />
          </div>
          <h1 className="font-serif text-4xl font-bold text-ink italic">NaviVibe</h1>
          <p className="text-ink-mute font-sans mt-2 tracking-wide">Connect to your Subsonic server</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-coral/10 border border-coral/20 rounded-md">
            <p className="text-coral text-sm font-sans font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-sans font-medium text-ink-mute mb-1">Server URL</label>
            <input 
              type="url" 
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://music.example.com"
              className="w-full px-4 py-3 bg-paper border border-ink/16 rounded-md text-ink font-body focus:outline-none focus:border-coral transition-colors"
            />
          </div>
          
          <div>
            <label className="block text-sm font-sans font-medium text-ink-mute mb-1">Username</label>
            <input 
              type="text" 
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-paper border border-ink/16 rounded-md text-ink font-body focus:outline-none focus:border-coral transition-colors"
            />
          </div>
          
          <div>
            <label className="block text-sm font-sans font-medium text-ink-mute mb-1">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-paper border border-ink/16 rounded-md text-ink font-body focus:outline-none focus:border-coral transition-colors"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full mt-8 py-3 px-4 bg-coral hover:bg-coral-soft text-paper font-sans font-medium rounded-md transition-colors duration-160 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Connecting...' : 'Connect'}
          </button>
        </form>
      </div>
    </div>
  );
};
