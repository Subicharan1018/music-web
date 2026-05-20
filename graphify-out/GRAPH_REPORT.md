# Graph Report - .  (2026-05-20)

## Corpus Check
- Corpus is ~26,302 words - fits in a single context window. You may not need a graph.

## Summary
- 345 nodes · 694 edges · 44 communities (14 shown, 30 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_UI Layout & Core Hooks|UI Layout & Core Hooks]]
- [[_COMMUNITY_Library Content & Views|Library Content & Views]]
- [[_COMMUNITY_Subsonic Data Layer|Subsonic Data Layer]]
- [[_COMMUNITY_Audio Gain & Recommendations|Audio Gain & Recommendations]]
- [[_COMMUNITY_Auth & Error Handling|Auth & Error Handling]]
- [[_COMMUNITY_Playback Engine (Howler)|Playback Engine (Howler)]]
- [[_COMMUNITY_Legacy Music Player Widget|Legacy Music Player Widget]]
- [[_COMMUNITY_Interactive Modals & Overlays|Interactive Modals & Overlays]]
- [[_COMMUNITY_Reference Subsonic Class|Reference Subsonic Class]]
- [[_COMMUNITY_Lyric Synchronization|Lyric Synchronization]]
- [[_COMMUNITY_Smart Shuffle & BPM Logic|Smart Shuffle & BPM Logic]]
- [[_COMMUNITY_Zustand State Stores|Zustand State Stores]]
- [[_COMMUNITY_App Entry & Orchestration|App Entry & Orchestration]]
- [[_COMMUNITY_Runtime Environment & GSAP|Runtime Environment & GSAP]]
- [[_COMMUNITY_Listening Statistics|Listening Statistics]]
- [[_COMMUNITY_Lrc Formatting|Lrc Formatting]]
- [[_COMMUNITY_React Compiler|React Compiler]]
- [[_COMMUNITY_Color Utilities|Color Utilities]]
- [[_COMMUNITY_System Icons|System Icons]]
- [[_COMMUNITY_Bluesky Social|Bluesky Social]]
- [[_COMMUNITY_Discord Social|Discord Social]]
- [[_COMMUNITY_Documentation|Documentation]]
- [[_COMMUNITY_GitHub|GitHub]]
- [[_COMMUNITY_Social Assets|Social Assets]]
- [[_COMMUNITY_X Twitter|X Twitter]]
- [[_COMMUNITY_Hero Imagery|Hero Imagery]]
- [[_COMMUNITY_React Framework|React Framework]]
- [[_COMMUNITY_Vite Tooling|Vite Tooling]]
- [[_COMMUNITY_Client Factory|Client Factory]]
- [[_COMMUNITY_Header Component|Header Component]]
- [[_COMMUNITY_Skeleton Loading|Skeleton Loading]]
- [[_COMMUNITY_Toast Container|Toast Container]]
- [[_COMMUNITY_Notification Items|Notification Items]]
- [[_COMMUNITY_Class Utility|Class Utility]]
- [[_COMMUNITY_Music Player Interface|Music Player Interface]]
- [[_COMMUNITY_Audio Player Logic|Audio Player Logic]]
- [[_COMMUNITY_Favorites View|Favorites View]]
- [[_COMMUNITY_Shuffle API|Shuffle API]]
- [[_COMMUNITY_Settings Management|Settings Management]]
- [[_COMMUNITY_UI Preferences|UI Preferences]]
- [[_COMMUNITY_Playlist Management|Playlist Management]]

## God Nodes (most connected - your core abstractions)
1. `useSubsonic()` - 38 edges
2. `SubsonicClient` - 31 edges
3. `useUIStore` - 27 edges
4. `AudioEngine` - 20 edges
5. `useLibraryStore` - 19 edges
6. `usePlayerStore` - 17 edges
7. `Subsonic` - 16 edges
8. `useSettingsStore` - 15 edges
9. `usePlaylistStore` - 13 edges
10. `useSubsonic Hook` - 12 edges

## Surprising Connections (you probably didn't know these)
- `SubsonicClient` --semantically_similar_to--> `Subsonic (Legacy)`  [INFERRED] [semantically similar]
  src/api/subsonic.js → _aurial_reference/subsonic.js
- `ViteConfig` --conceptually_related_to--> `Main Entry`  [INFERRED]
  vite.config.js → src/main.jsx
- `PlayerBar` --calls--> `SubsonicClient`  [INFERRED]
  src/components/layout/PlayerBar.jsx → src/api/subsonic.js
- `QueuePanel` --calls--> `SubsonicClient`  [INFERRED]
  src/components/queue/QueuePanel.jsx → src/api/subsonic.js
- `SongRow` --calls--> `SubsonicClient`  [INFERRED]
  src/components/library/SongRow.jsx → src/api/subsonic.js

