'use client'

import { motion } from 'framer-motion'
import type { PlayerProfile } from '@/lib/game/types'
import { formatScore } from '@/lib/game/scoring'

interface StatsScreenProps {
  profile: PlayerProfile
  onBack: () => void
}

export default function StatsScreen({ profile, onBack }: StatsScreenProps) {
  const stats = [
    { label: 'All-Time Best', value: formatScore(profile.allTimeHigh), accent: '#22d3ee' },
    { label: 'Total Runs', value: profile.totalRuns.toLocaleString() },
    { label: 'Total Distance', value: `${profile.totalDistance.toLocaleString()}m` },
    { label: 'Total Flips', value: profile.totalFlips.toLocaleString() },
    { label: 'Daily Challenges', value: profile.dailyChallenges.toLocaleString(), accent: '#a78bfa' },
    { label: 'Avg per Run', value: profile.totalRuns > 0 ? formatScore(profile.allTimeHigh / Math.max(profile.totalRuns, 1)) : '—' },
  ]

  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(34,211,238,0.05) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 flex flex-col h-full px-5 pb-8 overflow-y-auto">
        <motion.div
          className="flex items-center gap-3 pt-8 pb-6"
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
            <h2 className="text-xl font-bold text-foreground">Stats</h2>
            <p className="text-xs font-mono text-muted-foreground">Your lifetime progress</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              className="rounded-2xl p-4 flex flex-col gap-1"
              style={{
                background: s.accent ? `${s.accent}08` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${s.accent ? `${s.accent}20` : 'rgba(255,255,255,0.07)'}`,
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
            >
              <span className="text-xs font-mono tracking-wider uppercase text-muted-foreground">
                {s.label}
              </span>
              <span
                className="text-xl font-bold font-mono"
                style={{ color: s.accent ?? 'white' }}
              >
                {s.value}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Motivational tag */}
        <motion.div
          className="mt-8 rounded-2xl p-5 text-center"
          style={{
            background: 'rgba(34,211,238,0.05)',
            border: '1px solid rgba(34,211,238,0.12)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="text-xs font-mono tracking-widest uppercase text-cyan-400/60 mb-2">
            THREAD STATUS
          </div>
          <div className="text-lg font-bold text-foreground">
            {profile.totalRuns === 0
              ? 'First run awaits'
              : profile.totalRuns < 10
              ? 'Learning the thread'
              : profile.totalRuns < 50
              ? 'Getting the hang of it'
              : profile.totalRuns < 100
              ? 'Thread Walker'
              : 'Gravity Veteran'}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
