import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  THREAD_Y,
  THREAD_HEIGHT,
  ORB_X,
  ORB_RADIUS,
  ORB_OFFSET_Y,
  FLIP_DURATION,
  BASE_SPEED,
  MAX_SPEED_ENDLESS,
  SPEED_INCREASE_RATE,
  MIN_SPAWN_INTERVAL,
  MAX_SPAWN_INTERVAL,
  MIN_SPAWN_GAP,
  MODE_CONFIG,
  PHASE_CORE_SPAWN_INTERVAL,
  PHASE_CORE_RADIUS,
  BG_ZONE_THRESHOLDS,
} from './constants'
import type { OrbRingStyle } from './constants'
import type {
  GameState,
  GameMode,
  OrbSide,
  Obstacle,
  PowerUp,
  Particle,
  FloatingText,
  GameStats,
} from './types'
import type { BiomeId, BiomeConfig } from './biomes'
import { getBiome, CYBER_RAIL } from './biomes'
import {
  createObstacle,
  pickObstacleType,
  updateObstacle,
  checkCollision,
  checkNearMiss,
  drawObstacle,
} from './obstacles'
import {
  calcSurvivalScore,
  calcObstacleBonus,
  calcNearMissBonus,
  calcComboMultiplier,
} from './scoring'

export interface MilestoneEvent {
  id: string
  text: string
  subtext: string
  color: string
  life: number
  maxLife: number
}

export interface EngineState {
  gameState: GameState
  stats: GameStats
  orbSide: OrbSide
  flipProgress: number // 0..1
  isFlipping: boolean
  speed: number
  difficulty: number
  obstacles: Obstacle[]
  powerUps: PowerUp[]
  particles: Particle[]
  floatingTexts: FloatingText[]
  milestones: MilestoneEvent[]
  elapsedTime: number
  nextSpawnTime: number
  lastObstacleX: number
  shakeIntensity: number
  trailPoints: Array<{ x: number; y: number; alpha: number }>
  passedObstacles: Set<string>
  nearMissObstacles: Set<string>
  orbColor: string
  orbGlow: string
  orbTrail: string
  orbRingStyle: OrbRingStyle
  // Phase Core — shield lasts until hit (no time limit)
  phaseActive: boolean
  shieldBreaking: boolean
  shieldBreakTimer: number
  nextPowerUpTime: number
  // Thread Sight — previews dangerous side on next N obstacles
  threadSightCharges: number  // 0 = inactive; 1-5 = active, charges consumed per obstacle tagged
  // Background zone (0=calm, 1=grid, 2=plasma, 3=hypercore)
  bgZone: number
  bgZoneBlend: number // 0..1 blend toward next zone
  bgStreaks: Array<{ x: number; y: number; len: number; speed: number; alpha: number; color: string }>
  bgParticles: Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number }>
  // Biome
  biomeId: BiomeId
  biome: BiomeConfig
  // Flow state — builds when doing well
  flowIntensity: number // 0..1
  // Vertical follow line — tracks orb Y position with easing
  followLineY: number // smoothed Y position for the neon follow line
}

let particleId = 0
let floatId = 0
let milestoneId = 0

export function createInitialState(mode: GameMode, biomeId: BiomeId = 'cyber_rail'): EngineState {
  const biome = getBiome(biomeId)
  return {
    gameState: 'idle',
    stats: {
      score: 0,
      bestScore: 0,
      combo: 0,
      maxCombo: 0,
      nearMisses: 0,
      distance: 0,
      flips: 0,
      streak: 0,
      phaseCoresCollected: 0,
      zoneReached: 0,
    },
    orbSide: 'top',
    flipProgress: 0,
    isFlipping: false,
    speed: BASE_SPEED * MODE_CONFIG[mode].speedMultiplier,
    difficulty: 0,
    obstacles: [],
    powerUps: [],
    particles: [],
    floatingTexts: [],
    milestones: [],
    elapsedTime: 0,
    nextSpawnTime: 0.8,
    lastObstacleX: CANVAS_WIDTH,
    shakeIntensity: 0,
    trailPoints: [],
    passedObstacles: new Set(),
    nearMissObstacles: new Set(),
    orbColor: biome.colors.orb,
    orbGlow: biome.colors.orbGlow,
    orbTrail: biome.colors.orbTrail,
    orbRingStyle: 'clean_orbit',
    phaseActive: false,
    shieldBreaking: false,
    shieldBreakTimer: 0,
    nextPowerUpTime: PHASE_CORE_SPAWN_INTERVAL * 0.6,
    threadSightCharges: 0,
    bgZone: 0,
    bgZoneBlend: 0,
    bgStreaks: initStreaks(biome),
    bgParticles: [],
    biomeId,
    biome,
    flowIntensity: 0,
    followLineY: THREAD_Y,
  }
}

let powerUpId = 0

function initStreaks(biome: BiomeConfig): EngineState['bgStreaks'] {
  const streaks: EngineState['bgStreaks'] = []
  for (let i = 0; i < 12; i++) {
    streaks.push(makeStreak(biome))
  }
  return streaks
}

function makeStreak(biome: BiomeConfig): EngineState['bgStreaks'][number] {
  const colors = biome.colors.bgStreak
  return {
    x: Math.random() * CANVAS_WIDTH,
    y: Math.random() * CANVAS_HEIGHT,
    len: 40 + Math.random() * 120,
    speed: 60 + Math.random() * 140,
    alpha: 0.04 + Math.random() * 0.08,
    color: colors[Math.floor(Math.random() * colors.length)],
  }
}

export function startRun(state: EngineState, mode: GameMode, biomeId?: BiomeId): void {
  const best = state.stats.bestScore
  const newBiomeId = biomeId ?? state.biomeId
  const initial = createInitialState(mode, newBiomeId)
  Object.assign(state, initial)
  state.stats.bestScore = best
  state.gameState = 'playing'
  state.nextSpawnTime = 1.2
}

export function flipOrb(state: EngineState): void {
  if (state.gameState !== 'playing') return
  state.isFlipping = true
  state.flipProgress = 0
  state.orbSide = state.orbSide === 'top' ? 'bottom' : 'top'
  state.stats.flips++
  state.stats.combo++
  if (state.stats.combo > state.stats.maxCombo) {
    state.stats.maxCombo = state.stats.combo
  }
}

export function getOrbY(state: EngineState): number {
  const targetY =
    state.orbSide === 'top'
      ? THREAD_Y - ORB_OFFSET_Y
      : THREAD_Y + ORB_OFFSET_Y

  if (!state.isFlipping) return targetY

  const fromY =
    state.orbSide === 'top'
      ? THREAD_Y + ORB_OFFSET_Y
      : THREAD_Y - ORB_OFFSET_Y

  const t = state.flipProgress
  const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
  return fromY + (targetY - fromY) * eased
}

