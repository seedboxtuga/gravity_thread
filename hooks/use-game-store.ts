'use client'

import { useState, useCallback } from 'react'
import type {
  PlayerProfile,
  Achievement,
  DailyChallenge,
  RunResult,
  DailyMission,
} from '@/lib/game/types'
import type { BiomeId } from '@/lib/game/biomes'
import { ACHIEVEMENTS, ORB_SKINS } from '@/lib/game/constants'
import { getDailySeed } from '@/lib/game/scoring'

const STORAGE_KEY = 'gravity_thread_v2'

interface StoredData {
  profile: PlayerProfile
  achievements: Achievement[]
  dailyChallenge: DailyChallenge
  recentRuns: RunResult[]
}

function getToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function defaultProfile(): PlayerProfile {
  return {
    totalRuns: 0,
    totalDistance: 0,
    totalFlips: 0,
    allTimeHigh: 0,
    dailyChallenges: 0,
    achievements: [],
    equippedSkin: 'default',
    selectedMode: 'endless',
    selectedBiome: 'cyber_rail',
    biomeScores: {},
    totalPhaseCores: 0,
    totalNearMisses: 0,
  }
}

function defaultAchievements(): Achievement[] {
  return ACHIEVEMENTS.map((a) => ({
    ...a,
    unlocked: false,
    progress: 0,
  }))
}

function generateDailyMissions(): DailyMission[] {
  const seed = getDailySeed()
  const pool: DailyMission[] = [
    { id: 'dm_dist', type: 'survive_distance', label: 'Survive 300m', target: 300, progress: 0, completed: false },
    { id: 'dm_phase', type: 'collect_phase_cores', label: 'Collect 2 Phase Cores', target: 2, progress: 0, completed: false },
    { id: 'dm_near', type: 'near_misses', label: 'Get 5 near misses', target: 5, progress: 0, completed: false },
    { id: 'dm_combo', type: 'reach_combo', label: 'Reach combo x8', target: 8, progress: 0, completed: false },
    { id: 'dm_zone', type: 'reach_zone', label: 'Reach Zone 2', target: 2, progress: 0, completed: false },
  ]
  // Pick 3 missions using seed
  const pick = (seed % pool.length + pool.length) % pool.length
  const indices = [pick % pool.length, (pick + 1) % pool.length, (pick + 2) % pool.length]
  return indices.map((i) => ({ ...pool[i] }))
}

function defaultDaily(): DailyChallenge {
  return {
    date: getToday(),
    seed: getDailySeed(),
    bestScore: 0,
    completed: false,
    missions: generateDailyMissions(),
  }
}

function loadData(): StoredData {
  if (typeof window === 'undefined') {
    return {
      profile: defaultProfile(),
      achievements: defaultAchievements(),
      dailyChallenge: defaultDaily(),
      recentRuns: [],
    }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) throw new Error('no data')
    const parsed = JSON.parse(raw) as StoredData

    // Refresh daily if date changed
    if (parsed.dailyChallenge.date !== getToday()) {
      parsed.dailyChallenge = defaultDaily()
    }

    // Ensure missions exist
    if (!parsed.dailyChallenge.missions || parsed.dailyChallenge.missions.length === 0) {
      parsed.dailyChallenge.missions = generateDailyMissions()
    }

    // Migrate profile fields if missing
    if (!parsed.profile.selectedBiome) parsed.profile.selectedBiome = 'cyber_rail'
    if (!parsed.profile.biomeScores) parsed.profile.biomeScores = {}
    if (parsed.profile.totalPhaseCores === undefined) parsed.profile.totalPhaseCores = 0
    if (parsed.profile.totalNearMisses === undefined) parsed.profile.totalNearMisses = 0

    return parsed
  } catch {
    return {
      profile: defaultProfile(),
      achievements: defaultAchievements(),
      dailyChallenge: defaultDaily(),
      recentRuns: [],
    }
  }
}

function saveData(data: StoredData): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {}
}

