'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { useAudioContext } from '@/components/audio/AudioProvider'

interface SettingsScreenProps {
  onBack: () => void
  onHowToPlay: () => void
  onResetData?: () => void
}

interface ToggleRowProps {
  label: string
  description?: string
  value: boolean
  onChange: (v: boolean) => void
}

function ToggleRow({ label, description, value, onChange }: ToggleRowProps) {
  return (
    <div
      className="flex items-center justify-between rounded-2xl px-4 py-3.5"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        {description && (
          <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
        )}
      </div>
      <button
        onClick={() => onChange(!value)}
        className="relative w-12 h-6 rounded-full transition-all shrink-0 ml-4"
        style={{
          background: value ? 'rgba(34,211,238,0.5)' : 'rgba(255,255,255,0.1)',
          boxShadow: value ? '0 0 10px rgba(34,211,238,0.3)' : 'none',
        }}
      >
        <div
          className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
          style={{
            left: value ? 'calc(100% - 20px)' : '4px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          }}
        />
      </button>
    </div>
  )
}

interface SliderRowProps {
  label: string
  description?: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
}

function SliderRow({
  label,
  description,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.05,
  disabled = false,
}: SliderRowProps) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div
      className="flex flex-col gap-2 rounded-2xl px-4 py-3.5"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-foreground">{label}</div>
          {description && (
            <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
          )}
        </div>
        <span className="text-xs font-mono text-muted-foreground ml-4 shrink-0">
          {Math.round(value * 100)}%
        </span>
      </div>
      <div className="relative h-5 flex items-center">
        {/* Track */}
        <div
          className="absolute inset-x-0 h-1.5 rounded-full"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        />
        {/* Fill */}
        <div
          className="absolute left-0 h-1.5 rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: disabled ? 'rgba(255,255,255,0.2)' : 'rgba(34,211,238,0.6)',
            boxShadow: disabled ? 'none' : '0 0 8px rgba(34,211,238,0.4)',
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-5"
          aria-label={label}
        />
        {/* Thumb */}
        <div
          className="absolute w-4 h-4 rounded-full pointer-events-none transition-all"
          style={{
            left: `calc(${pct}% - 8px)`,
            background: disabled ? '#666' : '#22d3ee',
            boxShadow: disabled ? 'none' : '0 0 8px rgba(34,211,238,0.6)',
          }}
        />
      </div>
    </div>
  )
}

export default function SettingsScreen({ onBack, onHowToPlay, onResetData }: SettingsScreenProps) {
  const { muted, volume, toggleMute, changeVolume, play, musicEnabled, musicVolume, toggleMusicEnabled, changeMusicVolume } = useAudioContext()
  const [showFPS, setShowFPS] = useState(false)
  const [highContrast, setHighContrast] = useState(false)

  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden">
      <div className="relative z-10 flex flex-col h-full px-5 pb-8 overflow-y-auto">
        <motion.div
          className="flex items-center gap-3 pt-8 pb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={() => { play('ui_tap'); onBack() }}
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            aria-label="Back"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8L10 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
            </svg>
          </button>
          <div>
            <h2 className="text-xl font-bold text-foreground">Settings</h2>
            <p className="text-xs font-mono text-muted-foreground">Preferences & info</p>
          </div>
        </motion.div>

        <div className="flex flex-col gap-6">
          {/* Audio section */}
          <motion.div
            className="flex flex-col gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            <div className="text-xs font-mono tracking-widest uppercase text-muted-foreground mb-1">
              Audio
            </div>

            <ToggleRow
              label="Sound Effects"
              description="Flip, pickup, milestone & death sounds"
              value={!muted}
              onChange={(on) => {
                toggleMute()
                if (on) play('ui_tap')
              }}
            />

            <SliderRow
              label="Sound Volume"
              description="Effect volume level"
              value={volume}
              onChange={(v) => changeVolume(v)}
              disabled={muted}
            />

            <ToggleRow
              label="Background Music"
              description="Gameplay soundtrack"
              value={musicEnabled}
              onChange={() => toggleMusicEnabled()}
            />

            <SliderRow
              label="Music Volume"
              description="Background music level"
              value={musicVolume}
              onChange={(v) => changeMusicVolume(v)}
              disabled={!musicEnabled}
            />
          </motion.div>

          {/* Game section */}
          <motion.div
            className="flex flex-col gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="text-xs font-mono tracking-widest uppercase text-muted-foreground mb-1">
              Game
            </div>
            <ToggleRow
              label="Screen Shake"
              description="Shake on impacts and deaths"
              value={true}
              onChange={() => {}}
            />
            <ToggleRow
              label="Particles"
              description="Orb trail and hit effects"
              value={true}
              onChange={() => {}}
            />
          </motion.div>

          {/* Display section */}
          <motion.div
            className="flex flex-col gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
          >
            <div className="text-xs font-mono tracking-widest uppercase text-muted-foreground mb-1">
              Display
            </div>
            <ToggleRow
              label="Show FPS"
              value={showFPS}
              onChange={setShowFPS}
            />
            <ToggleRow
              label="High Contrast Mode"
              description="Boost obstacle visibility"
              value={highContrast}
              onChange={setHighContrast}
            />
          </motion.div>

          {/* Info section */}
          <motion.div
            className="flex flex-col gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="text-xs font-mono tracking-widest uppercase text-muted-foreground mb-1">
              Info
            </div>

            <button
              onClick={() => { play('ui_tap'); onHowToPlay() }}
              className="flex items-center justify-between rounded-2xl px-4 py-3.5 text-left w-full"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="text-sm text-foreground">How to Play</div>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M4 7h6M7 4l3 3-3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
              </svg>
            </button>

            <div
              className="flex items-center justify-between rounded-2xl px-4 py-3.5"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
            >
              <div className="text-sm text-foreground">Version</div>
              <div className="text-sm font-mono text-muted-foreground">1.0.0</div>
            </div>
          </motion.div>

          {/* Danger zone */}
          {onResetData && (
            <motion.div
              className="flex flex-col gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38 }}
            >
              <div className="text-xs font-mono tracking-widest uppercase text-muted-foreground mb-1">
                Data
              </div>
              <button
                onClick={onResetData}
                className="rounded-2xl px-4 py-3.5 text-left w-full transition-all active:scale-[0.98]"
                style={{
                  background: 'rgba(239,68,68,0.05)',
                  border: '1px solid rgba(239,68,68,0.15)',
                  color: 'rgba(239,68,68,0.8)',
                }}
              >
                <div className="text-sm font-medium">Reset All Data</div>
                <div className="text-xs opacity-60 mt-0.5">This cannot be undone</div>
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
