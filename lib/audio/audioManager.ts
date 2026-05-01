/**
 * audioManager.ts
 * Web Audio API sound engine for Gravity Thread.
 *
 * Design goals:
 * - Zero external assets — all sounds are synthesized with oscillators/noise
 * - AudioContext is created lazily after first user gesture (autoplay policy)
 * - Drop-in ready for real audio files: swap the play* functions with
 *   BufferSource nodes loaded from URLs, same call sites, same API
 * - Mobile-first: all nodes are short-lived and GC'd immediately after use
 * - Single master GainNode so volume/mute apply instantly to all sounds
 */

export type SoundId =
  | 'tap'
  | 'phase_core_pickup'
  | 'shield_hum_start'
  | 'shield_hum_stop'
  | 'shield_break'
  | 'near_miss'
  | 'combo_increase'
  | 'milestone'
  | 'death'
  | 'ui_tap'

interface AudioManagerState {
  ctx: AudioContext | null
  master: GainNode | null
  muted: boolean
  volume: number
  /** Running node for the looping shield hum so we can stop it */
  humNode: OscillatorNode | null
  humGain: GainNode | null
  humLfo: OscillatorNode | null
  humBp: BiquadFilterNode | null
  humPaused: boolean
  unlocked: boolean
}

const state: AudioManagerState = {
  ctx: null,
  master: null,
  muted: false,
  volume: 0.7,
  humNode: null,
  humGain: null,
  humLfo: null,
  humBp: null,
  humPaused: false,
  unlocked: false,
}

// ─── Public API ────────────────────────────────────────────────────────────────

/** Must be called once inside a user-gesture handler before any sounds play. */
export function unlockAudio(): void {
  if (state.unlocked) return
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const master = ctx.createGain()
    master.gain.value = state.muted ? 0 : state.volume
    master.connect(ctx.destination)
    state.ctx = ctx
    state.master = master
    state.unlocked = true

    // iOS requires a silent buffer play to fully unlock
    const buf = ctx.createBuffer(1, 1, 22050)
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)
    src.start(0)
  } catch {
    // Audio not available — silently degrade
  }
}

export function setMuted(muted: boolean): void {
  state.muted = muted
  if (state.master) {
    state.master.gain.setTargetAtTime(muted ? 0 : state.volume, state.ctx!.currentTime, 0.02)
  }
}

export function setVolume(volume: number): void {
  state.volume = Math.max(0, Math.min(1, volume))
  if (state.master && !state.muted) {
    state.master.gain.setTargetAtTime(state.volume, state.ctx!.currentTime, 0.02)
  }
}

export function getMuted(): boolean {
  return state.muted
}

export function getVolume(): number {
  return state.volume
}

/** Pause the shield hum (if active) without stopping it — allows resume */
export function pauseShieldHum(): void {
  if (!state.humNode || !state.humGain || state.humPaused) return
  state.humPaused = true
  const t = state.ctx!.currentTime
  state.humGain.gain.setTargetAtTime(0, t, 0.05)
  // Pause oscillators so they stay in sync when resumed
  if (state.humNode) state.humNode.stop(t + 0.15)
  if (state.humLfo) state.humLfo.stop(t + 0.15)
}

/** Resume the shield hum if it was paused and shield is still active */
export function resumeShieldHum(): void {
  if (!state.humPaused || state.humNode) return
  // Restart the hum from scratch with fresh oscillators
  _startShieldHum()
}

/** Forcefully stop and clean up the shield hum (used on death, exit, shield break) */
export function stopShieldHumForced(): void {
  if (!state.humNode) return
  const t = state.ctx!.currentTime
  if (state.humGain) {
    state.humGain.gain.setTargetAtTime(0, t, 0.05)
  }
  if (state.humNode) state.humNode.stop(t + 0.2)
  if (state.humLfo) state.humLfo.stop(t + 0.2)
  if (state.humGain) {
    state.humGain.onended = () => {
      state.humNode?.disconnect()
      state.humGain?.disconnect()
      state.humLfo?.disconnect()
      state.humBp?.disconnect()
      state.humNode = null
      state.humGain = null
      state.humLfo = null
      state.humBp = null
      state.humPaused = false
    }
  }
}

export function playSound(id: SoundId): void {
  if (!state.ctx || !state.master || state.muted) return
  try {
    switch (id) {
      case 'tap':             _playTap(); break
      case 'phase_core_pickup': _playPhaseCorePickup(); break
      case 'shield_hum_start':  _startShieldHum(); break
      case 'shield_hum_stop':   _stopShieldHum(); break
      case 'shield_break':      _playShieldBreak(); break
      case 'near_miss':         _playNearMiss(); break
      case 'combo_increase':    _playComboIncrease(); break
      case 'milestone':         _playMilestone(); break
      case 'death':             _playDeath(); break
      case 'ui_tap':            _playUITap(); break
    }
  } catch {
    // Swallow synthesis errors gracefully
  }
}

// ─── Private synthesis helpers ─────────────────────────────────────────────────

function _ctx(): AudioContext { return state.ctx! }
function _out(): GainNode    { return state.master! }
function _now(): number      { return _ctx().currentTime }

/** Tiny helper: create an OscillatorNode, connect it, start/stop, auto-GC. */
function _osc(
  type: OscillatorType,
  freq: number,
  gainVal: number,
  duration: number,
  freqEnv?: (osc: OscillatorNode, g: GainNode, t: number) => void
): void {
  const ctx = _ctx()
  const t = _now()
  const g = ctx.createGain()
  g.connect(_out())
  g.gain.setValueAtTime(gainVal, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration)

  const osc = ctx.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  osc.connect(g)
  freqEnv?.(osc, g, t)
  osc.start(t)
  osc.stop(t + duration + 0.01)
  osc.onended = () => { osc.disconnect(); g.disconnect() }
}

