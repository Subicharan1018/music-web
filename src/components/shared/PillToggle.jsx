/**
 * PillToggle.jsx
 * Reusable toggle group for settings selections (e.g. Theme, Cache Provider).
 */

import React from 'react';
export const PillToggle = ({ options = [], value, onChange, disabled = false }) => {
  return (
    <div 
      className={`inline-flex p-1 bg-ink/5 rounded-full border border-ink/5 transition-opacity ${disabled ? "opacity-50 pointer-events-none" : ""}`}
    >
      {options.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            disabled={disabled}
            className={`px-4 py-1.5 rounded-full font-sans text-xs font-medium transition-all duration-200 ${
              isSelected
                ? "bg-paper text-ink shadow-sm"
                : "text-ink-mute hover:text-ink hover:bg-ink/5"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};