## Hyperedges (group relationships)
- **Layout Orchestration** — appshell_appshell, sidebar_sidebar, playerbar_playerbar, topbar_topbar, queuepanel_queuepanel [EXTRACTED 0.95]
- **Subsonic Interface** — subsonic_subsonicclient, endpoints_endpoints, subsonic_subsonic [INFERRED 0.90]
- **Playback Control Flow** — useplayaction_useplayaction, useplayer_useplayer, nowplayingoverlay_nowplayingoverlay, music_player_widget_musicplayer [INFERRED 0.95]
- **Playlist Management System** — createplaylistmodal_createplaylistmodal, addtoplaylistdialog_addtoplaylistdialog, playlistspage_playlistspage, playlistdetailpage_playlistdetailpage [INFERRED 0.90]
- **Library Navigation System** — librarypage_librarypage, artistspage_artistspage, artistdetailpage_artistdetailpage, albumdetailpage_albumdetailpage, searchpage_searchpage [INFERRED 0.85]
- **AI Smart Shuffle Subsystem** — playerstore_useplayerstore, shuffleservice_applyshufflealgorithm, scoringservice_calculatesongscore, affinitystore_useaffinitystore, weightedrandom_weightedrandomselect [EXTRACTED 0.95]
- **Audio Playback Lifecycle** — playerstore_useplayerstore, audioengine_audioengine, scrobbleservice_scrobbleservice, replaygainservice_replaygainservice [EXTRACTED 0.90]
- **Listening Habit Tracking Loop** — scrobbleservice_scrobbleservice, affinitystore_useaffinitystore, scoringservice_calculatesongscore [INFERRED 0.85]

## Communities (44 total, 30 thin omitted)

### Community 0 - "UI Layout & Core Hooks"
Cohesion: 0.12
Nodes (21): useLyrics(), usePlayer(), AppShell(), PlayerBar(), Sidebar(), SideRail(), NowPlayingOverlay(), PlaylistsPage() (+13 more)

### Community 1 - "Library Content & Views"
Cohesion: 0.16
Nodes (20): usePlayAction(), useSubsonic(), AlbumCard(), formatDuration(), SongRow(), BLOB_CONFIGS, FluidBackground(), AlbumDetailPage() (+12 more)

### Community 3 - "Audio Gain & Recommendations"
Cohesion: 0.1
Nodes (9): ReplayGainService, buildIndex(), mapRecommendationsToSongs(), ShuffleApiService, initialState, persistData, useAffinityStore, initialState (+1 more)

### Community 4 - "Auth & Error Handling"
Cohesion: 0.16
Nodes (12): ENDPOINTS, AuthException, createSubsonicClient(), NetworkException, ServerException, TopBar(), LoginPage(), SettingsPage() (+4 more)

### Community 6 - "Legacy Music Player Widget"
Cohesion: 0.16
Nodes (15): cn(), Disc(), FALLBACK_TRACK, fmt(), initialReducerState(), MusicPlayer(), normalizeTracks(), ProgressBar() (+7 more)

### Community 7 - "Interactive Modals & Overlays"
Cohesion: 0.14
Nodes (18): AddToPlaylistDialog, AlbumDetailPage, ArtistDetailPage, ArtistsPage, CreatePlaylistModal, FluidBackground, LibraryPage, LoginPage (+10 more)

### Community 9 - "Lyric Synchronization"
Cohesion: 0.26
Nodes (5): getCurrentLineIndex(), isLrcFormat(), parseLrc(), parsePlain(), LyricsService

### Community 10 - "Smart Shuffle & BPM Logic"
Cohesion: 0.18
Nodes (7): FALLBACK_TRACK, GENRE_BPM_MAP, calculateSongScore(), songWeight(), applyShuffleAlgorithm(), interleave(), weightedRandomSelect()

### Community 11 - "Zustand State Stores"
Cohesion: 0.18
Nodes (14): useAffinityStore, AlbumCard, AudioEngine, estimateBpmFromGenre, GENRE_BPM_MAP, useLibraryStore, LRU Caching Pattern, PaletteService (+6 more)

### Community 12 - "App Entry & Orchestration"
Cohesion: 0.22
Nodes (11): App, AppShell, ENDPOINTS, Main Entry, PlayerBar, QueuePanel, Sidebar, SongRow (+3 more)

### Community 13 - "Runtime Environment & GSAP"
Cohesion: 0.22
Nodes (3): ErrorBoundary, root, rootElement

## Knowledge Gaps
- **52 isolated node(s):** `rootElement`, `root`, `FALLBACK_TRACK`, `BLOB_CONFIGS`, `initialState` (+47 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SubsonicClient` connect `Subsonic Data Layer` to `Auth & Error Handling`?**
  _High betweenness centrality (0.118) - this node is a cross-community bridge._
- **Why does `AudioEngine` connect `Playback Engine (Howler)` to `Audio Gain & Recommendations`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `useSubsonic()` connect `Library Content & Views` to `UI Layout & Core Hooks`, `Lyric Synchronization`, `Auth & Error Handling`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **What connects `rootElement`, `root`, `FALLBACK_TRACK` to the rest of the system?**
  _52 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UI Layout & Core Hooks` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
- **Should `Subsonic Data Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
- **Should `Audio Gain & Recommendations` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._