/** One-shot white-noise burst. */
function _noise(gainVal: number, duration: number, highpass = 0): void {
  const ctx = _ctx()
  const t = _now()
  const sampleRate = ctx.sampleRate
  const frames = Math.ceil(sampleRate * duration)
  const buf = ctx.createBuffer(1, frames, sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1

  const src = ctx.createBufferSource()
  src.buffer = buf

  const g = ctx.createGain()
  g.gain.setValueAtTime(gainVal, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration)

  if (highpass > 0) {
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = highpass
    src.connect(hp)
    hp.connect(g)
  } else {
    src.connect(g)
  }

  g.connect(_out())
  src.start(t)
  src.onended = () => { src.disconnect(); g.disconnect() }
}

// ─── Sound definitions ─────────────────────────────────────────────────────────

/** tap / flip — snappy click + short sine thump */
function _playTap(): void {
  _osc('sine', 220, 0.25, 0.08, (osc, _g, t) => {
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.06)
  })
  _noise(0.15, 0.04, 1800)
}

/** Phase Core pickup — bright ascending chime */
function _playPhaseCorePickup(): void {
  const notes = [523, 659, 784, 1047] // C5 E5 G5 C6
  const ctx = _ctx()
  const t = _now()
  notes.forEach((freq, i) => {
    const g = ctx.createGain()
    g.connect(_out())
    const start = t + i * 0.07
    g.gain.setValueAtTime(0, start)
    g.gain.linearRampToValueAtTime(0.22, start + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.28)

    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, start)
    osc.connect(g)
    osc.start(start)
    osc.stop(start + 0.3)
    osc.onended = () => { osc.disconnect(); g.disconnect() }
  })
  // Sparkle noise tail
  _noise(0.06, 0.18, 4000)
}

/** Shield active hum — sustained modulated tone (loops until stopped) */
function _startShieldHum(): void {
  if (state.humNode) return // already running
  const ctx = _ctx()
  const t = _now()

  const humG = ctx.createGain()
  humG.gain.setValueAtTime(0, t)
  humG.gain.linearRampToValueAtTime(0.08, t + 0.15)
  humG.connect(_out())

  const osc = ctx.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(80, t)

  // LFO for subtle wobble
  const lfo = ctx.createOscillator()
  const lfoGain = ctx.createGain()
  lfo.frequency.value = 6
  lfoGain.gain.value = 3
  lfo.connect(lfoGain)
  lfoGain.connect(osc.frequency)

  // Bandpass to shape the hum
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 400
  bp.Q.value = 1.5
  osc.connect(bp)
  bp.connect(humG)

  lfo.start(t)
  osc.start(t)

  // Store references for pause/resume/stop
  state.humNode = osc
  state.humGain = humG
  state.humLfo = lfo
  state.humBp = bp
  state.humPaused = false
}

/** Stop the shield hum with a fade-out (called on shield break or exit) */
function _stopShieldHum(): void {
  stopShieldHumForced()
}

/** Shield break — low thud + descending sweep + noise burst */
function _playShieldBreak(): void {
  stopShieldHumForced()
  _osc('sawtooth', 320, 0.4, 0.35, (osc, _g, t) => {
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.3)
  })
  _noise(0.3, 0.25, 200)
  // Low sub thud
  _osc('sine', 60, 0.5, 0.4, (osc, _g, t) => {
    osc.frequency.exponentialRampToValueAtTime(20, t + 0.3)
  })
}

/** Near miss — tight swoosh */
function _playNearMiss(): void {
  _osc('sine', 800, 0.18, 0.12, (osc, _g, t) => {
    osc.frequency.exponentialRampToValueAtTime(1600, t + 0.06)
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.12)
  })
  _noise(0.08, 0.08, 3000)
}

/** Combo increase — short rising two-note sting */
function _playComboIncrease(): void {
  _osc('triangle', 440, 0.15, 0.1, (osc, _g, t) => {
    osc.frequency.setValueAtTime(440, t)
    osc.frequency.setValueAtTime(660, t + 0.06)
  })
}

/** Milestone reached — triumphant 3-chord stab */
function _playMilestone(): void {
  const ctx = _ctx()
  const t = _now()
  const chords = [
    [523, 659, 784],   // C maj
    [587, 740, 880],   // D maj
    [659, 830, 988],   // E maj
  ]
  chords.forEach((chord, ci) => {
    chord.forEach((freq) => {
      const g = ctx.createGain()
      g.connect(_out())
      const start = t + ci * 0.13
      g.gain.setValueAtTime(0, start)
      g.gain.linearRampToValueAtTime(0.12, start + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.35)

      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = freq
      osc.connect(g)
      osc.start(start)
      osc.stop(start + 0.4)
      osc.onended = () => { osc.disconnect(); g.disconnect() }
    })
  })
  // Cymbal shimmer
  _noise(0.06, 0.4, 5000)
}

/** Death / collision — descending crunch */
function _playDeath(): void {
  stopShieldHumForced()
  // Crunchy sawtooth crash
  _osc('sawtooth', 200, 0.45, 0.6, (osc, _g, t) => {
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.5)
  })
  // Low boom
  _osc('sine', 80, 0.6, 0.7, (osc, _g, t) => {
    osc.frequency.exponentialRampToValueAtTime(20, t + 0.5)
  })
  // Noise burst
  _noise(0.4, 0.35, 100)
}

/** UI button tap — light click */
function _playUITap(): void {
  _osc('sine', 880, 0.12, 0.06, (osc, _g, t) => {
    osc.frequency.exponentialRampToValueAtTime(660, t + 0.05)
  })
  _noise(0.05, 0.04, 2000)
}
