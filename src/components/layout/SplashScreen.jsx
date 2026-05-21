import React from 'react';
import { LoadingSpinner } from '../shared/LoadingSpinner';

export const SplashScreen = () => {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: '#050505' }}
    >
      {/* Subtle radial crimson glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 55%, rgba(220,20,60,0.07) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Crimson ring + spinner */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: 'rgba(220,20,60,0.07)',
            border: '1px solid rgba(220,20,60,0.18)',
          }}
        >
          <div className="w-6 h-6 rounded-full border-2 border-coral/20 border-t-coral animate-spin" style={{ borderTopColor: '#dc143c' }} />
        </div>

        {/* Wordmark */}
        <h1
          className="text-4xl tracking-[0.15em] text-white leading-none"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        >
          NAVI<span style={{ color: '#dc143c' }}>VIBE</span>
        </h1>

        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/20 animate-pulse">
          loading
        </p>
      </div>
    </div>
  );
};
