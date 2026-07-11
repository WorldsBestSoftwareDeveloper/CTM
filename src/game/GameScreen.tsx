import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { audioManager, type RunnerAudioSnapshot } from './AudioManager'
import { GameScene, type DebugSnapshot, type HudSnapshot } from './GameScene'
import { loadGameSettings, saveGameSettings, type GameSettings } from '../settings'

interface GameScreenProps {
  onHome: () => void
}

export default function GameScreen({ onHome }: GameScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const gameRef = useRef<GameScene | null>(null)
  const hudRef = useRef<HudSnapshot | null>(null)
  const pulseTimers = useRef<number[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [isDead, setIsDead] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<GameSettings>(() => loadGameSettings())
  const settingsRef = useRef(settings)
  const emptyHud: HudSnapshot = { distance: 0, score: 0, essence: 0, crystals: 0, relics: 0, demonProximity: 0, level: 1 }
  const [hud, setHud] = useState<HudSnapshot>(emptyHud)
  const [hudPulse, setHudPulse] = useState({ score: false, magic: false, level: false })
  const [debug, setDebug] = useState<DebugSnapshot | null>(null)

  const handleDeath = useCallback(() => {
    audioManager.endGameplay()
    setIsPaused(false)
    setIsDead(true)
  }, [])

  const handleDebug = useCallback((snapshot: DebugSnapshot) => setDebug(snapshot), [])
  const handleAudio = useCallback((snapshot: RunnerAudioSnapshot) => audioManager.updateGameplay(snapshot), [])
  const triggerHudPulse = useCallback((key: keyof typeof hudPulse) => {
    setHudPulse((current) => ({ ...current, [key]: true }))
    const timer = window.setTimeout(() => {
      setHudPulse((current) => ({ ...current, [key]: false }))
    }, 420)
    pulseTimers.current.push(timer)
  }, [])

  const handleHud = useCallback((snapshot: HudSnapshot) => {
    const previous = hudRef.current
    if (previous) {
      if (snapshot.score > previous.score) triggerHudPulse('score')
      if (snapshot.essence > previous.essence || snapshot.crystals > previous.crystals || snapshot.relics > previous.relics) triggerHudPulse('magic')
      if (snapshot.level > previous.level) triggerHudPulse('level')
    }
    hudRef.current = snapshot
    setHud(snapshot)
  }, [triggerHudPulse])

  useEffect(() => {
    settingsRef.current = settings
    audioManager.applySettings(settings)
    gameRef.current?.updateSettings(settings)
  }, [settings])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    audioManager.applySettings(settingsRef.current)
    audioManager.startGameplay()
    const game = new GameScene(canvas, {
      debug: import.meta.env.DEV,
      onDeath: handleDeath,
      onHud: handleHud,
      onDebug: import.meta.env.DEV ? handleDebug : undefined,
      onAudio: handleAudio,
      settings: settingsRef.current,
    })
    gameRef.current = game
    game.start()
    return () => {
      audioManager.endGameplay()
      game.dispose()
      gameRef.current = null
      pulseTimers.current.forEach((timer) => window.clearTimeout(timer))
      pulseTimers.current = []
    }
  }, [handleAudio, handleDeath, handleDebug, handleHud])

  const pause = () => {
    gameRef.current?.pause()
    audioManager.endGameplay()
    setIsPaused(true)
  }

  const openSettings = () => {
    pause()
    setIsSettingsOpen(true)
  }

  const resume = () => {
    gameRef.current?.resume()
    setIsSettingsOpen(false)
    setIsPaused(false)
  }

  const restart = () => {
    audioManager.startGameplay()
    gameRef.current?.restart()
    setHud(emptyHud)
    hudRef.current = emptyHud
    setIsDead(false)
    setIsPaused(false)
    setIsSettingsOpen(false)
  }

  const updateSettings = (patch: Partial<GameSettings>) => {
    setSettings((current) => saveGameSettings({ ...current, ...patch }))
  }

  return (
    <main className="game-screen" aria-label="Core runner demo" style={{ '--demon-proximity': hud.demonProximity } as CSSProperties}>
      <canvas ref={canvasRef} className="game-canvas" aria-label="Arcane runner game scene" />
      <div className="tension-vignette" aria-hidden="true" />
      <header className="runner-hud">
        <div><span className="hud-label">DEMO RUN</span><strong>{hud.distance}m</strong></div>
        <div className={hudPulse.score ? 'hud-pop' : undefined}><span className="hud-label">SCORE</span><strong>{hud.score}</strong></div>
        <div className={hudPulse.magic ? 'hud-pop' : undefined}><span className="hud-label">MAGIC</span><strong>{hud.essence}/{hud.crystals}/{hud.relics}</strong></div>
        <div className={hudPulse.level ? 'hud-pop hud-level-up' : undefined}><span className="hud-label">LEVEL</span><strong>{hud.level}</strong></div>
        <div className="hud-controls">
          <button className="hud-pause" type="button" onClick={openSettings} disabled={isDead}>Settings</button>
          <button className="hud-pause" type="button" onClick={pause} disabled={isDead || isPaused}>Pause</button>
        </div>
      </header>
      <aside className="demon-meter" aria-label="Demon proximity">
        <span />
      </aside>
      <aside className="control-hint" aria-label="Controls">← → / A D <span>lane</span> · ↑ / W / Space <span>jump</span> · ↓ / S / Shift <span>slide</span></aside>
      {import.meta.env.DEV && debug && <DebugOverlay debug={debug} />}
      {isPaused && (
        <section className="runner-overlay" role="dialog" aria-modal="true" aria-label="Paused">
          <p className="eyebrow">Run paused</p><h1>Catch your breath</h1>
          <div className="demo-actions"><button className="primary-button" type="button" onClick={resume}>Resume</button><button className="secondary-button" type="button" onClick={restart}>Restart</button><button className="secondary-button" type="button" onClick={() => setIsSettingsOpen(true)}>Settings</button><button className="text-button" type="button" onClick={onHome}>Return Home</button></div>
        </section>
      )}
      {isSettingsOpen && (
        <SettingsPanel
          settings={settings}
          onChange={updateSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
      {isDead && (
        <section className="runner-overlay" role="dialog" aria-modal="true" aria-label="Game over">
          <p className="eyebrow">Run ended</p><h1>Game Over</h1><p>You reached {hud.distance} metres and scored {hud.score} through the arcane ruins.</p>
          <div className="demo-actions"><button className="primary-button" type="button" onClick={restart}>Play Again</button><button className="text-button" type="button" onClick={onHome}>Return Home</button></div>
        </section>
      )}
    </main>
  )
}

function SettingsPanel({ settings, onChange, onClose }: { settings: GameSettings; onChange: (patch: Partial<GameSettings>) => void; onClose: () => void }) {
  return (
    <section className="settings-panel" role="dialog" aria-modal="true" aria-label="Settings">
      <div className="settings-card">
        <p className="eyebrow">Runner settings</p>
        <h2>Fine tune the feel</h2>
        <SettingRange label="Master Volume" value={settings.masterVolume} min={0} max={1} step={0.01} onChange={(value) => onChange({ masterVolume: value })} />
        <SettingRange label="Music Volume" value={settings.musicVolume} min={0} max={1} step={0.01} onChange={(value) => onChange({ musicVolume: value })} />
        <SettingRange label="SFX Volume" value={settings.sfxVolume} min={0} max={1} step={0.01} onChange={(value) => onChange({ sfxVolume: value })} />
        <SettingToggle label="Reduced Screen Shake" checked={settings.reducedScreenShake} onChange={(checked) => onChange({ reducedScreenShake: checked })} />
        <SettingToggle label="Reduced Bloom" checked={settings.reducedBloom} onChange={(checked) => onChange({ reducedBloom: checked })} />
        <SettingRange label="Touch Sensitivity" value={settings.swipeSensitivity} min={0.65} max={1.6} step={0.05} onChange={(value) => onChange({ swipeSensitivity: value })} />
        <button className="primary-button" type="button" onClick={onClose}>Done</button>
      </div>
    </section>
  )
}

function SettingRange({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return (
    <label className="settings-row">
      <span>{label}<b>{Math.round(value * 100)}%</b></span>
      <input type="range" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.currentTarget.value))} />
    </label>
  )
}

function SettingToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="settings-toggle">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.currentTarget.checked)} />
    </label>
  )
}

function DebugOverlay({ debug }: { debug: DebugSnapshot }) {
  return (
    <aside className="debug-overlay" aria-label="Development debug overlay">
      <b>CORE RUNNER DEBUG</b>
      <span>FPS {debug.fps}</span><span>Lane {debug.lane}</span><span>State {debug.playerState}</span><span>Distance {debug.distance}m</span>
      <span>Jump {String(debug.isJumping)}</span><span>Slide {String(debug.isSliding)}</span><span>Camera {debug.camera.x.toFixed(1)}, {debug.camera.y.toFixed(1)}, {debug.camera.z.toFixed(1)}</span><span>Active objects {debug.activeObjects}</span>
    </aside>
  )
}
