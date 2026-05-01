// Biome definitions for Gravity Thread
// Each biome changes: visual theme, obstacle families, thread/orb style, Phase Core style
// Core mechanic (one-tap flip, survival loop) never changes

export type BiomeId = 'cyber_rail' | 'crystal_rift' | 'magma_wire' | 'abyss_trench' | 'clockwork_spine'

export interface BiomeColors {
  bg: string[]            // background base per zone (4 zones)
  thread: string          // thread primary color
  threadGlow: string
  orb: string
  orbGlow: string
  orbTrail: string
  hazardPrimary: string
  hazardGlow: string
  hazardSecondary: string
  accent: string
  accentGlow: string
  phaseCoreColor: string
  phaseCoreGlow: string
  phaseShield: string
  nearMiss: string
  comboText: string
  gridLine: string
  bgStreak: string[]
  bgStreakAlt: string[]
}

export interface BiomeMeta {
  id: BiomeId
  name: string
  subtitle: string
  description: string
  locked: boolean
  unlockScore: number      // all-time best needed to unlock (0 = always unlocked)
  accentCSS: string        // Tailwind-compatible CSS color string for UI
  accentAlpha: string      // with alpha for backgrounds
  borderCSS: string
  icon: string             // SVG-style symbol string for card icon
  phaseCoreLabel: string   // e.g. "PHASE", "PRISM", "EMBER"
  signatureHazard: string  // human-readable signature obstacle name
}

export interface BiomeConfig {
  meta: BiomeMeta
  colors: BiomeColors
  // Zone bg color progressions
  zoneBg: string[]
  zoneAccent: string[]
}

// ============================================================
// BIOME 1: CYBER RAIL — starter biome, clean futuristic arcade
// ============================================================
export const CYBER_RAIL: BiomeConfig = {
  meta: {
    id: 'cyber_rail',
    name: 'Cyber Rail',
    subtitle: 'Digital Frontier',
    description: 'Hack the grid. Dodge firewalls and glitch walls on a neon data line.',
    locked: false,
    unlockScore: 0,
    accentCSS: '#22d3ee',
    accentAlpha: 'rgba(34,211,238,0.12)',
    borderCSS: 'rgba(34,211,238,0.3)',
    icon: '◈',
    phaseCoreLabel: 'PACKET',
    signatureHazard: 'Glitch Firewall',  // glitch_firewall
  },
  colors: {
    bg: ['#060a14', '#04090f', '#050c10', '#060210'],
    thread: '#22d3ee',
    threadGlow: 'rgba(34,211,238,0.5)',
    orb: '#e0f7ff',
    orbGlow: 'rgba(34,211,238,0.9)',
    orbTrail: 'rgba(34,211,238,0.35)',
    hazardPrimary: '#ff1a1a',
    hazardGlow: 'rgba(255,26,26,0.65)',
    hazardSecondary: '#ff6b00',
    accent: '#22d3ee',
    accentGlow: 'rgba(34,211,238,0.8)',
    phaseCoreColor: '#7dd3fc',
    phaseCoreGlow: 'rgba(125,211,252,0.9)',
    phaseShield: 'rgba(125,211,252,0.35)',
    nearMiss: '#4ade80',
    comboText: '#fbbf24',
    gridLine: 'rgba(34,211,238,0.05)',
    bgStreak: ['#22d3ee', '#7dd3fc'],
    bgStreakAlt: ['rgba(34,211,238,0.6)', 'rgba(125,211,252,0.5)'],
  },
  zoneBg: ['#060a14', '#04090f', '#060410', '#080214'],
  zoneAccent: [
    'rgba(34,211,238,0.04)',
    'rgba(34,211,238,0.09)',
    'rgba(167,139,250,0.08)',
    'rgba(249,115,22,0.07)',
  ],
}

