/**
 * LoadingSpinner.jsx — crimson themed spinner.
 */

import React from 'react';

export const LoadingSpinner = () => {
  return (
    <div className="flex justify-center items-center h-full w-full">
      <div
        className="w-7 h-7 rounded-full border-2 animate-spin"
        style={{ borderColor: 'rgba(220,20,60,0.15)', borderTopColor: '#dc143c' }}
      />
    </div>
  );
};
