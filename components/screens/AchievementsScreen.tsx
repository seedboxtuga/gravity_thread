'use client'

import { motion } from 'framer-motion'
import type { Achievement } from '@/lib/game/types'

interface AchievementsScreenProps {
  achievements: Achievement[]
  onBack: () => void
}

export default function AchievementsScreen({
  achievements,
  onBack,
}: AchievementsScreenProps) {
  const unlocked = achievements.filter((a) => a.unlocked)
  const locked = achievements.filter((a) => !a.unlocked)

  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(251,191,36,0.05) 0%, transparent 60%)',
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
            <h2 className="text-xl font-bold text-foreground">Achievements</h2>
            <p className="text-xs font-mono text-muted-foreground">
              {unlocked.length} / {achievements.length} unlocked
            </p>
          </div>
        </motion.div>

        {/* Progress bar */}
        <motion.div
          className="mb-6 rounded-full overflow-hidden h-2"
          style={{ background: 'rgba(255,255,255,0.06)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #fbbf24, #f97316)',
              boxShadow: '0 0 8px rgba(251,191,36,0.4)',
            }}
            initial={{ width: 0 }}
            animate={{
              width: `${(unlocked.length / achievements.length) * 100}%`,
            }}
            transition={{ delay: 0.3, duration: 0.6 }}
          />
        </motion.div>

        {/* Unlocked */}
        {unlocked.length > 0 && (
          <>
            <div className="text-xs font-mono tracking-widest uppercase text-muted-foreground mb-3">
              Unlocked
            </div>
            <div className="flex flex-col gap-2 mb-6">
              {unlocked.map((ach, i) => (
                <motion.div
                  key={ach.id}
                  className="flex items-center gap-4 rounded-2xl px-4 py-3"
                  style={{
                    background: 'rgba(251,191,36,0.06)',
                    border: '1px solid rgba(251,191,36,0.2)',
                  }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ background: 'rgba(251,191,36,0.12)' }}
                  >
                    {ach.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-foreground">{ach.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{ach.description}</div>
                  </div>
                  <div className="text-yellow-400 text-base shrink-0">★</div>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {/* Locked */}
        {locked.length > 0 && (
          <>
            <div className="text-xs font-mono tracking-widest uppercase text-muted-foreground mb-3">
              Locked
            </div>
            <div className="flex flex-col gap-2">
              {locked.map((ach, i) => {
                const progress = ach.progress ?? 0
                const target = ach.target ?? 1
                const pct = Math.min((progress / target) * 100, 100)

                return (
                  <motion.div
                    key={ach.id}
                    className="flex items-center gap-4 rounded-2xl px-4 py-3"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.04 }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 opacity-30"
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                    >
                      {ach.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-foreground/50">{ach.title}</div>
                      <div className="text-xs text-muted-foreground/50 truncate mb-1.5">
                        {ach.description}
                      </div>
                      {target > 1 && (
                        <div className="flex items-center gap-2">
                          <div
                            className="flex-1 h-1 rounded-full overflow-hidden"
                            style={{ background: 'rgba(255,255,255,0.05)' }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                background: 'rgba(251,191,36,0.4)',
                              }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                            {Math.floor(progress)}/{target}
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
