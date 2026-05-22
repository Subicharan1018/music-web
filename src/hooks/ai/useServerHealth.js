/**
 * useServerHealth.js
 * Reads AI shuffle server health from aiShuffleStore.
 * Start/stop polling is managed in AppShell.
 */

import { useAIShuffleStore } from '../../store/aiShuffleStore';

export const useServerHealth = () => {
  const health      = useAIShuffleStore((s) => s.health);
  const isHealthy   = useAIShuffleStore((s) => s.isHealthy);
  const isConfigured = useAIShuffleStore((s) => s.isConfigured);

  return { health, isHealthy, isConfigured };
};
