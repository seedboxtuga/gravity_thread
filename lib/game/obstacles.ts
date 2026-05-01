// ============================================================
// Gravity Thread — Final Obstacle System (v3)
//
// 6 universal obstacle types + 5 biome signatures:
//
//   static_spike    — basic dodge; neon red spike pinned to thread top/bottom
//   void_wall       — full-height wall with one safe gap; flip through the gap
//   pulse_gate      — rhythmic gate; opens/closes on beat; timing obstacle
//   snap_blocker    — holds at edge, telegraphs, then snaps across in 150ms
//   thread_clamp    — two bars squeeze from both sides toward thread; sustained pressure
//   decay_spike     — starts as orange warning, activates to live red danger; delayed threat
//
//   glitch_firewall — Cyber Rail signature
//   prism_fan       — Crystal Rift signature
//   eruption_vent   — Magma Wire signature
//   pressure_ring   — Abyss Trench signature
//   piston_crusher  — Clockwork Spine signature
//
// Threat color system:
//   Neon red  (#ff1a1a) = active / live danger
//   Orange    (#ff6b00) = warning / about to activate
//   Yellow    (#ffd700) = brief activation flash
//   Cyan/biome accent   = safe, structural, player-side
// ============================================================

import type { Obstacle, ObstacleType, OrbSide } from './types'
import type { BiomeId, BiomeConfig } from './biomes'
import { CANVAS_WIDTH, CANVAS_HEIGHT, THREAD_Y } from './constants'

let obstacleId = 0

export function createObstacle(type: ObstacleType, x: number): Obstacle {
  const lane = getObstacleLane(type)
  return {
    id: `obs_${++obstacleId}`,
    type,
    x,
    width: getObstacleWidth(type),
    lane,
    active: true,
    pulsePhase: Math.random() * Math.PI * 2,
    timerPhase: Math.random() * Math.PI * 2,
    // snap_blocker — initialize at one edge
    blockPhase: 0,
    movingY: lane === 'top' ? -30 : 30,
    movingDir: lane === 'top' ? 1 : -1,
    snapStartY: lane === 'top' ? -30 : 30,
    snapEndY: lane === 'top' ? 30 : -30,
    telegraphIntensity: 0,
    isSnapping: false,
    // decay_spike
    decayPhase: 0,
    decayLive: false,
    // thread_clamp
    clampPhase: Math.random() * Math.PI * 2,
    // other
    bladeAngle: 0,
    warningShown: false,
    extendedPhase: 0,
    threadSightActive: false,
  }
}

function getObstacleWidth(type: ObstacleType): number {
  switch (type) {
    case 'static_spike':     return 18
    case 'void_wall':        return 16   // thin wall; gap is visual space beside it
    case 'pulse_gate':       return 28
    case 'snap_blocker':     return 48   // wide enough to force a real commitment
    case 'thread_clamp':     return 44
    case 'decay_spike':      return 18
    case 'glitch_firewall':  return 28
    case 'prism_fan':        return 36
    case 'eruption_vent':    return 24
    case 'pressure_ring':    return 40
    case 'piston_crusher':   return 30
    default:                 return 20
  }
}

function getObstacleLane(type: ObstacleType): Obstacle['lane'] {
  switch (type) {
    case 'static_spike':
    case 'pulse_gate':
    case 'snap_blocker':
    case 'decay_spike':
    case 'glitch_firewall':
    case 'prism_fan':
    case 'eruption_vent':
      return Math.random() > 0.5 ? 'top' : 'bottom'
    case 'void_wall':
      // gap_top = safe gap is on top, gap_bottom = safe gap is on bottom
      return Math.random() > 0.5 ? 'gap_top' : 'gap_bottom'
    case 'thread_clamp':
    case 'pressure_ring':
    case 'piston_crusher':
      return 'both'
    default:
      return 'top'
  }
}

// ============================================================
// Difficulty-based spawn pools
// ============================================================

// Early game — teach core: spikes + one timing obstacle
const POOL_EARLY: ObstacleType[] = [
  'static_spike', 'static_spike', 'static_spike',
  'void_wall',
  'pulse_gate',
]

// Mid game — introduce snap + delayed danger
const POOL_MID: ObstacleType[] = [
  'static_spike', 'static_spike',
  'void_wall',
  'pulse_gate',
  'snap_blocker',
  'decay_spike',
]

// Late game — clamp + full mix
const POOL_LATE: ObstacleType[] = [
  'static_spike',
  'void_wall',
  'pulse_gate',
  'snap_blocker',
  'thread_clamp',
  'decay_spike',
]

// Max intensity — everything in equal weight
const POOL_MAX: ObstacleType[] = [
  'static_spike',
  'void_wall',
  'pulse_gate',
  'snap_blocker',
  'thread_clamp',
  'decay_spike',
]

const BIOME_SIGNATURE: Record<BiomeId, ObstacleType> = {
  cyber_rail:      'glitch_firewall',
  crystal_rift:    'prism_fan',
  magma_wire:      'eruption_vent',
  abyss_trench:    'pressure_ring',
  clockwork_spine: 'piston_crusher',
}

export function pickObstacleType(
  difficulty: number,
  biomeId: BiomeId = 'cyber_rail',
  zone: number = 0
): ObstacleType {
  const signature = BIOME_SIGNATURE[biomeId]

  let pool: ObstacleType[]
  if (difficulty < 0.22) {
    pool = POOL_EARLY
  } else if (difficulty < 0.48) {
    pool = POOL_MID
  } else if (difficulty < 0.72) {
    pool = POOL_LATE
  } else {
    pool = POOL_MAX
  }

  // Biome signature appears from difficulty ≥ 0.35, increasing in late zones
  const signatureWeight = Math.min(0.08 + difficulty * 0.3 + zone * 0.07, 0.45)
  if (difficulty >= 0.35 && Math.random() < signatureWeight) {
    return signature
  }

  return pool[Math.floor(Math.random() * pool.length)]
}

// ============================================================
// Update logic
// ============================================================

