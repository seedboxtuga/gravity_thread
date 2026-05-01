'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ORB_SKINS } from '@/lib/game/constants'
import type { OrbRingStyle } from '@/lib/game/constants'

interface CosmeticsScreenProps {
  equippedSkin: string
  allTimeHigh: number
  onEquip: (id: string) => void
  onBack: () => void
}

// Canvas-renders a single orb with its ring style — mirrors drawOrbRing logic
function OrbCanvas({
  color,
  glowColor,
  ringStyle,
  size = 56,
  animate = false,
}: {
  color: string
  glowColor: string
  ringStyle: OrbRingStyle
  size?: number
  animate?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const t0 = useRef(Date.now())

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    ctx.scale(dpr, dpr)

    const cx = size / 2
    const cy = size / 2
    const R = size * 0.22          // orb radius
    const ringR = R + size * 0.12  // orbit radius

    function hexToRgba(hex: string, alpha: number): string {
      const h = hex.replace('#', '')
      const r = parseInt(h.slice(0, 2), 16)
      const g = parseInt(h.slice(2, 4), 16)
      const b = parseInt(h.slice(4, 6), 16)
      return `rgba(${r},${g},${b},${alpha.toFixed(3)})`
    }

    function draw(t: number) {
      ctx.clearRect(0, 0, size, size)

      // Ambient glow
      ctx.shadowBlur = 0
      const outerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, ringR + 8)
      outerGrad.addColorStop(0, hexToRgba(glowColor, 0.22))
      outerGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = outerGrad
      ctx.beginPath()
      ctx.arc(cx, cy, ringR + 8, 0, Math.PI * 2)
      ctx.fill()

      // --- Ring / arc ---
      ctx.shadowBlur = 8
      ctx.shadowColor = hexToRgba(glowColor, 0.8)
      ctx.strokeStyle = hexToRgba(glowColor, 0.75)
      ctx.lineWidth = size * 0.036

      switch (ringStyle) {
        case 'clean_orbit': {
          ctx.save()
          ctx.translate(cx, cy)
          ctx.rotate(0.45)
          ctx.beginPath()
          ctx.ellipse(0, 0, ringR, ringR * 0.38, 0, 0, Math.PI * 2)
          ctx.stroke()
          ctx.restore()
          break
        }
        case 'broken_orbit': {
          ctx.save()
          ctx.translate(cx, cy)
          ctx.rotate(t * 0.4)
          const gap = 0.45
          ctx.beginPath()
          ctx.ellipse(0, 0, ringR, ringR * 0.4, 0, gap, Math.PI - gap)
          ctx.stroke()
          ctx.beginPath()
          ctx.ellipse(0, 0, ringR, ringR * 0.4, 0, Math.PI + gap, Math.PI * 2 - gap)
          ctx.stroke()
          ctx.restore()
          break
        }
        case 'dual_arc': {
          ctx.save()
          ctx.translate(cx, cy)
          ctx.rotate(t * 0.35)
          ctx.strokeStyle = hexToRgba(glowColor, 0.85)
          ctx.lineWidth = size * 0.045
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
          ctx.shadowBlur = 18
          ctx.lineWidth = size * 0.022
          ctx.globalAlpha = 0.45
          ctx.beginPath()
          ctx.arc(cx, cy, ringR + 2, 0, Math.PI * 2)
          ctx.stroke()
          ctx.globalAlpha = 0.18
          ctx.lineWidth = size * 0.1
          ctx.shadowBlur = 24
          ctx.beginPath()
          ctx.arc(cx, cy, ringR + 5, 0, Math.PI * 2)
          ctx.stroke()
          ctx.globalAlpha = 1
          break
        }
        case 'nova_loop': {
          ctx.strokeStyle = hexToRgba(glowColor, 0.9)
          ctx.lineWidth = size * 0.036
          ctx.beginPath()
          ctx.arc(cx, cy, ringR - 2, 0, Math.PI * 2)
          ctx.stroke()
          const pulse = Math.sin(t * 3) * 0.5 + 0.5
          ctx.strokeStyle = hexToRgba(glowColor, 0.28 + pulse * 0.22)
          ctx.lineWidth = size * 0.022
          ctx.shadowBlur = 14
          ctx.beginPath()
          ctx.arc(cx, cy, ringR + 4 + pulse * 3, 0, Math.PI * 2)
          ctx.stroke()
          break
        }
        case 'prism_orbit': {
          ctx.save()
          ctx.translate(cx, cy)
          ctx.rotate(t * 0.5)
          ctx.strokeStyle = hexToRgba(glowColor, 0.85)
          ctx.lineWidth = size * 0.045
          for (let i = 0; i < 3; i++) {
            const a = (i / 3) * Math.PI * 2
            ctx.beginPath()
            ctx.arc(0, 0, ringR, a + 0.2, a + 0.9)
            ctx.stroke()
          }
          ctx.restore()
          break
        }
        case 'ember_ring': {
          ctx.save()
          ctx.translate(cx, cy)
          ctx.rotate(t * 0.3)
          ctx.strokeStyle = hexToRgba(glowColor, 0.9)
          ctx.lineWidth = size * 0.055
          ctx.shadowBlur = 14
          ctx.beginPath()
          ctx.arc(0, 0, ringR, 0.4, Math.PI * 2 - 0.1)
          ctx.stroke()
          ctx.strokeStyle = hexToRgba(glowColor, 0.28)
          ctx.lineWidth = size * 0.022
          ctx.shadowBlur = 5
          ctx.beginPath()
          ctx.arc(0, 0, ringR, -0.2, 0.5)
          ctx.stroke()
          ctx.restore()
          break
        }
      }

      // Orb body
      const radGrad = ctx.createRadialGradient(cx - R * 0.28, cy - R * 0.28, R * 0.06, cx, cy, R)
      radGrad.addColorStop(0, '#ffffff')
      radGrad.addColorStop(0.38, color)
      radGrad.addColorStop(1, glowColor)
      ctx.fillStyle = radGrad
      ctx.shadowBlur = 14
      ctx.shadowColor = hexToRgba(glowColor, 0.9)
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.fill()

      // Specular
      ctx.shadowBlur = 0
      ctx.fillStyle = 'rgba(255,255,255,0.42)'
      ctx.beginPath()
      ctx.ellipse(cx - R * 0.28, cy - R * 0.28, R * 0.36, R * 0.28, -0.5, 0, Math.PI * 2)
      ctx.fill()
    }

    if (animate) {
      function loop() {
        const t = (Date.now() - t0.current) / 1000
        draw(t)
        rafRef.current = requestAnimationFrame(loop)
      }
      loop()
      return () => cancelAnimationFrame(rafRef.current)
    } else {
      draw(0)
    }
  }, [color, glowColor, ringStyle, size, animate])

  return <canvas ref={canvasRef} style={{ display: 'block' }} />
}

