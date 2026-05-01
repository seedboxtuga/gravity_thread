import {
  SCORE_PER_SECOND,
  OBSTACLE_PASS_BONUS,
  NEAR_MISS_BONUS,
  COMBO_MULTIPLIER_BASE,
  COMBO_MULTIPLIER_STEP,
  MAX_COMBO_MULTIPLIER,
  MODE_CONFIG,
} from './constants'
import type { GameMode } from './types'

export function calcComboMultiplier(combo: number): number {
  const mult =
    COMBO_MULTIPLIER_BASE + Math.floor(combo / 3) * COMBO_MULTIPLIER_STEP
  return Math.min(mult, MAX_COMBO_MULTIPLIER)
}

export function calcSurvivalScore(
  deltaSeconds: number,
  combo: number,
  mode: GameMode
): number {
  const mult = calcComboMultiplier(combo) * MODE_CONFIG[mode].scoreMultiplier
  return SCORE_PER_SECOND * deltaSeconds * mult
}

export function calcObstacleBonus(combo: number, mode: GameMode): number {
  const mult = calcComboMultiplier(combo) * MODE_CONFIG[mode].scoreMultiplier
  return Math.round(OBSTACLE_PASS_BONUS * mult)
}

export function calcNearMissBonus(mode: GameMode): number {
  return Math.round(NEAR_MISS_BONUS * MODE_CONFIG[mode].scoreMultiplier)
}

export function formatScore(score: number): string {
  return Math.floor(score).toLocaleString()
}

export function calcDistance(score: number): number {
  return Math.floor(score * 0.8)
}

export function getDailySeed(date?: Date): number {
  const d = date ?? new Date()
  const str = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

// Seeded random for daily challenges
export function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}
