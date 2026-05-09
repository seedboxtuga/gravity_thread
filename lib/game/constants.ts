import type { GameMode, PracticeSpeedLevel, PracticeSpeedConfig, PracticeMasteryMedal } from './types'

export const CANVAS_WIDTH = 390
export const CANVAS_HEIGHT = 600

// Thread layout
export const THREAD_Y = CANVAS_HEIGHT * 0.5
export const THREAD_HEIGHT = 6
export const THREAD_SEGMENT_WIDTH = 40

// Orb
export const ORB_X = 90
export const ORB_RADIUS = 12
export const ORB_OFFSET_Y = 28 // distance from thread center to orb center

// Flip animation duration (ms)
export const FLIP_DURATION = 120

// Scoring
export const SCORE_PER_SECOND = 10
export const OBSTACLE_PASS_BONUS = 25
export const NEAR_MISS_BONUS = 50
export const COMBO_MULTIPLIER_BASE = 1.0
export const COMBO_MULTIPLIER_STEP = 0.25
export const MAX_COMBO_MULTIPLIER = 4.0
export const COMBO_DECAY_TIME = 4000

// Difficulty scaling
export const BASE_SPEED = 220 // px/s
export const MAX_SPEED_ENDLESS = 520
export const SPEED_INCREASE_RATE = 8 // px/s per second

// Obstacle spawn
export const MIN_SPAWN_INTERVAL = 0.9 // seconds
export const MAX_SPAWN_INTERVAL = 2.2
export const MIN_SPAWN_GAP = 200 // px between obstacles

// Mode configs
export const MODE_CONFIG: Record<
  GameMode,
  {
    speedMultiplier: number
    obstacleMultiplier: number
    scoreMultiplier: number
    label: string
    color: string
  }
> = {
  endless: {
    speedMultiplier: 1.0,
    obstacleMultiplier: 1.0,
    scoreMultiplier: 1.0,
    label: 'ENDLESS',
    color: '#22d3ee',
  },
  daily: {
    speedMultiplier: 1.0,
    obstacleMultiplier: 1.0,
    scoreMultiplier: 1.5,
    label: 'DAILY',
    color: '#a78bfa',
  },
  practice: {
    speedMultiplier: 0.6,
    obstacleMultiplier: 0.6,
    scoreMultiplier: 0.5,
    label: 'PRACTICE',
    color: '#4ade80',
  },
  hard: {
    speedMultiplier: 1.5,
    obstacleMultiplier: 1.6,
    scoreMultiplier: 2.0,
    label: 'HARD',
    color: '#f97316',
  },
}

// Phase Core power-up
export const PHASE_CORE_DURATION = 6.0       // seconds shield lasts
export const PHASE_CORE_SPAWN_INTERVAL = 18  // seconds between spawns
export const PHASE_CORE_RADIUS = 10

// Background zone thresholds (distance in metres)
export const BG_ZONE_THRESHOLDS = {
  calm: 0,       // 0–400m  – neon void
  grid: 400,     // 400–900m – energy grid
  plasma: 900,   // 900–1800m – plasma storm
  hypercore: 1800, // 1800m+ – hypercore
}

// Visual colors (canvas)
export const COLORS = {
  bg: '#060a14',
  bgGrid: '#0d1424',
  thread: '#22d3ee',
  threadGlow: 'rgba(34,211,238,0.4)',
  orb: '#e0f7ff',
  orbGlow: 'rgba(34,211,238,0.8)',
  orbTrail: 'rgba(34,211,238,0.3)',
  spike: '#ff1a1a',
  spikeGlow: 'rgba(255,26,26,0.65)',
  electric: '#a78bfa',
  electricGlow: 'rgba(167,139,250,0.6)',
  blade: '#f97316',
  bladeGlow: 'rgba(249,115,22,0.5)',
  gap: '#1a1a2e',
  warning: '#fbbf24',
  nearMiss: '#4ade80',
  comboText: '#fbbf24',
  scoreText: '#ffffff',
  gridLine: 'rgba(34,211,238,0.04)',
  phaseCore: '#7dd3fc',
  phaseCoreGlow: 'rgba(125,211,252,0.9)',
  phaseShield: 'rgba(125,211,252,0.35)',
  phaseShieldRing: '#7dd3fc',
}

// ringStyle describes the orbital decoration drawn around each orb skin.
// Renderers read this field to draw the correct arc/ring variant.
export type OrbRingStyle =
  | 'clean_orbit'      // single continuous orbit ring (default logo form)
  | 'broken_orbit'     // ring with two gaps — broken arc
  | 'dual_arc'         // two opposing curved arcs, 90deg rotated
  | 'void_halo'        // wide faint full halo, no gap
  | 'nova_loop'        // tight inner ring + outer pulse loop
  | 'prism_orbit'      // three short arc segments, evenly spaced
  | 'ember_ring'       // single arc, thicker, with trailing fade