export function useGameStore() {
  const [data, setData] = useState<StoredData>(loadData)

  const save = useCallback((updated: StoredData) => {
    setData(updated)
    saveData(updated)
  }, [])

  const recordRun = useCallback(
    (result: RunResult) => {
      setData((prev) => {
        const updated: StoredData = {
          ...prev,
          profile: { ...prev.profile },
          dailyChallenge: { ...prev.dailyChallenge },
        }

        // Practice Mode: track as a run but don't count toward stats/records/leaderboards
        if (result.mode === 'practice') {
          // Don't update competitive stats for practice runs
          updated.recentRuns = [result, ...(prev.recentRuns ?? [])].slice(0, 20)
          saveData(updated)
          return updated
        }

        updated.profile.totalRuns++
        updated.profile.totalDistance += result.distance
        updated.profile.totalFlips += result.flips
        updated.profile.totalPhaseCores = (updated.profile.totalPhaseCores ?? 0) + (result.phaseCoresCollected ?? 0)
        updated.profile.totalNearMisses = (updated.profile.totalNearMisses ?? 0) + result.nearMisses

        if (result.score > updated.profile.allTimeHigh) {
          updated.profile.allTimeHigh = result.score
        }

        // Biome best score
        const biomeId = result.biome ?? 'cyber_rail'
        const prevBiomeScore = updated.profile.biomeScores?.[biomeId] ?? 0
        if (result.score > prevBiomeScore) {
          updated.profile.biomeScores = {
            ...updated.profile.biomeScores,
            [biomeId]: result.score,
          }
        }

        // Daily challenge
        if (result.mode === 'daily') {
          if (result.score > updated.dailyChallenge.bestScore) {
            updated.dailyChallenge.bestScore = result.score
          }
          if (!updated.dailyChallenge.completed) {
            updated.dailyChallenge.completed = true
            updated.profile.dailyChallenges++
          }
        }

        // Update daily missions
        updated.dailyChallenge = updateMissions(updated.dailyChallenge, result)

        // Recent runs
        updated.recentRuns = [result, ...(prev.recentRuns ?? [])].slice(0, 20)

        // Achievements
        updated.achievements = checkAchievements(
          prev.achievements ?? defaultAchievements(),
          updated.profile,
          result
        )

        saveData(updated)
        return updated
      })
    },
    []
  )

  const equipSkin = useCallback((skinId: string) => {
    setData((prev) => {
      const updated = { ...prev, profile: { ...prev.profile, equippedSkin: skinId } }
      saveData(updated)
      return updated
    })
  }, [])

  const setMode = useCallback((mode: PlayerProfile['selectedMode']) => {
    setData((prev) => {
      const updated = { ...prev, profile: { ...prev.profile, selectedMode: mode } }
      saveData(updated)
      return updated
    })
  }, [])

  const setBiome = useCallback((biomeId: BiomeId) => {
    setData((prev) => {
      const updated = { ...prev, profile: { ...prev.profile, selectedBiome: biomeId } }
      saveData(updated)
      return updated
    })
  }, [])

  return {
    profile: data.profile,
    achievements: data.achievements,
    dailyChallenge: data.dailyChallenge,
    recentRuns: data.recentRuns ?? [],
    recordRun,
    equipSkin,
    setMode,
    setBiome,
  }
}

// ---- Mission progress updater ----
function updateMissions(daily: DailyChallenge, result: RunResult): DailyChallenge {
  if (!daily.missions) return daily

  const updated: DailyMission[] = daily.missions.map((m) => {
    if (m.completed) return m
    let progress = m.progress
    switch (m.type) {
      case 'survive_distance':
        progress = Math.max(progress, result.distance)
        break
      case 'collect_phase_cores':
        progress = Math.max(progress, result.phaseCoresCollected ?? 0)
        break
      case 'near_misses':
        progress = Math.max(progress, result.nearMisses)
        break
      case 'reach_combo':
        progress = Math.max(progress, result.combo)
        break
      case 'reach_zone':
        progress = Math.max(progress, result.zoneReached ?? 0)
        break
    }
    const completed = progress >= m.target
    return { ...m, progress, completed }
  })

  return { ...daily, missions: updated }
}

// ---- Achievement checker ----
function checkAchievements(
  achievements: Achievement[],
  profile: PlayerProfile,
  result: RunResult
): Achievement[] {
  return achievements.map((ach) => {
    if (ach.unlocked) return ach
    let progress = ach.progress ?? 0
    let unlocked = false

    switch (ach.id) {
      case 'first_flip':
        progress = result.flips > 0 ? 1 : 0
        unlocked = result.flips > 0
        break
      case 'score_100':
        progress = Math.floor(result.score)
        unlocked = result.score >= 100
        break
      case 'score_500':
        progress = Math.floor(result.score)
        unlocked = result.score >= 500
        break
      case 'score_1000':
        progress = Math.floor(result.score)
        unlocked = result.score >= 1000
        break
      case 'score_5000':
        progress = Math.floor(result.score)
        unlocked = result.score >= 5000
        break
      case 'near_miss_10':
        progress = result.nearMisses
        unlocked = result.nearMisses >= 10
        break
      case 'combo_10':
        progress = result.combo
        unlocked = result.combo >= 10
        break
      case 'combo_master':
        unlocked = result.combo >= 12
        break
      case 'daily_challenger':
        unlocked = result.mode === 'daily'
        break
      case 'flips_100':
        progress = profile.totalFlips
        unlocked = profile.totalFlips >= 100
        break
      case 'runs_50':
        progress = profile.totalRuns
        unlocked = profile.totalRuns >= 50
        break
      case 'hard_mode':
        unlocked = result.mode === 'hard' && result.score >= 200
        break
    }

    return { ...ach, progress, unlocked }
  })
}
