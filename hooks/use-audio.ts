'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  unlockAudio,
  setMuted,
  setVolume,
  getMuted,
  getVolume,
  playSound,
  type SoundId,
} from '@/lib/audio/audioManager'
import {
  initMusic,
  playMusic,
  stopMusic,
  pauseMusic,
  resumeMusic,
  setMusicEnabled,
  setMusicVolume,
  getMusicEnabled,
  getMusicVolume,
  type MusicTrack,
} from '@/lib/audio/musicManager'

const STORAGE_KEY = 'gravity_audio_prefs'

interface AudioPrefs {
  muted: boolean
  volume: number
}

function loadPrefs(): AudioPrefs {
  if (typeof window === 'undefined') return { muted: false, volume: 0.7 }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { muted: false, volume: 0.7 }
    return JSON.parse(raw) as AudioPrefs
  } catch {
    return { muted: false, volume: 0.7 }
  }
}

function savePrefs(p: AudioPrefs) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) } catch {}
}

/**
 * useAudio
 *
 * Central React hook for the audio system.
 * - Unlocks AudioContext on first call to `play()` or `unlock()`
 * - Manages both sound effects and background music
 * - Persists muted/volume preferences to localStorage
 * - Returns stable callbacks for sound effects and music control
 */
export function useAudio() {
  const [muted, setMutedState] = useState<boolean>(() => loadPrefs().muted)
  const [volume, setVolumeState] = useState<number>(() => loadPrefs().volume)
  const [musicEnabled, setMusicEnabledState] = useState<boolean>(() => getMusicEnabled())
  const [musicVolume, setMusicVolumeState] = useState<number>(() => getMusicVolume())
  const unlockedRef = useRef(false)

  // Apply saved prefs to managers on mount
  useEffect(() => {
    setMuted(loadPrefs().muted)
    setVolume(loadPrefs().volume)
    initMusic()
  }, [])

  const unlock = useCallback(() => {
    if (!unlockedRef.current) {
      unlockAudio()
      initMusic()
      unlockedRef.current = true
    }
  }, [])

  const play = useCallback(
    (id: SoundId) => {
      unlock()
      playSound(id)
    },
    [unlock]
  )

  const toggleMute = useCallback(() => {
    const next = !getMuted()
    setMuted(next)
    setMutedState(next)
    savePrefs({ muted: next, volume: getVolume() })
  }, [])

  const changeVolume = useCallback((v: number) => {
    setVolume(v)
    setVolumeState(v)
    savePrefs({ muted: getMuted(), volume: v })
  }, [])

  const toggleMusicEnabled = useCallback(() => {
    const next = !getMusicEnabled()
    setMusicEnabled(next)
    setMusicEnabledState(next)
  }, [])

  const changeMusicVolume = useCallback((v: number) => {
    setMusicVolume(v)
    setMusicVolumeState(v)
  }, [])

  const playBackgroundMusic = useCallback(
    (track: MusicTrack) => {
      unlock()
      playMusic(track).catch(() => {})
    },
    [unlock]
  )

  const stopBackgroundMusic = useCallback(() => {
    stopMusic().catch(() => {})
  }, [])

  const pauseBackgroundMusic = useCallback(() => {
    pauseMusic()
  }, [])

  const resumeBackgroundMusic = useCallback(() => {
    resumeMusic().catch(() => {})
  }, [])

  return {
    muted,
    volume,
    play,
    toggleMute,
    changeVolume,
    unlock,
    musicEnabled,
    musicVolume,
    toggleMusicEnabled,
    changeMusicVolume,
    playBackgroundMusic,
    stopBackgroundMusic,
    pauseBackgroundMusic,
    resumeBackgroundMusic,
  }
}
