/**
 * LoginPage.jsx
 * Dark, focused login — connects to your Subsonic server.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../store/settingsStore';
import { createSubsonicClient, NetworkException, AuthException, ServerException } from '../api/subsonic';
import { Wifi } from 'lucide-react';

export const LoginPage = () => {
  const navigate = useNavigate();
  const setServerConfig = useSettingsStore((state) => state.setServerConfig);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const formattedUrl = 'https://subimusic.me';
      const config = { serverUrl: formattedUrl, username: username.trim(), password };

      const client = createSubsonicClient(config);
      await client.ping();

      setServerConfig(config);
      navigate('/library');
    } catch (err) {
      if (err instanceof AuthException) {
        setError('Authentication failed. Check your username and password.');
      } else if (err instanceof ServerException) {
        setError(`Server error: ${err.message}`);
      } else if (err instanceof NetworkException) {
        setError('Network error. Check the server URL and your connection.');
      } else {
        setError(err.message || 'An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = {
    background: 'rgba(15,15,15,0.9)',
    border: '1px solid rgba(220,20,60,0.15)',
    color: '#f0f0f0',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    letterSpacing: '0.02em',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: '#050505' }}
    >
      {/* Background waveform echo */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 60%, rgba(220,20,60,0.06) 0%, transparent 70%)',
        }}
      />

      {/* Diagonal grid accent */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, #dc143c 0, #dc143c 1px, transparent 0, transparent 50%)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo block */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
            style={{ background: 'rgba(220,20,60,0.08)', border: '1px solid rgba(220,20,60,0.2)' }}
          >
            <Wifi size={24} className="text-coral" style={{ color: '#dc143c' }} />
          </div>
          <h1
            className="font-display text-5xl tracking-[0.12em] text-white leading-none mb-2"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            NAVI<span style={{ color: '#dc143c' }}>VIBE</span>
          </h1>
          <p className="font-mono text-[11px] text-white/25 uppercase tracking-[0.25em]">
            Subsonic Client · Connect
          </p>
        </div>

        {/* Error state */}
        {error && (
          <div
            className="mb-5 px-4 py-3 rounded-lg text-sm font-mono"
            style={{
              background: 'rgba(220,20,60,0.07)',
              border: '1px solid rgba(220,20,60,0.25)',
              color: '#e8294d',
              letterSpacing: '0.02em',
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
        {/* Server URL removed per request, hardcoded to https://subimusic.me */}

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-white/25 mb-1.5">
              Username
            </label>
            <input
              id="login-username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg outline-none"
              style={inputStyle}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(220,20,60,0.5)';
                e.target.style.boxShadow = '0 0 0 2px rgba(220,20,60,0.08)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(220,20,60,0.15)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-white/25 mb-1.5">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg outline-none"
              style={inputStyle}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(220,20,60,0.5)';
                e.target.style.boxShadow = '0 0 0 2px rgba(220,20,60,0.08)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(220,20,60,0.15)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <button
            id="login-submit"
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 py-3.5 px-4 rounded-lg font-sans font-semibold text-sm tracking-wide transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: isLoading
                ? 'rgba(220,20,60,0.4)'
                : 'linear-gradient(135deg, #dc143c 0%, #c80d34 100%)',
              color: '#fff',
              boxShadow: isLoading ? 'none' : '0 0 24px rgba(220,20,60,0.35)',
            }}
          >
            {isLoading ? '// connecting...' : 'Connect →'}
          </button>
        </form>

        <p className="text-center font-mono text-[9px] text-white/15 uppercase tracking-widest mt-8">
          NaviVibe · Open Source Subsonic Client
        </p>
      </div>
    </div>
  );
};
