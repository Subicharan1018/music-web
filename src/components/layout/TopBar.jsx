/**
 * TopBar.jsx
 * Razor-thin topbar — obsidian black with crimson accent markers.
 */

import React from 'react';
import { useUIStore } from '../../store/uiStore';
import { useSettingsStore } from '../../store/settingsStore';

export const TopBar = () => {
  const { activeView } = useUIStore();
  const { serverUrl } = useSettingsStore();

  const isConnected = !!serverUrl;

  let displayUrl = 'OFFLINE';
  if (isConnected) {
    try { displayUrl = new URL(serverUrl).hostname; }
    catch { displayUrl = serverUrl; }
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 h-[44px] z-50 flex items-center justify-between px-6"
      style={{
        background: 'rgba(5, 5, 5, 0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(220, 20, 60, 0.08)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.02), 0 4px 24px rgba(0,0,0,0.5)',
      }}
    >
      {/* Crimson edge line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-coral/40 via-coral/10 to-transparent" />

      {/* LEFT: Brand dot + wordmark */}
      <div className="flex items-center gap-2.5 flex-1">
        <span
          className="w-1.5 h-1.5 rounded-full bg-coral shrink-0"
          style={{ boxShadow: '0 0 6px rgba(220,20,60,0.9)' }}
        />
        <span className="font-display text-[15px] tracking-[0.3em] text-white/90 leading-none">
          NAVIVIBE
        </span>
      </div>

      {/* CENTER: Active page name */}
      <div className="flex-1 text-center">
        <span className="font-mono text-[10px] tracking-[0.35em] uppercase text-white/30">
          {activeView ? `// ${activeView}` : '// library'}
        </span>
      </div>

      {/* RIGHT: Connection */}
      <div className="flex-1 flex items-center justify-end gap-2">
        {isConnected ? (
          <>
            <span
              className="w-1.5 h-1.5 rounded-full bg-coral shrink-0"
              style={{ boxShadow: '0 0 8px rgba(220,20,60,0.8)', animation: 'pulse-glow 2s infinite' }}
            />
            <span className="font-mono text-[10px] uppercase tracking-widest text-coral/80">connected</span>
            <span className="text-white/15 mx-1 text-xs">·</span>
            <span className="font-mono text-[10px] text-white/30 tracking-wider truncate max-w-[140px]">{displayUrl}</span>
          </>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/20">offline</span>
        )}
      </div>
    </div>
  );
};
