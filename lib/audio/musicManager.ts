/**
 * musicManager.ts
 * Background music playback system for Gravity Thread.
 *
 * Design goals:
 * - Simple, reliable, mobile-friendly background music playback
 * - Avoid double-playback and stacking issues
 * - Smooth fade-in/fade-out transitions
 * - Persist music preferences to localStorage
 * - Support multiple tracks mapped by purpose (menu, gameplay, results)
 * - Clean separation from sound effects
 */

export type MusicTrack = 'gameplay' | 'menu' | 'results'

interface MusicManagerState {
  audio: HTMLAudioElement | null
  currentTrack: MusicTrack | null
  isPlaying: boolean
  isFading: boolean
  musicEnabled: boolean
  volume: number
  fadeTimeoutId: number | null
  unlocked: boolean
}

const MUSIC_URLS: Record<MusicTrack, string> = {
  gameplay: '/music/gameplay.mp3',
  menu: '/music/gameplay.mp3', // Use gameplay music for menu too (single track available)
  results: '/music/gameplay.mp3',
}

const FADE_DURATION = 800 // milliseconds
const FADE_STEP = 50 // milliseconds

let state: MusicManagerState = {
  audio: null,
  currentTrack: null,
  isPlaying: false,
  isFading: false,
  musicEnabled: true,
  volume: 0.5,
  fadeTimeoutId: null,
  unlocked: false,
}

/**
 * Load music preferences from localStorage
 */
function loadMusicPrefs(): { musicEnabled: boolean; volume: number } {
  if (typeof window === 'undefined') return { musicEnabled: true, volume: 0.5 }
  try {
    const raw = localStorage.getItem('gravity_music_prefs')
    if (!raw) return { musicEnabled: true, volume: 0.5 }
    return JSON.parse(raw) as { musicEnabled: boolean; volume: number }
  } catch {
    return { musicEnabled: true, volume: 0.5 }
  }
}

/**
 * Save music preferences to localStorage
 */
function saveMusicPrefs(prefs: { musicEnabled: boolean; volume: number }): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('gravity_music_prefs', JSON.stringify(prefs))
  } catch {}
}

/**
 * Initialize the music system after first user gesture
 */
export function initMusic(): void {
  if (state.unlocked || typeof window === 'undefined') return

  try {
    const audio = new Audio()
    audio.preload = 'auto'
    audio.loop = true

    const prefs = loadMusicPrefs()
    state.musicEnabled = prefs.musicEnabled
    state.volume = prefs.volume

    state.audio = audio
    state.unlocked = true
    console.log('[v0] Music system initialized')
  } catch (error) {
    console.warn('[v0] Failed to initialize music:', error)
  }
}

/**
 * Play a music track with fade-in
 * If already playing the same track, does nothing
 * If playing a different track, fades out first then plays new one
 */
export async function playMusic(track: MusicTrack): Promise<void> {
  if (!state.unlocked || !state.audio) {
    console.warn('[v0] Music system not initialized')
    return
  }

  // If already playing this exact track, do nothing
  if (state.currentTrack === track && state.isPlaying && !state.isFading) {
    return
  }

  try {
    // Cancel any pending fade
    if (state.fadeTimeoutId) {
      clearTimeout(state.fadeTimeoutId)
      state.fadeTimeoutId = null
    }

    const trackUrl = MUSIC_URLS[track]

    // Stop existing playback and fade out if different track
    if (state.currentTrack && state.currentTrack !== track) {
      await fadeOutMusic()
    }

    // Load and play new track
    state.audio.src = trackUrl
    state.audio.volume = state.musicEnabled ? state.volume : 0
    state.currentTrack = track

    // Start from beginning
    state.audio.currentTime = 0

    const playPromise = state.audio.play()
    if (playPromise) {
      playPromise.catch((error) => {
        console.warn('[v0] Music playback failed:', error)
      })
    }

    state.isPlaying = true

    // Fade in
    await fadeInMusic()
  } catch (error) {
    console.error('[v0] Error playing music:', error)
  }
}

/**
 * Stop music with fade-out
 */
