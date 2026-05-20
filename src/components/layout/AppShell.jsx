import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
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
import { useAIShuffleStore } from '../../store/aiShuffleStore';
import { ToastContainer } from '../shared/Toast';

export const AppShell = () => {
  const { sidebarCollapsed } = useUIStore();
  const { queue, reorderQueue, initEngine, audioEngine } = usePlayerStore();
  const { fetchPlaylists } = usePlaylistStore();
  const client = useSubsonic();
  const localShuffleUrl = useSettingsStore((s) => s.localShuffleUrl);
  const { init, startHealthPolling, stopHealthPolling } = useAIShuffleStore();

  // Initialize the AudioEngine once the client is available
  useEffect(() => {
    if (client) {
      if (!audioEngine) {
        initEngine(client);
      }
      fetchPlaylists(client);
    }
  }, [client, audioEngine, initEngine, fetchPlaylists]);

  // Initialize AI shuffle server and start health polling when URL changes
  useEffect(() => {
    init(localShuffleUrl || '');
    if (localShuffleUrl) {
      startHealthPolling();
    }
    return () => stopHealthPolling();
  }, [localShuffleUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="relative flex h-screen w-full bg-transparent text-ink overflow-hidden">
        <SonicWaveformBackground />
        <TopBar />
        <SideRail side="left" label="NAVIVIBE · MUSIC" />
        <SideRail side="right" label="2026 · V0.1" />

        <Sidebar />
        
        <main 
          className={`main-content flex-1 transition-all duration-300 overflow-y-auto pb-player-bar z-10 pt-[44px] pr-9 ${
            sidebarCollapsed ? 'ml-[calc(64px+36px)]' : 'ml-[calc(240px+36px)]'
          }`}
        >
          <div className="p-8 max-w-7xl mx-auto">
            <Outlet />
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
