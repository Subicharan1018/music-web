/**
 * uiStore.js
 * Zustand store for UI state like sidebar, active views, and modals.
 */

import { create } from 'zustand';

export const useUIStore = create((set) => ({
  activeView: 'library',
  sidebarCollapsed: false,
  nowPlayingExpanded: false,
  queueOpen: false,
  activeModal: null,

  setView: (view) => set({ activeView: view }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setQueueOpen: (isOpen) => set({ queueOpen: isOpen }),
  openModal: (modalId) => set({ activeModal: modalId }),
  closeModal: () => set({ activeModal: null })
}));