export default function CosmeticsScreen({
  equippedSkin,
  allTimeHigh,
  onEquip,
  onBack,
}: CosmeticsScreenProps) {
  const skins = ORB_SKINS.map((s) => ({
    ...s,
    unlocked: s.unlocked || (s.cost ? allTimeHigh >= s.cost : true),
  }))

  const activeSkin = skins.find((s) => s.id === equippedSkin) ?? skins[0]

  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 55% 35% at 50% 0%, ${activeSkin.glowColor}0d 0%, transparent 60%)`,
        }}
      />

      <div className="relative z-10 flex flex-col h-full px-5 pb-8 overflow-y-auto">
        {/* Header */}
        <motion.div
          className="flex items-center gap-3 pt-8 pb-5"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8L10 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
            </svg>
          </button>
          <div>
            <h2 className="text-lg font-bold text-foreground">Orb Skins</h2>
            <p className="text-[11px] font-mono text-muted-foreground">Logo-form variants</p>
          </div>
        </motion.div>

        {/* Selected skin preview */}
        <motion.div
          className="flex flex-col items-center mb-6"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.08 }}
          key={equippedSkin}
        >
          <div
            className="relative flex items-center justify-center w-28 h-28 rounded-full mb-3"
            style={{
              background: `radial-gradient(circle, ${activeSkin.glowColor}12 0%, transparent 70%)`,
              border: `1px solid ${activeSkin.glowColor}25`,
            }}
          >
            <OrbCanvas
              color={activeSkin.color}
              glowColor={activeSkin.glowColor}
              ringStyle={activeSkin.ringStyle}
              size={80}
              animate
            />
          </div>
          <p className="text-base font-bold" style={{ color: activeSkin.glowColor }}>{activeSkin.name}</p>
          <p className="text-[11px] font-mono text-muted-foreground mt-0.5 text-center px-6">
            {activeSkin.description}
          </p>
        </motion.div>

        {/* Skins grid */}
        <div className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground mb-3">
          All Skins
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {skins.map((skin, i) => {
            const isEquipped = equippedSkin === skin.id

            return (
              <motion.button
                key={skin.id}
                onClick={() => skin.unlocked && onEquip(skin.id)}
                className="rounded-xl p-3 text-left transition-all active:scale-[0.97]"
                style={{
                  background: isEquipped
                    ? `${skin.glowColor}12`
                    : skin.unlocked
                    ? 'rgba(255,255,255,0.025)'
                    : 'rgba(255,255,255,0.015)',
                  border: `1px solid ${isEquipped ? `${skin.glowColor}45` : skin.unlocked ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)'}`,
                  opacity: skin.unlocked ? 1 : 0.5,
                  cursor: skin.unlocked ? 'pointer' : 'default',
                }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: skin.unlocked ? 1 : 0.5, y: 0 }}
                transition={{ delay: 0.12 + i * 0.04 }}
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  {/* Mini orb with ring */}
                  <div className="shrink-0 w-9 h-9 flex items-center justify-center">
                    {skin.unlocked ? (
                      <OrbCanvas
                        color={skin.color}
                        glowColor={skin.glowColor}
                        ringStyle={skin.ringStyle}
                        size={36}
                        animate={isEquipped}
                      />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                      >
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <rect x="2" y="5" width="8" height="6" rx="1" stroke="white" strokeOpacity="0.3" strokeWidth="1.2"/>
                          <path d="M4 5V3.5a2 2 0 014 0V5" stroke="white" strokeOpacity="0.3" strokeWidth="1.2"/>
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-bold leading-tight truncate"
                      style={{ color: isEquipped ? skin.glowColor : 'rgba(255,255,255,0.8)' }}
                    >
                      {skin.name}
                    </div>
                    <div className="text-[10px] font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {!skin.unlocked && skin.cost
                        ? `${skin.cost.toLocaleString()} pts`
                        : isEquipped
                        ? 'equipped'
                        : skin.cost
                        ? 'unlocked'
                        : 'default'}
                    </div>
                  </div>
                </div>

                {isEquipped && (
                  <div
                    className="text-[9px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded-full text-center w-full"
                    style={{ background: `${skin.glowColor}18`, color: skin.glowColor }}
                  >
                    EQUIPPED
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>

        <p className="text-[11px] font-mono text-muted-foreground/40 text-center mt-6">
          Reach score milestones to unlock skins
        </p>
      </div>
    </div>
  )
}