export function update(
  state: EngineState,
  dt: number,
  mode: GameMode
): void {
  if (state.gameState !== 'playing') return

  const dtCapped = Math.min(dt, 0.05)
  state.elapsedTime += dtCapped

  // Update speed
  const baseSpeed = BASE_SPEED * MODE_CONFIG[mode].speedMultiplier
  const maxSpeed = MAX_SPEED_ENDLESS * MODE_CONFIG[mode].speedMultiplier
  state.speed = Math.min(baseSpeed + state.elapsedTime * SPEED_INCREASE_RATE, maxSpeed)

  // Difficulty 0..1
  state.difficulty = Math.min(state.elapsedTime / 90, 1)

  // Flip animation
  if (state.isFlipping) {
    const flipMs = FLIP_DURATION / 1000
    state.flipProgress = Math.min(state.flipProgress + dtCapped / flipMs, 1)
    if (state.flipProgress >= 1) {
      state.isFlipping = false
      state.flipProgress = 1
    }
  }

  // Score
  state.stats.score += calcSurvivalScore(dtCapped, state.stats.combo, mode)
  state.stats.distance = Math.floor(state.elapsedTime * state.speed * 0.01)

  // Background zone progression + milestone events
  const prevZone = state.bgZone
  updateBgZone(state)
  if (state.bgZone > prevZone) {
    triggerZoneMilestone(state)
  }

  // Track zone reached
  if (state.bgZone > state.stats.zoneReached) {
    state.stats.zoneReached = state.bgZone
  }

  // Shield break animation timer
  if (state.shieldBreaking) {
    state.shieldBreakTimer -= dtCapped
    if (state.shieldBreakTimer <= 0) {
      state.shieldBreaking = false
    }
  }

  // Power-up spawning — alternates between phase_core and thread_sight
  state.nextPowerUpTime -= dtCapped
  if (state.nextPowerUpTime <= 0) {
    const spawnY =
      Math.random() > 0.5
        ? THREAD_Y - ORB_OFFSET_Y - 8
        : THREAD_Y + ORB_OFFSET_Y + 8
    // Alternate types: phase_core every 2nd spawn; thread_sight on 1st, 3rd, etc.
    const spawnCount = Math.floor(state.elapsedTime / PHASE_CORE_SPAWN_INTERVAL)
    const puType = spawnCount % 3 === 1 ? 'thread_sight' : 'phase_core'
    state.powerUps.push({
      id: `pu_${++powerUpId}`,
      x: CANVAS_WIDTH + 30,
      y: spawnY,
      type: puType,
      radius: PHASE_CORE_RADIUS,
      pulsePhase: 0,
      active: true,
    })
    state.nextPowerUpTime = PHASE_CORE_SPAWN_INTERVAL + Math.random() * 8
  }

  // Move power-ups
  for (const pu of state.powerUps) {
    pu.x -= state.speed * dtCapped
    pu.pulsePhase += dtCapped * 4
  }
  state.powerUps = state.powerUps.filter((pu) => pu.x > -60 && pu.active)

  // Move obstacles
  for (const obs of state.obstacles) {
    obs.x -= state.speed * dtCapped
    updateObstacle(obs, dtCapped, state.elapsedTime)
  }

  // Remove off-screen obstacles
  state.obstacles = state.obstacles.filter((o) => o.x > -200)

  // Spawn obstacles
  state.nextSpawnTime -= dtCapped
  if (state.nextSpawnTime <= 0) {
    const lastObs = state.obstacles[state.obstacles.length - 1]
    const lastX = lastObs ? lastObs.x + lastObs.width : 0
    if (lastX < CANVAS_WIDTH - MIN_SPAWN_GAP || state.obstacles.length === 0) {
      const spawnX = CANVAS_WIDTH + 40
      const type = pickObstacleType(
        state.difficulty * MODE_CONFIG[mode].obstacleMultiplier,
        state.biomeId,
        state.bgZone
      )
      const newObs = createObstacle(type, spawnX)
      // Tag with Thread Sight if charges remain
      if (state.threadSightCharges > 0) {
        newObs.threadSightActive = true
      }
      state.obstacles.push(newObs)
      const interval =
        MIN_SPAWN_INTERVAL +
        Math.random() * (MAX_SPAWN_INTERVAL - MIN_SPAWN_INTERVAL)
      state.nextSpawnTime = interval / MODE_CONFIG[mode].obstacleMultiplier
    } else {
      state.nextSpawnTime = 0.15
    }
  }

  // Orb Y
  const orbY = getOrbY(state)

  // Power-up pickup
  for (const pu of state.powerUps) {
    if (!pu.active) continue
    const dx = pu.x - ORB_X
    const dy = pu.y - orbY
    if (dx * dx + dy * dy < (pu.radius + ORB_RADIUS + 6) ** 2) {
      pu.active = false
      if (pu.type === 'phase_core') {
        state.phaseActive = true
        state.shieldBreaking = false
        state.stats.phaseCoresCollected++
        spawnParticles(state, ORB_X, orbY, state.biome.colors.phaseCoreGlow, 20)
        spawnParticles(state, ORB_X, orbY, '#ffffff', 6)
        spawnFloatText(state, 'PHASE CORE!', ORB_X, orbY - 32, state.biome.colors.phaseCoreColor)
      } else if (pu.type === 'thread_sight') {
        // Grant 5 Thread Sight charges; tag next 5 upcoming obstacles immediately
        state.threadSightCharges = 5
        applyThreadSightToNextObstacles(state)
        spawnParticles(state, ORB_X, orbY, '#a5f3fc', 18)
        spawnParticles(state, ORB_X, orbY, '#ffffff', 5)
        spawnFloatText(state, 'THREAD SIGHT!', ORB_X, orbY - 32, '#a5f3fc')
      }
    }
  }

  for (const obs of state.obstacles) {
    if (!obs.active) continue

    // Check passed
    if (obs.x + obs.width < ORB_X - ORB_RADIUS && !state.passedObstacles.has(obs.id)) {
      state.passedObstacles.add(obs.id)
      const bonus = calcObstacleBonus(state.stats.combo, mode)
      state.stats.score += bonus
      spawnFloatText(state, `+${bonus}`, ORB_X, orbY - 22, state.biome.colors.comboText)
      // Increment streak for flow state
      state.stats.streak++
      // Consume one Thread Sight charge when a tagged obstacle passes
      if (obs.threadSightActive && state.threadSightCharges > 0) {
        obs.threadSightActive = false
        state.threadSightCharges = Math.max(0, state.threadSightCharges - 1)
      }
    }

    // Near miss
    if (
      Math.abs(obs.x + obs.width / 2 - ORB_X) < 40 &&
      !state.nearMissObstacles.has(obs.id)
    ) {
      if (checkNearMiss(obs, ORB_X, orbY, ORB_RADIUS)) {
        state.nearMissObstacles.add(obs.id)
        state.stats.nearMisses++
        const nmBonus = calcNearMissBonus(mode)
        state.stats.score += nmBonus
        spawnFloatText(state, `CLOSE! +${nmBonus}`, ORB_X + 20, orbY - 32, state.biome.colors.nearMiss)
        spawnParticles(state, ORB_X, orbY, state.biome.colors.nearMiss, 6)
        state.shakeIntensity = Math.max(state.shakeIntensity, 2)
      }
    }

    // Collision — Phase Core shield absorbs one hit (no timer, permanent until hit)
    if (checkCollision(obs, ORB_X, orbY, ORB_RADIUS)) {
      if (state.phaseActive && !state.shieldBreaking) {
        // Absorb the hit — shield breaks
        state.phaseActive = false
        state.shieldBreaking = true
        state.shieldBreakTimer = 0.55
        obs.active = false
        state.shakeIntensity = Math.max(state.shakeIntensity, 6)
        spawnParticles(state, ORB_X, orbY, state.biome.colors.phaseCoreGlow, 30)
        spawnParticles(state, ORB_X, orbY, '#ffffff', 12)
        spawnFloatText(state, 'SHIELD BREAK!', ORB_X, orbY - 38, state.biome.colors.phaseCoreColor)
        // Reset streak/combo on hit
        state.stats.streak = 0
      } else if (!state.shieldBreaking) {
        // Practice Mode: no game over, continue with hit penalty
        if (mode === 'practice') {
          obs.active = false
          state.shakeIntensity = Math.max(state.shakeIntensity, 4)
          spawnParticles(state, ORB_X, orbY, state.biome.colors.nearMiss, 16)
          spawnFloatText(state, 'HIT!', ORB_X, orbY - 32, state.biome.colors.nearMiss)
          // Small penalty: reset streak/combo
          state.stats.streak = 0
          state.stats.combo = Math.max(0, state.stats.combo - 2)
        } else {
          killOrb(state, mode)
          return
        }
      }
    }
  }

  // Flow state update — escalates intensity during high combos
  const targetFlow = Math.min(state.stats.streak / 15, 1)  // Reduced from 20 for faster escalation
  state.flowIntensity += (targetFlow - state.flowIntensity) * dtCapped * 2.5  // Increased response time

  // Trail — captures distance as orb progresses forward through the world
  // Trail extends horizontally backward (right-to-left) from current position
  state.trailPoints.unshift({ x: state.stats.distance, y: orbY, alpha: 1 })
  if (state.trailPoints.length > 28) state.trailPoints.pop()
  for (const p of state.trailPoints) p.alpha *= 0.88

  // Particles
  for (const p of state.particles) {
    p.x += p.vx * dtCapped
    p.y += p.vy * dtCapped
    p.vy += 60 * dtCapped
    p.life -= dtCapped
  }
  state.particles = state.particles.filter((p) => p.life > 0)

  // Background ambient particles
  updateBgParticles(state, dtCapped)

  // Floating texts
  for (const f of state.floatingTexts) {
    f.y -= 42 * dtCapped
    f.life -= dtCapped
  }
  state.floatingTexts = state.floatingTexts.filter((f) => f.life > 0)

  // Milestones
  for (const m of state.milestones) {
    m.life -= dtCapped
  }
  state.milestones = state.milestones.filter((m) => m.life > 0)

  // Shake decay
  state.shakeIntensity *= 0.87

  // Orb ambient particle
  if (state.gameState === 'playing') {
    spawnOrbParticle(state, orbY)
  }
}

