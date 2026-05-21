/**
 * useShuffleQueue.js
 * Exposes AI shuffle queue state from aiShuffleStore.
 * hasColdStart drives the "AI · DISCOVERY" label in NowPlayingOverlay.
 */

import { useAIShuffleStore } from '../store/aiShuffleStore';

export const useShuffleQueue = () => {
  const queue         = useAIShuffleStore((s) => s.recommendedQueue);
  const isLoading     = useAIShuffleStore((s) => s.isLoadingQueue);
  const error         = useAIShuffleStore((s) => s.queueError);
  const source        = useAIShuffleStore((s) => s.queueSource);
  const fetchNext     = useAIShuffleStore((s) => s.fetchNext);
  const clearQueue    = useAIShuffleStore((s) => (set) => set({ recommendedQueue: [], queueSource: '' }));

  const hasColdStart  = queue.some((r) => r.coldStart === true);

  return { queue, isLoading, error, source, hasColdStart, fetchNext, clearQueue };
};
