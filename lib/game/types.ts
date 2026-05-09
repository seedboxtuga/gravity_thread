import type { BiomeId } from './biomes'

export type OrbSide = 'top' | 'bottom'

// ============================================================
// Final obstacle system — 6 universal + 5 biome signatures
// ============================================================
// Universal (all biomes):
//   static_spike   — basic dodge; neon red spike pinned to top or bottom of thread
//   void_wall      — full-height wall with one safe gap; read the gap, flip through it
//   pulse_gate     — rhythmic open/close gate; timing obstacle
//   snap_blocker   — holds at one edge of thread, telegraphs, then snaps across fast
//   thread_clamp   — two bars squeeze from both sides toward thread center; sustained pressure
//   decay_spike    — delayed activation; orange warning phase → becomes live neon red danger
//
// Biome signatures (one per biome, late-game only):
//   glitch_firewall  — Cyber Rail
//   prism_fan        — Crystal Rift
//   eruption_vent    — Magma Wire
//   pressure_ring    — Abyss Trench
//   piston_crusher   — Clockwork Spine

export type ObstacleType =
  // Universal
  | 'static_spike'
  | 'void_wall'
  | 'pulse_gate'
  | 'snap_blocker'
  | 'thread_clamp'
  | 'decay_spike'
  // Biome signatures
  | 'glitch_firewall'   // Cyber Rail
  | 'prism_fan'         // Crystal Rift
  | 'eruption_vent'     // Magma Wire
  | 'pressure_ring'     // Abyss Trench
  | 'piston_crusher'    // Clockwork Spine

export type GameState = 'idle' | 'playing' | 'paused' | 'dead'

export type GameMode = 'endless' | 'daily' | 'practice' | 'hard'

// Practice Lab speed levels
export type PracticeSpeedLevel = 
  | 'beginner' 
  | 'easy' 
  | 'normal' 
  | 'fast' 
  | 'hard_speed' 
  | 'extreme' 
  | 'thread_god'

export type PracticeMasteryMedal = 'none' | 'bronze' | 'silver' | 'gold' | 'perfect'

export type PracticeGrade = 'S' | 'A' | 'B' | 'C' | 'D'

export interface PracticeSpeedConfig {
  id: PracticeSpeedLevel
  label: string
  description: string
  speedMultiplier: number
  obstacleMultiplier: number
  unlockRequirement: {
    type: 'default' | 'endless_score' | 'mastery'
    endlessScore?: number
    masteryLevel?: PracticeSpeedLevel
    masteryMedal?: PracticeMasteryMedal
  }
}

export interface PracticeRunStats {
  speedLevel: PracticeSpeedLevel
  timeSurvived: number
  hits: number
  cleanDodges: number
  accuracy: number
  longestCleanStreak: number
  currentCleanStreak: number
  nearMisses: number
  grade: PracticeGrade
}

export interface PracticeLevelStats {
  bestAccuracy: number
  longestCleanStreak: number
  fewestHitsIn120s: number | null
  bestGrade: PracticeGrade | null
  masteryMedal: PracticeMasteryMedal
}

// Daily mission types
export type MissionType =
  | 'survive_distance'
  | 'collect_phase_cores'
  | 'near_misses'
  | 'reach_combo'
  | 'reach_zone'

export interface DailyMission {
  id: string
  type: MissionType
  label: string
  target: number
  progress: number
  completed: boolean
}

export interface Obstacle {
  id: string
  type: ObstacleType
  x: number
  width: number
  lane: OrbSide | 'both' | 'gap_top' | 'gap_bottom'
  active: boolean

  // General animation phase
  pulsePhase?: number
  timerPhase?: number

  // snap_blocker state machine
  blockPhase?: number      // accumulated time in current cycle
  snapStartY?: number      // Y position when snap began
  snapEndY?: number        // Y target for snap
  movingY?: number         // current perpendicular offset
  movingDir?: number       // 1 = moving to +side, -1 = moving to -side
  telegraphIntensity?: number  // 0..1 during telegraph phase
  isSnapping?: boolean

  // decay_spike — activation state
  decayPhase?: number      // 0..1; <0.6 = warning, >=0.6 = live danger
  decayLive?: boolean

  // thread_clamp — squeeze progress
  clampPhase?: number

  // Thread Sight integration — pre-glow on dangerous side
  threadSightActive?: boolean

  // Legacy (used by biome signatures)
  bladeAngle?: number
  warningShown?: boolean
  extendedPhase?: number
}

// ============================================================
// Power-ups
// ============================================================

export type PowerUpType = 'phase_core' | 'thread_sight'

export interface PowerUp {
  id: string
  x: number
  y: number
  type: PowerUpType
  radius: number
  pulsePhase: number
  active: boolean
}

export interface Particle {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

export interface FloatingText {
  id: string
  text: string
  x: number
  y: number
  color: string
  life: number
  maxLife: number
}

export interface GameStats {
  score: number
  bestScore: number
  combo: number
  maxCombo: number
  nearMisses: number
  distance: number
  flips: number
  streak: number
  phaseCoresCollected: number
  zoneReached: number
}

export interface RunResult {
  score: number
  isNewBest: boolean
  combo: number
  nearMisses: number
  distance: number
  flips: number
  zoneReached: number
  phaseCoresCollected: number
  mode: GameMode
  biome: BiomeId
  timestamp: number
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlocked: boolean
  progress?: number
  target?: number
}

export interface OrbSkin {
  id: string
  name: string
  description?: string
  color: string
  glowColor: string
  trailColor: string
  ringStyle?: string
  unlocked: boolean
  cost?: number
}

export interface DailyChallenge {
  date: string
  seed: number
  bestScore: number
  completed: boolean
  rank?: number
  missions: DailyMission[]
}

export interface PlayerProfile {
  totalRuns: number
  totalDistance: number
  totalFlips: number
  allTimeHigh: number
  dailyChallenges: number
  achievements: string[]
  equippedSkin: string
  selectedMode: GameMode
  selectedBiome: BiomeId
  biomeScores: Partial<Record<BiomeId, number>>
  totalPhaseCores: number
  totalNearMisses: number
}
