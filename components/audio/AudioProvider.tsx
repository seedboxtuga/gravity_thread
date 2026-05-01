'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useAudio } from '@/hooks/use-audio'
import type { SoundId } from '@/lib/audio/audioManager'
import type { MusicTrack } from '@/lib/audio/musicManager'

interface AudioContextValue {
  muted: boolean
  volume: number
  play: (id: SoundId) => void
  toggleMute: () => void
  changeVolume: (v: number) => void
  unlock: () => void
  musicEnabled: boolean
  musicVolume: number
  toggleMusicEnabled: () => void
  changeMusicVolume: (v: number) => void
  playBackgroundMusic: (track: MusicTrack) => void
  stopBackgroundMusic: () => void
  pauseBackgroundMusic: () => void
  resumeBackgroundMusic: () => void
}

const AudioCtx = createContext<AudioContextValue | null>(null)

export function AudioProvider({ children }: { children: ReactNode }) {
  const audio = useAudio()
  return <AudioCtx.Provider value={audio}>{children}</AudioCtx.Provider>
}

/** Use inside any component to play sounds, control volume, and manage background music. */
export function useAudioContext(): AudioContextValue {
  const ctx = useContext(AudioCtx)
  if (!ctx) throw new Error('useAudioContext must be used inside <AudioProvider>')
  return ctx
}
