import React, { useCallback, useEffect, useId, useMemo, useReducer, useRef, useState } from 'react'
import { ChevronUp } from 'lucide-react'
import { cn } from './cn'

// -------------------- Helpers / types removed for JSX --------------------

function useRafLoop(cb) {
  const cbRef = useRef(cb)
  cbRef.current = cb
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const loop = (now) => {
      const dt = now - last
      last = now
      cbRef.current(now, dt)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
}

function useTransitionSound() {
  const ctxRef = useRef(null)
  useEffect(() => {
    return () => {
      ctxRef.current?.close?.().catch(() => {})
      ctxRef.current = null
    }
  }, [])
  return useCallback((bassEnergy = 0.5) => {
    try {
      if (!ctxRef.current) {
        const Ctor = window.AudioContext || window.webkitAudioContext
        if (!Ctor) return
        ctxRef.current = new Ctor()
      }
      const ctx = ctxRef.current
      if (ctx.state === 'suspended') ctx.resume()
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const startFreq = 440 + bassEnergy * 440
      const endFreq = startFreq * (2 / 3)
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(startFreq, now)
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.09)
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.06, now + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.18)
    } catch {}
  }, [])
}

const FFT_SIZE = 256
const FALLBACK_TRACK = {
  title: 'No track selected',
  artist: '—',
  cover: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="%23e6dcc4"/><circle cx="200" cy="200" r="120" fill="%23d3c6a5"/><circle cx="200" cy="200" r="18" fill="%23b9aa87"/></svg>',
  src: ''
}

function normalizeTracks(tracks) {
  if (!Array.isArray(tracks) || tracks.length === 0) return [FALLBACK_TRACK]
  return tracks
}
function useAudioAnalyser(audioRef) {
  const ctxRef = useRef(null)
  const analyserRef = useRef(null)
  const dataRef = useRef(new Uint8Array(FFT_SIZE / 2))
  const connectedRef = useRef(false)

  const connect = useCallback(() => {
    const audio = audioRef.current
    if (!audio || connectedRef.current) return
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext
      if (!Ctor) return
      const ctx = new Ctor()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = FFT_SIZE
      analyser.smoothingTimeConstant = 0.8
      const source = ctx.createMediaElementSource(audio)
      source.connect(analyser)
      analyser.connect(ctx.destination)
      ctxRef.current = ctx
      analyserRef.current = analyser
      dataRef.current = new Uint8Array(analyser.frequencyBinCount)
      connectedRef.current = true
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    } catch {}
  }, [audioRef])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.addEventListener('play', connect, { once: true })
    return () => audio.removeEventListener('play', connect)
  }, [audioRef, connect])

  useEffect(() => {
    return () => {
      ctxRef.current?.close?.().catch(() => {})
      ctxRef.current = null
    }
  }, [])

  const getFrequencyData = useCallback(() => {
    const analyser = analyserRef.current
    if (!analyser) return null
    if (ctxRef.current?.state === 'suspended') ctxRef.current.resume().catch(() => {})
    analyser.getByteFrequencyData(dataRef.current)
    return dataRef.current
  }, [])

  const getBandEnergy = useCallback((startBin, endBin) => {
    if (!analyserRef.current) return 0
    const data = dataRef.current
    const count = endBin - startBin
    if (count <= 0) return 0
    let sum = 0
    for (let i = startBin; i < endBin && i < data.length; i++) sum += data[i]
    return sum / count / 255
  }, [])

  return { getFrequencyData, getBandEnergy }
}

// -------------------- Audio player reducer --------------------
const initialReducerState = (trackCount) => ({
  currentIndex: 0,
  order: Array.from({ length: trackCount }, (_, i) => i),
  shuffled: false,
  loopMode: 'off',
  isPlaying: false,
  direction: null,
})

