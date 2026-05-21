/**
 * TopBar.jsx
 * Top metadata strip in Atelier Zero style.
 */

import React from 'react';
import { useUIStore } from '../../store/uiStore';
import { useSettingsStore } from '../../store/settingsStore';

export const TopBar = () => {
  const { activeView } = useUIStore();
  const { serverUrl } = useSettingsStore();

  const isConnected = !!serverUrl;
  
  // Format the URL for display (e.g. "music.example.com")
  let displayUrl = 'NOT CONNECTED';
  if (isConnected) {
    try {
      const urlObj = new URL(serverUrl);
      displayUrl = urlObj.hostname.toUpperCase();
    } catch {
      displayUrl = serverUrl.toUpperCase();
    }
  }

  return (
    <div className="fixed top-0 left-0 right-0 h-[44px] bg-paper/70 backdrop-blur-md border-b border-ink/10 shadow-sm z-50 flex items-center justify-between px-6 font-sans text-[10.5px] tracking-[0.18em] uppercase text-ink-faint">
      
      {/* Left: Branding */}
      <div className="flex-1 text-left">
        <span className="text-ink font-semibold">NAVIVIBE</span>
      </div>

      {/* Center: Current View */}
      <div className="flex-1 text-center font-semibold text-ink">
        {activeView ? activeView.toUpperCase() : 'LIBRARY'}
      </div>

      {/* Right: Connection Status */}
      <div className="flex-1 text-right flex items-center justify-end">
        {isConnected ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block mr-1.5 shadow-[0_0_4px_rgba(74,222,128,0.6)]" />
            <span className="text-green-400 font-semibold">CONNECTED</span>
            <span className="mx-1.5">·</span>
            <span>{displayUrl}</span>
          </>
        ) : (
          <span>NOT CONNECTED</span>
        )}
      </div>

    </div>
  );
};
