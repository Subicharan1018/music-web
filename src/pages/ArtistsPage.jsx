/**
 * ArtistsPage.jsx
 * Displays a list of all artists in the library.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubsonic } from '../hooks/useSubsonic';
import { useLibraryStore } from '../store/libraryStore';

export const ArtistsPage = () => {
  const client = useSubsonic();
  const { artists, isLoading, fetchArtists } = useLibraryStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!client) return;
    if (artists.length === 0 && !isLoading) {
      fetchArtists(client);
    }
  }, [client, artists.length, isLoading, fetchArtists]);

  return (
    <div className="p-8 pb-32 max-w-6xl mx-auto h-full overflow-y-auto no-scrollbar">
      <div className="flex flex-col gap-4 mb-12">
        <div className="flex justify-between items-end border-b border-ink/10 pb-2 mb-6">
          <div className="font-sans text-[13px] font-medium text-ink-mute uppercase tracking-widest">
            All Artists
          </div>
        </div>

        {isLoading && artists.length === 0 ? (
          <div className="flex flex-col gap-4 animate-pulse">
             {[1, 2, 3, 4, 5].map(i => (
               <div key={i} className="h-12 bg-ink/5 rounded w-full md:w-1/2" />
             ))}
          </div>
        ) : artists.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {artists.flatMap(index => index.artist).map((artist) => (
              <div 
                key={artist.id}
                onClick={() => navigate(`/artist/${artist.id}`)}
                className="py-4 px-4 bg-paper-warm hover:bg-ink/5 border border-ink/5 hover:border-ink/10 cursor-pointer rounded-md transition-colors"
              >
                <div className="font-sans text-lg text-ink font-medium truncate">{artist.name}</div>
                {artist.albumCount !== undefined && (
                  <div className="font-mono text-xs text-ink-faint mt-1">
                    {artist.albumCount} {artist.albumCount === 1 ? 'Album' : 'Albums'}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center mt-20 font-serif italic text-ink-mute">
            No artists found.
          </div>
        )}
      </div>
    </div>
  );
};
