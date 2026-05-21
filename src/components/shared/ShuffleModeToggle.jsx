import React, { useRef, useEffect } from 'react';
import { gsap } from '../../lib/gsap';

const MODES = ['none', 'dumb', 'smart'];
const LABELS = { none: 'OFF', dumb: '⇆', smart: 'AI' };

/**
 * ShuffleModeToggle — sliding 3-segment pill.
 * OFF → SHUF → AI (covers both smart + smart-v2)
 * GSAP spring animates the blood-red/crimson indicator across segments.
 */
export const ShuffleModeToggle = ({ shuffleMode, shufflePending, onToggle, v2ShuffleEnabled }) => {
  const sliderRef = useRef(null);
  const containerRef = useRef(null);

  const displayMode = (shuffleMode === 'smart' || shuffleMode === 'smart-v2') ? 'smart' : shuffleMode;
  const activeIndex = Math.max(0, MODES.indexOf(displayMode));
  const isV2 = shuffleMode === 'smart-v2';

  useEffect(() => {
    const container = containerRef.current;
    const slider = sliderRef.current;
    if (!container || !slider) return;

    const segW = container.offsetWidth / 3;

    gsap.to(slider, {
      x: activeIndex * segW,
      duration: 0.35,
      ease: 'back.out(1.7)',
    });

    // OFF=dark void | SHUF=blood red | AI=crimson
    const fills   = ['#120000', '#8B0000', '#DC143C'];
    const shadows = ['none', '0 0 8px rgba(139,0,0,0.55)', '0 0 14px rgba(220,20,60,0.65)'];
    gsap.to(slider, { backgroundColor: fills[activeIndex], boxShadow: shadows[activeIndex], duration: 0.2 });
  }, [activeIndex]);

  return (
    <button
      ref={containerRef}
      onClick={onToggle}
      disabled={shufflePending}
      aria-label={`Shuffle: ${shuffleMode}`}
      title={
        shuffleMode === 'none'     ? 'Shuffle off — click to enable'
        : shuffleMode === 'dumb'   ? 'Standard shuffle — click for AI'
        : shuffleMode === 'smart'  ? 'AI Smart Shuffle active'
                                   : 'V2 Context AI active'
      }
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: 82,
        height: 24,
        background: '#0c0000',
        border: '1px solid rgba(220,20,60,0.22)',
        borderRadius: 9999,
        overflow: 'hidden',
        cursor: shufflePending ? 'not-allowed' : 'pointer',
        opacity: shufflePending ? 0.5 : 1,
        padding: 0,
        flexShrink: 0,
      }}
    >
      {/* Sliding indicator */}
      <div
        ref={sliderRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '33.33%',
          height: '100%',
          background: '#120000',
          borderRadius: 9999,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Segment labels */}
      {MODES.map((m, i) => (
        <span
          key={m}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 8,
            fontFamily: '"JetBrains Mono", monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: activeIndex === i ? '#ffffff' : 'rgba(255,255,255,0.22)',
            position: 'relative',
            zIndex: 1,
            lineHeight: 1,
            transition: 'color 0.2s',
            userSelect: 'none',
          }}
        >
          {m === 'smart' && isV2 ? 'V2' : LABELS[m]}
        </span>
      ))}
    </button>
  );
};
