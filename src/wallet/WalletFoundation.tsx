import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { WalletAdapterNetwork, type WalletError } from '@solana/wallet-adapter-base'
import { ConnectionProvider, WalletProvider, useConnection, useWallet } from '@solana/wallet-adapter-react'
import { WalletModalProvider, useWalletModal } from '@solana/wallet-adapter-react-ui'
import { clusterApiUrl } from '@solana/web3.js'
import '@solana/wallet-adapter-react-ui/styles.css'
import { WalletFoundationContext, type WalletFoundationState, type WalletNetworkStatus } from './WalletContext'

const devnetGenesisHash = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1'
const defaultDevnetEndpoint = clusterApiUrl(WalletAdapterNetwork.Devnet)

export function WalletFoundationProvider({ children }: { children: ReactNode }) {
  const configuredEndpoint = import.meta.env.VITE_SOLANA_RPC_URL?.trim() || defaultDevnetEndpoint
  const [endpoint, setEndpoint] = useState(configuredEndpoint)
  const [adapterError, setAdapterError] = useState<string | null>(null)

  const handleError = useCallback((error: WalletError) => {
    const message = friendlyWalletError(error)
    console.warn('[WalletFoundation] Wallet connection error.', error)
    setAdapterError(message)
  }, [])

  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: 'confirmed' }}>
      <WalletProvider wallets={[]} autoConnect onError={handleError}>
        <WalletModalProvider>
          <WalletStateBridge
            endpoint={endpoint}
            adapterError={adapterError}
            setAdapterError={setAdapterError}
            switchToDevnet={() => setEndpoint(defaultDevnetEndpoint)}
          >
            {children}
          </WalletStateBridge>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

function WalletStateBridge({ children, endpoint, adapterError, setAdapterError, switchToDevnet }: {
  children: ReactNode
  endpoint: string
  adapterError: string | null
  setAdapterError: (error: string | null) => void
  switchToDevnet: () => void
}) {
  const { connection } = useConnection()
  const { publicKey, connected, connecting, disconnecting, wallet, disconnect } = useWallet()
  const { setVisible } = useWalletModal()
  const [networkStatus, setNetworkStatus] = useState<WalletNetworkStatus>('checking')

  const checkNetwork = useCallback(async () => {
    setNetworkStatus('checking')
    try {
      const genesisHash = await Promise.race([
        connection.getGenesisHash(),
        new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('RPC timeout')), 8000)),
      ])
      setNetworkStatus(genesisHash === devnetGenesisHash ? 'devnet' : 'wrong-network')
    } catch (error) {
      console.warn(`[WalletFoundation] Unable to validate RPC network: ${endpoint}`, error)
      setNetworkStatus('offline')
    }
  }, [connection, endpoint])

  useEffect(() => { void checkNetwork() }, [checkNetwork])
  useEffect(() => {
    if (!connecting) return
    const timeout = window.setTimeout(() => setAdapterError('The wallet is taking too long to respond. Check that it is unlocked, then try again.'), 15000)
    return () => window.clearTimeout(timeout)
  }, [connecting, setAdapterError])
  useEffect(() => {
    const online = () => void checkNetwork()
    const offline = () => setNetworkStatus('offline')
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
    }
  }, [checkNetwork])

  const value = useMemo<WalletFoundationState>(() => ({
    address: publicKey?.toBase58() ?? null,
    connected,
    connecting,
    disconnecting,
    walletName: wallet?.adapter.name ?? null,
    networkStatus,
    error: adapterError,
    mobileWalletSupported: /Android/i.test(navigator.userAgent) && /Chrome/i.test(navigator.userAgent),
    openWalletSelector: () => {
      setAdapterError(null)
      setVisible(true)
    },
    disconnect: async () => {
      try {
        await disconnect()
      } catch (error) {
        console.warn('[WalletFoundation] Disconnect failed.', error)
        setAdapterError('The wallet did not disconnect cleanly. Please try again.')
      }
    },
    switchToDevnet: () => {
      setAdapterError(null)
      switchToDevnet()
    },
    clearError: () => setAdapterError(null),
  }), [adapterError, connected, connecting, disconnect, disconnecting, networkStatus, publicKey, setAdapterError, setVisible, switchToDevnet, wallet])

  return <WalletFoundationContext.Provider value={value}>{children}</WalletFoundationContext.Provider>
}

function friendlyWalletError(error: WalletError): string {
  const message = error.message.toLowerCase()
  if (message.includes('rejected') || message.includes('declined')) return 'Connection was cancelled in the wallet.'
  if (message.includes('not found') || message.includes('not installed')) return 'That wallet is unavailable. Install or unlock it, then try again.'
  if (message.includes('locked')) return 'Unlock your wallet, then try connecting again.'
  if (message.includes('timeout')) return 'The wallet took too long to respond. Please try again.'
  return error.message || 'The wallet could not connect. Demo Mode is still available.'
}
