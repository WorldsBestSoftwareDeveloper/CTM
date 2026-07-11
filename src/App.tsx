import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { audioManager } from './game/AudioManager'
import { loadGameSettings } from './settings'
import { assetManager, type AssetLoadProgress } from './game/AssetManager'
import { useWalletFoundation } from './wallet/WalletContext'
import { transactionStageLabel, useRanked } from './blockchain/RankedContext'

const GameScreen = lazy(() => import('./game/GameScreen'))

type Screen = 'splash' | 'loading' | 'home' | 'profile' | 'run'
type RunMode = 'demo' | 'ranked'
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

function HomeScreen({ onPlayDemo, onRanked, onProfile, onInstall, canInstall }: { onPlayDemo: () => void; onRanked: () => void; onProfile: () => void; onInstall: () => void; canInstall: boolean }) {
  const wallet = useWalletFoundation()
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
          {!wallet.connected ? (
            <button className="secondary-button" type="button" onClick={wallet.openWalletSelector} disabled={wallet.connecting}>
              {wallet.connecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          ) : (
            <>
              <button className="secondary-button" type="button" onClick={onRanked} aria-disabled="true">Play Ranked</button>
              <button className="secondary-button" type="button" onClick={onProfile}>Profile</button>
              <button className="text-button" type="button" onClick={() => void wallet.disconnect()} disabled={wallet.disconnecting}>
                {wallet.disconnecting ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </>
          )}
        </div>
        <p className="mode-note"><span className="pulse-dot" /> {wallet.connected ? `${shortAddress(wallet.address)} • Devnet wallet connected` : 'Demo runs work offline and never submit a score.'}</p>
      </section>
      <footer>Portrait-first • Offline demo available</footer>
    </main>
  )
}

function ProfileScreen({ onHome }: { onHome: () => void }) {
  const wallet = useWalletFoundation()
  const ranked = useRanked()
  return (
    <main className="home-screen profile-screen screen-fade">
      <BrandAtmosphere />
      <section className="profile-card" aria-labelledby="profile-title">
        <LogoImage src={logoIcon} className="brand-icon" alt="" />
        <p className="eyebrow">Player profile</p>
        <h1 id="profile-title">Ranked identity</h1>
        <dl className="profile-details">
          <div><dt>Wallet</dt><dd>{shortAddress(wallet.address)}</dd></div>
          <div><dt>Status</dt><dd>{wallet.connected ? `Connected${wallet.walletName ? ` • ${wallet.walletName}` : ''}` : 'Disconnected'}</dd></div>
          <div><dt>Network</dt><dd>{networkLabel(wallet.networkStatus)}</dd></div>
          <div><dt>Ranked</dt><dd>{wallet.connected && wallet.networkStatus === 'devnet' ? 'Available on Devnet' : 'Unavailable'}</dd></div>
          <div><dt>Demo</dt><dd>Available offline</dd></div>
          {ranked.profile && <><div><dt>Runs</dt><dd>{ranked.profile.runsPlayed}</dd></div><div><dt>Best score</dt><dd>{ranked.profile.bestScore}</dd></div><div><dt>Best distance</dt><dd>{ranked.profile.bestDistance}m</dd></div></>}
        </dl>
        {wallet.networkStatus === 'wrong-network' && <button className="secondary-button" type="button" onClick={wallet.switchToDevnet}>Switch to Devnet</button>}
        {wallet.networkStatus === 'offline' && <p className="wallet-warning">Devnet could not be reached. Demo Mode remains available.</p>}
        <button className="primary-button" type="button" onClick={onHome}>Back Home</button>
      </section>
    </main>
  )
}

function shortAddress(address: string | null): string {
  return address ? `${address.slice(0, 4)}…${address.slice(-4)}` : 'Not connected'
}

function networkLabel(status: ReturnType<typeof useWalletFoundation>['networkStatus']): string {
  if (status === 'devnet') return 'Devnet'
  if (status === 'wrong-network') return 'Wrong network'
  if (status === 'offline') return 'Devnet unavailable'
  return 'Checking Devnet…'
}

export default function App() {
  const wallet = useWalletFoundation()
  const ranked = useRanked()
  const [screen, setScreen] = useState<Screen>('splash')
  const [progress, setProgress] = useState(0)
  const [loadingStatus, setLoadingStatus] = useState<string | undefined>()
  const [assetLoading, setAssetLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches)
  const [settings] = useState(() => loadGameSettings())
  const [runMode, setRunMode] = useState<RunMode>('demo')

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

  const loadRun = async (mode: RunMode) => {
    setMessage(null)
    setRunMode(mode)
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

  const startDemo = () => { void loadRun('demo') }

  const startRanked = async () => {
    if (!wallet.connected) {
      setMessage('Connect a wallet before entering Ranked Mode.')
      return
    }
    if (wallet.networkStatus !== 'devnet') {
      setMessage(wallet.networkStatus === 'wrong-network' ? 'Ranked Mode requires Devnet. Confirm the switch from your Profile.' : 'Devnet is unavailable. Check your connection and try again.')
      return
    }
    try {
      await ranked.beginRun()
      await loadRun('ranked')
    } catch {
      setScreen('home')
    }
  }

  const installApp = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') setInstallPrompt(null)
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
          <HomeScreen onPlayDemo={startDemo} onRanked={() => void startRanked()} onProfile={() => setScreen('profile')} onInstall={installApp} canInstall={Boolean(installPrompt && !isInstalled)} />
          {(message || wallet.error) && <div role="status" className="toast" onClick={wallet.clearError}>{message ?? wallet.error}</div>}
        </>
      )}
      {screen === 'profile' && <ProfileScreen onHome={() => setScreen('home')} />}
      {screen === 'run' && <Suspense fallback={<LoadingScreen progress={100} status="Preparing Magic..." />}><GameScreen mode={runMode} onHome={() => setScreen('home')} onRankedEnd={ranked.finishRun} onRankedRestart={ranked.beginRun} /></Suspense>}
      <TransactionProgress />
    </div>
  )
}

function TransactionProgress() {
  const ranked = useRanked()
  const stage = transactionStageLabel(ranked.transactionStage)
  if (!stage && ranked.transactionStage !== 'error') return null
  return (
    <aside className={`transaction-progress ${ranked.transactionStage}`} role="status" aria-live="polite">
      <span className="loading-mini-rune" aria-hidden="true" />
      <div><small>{ranked.transactionLabel ?? 'Ranked transaction'}</small><strong>{ranked.error ?? stage}</strong></div>
      {(ranked.transactionStage === 'complete' || ranked.transactionStage === 'error') && <button type="button" onClick={ranked.clearTransaction}>Close</button>}
    </aside>
  )
}
