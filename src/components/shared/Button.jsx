/**
 * Button.jsx
 * Reusable button component in primary and ghost variants.
 */

import React from 'react';

export const Button = ({ variant = 'primary', onClick, href, children, className = '', type = 'button', disabled = false }) => {
  const baseClasses = "inline-flex items-center justify-center font-sans text-sm px-5 py-2.5 rounded-full transition-colors duration-[160ms] ease-in-out cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-ink text-paper font-semibold hover:bg-coral",
    ghost: "border border-ink/30 text-ink font-medium hover:border-coral hover:text-coral"
  };

  const classes = `${baseClasses} ${variants[variant]} ${className}`;

  if (href) {
    return (
      <a href={href} className={classes} onClick={onClick}>
        {children}
      </a>
    );
  }

  return (
    <button type={type} className={classes} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
};