export const ORB_SKINS: Array<{
  id: string
  name: string
  description: string
  color: string
  glowColor: string
  trailColor: string
  ringStyle: OrbRingStyle
  unlocked: boolean
  cost?: number
}> = [
  {
    id: 'default',
    name: 'Cyan Core',
    description: 'Clean orbit ring — the base form.',
    color: '#dff6ff',
    glowColor: '#22d3ee',
    trailColor: 'rgba(34,211,238,0.28)',
    ringStyle: 'clean_orbit',
    unlocked: true,
  },
  {
    id: 'ember',
    name: 'Ember Ring',
    description: 'Thick arc with a trailing fade — heat-forged.',
    color: '#fff4e0',
    glowColor: '#f97316',
    trailColor: 'rgba(249,115,22,0.28)',
    ringStyle: 'ember_ring',
    unlocked: false,
    cost: 500,
  },
  {
    id: 'void',
    name: 'Void Halo',
    description: 'Wide faint halo ring — deep field energy.',
    color: '#ede8ff',
    glowColor: '#a78bfa',
    trailColor: 'rgba(167,139,250,0.28)',
    ringStyle: 'void_halo',
    unlocked: false,
    cost: 750,
  },
  {
    id: 'prism',
    name: 'Prism Orbit',
    description: 'Three arc segments — refracted signal.',
    color: '#e0fff0',
    glowColor: '#4ade80',
    trailColor: 'rgba(74,222,128,0.28)',
    ringStyle: 'prism_orbit',
    unlocked: false,
    cost: 1000,
  },
  {
    id: 'nova',
    name: 'Nova Loop',
    description: 'Inner ring + outer pulse — collapsed star.',
    color: '#fffbe0',
    glowColor: '#fbbf24',
    trailColor: 'rgba(251,191,36,0.28)',
    ringStyle: 'nova_loop',
    unlocked: false,
    cost: 1500,
  },
  {
    id: 'dual',
    name: 'Dual Arc',
    description: 'Two opposing arcs — split-phase orbit.',
    color: '#ffe0f4',
    glowColor: '#f472b6',
    trailColor: 'rgba(244,114,182,0.28)',
    ringStyle: 'dual_arc',
    unlocked: false,
    cost: 2000,
  },
  {
    id: 'broken',
    name: 'Broken Orbit',
    description: 'Ring with two gaps — unstable resonance.',
    color: '#f0f0f0',
    glowColor: '#94a3b8',
    trailColor: 'rgba(148,163,184,0.28)',
    ringStyle: 'broken_orbit',
    unlocked: false,
    cost: 3000,
  },
]

export const ACHIEVEMENTS = [
  {
    id: 'first_flip',
    title: 'First Flip',
    description: 'Make your first thread flip',
    icon: '⚡',
    target: 1,
  },
  {
    id: 'score_100',
    title: 'Getting Started',
    description: 'Reach a score of 100',
    icon: '★',
    target: 100,
  },
  {
    id: 'score_500',
    title: 'Thread Walker',
    description: 'Reach a score of 500',
    icon: '🏆',
    target: 500,
  },
  {
    id: 'score_1000',
    title: 'Thread Master',
    description: 'Reach a score of 1000',
    icon: '💎',
    target: 1000,
  },
  {
    id: 'score_5000',
    title: 'Gravity God',
    description: 'Reach a score of 5000',
    icon: '⚡',
    target: 5000,
  },
  {
    id: 'near_miss_10',
    title: 'Living Dangerously',
    description: 'Get 10 near misses in one run',
    icon: '😅',
    target: 10,
  },
  {
    id: 'combo_10',
    title: 'Combo Starter',
    description: 'Reach a combo of 10x',
    icon: '🔥',
    target: 10,
  },
  {
    id: 'combo_master',
    title: 'Combo Master',
    description: 'Reach maximum combo multiplier',
    icon: '👑',
    target: 1,
  },
  {
    id: 'daily_challenger',
    title: 'Daily Challenger',
    description: 'Complete a daily challenge',
    icon: '📅',
    target: 1,
  },
  {
    id: 'flips_100',
    title: 'Flip Champion',
    description: 'Make 100 total flips',
    icon: '🔄',
    target: 100,
  },
  {
    id: 'runs_50',
    title: 'Addicted',
    description: 'Play 50 runs',
    icon: '🎮',
    target: 50,
  },
  {
    id: 'hard_mode',
    title: 'Hardcore',
    description: 'Score 200 in Hard Mode',
    icon: '💪',
    target: 200,
  },
]