export function updateObstacle(obs: Obstacle, dt: number, _t: number): void {

  // pulse_gate — open/close on rhythm
  if (obs.type === 'pulse_gate' || obs.type === 'glitch_firewall') {
    obs.pulsePhase = (obs.pulsePhase ?? 0) + dt * 3.5
  }

  // snap_blocker — hold 1000ms → telegraph 170ms → snap 150ms → repeat
  if (obs.type === 'snap_blocker') {
    obs.blockPhase = (obs.blockPhase ?? 0) + dt

    const HOLD      = 1.0    // 1000ms stationary
    const TELEGRAPH = 0.17   // 170ms warning pulse
    const SNAP      = 0.15   // 150ms fast movement
    const CYCLE     = HOLD + TELEGRAPH + SNAP

    const phase = obs.blockPhase % CYCLE

    if (phase < HOLD) {
      // Stationary — no movement
      obs.telegraphIntensity = 0
      obs.isSnapping = false
    } else if (phase < HOLD + TELEGRAPH) {
      // Telegraph — still stationary, pulsing warning
      obs.telegraphIntensity = (phase - HOLD) / TELEGRAPH
      obs.isSnapping = false
    } else {
      // Snap — fast interpolation from start to end edge
      obs.isSnapping = true
      obs.telegraphIntensity = 0
      const progress = (phase - HOLD - TELEGRAPH) / SNAP
      const clamped = Math.min(progress, 1.0)

      const from = obs.snapStartY ?? -30
      const to   = obs.snapEndY   ??  30

      obs.movingY = from + (to - from) * clamped

      // When snap completes, flip for next cycle
      if (progress >= 1.0) {
        obs.movingY = to
        obs.snapStartY = to
        obs.snapEndY   = from
        obs.movingDir  = -(obs.movingDir ?? 1)
      }
    }
  }

  // decay_spike — orange warning phase (0–800ms) → activates live red
  if (obs.type === 'decay_spike') {
    obs.decayPhase = Math.min((obs.decayPhase ?? 0) + dt, 1.0)
    obs.decayLive = (obs.decayPhase ?? 0) >= 0.65
  }

  // thread_clamp — squeeze cycle
  if (obs.type === 'thread_clamp') {
    obs.clampPhase = (obs.clampPhase ?? 0) + dt * 1.4
  }

  // pressure_ring — slow pulse squeeze
  if (obs.type === 'pressure_ring') {
    obs.pulsePhase = (obs.pulsePhase ?? 0) + dt * 2.8
  }

  // eruption_vent — timed burst
  if (obs.type === 'eruption_vent') {
    obs.timerPhase = (obs.timerPhase ?? 0) + dt * 2.5
  }

  // piston_crusher — rhythmic cycle
  if (obs.type === 'piston_crusher') {
    obs.timerPhase = (obs.timerPhase ?? 0) + dt * 3.0
  }

  // prism_fan — fan open/close
  if (obs.type === 'prism_fan') {
    obs.timerPhase = (obs.timerPhase ?? 0) + dt * 1.8
  }
}

// ============================================================
// Collision detection
// ============================================================

export function checkCollision(
  obs: Obstacle,
  orbX: number,
  orbY: number,
  orbRadius: number
): boolean {
  const hitboxes = getObstacleHitbox(obs)
  const r = orbRadius * 0.68  // slightly tighter hitbox = fairer feel
  for (const h of hitboxes) {
    const dx = Math.max(h.x - orbX, 0, orbX - (h.x + h.w))
    const dy = Math.max(h.y - orbY, 0, orbY - (h.y + h.h))
    if (dx * dx + dy * dy < r * r) return true
  }
  return false
}

export function checkNearMiss(
  obs: Obstacle,
  orbX: number,
  orbY: number,
  orbRadius: number
): boolean {
  const nearR = orbRadius * 2.4
  const hitboxes = getObstacleHitbox(obs)
  for (const h of hitboxes) {
    const dx = Math.max(h.x - orbX, 0, orbX - (h.x + h.w))
    const dy = Math.max(h.y - orbY, 0, orbY - (h.y + h.h))
    const d2 = dx * dx + dy * dy
    const innerR = orbRadius * 0.68
    if (d2 < nearR * nearR && d2 >= innerR * innerR) return true
  }
  return false
}

interface Rect { x: number; y: number; w: number; h: number }

export function getObstacleHitbox(obs: Obstacle): Rect[] {
  const cx = obs.x + obs.width / 2

  switch (obs.type) {

    // ---- Static Spike ----
    case 'static_spike': {
      const spikeH = 22
      const spikeW = 13
      if (obs.lane === 'top') {
        return [{ x: cx - spikeW / 2, y: THREAD_Y - spikeH - 3, w: spikeW, h: spikeH }]
      }
      return [{ x: cx - spikeW / 2, y: THREAD_Y + 3, w: spikeW, h: spikeH }]
    }

    // ---- Void Wall ----
    // Wall spans full play height; the safe gap exempts a 48px zone on one side
    case 'void_wall': {
      const wallX = obs.x
      const wallW = obs.width
      const safeGapH = 48
      if (obs.lane === 'gap_top') {
        // Safe zone is top; danger is bottom half
        return [{ x: wallX, y: THREAD_Y + 4, w: wallW, h: safeGapH + 20 }]
      }
      // Safe zone is bottom; danger is top half
      return [{ x: wallX, y: THREAD_Y - safeGapH - 20, w: wallW, h: safeGapH + 20 }]
    }

    // ---- Pulse Gate ----
    case 'pulse_gate': {
      const active = Math.sin(obs.pulsePhase ?? 0) > 0
      if (!active) return []
      const y1 = obs.lane === 'top' ? THREAD_Y - 55 : THREAD_Y + 5
      return [{ x: obs.x, y: y1, w: obs.width, h: 50 }]
    }

    // ---- Snap Blocker ----
    case 'snap_blocker': {
      const offset = obs.movingY ?? 0
      // Blocker is centered around thread, offset by current Y
      const blockH = 32
      const blockY = THREAD_Y - blockH / 2 + offset
      return [{ x: obs.x + 2, y: blockY, w: obs.width - 4, h: blockH }]
    }

    // ---- Thread Clamp ----
    case 'thread_clamp': {
      const cycle = Math.sin(obs.clampPhase ?? 0)
      const squeeze = (cycle * 0.5 + 0.5) * 12  // 0..12px inward
      // Two bars squeezing from top and bottom
      return [
        { x: obs.x, y: THREAD_Y - 52 + squeeze, w: obs.width, h: 20 },
        { x: obs.x, y: THREAD_Y + 32 - squeeze, w: obs.width, h: 20 },
      ]
    }

    // ---- Decay Spike ----
    case 'decay_spike': {
      // Only live when activated (decayPhase ≥ 0.65)
      if (!obs.decayLive) return []
      const spikeH = 22
      const spikeW = 13
      if (obs.lane === 'top') {
        return [{ x: cx - spikeW / 2, y: THREAD_Y - spikeH - 3, w: spikeW, h: spikeH }]
      }
      return [{ x: cx - spikeW / 2, y: THREAD_Y + 3, w: spikeW, h: spikeH }]
    }

    // ---- Glitch Firewall ----
    case 'glitch_firewall': {
      const active = Math.sin(obs.pulsePhase ?? 0) > 0
      if (!active) return []
      const y1 = obs.lane === 'top' ? THREAD_Y - 55 : THREAD_Y + 5
      return [{ x: obs.x, y: y1, w: obs.width, h: 50 }]
    }

    // ---- Prism Fan ----
    case 'prism_fan': {
      const active = Math.sin(obs.timerPhase ?? 0) > -0.3
      if (!active) return []
      const baseY = obs.lane === 'top' ? THREAD_Y - 52 : THREAD_Y + 6
      return [{ x: obs.x - 4, y: baseY, w: obs.width + 8, h: 46 }]
    }

    // ---- Eruption Vent ----
    case 'eruption_vent': {
      const erupting = Math.sin(obs.timerPhase ?? 0) > 0.4
      if (!erupting) return []
      const baseY = obs.lane === 'top' ? THREAD_Y - 60 : THREAD_Y + 4
      return [{ x: cx - 10, y: baseY, w: 20, h: 56 }]
    }

    // ---- Pressure Ring ----
    case 'pressure_ring': {
      const pulse = Math.sin(obs.pulsePhase ?? 0)
      const squeeze = (pulse * 0.5 + 0.5) * 8
      return [
        { x: obs.x, y: THREAD_Y - 50 + squeeze, w: obs.width, h: 18 },
        { x: obs.x, y: THREAD_Y + 32 - squeeze, w: obs.width, h: 18 },
      ]
    }

    // ---- Piston Crusher ----
    case 'piston_crusher': {
      const extended = Math.sin(obs.timerPhase ?? 0) > 0.5
      if (!extended) return []
      const baseY = obs.lane === 'top' ? THREAD_Y - 54 : THREAD_Y + 4
      return [{ x: cx - 12, y: baseY, w: 24, h: 50 }]
    }

    default:
      return []
  }
}

