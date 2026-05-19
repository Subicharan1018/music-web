/**
 * AppShell.jsx
 * Top-level layout incorporating Sidebar, main content area, QueuePanel, and PlayerBar.
 * Styled with Atelier Zero.
 * Wraps everything in DndContext for drag-and-drop support.
 */

import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Sidebar } from './Sidebar';
import { PlayerBar } from './PlayerBar';
import { QueuePanel } from '../queue/QueuePanel';
import { TopBar } from './TopBar';
import { SideRail } from './SideRail';
import SonicWaveformBackground from '../ui/sonic-waveform';
import { useUIStore } from '../../store/uiStore';
import { usePlayerStore } from '../../store/playerStore';
import { useSubsonic } from '../../hooks/useSubsonic';

export const AppShell = () => {
  const { sidebarCollapsed } = useUIStore();
  const { queue, reorderQueue, initEngine, audioEngine } = usePlayerStore();
  const client = useSubsonic();

  // Initialize the AudioEngine once the client is available
  useEffect(() => {
    if (client && !audioEngine) {
      initEngine(client);
    }
  }, [client, audioEngine, initEngine]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement required before drag starts to allow clicks
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active && over && active.id !== over.id) {
      const oldIndex = parseInt(active.id.split('-')[1], 10);
      const newIndex = parseInt(over.id.split('-')[1], 10);
      reorderQueue(oldIndex, newIndex);
    }
  };

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="relative flex h-screen w-full bg-transparent text-ink overflow-hidden">
        <SonicWaveformBackground />
        <TopBar />
        <SideRail side="left" label="NAVIVIBE · MUSIC" />
        <SideRail side="right" label="2026 · V0.1" />

        <Sidebar />
        
        <main 
          className={`flex-1 transition-all duration-300 overflow-y-auto pb-player-bar z-10 pt-[44px] pr-9 ${
            sidebarCollapsed ? 'ml-[calc(64px+36px)]' : 'ml-[calc(240px+36px)]'
          }`}
        >
          <div className="p-8 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>

        <QueuePanel />
        <PlayerBar />
      </div>
    </DndContext>
  );
};
