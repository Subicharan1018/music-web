/**
 * TopBar.jsx
 * Premium Glassmorphic Top Strip
 */

import React from 'react';
import { useUIStore } from '../../store/uiStore';
import { useSettingsStore } from '../../store/settingsStore';

export const TopBar = () => {
  const { activeView } = useUIStore();
  const { serverUrl } = useSettingsStore();

  const isConnected = !!serverUrl;
  
  let displayUrl = 'NOT CONNECTED';
  if (isConnected) {
    try { displayUrl = new URL(serverUrl).hostname.toUpperCase(); } 
    catch { displayUrl = serverUrl.toUpperCase(); }
  }

  return (
    <div className="fixed top-0 left-0 right-0 h-[48px] bg-black/30 backdrop-blur-3xl border-b border-white/10 shadow-[0_4px_32px_rgba(0,0,0,0.5)] z-50 flex items-center justify-between px-8 font-sans text-[11px] tracking-[0.2em] uppercase text-white/50 relative">
      
      {/* Subtle top glow edge */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Left: Branding */}
      <div className="flex-1 text-left flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-gradient-to-br from-coral to-mustard shadow-[0_0_8px_rgba(220,20,60,0.6)]" />
        <span className="text-white font-bold tracking-widest drop-shadow-sm">NAVIVIBE</span>
      </div>

      {/* Center: Current View */}
      <div className="flex-1 text-center font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 tracking-[0.3em] drop-shadow-sm">
        {activeView ? activeView.toUpperCase() : 'LIBRARY'}
      </div>

      {/* Right: Connection Status */}
      <div className="flex-1 text-right flex items-center justify-end font-medium">
        {isConnected ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block mr-2 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
            <span className="text-green-400 font-bold drop-shadow-[0_0_8px_rgba(74,222,128,0.4)]">CONNECTED</span>
            <span className="mx-2 text-white/20">·</span>
            <span className="text-white/60 tracking-wider">{displayUrl}</span>
          </>
        ) : (
          <span className="text-white/30 tracking-wider">NOT CONNECTED</span>
        )}
      </div>

    </div>
  );
};