// ---- Zone milestones ----
const ZONE_MILESTONE_LABELS = [
  { text: 'ENERGY GRID', subtext: 'Speed increasing...' },
  { text: 'PLASMA STORM', subtext: 'Hazards intensifying!' },
  { text: 'HYPERCORE', subtext: 'Maximum intensity!' },
]

function triggerZoneMilestone(state: EngineState): void {
  const idx = state.bgZone - 1
  if (idx < 0 || idx >= ZONE_MILESTONE_LABELS.length) return
  const lbl = ZONE_MILESTONE_LABELS[idx]
  state.milestones.push({
    id: `ms_${++milestoneId}`,
    text: lbl.text,
    subtext: lbl.subtext,
    color: state.biome.colors.accent,
    life: 2.5,
    maxLife: 2.5,
  })
  // Speed burst bonus
  state.stats.score += 100 * state.bgZone
  spawnFloatText(state, `ZONE BONUS +${100 * state.bgZone}`, CANVAS_WIDTH / 2, THREAD_Y - 50, state.biome.colors.accentGlow)
  state.shakeIntensity = Math.max(state.shakeIntensity, 3)
}

// ---- Background zone helpers ----
function updateBgZone(state: EngineState): void {
  const d = state.stats.distance
  const { calm, grid, plasma, hypercore } = BG_ZONE_THRESHOLDS

  let targetZone = 0
  let blendStart = calm
  let blendEnd = grid

  if (d >= hypercore) {
    targetZone = 3
    blendStart = hypercore
    blendEnd = hypercore + 600
  } else if (d >= plasma) {
    targetZone = 2
    blendStart = plasma
    blendEnd = hypercore
  } else if (d >= grid) {
    targetZone = 1
    blendStart = grid
    blendEnd = plasma
  }

  const blend = Math.min((d - blendStart) / Math.max(blendEnd - blendStart, 1), 1)

  state.bgZone = targetZone
  state.bgZoneBlend = blend
}

function updateBgParticles(state: EngineState, dt: number): void {
  const zone = state.bgZone + state.bgZoneBlend
  const spawnChance = 0.12 + zone * 0.20 + state.flowIntensity * 0.16  // Increased for more motion energy
  if (Math.random() < spawnChance) {
    const alts = state.biome.colors.bgStreakAlt
    const colorIndex = Math.min(Math.floor(zone), alts.length - 1)
    state.bgParticles.push({
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * CANVAS_HEIGHT,
      vx: -30 - Math.random() * 40,
      vy: (Math.random() - 0.5) * 20,
      life: 1.2 + Math.random() * 1.0,
      maxLife: 2.2,
      color: alts[colorIndex],
      size: 0.7 + Math.random() * 2.2,  // Slightly increased for visibility
    })
  }

  for (const p of state.bgParticles) {
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.life -= dt
  }
  state.bgParticles = state.bgParticles.filter((p) => p.life > 0 && p.x > -10)
}

// Tag the next N already-spawned obstacles that haven't been passed yet with Thread Sight
function applyThreadSightToNextObstacles(state: EngineState): void {
  const charges = state.threadSightCharges
  const upcoming = state.obstacles
    .filter(o => o.active && !state.passedObstacles.has(o.id))
    .sort((a, b) => a.x - b.x)  // left to right = upcoming order
  for (let i = 0; i < Math.min(charges, upcoming.length); i++) {
    upcoming[i].threadSightActive = true
  }
}

function killOrb(state: EngineState, _mode: GameMode): void {
  state.gameState = 'dead'
  state.shakeIntensity = 10
  const orbY = getOrbY(state)
  spawnParticles(state, ORB_X, orbY, state.biome.colors.orbGlow, 22)
  spawnParticles(state, ORB_X, orbY, '#ffffff', 8)
  if (state.stats.score > state.stats.bestScore) {
    state.stats.bestScore = state.stats.score
  }
}

function spawnParticles(
  state: EngineState,
  x: number,
  y: number,
  color: string,
  count: number
): void {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 40 + Math.random() * 130
    state.particles.push({
      id: `p${++particleId}`,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.4 + Math.random() * 0.45,
      maxLife: 0.85,
      color,
      size: 2 + Math.random() * 4,
    })
  }
}

function spawnOrbParticle(state: EngineState, orbY: number): void {
  // More particles when in flow state — creates energetic feel
  const spawnRate = 0.22 + state.flowIntensity * 0.18  // Increased from 0.18, 0.12
  if (Math.random() > spawnRate) return
  state.particles.push({
    id: `p${++particleId}`,
    x: ORB_X + (Math.random() - 0.5) * ORB_RADIUS * 1.3,  // Slightly wider spawn radius
    y: orbY + (Math.random() - 0.5) * ORB_RADIUS * 1.3,
    vx: (Math.random() - 0.5) * 24 - state.speed * 0.07,  // Slightly faster movement
    vy: (Math.random() - 0.5) * 24,
    life: 0.35 + Math.random() * 0.35,  // Increased from 0.3, 0.3
    maxLife: 0.7,
    color: state.orbTrail,
    size: 1.2 + Math.random() * 2.2,  // Increased from 1, 2
  })
}

function spawnFloatText(
  state: EngineState,
  text: string,
  x: number,
  y: number,
  color: string
): void {
  state.floatingTexts.push({
    id: `ft${++floatId}`,
    text,
    x: x + (Math.random() - 0.5) * 20,
    y,
    color,
    life: 0.95,
    maxLife: 0.95,
  })
}

// ===== RENDERER =====

export function render(
  ctx: CanvasRenderingContext2D,
  state: EngineState,
  t: number,
  width: number,
  height: number,
  dpr: number
): void {
  const scale = width / CANVAS_WIDTH
  const offsetY = (height - CANVAS_HEIGHT * scale) / 2

  ctx.save()
  ctx.translate(0, offsetY)
  ctx.scale(scale, scale)

  // Shake
  if (state.shakeIntensity > 0.1) {
    ctx.translate(
      (Math.random() - 0.5) * state.shakeIntensity,
      (Math.random() - 0.5) * state.shakeIntensity
    )
  }

  // Background (biome + zone aware)
  drawBackground(ctx, state, t)
  
  // Speed streaks (subtle motion feedback)
  drawSpeedStreaks(ctx, state, t)

  // Thread
  drawThread(ctx, t, state)

  // Obstacles
  for (const obs of state.obstacles) {
    drawObstacle(ctx, obs, t, state.biome)
  }

  // Power-ups
  for (const pu of state.powerUps) {
    if (!pu.active) continue
    if (pu.type === 'thread_sight') drawThreadSightPickup(ctx, pu, t, state.biome)
    else drawPhaseCore(ctx, pu, t, state.biome)
  }

  // Orb trail (horizontal neon energy streak)
  const orbY = getOrbY(state)
  drawTrail(ctx, state, orbY, t)

  // Orb
  drawOrb(ctx, orbY, state, t)

  // Shield aura / break FX
  if (state.phaseActive || state.shieldBreaking) {
    drawShieldAura(ctx, orbY, state, t)
  }

  // Particles
  drawParticles(ctx, state)

  // Floating texts
  drawFloatingTexts(ctx, state)

  // Milestone banners
  drawMilestones(ctx, state)

  ctx.restore()
}

