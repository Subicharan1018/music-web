/**
 * VolumeSlider.jsx
 * Extracted volume control component.
 * Ranges from 0.0 to 1.0.
 */

import React, { useState, useEffect } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { Volume1, Volume2, VolumeX } from 'lucide-react';

export const VolumeSlider = ({ className = '' }) => {
  const { volume, setVolume } = usePlayerStore();
  const [localVol, setLocalVol] = useState(volume);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) {
      setLocalVol(volume);
    }
  }, [volume, isDragging]);

  const handleChange = (e) => {
    const v = parseFloat(e.target.value);
    setLocalVol(v);
    setVolume(v);
  };

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  const toggleMute = () => {
    if (volume > 0) {
      setVolume(0);
    } else {
      setVolume(1);
    }
  };

  const volPercent = localVol * 100;

  let Icon = Volume2;
  if (localVol === 0) Icon = VolumeX;
  else if (localVol < 0.5) Icon = Volume1;

  return (
    <div className={`flex items-center gap-2 group ${className}`}>
      <button 
        onClick={toggleMute} 
        className="text-ink-mute hover:text-coral transition-colors duration-160 flex-shrink-0"
      >
        <Icon size={20} />
      </button>
      
      <div className="relative w-24 h-2 flex items-center">
        {/* Track Background */}
        <div className="absolute w-full h-1 bg-ink/10 rounded-full"></div>
        
        {/* Volume Fill */}
        <div 
          className="absolute h-1 bg-ink-mute group-hover:bg-coral rounded-full transition-colors"
          style={{ width: `${volPercent}%` }}
        ></div>

        {/* Range Input */}
        <input 
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={localVol}
          onChange={handleChange}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          className="absolute w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
};
