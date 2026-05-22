# Graph Report - aurial-mine  (2026-05-22)

## Corpus Check
- 84 files · ~39,924 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 555 nodes · 1116 edges · 57 communities (24 shown, 33 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bc586104`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

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
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_Test Content|Test Content]]
- [[_COMMUNITY_Vite Infrastructure|Vite Infrastructure]]
- [[_COMMUNITY_React Compiler|React Compiler]]
- [[_COMMUNITY_Color Utilities|Color Utilities]]
- [[_COMMUNITY_System Icons|System Icons]]
- [[_COMMUNITY_Discord Social|Discord Social]]
- [[_COMMUNITY_Documentation|Documentation]]
- [[_COMMUNITY_X Twitter|X Twitter]]
- [[_COMMUNITY_Hero Imagery|Hero Imagery]]
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
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]

## God Nodes (most connected - your core abstractions)
1. `useSubsonic()` - 48 edges
2. `SubsonicClient` - 36 edges
3. `useSettingsStore` - 34 edges
4. `useUIStore` - 29 edges
5. `AudioEngine` - 22 edges
6. `useLibraryStore` - 21 edges
7. `usePlayerStore` - 20 edges
8. `Subsonic` - 16 edges
9. `useAIShuffleStore` - 16 edges
10. `usePlayAction()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `SubsonicClient` --semantically_similar_to--> `Subsonic (Legacy)`  [INFERRED] [semantically similar]
  src/api/subsonic.js → _aurial_reference/subsonic.js
- `ViteConfig` --conceptually_related_to--> `Main Entry`  [INFERRED]
  vite.config.js → src/main.jsx
- `RouteSync()` --calls--> `useUIStore`  [EXTRACTED]
  src/App.jsx → src/store/uiStore.js
- `AuthGuard()` --calls--> `useSettingsStore`  [EXTRACTED]
  src/App.jsx → src/store/settingsStore.js
- `App()` --calls--> `useSettingsStore`  [EXTRACTED]
  src/App.jsx → src/store/settingsStore.js

## Hyperedges (group relationships)
- **Layout Orchestration** — appshell_appshell, sidebar_sidebar, playerbar_playerbar, topbar_topbar, queuepanel_queuepanel [EXTRACTED 0.95]
- **Subsonic Interface** — subsonic_subsonicclient, endpoints_endpoints, subsonic_subsonic [INFERRED 0.90]
- **Playback Control Flow** — useplayaction_useplayaction, useplayer_useplayer, nowplayingoverlay_nowplayingoverlay, music_player_widget_musicplayer [INFERRED 0.95]
- **Playlist Management System** — createplaylistmodal_createplaylistmodal, addtoplaylistdialog_addtoplaylistdialog, playlistspage_playlistspage, playlistdetailpage_playlistdetailpage [INFERRED 0.90]
- **Library Navigation System** — librarypage_librarypage, artistspage_artistspage, artistdetailpage_artistdetailpage, albumdetailpage_albumdetailpage, searchpage_searchpage [INFERRED 0.85]
- **AI Smart Shuffle Subsystem** — playerstore_useplayerstore, shuffleservice_applyshufflealgorithm, scoringservice_calculatesongscore, affinitystore_useaffinitystore, weightedrandom_weightedrandomselect [EXTRACTED 0.95]
- **Audio Playback Lifecycle** — playerstore_useplayerstore, audioengine_audioengine, scrobbleservice_scrobbleservice, replaygainservice_replaygainservice [EXTRACTED 0.90]
- **Listening Habit Tracking Loop** — scrobbleservice_scrobbleservice, affinitystore_useaffinitystore, scoringservice_calculatesongscore [INFERRED 0.85]

## Communities (57 total, 33 thin omitted)

### Community 0 - "UI Layout & Core Hooks"
Cohesion: 0.08
Nodes (38): useLyrics(), usePlayer(), useServerHealth(), useShuffleQueue(), AppShell(), fmt(), PlayerBar(), Sidebar() (+30 more)

### Community 1 - "Library Content & Views"
Cohesion: 0.07
Nodes (27): ENDPOINTS, AuthException, createSubsonicClient(), NetworkException, ServerException, SplashScreen(), authCookies, COOKIE_OPTIONS (+19 more)

### Community 2 - "Subsonic Data Layer"
Cohesion: 0.16
Nodes (21): useGSAPScrollReveal(), usePlayAction(), useSubsonic(), AlbumCard(), formatDuration(), SongRow(), BLOB_CONFIGS, FluidBackground() (+13 more)

### Community 3 - "Audio Gain & Recommendations"
Cohesion: 0.07
Nodes (16): buildIndex(), isValidUrl(), mapRecommendationsToSongs(), ShuffleApiService, ShuffleEmptyResponse, ShuffleNetworkError, ShuffleServerError, DEFAULT_STATE (+8 more)

### Community 5 - "Playback Engine (Howler)"
Cohesion: 0.09
Nodes (18): _closeEvent(), dispose(), _enqueue(), _eventQueue, _flush(), _flushOnUnload(), _lastActivity, onSongEnded() (+10 more)

### Community 6 - "Legacy Music Player Widget"
Cohesion: 0.1
Nodes (19): AIModelStatus(), ComposerLoyaltyStats(), DailyListeningChart, formatMs(), formatMsLabel(), PERIODS, ServerListeningHistory(), ServerListeningStats() (+11 more)

### Community 7 - "Interactive Modals & Overlays"
Cohesion: 0.14
Nodes (17): Badge(), badgeVariants, cn(), Disc(), FALLBACK_TRACK, fmt(), initialReducerState(), MusicPlayer() (+9 more)

### Community 9 - "Lyric Synchronization"
Cohesion: 0.13
Nodes (8): FALLBACK_TRACK, GENRE_BPM_MAP, RecommendationService, calculateSongScore(), songWeight(), applyShuffleAlgorithm(), interleave(), weightedRandomSelect()

### Community 11 - "Zustand State Stores"
Cohesion: 0.14
Nodes (18): AddToPlaylistDialog, AlbumDetailPage, ArtistDetailPage, ArtistsPage, CreatePlaylistModal, FluidBackground, LibraryPage, LoginPage (+10 more)

### Community 13 - "Runtime Environment & GSAP"
Cohesion: 0.26
Nodes (5): getCurrentLineIndex(), isLrcFormat(), parseLrc(), parsePlain(), LyricsService

### Community 14 - "Listening Statistics"
Cohesion: 0.18
Nodes (14): useAffinityStore, AlbumCard, AudioEngine, estimateBpmFromGenre, GENRE_BPM_MAP, useLibraryStore, LRU Caching Pattern, PaletteService (+6 more)

### Community 15 - "Lrc Formatting"
Cohesion: 0.18
Nodes (7): ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartTooltipContent, THEMES

### Community 16 - "ESLint Config"
Cohesion: 0.22
Nodes (11): App, AppShell, ENDPOINTS, Main Entry, PlayerBar, QueuePanel, Sidebar, SongRow (+3 more)

### Community 18 - "Vite Infrastructure"
Cohesion: 0.22
Nodes (5): ChartContainer, ChartContext, ChartLegendContent, ChartTooltipContent, THEMES

### Community 19 - "React Compiler"
Cohesion: 0.22
Nodes (5): ChartContainer, ChartContext, ChartLegendContent, ChartTooltipContent, THEMES

### Community 20 - "Color Utilities"
Cohesion: 0.36
Nodes (5): formatDuration(), PlaylistMusicPortfolio(), PlaylistRow(), formatDuration(), PlaylistRow()

### Community 21 - "System Icons"
Cohesion: 0.29
Nodes (6): Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle

### Community 24 - "Documentation"
Cohesion: 0.5
Nodes (3): Expanding the ESLint configuration, React Compiler, React + Vite

## Knowledge Gaps
- **106 isolated node(s):** `THEMES`, `ChartConfig`, `ChartContextProps`, `ChartContext`, `ChartContainer` (+101 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SubsonicClient` connect `Auth & Error Handling` to `Library Content & Views`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Why does `useSettingsStore` connect `UI Layout & Core Hooks` to `Library Content & Views`, `Subsonic Data Layer`, `Audio Gain & Recommendations`, `Playback Engine (Howler)`, `Legacy Music Player Widget`, `Smart Shuffle & BPM Logic`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `AudioEngine` connect `Reference Subsonic Class` to `Smart Shuffle & BPM Logic`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **What connects `THEMES`, `ChartConfig`, `ChartContextProps` to the rest of the system?**
  _106 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UI Layout & Core Hooks` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Library Content & Views` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Audio Gain & Recommendations` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._