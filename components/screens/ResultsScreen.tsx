'use client'

import { motion } from 'framer-motion'
import type { RunResult, DailyChallenge } from '@/lib/game/types'
import { formatScore } from '@/lib/game/scoring'
import { MODE_CONFIG } from '@/lib/game/constants'
import { getBiome } from '@/lib/game/biomes'

interface ResultsScreenProps {
  result: RunResult
  allTimeHigh: number
  dailyChallenge: DailyChallenge
  onReplay: () => void
  onHome: () => void
  onLeaderboard: () => void
}

const ZONE_NAMES = ['Neon Void', 'Energy Grid', 'Plasma Storm', 'Hypercore']

export default function ResultsScreen({
  result,
  allTimeHigh,
  dailyChallenge,
  onReplay,
  onHome,
  onLeaderboard,
}: ResultsScreenProps) {
  const modeConfig = MODE_CONFIG[result.mode]
  const biome = getBiome(result.biome ?? 'cyber_rail')
  const accent = biome.meta.accentCSS
  const accentAlpha = biome.meta.accentAlpha
  const border = biome.meta.borderCSS
  const zoneName = ZONE_NAMES[Math.min(result.zoneReached ?? 0, 3)]
  const isPractice = result.mode === 'practice'

  const stats = [
    { label: 'Best Combo', value: `x${result.combo}` },
    { label: 'Near Misses', value: result.nearMisses.toLocaleString() },
    { label: 'Distance', value: `${result.distance}m` },
    { label: 'Phase Cores', value: result.phaseCoresCollected?.toLocaleString() ?? '0' },
    { label: 'Flips', value: result.flips.toLocaleString() },
    { label: 'Zone Reached', value: zoneName },
  ]

  // Count mission progress
  const completedMissions = dailyChallenge.missions?.filter((m) => m.completed).length ?? 0
  const totalMissions = dailyChallenge.missions?.length ?? 0

  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden">
      {/* Biome-tinted background */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center 30%, ${accentAlpha.replace('0.12', '0.07')} 0%, transparent 65%)`,
        }}
      />

      <div className="relative z-10 flex flex-col h-full px-5 pb-6 overflow-y-auto">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between pt-5 pb-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <button
            onClick={onHome}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8L10 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            {/* Biome badge */}
            <span
              className="text-[10px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded-full"
              style={{ color: accent, background: accentAlpha, border: `1px solid ${border}` }}
            >
              {biome.meta.name}
            </span>
            {/* Mode badge */}
            <span
              className="text-[10px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded-full"
              style={{
                color: modeConfig.color,
                background: `${modeConfig.color}12`,
                border: `1px solid ${modeConfig.color}30`,
              }}
            >
              {modeConfig.label}
            </span>
            {/* Practice Mode Indicator */}
            {isPractice && (
              <span
                className="text-[10px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded-full"
                style={{
                  color: '#a78bfa',
                  background: 'rgba(167,139,250,0.15)',
                  border: '1px solid rgba(167,139,250,0.35)',
                }}
              >
                NON-RANKED
              </span>
            )}
          </div>

          <button
            onClick={onLeaderboard}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="9" width="3" height="5" rx="1" fill="white" opacity="0.5" />
              <rect x="6.5" y="6" width="3" height="8" rx="1" fill="white" opacity="0.6" />
              <rect x="11" y="3" width="3" height="11" rx="1" fill="white" opacity="0.7" />
            </svg>
          </button>
        </motion.div>

        {/* Main score card */}
        <motion.div
          className="flex flex-col items-center gap-2 py-5"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        >
          {result.isNewBest && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full mb-1"
              style={{ background: accentAlpha, border: `1px solid ${border}`, boxShadow: `0 0 20px ${accentAlpha}` }}
            >
              <span className="text-xs font-mono font-bold tracking-widest uppercase" style={{ color: accent }}>
                NEW BEST
              </span>
              <span className="text-xs" style={{ color: accent }}>★</span>
            </motion.div>
          )}

          <div className="text-xs font-mono tracking-[0.25em] uppercase text-muted-foreground">
            {isPractice ? 'Training Session' : result.isNewBest ? 'Personal Record' : 'Run Complete'}
          </div>

          <motion.div
            className="text-6xl font-bold font-mono leading-none"
            style={{
              color: isPractice ? '#4ade80' : result.isNewBest ? accent : '#ffffff',
              textShadow: isPractice
                ? `0 0 20px #4ade8099, 0 0 60px #4ade8044`
                : result.isNewBest
                ? `0 0 20px ${accent}cc, 0 0 60px ${accent}44`
                : '0 0 10px rgba(255,255,255,0.3)',
            }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 150 }}
          >
            {formatScore(result.score)}
          </motion.div>

          {!result.isNewBest && !isPractice && allTimeHigh > 0 && (
            <div className="text-xs font-mono text-muted-foreground">
              Best: {formatScore(allTimeHigh)}
            </div>
          )}

          {/* Zone reached callout */}
          <div
            className="flex items-center gap-2 px-3 py-1 rounded-full mt-1"
            style={{ background: accentAlpha, border: `1px solid ${border}` }}
          >
            <span className="text-[10px] font-mono text-muted-foreground">ZONE</span>
            <span className="text-xs font-mono font-bold" style={{ color: accent }}>
              {zoneName}
            </span>
          </div>
        </motion.div>

        {/* Stats grid */}
        <motion.div
          className="grid grid-cols-2 gap-2.5 mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="rounded-2xl p-3.5 flex flex-col gap-1"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 + i * 0.05 }}
            >
              <span className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase">
                {stat.label}
              </span>
              <span className="text-lg font-bold font-mono text-foreground">
                {stat.value}
              </span>
            </motion.div>
          ))}
        </motion.div>

        {/* Daily missions progress */}
        {totalMissions > 0 && (
          <motion.div
            className="rounded-2xl p-4 mb-4"
            style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.18)' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold tracking-widest uppercase text-purple-300">
                Daily Missions
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                {completedMissions}/{totalMissions}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {dailyChallenge.missions?.map((m) => (
                <div key={m.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full border flex items-center justify-center shrink-0"
                      style={{
                        borderColor: m.completed ? '#4ade80' : 'rgba(167,139,250,0.4)',
                        background: m.completed ? 'rgba(74,222,128,0.2)' : 'transparent',
                      }}
                    >
                      {m.completed && (
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      )}
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">{m.label}</span>
                  </div>
                  {!m.completed && (
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {m.progress}/{m.target}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* CTA Row */}
        <motion.div
          className="flex flex-col gap-3 mt-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <button
            onClick={onReplay}
            className="w-full py-4 rounded-2xl font-mono font-bold text-base tracking-widest uppercase transition-all active:scale-95"
            style={{
              background: accentAlpha,
              border: `1px solid ${border}`,
              color: accent,
              boxShadow: `0 0 30px ${accentAlpha}`,
            }}
          >
            ONE MORE RUN
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onHome}
              className="py-3.5 rounded-2xl font-mono font-bold text-sm tracking-wider uppercase transition-all active:scale-95 text-foreground/70"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              HOME
            </button>
            <button
              onClick={onLeaderboard}
              className="py-3.5 rounded-2xl font-mono font-bold text-sm tracking-wider uppercase transition-all active:scale-95"
              style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)', color: '#a78bfa' }}
            >
              RANKS
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