// ============================================================
// BIOME 2: CRYSTAL RIFT — elegant precision, prism hazards
// ============================================================
export const CRYSTAL_RIFT: BiomeConfig = {
  meta: {
    id: 'crystal_rift',
    name: 'Crystal Rift',
    subtitle: 'Prismatic Precision',
    description: 'Navigate refracted light. Prism fans and crystal spikes demand perfect lines.',
    locked: false,
    unlockScore: 800,
    accentCSS: '#a5f3fc',
    accentAlpha: 'rgba(165,243,252,0.10)',
    borderCSS: 'rgba(165,243,252,0.28)',
    icon: '◇',
    phaseCoreLabel: 'PRISM',
    signatureHazard: 'Prism Fan',
  },
  colors: {
    bg: ['#060b10', '#050a12', '#060818', '#050614'],
    thread: '#a5f3fc',
    threadGlow: 'rgba(165,243,252,0.5)',
    orb: '#f0fcff',
    orbGlow: 'rgba(165,243,252,0.9)',
    orbTrail: 'rgba(165,243,252,0.3)',
    hazardPrimary: '#ff1a1a',
    hazardGlow: 'rgba(255,26,26,0.65)',
    hazardSecondary: '#ff6b00',
    accent: '#a5f3fc',
    accentGlow: 'rgba(165,243,252,0.8)',
    phaseCoreColor: '#e0f2fe',
    phaseCoreGlow: 'rgba(224,242,254,0.9)',
    phaseShield: 'rgba(165,243,252,0.3)',
    nearMiss: '#86efac',
    comboText: '#e879f9',
    gridLine: 'rgba(165,243,252,0.04)',
    bgStreak: ['#a5f3fc', '#e879f9'],
    bgStreakAlt: ['rgba(165,243,252,0.5)', 'rgba(232,121,249,0.4)'],
  },
  zoneBg: ['#060b10', '#050a12', '#060818', '#080018'],
  zoneAccent: [
    'rgba(165,243,252,0.04)',
    'rgba(165,243,252,0.08)',
    'rgba(232,121,249,0.06)',
    'rgba(165,243,252,0.10)',
  ],
}

// ============================================================
// BIOME 3: MAGMA WIRE — intense, explosive, dangerous
// ============================================================
export const MAGMA_WIRE: BiomeConfig = {
  meta: {
    id: 'magma_wire',
    name: 'Magma Wire',
    subtitle: 'Scorched Path',
    description: 'Survive the eruptions. Flame vents and heat bursts on a lava energy cable.',
    locked: false,
    unlockScore: 2000,
    accentCSS: '#f97316',
    accentAlpha: 'rgba(249,115,22,0.12)',
    borderCSS: 'rgba(249,115,22,0.3)',
    icon: '◉',
    phaseCoreLabel: 'EMBER',
    signatureHazard: 'Eruption Vent',
  },
  colors: {
    bg: ['#0f0600', '#120500', '#160400', '#180300'],
    thread: '#f97316',
    threadGlow: 'rgba(249,115,22,0.6)',
    orb: '#fff0e0',
    orbGlow: 'rgba(249,115,22,0.9)',
    orbTrail: 'rgba(249,115,22,0.35)',
    hazardPrimary: '#ff1a1a',
    hazardGlow: 'rgba(255,26,26,0.65)',
    hazardSecondary: '#ff6b00',
    accent: '#f97316',
    accentGlow: 'rgba(249,115,22,0.9)',
    phaseCoreColor: '#fed7aa',
    phaseCoreGlow: 'rgba(254,215,170,0.9)',
    phaseShield: 'rgba(249,115,22,0.25)',
    nearMiss: '#fbbf24',
    comboText: '#fde68a',
    gridLine: 'rgba(249,115,22,0.04)',
    bgStreak: ['#f97316', '#fbbf24'],
    bgStreakAlt: ['rgba(249,115,22,0.6)', 'rgba(251,191,36,0.5)'],
  },
  zoneBg: ['#0f0600', '#120500', '#160400', '#1a0200'],
  zoneAccent: [
    'rgba(249,115,22,0.05)',
    'rgba(249,115,22,0.10)',
    'rgba(239,68,68,0.08)',
    'rgba(220,38,38,0.12)',
  ],
}

