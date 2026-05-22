/**
 * usePlayAction.js
 * Encapsulates playback logic to ensure setQueue is only called here.
 */

import { usePlayerStore } from '../../store/playerStore';

export const usePlayAction = () => {
  const setQueue = usePlayerStore(state => state.setQueue);
  const play = usePlayerStore(state => state.play);

  const playSong = (song, contextSongs = []) => {
    const queue = contextSongs.length > 0 ? contextSongs : [song];
    setQueue(queue);
    play(song);
  };

  const playAlbum = (album, songs, startIndex = 0) => {
    if (!songs || songs.length === 0) return;
    setQueue(songs);
    play(songs[startIndex]);
  };

  const playArtist = (artist, albums) => {
    if (!albums || albums.length === 0) return;
    // Flatten all songs from all albums
    const allSongs = albums.flatMap(a => a.song || []);
    if (allSongs.length === 0) return;
    
    setQueue(allSongs);
    // If shuffle mode is enabled, it should be applied when playing,
    // but the store play action handles basic playback right now.
    play(allSongs[0]);
  };

  return { playSong, playAlbum, playArtist };
};