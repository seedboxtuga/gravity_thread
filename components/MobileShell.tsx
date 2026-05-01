'use client'

import { useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { GameMode, RunResult } from '@/lib/game/types'
import type { BiomeId } from '@/lib/game/biomes'
import { useGameStore } from '@/hooks/use-game-store'
import { AudioProvider, useAudioContext } from './audio/AudioProvider'

import HomeScreen from './screens/HomeScreen'
import ResultsScreen from './screens/ResultsScreen'
import PauseScreen from './screens/PauseScreen'
import LeaderboardScreen from './screens/LeaderboardScreen'
import AchievementsScreen from './screens/AchievementsScreen'
import CosmeticsScreen from './screens/CosmeticsScreen'
import StatsScreen from './screens/StatsScreen'
import SettingsScreen from './screens/SettingsScreen'
import HowToPlayScreen from './screens/HowToPlayScreen'
import GameScreen from './game/GameScreen'

type Screen =
  | 'home'
  | 'game'
  | 'results'
  | 'pause'
  | 'leaderboard'
  | 'achievements'
  | 'cosmetics'
  | 'stats'
  | 'settings'
  | 'howtoplay'

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({
    x: dir > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
}

const fadeVariants = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
}

export default function MobileShell() {
  return (
    <AudioProvider>
      <MobileShellInner />
    </AudioProvider>
  )
}

function MobileShellInner() {
  const {
    profile,
    achievements,
    dailyChallenge,
    recentRuns,
    recordRun,
    equipSkin,
    setMode,
    setBiome,
  } = useGameStore()
  const { play, unlock, stopBackgroundMusic } = useAudioContext()

  const [screen, setScreen] = useState<Screen>('home')
  const [dir, setDir] = useState(1)
  const [lastResult, setLastResult] = useState<RunResult | null>(null)
  const [pausedScore, setPausedScore] = useState(0)
  const [activeMode, setActiveMode] = useState<GameMode>('endless')
  const [activeBiome, setActiveBiome] = useState<BiomeId>(profile.selectedBiome ?? 'cyber_rail')

  const navigate = useCallback((to: Screen, direction = 1) => {
    unlock()
    play('ui_tap')
    setDir(direction)
    setScreen(to)
    // Stop music when leaving game/pause
    if (to !== 'game' && to !== 'pause') {
      stopBackgroundMusic()
    }
  }, [unlock, play, stopBackgroundMusic])

  const handlePlay = useCallback(
    (mode: GameMode) => {
      unlock()
      play('ui_tap')
      setActiveMode(mode)
      setMode(mode)
      setActiveBiome(profile.selectedBiome ?? 'cyber_rail')
      navigate('game', 1)
    },
    [navigate, setMode, profile.selectedBiome, play, unlock]
  )

  const handleBiomeSelect = useCallback(
    (biomeId: BiomeId) => {
      setBiome(biomeId)
      setActiveBiome(biomeId)
    },
    [setBiome]
  )

  const handleRunEnd = useCallback(
    (result: RunResult) => {
      recordRun(result)
      setLastResult(result)
      navigate('results', 1)
    },
    [navigate, recordRun]
  )

  const handlePause = useCallback(() => {
    navigate('pause', 1)
  }, [navigate])

  const handleReplay = useCallback(() => {
    navigate('game', 1)
    setTimeout(() => {
      const restart = (window as unknown as Record<string, unknown>).__gravityRestart
      if (typeof restart === 'function') restart()
    }, 100)
  }, [navigate])

  const handleResume = useCallback(() => {
    navigate('game', -1)
    setTimeout(() => {
      const resume = (window as unknown as Record<string, unknown>).__gravityResume
      if (typeof resume === 'function') resume()
    }, 50)
  }, [navigate])

  const bestScore = profile.allTimeHigh
  const isPause = screen === 'pause'

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ background: '#060a14' }}
    >
      {/* Game is always mounted when active or paused to preserve state */}
      {(screen === 'game' || screen === 'pause') && (
        <div
          className="absolute inset-0"
          style={{ zIndex: isPause ? 1 : 10 }}
        >
          <GameScreen
            mode={activeMode}
            biomeId={activeBiome}
            orbSkinId={profile.equippedSkin}
            bestScore={bestScore}
            onRunEnd={handleRunEnd}
            onPause={handlePause}
            playSound={play}
          />
        </div>
      )}

      {/* Pause overlay */}
      {screen === 'pause' && (
        <div className="absolute inset-0 z-50">
          <PauseScreen
            score={pausedScore}
            bestScore={bestScore}
            mode={activeMode}
            onResume={handleResume}
            onRestart={() => {
              navigate('game', 1)
              setTimeout(() => {
                const restart = (window as unknown as Record<string, unknown>).__gravityRestart
                if (typeof restart === 'function') restart()
              }, 100)
            }}
            onHome={() => navigate('home', -1)}
          />
        </div>
      )}

      {/* Non-game screens */}
      {screen !== 'game' && screen !== 'pause' && (
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={screen}
            custom={dir}
            variants={screen === 'home' ? fadeVariants : slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0"
            style={{ zIndex: 10 }}
          >
            {screen === 'home' && (
              <HomeScreen
                profile={profile}
                dailyChallenge={dailyChallenge}
                onPlay={handlePlay}
                onLeaderboard={() => navigate('leaderboard', 1)}
                onAchievements={() => navigate('achievements', 1)}
                onCosmetics={() => navigate('cosmetics', 1)}
                onSettings={() => navigate('settings', 1)}
                onStats={() => navigate('stats', 1)}
                onBiomeSelect={handleBiomeSelect}
              />
            )}

            {screen === 'results' && lastResult && (
              <ResultsScreen
                result={lastResult}
                allTimeHigh={profile.allTimeHigh}
                dailyChallenge={dailyChallenge}
                onReplay={handleReplay}
                onHome={() => navigate('home', -1)}
                onLeaderboard={() => navigate('leaderboard', 1)}
              />
            )}

            {screen === 'leaderboard' && (
              <LeaderboardScreen
                recentRuns={recentRuns}
                allTimeHigh={profile.allTimeHigh}
                onBack={() => navigate('home', -1)}
              />
            )}

            {screen === 'achievements' && (
              <AchievementsScreen
                achievements={achievements}
                onBack={() => navigate('home', -1)}
              />
            )}

            {screen === 'cosmetics' && (
              <CosmeticsScreen
                equippedSkin={profile.equippedSkin}
                allTimeHigh={profile.allTimeHigh}
                onEquip={equipSkin}
                onBack={() => navigate('home', -1)}
              />
            )}

            {screen === 'stats' && (
              <StatsScreen
                profile={profile}
                onBack={() => navigate('home', -1)}
              />
            )}

            {screen === 'settings' && (
              <SettingsScreen
                onBack={() => navigate('home', -1)}
                onHowToPlay={() => navigate('howtoplay', 1)}
              />
            )}

            {screen === 'howtoplay' && (
              <HowToPlayScreen
                onBack={() => navigate('settings', -1)}
                onPlay={() => handlePlay(profile.selectedMode)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}