// ============================================================
// BIOME 4: ABYSS TRENCH — mysterious, dark, atmospheric
// ============================================================
export const ABYSS_TRENCH: BiomeConfig = {
  meta: {
    id: 'abyss_trench',
    name: 'Abyss Trench',
    subtitle: 'Deep Unknown',
    description: 'Plunge into darkness. Pressure rings and eel arcs guard the ocean trench path.',
    locked: false,
    unlockScore: 4000,
    accentCSS: '#38bdf8',
    accentAlpha: 'rgba(56,189,248,0.09)',
    borderCSS: 'rgba(56,189,248,0.22)',
    icon: '⬡',
    phaseCoreLabel: 'BUBBLE',
    signatureHazard: 'Pressure Ring',
  },
  colors: {
    bg: ['#020810', '#030a12', '#020c18', '#010e1e'],
    thread: '#0ea5e9',
    threadGlow: 'rgba(14,165,233,0.5)',
    orb: '#e0f8ff',
    orbGlow: 'rgba(56,189,248,0.8)',
    orbTrail: 'rgba(56,189,248,0.3)',
    hazardPrimary: '#ff1a1a',
    hazardGlow: 'rgba(255,26,26,0.65)',
    hazardSecondary: '#ff6b00',
    accent: '#38bdf8',
    accentGlow: 'rgba(56,189,248,0.8)',
    phaseCoreColor: '#bae6fd',
    phaseCoreGlow: 'rgba(186,230,253,0.9)',
    phaseShield: 'rgba(56,189,248,0.25)',
    nearMiss: '#34d399',
    comboText: '#67e8f9',
    gridLine: 'rgba(56,189,248,0.03)',
    bgStreak: ['#0ea5e9', '#06b6d4'],
    bgStreakAlt: ['rgba(14,165,233,0.4)', 'rgba(6,182,212,0.35)'],
  },
  zoneBg: ['#020810', '#030a12', '#020c18', '#010e22'],
  zoneAccent: [
    'rgba(14,165,233,0.03)',
    'rgba(14,165,233,0.06)',
    'rgba(6,182,212,0.05)',
    'rgba(56,189,248,0.08)',
  ],
}

// ============================================================
// BIOME 5: CLOCKWORK SPINE — mastery biome, rhythmic precision
// ============================================================
export const CLOCKWORK_SPINE: BiomeConfig = {
  meta: {
    id: 'clockwork_spine',
    name: 'Clockwork Spine',
    subtitle: 'Precision Engine',
    description: 'Master the machine. Piston crushers and rotating cogs demand perfect timing.',
    locked: false,
    unlockScore: 8000,
    accentCSS: '#d4a84b',
    accentAlpha: 'rgba(212,168,75,0.10)',
    borderCSS: 'rgba(212,168,75,0.28)',
    icon: '⚙',
    phaseCoreLabel: 'BRASS',
    signatureHazard: 'Piston Crusher',
  },
  colors: {
    bg: ['#0a0700', '#0d0900', '#100a00', '#120c00'],
    thread: '#d4a84b',
    threadGlow: 'rgba(212,168,75,0.55)',
    orb: '#fef9e6',
    orbGlow: 'rgba(212,168,75,0.9)',
    orbTrail: 'rgba(212,168,75,0.3)',
    hazardPrimary: '#ff1a1a',
    hazardGlow: 'rgba(255,26,26,0.65)',
    hazardSecondary: '#ff6b00',
    accent: '#d4a84b',
    accentGlow: 'rgba(212,168,75,0.9)',
    phaseCoreColor: '#fde68a',
    phaseCoreGlow: 'rgba(253,230,138,0.9)',
    phaseShield: 'rgba(212,168,75,0.25)',
    nearMiss: '#fbbf24',
    comboText: '#fde68a',
    gridLine: 'rgba(212,168,75,0.04)',
    bgStreak: ['#d4a84b', '#d97706'],
    bgStreakAlt: ['rgba(212,168,75,0.5)', 'rgba(217,119,6,0.4)'],
  },
  zoneBg: ['#0a0700', '#0d0900', '#100a00', '#140c00'],
  zoneAccent: [
    'rgba(212,168,75,0.04)',
    'rgba(212,168,75,0.08)',
    'rgba(180,83,9,0.07)',
    'rgba(180,83,9,0.12)',
  ],
}

// ============================================================
// All biomes registry
// ============================================================
export const ALL_BIOMES: BiomeConfig[] = [
  CYBER_RAIL,
  CRYSTAL_RIFT,
  MAGMA_WIRE,
  ABYSS_TRENCH,
  CLOCKWORK_SPINE,
]

export const BIOME_MAP: Record<BiomeId, BiomeConfig> = {
  cyber_rail: CYBER_RAIL,
  crystal_rift: CRYSTAL_RIFT,
  magma_wire: MAGMA_WIRE,
  abyss_trench: ABYSS_TRENCH,
  clockwork_spine: CLOCKWORK_SPINE,
}

export function getBiome(id: BiomeId): BiomeConfig {
  return BIOME_MAP[id]
}

export function isBiomeLocked(id: BiomeId, allTimeHigh: number): boolean {
  return getBiome(id).meta.unlockScore > allTimeHigh
}
