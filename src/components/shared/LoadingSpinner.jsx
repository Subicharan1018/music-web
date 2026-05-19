/**
 * LoadingSpinner.jsx
 * A simple themed loading spinner component using Atelier Zero styling.
 */

import React from 'react';

export const LoadingSpinner = () => {
  return (
    <div className="flex justify-center items-center h-full w-full">
      <div className="w-8 h-8 border-4 border-coral/20 border-t-coral rounded-full animate-spin"></div>
    </div>
  );
};
