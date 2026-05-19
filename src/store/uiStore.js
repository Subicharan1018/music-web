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
  toasts: [],

  setView: (view) => set({ activeView: view }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setNowPlayingExpanded: (isExpanded) => set({ nowPlayingExpanded: isExpanded }),
  setQueueOpen: (isOpen) => set({ queueOpen: isOpen }),
  openModal: (modalId) => set({ activeModal: modalId }),
  closeModal: () => set({ activeModal: null }),

  addToast: (message, type = 'success') => set((state) => {
    const id = Date.now().toString() + Math.random().toString();
    const newToast = { id, message, type };
    // Cap at 3 toasts
    const newToasts = [...state.toasts, newToast].slice(-3);
    return { toasts: newToasts };
  }),
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter(t => t.id !== id)
  }))
}));
