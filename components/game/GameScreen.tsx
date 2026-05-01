'use client'

import dynamic from 'next/dynamic'
import type { GameMode, RunResult } from '@/lib/game/types'
import type { BiomeId } from '@/lib/game/biomes'
import type { SoundId } from '@/lib/audio/audioManager'

const GameCanvas = dynamic(() => import('./GameCanvas'), { ssr: false })

interface GameScreenProps {
  mode: GameMode
  biomeId: BiomeId
  orbSkinId: string
  bestScore: number
  onRunEnd: (result: RunResult) => void
  onPause: () => void
  playSound?: (id: SoundId) => void
}

export default function GameScreen(props: GameScreenProps) {
  return (
    <div className="w-full h-full">
      <GameCanvas {...props} />
    </div>
  )
}