// ============================================================
// Drawing
// ============================================================

export function drawObstacle(
  ctx: CanvasRenderingContext2D,
  obs: Obstacle,
  t: number,
  biome?: BiomeConfig
): void {
  ctx.save()

  // Thread Sight pre-glow: if active, show early side indicator behind obstacle
  if (obs.threadSightActive) {
    drawThreadSightGlow(ctx, obs, biome)
  }

  switch (obs.type) {
    case 'static_spike':     drawStaticSpike(ctx, obs, biome); break
    case 'void_wall':        drawVoidWall(ctx, obs, t, biome); break
    case 'pulse_gate':       drawPulseGate(ctx, obs, t, biome); break
    case 'snap_blocker':     drawSnapBlocker(ctx, obs, t, biome); break
    case 'thread_clamp':     drawThreadClamp(ctx, obs, t, biome); break
    case 'decay_spike':      drawDecaySpike(ctx, obs, t, biome); break
    case 'glitch_firewall':  drawGlitchFirewall(ctx, obs, t, biome); break
    case 'prism_fan':        drawPrismFan(ctx, obs, t, biome); break
    case 'eruption_vent':    drawEruptionVent(ctx, obs, t, biome); break
    case 'pressure_ring':    drawPressureRing(ctx, obs, t, biome); break
    case 'piston_crusher':   drawPistonCrusher(ctx, obs, t, biome); break
  }

  ctx.restore()
}

// ============================================================
// Color helpers
// ============================================================

const NEON_RED      = '#ff1a1a'
const NEON_RED_GLOW = 'rgba(255,26,26,0.65)'
const WARN_ORANGE   = '#ff6b00'
const WARN_ORANGE_GLOW = 'rgba(255,107,0,0.55)'
const WARN_YELLOW   = '#ffd700'

function getAccent(biome?: BiomeConfig): string {
  return biome?.colors.accent ?? '#22d3ee'
}
function getAccentGlow(biome?: BiomeConfig): string {
  return biome?.colors.accentGlow ?? 'rgba(34,211,238,0.8)'
}
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ============================================================
// Thread Sight — pre-glow telegraph (shown on next 5 obstacles)
// ============================================================

function drawThreadSightGlow(
  ctx: CanvasRenderingContext2D,
  obs: Obstacle,
  biome?: BiomeConfig
): void {
  // Determine which side is dangerous
  let dangerSide: 'top' | 'bottom' | 'both' | null = null

  if (obs.lane === 'top') dangerSide = 'top'
  else if (obs.lane === 'bottom') dangerSide = 'bottom'
  else if (obs.lane === 'gap_top') dangerSide = 'bottom'  // gap on top = danger below
  else if (obs.lane === 'gap_bottom') dangerSide = 'top'  // gap on bottom = danger above
  else if (obs.lane === 'both') dangerSide = 'both'

  // snap_blocker danger side depends on current position
  if (obs.type === 'snap_blocker') {
    const offset = obs.movingY ?? 0
    dangerSide = offset > 0 ? 'bottom' : 'top'
  }

  // decay_spike: show threat glow starting well before it activates (give preview)
  if (obs.type === 'decay_spike') {
    // Show warning early, not just when live
    if (obs.decayPhase < 0.3) return  // too early, obstacle just spawned
  }

  if (!dangerSide) return

  const acc = getAccent(biome)
  const pulse = 0.6 + 0.4 * Math.sin(Date.now() * 0.008)  // more pronounced breathing

  const drawSideGlow = (side: 'top' | 'bottom') => {
    const sideY = side === 'top'
      ? THREAD_Y - 60
      : THREAD_Y + 12
    const glowH = 54
    
    // Main gradient glow — more opaque and extended
    ctx.globalAlpha = 0.35 * pulse  // increased from 0.18
    const grad = ctx.createLinearGradient(0, sideY, 0, sideY + (side === 'top' ? glowH : -glowH))
    grad.addColorStop(0, hexToRgba(NEON_RED, 0.7))    // more vivid start
    grad.addColorStop(0.5, hexToRgba(NEON_RED, 0.35))
    grad.addColorStop(1, 'transparent')
    ctx.fillStyle = grad
    ctx.fillRect(obs.x - 6, side === 'top' ? sideY : sideY - glowH, obs.width + 12, glowH)

    // Bright dashed border line on the thread edge — most readable indicator
    ctx.globalAlpha = 0.65 * pulse  // bright and clear
    ctx.strokeStyle = NEON_RED
    ctx.lineWidth = 2
    ctx.setLineDash([4, 3])
    ctx.beginPath()
    const lineY = side === 'top' ? THREAD_Y - 8 : THREAD_Y + 8
    ctx.moveTo(obs.x - 6, lineY)
    ctx.lineTo(obs.x + obs.width + 6, lineY)
    ctx.stroke()
    ctx.setLineDash([])

    // Side indicator directional arrow/tick using biome accent
    ctx.globalAlpha = 0.75 * pulse  // prominent
    ctx.fillStyle = acc
    ctx.font = 'bold 9px monospace'
    ctx.textAlign = 'center'
    const arrowY = side === 'top' ? THREAD_Y - 32 : THREAD_Y + 32
    ctx.fillText(side === 'top' ? '▼' : '▲', obs.x + obs.width / 2, arrowY)
    ctx.textAlign = 'left'
  }

  if (dangerSide === 'both') {
    drawSideGlow('top')
    drawSideGlow('bottom')
  } else {
    drawSideGlow(dangerSide)
  }

  ctx.globalAlpha = 1
}