function shuffleOrder(pinFirst, count) {
  const rest = Array.from({ length: count }, (_, i) => i).filter((x) => x !== pinFirst)
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[rest[i], rest[j]] = [rest[j], rest[i]]
  }
  return [pinFirst, ...rest]
}

function reducer(state, action) {
  switch (action.type) {
    case 'PLAY':
      return { ...state, isPlaying: true }
    case 'PAUSE':
      return { ...state, isPlaying: false }
    case 'SET_TRACK':
      return { ...state, currentIndex: action.index, direction: action.direction }
    case 'TOGGLE_SHUFFLE': {
      const shuffled = !state.shuffled
      const order = shuffled
        ? shuffleOrder(state.currentIndex, action.trackCount)
        : Array.from({ length: action.trackCount }, (_, i) => i)
      return { ...state, shuffled, order }
    }
    case 'CYCLE_LOOP': {
      const next = state.loopMode === 'off' ? 'all' : state.loopMode === 'all' ? 'one' : 'off'
      return { ...state, loopMode: next }
    }
    default:
      return state
  }
}

function useAudioPlayer(tracks) {
  const safeTracks = normalizeTracks(tracks)
  const audioRef = useRef(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const [state, dispatch] = useReducer(reducer, initialReducerState(safeTracks.length))

  const { getFrequencyData, getBandEnergy } = useAudioAnalyser(audioRef)
  const playTransitionSound = useTransitionSound()

  const loadTrack = useCallback((index, autoplay, direction) => {
    const audio = audioRef.current
    if (!audio) return
    const bassEnergy = getBandEnergy(0, 4)
    playTransitionSound(bassEnergy)
    dispatch({ type: 'SET_TRACK', index, direction })
    audio.src = safeTracks[index].src
    audio.load()
    if (autoplay) audio.play().catch(() => {})
  }, [safeTracks, playTransitionSound, getBandEnergy])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) audio.play().catch(() => {})
    else audio.pause()
  }, [])

  const next = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    const pos = state.order.indexOf(state.currentIndex)
    const np = pos + 1
    if (np >= state.order.length) {
      if (state.loopMode === 'all') loadTrack(state.order[0], !audio.paused, 'next')
      else {
        audio.pause()
        audio.currentTime = 0
      }
      return
    }
    loadTrack(state.order[np], !audio.paused, 'next')
  }, [state.order, state.currentIndex, state.loopMode, loadTrack])

  const prev = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }
    const pos = state.order.indexOf(state.currentIndex)
    const pp = pos - 1
    if (pp < 0) {
      if (state.loopMode === 'all') loadTrack(state.order[state.order.length - 1], !audio.paused, 'prev')
      else audio.currentTime = 0
      return
    }
    loadTrack(state.order[pp], !audio.paused, 'prev')
  }, [state.order, state.currentIndex, state.loopMode, loadTrack])

  const seek = useCallback((pct) => {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    audio.currentTime = pct * audio.duration
  }, [])

  const toggleShuffle = useCallback(() => {
    dispatch({ type: 'TOGGLE_SHUFFLE', trackCount: safeTracks.length })
  }, [safeTracks.length])

  const cycleLoop = useCallback(() => dispatch({ type: 'CYCLE_LOOP' }), [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onPlay = () => dispatch({ type: 'PLAY' })
    const onPause = () => dispatch({ type: 'PAUSE' })
    const onLoadedMetadata = () => setDuration(audio.duration)
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      if (audio.duration) setDuration(audio.duration)
    }
    const onEnded = () => {
      if (state.loopMode === 'one') {
        audio.currentTime = 0
        audio.play().catch(() => {})
      } else next()
    }
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('ended', onEnded)
    }
  }, [state.loopMode, next])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.src = safeTracks[0].src
    audio.load()
  }, [safeTracks])

  return {
    audioRef,
    state,
    currentTime,
    duration,
    currentTrack: safeTracks[state.currentIndex],
    toggle,
    next,
    prev,
    seek,
    toggleShuffle,
    cycleLoop,
    getFrequencyData,
  }
}

