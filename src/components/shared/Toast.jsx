/**
 * Toast.jsx
 * Global toast notification manager.
 * Mounted once in AppShell.
 */

import React, { useEffect } from 'react';
import { useUIStore } from '../../store/uiStore';
import { X } from 'lucide-react';

export const ToastContainer = () => {
  const { toasts, removeToast } = useUIStore();

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (toast.type !== 'error') {
      const timer = setTimeout(() => {
        onDismiss();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [toast, onDismiss]);

  return (
    <div 
      className={
        `bg-ink text-paper font-sans text-sm px-4 py-2 flex items-center justify-between gap-4 shadow-lg animate-in slide-in-from-right-8 duration-300 pointer-events-auto ${
          toast.type === 'error' ? "rounded-md border-l-2 border-coral" : "rounded-full"
        }`
      }
    >
      <span>{toast.message}</span>
      {toast.type === 'error' && (
        <button onClick={onDismiss} className="text-paper/70 hover:text-paper transition-colors">
          <X size={14} />
        </button>
      )}
    </div>
  );
};
