import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { PlayerBar } from './PlayerBar';
import { QueuePanel } from '../queue/QueuePanel';
import { TopBar } from './TopBar';
import { SideRail } from './SideRail';
import SonicWaveformBackground from '../ui/sonic-waveform';
import { NowPlayingOverlay } from '../nowplaying/NowPlayingOverlay';
import { useUIStore } from '../../store/uiStore';
import { usePlayerStore } from '../../store/playerStore';
import { usePlaylistStore } from '../../store/playlistStore';
import { useSubsonic } from '../../hooks/useSubsonic';
import { useSettingsStore } from '../../store/settingsStore';

import { useV2ShuffleStore } from '../../store/v2ShuffleStore';
import { ToastContainer } from '../shared/Toast';
import { PlaylistBackground } from '../playlist/PlaylistBackground';
import { useState } from 'react';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

export const AppShell = () => {
  const { sidebarCollapsed } = useUIStore();
  const { queue, reorderQueue, initEngine, audioEngine } = usePlayerStore();
  const { fetchPlaylists } = usePlaylistStore();
  const client = useSubsonic();
  const v2ShuffleUrl = useSettingsStore((s) => s.v2ShuffleUrl);
  const v2ShuffleEnabled = useSettingsStore((s) => s.v2ShuffleEnabled);

  const { init: initV2, startHealthPolling: startV2Polling, stopHealthPolling: stopV2Polling } = useV2ShuffleStore();
  const location = useLocation();
  const isPlaylistRoute = location.pathname.startsWith('/playlist/');
  const [playlistBgUrl, setPlaylistBgUrl] = useState('');

  // Register global keyboard shortcuts
  useKeyboardShortcuts();

  // Initialize the AudioEngine once the client is available
  useEffect(() => {
    if (client) {
      if (!audioEngine) {
        initEngine(client);
      }
      // Fetch playlists only once per session (guard in store prevents duplicate calls)
      fetchPlaylists(client);
    }
  }, [client, audioEngine, initEngine, fetchPlaylists]);




  // Initialize V2 shuffle server when URL changes
  useEffect(() => {
    if (v2ShuffleUrl) {
      console.log('[AppShell] Initializing V2 shuffle store with URL:', v2ShuffleUrl);
      initV2(v2ShuffleUrl);
      startV2Polling();
    } else {
      stopV2Polling();
    }
    return () => stopV2Polling();
  }, [v2ShuffleUrl, initV2, startV2Polling, stopV2Polling]);

  return (
    <>
      <div 
        className="app-shell relative h-screen w-full bg-transparent text-ink overflow-hidden"
        style={{
          display: 'grid',
          gridTemplateAreas: sidebarCollapsed 
            ? `"sidebar main" "sidebar player"`
            : `"sidebar main" "sidebar player"`,
          gridTemplateRows: '1fr 80px',
          gridTemplateColumns: sidebarCollapsed ? '64px 1fr' : '240px 1fr',
          paddingLeft: '36px', // For left SideRail
          paddingTop: '44px'   // For TopBar
        }}
      >
        {isPlaylistRoute && playlistBgUrl && (
          <PlaylistBackground url={playlistBgUrl} />
        )}
        <SonicWaveformBackground />
        <TopBar />
        <SideRail side="left" label="NAVIVIBE · MUSIC" />
        <SideRail side="right" label="2026 · V0.1" />

        <div style={{ gridArea: 'sidebar' }}>
          <Sidebar />
        </div>
        
        <main 
          className="main-content overflow-y-auto z-10 pr-9"
          style={{ gridArea: 'main' }}
        >
          <div className="p-8 max-w-7xl mx-auto min-h-full">
            <Outlet context={{ setPlaylistBgUrl }} />
          </div>
        </main>

        <QueuePanel />
        <NowPlayingOverlay />
        
        <PlayerBar />
      </div>
      <ToastContainer />
    </>
  );
};
