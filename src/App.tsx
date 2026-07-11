import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { audioManager } from './game/AudioManager'
import { loadGameSettings } from './settings'
import { assetManager, type AssetLoadProgress } from './game/AssetManager'

const GameScreen = lazy(() => import('./game/GameScreen'))

type Screen = 'splash' | 'loading' | 'home' | 'run'
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const launchDurationMs = 950
const loadingDurationMs = 1250
const loadingTips = [
  "Dodge, don't panic.",
  'Collect Arcane Crystals.',
  'The demon becomes faster over time.',
  'Stay in the center lane when unsure.',
  'Rare Relics award massive bonus points.',
]
const loadingStatuses = [
  'Loading Arcane Energy...',
  'Preparing Ancient Ruins...',
  'Awakening Rune Wards...',
  'Charging Magic...',
]
const logoFull = '/assets/ui/logo-full.png'
const logoIcon = '/assets/ui/logo-icon.png'
let brandPreloadPromise: Promise<void> | null = null

function preloadBrandAssets(): Promise<void> {
  if (brandPreloadPromise) return brandPreloadPromise
  brandPreloadPromise = Promise.all([logoFull, logoIcon].map((src) => new Promise<void>((resolve) => {
    const image = new Image()
    image.onload = () => resolve()
    image.onerror = () => resolve()
    image.src = src
  }))).then(() => undefined)
  return brandPreloadPromise
}

function BrandAtmosphere() {
  return (
    <div className="brand-atmosphere" aria-hidden="true">
      <i /><i /><i /><i /><i /><i />
      <span className="distant-ruin ruin-left" />
      <span className="distant-ruin ruin-right" />
    </div>
  )
}

function LogoImage({ src, className, alt }: { src: string; className: string; alt: string }) {
  return <img src={src} className={className} alt={alt} draggable={false} decoding="async" />
}

function LoadingScreen({ progress, status }: { progress: number; status?: string }) {
  const firstTip = useMemo(() => Math.floor(Math.random() * loadingTips.length), [])
  const [tipIndex, setTipIndex] = useState(firstTip)
  useEffect(() => {
    const timer = window.setInterval(() => setTipIndex((current) => (current + 1 + Math.floor(Math.random() * (loadingTips.length - 1))) % loadingTips.length), 2300)
    return () => window.clearInterval(timer)
  }, [])
  const visibleStatus = status ?? loadingStatuses[Math.min(loadingStatuses.length - 1, Math.floor((progress / 101) * loadingStatuses.length))]
  return (
    <main className="launch-screen loading-screen screen-fade" aria-live="polite">
      <BrandAtmosphere />
      <section className="loading-card">
        <LogoImage src={logoIcon} className="loading-logo-icon" alt="" />
        <LogoImage src={logoFull} className="loading-logo-full" alt="Catch the Magician" />
        <p className="eyebrow">Ancient Arcane Ruins</p>
        <div className="loading-rune-stage" aria-hidden="true">
          <div className="rune-circle" />
          <span className="rune-core" />
        </div>
        <p className="loading-status">{visibleStatus}</p>
        <div className="loading-track premium-loading-track" aria-label={`Loading ${progress}%`}>
          <div className="loading-fill premium-loading-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="loading-number">{progress}%</p>
        <p className="loading-tip">{loadingTips[tipIndex]}</p>
      </section>
    </main>
  )
}

