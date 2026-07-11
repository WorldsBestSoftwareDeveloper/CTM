import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import { WalletFoundationProvider } from './wallet/WalletFoundation'
import { RankedProvider } from './blockchain/RankedProvider'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js')
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WalletFoundationProvider>
      <RankedProvider>
        <App />
      </RankedProvider>
    </WalletFoundationProvider>
  </StrictMode>,
)