// -------------------- UI pieces --------------------
function fmt(s) {
  if (!isFinite(s)) return '0:00'
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

function ProgressBar({ currentTime, duration, onSeek }) {
  const pct = duration ? (currentTime / duration) * 100 : 0
  return (
    <>
      <div
        className="bar"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          onSeek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)))
        }}
      >
        <div className="bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="time">
        <span className="current">{fmt(currentTime)}</span>
        <span className="sep">/</span>
        <span className="total">{fmt(duration)}</span>
      </div>
    </>
  )
}

function Controls({ isPlaying, shuffled, loopMode, onToggle, onNext, onPrev, onShuffle, onLoop }) {
  return (
    <div className="controls">
      <button className={`ctrl ctrl-toggle ${shuffled ? 'is-active' : ''}`} onClick={onShuffle} aria-label="Shuffle">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 3h5v5" />
          <path d="M21 3l-7 7" />
          <path d="M3 21l7-7" />
          <path d="M16 21h5v-5" />
          <path d="M21 21l-7-7" />
          <path d="M3 3l7 7" />
        </svg>
      </button>
      <button className="ctrl" onClick={onPrev} aria-label="Previous">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M19 5L8 12l11 7zM5 5h2v14H5z" />
        </svg>
      </button>
      <button className="ctrl ctrl-play" onClick={onToggle} aria-label={isPlaying ? 'Pause' : 'Play'}>
        {isPlaying ? (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M6 5h3v14H6zM15 5h3v14h-3z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M7 5v14l11-7z" />
          </svg>
        )}
      </button>
      <button className="ctrl" onClick={onNext} aria-label="Next">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M5 5l11 7L5 19zM17 5h2v14h-2z" />
        </svg>
      </button>
      <button className={`ctrl ctrl-toggle ctrl-loop ${loopMode !== 'off' ? 'is-active' : ''} ${loopMode === 'one' ? 'mode-one' : ''}`} onClick={onLoop} aria-label="Loop">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12V8a2 2 0 0 1 2-2h12" />
          <path d="M16 3l4 3l-4 3" />
          <path d="M20 12v4a2 2 0 0 1-2 2H6" />
          <path d="M8 21l-4-3l4-3" />
        </svg>
        <span className="loop-one">1</span>
      </button>
    </div>
  )
}

// -------------------- Disc, ScalesMixer, TrackInfo simplified --------------------
// For brevity we include smaller versions of the original visual pieces with the same class names.

function ScalesMixer({ isPlaying, getFrequencyData }) {
  const maskId = useId().replace(/:/g, '_')
  const colRefs = useRef([])
  const circleRefs = useRef(Array.from({ length: 10 }, () => []))
  const tRef = useRef(50)

  useRafLoop((_, dt) => {
    if (isPlaying) tRef.current += dt / 1000
    const time = tRef.current
    const freqData = getFrequencyData?.()
    for (let c = 0; c < 10; c++) {
      const colEl = colRefs.current[c]
      if (colEl) colEl.style.transform = `translate(${c * 10}px, ${Math.sin(time + c) * 6}px)`
      for (let r = 0; r < 10; r++) {
        const circle = circleRefs.current[c][r]
        if (!circle) continue
        circle.style.transform = `translateY(${Math.sin(time + r * 0.1) * 6}px) scale(0.9)`
      }
    }
  })

  return (
    <svg className="scales" style={{ width: '32px', height: '32px', fill: 'currentColor', opacity: 0.5 }} viewBox="0 0 98 108" aria-hidden="true">
      <mask id={maskId}>
        <rect width="10" height="10" fill="#fff" />
      </mask>
      {Array.from({ length: 10 }, (_, c) => (
        <g
          key={c}
          ref={(el) => {
            colRefs.current[c] = el
          }}
          style={{ transform: `translate(${c * 10}px, 0px)` }}
        >
          {Array.from({ length: 10 }, (_, r) => (
            <g key={r} mask={`url(#${maskId})`} transform={`translate(0 ${r * 10})`}>
              <circle
                ref={(el) => {
                  circleRefs.current[c][r] = el
                }}
                cx="5"
                cy="5"
                r="5"
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              />
            </g>
          ))}
        </g>
      ))}
    </svg>
  )
}

