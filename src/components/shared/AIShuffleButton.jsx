import React, { useRef, useEffect } from 'react';
import { usePlayer } from '../../hooks/usePlayer';
import { useUIStore } from '../../store/uiStore';
import { gsap } from '../../lib/gsap';

export const AIShuffleButton = ({ className = "" }) => {
  const {
    queue,
    shuffleMode,
    enableSmartShuffle,
    enableDumbShuffle,
    disableShuffle
  } = usePlayer();

  const { addToast } = useUIStore();
  const buttonRef = useRef(null);
  const glowRef = useRef(null);

  const cycleShuffle = async () => {
    if (shuffleMode === 'none') {
      enableDumbShuffle();
      addToast("Standard Shuffle Enabled", "info");
    } else if (shuffleMode === 'dumb') {
      await enableSmartShuffle(queue);
      addToast("AI Smart Shuffle Active", "success");
    } else {
      disableShuffle();
      addToast("Shuffle Disabled", "info");
    }
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Clear existing timelines
      gsap.killTweensOf(buttonRef.current);
      gsap.killTweensOf(glowRef.current);

      if (shuffleMode === 'smart') {
        // AI Smart state: continuous subtle pulse and spin
        gsap.to(buttonRef.current, {
          scale: 1.05,
          duration: 0.8,
          yoyo: true,
          repeat: -1,
          ease: "power1.inOut"
        });
        gsap.to(glowRef.current, {
          opacity: 0.8,
          scale: 1.3,
          duration: 1.2,
          yoyo: true,
          repeat: -1,
          ease: "power2.inOut"
        });
      } else if (shuffleMode === 'dumb') {
        // Standard shuffle: steady active color
        gsap.to(buttonRef.current, {
          scale: 1,
          duration: 0.3,
          ease: "back.out(1.7)"
        });
        gsap.to(glowRef.current, {
          opacity: 0.3,
          scale: 1.1,
          duration: 0.3
        });
      } else {
        // Off state: clear animations
        gsap.to(buttonRef.current, {
          scale: 1,
          color: "currentColor",
          duration: 0.3
        });
        gsap.to(glowRef.current, {
          opacity: 0,
          scale: 1,
          duration: 0.3
        });
      }
    });

    return () => ctx.revert();
  }, [shuffleMode]);

  return (
    <button
      ref={buttonRef}
      onClick={cycleShuffle}
      className={`relative p-2.5 rounded-full flex items-center justify-center transition-colors focus:outline-none ${
        shuffleMode === 'smart' 
          ? 'text-coral hover:text-coral/80' 
          : shuffleMode === 'dumb' 
            ? 'text-ink hover:text-ink/80' 
            : 'text-ink/40 hover:text-ink/70'
      } ${className}`}
      title={`Shuffle: ${shuffleMode}`}
      aria-label={`Cycle shuffle mode (current: ${shuffleMode})`}
    >
      {/* Background Glow Ring for AI Mode */}
      <span
        ref={glowRef}
        className="absolute inset-0 rounded-full bg-coral/10 border border-coral/30 pointer-events-none opacity-0"
      />
      
      {/* Dynamic Icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5 relative z-10"
      >
        {shuffleMode === 'smart' ? (
          <>
            {/* AI Smart Shuffle: Intertwined Sparkles and Arrows */}
            <path d="M4.5 8.5C6.5 8.5 7.5 15.5 10.5 15.5H19.5" />
            <path d="M4.5 15.5C6.5 15.5 7.5 8.5 10.5 8.5H19.5" />
            <polyline points="16.5 5.5 19.5 8.5 16.5 11.5" />
            <polyline points="16.5 12.5 19.5 15.5 16.5 18.5" />
            <circle cx="13" cy="8.5" r="1.5" className="fill-coral stroke-none" />
            <circle cx="11" cy="15.5" r="1.5" className="fill-coral stroke-none" />
          </>
        ) : (
          <>
            {/* Standard Arrows */}
            <path d="M16 3h5v5" />
            <path d="M4 20L21 3" />
            <path d="M21 16v5h-5" />
            <path d="M15 15l6 6" />
            <path d="M4 4l5 5" />
          </>
        )}
      </svg>

      {/* Mini state badge */}
      {shuffleMode === 'smart' && (
        <span className="absolute -top-1 -right-1 text-[8px] font-sans font-bold bg-coral text-paper px-1 rounded-sm leading-none py-0.5">
          AI
        </span>
      )}
    </button>
  );
};