function HomeScreen({ onPlayDemo, onRanked, onInstall, canInstall }: { onPlayDemo: () => void; onRanked: () => void; onInstall: () => void; canInstall: boolean }) {
  return (
    <main className="home-screen screen-fade">
      <div className="home-ruins" aria-hidden="true">
        <i className="island island-one" />
        <i className="island island-two" />
        <i className="rune rune-one" />
        <i className="rune rune-two" />
        <i className="rune rune-three" />
        <span className="home-fog fog-one" />
        <span className="home-fog fog-two" />
        <span className="home-crystal crystal-one" />
        <span className="home-crystal crystal-two" />
        <span className="home-crystal crystal-three" />
        <span className="distant-ruin home-ruin-left" />
        <span className="distant-ruin home-ruin-right" />
      </div>
      <section className="home-content" aria-labelledby="game-title">
        <div className="brand-lockup"><LogoImage src={logoIcon} className="brand-icon" alt="" /><span>Arcane Runner</span></div>
        <p className="eyebrow">The ruins are waking</p>
        <h1 id="game-title" className="sr-only">Catch the Magician</h1>
        <div className="home-logo-stage">
          <LogoImage src={logoFull} className="home-logo-full" alt="" />
        </div>
        <p className="home-copy">Escape through floating ruins before the shadows close in.</p>
        <div className="home-actions">
          <button className="primary-button" type="button" onClick={onPlayDemo}>
            <span>Play Demo</span><b aria-hidden="true">→</b>
          </button>
          {canInstall && (
            <button className="secondary-button install-button" type="button" onClick={onInstall}>
              Install App
            </button>
          )}
          <button className="secondary-button" type="button" onClick={onRanked}>
            Connect Wallet
          </button>
        </div>
        <p className="mode-note"><span className="pulse-dot" /> Demo runs work offline and never submit a score.</p>
      </section>
      <footer>Portrait-first • Offline demo available</footer>
    </main>
  )
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash')
  const [progress, setProgress] = useState(0)
  const [loadingStatus, setLoadingStatus] = useState<string | undefined>()
  const [assetLoading, setAssetLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches)
  const [settings] = useState(() => loadGameSettings())

  useEffect(() => {
    audioManager.applySettings(settings)
    void audioManager.preload().catch((error) => console.warn('[AudioManager] Startup preload failed.', error))
    void preloadBrandAssets()
    const splashTimer = window.setTimeout(() => setScreen('loading'), launchDurationMs)
    return () => window.clearTimeout(splashTimer)
  }, [settings])

  useEffect(() => {
    if (screen === 'home') audioManager.playHomeAmbient()
  }, [screen])

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const handleInstalled = () => {
      setIsInstalled(true)
      setInstallPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  useEffect(() => {
    if (screen !== 'loading' || assetLoading) return
    const startedAt = Date.now()
    let brandReady = false
    void preloadBrandAssets().then(() => {
      brandReady = true
    })
    const tick = window.setInterval(() => {
      const elapsedProgress = Math.min(0.86, (Date.now() - startedAt) / loadingDurationMs)
      const assetProgress = brandReady ? 0.14 : 0
      const next = Math.min(100, Math.round((elapsedProgress + assetProgress) * 100))
      setProgress(next)
      if (next === 100) {
        window.clearInterval(tick)
        window.setTimeout(() => setScreen('home'), 130)
      }
    }, 40)
    return () => window.clearInterval(tick)
  }, [assetLoading, screen])

  const startDemo = async () => {
    setMessage(null)
    setAssetLoading(true)
    setProgress(0)
    setLoadingStatus('Loading Assets...')
    setScreen('loading')
    try {
      await assetManager.preload(({ progress: nextProgress, status }: AssetLoadProgress) => {
        setProgress(nextProgress)
        setLoadingStatus(status)
      })
      await audioManager.preload()
      setProgress(100)
      window.setTimeout(() => setScreen('run'), 180)
    } catch (error) {
      console.warn('[App] Required gameplay assets did not load.', error)
      setMessage('Assets could not be loaded. Check your connection and try again.')
      setAssetLoading(false)
      setScreen('home')
    }
  }

  const installApp = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') setInstallPrompt(null)
  }

  const explainRanked = () => {
    setMessage('Ranked Mode connects in a later milestone. Demo Mode is ready now, even offline.')
  }

  return (
    <div className={`antialiased startup-root${settings.reducedBloom ? ' reduced-bloom' : ''}${settings.reducedScreenShake ? ' reduced-motion-soft' : ''}`}>
      {screen === 'splash' && (
        <main className="launch-screen splash-screen screen-fade">
          <BrandAtmosphere />
          <div className="splash-logo-shell">
            <LogoImage src={logoFull} className="splash-logo-full" alt="Catch the Magician" />
          </div>
          <p className="eyebrow">Ancient Arcane Ruins</p>
        </main>
      )}
      {screen === 'loading' && <LoadingScreen progress={progress} status={loadingStatus} />}
      {screen === 'home' && (
        <>
          <HomeScreen onPlayDemo={startDemo} onRanked={explainRanked} onInstall={installApp} canInstall={Boolean(installPrompt && !isInstalled)} />
          {message && <div role="status" className="toast">{message}</div>}
        </>
      )}
      {screen === 'run' && <Suspense fallback={<LoadingScreen progress={100} status="Preparing Magic..." />}><GameScreen onHome={() => setScreen('home')} /></Suspense>}
    </div>
  )
}