function Disc({ layers, isPlaying, isZoomed, trackKey, direction, onZoomToggle, onExpand, showExpandHint }) {
  const spinRef = useRef(null)
  const rotRef = useRef(0)
  const velRef = useRef(0)
  const burstRef = useRef({ from: 0, start: 0, active: false, pending: false })
  const lastKey = useRef(trackKey)

  useEffect(() => {
    if (trackKey !== lastKey.current) {
      lastKey.current = trackKey
      if (direction) {
        burstRef.current.from = direction === 'prev' ? 360 : -360
        burstRef.current.pending = true
      }
    }
  }, [trackKey, direction])

  useRafLoop((now) => {
    const el = spinRef.current
    if (!el) return
    if (isPlaying) velRef.current += (0.4375 - velRef.current) * 0.2
    else {
      velRef.current *= 0.96
      if (velRef.current < 0.001) velRef.current = 0
    }
    if (isZoomed) {
      const target = Math.round(rotRef.current / 360) * 360
      const nx = rotRef.current + (target - rotRef.current) * 0.08
      rotRef.current = Math.abs(target - nx) < 0.1 ? target : nx
    } else {
      rotRef.current += velRef.current
    }
    const burst = burstRef.current
    if (burst.pending) {
      burst.start = now
      burst.pending = false
      burst.active = true
    }
    let b = 0
    if (burst.active) {
      const t = (now - burst.start) / 620
      if (t >= 1) burst.active = false
      else b = burst.from * (1 - (1 - Math.pow(1 - t, 3)))
    }
    el.style.transform = `scale(1.01) rotate(${rotRef.current + b}deg)`
  })

  const handleClick = (e) => {
    e.stopPropagation()
    if (onExpand) onExpand()
    else onZoomToggle()
  }

  return (
    <div className={`mask ${isZoomed ? 'is-zoomed' : ''}`} onClick={handleClick}>
      <div className="spin" ref={spinRef}>
        {layers.map((l, i) => {
          const isNewest = i === layers.length - 1
          const cls = isNewest ? (l.dir ? 'cover cover-enter' : 'cover') : 'cover cover-exit'
          return <img key={l.id} src={l.track.cover} alt={`${l.track.title} — ${l.track.artist}`} className={cls} draggable={false} />
        })}
      </div>
      {showExpandHint ? (
        <div className="expand-indicator" aria-hidden="true">
          <ChevronUp size={18} />
        </div>
      ) : null}
      <div className="hole"><div className="hole-inner" /></div>
    </div>
  )
}

function TrackInfo({ layers, onExpand }) {
  return (
    <div
      className={`track-info ${onExpand ? 'is-clickable' : ''}`}
      onClick={onExpand}
      role={onExpand ? 'button' : undefined}
      tabIndex={onExpand ? 0 : undefined}
      onKeyDown={(e) => {
        if (!onExpand) return
        if (e.key === 'Enter') onExpand()
      }}
    >
      {layers.map((l, i) => {
        const isNewest = i === layers.length - 1
        const dx = l.dir === 'next' ? 14 : l.dir === 'prev' ? -14 : 0
        const exitDx = -dx
        const state = isNewest ? (l.dir ? 'ti-enter' : '') : 'ti-exit'
        const style = { ['--dx']: `${isNewest ? dx : exitDx}px` }
        return (
          <div key={l.id} className={`ti-layer ${isNewest ? '' : 'ti-abs'}`}>
            <p className={`artist ${state}`} style={style}>{l.track.artist}</p>
            <h2 className={`track ${state}`} style={style}>{l.track.title}</h2>
          </div>
        )
      })}
    </div>
  )
}

