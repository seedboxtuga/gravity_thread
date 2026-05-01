'use client'

import { motion } from 'framer-motion'

interface HowToPlayScreenProps {
  onBack: () => void
  onPlay: () => void
}

const steps = [
  {
    icon: '◎',
    color: '#22d3ee',
    title: 'Tap to Flip',
    desc: 'Tap anywhere to switch your orb between the top and bottom of the energy thread.',
  },
  {
    icon: '⚡',
    color: '#fbbf24',
    title: 'Dodge Hazards',
    desc: 'Spikes, electric gates, and rotating blades will end your run. Stay on the safe side.',
  },
  {
    icon: '★',
    color: '#a78bfa',
    title: 'Build Combos',
    desc: 'Keep flipping to build your combo chain and score multiplier. Near misses add bonus points.',
  },
  {
    icon: '▲',
    color: '#4ade80',
    title: 'Speed Increases',
    desc: 'The thread moves faster the longer you survive. Stay sharp and react faster.',
  },
]

const obstacles = [
  { name: 'Spike', color: '#ef4444', desc: 'Avoid the pointed side' },
  { name: 'Electric Gate', color: '#a78bfa', desc: 'Pulses on/off — wait for it' },
  { name: 'Moving Block', color: '#f97316', desc: 'Slides up and down' },
  { name: 'Thread Gap', color: '#22d3ee', desc: 'Be on the indicated safe side' },
  { name: 'Rotating Blade', color: '#f97316', desc: 'Time your passage' },
  { name: 'Squeeze Zone', color: '#ef4444', desc: 'Rapid flips required' },
]

export default function HowToPlayScreen({ onBack, onPlay }: HowToPlayScreenProps) {
  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden">
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
            <h2 className="text-xl font-bold text-foreground">How to Play</h2>
            <p className="text-xs font-mono text-muted-foreground">Master the thread</p>
          </div>
        </motion.div>

        {/* Core steps */}
        <div className="flex flex-col gap-3 mb-7">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              className="flex items-start gap-4 rounded-2xl p-4"
              style={{
                background: `${step.color}08`,
                border: `1px solid ${step.color}20`,
              }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 mt-0.5"
                style={{ background: `${step.color}15`, color: step.color }}
              >
                {step.icon}
              </div>
              <div>
                <div className="text-sm font-bold text-foreground mb-0.5">{step.title}</div>
                <div className="text-xs text-muted-foreground leading-relaxed">{step.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Obstacles guide */}
        <div className="text-xs font-mono tracking-widest uppercase text-muted-foreground mb-3">
          Obstacles
        </div>
        <div className="grid grid-cols-2 gap-2 mb-7">
          {obstacles.map((obs, i) => (
            <motion.div
              key={obs.name}
              className="rounded-xl p-3"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.04 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: obs.color, boxShadow: `0 0 6px ${obs.color}80` }}
                />
                <span
                  className="text-xs font-bold"
                  style={{ color: obs.color }}
                >
                  {obs.name}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{obs.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Scoring tips */}
        <motion.div
          className="rounded-2xl p-4 mb-7"
          style={{
            background: 'rgba(34,211,238,0.05)',
            border: '1px solid rgba(34,211,238,0.12)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <div className="text-xs font-mono tracking-widest uppercase text-cyan-400/60 mb-3">
            Pro Tips
          </div>
          {[
            'Near misses score bonus points',
            'Combo multiplier maxes at 4x',
            'Practice mode is slower — start there',
            'Daily challenge refreshes each day',
          ].map((tip) => (
            <div key={tip} className="flex items-start gap-2 mb-2 last:mb-0">
              <span className="text-cyan-400/50 mt-0.5 text-xs">→</span>
              <span className="text-xs text-muted-foreground leading-relaxed">{tip}</span>
            </div>
          ))}
        </motion.div>

        <motion.button
          onClick={onPlay}
          className="w-full py-4 rounded-2xl font-mono font-bold text-base tracking-widest uppercase transition-all active:scale-95"
          style={{
            background: 'rgba(34,211,238,0.15)',
            border: '1px solid rgba(34,211,238,0.5)',
            color: '#22d3ee',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          START PLAYING
        </motion.button>
      </div>
    </div>
  )
}
