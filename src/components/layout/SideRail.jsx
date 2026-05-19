/**
 * SideRail.jsx
 * Fixed vertical rails on left and right edges with rotated text.
 */

import React from 'react';

export const SideRail = ({ side, label }) => {
  const isLeft = side === 'left';
  
  return (
    <div 
      className={`fixed top-0 bottom-0 w-9 z-30 pointer-events-none flex items-center justify-center ${
        isLeft ? 'left-0 border-r border-ink/5' : 'right-0 border-l border-ink/5'
      }`}
    >
      <span 
        className={`font-sans text-[10px] font-semibold tracking-[0.42em] uppercase text-ink-faint [writing-mode:vertical-rl] ${
          isLeft ? 'rotate-180' : ''
        }`}
      >
        {label}
      </span>
    </div>
  );
};
