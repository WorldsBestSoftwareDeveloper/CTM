export interface GameSettings {
  masterVolume: number
  musicVolume: number
  sfxVolume: number
  reducedScreenShake: boolean
  reducedBloom: boolean
  swipeSensitivity: number
}

const storageKey = 'catch-magician-settings-v1'

export const defaultGameSettings: GameSettings = {
  masterVolume: 0.85,
  musicVolume: 0.72,
  sfxVolume: 0.82,
  reducedScreenShake: false,
  reducedBloom: false,
  swipeSensitivity: 1,
}

export function loadGameSettings(): GameSettings {
  if (typeof window === 'undefined') return defaultGameSettings
  try {
    const stored = window.localStorage.getItem(storageKey)
    if (!stored) return defaultGameSettings
    return sanitizeSettings({ ...defaultGameSettings, ...JSON.parse(stored) })
  } catch {
    return defaultGameSettings
  }
}

export function saveGameSettings(settings: GameSettings): GameSettings {
  const sanitized = sanitizeSettings(settings)
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(sanitized))
  } catch {
    // Settings are quality-of-life only; gameplay remains usable if storage is unavailable.
  }
  return sanitized
}

function sanitizeSettings(settings: GameSettings): GameSettings {
  return {
    masterVolume: clamp01(settings.masterVolume),
    musicVolume: clamp01(settings.musicVolume),
    sfxVolume: clamp01(settings.sfxVolume),
    reducedScreenShake: Boolean(settings.reducedScreenShake),
    reducedBloom: Boolean(settings.reducedBloom),
    swipeSensitivity: Math.min(1.6, Math.max(0.65, Number(settings.swipeSensitivity) || defaultGameSettings.swipeSensitivity)),
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number(value) || 0))
}
