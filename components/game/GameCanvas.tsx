'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import {
  createInitialState,
  startRun,
  flipOrb,
  update,
  render,
  getOrbY,
  type EngineState,
} from '@/lib/game/engine'
import { calcComboMultiplier, formatScore } from '@/lib/game/scoring'
import type { GameMode, RunResult } from '@/lib/game/types'
import type { BiomeId } from '@/lib/game/biomes'
import { ORB_SKINS, MODE_CONFIG } from '@/lib/game/constants'
import type { SoundId } from '@/lib/audio/audioManager'
import { useAudioContext } from '@/components/audio/AudioProvider'
import { pauseShieldHum, resumeShieldHum, stopShieldHumForced } from '@/lib/audio/audioManager'

interface GameCanvasProps {
  mode: GameMode
  biomeId: BiomeId
  orbSkinId: string
  bestScore: number
  onRunEnd: (result: RunResult) => void
  onPause: () => void
  playSound?: (id: SoundId) => void
}

export default function GameCanvas({
  mode,
  biomeId,
  orbSkinId,
  bestScore,
  onRunEnd,
  onPause,
  playSound,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<EngineState | null>(null)
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const modeRef = useRef(mode)
  modeRef.current = mode
  const biomeRef = useRef(biomeId)
  biomeRef.current = biomeId
  const playSoundRef = useRef(playSound)
  playSoundRef.current = playSound

  const { muted, toggleMute, playBackgroundMusic, pauseBackgroundMusic, resumeBackgroundMusic, stopBackgroundMusic } = useAudioContext()

  // Audio state trackers — compare prev frame to fire sounds on transitions
  const prevComboRef = useRef(0)
  const prevPhaseRef = useRef(false)
  const prevShieldBreakingRef = useRef(false)
  const prevNearMissRef = useRef(0)
  const prevZoneRef = useRef(0)
  const prevPhaseCoresRef = useRef(0)

  const [displayScore, setDisplayScore] = useState(0)
  const [displayCombo, setDisplayCombo] = useState(0)
  const [gamePhase, setGamePhase] = useState<'idle' | 'playing' | 'dead'>('idle')
  const [comboMult, setComboMult] = useState(1)
  const [isNewBest, setIsNewBest] = useState(false)
  const [phaseActive, setPhaseActive] = useState(false)
  const [threadSightCharges, setThreadSightCharges] = useState(0)
  const [flowIntensity, setFlowIntensity] = useState(0)

  const applySkin = useCallback((s: EngineState) => {
    const skin = ORB_SKINS.find((sk) => sk.id === orbSkinId) ?? ORB_SKINS[0]
    s.orbColor = skin.color
    s.orbGlow = skin.glowColor
    s.orbTrail = skin.trailColor
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    s.orbRingStyle = (skin.ringStyle ?? 'clean_orbit') as any
  }, [orbSkinId])

  const initState = useCallback(() => {
    const s = createInitialState(mode, biomeRef.current)
    s.stats.bestScore = bestScore
    applySkin(s)
    stateRef.current = s
    setGamePhase('idle')
    setDisplayScore(0)
    setDisplayCombo(0)
    setComboMult(1)
    setIsNewBest(false)
    setPhaseActive(false)
    setFlowIntensity(0)
  }, [mode, bestScore, applySkin])

  const handleTap = useCallback(() => {
    const s = stateRef.current
    if (!s) return

    if (s.gameState === 'idle') {
      startRun(s, modeRef.current, biomeRef.current)
      s.stats.bestScore = bestScore
      applySkin(s)
      setGamePhase('playing')
      playSoundRef.current?.('tap')
      playBackgroundMusic('gameplay')
      return
    }

    if (s.gameState === 'playing') {
      flipOrb(s)
      playSoundRef.current?.('tap')
    }
  }, [bestScore, applySkin, playBackgroundMusic])

  const handleRestart = useCallback(() => {
    const s = stateRef.current
    if (!s) return
    // Stop any lingering shield hum from previous run
    stopShieldHumForced()
    startRun(s, modeRef.current, biomeRef.current)
    s.stats.bestScore = bestScore
    applySkin(s)
    setGamePhase('playing')
    setIsNewBest(false)
    setPhaseActive(false)
    setThreadSightCharges(0)
    setFlowIntensity(0)
    playBackgroundMusic('gameplay')
  }, [bestScore, applySkin, playBackgroundMusic])

  useEffect(() => {
    ;(window as unknown as Record<string, unknown>).__gravityRestart = handleRestart
    return () => {
      delete (window as unknown as Record<string, unknown>).__gravityRestart
    }
  }, [handleRestart])

  // Resume from pause
  useEffect(() => {
    ;(window as unknown as Record<string, unknown>).__gravityResume = () => {
      const s = stateRef.current
      if (s && s.gameState === 'paused') {
        s.gameState = 'playing'
        setGamePhase('playing')
        resumeBackgroundMusic()
        // Resume shield hum if shield is still active
        if (s.phaseActive) {
          resumeShieldHum()
        }
      }
    }
    return () => {
      delete (window as unknown as Record<string, unknown>).__gravityResume
    }
  }, [resumeBackgroundMusic])

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    const resize = () => {
      const container = canvas.parentElement
      if (!container) return
      const dpr = window.devicePixelRatio || 1
      const w = container.clientWidth
      const h = container.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener('resize', resize)

    initState()

    let lastDead = false

    const loop = (ts: number) => {
      const dt = Math.min((ts - lastTimeRef.current) / 1000, 0.05)
      lastTimeRef.current = ts

      const s = stateRef.current
      if (!s) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      const container = canvas.parentElement
      const w = container ? container.clientWidth : canvas.width / (window.devicePixelRatio || 1)
      const h = container ? container.clientHeight : canvas.height / (window.devicePixelRatio || 1)

      ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0)

      update(s, dt, modeRef.current)
      render(ctx, s, ts / 1000, w, h, window.devicePixelRatio || 1)

      if (s.gameState === 'playing') {
        setDisplayScore(Math.floor(s.stats.score))
        setDisplayCombo(s.stats.combo)
  setComboMult(calcComboMultiplier(s.stats.combo))
  setPhaseActive(s.phaseActive)
  setThreadSightCharges(s.threadSightCharges)
  setFlowIntensity(s.flowIntensity)

        // ── Audio event checks ──────────────────────────────────────────
        const sfx = playSoundRef.current
        if (sfx) {
          // Phase Core pickup
          if (s.stats.phaseCoresCollected > prevPhaseCoresRef.current) {
            sfx('phase_core_pickup')
          }
          // Shield activated / deactivated / broken
          if (s.phaseActive && !prevPhaseRef.current) {
            sfx('shield_hum_start')
          } else if (!s.phaseActive && prevPhaseRef.current && !s.shieldBreaking) {
            sfx('shield_hum_stop')
          }
          if (s.shieldBreaking && !prevShieldBreakingRef.current) {
            sfx('shield_break')
          }
          // Near miss
          if (s.stats.nearMisses > prevNearMissRef.current) {
            sfx('near_miss')
          }
          // Combo increase (every 3 combos above threshold)
          const prevC = prevComboRef.current
          const curC = s.stats.combo
          if (curC > prevC && curC >= 3 && curC % 3 === 0) {
            sfx('combo_increase')
          }
          // Zone milestone
          if (s.stats.zoneReached > prevZoneRef.current) {
            sfx('milestone')
          }
        }

        prevPhaseCoresRef.current = s.stats.phaseCoresCollected
        prevPhaseRef.current = s.phaseActive
        prevShieldBreakingRef.current = s.shieldBreaking
        prevNearMissRef.current = s.stats.nearMisses
        prevComboRef.current = s.stats.combo
        prevZoneRef.current = s.stats.zoneReached
      }

      if (s.gameState === 'dead' && !lastDead) {
        lastDead = true
        setGamePhase('dead')
        pauseBackgroundMusic()
        // Stop shield hum immediately on death
        stopShieldHumForced()
        playSoundRef.current?.('death')
        // Reset audio state trackers
        prevComboRef.current = 0
        prevPhaseRef.current = false
        prevShieldBreakingRef.current = false
        prevNearMissRef.current = 0
        prevZoneRef.current = 0
        prevPhaseCoresRef.current = 0
        const newBest = s.stats.score > bestScore
        setIsNewBest(newBest)

        setTimeout(() => {
          const result: RunResult = {
            score: Math.floor(s.stats.score),
            isNewBest: newBest,
            combo: s.stats.maxCombo,
            nearMisses: s.stats.nearMisses,
            distance: s.stats.distance,
            flips: s.stats.flips,
            zoneReached: s.stats.zoneReached,
            phaseCoresCollected: s.stats.phaseCoresCollected,
            mode: modeRef.current,
            biome: biomeRef.current,
            timestamp: Date.now(),
          }
          onRunEnd(result)
        }, 600)
      }

      if (s.gameState !== 'dead') lastDead = false

      rafRef.current = requestAnimationFrame(loop)
    }

    lastTimeRef.current = performance.now()
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      stopBackgroundMusic()
      // Ensure shield hum is stopped when exiting gameplay
      stopShieldHumForced()
    }
  }, [initState, onRunEnd, bestScore, playBackgroundMusic, pauseBackgroundMusic, resumeBackgroundMusic])

  // Get biome accent for HUD
  const activeBiomeAccent = stateRef.current?.biome.meta.accentCSS ?? '#22d3ee'

  return (
    <div
      className="relative w-full h-full overflow-hidden cursor-pointer select-none"
      onPointerDown={handleTap}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* HUD */}
      {gamePhase === 'playing' && (
        <>
          {/* Top bar: Score (left) + Mode (center) + Utilities (right) */}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between px-5 pt-5 pointer-events-none">
            {/* Score (left) */}
            <div className="flex flex-col">
              <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase">
                Score
              </span>
              <span
                className="text-3xl font-bold font-mono leading-none transition-all"
                style={{
                  color: '#fff',
                  textShadow: flowIntensity > 0.3 ? `0 0 20px ${activeBiomeAccent}, 0 0 40px ${activeBiomeAccent}40` : 'none',
                }}
              >
                {formatScore(displayScore)}
              </span>
              {bestScore > 0 && (
                <span className="text-[11px] font-mono mt-1" style={{ color: activeBiomeAccent }}>
                  {formatScore(bestScore)} best
                </span>
              )}
            </div>

            {/* Practice Mode Indicator */}
            {mode === 'practice' && (
              <div className="absolute top-5 left-1/2 -translate-x-1/2 pointer-events-none z-10">
                <div
                  className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase whitespace-nowrap"
                  style={{
                    color: '#4ade80',
                    background: 'rgba(74,222,128,0.12)',
                    border: '1px solid rgba(74,222,128,0.35)',
                    boxShadow: '0 0 12px rgba(74,222,128,0.15)',
                  }}
                >
                  Practice
                </div>
              </div>
            )}

            {/* Utility buttons (right) — volume + pause */}
            <div className="flex gap-2 pointer-events-auto">
              {/* Volume toggle */}
              <button
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                }}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  toggleMute()
                }}
                aria-label={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? (
                  /* Muted icon */
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                    <path d="M2 5H4.5L7 2.5V11.5L4.5 9H2V5Z" fill="white" opacity="0.4" />
                    <line x1="9" y1="5" x2="13" y2="9" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
                    <line x1="13" y1="5" x2="9" y2="9" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
                  </svg>
                ) : (
                  /* Unmuted icon */
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                    <path d="M2 5H4.5L7 2.5V11.5L4.5 9H2V5Z" fill="white" opacity="0.6" />
                    <path d="M9 4.5C10 5.2 10.5 6 10.5 7C10.5 8 10 8.8 9 9.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
                    <path d="M10.5 3C12 4 13 5.4 13 7C13 8.6 12 10 10.5 11" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
                  </svg>
                )}
              </button>

              {/* Pause button */}
              <button
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                }}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  const s = stateRef.current
                  if (s) {
                    s.gameState = 'paused'
                    // Pause shield hum if active
                    if (s.phaseActive) {
                      pauseShieldHum()
                    }
                  }
                  setGamePhase('idle')
                  pauseBackgroundMusic()
                  onPause()
                }}
                aria-label="Pause"
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <rect x="2" y="2" width="3" height="10" rx="0.5" fill="white" opacity="0.6" />
                  <rect x="9" y="2" width="3" height="10" rx="0.5" fill="white" opacity="0.6" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mode pill (center top) */}
          {gamePhase === 'playing' && (
            <div className="absolute top-5 left-1/2 -translate-x-1/2 pointer-events-none">
              <span
                className="text-[10px] font-mono font-bold tracking-widest px-2.5 py-1 rounded-full border"
                style={{
                  color: MODE_CONFIG[mode].color,
                  borderColor: `${MODE_CONFIG[mode].color}40`,
                  backgroundColor: `${MODE_CONFIG[mode].color}10`,
                }}
              >
                {MODE_CONFIG[mode].label}
              </span>
            </div>
          )}

          {/* Combo + Phase status (right side, lower) */}
          <div className="absolute top-20 right-5 flex flex-col items-end gap-1.5 pointer-events-none">
            {displayCombo >= 3 && (
              <div
                className="flex flex-col items-end px-2 py-1.5 rounded transition-all"
                style={{
                  background: `hsl(${45 + displayCombo * 3}, 90%, 65%)08`,
                  border: `1px solid hsl(${45 + displayCombo * 3}, 90%, 55%)70`,
                  backdropFilter: 'blur(2px)',
                  boxShadow: `0 0 8px hsl(${45 + displayCombo * 3}, 90%, 50%)30`,
                }}
              >
                <span
                  className="text-2xl font-bold font-mono leading-none"
                  style={{
                    color: `hsl(${45 + displayCombo * 3}, 100%, 70%)`,
                    textShadow: `0 0 10px hsl(${45 + displayCombo * 3}, 90%, 50%)`,
                  }}
                >
                  ×{comboMult.toFixed(1)}
                </span>
              </div>
            )}
            {/* Phase Core indicator */}
            {phaseActive && (
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded-full transition-all"
                style={{
                  background: `${activeBiomeAccent}15`,
                  border: `1px solid ${activeBiomeAccent}60`,
                  boxShadow: `0 0 8px ${activeBiomeAccent}40`,
                }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{
                    background: activeBiomeAccent,
                    boxShadow: `0 0 6px ${activeBiomeAccent}`,
                  }}
                />
                <span className="text-[9px] font-mono font-bold" style={{ color: activeBiomeAccent }}>
                  SHIELD
                </span>
              </div>
            )}
            {/* Thread Sight indicator — shows remaining charges as dots */}
            {threadSightCharges > 0 && (
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-full transition-all"
                style={{
                  background: 'rgba(165,243,252,0.08)',
                  border: '1px solid rgba(165,243,252,0.45)',
                  boxShadow: '0 0 8px rgba(165,243,252,0.25)',
                }}
              >
                <span className="text-[9px] font-mono font-bold" style={{ color: '#a5f3fc' }}>
                  SIGHT
                </span>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1 h-1 rounded-full"
                      style={{
                        background: i < threadSightCharges ? '#a5f3fc' : 'rgba(165,243,252,0.2)',
                        boxShadow: i < threadSightCharges ? '0 0 4px #a5f3fc' : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Idle / Start overlay */}
      {gamePhase === 'idle' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div
            className="flex flex-col items-center gap-6 p-8 rounded-3xl"
            style={{
              background: 'rgba(6,10,20,0.88)',
              border: `1px solid ${activeBiomeAccent}25`,
              backdropFilter: 'blur(20px)',
            }}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-mono tracking-[0.3em] uppercase" style={{ color: `${activeBiomeAccent}80` }}>
                {MODE_CONFIG[mode].label} MODE
              </span>
              <h1 className="text-4xl font-bold tracking-tight text-foreground">
                GRAVITY
              </h1>
              <h1 className="text-4xl font-bold tracking-tight font-mono -mt-2" style={{ color: activeBiomeAccent }}>
                THREAD
              </h1>
              <span className="text-xs font-mono mt-1" style={{ color: `${activeBiomeAccent}70` }}>
                {stateRef.current?.biome.meta.name ?? ''}
              </span>
            </div>

            <div
              className="px-8 py-3.5 rounded-2xl text-sm font-mono font-bold tracking-widest uppercase"
              style={{
                background: `${activeBiomeAccent}18`,
                border: `1px solid ${activeBiomeAccent}50`,
                color: activeBiomeAccent,
                boxShadow: `0 0 20px ${activeBiomeAccent}25`,
              }}
            >
              TAP TO FLIP
            </div>

            <p className="text-xs text-muted-foreground text-center max-w-[160px]">
              Stay on the thread. Avoid hazards. Beat your best.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
