import React from 'react';
import { Music } from 'lucide-react';
import { LoadingSpinner } from '../shared/LoadingSpinner';

export const SplashScreen = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper text-ink px-4">
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 bg-coral/10 rounded-full flex items-center justify-center mb-6 text-coral animate-pulse">
          <Music size={32} />
        </div>
        <h1 className="font-serif text-2xl font-bold italic mb-4">NaviVibe</h1>
        <LoadingSpinner />
      </div>
    </div>
  );
};