export async function stopMusic(): Promise<void> {
  if (!state.audio || !state.isPlaying) return
  await fadeOutMusic()
  state.audio.pause()
  state.isPlaying = false
  state.currentTrack = null
}

/**
 * Pause music (without fade, just pause playback)
 */
export function pauseMusic(): void {
  if (!state.audio || !state.isPlaying) return

  // Cancel any pending fade
  if (state.fadeTimeoutId) {
    clearTimeout(state.fadeTimeoutId)
    state.fadeTimeoutId = null
  }

  state.audio.pause()
  state.isPlaying = false
  console.log('[v0] Music paused')
}

/**
 * Resume music (pick up from where it was paused)
 */
export async function resumeMusic(): Promise<void> {
  if (!state.audio || state.currentTrack === null) return

  try {
    const playPromise = state.audio.play()
    if (playPromise) {
      playPromise.catch((error) => {
        console.warn('[v0] Music resume failed:', error)
      })
    }
    state.isPlaying = true
    await fadeInMusic()
    console.log('[v0] Music resumed')
  } catch (error) {
    console.error('[v0] Error resuming music:', error)
  }
}

/**
 * Fade in music smoothly
 */
async function fadeInMusic(): Promise<void> {
  return new Promise((resolve) => {
    if (!state.audio) return resolve()

    state.isFading = true
    const startVolume = state.audio.volume
    const targetVolume = state.musicEnabled ? state.volume : 0
    const steps = Math.ceil(FADE_DURATION / FADE_STEP)
    let currentStep = 0

    const fadeStep = () => {
      if (!state.audio) {
        state.isFading = false
        return resolve()
      }

      currentStep++
      const progress = currentStep / steps
      state.audio.volume = startVolume + (targetVolume - startVolume) * progress

      if (currentStep >= steps) {
        state.audio.volume = targetVolume
        state.isFading = false
        resolve()
      } else {
        state.fadeTimeoutId = window.setTimeout(fadeStep, FADE_STEP)
      }
    }

    fadeStep()
  })
}

/**
 * Fade out music smoothly
 */
async function fadeOutMusic(): Promise<void> {
  return new Promise((resolve) => {
    if (!state.audio) return resolve()

    state.isFading = true
    const startVolume = state.audio.volume
    const steps = Math.ceil(FADE_DURATION / FADE_STEP)
    let currentStep = 0

    const fadeStep = () => {
      if (!state.audio) {
        state.isFading = false
        return resolve()
      }

      currentStep++
      const progress = currentStep / steps
      state.audio.volume = startVolume * (1 - progress)

      if (currentStep >= steps) {
        state.audio.volume = 0
        state.isFading = false
        resolve()
      } else {
        state.fadeTimeoutId = window.setTimeout(fadeStep, FADE_STEP)
      }
    }

    fadeStep()
  })
}

/**
 * Set whether music is enabled
 */
export function setMusicEnabled(enabled: boolean): void {
  state.musicEnabled = enabled
  saveMusicPrefs({ musicEnabled: enabled, volume: state.volume })

  if (!state.audio) return

  if (enabled && state.isPlaying) {
    // Fade back in if music is playing
    state.audio.volume = 0
    fadeInMusic().catch(() => {})
  } else if (!enabled) {
    // Fade out
    fadeOutMusic().catch(() => {})
  }
}

/**
 * Set music volume (0–1)
 */
export function setMusicVolume(volume: number): void {
  state.volume = Math.max(0, Math.min(1, volume))
  saveMusicPrefs({ musicEnabled: state.musicEnabled, volume: state.volume })

  if (state.audio && !state.isFading) {
    state.audio.volume = state.musicEnabled ? state.volume : 0
  }
}

/**
 * Get current music enabled state
 */
export function getMusicEnabled(): boolean {
  return state.musicEnabled
}

/**
 * Get current music volume
 */
export function getMusicVolume(): number {
  return state.volume
}

/**
 * Get currently playing track
 */
export function getCurrentTrack(): MusicTrack | null {
  return state.currentTrack
}

/**
 * Check if music is currently playing
 */
export function isMusicPlaying(): boolean {
  return state.isPlaying
}