// ============================================================
// Universal obstacle drawers
// ============================================================

// --- Static Spike ---
function drawStaticSpike(
  ctx: CanvasRenderingContext2D,
  obs: Obstacle,
  biome?: BiomeConfig
): void {
  const cx = obs.x + obs.width / 2
  const spikeH = 26
  const spikeW = 16
  const side = obs.lane === 'top' ? 'top' : 'bottom'
  const dir  = side === 'top' ? -1 : 1

  // Root anchor
  const rootW = spikeW + 4
  const rootH = 5
  const rootY = side === 'top' ? THREAD_Y - rootH : THREAD_Y
  ctx.shadowBlur = 10
  ctx.shadowColor = NEON_RED_GLOW
  ctx.fillStyle = NEON_RED
  ctx.fillRect(cx - rootW / 2, rootY, rootW, rootH)

  // Aura shimmer
  ctx.shadowBlur = 18
  ctx.shadowColor = hexToRgba(NEON_RED, 0.7)
  ctx.fillStyle = hexToRgba(NEON_RED, 0.07)
  ctx.beginPath()
  ctx.ellipse(cx, THREAD_Y + dir * (spikeH * 0.5), 26, 20, 0, 0, Math.PI * 2)
  ctx.fill()

  // Spike body
  ctx.shadowBlur = 18
  ctx.shadowColor = NEON_RED_GLOW
  ctx.fillStyle = NEON_RED
  ctx.beginPath()
  if (side === 'top') {
    ctx.moveTo(cx, THREAD_Y - 4)
    ctx.lineTo(cx - spikeW / 2, THREAD_Y - spikeH - 4)
    ctx.lineTo(cx, THREAD_Y - spikeH - 8)
    ctx.lineTo(cx + spikeW / 2, THREAD_Y - spikeH - 4)
  } else {
    ctx.moveTo(cx, THREAD_Y + 4)
    ctx.lineTo(cx - spikeW / 2, THREAD_Y + spikeH + 4)
    ctx.lineTo(cx, THREAD_Y + spikeH + 8)
    ctx.lineTo(cx + spikeW / 2, THREAD_Y + spikeH + 4)
  }
  ctx.closePath()
  ctx.fill()

  // Outline
  ctx.shadowBlur = 0
  ctx.strokeStyle = NEON_RED
  ctx.lineWidth = 1.5
  ctx.beginPath()
  if (side === 'top') {
    ctx.moveTo(cx, THREAD_Y - 4)
    ctx.lineTo(cx - spikeW / 2, THREAD_Y - spikeH - 4)
    ctx.lineTo(cx, THREAD_Y - spikeH - 8)
    ctx.lineTo(cx + spikeW / 2, THREAD_Y - spikeH - 4)
  } else {
    ctx.moveTo(cx, THREAD_Y + 4)
    ctx.lineTo(cx - spikeW / 2, THREAD_Y + spikeH + 4)
    ctx.lineTo(cx, THREAD_Y + spikeH + 8)
    ctx.lineTo(cx + spikeW / 2, THREAD_Y + spikeH + 4)
  }
  ctx.closePath()
  ctx.stroke()

  // Inner specular
  ctx.fillStyle = 'rgba(255,200,200,0.5)'
  ctx.beginPath()
  if (side === 'top') {
    ctx.moveTo(cx - 1, THREAD_Y - 6)
    ctx.lineTo(cx - 3.5, THREAD_Y - 22)
    ctx.lineTo(cx + 3.5, THREAD_Y - 22)
  } else {
    ctx.moveTo(cx - 1, THREAD_Y + 6)
    ctx.lineTo(cx - 3.5, THREAD_Y + 22)
    ctx.lineTo(cx + 3.5, THREAD_Y + 22)
  }
  ctx.closePath()
  ctx.fill()
  ctx.shadowBlur = 0
}

