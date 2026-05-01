'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { formatScore } from '@/lib/game/scoring'
import type { GameMode } from '@/lib/game/types'
import { MODE_CONFIG } from '@/lib/game/constants'

interface PauseScreenProps {
  score: number
  bestScore: number
  mode: GameMode
  onResume: () => void
  onRestart: () => void
  onHome: () => void
}

export default function PauseScreen({
  score,
  bestScore,
  mode,
  onResume,
  onRestart,
  onHome,
}: PauseScreenProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(6,10,20,0.9)', backdropFilter: 'blur(20px)' }}
    >
      <motion.div
        className="flex flex-col items-center gap-6 w-full max-w-[300px] mx-5"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 200 }}
      >
        {/* Mode badge */}
        <span
          className="text-xs font-mono font-bold tracking-widest uppercase px-3 py-1 rounded-full"
          style={{
            color: MODE_CONFIG[mode].color,
            background: `${MODE_CONFIG[mode].color}15`,
            border: `1px solid ${MODE_CONFIG[mode].color}30`,
          }}
        >
          {MODE_CONFIG[mode].label}
        </span>

        {/* Title */}
        <div className="flex flex-col items-center gap-1">
          <h2 className="text-3xl font-bold font-mono tracking-wider text-foreground">
            PAUSED
          </h2>
          <p className="text-sm text-muted-foreground font-mono">take a breath</p>
        </div>

        {/* Score */}
        <div
          className="w-full rounded-2xl p-5 text-center"
          style={{
            background: 'rgba(34,211,238,0.06)',
            border: '1px solid rgba(34,211,238,0.15)',
          }}
        >
          <div className="text-xs font-mono tracking-widest uppercase text-cyan-400/60 mb-1">
            Current Score
          </div>
          <div className="text-4xl font-bold font-mono text-cyan-400 text-glow-cyan">
            {formatScore(score)}
          </div>
          {bestScore > 0 && (
            <div className="text-xs font-mono text-muted-foreground mt-1">
              Best: {formatScore(bestScore)}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={onResume}
            className="w-full py-4 rounded-2xl font-mono font-bold text-base tracking-widest uppercase transition-all active:scale-95"
            style={{
              background: 'rgba(34,211,238,0.15)',
              border: '1px solid rgba(34,211,238,0.5)',
              color: '#22d3ee',
              boxShadow: '0 0 20px rgba(34,211,238,0.1)',
            }}
          >
            RESUME
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onRestart}
              className="py-3.5 rounded-2xl font-mono font-bold text-sm tracking-wider uppercase transition-all active:scale-95"
              style={{
                background: 'rgba(249,115,22,0.08)',
                border: '1px solid rgba(249,115,22,0.25)',
                color: '#f97316',
              }}
            >
              RESTART
            </button>
            <button
              onClick={onHome}
              className="py-3.5 rounded-2xl font-mono font-bold text-sm tracking-wider uppercase transition-all active:scale-95 text-foreground/60"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              HOME
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