export function MusicPlayer({ tracks, crossOrigin, playerOverride, onExpand }) {
  const safeTracks = useMemo(() => normalizeTracks(tracks), [tracks])
  const player = playerOverride || useAudioPlayer(safeTracks)
  const [isZoomed, setIsZoomed] = useState(false)

  const [layers, setLayers] = useState(() => [{ id: 0, track: safeTracks[0], dir: null }])
  const lastIndex = useRef(0)
  const idRef = useRef(1)

  useEffect(() => {
    if (player.state.currentIndex === lastIndex.current) return
    lastIndex.current = player.state.currentIndex
    const id = idRef.current++
    setLayers((prev) => [...prev, { id, track: player.currentTrack, dir: player.state.direction }])
    const t = setTimeout(() => {
      setLayers((prev) => prev.filter((l) => l.id === id))
    }, 760)
    return () => clearTimeout(t)
  }, [player.state.currentIndex, player.currentTrack, player.state.direction])

  const seekForward = useCallback(() => {
    if (player.seekBy) return player.seekBy(5)
    const a = player.audioRef?.current
    if (a) a.currentTime = Math.min(a.duration || 0, a.currentTime + 5)
  }, [player])
  const seekBackward = useCallback(() => {
    if (player.seekBy) return player.seekBy(-5)
    const a = player.audioRef?.current
    if (a) a.currentTime = Math.max(0, a.currentTime - 5)
  }, [player])

  const shortcuts = useMemo(() => ({ toggle: player.toggle, next: player.next, prev: player.prev, seekForward, seekBackward, toggleShuffle: player.toggleShuffle, cycleLoop: player.cycleLoop }), [player.toggle, player.next, player.prev, seekForward, seekBackward, player.toggleShuffle, player.cycleLoop])

  useEffect(() => {
    const handler = (e) => {
      if ((e.target).tagName === 'INPUT') return
      switch (e.key) {
        case ' ':
          e.preventDefault(); shortcuts.toggle(); break
        case 'ArrowRight': e.preventDefault(); if (e.shiftKey) shortcuts.next(); else shortcuts.seekForward(); break
        case 'ArrowLeft': e.preventDefault(); if (e.shiftKey) shortcuts.prev(); else shortcuts.seekBackward(); break
        case 's': case 'S': shortcuts.toggleShuffle(); break
        case 'l': case 'L': shortcuts.cycleLoop(); break
        default: break
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [shortcuts])

  return (
    <div className={`card ${player.state.isPlaying ? 'is-playing' : ''} ${isZoomed ? 'is-zoomed' : ''}`} onClick={(e) => { if (!(e.target).closest('.mask')) setIsZoomed(false) }}>
      {player.audioRef ? <audio ref={player.audioRef} preload="metadata" crossOrigin={crossOrigin} /> : null}
      <Disc
        layers={layers}
        isPlaying={player.state.isPlaying}
        isZoomed={isZoomed}
        trackKey={player.state.currentIndex}
        direction={player.state.direction}
        onZoomToggle={() => setIsZoomed((z) => !z)}
        onExpand={onExpand}
        showExpandHint={!!onExpand}
      />
      <div className="info">
        <ScalesMixer isPlaying={player.state.isPlaying} getFrequencyData={player.getFrequencyData} />
        <TrackInfo layers={layers} onExpand={onExpand} />
        <ProgressBar currentTime={player.currentTime} duration={player.duration} onSeek={player.seek} />
        <Controls isPlaying={player.state.isPlaying} shuffled={player.state.shuffled} loopMode={player.state.loopMode} onToggle={player.toggle} onNext={player.next} onPrev={player.prev} onShuffle={player.toggleShuffle} onLoop={player.cycleLoop} />
      </div>
    </div>
  )
}

export default MusicPlayer
