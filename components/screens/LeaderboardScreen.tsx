'use client'

import { motion } from 'framer-motion'
import { formatScore } from '@/lib/game/scoring'
import type { RunResult } from '@/lib/game/types'

interface LeaderboardScreenProps {
  recentRuns: RunResult[]
  allTimeHigh: number
  onBack: () => void
}

// Generate mock global leaderboard entries
function getMockLeaderboard(playerBest: number) {
  const entries = [
    { rank: 1, name: 'VOID_WALKER', score: 8847, isPlayer: false },
    { rank: 2, name: 'NEON_GHOST', score: 7234, isPlayer: false },
    { rank: 3, name: 'THREAD_GOD', score: 6102, isPlayer: false },
    { rank: 4, name: 'FLIPMASTER', score: 5430, isPlayer: false },
    { rank: 5, name: 'ARCANE_ORB', score: 4891, isPlayer: false },
    { rank: 6, name: 'DARK_PULSE', score: 4012, isPlayer: false },
    { rank: 7, name: 'YOU', score: playerBest, isPlayer: true },
    { rank: 8, name: 'SURGE_99', score: 2988, isPlayer: false },
    { rank: 9, name: 'NIMBUS_X', score: 2401, isPlayer: false },
    { rank: 10, name: 'PHANTOM_8', score: 1902, isPlayer: false },
  ]
    .sort((a, b) => b.score - a.score)
    .map((e, i) => ({ ...e, rank: i + 1 }))

  // Find player rank
  const playerEntry = entries.find((e) => e.isPlayer)
  if (playerEntry && playerBest > entries[2].score) {
    // Insert player at correct position
  }

  return entries
}

export default function LeaderboardScreen({
  recentRuns,
  allTimeHigh,
  onBack,
}: LeaderboardScreenProps) {
  const global = getMockLeaderboard(allTimeHigh)

  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(167,139,250,0.07) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 flex flex-col h-full px-5 pb-8 overflow-y-auto">
        {/* Header */}
        <motion.div
          className="flex items-center gap-3 pt-8 pb-5"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8L10 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
            </svg>
          </button>
          <div>
            <h2 className="text-xl font-bold text-foreground">Leaderboard</h2>
            <p className="text-xs font-mono text-muted-foreground">Global rankings</p>
          </div>
        </motion.div>

        {/* Your rank card */}
        {allTimeHigh > 0 && (
          <motion.div
            className="rounded-2xl p-4 mb-5"
            style={{
              background: 'rgba(34,211,238,0.07)',
              border: '1px solid rgba(34,211,238,0.2)',
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-mono tracking-widest uppercase text-cyan-400/60 mb-1">
                  YOUR BEST
                </div>
                <div className="text-3xl font-bold font-mono text-cyan-400 text-glow-cyan">
                  {formatScore(allTimeHigh)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono text-muted-foreground mb-1">RANK</div>
                <div className="text-2xl font-bold font-mono text-foreground">
                  #{global.find((e) => e.isPlayer)?.rank ?? '—'}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Global list */}
        <div className="text-xs font-mono tracking-widest uppercase text-muted-foreground mb-3">
          Global Top 10
        </div>
        <div className="flex flex-col gap-2 mb-6">
          {global.map((entry, i) => (
            <motion.div
              key={entry.rank}
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{
                background: entry.isPlayer
                  ? 'rgba(34,211,238,0.08)'
                  : 'rgba(255,255,255,0.02)',
                border: `1px solid ${entry.isPlayer ? 'rgba(34,211,238,0.25)' : 'rgba(255,255,255,0.05)'}`,
              }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.04 }}
            >
              <span
                className="w-6 text-center text-sm font-bold font-mono"
                style={{
                  color:
                    entry.rank === 1
                      ? '#fbbf24'
                      : entry.rank === 2
                      ? '#94a3b8'
                      : entry.rank === 3
                      ? '#f97316'
                      : 'rgba(255,255,255,0.3)',
                }}
              >
                {entry.rank}
              </span>
              <span
                className="flex-1 text-sm font-mono font-bold tracking-wider"
                style={{ color: entry.isPlayer ? '#22d3ee' : 'rgba(255,255,255,0.8)' }}
              >
                {entry.name}
              </span>
              <span
                className="text-sm font-mono font-bold"
                style={{ color: entry.isPlayer ? '#22d3ee' : 'rgba(255,255,255,0.7)' }}
              >
                {formatScore(entry.score)}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Recent runs */}
        {recentRuns.length > 0 && (
          <>
            <div className="text-xs font-mono tracking-widest uppercase text-muted-foreground mb-3">
              Your Recent Runs
            </div>
            <div className="flex flex-col gap-2">
              {recentRuns.slice(0, 5).map((run, i) => (
                <motion.div
                  key={run.timestamp}
                  className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.04 }}
                >
                  <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    {run.mode}
                  </span>
                  <span className="text-sm font-mono font-bold text-foreground">
                    {formatScore(run.score)}
                  </span>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
