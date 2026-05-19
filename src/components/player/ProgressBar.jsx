/**
 * ProgressBar.jsx
 * Custom range input for playback position and seeking.
 * Styled with Atelier Zero using Tailwind CSS.
 */

import React, { useState, useEffect } from 'react';
import { usePlayerStore } from '../../store/playerStore';

const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const ProgressBar = () => {
  const { position, duration, seek } = usePlayerStore();
  const [localPos, setLocalPos] = useState(position);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) {
      setLocalPos(position);
    }
  }, [position, isDragging]);

  const handleChange = (e) => {
    setLocalPos(parseFloat(e.target.value));
  };

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = (e) => {
    setIsDragging(false);
    seek(parseFloat(e.target.value));
  };

  const progressPercent = duration > 0 ? (localPos / duration) * 100 : 0;

  return (
    <div className="w-full flex items-center gap-3 group">
      <span className="font-mono text-xs text-ink-faint w-10 text-right shrink-0">
        {formatTime(localPos)}
      </span>
      
      <div className="relative flex-1 h-2 flex items-center">
        {/* Track Background */}
        <div className="absolute w-full h-1 bg-ink/10 rounded-full"></div>
        
        {/* Progress Fill */}
        <div 
          className="absolute h-1 bg-coral rounded-full group-hover:h-1.5 transition-all"
          style={{ width: `${progressPercent}%` }}
        ></div>

        {/* The Range Input overlay */}
        <input 
          type="range"
          min="0"
          max={duration || 100}
          step="0.1"
          value={localPos}
          onChange={handleChange}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          className="absolute w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      
      <span className="font-mono text-xs text-ink-faint w-10 shrink-0">
        {formatTime(duration)}
      </span>
    </div>
  );
};