// ---- Zone-aware background renderer (biome-tinted) ----
function drawBackground(
  ctx: CanvasRenderingContext2D,
  state: EngineState,
  t: number
): void {
  const { biome } = state
  const zone = state.bgZone
  const blend = state.bgZoneBlend
  const scrollOffset = state.elapsedTime * state.speed
  const flow = state.flowIntensity

  // Base fill
  const zoneBgs = biome.zoneBg
  ctx.fillStyle = zoneBgs[Math.min(zone, zoneBgs.length - 1)]
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  // Blend toward next zone
  if (blend > 0.05 && zone < 3) {
    ctx.globalAlpha = blend * 0.55
    ctx.fillStyle = zoneBgs[Math.min(zone + 1, zoneBgs.length - 1)]
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    ctx.globalAlpha = 1
  }

  // Zone 0: subtle scrolling grid
  if (zone === 0) {
    const gridAlpha = 0.04 + blend * 0.04 + flow * 0.03
    ctx.strokeStyle = biome.colors.gridLine.replace('0.05', `${gridAlpha.toFixed(3)}`)
    ctx.lineWidth = 0.5
    const gridSize = 40
    const ox = scrollOffset % gridSize
    for (let x = -ox; x < CANVAS_WIDTH; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke()
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke()
    }
  }

  // Zone 1: stronger grid + horizontal energy bands
  if (zone >= 1) {
    const intensity = zone === 1 ? blend : 1
    const gridAlpha = 0.06 + intensity * 0.07 + flow * 0.04
    ctx.strokeStyle = `${biome.colors.accent}${Math.round(gridAlpha * 255).toString(16).padStart(2, '0')}`
    ctx.lineWidth = 0.5
    const gridSize = 40
    const ox = scrollOffset % gridSize
    for (let x = -ox; x < CANVAS_WIDTH; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke()
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke()
    }

    const bandAlpha = (0.04 + intensity * 0.06) * (1 + flow * 0.5)
    const bandY1 = THREAD_Y - 80 + Math.sin(t * 0.7) * 10
    const bandY2 = THREAD_Y + 80 + Math.sin(t * 0.9 + 1) * 10
    const acc = biome.colors.accent

    const band1 = ctx.createLinearGradient(0, bandY1 - 20, 0, bandY1 + 20)
    band1.addColorStop(0, 'transparent')
    band1.addColorStop(0.5, hexToRgba(acc, bandAlpha))
    band1.addColorStop(1, 'transparent')
    ctx.fillStyle = band1
    ctx.fillRect(0, bandY1 - 20, CANVAS_WIDTH, 40)

    const band2 = ctx.createLinearGradient(0, bandY2 - 20, 0, bandY2 + 20)
    band2.addColorStop(0, 'transparent')
    band2.addColorStop(0.5, hexToRgba(acc, bandAlpha))
    band2.addColorStop(1, 'transparent')
    ctx.fillStyle = band2
    ctx.fillRect(0, bandY2 - 20, CANVAS_WIDTH, 40)

    drawBgStreaks(ctx, state, intensity + flow * 0.4)
  }

  // Zone 2: vignette + diagonal lines + pulse rings
  if (zone >= 2) {
    const intensity = zone === 2 ? blend : 1

    const vignette = ctx.createRadialGradient(
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 60,
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_HEIGHT * 0.7
    )
    vignette.addColorStop(0, 'transparent')
    vignette.addColorStop(1, hexToRgba(biome.colors.hazardPrimary, 0.10 * intensity))
    ctx.fillStyle = vignette
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    ctx.strokeStyle = hexToRgba(biome.colors.accent, 0.05 * intensity)
    ctx.lineWidth = 1
    const diagOff = (scrollOffset * 0.3) % 60
    for (let d = -CANVAS_HEIGHT; d < CANVAS_WIDTH + CANVAS_HEIGHT; d += 60) {
      ctx.beginPath()
      ctx.moveTo(d - diagOff, 0)
      ctx.lineTo(d - diagOff + CANVAS_HEIGHT, CANVAS_HEIGHT)
      ctx.stroke()
    }

    for (let i = 0; i < 3; i++) {
      const pR = 40 + i * 35 + Math.sin(t * 2 + i * 1.2) * 15
      const pAlpha = (0.035 + Math.sin(t * 1.5 + i) * 0.015) * intensity
      ctx.strokeStyle = hexToRgba(biome.colors.accent, pAlpha)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(ORB_X, THREAD_Y, pR, 0, Math.PI * 2)
      ctx.stroke()
    }

    drawBgStreaks(ctx, state, intensity * 1.4 + flow * 0.5)
  }

  // Zone 3: intense heat/core effect
  if (zone >= 3) {
    const intensity = Math.min(blend + 0.2, 1)

    const heat = ctx.createRadialGradient(
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 30,
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_HEIGHT * 0.8
    )
    heat.addColorStop(0, 'transparent')
    heat.addColorStop(0.6, hexToRgba(biome.colors.accent, 0.04 * intensity))
    heat.addColorStop(1, hexToRgba(biome.colors.hazardPrimary, 0.10 * intensity))
    ctx.fillStyle = heat
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    ctx.strokeStyle = hexToRgba(biome.colors.accent, 0.07 * intensity)
    ctx.lineWidth = 1
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI - Math.PI / 2 + Math.sin(t + i * 0.5) * 0.1
      const len = 80 + Math.sin(t * 3 + i) * 30
      ctx.beginPath()
      ctx.moveTo(ORB_X, THREAD_Y)
      ctx.lineTo(ORB_X - Math.cos(angle) * len, THREAD_Y + Math.sin(angle) * len)
      ctx.stroke()
    }

    drawBgStreaks(ctx, state, intensity * 2.0 + flow * 0.6)
  }

  // Flow state — thread region glow intensifies dramatically with combo
  if (flow > 0.05) {
    const flowGlow = ctx.createLinearGradient(0, THREAD_Y - 80, 0, THREAD_Y + 80)
    flowGlow.addColorStop(0, 'transparent')
    flowGlow.addColorStop(0.5, hexToRgba(biome.colors.accent, flow * 0.12))  // Increased from 0.06
    flowGlow.addColorStop(1, 'transparent')
    ctx.fillStyle = flowGlow
    ctx.fillRect(0, THREAD_Y - 80, CANVAS_WIDTH, 160)
    
    // Extra intense core glow at high flow
    if (flow > 0.6) {
      const coreGlow = ctx.createLinearGradient(0, THREAD_Y - 40, 0, THREAD_Y + 40)
      coreGlow.addColorStop(0, 'transparent')
      coreGlow.addColorStop(0.5, hexToRgba(biome.colors.accent, (flow - 0.6) * 0.3))
      coreGlow.addColorStop(1, 'transparent')
      ctx.fillStyle = coreGlow
      ctx.fillRect(0, THREAD_Y - 40, CANVAS_WIDTH, 80)
    }
  }

  // Background ambient particles
  for (const p of state.bgParticles) {
    const alpha = (p.life / p.maxLife) * 0.7
    ctx.globalAlpha = alpha
    ctx.fillStyle = p.color
    ctx.shadowBlur = 3
    ctx.shadowColor = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  ctx.shadowBlur = 0
}

function drawBgStreaks(
  ctx: CanvasRenderingContext2D,
  state: EngineState,
  intensity: number
): void {
  const biome = state.biome
  for (const s of state.bgStreaks) {
    ctx.globalAlpha = s.alpha * intensity
    ctx.strokeStyle = s.color
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(s.x, s.y)
    ctx.lineTo(s.x + s.len, s.y)
    ctx.stroke()

    s.x -= s.speed * 0.016
    if (s.x + s.len < 0) {
      s.x = CANVAS_WIDTH + Math.random() * 50
      s.y = Math.random() * CANVAS_HEIGHT
      s.len = 40 + Math.random() * 120
      s.alpha = 0.04 + Math.random() * 0.08
      const streakColors = biome.colors.bgStreak
      s.color = streakColors[Math.floor(Math.random() * streakColors.length)]
    }
  }
  ctx.globalAlpha = 1
}

