/**
 * ErrorBoundary.jsx
 * Standard React error boundary to catch and display UI errors safely.
 */

import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full w-full p-8 text-center">
          <h2 className="text-2xl font-serif font-bold text-coral mb-4">Something went wrong.</h2>
          <p className="text-ink-mute font-body max-w-md">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button 
            className="mt-6 px-4 py-2 bg-coral text-paper rounded-md font-sans hover:bg-coral-soft transition-colors"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
