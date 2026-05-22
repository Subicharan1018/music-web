/**
 * useKeyboardShortcuts.js
 * Global keyboard shortcuts for playback control and navigation.
 */
import { useEffect } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { useNavigate } from 'react-router-dom';

export const useKeyboardShortcuts = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input, textarea, or contenteditable
      const target = e.target;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // We only handle single key presses without modifiers
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const player = usePlayerStore.getState();

      switch (e.key.toLowerCase()) {
        case ' ':
          // Prevent default scrolling down
          e.preventDefault();
          player.togglePlayPause();
          break;
        case '/':
          e.preventDefault();
          navigate('/search');
          // Wait for DOM to render the search page
          setTimeout(() => {
            const searchInput = document.querySelector('[data-search-input]');
            if (searchInput) searchInput.focus();
          }, 100);
          break;
        case 'n':
          player.next(false);
          break;
        case 'p':
          player.prev();
          break;
        case 's':
          player.cycleShuffleMode();
          break;
        case 'r':
          player.cycleRepeatMode();
          break;
        case 'm':
          player.toggleMute();
          break;
        case 'arrowright':
          e.preventDefault();
          if (e.shiftKey) player.seekRelative(10);
          else player.seekRelative(5);
          break;
        case 'arrowleft':
          e.preventDefault();
          if (e.shiftKey) player.seekRelative(-10);
          else player.seekRelative(-5);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);
};