function drawSpeedStreaks(
  ctx: CanvasRenderingContext2D,
  state: EngineState,
  t: number
): void {
  const zone = state.bgZone + state.bgZoneBlend
  const intensity = zone * 0.08 + state.flowIntensity * 0.12  // Subtle, tied to zone and flow
  
  if (intensity < 0.02) return

  const biome = state.biome
  const accent = biome.colors.accent
  const streakColor = accent

  // Left edge speed streaks
  for (let i = 0; i < 3; i++) {
    const baseY = THREAD_Y + (i - 1) * 80 + Math.sin(t * 0.8 + i) * 20
    const alpha = intensity * (0.06 + Math.sin(t * 1.2 + i * 0.5) * 0.04)
    
    ctx.globalAlpha = alpha
    ctx.strokeStyle = streakColor
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(-10, baseY - 40)
    ctx.lineTo(80, baseY + 40)
    ctx.stroke()
  }

  // Right edge speed streaks
  for (let i = 0; i < 3; i++) {
    const baseY = THREAD_Y + (i - 1) * 80 + Math.sin(t * 0.9 + i * 0.7) * 20
    const alpha = intensity * (0.06 + Math.sin(t * 1.3 + i * 0.6) * 0.04)
    
    ctx.globalAlpha = alpha
    ctx.strokeStyle = streakColor
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(CANVAS_WIDTH + 10, baseY - 40)
    ctx.lineTo(CANVAS_WIDTH - 80, baseY + 40)
    ctx.stroke()
  }

  ctx.globalAlpha = 1
}

function drawThread(ctx: CanvasRenderingContext2D, t: number, state: EngineState): void {
  const y = THREAD_Y
  const { biome } = state
  const zone = state.bgZone + state.bgZoneBlend
  const flow = state.flowIntensity

  // Thread color: stays biome-based but intensifies with zone
  const threadColor = biome.colors.thread
  const glowColor = biome.colors.threadGlow
  const glowBlur = 10 + zone * 5 + flow * 3  // Reduced bloom significantly

  // Outer glow (more intense at high zones + flow state) — subtle and polished
  ctx.shadowBlur = glowBlur
  ctx.shadowColor = glowColor
  ctx.strokeStyle = glowColor
  ctx.lineWidth = THREAD_HEIGHT + 2 + zone * 0.8 + flow * 1  // Much reduced
  ctx.beginPath()
  ctx.moveTo(0, y)
  ctx.lineTo(CANVAS_WIDTH, y)
  ctx.stroke()

  // Core thread
  ctx.shadowBlur = 4 + zone * 1.5 + flow * 1.5  // Reduced
  ctx.shadowColor = threadColor
  ctx.strokeStyle = threadColor
  ctx.lineWidth = THREAD_HEIGHT
  ctx.beginPath()
  ctx.moveTo(0, y)
  ctx.lineTo(CANVAS_WIDTH, y)
  ctx.stroke()

  // Inner highlight — preserved
  ctx.shadowBlur = 0
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(0, y - 1)
  ctx.lineTo(CANVAS_WIDTH, y - 1)
  ctx.stroke()

  // Gentle pulsing glow on thread — very subtle, adds life without noise
  const gentlePulse = 0.5 + Math.sin(t * 2.5) * 0.5
  const pulseGlowAlpha = flow * 0.04 + zone * 0.02
  if (pulseGlowAlpha > 0.01) {
    ctx.globalAlpha = pulseGlowAlpha * gentlePulse
    ctx.shadowBlur = 8 + zone * 2
    ctx.shadowColor = glowColor
    ctx.strokeStyle = glowColor
    ctx.lineWidth = THREAD_HEIGHT + 4
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(CANVAS_WIDTH, y)
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  // Pulse segments — faster at high zones, but less dominant
  const pulseSpeed = 2 + zone * 2 + flow * 1.5
  const pulseAlpha = 0.05 + zone * 0.03 + flow * 0.05 + Math.sin(t * pulseSpeed) * 0.03  // More subtle
  ctx.globalAlpha = pulseAlpha
  const grad = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, 0)
  grad.addColorStop(0, 'transparent')
  grad.addColorStop(0.5, threadColor)
  grad.addColorStop(1, 'transparent')
  ctx.strokeStyle = grad
  ctx.lineWidth = THREAD_HEIGHT + 4 + zone * 1.5 + flow * 2  // More modest pulse
  ctx.beginPath()
  ctx.moveTo(0, y)
  ctx.lineTo(CANVAS_WIDTH, y)
  ctx.stroke()
  ctx.globalAlpha = 1
  ctx.shadowBlur = 0
}

