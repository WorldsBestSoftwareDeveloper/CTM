import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import { WalletFoundationProvider } from './wallet/WalletFoundation'
import { RankedProvider } from './blockchain/RankedProvider'
import { MagicBlockProvider } from './blockchain/MagicBlockProvider'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('[PWA] Service worker registration failed.', error)
    })
  })
}

class RootErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Startup] React render failed.', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main className="startup-error-screen" role="alert">
        <section>
          <img src="/assets/ui/logo-icon.png" alt="" />
          <p className="eyebrow">Startup recovery</p>
          <h1>Catch the Magician could not start.</h1>
          <p>Please refresh once. If this keeps happening, clear this site&apos;s cached data and reload.</p>
          <button type="button" onClick={() => window.location.reload()}>Reload</button>
        </section>
      </main>
    )
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <WalletFoundationProvider>
        <MagicBlockProvider>
          <RankedProvider>
            <App />
          </RankedProvider>
        </MagicBlockProvider>
      </WalletFoundationProvider>
    </RootErrorBoundary>
  </StrictMode>,
)
