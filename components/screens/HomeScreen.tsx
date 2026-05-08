'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { GameMode, PlayerProfile, DailyChallenge } from '@/lib/game/types'
import type { BiomeId } from '@/lib/game/biomes'
import { ALL_BIOMES, isBiomeLocked } from '@/lib/game/biomes'
import { MODE_CONFIG } from '@/lib/game/constants'
import { formatScore } from '@/lib/game/scoring'

interface HomeScreenProps {
  profile: PlayerProfile
  dailyChallenge: DailyChallenge
  onPlay: (mode: GameMode) => void
  onLeaderboard: () => void
  onAchievements: () => void
  onCosmetics: () => void
  onSettings: () => void
  onStats: () => void
  onBiomeSelect: (biomeId: BiomeId) => void
}

const modeItems: { mode: GameMode; icon: string }[] = [
  { mode: 'endless', icon: '∞' },
  { mode: 'daily', icon: '◈' },
  { mode: 'practice', icon: '◇' },
  { mode: 'hard', icon: '⟐' },
]

export default function HomeScreen({
  profile,
  dailyChallenge,
  onPlay,
  onLeaderboard,
  onAchievements,
  onCosmetics,
  onSettings,
  onStats,
  onBiomeSelect,
}: HomeScreenProps) {
  // Initialize with the SSR-safe default so server and client render identically,
  // then sync to the real persisted value (from localStorage via profile) after mount.
  const [selectedMode, setSelectedMode] = useState<GameMode>('endless')
  useEffect(() => {
    setSelectedMode(profile.selectedMode)
  }, [profile.selectedMode])
  const selectedBiome = profile.selectedBiome ?? 'cyber_rail'
  const [biomeOpen, setBiomeOpen] = useState(false)

  const activeBiome = ALL_BIOMES.find((b) => b.meta.id === selectedBiome) ?? ALL_BIOMES[0]

  // Mode descriptions for helper text
  const modeDescriptions: Record<GameMode, string> = {
    endless: 'Survive as long as possible',
    daily: "Take today's challenge",
    practice: 'Unlimited lives, no game over',
    hard: 'Max intensity',
  }

  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden">
      {/* Biome-tinted background glow */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-700"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${activeBiome.meta.accentAlpha.replace('0.12', '0.09')} 0%, transparent 60%)`,
        }}
      />

      {/* Animated thread decoration */}
      <div className="absolute top-0 left-0 right-0 h-[1px] overflow-hidden">
        <motion.div
          className="h-full w-full"
          style={{ background: `linear-gradient(90deg, transparent, ${activeBiome.meta.accentCSS}80, transparent)` }}
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <div className="relative z-10 flex flex-col h-full px-6 pb-4 overflow-y-auto">
        {/* ========== HEADER SECTION ========== */}

        {/* Row 1: Logo (left) + Settings (right) — balanced composition */}
        <motion.div
          className="flex items-center justify-between pt-9 pb-2 mb-1"
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <img
            src="/logo.png"
            alt="Gravity Thread"
            className="h-24 w-auto"
            style={{ filter: `drop-shadow(0 0 18px ${activeBiome.meta.accentAlpha})` }}
          />
          <button
            onClick={onSettings}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 shrink-0"
            style={{
              background: `${activeBiome.meta.accentCSS}10`,
              border: `1px solid ${activeBiome.meta.accentCSS}40`,
            }}
            aria-label="Settings"
          >
            <svg width="17" height="17" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="2.5" stroke="white" strokeWidth="1.5" opacity="0.7" />
              <path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
            </svg>
          </button>
        </motion.div>

        {/* Row 2: Stats — stronger and more intentional */}
        <motion.div
          className="flex items-center gap-3 pb-8 font-mono"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-baseline gap-1.5">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground opacity-50">Best</span>
            <span className="text-xl font-bold leading-none tracking-tight" style={{ color: activeBiome.meta.accentCSS }}>
              {formatScore(profile.allTimeHigh)}
            </span>
          </div>
          <div className="w-px h-5 opacity-25" style={{ background: activeBiome.meta.accentCSS }} />
          <div className="flex items-baseline gap-1.5">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground opacity-50">Runs</span>
            <span className="text-xl font-bold leading-none tracking-tight text-foreground">
              {profile.totalRuns}
            </span>
          </div>
        </motion.div>

        {/* ========== MAIN ACTION CLUSTER (Moved Lower) ========== */}

        {/* World Selector - Compact and Clean */}
        <motion.div
          className="mb-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          <div className="relative">
            <button
              onClick={() => setBiomeOpen(!biomeOpen)}
              className="w-full flex items-center justify-between text-sm px-3 py-2 rounded-lg transition-all"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${activeBiome.meta.accentCSS}15`,
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono">WORLD</span>
                <span className="font-bold text-sm" style={{ color: activeBiome.meta.accentCSS }}>
                  {activeBiome.meta.name}
                </span>
              </div>
              <motion.span animate={{ rotate: biomeOpen ? 180 : 0 }} className="text-xs opacity-50">
                ▼
              </motion.span>
            </button>

            {/* World Dropdown */}
            <AnimatePresence>
              {biomeOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scaleY: 0.95 }}
                  animate={{ opacity: 1, y: 0, scaleY: 1 }}
                  exit={{ opacity: 0, y: -6, scaleY: 0.95 }}
                  transition={{ duration: 0.12 }}
                  className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-20"
                  style={{ background: '#0a0f1a', border: `1px solid ${activeBiome.meta.accentCSS}20` }}
                >
                  <div className="py-1 max-h-56 overflow-y-auto">
                    {ALL_BIOMES.map((biome) => {
                      const locked = isBiomeLocked(biome.meta.id, profile.allTimeHigh)
                      const isActive = biome.meta.id === selectedBiome
                      return (
                        <button
                          key={biome.meta.id}
                          onClick={() => {
                            if (!locked) {
                              onBiomeSelect(biome.meta.id)
                              setBiomeOpen(false)
                            }
                          }}
                          disabled={locked}
                          className="w-full text-left px-3 py-2 text-xs font-mono transition-all flex items-center gap-2 hover:bg-white/5 disabled:opacity-50"
                        >
                          <span
                            className="text-sm shrink-0"
                            style={{ color: locked ? 'rgba(255,255,255,0.3)' : biome.meta.accentCSS }}
                          >
                            {locked ? '🔒' : biome.meta.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div
                              className="font-bold"
                              style={{ color: locked ? 'rgba(255,255,255,0.4)' : 'inherit' }}
                            >
                              {biome.meta.name}
                            </div>
                          </div>
                          {isActive && (
                            <div
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ background: biome.meta.accentCSS }}
                            />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Mode Selector - Unified Segmented Control */}
        <motion.div
          className="mb-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex gap-1">
            {modeItems.map(({ mode, icon }) => {
              const cfg = MODE_CONFIG[mode]
              const isSelected = selectedMode === mode
              return (
                <button
                  key={mode}
                  onClick={() => setSelectedMode(mode)}
                  className={`flex-1 py-2.5 rounded-lg transition-all active:scale-95 text-center font-bold font-mono ${
                    mode === 'practice' ? 'px-0.5' : 'px-1'
                  }`}
                  style={{
                    background: isSelected 
                      ? `${cfg.color}18` 
                      : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isSelected 
                      ? cfg.color 
                      : 'rgba(255,255,255,0.06)'}`,
                    color: isSelected ? cfg.color : 'rgba(255,255,255,0.35)',
                    fontWeight: isSelected ? 700 : 500,
                  }}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-base leading-none">{icon}</span>
                    <span 
                      className="uppercase leading-none"
                      style={{
                        fontSize: mode === 'practice' ? '7px' : '8px',
                        letterSpacing: mode === 'practice' ? '0.04em' : '0.08em',
                      }}
                    >
                      {cfg.label}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* Mode Helper Text */}
        <motion.div
          className="mb-4 px-3 py-2 rounded-lg text-center"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${MODE_CONFIG[selectedMode].color}15`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.16 }}
        >
          <p className="text-xs text-muted-foreground font-mono">
            {modeDescriptions[selectedMode]}
          </p>
        </motion.div>

        {/* Fixed-height supporting area — prevents layout shift */}
        <div className="h-[72px] mb-3">
          {/* Daily Challenge - Only if NOT selected mode */}
          {selectedMode !== 'daily' && (
            <motion.button
              onClick={() => onPlay('daily')}
              className="w-full h-full py-2 px-3 rounded-lg transition-all active:scale-95 text-left flex items-center justify-between gap-2"
              style={{
                background: dailyChallenge.completed 
                  ? 'rgba(74,222,128,0.05)' 
                  : 'rgba(167,139,250,0.06)',
                border: `1px solid ${dailyChallenge.completed 
                  ? 'rgba(74,222,128,0.15)' 
                  : 'rgba(167,139,250,0.18)'}`,
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div
                  className="w-5 h-5 rounded flex items-center justify-center text-xs shrink-0 font-bold"
                  style={{
                    background: dailyChallenge.completed 
                      ? 'rgba(74,222,128,0.12)' 
                      : 'rgba(167,139,250,0.12)',
                    color: dailyChallenge.completed ? '#4ade80' : '#a78bfa',
                  }}
                >
                  {dailyChallenge.completed ? '✓' : '◈'}
                </div>
                <div className="flex flex-col gap-0 flex-1 min-w-0">
                  <div
                    className="text-xs font-mono font-bold leading-tight"
                    style={{ color: dailyChallenge.completed ? '#4ade80' : '#a78bfa' }}
                  >
                    Daily
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {dailyChallenge.completed ? 'Reward ready' : 'Daily run ready'}
                  </div>
                </div>
              </div>
            </motion.button>
          )}
          {/* Neutral placeholder when Daily is selected */}
          {selectedMode === 'daily' && (
            <motion.div
              className="w-full h-full px-3 py-2 rounded-lg text-left flex items-center gap-2"
              style={{
                background: 'rgba(167,139,250,0.04)',
                border: '1px solid rgba(167,139,250,0.12)',
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div
                  className="w-5 h-5 rounded flex items-center justify-center text-xs shrink-0 font-bold"
                  style={{
                    background: 'rgba(167,139,250,0.12)',
                    color: '#a78bfa',
                  }}
                >
                  ◈
                </div>
                <div className="flex flex-col gap-0 flex-1 min-w-0">
                  <div
                    className="text-xs font-mono font-bold leading-tight"
                    style={{ color: '#a78bfa' }}
                  >
                    Daily Challenge
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Master today's run
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Big Play Button - Clear CTA */}
        <motion.button
          onClick={() => onPlay(selectedMode)}
          className="w-full py-4 rounded-lg font-mono font-bold text-base tracking-[0.15em] uppercase mb-5 transition-all active:scale-95"
          style={{
            background: activeBiome.meta.accentAlpha,
            border: `1.5px solid ${activeBiome.meta.borderCSS}`,
            color: activeBiome.meta.accentCSS,
            boxShadow: `0 0 32px ${activeBiome.meta.accentAlpha}, inset 0 1px 0 rgba(255,255,255,0.1)`,
          }}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          whileTap={{ scale: 0.95 }}
        >
          PLAY NOW
        </motion.button>

        {/* Slim info line — fills middle space with intent */}
        <motion.div
          className="mb-auto mt-1 px-3 py-2.5 rounded-lg flex items-center gap-2.5"
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: activeBiome.meta.accentCSS, boxShadow: `0 0 6px ${activeBiome.meta.accentCSS}` }}
          />
          <span className="text-xs font-mono text-muted-foreground">
            {profile.allTimeHigh > 0
              ? `Best in ${activeBiome.meta.name}: ${formatScore(profile.allTimeHigh)}`
              : dailyChallenge.completed
              ? 'Daily run complete — keep pushing'
              : 'Daily run ready — claim your reward'}
          </span>
        </motion.div>

        {/* ========== BOTTOM NAVIGATION ========== */}
        <motion.div
          className="grid grid-cols-4 gap-1.5 mt-6 pt-3 border-t border-white/5"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          {[
            { label: 'Home', icon: '◉', action: () => {}, key: 'home' },
            { label: 'Leaderboard', icon: '▲', action: onLeaderboard, key: 'leaderboard' },
            { label: 'Missions', icon: '◎', action: onAchievements, key: 'missions' },
            { label: 'Shop', icon: '✦', action: onCosmetics, key: 'cosmetics' },
          ].map(({ label, icon, action, key }) => (
            <button
              key={key}
              onClick={action}
              disabled={key === 'home'}
              className="py-3 px-2 rounded-lg flex flex-col items-center gap-1 transition-all active:scale-95 disabled:opacity-60"
              style={{
                background: key === 'home' 
                  ? `${activeBiome.meta.accentCSS}15` 
                  : 'rgba(255,255,255,0.02)',
                border: `1px solid ${key === 'home' 
                  ? `${activeBiome.meta.accentCSS}35` 
                  : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              <span
                className="text-base leading-none"
                style={{
                  color: key === 'home' 
                    ? activeBiome.meta.accentCSS 
                    : `${activeBiome.meta.accentCSS}50`,
                }}
              >
                {icon}
              </span>
              <span
                className="text-[8px] font-mono tracking-wide uppercase font-bold leading-none"
                style={{
                  color: key === 'home' 
                    ? activeBiome.meta.accentCSS 
                    : 'rgba(255,255,255,0.45)',
                }}
              >
                {label}
              </span>
            </button>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