// --- Void Wall ---
// Full-height red wall with one safe gap (top or bottom side)
function drawVoidWall(
  ctx: CanvasRenderingContext2D,
  obs: Obstacle,
  t: number,
  biome?: BiomeConfig
): void {
  const wallX  = obs.x
  const wallW  = obs.width
  const safeH  = 56   // safe gap height
  const acc    = getAccent(biome)

  // Determine which side has the safe gap
  const gapOnTop = obs.lane === 'gap_top'

  // Danger zone fills the opposite side
  const dangerY1 = gapOnTop ? THREAD_Y + 6           : CANVAS_HEIGHT * 0.02
  const dangerH1 = gapOnTop ? CANVAS_HEIGHT * 0.5    : THREAD_Y - 6 - CANVAS_HEIGHT * 0.02
  const dangerY2 = gapOnTop ? 0                      : THREAD_Y - 6 - safeH
  const dangerH2 = gapOnTop ? THREAD_Y - 6 - safeH  : 0

  // Full wall fill — neon red
  ctx.shadowBlur = 16
  ctx.shadowColor = NEON_RED_GLOW
  ctx.fillStyle = hexToRgba(NEON_RED, 0.72)

  if (gapOnTop) {
    // Fill bottom danger zone
    ctx.fillRect(wallX, THREAD_Y + 6, wallW, CANVAS_HEIGHT - THREAD_Y - 6)
  } else {
    // Fill top danger zone
    ctx.fillRect(wallX, 0, wallW, THREAD_Y - 6)
  }

  // Safe gap — dark background void with accent border
  const gapY = gapOnTop ? THREAD_Y - 6 - safeH : THREAD_Y + 6
  ctx.shadowBlur = 0
  ctx.fillStyle = biome?.colors.bg[0] ?? '#060a14'
  ctx.fillRect(wallX, gapY, wallW, safeH)

  // Gap border lines — biome accent (safe = player-colored)
  ctx.strokeStyle = hexToRgba(acc, 0.75)
  ctx.lineWidth = 1.5
  ctx.shadowBlur = 6
  ctx.shadowColor = getAccentGlow(biome)

  ctx.beginPath()
  ctx.moveTo(wallX, gapY)
  ctx.lineTo(wallX + wallW, gapY)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(wallX, gapY + safeH)
  ctx.lineTo(wallX + wallW, gapY + safeH)
  ctx.stroke()
  ctx.shadowBlur = 0

  // Gap arrow — tells player which way to flip
  const arrowY = gapY + safeH / 2
  const arrowDir = gapOnTop ? '▲' : '▼'
  ctx.fillStyle = hexToRgba(acc, 0.6)
  ctx.font = 'bold 9px monospace'
  ctx.textAlign = 'center'
  ctx.fillText(arrowDir, wallX + wallW / 2, arrowY + 3)
  ctx.textAlign = 'left'

  // Animated scan lines on danger side
  ctx.globalAlpha = 0.12 + 0.06 * Math.sin(t * 5)
  ctx.strokeStyle = NEON_RED
  ctx.lineWidth = 1
  const scanStart = gapOnTop ? THREAD_Y + 10 : 4
  const scanEnd   = gapOnTop ? CANVAS_HEIGHT : THREAD_Y - 10
  for (let sy = scanStart; sy < scanEnd; sy += 10) {
    ctx.beginPath()
    ctx.moveTo(wallX, sy)
    ctx.lineTo(wallX + wallW, sy)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

// --- Pulse Gate ---
function drawPulseGate(
  ctx: CanvasRenderingContext2D,
  obs: Obstacle,
  t: number,
  biome?: BiomeConfig
): void {
  const pulse    = Math.sin(obs.pulsePhase ?? 0)
  const active   = pulse > 0
  const intensity = active ? Math.max(0, pulse) : 0
  const acc      = getAccent(biome)
  const accGlow  = getAccentGlow(biome)

  const y1 = obs.lane === 'top' ? THREAD_Y - 60 : THREAD_Y + 8
  const y2 = obs.lane === 'top' ? THREAD_Y - 8  : THREAD_Y + 60
  const cx = obs.x + obs.width / 2

  // Frame columns — always visible
  ctx.shadowBlur = active ? 14 : 5
  ctx.shadowColor = active ? NEON_RED_GLOW : WARN_ORANGE_GLOW
  ctx.fillStyle = active
    ? hexToRgba(NEON_RED, 0.55 + intensity * 0.4)
    : hexToRgba(WARN_ORANGE, 0.45)
  ctx.fillRect(obs.x, y1, 4, y2 - y1)
  ctx.fillRect(obs.x + obs.width - 4, y1, 4, y2 - y1)

  if (active) {
    // Danger fill
    const grad = ctx.createLinearGradient(obs.x, 0, obs.x + obs.width, 0)
    grad.addColorStop(0, `${NEON_RED}00`)
    grad.addColorStop(0.5, hexToRgba(NEON_RED, intensity * 0.35))
    grad.addColorStop(1, `${NEON_RED}00`)
    ctx.fillStyle = grad
    ctx.shadowBlur = 18
    ctx.shadowColor = NEON_RED_GLOW
    ctx.fillRect(obs.x, y1, obs.width, y2 - y1)

    // Electric arcs
    ctx.strokeStyle = hexToRgba(NEON_RED, 0.45 + intensity * 0.35)
    ctx.lineWidth = 1.5
    for (let i = 0; i < 3; i++) {
      ctx.beginPath()
      const sy = y1 + (i / 2) * (y2 - y1) + Math.sin(t * 9 + i * 2) * 5
      ctx.moveTo(obs.x + 4, sy)
      ctx.quadraticCurveTo(
        cx + Math.sin(t * 13 + i) * 8, sy + (y2 - y1) / 6,
        obs.x + obs.width - 4, sy
      )
      ctx.stroke()
    }
  }

  // Node dot
  ctx.fillStyle = active ? hexToRgba(NEON_RED, 0.9) : hexToRgba(WARN_ORANGE, 0.6)
  ctx.shadowBlur = active ? 10 : 4
  ctx.shadowColor = active ? NEON_RED_GLOW : WARN_ORANGE_GLOW
  ctx.beginPath()
  ctx.arc(cx, obs.lane === 'top' ? y1 - 4 : y2 + 4, 3.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
}

// --- Snap Blocker ---
// Wide bar at thread center that snaps left/right; hold → telegraph → snap → hold
function drawSnapBlocker(
  ctx: CanvasRenderingContext2D,
  obs: Obstacle,
  t: number,
  biome?: BiomeConfig
): void {
  const offset = obs.movingY ?? 0
  const blockH = 32
  const blockY = THREAD_Y - blockH / 2 + offset
  const telegraphIntensity = obs.telegraphIntensity ?? 0
  const isSnapping = obs.isSnapping ?? false

  // Shadow intensity by phase
  if (telegraphIntensity > 0) {
    ctx.shadowBlur = 20 + telegraphIntensity * 14
    ctx.shadowColor = `rgba(255,26,26,${0.7 + telegraphIntensity * 0.3})`
  } else if (isSnapping) {
    ctx.shadowBlur = 16
    ctx.shadowColor = NEON_RED_GLOW
  } else {
    ctx.shadowBlur = 12
    ctx.shadowColor = NEON_RED_GLOW
  }

  // Main body
  ctx.fillStyle = NEON_RED
  ctx.strokeStyle = hexToRgba(NEON_RED, 0.7)
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.roundRect(obs.x, blockY, obs.width, blockH, 4)
  ctx.fill()
  ctx.stroke()

  ctx.shadowBlur = 0

  // Inner highlight
  ctx.fillStyle = 'rgba(255,200,200,0.13)'
  ctx.beginPath()
  ctx.roundRect(obs.x + 3, blockY + 3, obs.width - 6, blockH - 6, 2)
  ctx.fill()

  // Direction indicator — which way it will snap next
  const acc = getAccent(biome)
  ctx.fillStyle = hexToRgba(acc, 0.8)
  ctx.font = 'bold 10px monospace'
  ctx.textAlign = 'center'
  // Show where blocker is heading
  const nextDir = (obs.snapEndY ?? 30) > 0 ? '▼' : '▲'
  ctx.fillText(nextDir, obs.x + obs.width / 2, blockY + blockH / 2 + 4)
  ctx.textAlign = 'left'

  // Telegraph warning shimmer
  if (telegraphIntensity > 0) {
    const pulseAlpha = Math.max(0, Math.sin(telegraphIntensity * Math.PI * 5) * 0.35 + 0.15)
    ctx.fillStyle = `rgba(255,100,100,${pulseAlpha * 0.28})`
    ctx.beginPath()
    ctx.roundRect(obs.x + 1, blockY + 1, obs.width - 2, blockH - 2, 3)
    ctx.fill()
  }

  // Snap motion trail — brief fade behind direction of travel
  if (isSnapping) {
    const trailDir = (obs.movingDir ?? 1)
    const trailY   = blockY - trailDir * 10
    ctx.globalAlpha = 0.15
    ctx.fillStyle = NEON_RED
    ctx.beginPath()
    ctx.roundRect(obs.x + 3, trailY, obs.width - 6, blockH, 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }
}

// --- Thread Clamp ---
// Two bars from top and bottom that squeeze toward the thread on a slow cycle
function drawThreadClamp(
  ctx: CanvasRenderingContext2D,
  obs: Obstacle,
  t: number,
  biome?: BiomeConfig
): void {
  const cycle   = Math.sin(obs.clampPhase ?? 0)
  const squeeze = (cycle * 0.5 + 0.5) * 12  // 0..12 px inward on peak
  const barH    = 20
  const acc     = getAccent(biome)
  const accGlow = getAccentGlow(biome)

  // Pulsing red intensity on squeeze peak
  const intensity = cycle * 0.5 + 0.5

  // Top bar
  ctx.shadowBlur = 10 + intensity * 8
  ctx.shadowColor = NEON_RED_GLOW
  const topY = THREAD_Y - 52 + squeeze
  const topGrad = ctx.createLinearGradient(0, topY, 0, topY + barH)
  topGrad.addColorStop(0, hexToRgba(NEON_RED, 0.9))
  topGrad.addColorStop(1, hexToRgba(NEON_RED, 0.35))
  ctx.fillStyle = topGrad
  ctx.fillRect(obs.x, topY, obs.width, barH)

  // Bottom bar
  const botY = THREAD_Y + 32 - squeeze
  const botGrad = ctx.createLinearGradient(0, botY, 0, botY + barH)
  botGrad.addColorStop(0, hexToRgba(NEON_RED, 0.35))
  botGrad.addColorStop(1, hexToRgba(NEON_RED, 0.9))
  ctx.fillStyle = botGrad
  ctx.fillRect(obs.x, botY, obs.width, barH)

  ctx.shadowBlur = 0

  // Biome accent corner brackets
  ctx.strokeStyle = hexToRgba(acc, 0.4)
  ctx.shadowColor = accGlow
  ctx.shadowBlur = 4
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(obs.x + 2, topY + barH)
  ctx.lineTo(obs.x + 2, botY)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(obs.x + obs.width - 2, topY + barH)
  ctx.lineTo(obs.x + obs.width - 2, botY)
  ctx.stroke()

  // Safe corridor indicator line (center)
  ctx.strokeStyle = hexToRgba(acc, 0.22 + intensity * 0.1)
  ctx.lineWidth = 0.75
  ctx.beginPath()
  ctx.moveTo(obs.x, THREAD_Y)
  ctx.lineTo(obs.x + obs.width, THREAD_Y)
  ctx.stroke()
  ctx.shadowBlur = 0
}

// --- Decay Spike ---
// Starts as orange warning glow, activates to live red danger at 65% of travel
function drawDecaySpike(
  ctx: CanvasRenderingContext2D,
  obs: Obstacle,
  t: number,
  biome?: BiomeConfig
): void {
  const cx      = obs.x + obs.width / 2
  const spikeH  = 26
  const spikeW  = 16
  const side    = obs.lane === 'top' ? 'top' : 'bottom'
  const decay   = obs.decayPhase ?? 0
  const live    = obs.decayLive ?? false

  // Before activation: orange warning glow (0..65% of decay)
  // After activation:  full neon red
  const warningProgress = Math.min(decay / 0.65, 1.0)
  const liveProgress    = live ? Math.min((decay - 0.65) / 0.35, 1.0) : 0

  // Core color interpolation: orange → red
  const color     = live ? NEON_RED : WARN_ORANGE
  const glowColor = live ? NEON_RED_GLOW : WARN_ORANGE_GLOW
  const alpha     = live ? 0.9 : 0.3 + warningProgress * 0.5

  // Root anchor
  const rootY = side === 'top' ? THREAD_Y - 5 : THREAD_Y
  ctx.shadowBlur = live ? 14 : 6
  ctx.shadowColor = glowColor
  ctx.fillStyle = hexToRgba(color, alpha)
  ctx.fillRect(cx - 10, rootY, 20, 5)

  // Spike body — scales in during warning phase, full on activation
  const scaleH = live ? spikeH : spikeH * (0.3 + warningProgress * 0.7)
  ctx.shadowBlur = live ? 18 : 8
  ctx.shadowColor = glowColor
  ctx.fillStyle = hexToRgba(color, alpha)
  ctx.beginPath()
  if (side === 'top') {
    ctx.moveTo(cx, THREAD_Y - 4)
    ctx.lineTo(cx - spikeW / 2, THREAD_Y - scaleH - 4)
    ctx.lineTo(cx, THREAD_Y - scaleH - 8)
    ctx.lineTo(cx + spikeW / 2, THREAD_Y - scaleH - 4)
  } else {
    ctx.moveTo(cx, THREAD_Y + 4)
    ctx.lineTo(cx - spikeW / 2, THREAD_Y + scaleH + 4)
    ctx.lineTo(cx, THREAD_Y + scaleH + 8)
    ctx.lineTo(cx + spikeW / 2, THREAD_Y + scaleH + 4)
  }
  ctx.closePath()
  ctx.fill()

  // Outline
  ctx.strokeStyle = hexToRgba(color, alpha * 0.8)
  ctx.lineWidth = 1.5
  ctx.shadowBlur = 0
  ctx.beginPath()
  if (side === 'top') {
    ctx.moveTo(cx, THREAD_Y - 4)
    ctx.lineTo(cx - spikeW / 2, THREAD_Y - scaleH - 4)
    ctx.lineTo(cx, THREAD_Y - scaleH - 8)
    ctx.lineTo(cx + spikeW / 2, THREAD_Y - scaleH - 4)
  } else {
    ctx.moveTo(cx, THREAD_Y + 4)
    ctx.lineTo(cx - spikeW / 2, THREAD_Y + scaleH + 4)
    ctx.lineTo(cx, THREAD_Y + scaleH + 8)
    ctx.lineTo(cx + spikeW / 2, THREAD_Y + scaleH + 4)
  }
  ctx.closePath()
  ctx.stroke()

  // Activation flash — brief yellow burst when going live
  if (live && liveProgress < 0.3) {
    const flashAlpha = (1 - liveProgress / 0.3) * 0.45
    ctx.fillStyle = hexToRgba(WARN_YELLOW, flashAlpha)
    ctx.shadowBlur = 20
    ctx.shadowColor = WARN_YELLOW
    ctx.beginPath()
    if (side === 'top') {
      ctx.moveTo(cx, THREAD_Y - 4)
      ctx.lineTo(cx - spikeW / 2 - 2, THREAD_Y - spikeH - 6)
      ctx.lineTo(cx, THREAD_Y - spikeH - 12)
      ctx.lineTo(cx + spikeW / 2 + 2, THREAD_Y - spikeH - 6)
    } else {
      ctx.moveTo(cx, THREAD_Y + 4)
      ctx.lineTo(cx - spikeW / 2 - 2, THREAD_Y + spikeH + 6)
      ctx.lineTo(cx, THREAD_Y + spikeH + 12)
      ctx.lineTo(cx + spikeW / 2 + 2, THREAD_Y + spikeH + 6)
    }
    ctx.closePath()
    ctx.fill()
    ctx.shadowBlur = 0
  }

  // Warning pulse ring (pre-activation)
  if (!live) {
    const ringAlpha = 0.08 + 0.12 * Math.sin(t * 5) * warningProgress
    ctx.strokeStyle = hexToRgba(WARN_ORANGE, ringAlpha)
    ctx.lineWidth = 1
    ctx.shadowBlur = 4
    ctx.shadowColor = WARN_ORANGE_GLOW
    ctx.beginPath()
    ctx.arc(cx, side === 'top' ? THREAD_Y - scaleH / 2 - 4 : THREAD_Y + scaleH / 2 + 4, 14, 0, Math.PI * 2)
    ctx.stroke()
    ctx.shadowBlur = 0
  }
}

// ============================================================
// Biome signature obstacles
// ============================================================

// --- Glitch Firewall (Cyber Rail) ---
function drawGlitchFirewall(
  ctx: CanvasRenderingContext2D,
  obs: Obstacle,
  t: number,
  biome?: BiomeConfig
): void {
  const pulse     = Math.sin(obs.pulsePhase ?? 0)
  const active    = pulse > 0
  const intensity = active ? Math.max(0, pulse) : 0
  const acc       = getAccent(biome)
  const accGlow   = getAccentGlow(biome)

  const y1 = obs.lane === 'top' ? THREAD_Y - 62 : THREAD_Y + 8
  const y2 = obs.lane === 'top' ? THREAD_Y - 8  : THREAD_Y + 62
  const cx = obs.x + obs.width / 2

  ctx.shadowBlur  = active ? 16 : 6
  ctx.shadowColor = active ? NEON_RED_GLOW : hexToRgba(acc, 0.5)
  ctx.fillStyle   = active ? hexToRgba(NEON_RED, 0.6 + intensity * 0.35) : hexToRgba(acc, 0.5)
  ctx.fillRect(obs.x, y1, 4, y2 - y1)
  ctx.fillRect(obs.x + obs.width - 4, y1, 4, y2 - y1)

  if (active) {
    const grad = ctx.createLinearGradient(obs.x, y1, obs.x, y2)
    grad.addColorStop(0, hexToRgba(NEON_RED, 0))
    grad.addColorStop(0.5, hexToRgba(NEON_RED, intensity * 0.3))
    grad.addColorStop(1, hexToRgba(NEON_RED, 0))
    ctx.fillStyle = grad
    ctx.fillRect(obs.x + 4, y1, obs.width - 8, y2 - y1)

    ctx.strokeStyle = hexToRgba(NEON_RED, 0.55)
    ctx.lineWidth = 1.5
    for (let i = 0; i < 5; i++) {
      const ly     = y1 + (i / 4) * (y2 - y1) + Math.sin(t * 11 + i * 1.8) * 4
      const jitter = Math.sin(t * 20 + i) * 3
      ctx.beginPath()
      ctx.moveTo(obs.x + 4 + jitter, ly)
      ctx.lineTo(obs.x + obs.width - 4 - jitter, ly)
      ctx.stroke()
    }

    ctx.fillStyle = hexToRgba(acc, 0.15)
    ctx.fillRect(obs.x + 2 + Math.sin(t * 14) * 4, y1 + (y2 - y1) * 0.3, obs.width - 4, (y2 - y1) * 0.1)
  } else {
    ctx.strokeStyle = hexToRgba(WARN_ORANGE, 0.35)
    ctx.lineWidth = 0.75
    for (let ly = y1 + 4; ly < y2 - 4; ly += 8) {
      ctx.beginPath()
      ctx.moveTo(obs.x + 4, ly)
      ctx.lineTo(obs.x + obs.width - 4, ly)
      ctx.stroke()
    }
  }

  ctx.fillStyle  = active ? hexToRgba(NEON_RED, 0.9) : hexToRgba(acc, 0.6)
  ctx.shadowBlur = active ? 10 : 4
  ctx.shadowColor = active ? NEON_RED_GLOW : accGlow
  ctx.beginPath()
  ctx.arc(cx, obs.lane === 'top' ? y1 - 4 : y2 + 4, 3.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
}

// --- Prism Fan (Crystal Rift) ---
function drawPrismFan(
  ctx: CanvasRenderingContext2D,
  obs: Obstacle,
  t: number,
  biome?: BiomeConfig
): void {
  const cx     = obs.x + obs.width / 2
  const phase  = Math.sin(obs.timerPhase ?? 0)
  const open   = (phase + 1) / 2
  const spread = open * 42
  const baseY  = obs.lane === 'top' ? THREAD_Y - 8 : THREAD_Y + 8
  const acc    = getAccent(biome)

  ctx.shadowBlur = 14
  ctx.shadowColor = NEON_RED_GLOW

  for (let i = 0; i < 3; i++) {
    const offset = (i - 1) * spread * 0.5
    const bladeY = baseY + (obs.lane === 'top' ? -28 - spread + offset : 28 + spread - offset)
    const alpha  = 0.85 - i * 0.15
    ctx.strokeStyle = hexToRgba(NEON_RED, alpha)
    ctx.lineWidth   = 3 - i * 0.5
    ctx.beginPath()
    ctx.moveTo(cx + (i - 1) * 8, baseY)
    ctx.lineTo(cx + (i - 1) * 14, bladeY)
    ctx.stroke()
    ctx.fillStyle = hexToRgba(NEON_RED, alpha)
    ctx.beginPath()
    ctx.arc(cx + (i - 1) * 14, bladeY, 3.5, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.shadowBlur  = 6
  ctx.shadowColor = hexToRgba(acc, 0.6)
  ctx.strokeStyle = hexToRgba(acc, 0.55)
  ctx.lineWidth   = 2
  ctx.beginPath()
  ctx.moveTo(cx - 12, baseY)
  ctx.lineTo(cx + 12, baseY)
  ctx.stroke()

  if (open > 0.5) {
    ctx.strokeStyle = hexToRgba(WARN_ORANGE, 0.4)
    ctx.lineWidth   = 1
    ctx.shadowBlur  = 4
    ctx.shadowColor = WARN_ORANGE_GLOW
    ctx.beginPath()
    ctx.arc(cx, baseY, spread * 0.75, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.shadowBlur = 0
}

// --- Eruption Vent (Magma Wire) ---
function drawEruptionVent(
  ctx: CanvasRenderingContext2D,
  obs: Obstacle,
  t: number,
  biome?: BiomeConfig
): void {
  const cx       = obs.x + obs.width / 2
  const phase    = Math.sin(obs.timerPhase ?? 0)
  const erupting = phase > 0.4
  const intensity = Math.max(0, (phase - 0.4) / 0.6)
  const acc      = getAccent(biome)

  const baseY = obs.lane === 'top' ? THREAD_Y - 5 : THREAD_Y + 5 - 8
  ctx.shadowBlur  = erupting ? 20 : 6
  ctx.shadowColor = erupting ? NEON_RED_GLOW : WARN_ORANGE_GLOW
  ctx.fillStyle   = hexToRgba(erupting ? NEON_RED : WARN_ORANGE, erupting ? 0.75 : 0.35)
  ctx.fillRect(cx - 10, baseY, 20, 8)

  if (erupting) {
    const dir    = obs.lane === 'top' ? -1 : 1
    const colH   = 55 * intensity
    const gradY1 = baseY + (obs.lane === 'top' ? -colH : 0)
    const gradY2 = baseY + (obs.lane === 'top' ? 0 : colH)
    const grad   = ctx.createLinearGradient(0, gradY1, 0, gradY2)
    grad.addColorStop(0, hexToRgba(WARN_ORANGE, 0))
    grad.addColorStop(0.4, hexToRgba(WARN_ORANGE, 0.55 * intensity))
    grad.addColorStop(1, hexToRgba(NEON_RED, 0.9 * intensity))
    ctx.fillStyle = grad
    ctx.shadowBlur = 14
    ctx.shadowColor = NEON_RED_GLOW
    ctx.fillRect(cx - 10, gradY1, 20, Math.abs(gradY2 - gradY1))

    for (let i = 0; i < 3; i++) {
      const py = baseY + dir * (colH * 0.7 + Math.sin(t * 8 + i) * 7)
      ctx.fillStyle = hexToRgba(WARN_ORANGE, 0.7 * intensity)
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.arc(cx + (i - 1) * 6, py, 4 + i, 0, Math.PI * 2)
      ctx.fill()
    }
  } else {
    const warnAlpha = 0.12 + 0.14 * Math.sin(t * 6)
    ctx.fillStyle  = hexToRgba(WARN_ORANGE, warnAlpha)
    ctx.shadowBlur = 4
    ctx.shadowColor = WARN_ORANGE_GLOW
    const dir = obs.lane === 'top' ? -1 : 1
    ctx.fillRect(cx - 10, baseY, 20, dir * 20)
  }
  ctx.shadowBlur = 0
}

// --- Pressure Ring (Abyss Trench) ---
function drawPressureRing(
  ctx: CanvasRenderingContext2D,
  obs: Obstacle,
  t: number,
  biome?: BiomeConfig
): void {
  const cx      = obs.x + obs.width / 2
  const pulse   = Math.sin((obs.pulsePhase ?? 0) * 1.5) * 0.5 + 0.5
  const acc     = getAccent(biome)
  const accGlow = getAccentGlow(biome)
  const squeeze = pulse * 8

  ctx.shadowBlur  = 12 + pulse * 8
  ctx.shadowColor = NEON_RED_GLOW

  const topGrad = ctx.createLinearGradient(0, THREAD_Y - 50 + squeeze, 0, THREAD_Y - 30 + squeeze)
  topGrad.addColorStop(0, hexToRgba(NEON_RED, 0.9))
  topGrad.addColorStop(1, hexToRgba(NEON_RED, 0.4))
  ctx.fillStyle = topGrad
  ctx.fillRect(obs.x, THREAD_Y - 50 + squeeze, obs.width, 18)

  const botGrad = ctx.createLinearGradient(0, THREAD_Y + 32 - squeeze, 0, THREAD_Y + 50 - squeeze)
  botGrad.addColorStop(0, hexToRgba(NEON_RED, 0.4))
  botGrad.addColorStop(1, hexToRgba(NEON_RED, 0.9))
  ctx.fillStyle = botGrad
  ctx.fillRect(obs.x, THREAD_Y + 32 - squeeze, obs.width, 18)

  ctx.shadowBlur  = 5
  ctx.shadowColor = accGlow
  ctx.strokeStyle = hexToRgba(acc, 0.45)
  ctx.lineWidth   = 1
  ctx.beginPath()
  ctx.moveTo(obs.x + 2, THREAD_Y - 32 + squeeze)
  ctx.lineTo(obs.x + 2, THREAD_Y + 32 - squeeze)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(obs.x + obs.width - 2, THREAD_Y - 32 + squeeze)
  ctx.lineTo(obs.x + obs.width - 2, THREAD_Y + 32 - squeeze)
  ctx.stroke()

  ctx.strokeStyle = hexToRgba(NEON_RED, 0.2 + pulse * 0.25)
  ctx.lineWidth   = 1
  for (let i = 0; i < 3; i++) {
    const py = THREAD_Y - 50 + squeeze + i * 6
    ctx.beginPath()
    ctx.moveTo(obs.x, py)
    ctx.lineTo(obs.x + obs.width, py)
    ctx.stroke()
  }
  ctx.shadowBlur = 0
}

// --- Piston Crusher (Clockwork Spine) ---
function drawPistonCrusher(
  ctx: CanvasRenderingContext2D,
  obs: Obstacle,
  t: number,
  biome?: BiomeConfig
): void {
  const cx       = obs.x + obs.width / 2
  const phase    = Math.sin(obs.timerPhase ?? 0)
  const extended = phase > 0.5
  const travel   = Math.max(0, (phase - 0.5) / 0.5)
  const acc      = getAccent(biome)
  const accGlow  = getAccentGlow(biome)

  const pistonBaseY = obs.lane === 'top' ? THREAD_Y - 14 : THREAD_Y + 14
  const pistonH     = 40
  const dir         = obs.lane === 'top' ? -1 : 1
  const pistonY     = pistonBaseY + dir * travel * pistonH * 0.8

  // Housing (always visible — biome accent)
  ctx.shadowBlur  = 6
  ctx.shadowColor = accGlow
  ctx.fillStyle   = hexToRgba(acc, 0.4)
  ctx.fillRect(cx - 14, pistonBaseY - (obs.lane === 'top' ? pistonH * 0.3 : 0), 28, pistonH * 0.3)

  // Piston rod
  ctx.strokeStyle = hexToRgba(acc, 0.35)
  ctx.lineWidth   = 3
  ctx.beginPath()
  ctx.moveTo(cx, pistonBaseY)
  ctx.lineTo(cx, pistonY)
  ctx.stroke()

  // Crusher head — neon red when extended
  ctx.shadowBlur  = extended ? 18 : 6
  ctx.shadowColor = extended ? NEON_RED_GLOW : hexToRgba(WARN_ORANGE, 0.5)
  ctx.fillStyle   = extended ? hexToRgba(NEON_RED, 0.85 + travel * 0.15) : hexToRgba(WARN_ORANGE, 0.4)
  ctx.fillRect(cx - 12, pistonY, 24, obs.lane === 'top' ? -pistonH * 0.55 : pistonH * 0.55)

  // Impact flash on full extension
  if (travel > 0.85) {
    const flashAlpha = (travel - 0.85) / 0.15 * 0.4
    ctx.fillStyle = hexToRgba(WARN_YELLOW, flashAlpha)
    ctx.shadowBlur = 12
    ctx.shadowColor = WARN_YELLOW
    ctx.fillRect(cx - 14, pistonY, 28, obs.lane === 'top' ? -pistonH * 0.6 : pistonH * 0.6)
  }
  ctx.shadowBlur = 0
}