function drawPhaseCore(
  ctx: CanvasRenderingContext2D,
  pu: PowerUp,
  t: number,
  biome: BiomeConfig
): void {
  const pulse = 0.6 + Math.sin(pu.pulsePhase) * 0.4
  const r = pu.radius

  // Outer halo
  ctx.shadowBlur = 24
  ctx.shadowColor = biome.colors.phaseCoreGlow
  const halo = ctx.createRadialGradient(pu.x, pu.y, 0, pu.x, pu.y, r * 2.8)
  halo.addColorStop(0, hexToRgba(biome.colors.phaseCoreColor, 0.25))
  halo.addColorStop(1, 'transparent')
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(pu.x, pu.y, r * 2.8 * pulse, 0, Math.PI * 2)
  ctx.fill()

  // Core body
  const body = ctx.createRadialGradient(pu.x - 2, pu.y - 2, 1, pu.x, pu.y, r)
  body.addColorStop(0, '#ffffff')
  body.addColorStop(0.4, biome.colors.phaseCoreColor)
  body.addColorStop(1, hexToRgba(biome.colors.accent, 0.5))
  ctx.fillStyle = body
  ctx.shadowBlur = 14
  ctx.shadowColor = biome.colors.phaseCoreGlow
  ctx.beginPath()
  ctx.arc(pu.x, pu.y, r * pulse, 0, Math.PI * 2)
  ctx.fill()

  // Rotating orbit ring
  ctx.strokeStyle = hexToRgba(biome.colors.phaseCoreColor, 0.7)
  ctx.lineWidth = 1
  ctx.shadowBlur = 6
  ctx.globalAlpha = 0.8
  ctx.save()
  ctx.translate(pu.x, pu.y)
  ctx.rotate(t * 2.5)
  ctx.beginPath()
  ctx.ellipse(0, 0, r * 1.8, r * 0.7, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
  ctx.globalAlpha = 1
  ctx.shadowBlur = 0

  // Label
  ctx.fillStyle = biome.colors.phaseCoreColor
  ctx.font = 'bold 7px "Space Mono", monospace'
  ctx.textAlign = 'center'
  ctx.fillText(biome.meta.phaseCoreLabel, pu.x, pu.y + r * 2.2)
  ctx.textAlign = 'left'
}

function drawThreadSightPickup(
  ctx: CanvasRenderingContext2D,
  pu: PowerUp,
  t: number,
  biome: BiomeConfig
): void {
  const pulse = 0.6 + Math.sin(pu.pulsePhase * 1.3) * 0.4
  const r = pu.radius
  // Thread Sight uses a cool cyan-white color, visually distinct from Phase Core (blue)
  const tsColor  = '#a5f3fc'
  const tsGlow   = 'rgba(165,243,252,0.85)'

  // Outer halo — radiating rings suggest vision / foresight
  for (let i = 0; i < 3; i++) {
    const ringR = r * (1.6 + i * 0.7) * pulse
    const alpha = (0.18 - i * 0.05) * pulse
    ctx.strokeStyle = hexToRgba(tsColor, alpha)
    ctx.lineWidth = 1
    ctx.shadowBlur = 8
    ctx.shadowColor = tsGlow
    ctx.beginPath()
    ctx.arc(pu.x, pu.y, ringR, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Core body — diamond shape (distinct from circular Phase Core)
  ctx.shadowBlur = 20
  ctx.shadowColor = tsGlow
  ctx.fillStyle = tsColor
  ctx.save()
  ctx.translate(pu.x, pu.y)
  ctx.rotate(t * 1.5)
  ctx.beginPath()
  ctx.moveTo(0, -r * pulse)
  ctx.lineTo(r * pulse * 0.65, 0)
  ctx.lineTo(0, r * pulse)
  ctx.lineTo(-r * pulse * 0.65, 0)
  ctx.closePath()
  ctx.fill()

  // Inner white core
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.3 * pulse, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  ctx.shadowBlur = 0

  // Label
  ctx.fillStyle = tsColor
  ctx.font = 'bold 7px "Space Mono", monospace'
  ctx.textAlign = 'center'
  ctx.fillText('SIGHT', pu.x, pu.y + r * 2.2)
  ctx.textAlign = 'left'
}

function drawShieldAura(
  ctx: CanvasRenderingContext2D,
  orbY: number,
  state: EngineState,
  t: number
): void {
  const { biome } = state
  const breaking = state.shieldBreaking
  const breakT = breaking ? 1 - state.shieldBreakTimer / 0.55 : 0

  if (breaking) {
    // Shield break — cleaner shockwave with polished popup
    const shockR = ORB_RADIUS + 8 + breakT * 50
    ctx.strokeStyle = hexToRgba(biome.colors.phaseCoreColor, (1 - breakT) * 1.0)
    ctx.lineWidth = 4 - breakT * 3  // Thicker initial ring
    ctx.shadowBlur = 24 * (1 - breakT)
    ctx.shadowColor = biome.colors.phaseCoreGlow
    ctx.globalAlpha = 1 - breakT
    ctx.beginPath()
    ctx.arc(ORB_X, orbY, shockR, 0, Math.PI * 2)
    ctx.stroke()

    // Inner white ring
    const shockR2 = ORB_RADIUS + 4 + breakT * 30
    ctx.strokeStyle = `rgba(255,255,255,${(1 - breakT) * 0.8})`
    ctx.lineWidth = 2.5
    ctx.shadowBlur = 12
    ctx.shadowColor = 'rgba(255,255,255,0.4)'
    ctx.beginPath()
    ctx.arc(ORB_X, orbY, shockR2, 0, Math.PI * 2)
    ctx.stroke()
    
    // Shield break text popup — single, polished message
    const textAlpha = Math.max(0, 1 - breakT * 2)
    if (textAlpha > 0.1) {
      ctx.globalAlpha = textAlpha
      ctx.fillStyle = hexToRgba(biome.colors.phaseCoreColor, 1)
      ctx.font = 'bold 14px "Space Mono", monospace'
      ctx.textAlign = 'center'
      ctx.shadowBlur = 10
      ctx.shadowColor = biome.colors.phaseCoreGlow
      ctx.fillText('SHIELD BROKEN', ORB_X, orbY - 28)
    }
    
    ctx.globalAlpha = 1
    ctx.shadowBlur = 0
    return
  }

  // Active shield — premium and obvious
  const shieldR = ORB_RADIUS + 10 + Math.sin(t * 7) * 3

  // Outer glow ring — stronger
  ctx.shadowBlur = 28
  ctx.shadowColor = biome.colors.phaseCoreGlow
  ctx.strokeStyle = hexToRgba(biome.colors.phaseCoreColor, 0.85 + Math.sin(t * 9) * 0.15)
  ctx.lineWidth = 2.5  // Increased from 2
  ctx.globalAlpha = 1
  ctx.beginPath()
  ctx.arc(ORB_X, orbY, shieldR, 0, Math.PI * 2)
  ctx.stroke()

  // Inner fill — translucent bubble, more pronounced
  const shieldFill = ctx.createRadialGradient(ORB_X, orbY, 0, ORB_X, orbY, shieldR)
  shieldFill.addColorStop(0, 'transparent')
  shieldFill.addColorStop(0.6, hexToRgba(biome.colors.phaseCoreColor, 0.06))
  shieldFill.addColorStop(1, hexToRgba(biome.colors.phaseCoreColor, 0.22))
  ctx.fillStyle = shieldFill
  ctx.shadowBlur = 0
  ctx.beginPath()
  ctx.arc(ORB_X, orbY, shieldR, 0, Math.PI * 2)
  ctx.fill()

  // Rotating arcs on ring — dual rotating elements for premium look
  ctx.save()
  ctx.translate(ORB_X, orbY)
  ctx.rotate(t * 5)
  
  // Bright rotating arc
  ctx.strokeStyle = 'rgba(255,255,255,1)'
  ctx.lineWidth = 2.5
  ctx.shadowBlur = 12
  ctx.shadowColor = biome.colors.phaseCoreColor
  ctx.beginPath()
  ctx.arc(0, 0, shieldR, -0.5, 0.5)
  ctx.stroke()
  
  // Opposite arc in accent color
  ctx.rotate(Math.PI)
  ctx.strokeStyle = hexToRgba(biome.colors.phaseCoreColor, 0.7)
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.arc(0, 0, shieldR, -0.3, 0.3)
  ctx.stroke()
  ctx.restore()

  // "ACTIVE" label — compact and polished (no timer, it's permanent)
  ctx.fillStyle = hexToRgba(biome.colors.phaseCoreColor, 0.85)
  ctx.font = 'bold 8px "Space Mono", monospace'
  ctx.textAlign = 'center'
  ctx.shadowBlur = 6
  ctx.shadowColor = biome.colors.phaseCoreGlow
  ctx.fillText('SHIELD ACTIVE', ORB_X, orbY - shieldR - 6)
  ctx.textAlign = 'left'
  ctx.shadowBlur = 0
  ctx.globalAlpha = 1
}

// ── Horizontal motion trail ───────────────────────────────────────────────
// Records the orb's distance as it progresses through the world.
// Renders as a horizontal ribbon extending backward (right-to-left) from the orb,
// showing the energy wake left behind as the character moves forward.
function drawTrail(
  ctx: CanvasRenderingContext2D,
  state: EngineState,
  orbY: number,
  t: number
): void {
  const pts = state.trailPoints
  if (pts.length < 3) return

  const currentDist = state.stats.distance
  
  // ── Convert distance-based trail to screen space ───────────────────────
  // Each trail point's x = distance. Convert to screen x-offset from ORB_X.
  // Newer points (smaller distance delta) are brighter and wider.
  const trailScreenPts: Array<{ sx: number; sy: number; alpha: number }> = []
  for (let i = 0; i < pts.length; i++) {
    const distDelta = currentDist - pts[i].x  // how far behind current position
    const sx = ORB_X - distDelta * 0.08       // scale distance into screen pixels (adjust 0.08 to tune scale)
    if (sx < -200) continue                   // cull off-screen left
    trailScreenPts.push({
      sx,
      sy: pts[i].y,
      alpha: pts[i].alpha
    })
  }
  
  if (trailScreenPts.length < 2) return

  const headPt = trailScreenPts[0]
  const tailPt = trailScreenPts[trailScreenPts.length - 1]

  // ── Compute perpendicular normals for ribbon geometry ──────────────────
  // Trail is primarily horizontal, so normals point mostly vertical (up/down).
  const normals: Array<{ nx: number; ny: number }> = []
  for (let i = 0; i < trailScreenPts.length; i++) {
    let dx: number, dy: number
    if (i === 0) {
      dx = trailScreenPts[0].sx - trailScreenPts[1].sx
      dy = trailScreenPts[0].sy - trailScreenPts[1].sy
    } else if (i === trailScreenPts.length - 1) {
      const prev = trailScreenPts[trailScreenPts.length - 2]
      dx = prev.sx - trailScreenPts[i].sx
      dy = prev.sy - trailScreenPts[i].sy
    } else {
      dx = trailScreenPts[i - 1].sx - trailScreenPts[i + 1].sx
      dy = trailScreenPts[i - 1].sy - trailScreenPts[i + 1].sy
    }
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    normals.push({ nx: -dy / len, ny: dx / len })
  }

  // ── Build left/right edge vertices ─────────────────────────────────────
  // i=0 is head (current position, bright), i=n-1 is tail (fades to point).
  const halfWidthHead = 8  // full width at orb
  const leftX:  number[] = []
  const leftY:  number[] = []
  const rightX: number[] = []
  const rightY: number[] = []

  for (let i = 0; i < trailScreenPts.length; i++) {
    const t01 = i / (trailScreenPts.length - 1)
    const taper = 1 - t01 * t01  // ease-out quad taper
    const hw = halfWidthHead * taper * trailScreenPts[i].alpha
    const { nx, ny } = normals[i]
    leftX.push(trailScreenPts[i].sx + nx * hw)
    leftY.push(trailScreenPts[i].sy + ny * hw)
    rightX.push(trailScreenPts[i].sx - nx * hw)
    rightY.push(trailScreenPts[i].sy - ny * hw)
  }

  // ── Gradient along spine ──────────────────────────────────────────────
  const spineGrad = ctx.createLinearGradient(headPt.sx, headPt.sy, tailPt.sx, tailPt.sy)

  ctx.save()

  // ── Pass 1: Ambient bloom ─────────────────────────────────────────────
  const glowScale = 2.2
  const gloomLX = leftX.map((x, i) => x + normals[i].nx * (halfWidthHead * (1 - (i / trailScreenPts.length) ** 2) * glowScale))
  const gloomLY = leftY.map((y, i) => y + normals[i].ny * (halfWidthHead * (1 - (i / trailScreenPts.length) ** 2) * glowScale))
  const gloomRX = rightX.map((x, i) => x - normals[i].nx * (halfWidthHead * (1 - (i / trailScreenPts.length) ** 2) * glowScale))
  const gloomRY = rightY.map((y, i) => y - normals[i].ny * (halfWidthHead * (1 - (i / trailScreenPts.length) ** 2) * glowScale))

  const glowGrad = ctx.createLinearGradient(headPt.sx, headPt.sy, tailPt.sx, tailPt.sy)
  glowGrad.addColorStop(0,    hexToRgba(state.orbGlow, 0.35))
  glowGrad.addColorStop(0.35, hexToRgba(state.orbGlow, 0.15))
  glowGrad.addColorStop(1,    hexToRgba(state.orbGlow, 0))

  ctx.shadowBlur  = 16
  ctx.shadowColor = state.orbGlow
  ctx.globalAlpha = 1
  ctx.fillStyle   = glowGrad
  ctx.beginPath()
  ctx.moveTo(gloomLX[0], gloomLY[0])
  for (let i = 1; i < gloomLX.length; i++) ctx.lineTo(gloomLX[i], gloomLY[i])
  for (let i = gloomRX.length - 1; i >= 0; i--) ctx.lineTo(gloomRX[i], gloomRY[i])
  ctx.closePath()
  ctx.fill()

  // ── Pass 2: Core neon ribbon ──────────────────────────────────────────
  const coreGrad = ctx.createLinearGradient(headPt.sx, headPt.sy, tailPt.sx, tailPt.sy)
  coreGrad.addColorStop(0,    hexToRgba(state.orbColor,  0.92))
  coreGrad.addColorStop(0.15, hexToRgba(state.orbTrail,  0.78))
  coreGrad.addColorStop(0.5,  hexToRgba(state.orbTrail,  0.38))
  coreGrad.addColorStop(1,    hexToRgba(state.orbTrail,  0))

  ctx.shadowBlur  = 8
  ctx.fillStyle   = coreGrad
  ctx.beginPath()
  ctx.moveTo(leftX[0], leftY[0])
  for (let i = 1; i < leftX.length; i++) ctx.lineTo(leftX[i], leftY[i])
  for (let i = rightX.length - 1; i >= 0; i--) ctx.lineTo(rightX[i], rightY[i])
  ctx.closePath()
  ctx.fill()

  // ── Pass 3: Bright spine line ────────────────────────────────────────
  const spineStrokeGrad = ctx.createLinearGradient(headPt.sx, headPt.sy, tailPt.sx, tailPt.sy)
  spineStrokeGrad.addColorStop(0,    hexToRgba(state.orbColor, 0.85))
  spineStrokeGrad.addColorStop(0.3,  hexToRgba(state.orbColor, 0.45))
  spineStrokeGrad.addColorStop(1,    hexToRgba(state.orbColor, 0))

  ctx.shadowBlur  = 5
  ctx.strokeStyle = spineStrokeGrad
  ctx.lineWidth   = 1.0
  ctx.lineCap     = 'round'
  ctx.lineJoin    = 'round'
  ctx.beginPath()
  ctx.moveTo(trailScreenPts[0].sx, trailScreenPts[0].sy)
  for (let i = 1; i < trailScreenPts.length; i++) {
    ctx.lineTo(trailScreenPts[i].sx, trailScreenPts[i].sy)
  }
  ctx.stroke()

  ctx.restore()
}


function drawOrb(
  ctx: CanvasRenderingContext2D,
  orbY: number,
  state: EngineState,
  t: number
): void {
  const { biome, flowIntensity } = state
  const squeeze = state.isFlipping ? 0.75 + state.flipProgress * 0.25 : 1
  const comboActive = state.stats.combo >= 3
  const flowGlowExtra = flowIntensity * 18

  // Outer ambient glow
  ctx.shadowBlur = (comboActive ? 32 : 22) + flowGlowExtra
  ctx.shadowColor = state.orbGlow
  const outerGrad = ctx.createRadialGradient(ORB_X, orbY, 0, ORB_X, orbY, ORB_RADIUS * 2.8)
  outerGrad.addColorStop(0, hexToRgba(biome.colors.accentGlow, 0.4))
  outerGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = outerGrad
  ctx.beginPath()
  ctx.ellipse(ORB_X, orbY, ORB_RADIUS * 2.8 * squeeze, ORB_RADIUS * 2.8 / squeeze, 0, 0, Math.PI * 2)
  ctx.fill()

  // Skin orbital ring / arc — drawn behind the orb body so it frames it
  drawOrbRing(ctx, orbY, state, t, squeeze)

  // Orb body
  const radGrad = ctx.createRadialGradient(
    ORB_X - 3, orbY - 3, 1,
    ORB_X, orbY, ORB_RADIUS
  )
  radGrad.addColorStop(0, '#ffffff')
  radGrad.addColorStop(0.35, state.orbColor)
  radGrad.addColorStop(1, state.orbGlow)
  ctx.fillStyle = radGrad
  ctx.shadowBlur = 20 + flowGlowExtra
  ctx.shadowColor = state.orbGlow
  ctx.beginPath()
  ctx.ellipse(ORB_X, orbY, ORB_RADIUS * squeeze, ORB_RADIUS / squeeze, 0, 0, Math.PI * 2)
  ctx.fill()

  // Specular highlight
  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.beginPath()
  ctx.ellipse(ORB_X - 3, orbY - 3, ORB_RADIUS * 0.38 * squeeze, ORB_RADIUS * 0.38 / squeeze, -0.4, 0, Math.PI * 2)
  ctx.fill()

  // Combo pulse ring
  if (comboActive) {
    const pulse = 0.5 + Math.sin(t * 10) * 0.5
    ctx.strokeStyle = state.orbGlow
    ctx.lineWidth = 2.5
    ctx.globalAlpha = pulse * (0.7 + flowIntensity * 0.3)
    ctx.shadowBlur = 14
    ctx.shadowColor = state.orbGlow
    ctx.beginPath()
    ctx.arc(ORB_X, orbY, ORB_RADIUS + 4 + pulse * 5, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  // Flow state halo
  if (flowIntensity > 0.2) {
    const flowPulse = Math.sin(t * 12) * 0.5 + 0.5
    ctx.strokeStyle = biome.colors.accentGlow
    ctx.lineWidth = 1.5
    ctx.globalAlpha = flowIntensity * 0.6 * flowPulse
    ctx.shadowBlur = 16
    ctx.shadowColor = biome.colors.accent
    ctx.beginPath()
    ctx.arc(ORB_X, orbY, ORB_RADIUS + 8 + flowPulse * 6, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 1
  }
}

// Draws the skin-specific orbital ring/arc around the orb
function drawOrbRing(
  ctx: CanvasRenderingContext2D,
  orbY: number,
  state: EngineState,
  t: number,
  squeeze: number
): void {
  const ring = state.orbRingStyle ?? 'clean_orbit'
  const glow = state.orbGlow
  const ringR = ORB_RADIUS + 6  // orbital radius around the orb

  ctx.save()
  ctx.shadowBlur = 10
  ctx.shadowColor = glow
  ctx.strokeStyle = hexToRgba(glow, 0.75)
  ctx.lineWidth = 1.5

  switch (ring) {
    case 'clean_orbit': {
      // Single continuous tilted orbit ring — the logo base form
      // Enhanced with subtle animation: gentle rotation + breathing glow
      ctx.save()
      ctx.translate(ORB_X, orbY)
      ctx.scale(squeeze, 1 / squeeze)
      
      // Subtle slow rotation for premium feel
      const rotation = 0.45 + Math.sin(t * 0.5) * 0.08
      ctx.rotate(rotation)
      
      // Breathing glow effect — pulses gently
      const breathePulse = 0.5 + Math.sin(t * 1.5) * 0.5
      ctx.globalAlpha = 0.7 + breathePulse * 0.3
      
      ctx.beginPath()
      ctx.ellipse(0, 0, ringR, ringR * 0.38, 0, 0, Math.PI * 2)
      ctx.stroke()
      
      ctx.globalAlpha = 1
      ctx.restore()
      break
    }
    case 'broken_orbit': {
      // Ring with two gaps — unstable resonance
      ctx.save()
      ctx.translate(ORB_X, orbY)
      ctx.scale(squeeze, 1 / squeeze)
      ctx.rotate(t * 0.4)  // slow rotation
      // Draw arc with two gaps (four arcs)
      const gapAngle = 0.45
      ctx.beginPath()
      ctx.ellipse(0, 0, ringR, ringR * 0.4, 0, gapAngle, Math.PI - gapAngle)
      ctx.stroke()
      ctx.beginPath()
      ctx.ellipse(0, 0, ringR, ringR * 0.4, 0, Math.PI + gapAngle, Math.PI * 2 - gapAngle)
      ctx.stroke()
      ctx.restore()
      break
    }
    case 'dual_arc': {
      // Two opposing C-shaped arcs, 90deg apart — split-phase
      ctx.save()
      ctx.translate(ORB_X, orbY)
      ctx.rotate(t * 0.35)
      ctx.strokeStyle = hexToRgba(glow, 0.8)
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, 0, ringR, -Math.PI * 0.65, Math.PI * 0.65)
      ctx.stroke()
      ctx.rotate(Math.PI)
      ctx.beginPath()
      ctx.arc(0, 0, ringR, -Math.PI * 0.65, Math.PI * 0.65)
      ctx.stroke()
      ctx.restore()
      break
    }
    case 'void_halo': {
      // Wide faint full halo — deep field energy
      ctx.shadowBlur = 18
      ctx.lineWidth = 1
      ctx.globalAlpha = 0.45
      ctx.beginPath()
      ctx.arc(ORB_X, orbY, ringR + 4, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 0.2
      ctx.lineWidth = 5
      ctx.shadowBlur = 24
      ctx.beginPath()
      ctx.arc(ORB_X, orbY, ringR + 6, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
      break
    }
    case 'nova_loop': {
      // Inner tight ring + outer pulse loop
      ctx.strokeStyle = hexToRgba(glow, 0.9)
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(ORB_X, orbY, ringR - 2, 0, Math.PI * 2)
      ctx.stroke()
      // Outer pulse loop — breathes
      const novaPulse = Math.sin(t * 3) * 0.5 + 0.5
      ctx.strokeStyle = hexToRgba(glow, 0.3 + novaPulse * 0.25)
      ctx.lineWidth = 1
      ctx.shadowBlur = 14
      ctx.beginPath()
      ctx.arc(ORB_X, orbY, ringR + 4 + novaPulse * 4, 0, Math.PI * 2)
      ctx.stroke()
      break
    }
    case 'prism_orbit': {
      // Three short arc segments, evenly spaced, rotating slowly
      ctx.save()
      ctx.translate(ORB_X, orbY)
      ctx.rotate(t * 0.5)
      ctx.strokeStyle = hexToRgba(glow, 0.85)
      ctx.lineWidth = 2
      for (let i = 0; i < 3; i++) {
        const startAngle = (i / 3) * Math.PI * 2
        ctx.beginPath()
        ctx.arc(0, 0, ringR, startAngle + 0.2, startAngle + 0.9)
        ctx.stroke()
      }
      ctx.restore()
      break
    }
    case 'ember_ring': {
      // Thick arc, about 270deg, with a trailing fade
      ctx.save()
      ctx.translate(ORB_X, orbY)
      ctx.rotate(t * 0.3)
      // Thick main arc
      ctx.strokeStyle = hexToRgba(glow, 0.9)
      ctx.lineWidth = 2.5
      ctx.shadowBlur = 14
      ctx.beginPath()
      ctx.arc(0, 0, ringR, 0.4, Math.PI * 2 - 0.1)
      ctx.stroke()
      // Fading tail segment
      ctx.strokeStyle = hexToRgba(glow, 0.3)
      ctx.lineWidth = 1
      ctx.shadowBlur = 6
      ctx.beginPath()
      ctx.arc(0, 0, ringR, -0.2, 0.5)
      ctx.stroke()
      ctx.restore()
      break
    }
    default:
      break
  }

  ctx.restore()
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  state: EngineState
): void {
  for (const p of state.particles) {
    const alpha = p.life / p.maxLife
    ctx.globalAlpha = alpha
    ctx.fillStyle = p.color
    ctx.shadowBlur = 6
    ctx.shadowColor = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  ctx.shadowBlur = 0
}

function drawFloatingTexts(
  ctx: CanvasRenderingContext2D,
  state: EngineState
): void {
  for (const f of state.floatingTexts) {
    const alpha = Math.min(1, f.life / (f.maxLife * 0.3))
    ctx.globalAlpha = alpha
    ctx.shadowBlur = 8
    ctx.shadowColor = f.color
    ctx.fillStyle = f.color
    ctx.font = 'bold 11px "Space Mono", monospace'
    ctx.textAlign = 'center'
    ctx.fillText(f.text, f.x, f.y)
  }
  ctx.globalAlpha = 1
  ctx.shadowBlur = 0
  ctx.textAlign = 'left'
}

function drawMilestones(
  ctx: CanvasRenderingContext2D,
  state: EngineState
): void {
  for (const m of state.milestones) {
    const t = m.life / m.maxLife
    // Appear in first 0.3s, stay, fade out in last 0.5s
    const alpha = t > 0.8 ? (1 - t) / 0.2 : t < 0.2 ? t / 0.2 : 1
    const y = THREAD_Y - 70 + (1 - t) * 8

    ctx.globalAlpha = alpha
    ctx.shadowBlur = 16
    ctx.shadowColor = m.color
    ctx.fillStyle = m.color
    ctx.font = 'bold 14px "Space Mono", monospace'
    ctx.textAlign = 'center'
    ctx.fillText(m.text, CANVAS_WIDTH / 2, y)

    ctx.shadowBlur = 4
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.font = '10px "Space Mono", monospace'
    ctx.fillText(m.subtext, CANVAS_WIDTH / 2, y + 16)

    ctx.globalAlpha = 1
    ctx.shadowBlur = 0
    ctx.textAlign = 'left'
  }
}

// ---- Utility: hex color to rgba string ----
function hexToRgba(hex: string, alpha: number): string {
  // Handle rgba strings passthrough
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex
  const h = hex.replace('#', '')
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16)
    const g = parseInt(h.slice(2, 4), 16)
    const b = parseInt(h.slice(4, 6), 16)
    return `rgba(${r},${g},${b},${alpha.toFixed(3)})`
  }
  return hex
}



