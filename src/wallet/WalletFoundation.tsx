import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { WalletAdapterNetwork, type WalletError } from '@solana/wallet-adapter-base'
import { ConnectionProvider, WalletProvider, useConnection, useWallet } from '@solana/wallet-adapter-react'
import { WalletModalProvider, useWalletModal } from '@solana/wallet-adapter-react-ui'
import { clusterApiUrl } from '@solana/web3.js'
import '@solana/wallet-adapter-react-ui/styles.css'
import { WalletFoundationContext, type WalletFoundationState, type WalletNetworkStatus } from './WalletContext'

const devnetGenesisHash = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1'
const defaultDevnetEndpoint = clusterApiUrl(WalletAdapterNetwork.Devnet)
const walletStorageKey = 'ctm:wallet-adapter'

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
      <WalletProvider key={endpoint} wallets={[]} autoConnect localStorageKey={walletStorageKey} onError={handleError}>
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
  const { publicKey, connected, connecting, disconnecting, wallet, connect, disconnect } = useWallet()
  const { setVisible } = useWalletModal()
  const [networkStatus, setNetworkStatus] = useState<WalletNetworkStatus>('checking')
  const connectRequestRef = useRef<Promise<void> | null>(null)
  const lastStatusRef = useRef<string>('')
  const walletAddress = publicKey?.toBase58() ?? null
  const walletName = wallet?.adapter.name ?? null

  const checkNetwork = useCallback(async () => {
    debugWallet('network-check:start', { endpoint })
    setNetworkStatus('checking')
    try {
      const genesisHash = await Promise.race([
        connection.getGenesisHash(),
        new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('RPC timeout')), 8000)),
      ])
      const nextStatus = genesisHash === devnetGenesisHash ? 'devnet' : 'wrong-network'
      debugWallet('network-check:complete', { endpoint, status: nextStatus, genesisHash })
      setNetworkStatus(nextStatus)
    } catch (error) {
      console.warn(`[WalletFoundation] Unable to validate RPC network: ${endpoint}`, error)
      setNetworkStatus('offline')
    }
  }, [connection, endpoint])

  useEffect(() => { void checkNetwork() }, [checkNetwork])
  useEffect(() => {
    if (!connecting) return
    debugWallet('connect:pending', { wallet: walletName })
    const timeout = window.setTimeout(() => setAdapterError('The wallet is taking too long to respond. Check that it is unlocked, then try again.'), 15000)
    return () => window.clearTimeout(timeout)
  }, [connecting, setAdapterError, walletName])
  useEffect(() => {
    const status = JSON.stringify({ walletName, walletAddress, connected, connecting, disconnecting, readyState: wallet?.readyState })
    if (lastStatusRef.current === status) return
    lastStatusRef.current = status
    debugWallet('state', { wallet: walletName, address: walletAddress, connected, connecting, disconnecting, readyState: wallet?.readyState })
    if (connected) setAdapterError(null)
  }, [connected, connecting, disconnecting, setAdapterError, wallet?.readyState, walletAddress, walletName])
  useEffect(() => {
    const adapter = wallet?.adapter
    if (!adapter) return
    const handleConnect = () => debugWallet('adapter:connect', { wallet: adapter.name, address: adapter.publicKey?.toBase58() ?? null })
    const handleDisconnect = () => debugWallet('adapter:disconnect', { wallet: adapter.name })
    const handleError = (error: WalletError) => debugWallet('adapter:error', { wallet: adapter.name, message: error.message })
    const handleReadyStateChange = () => debugWallet('adapter:ready-state-change', { wallet: adapter.name, readyState: adapter.readyState })
    adapter.on('connect', handleConnect)
    adapter.on('disconnect', handleDisconnect)
    adapter.on('error', handleError)
    adapter.on('readyStateChange', handleReadyStateChange)
    debugWallet('adapter:listeners-attached', { wallet: adapter.name, readyState: adapter.readyState })
    return () => {
      adapter.off('connect', handleConnect)
      adapter.off('disconnect', handleDisconnect)
      adapter.off('error', handleError)
      adapter.off('readyStateChange', handleReadyStateChange)
      debugWallet('adapter:listeners-detached', { wallet: adapter.name })
    }
  }, [wallet?.adapter])
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
    walletName,
    networkStatus,
    error: adapterError,
    mobileWalletSupported: /Android/i.test(navigator.userAgent) && /Chrome/i.test(navigator.userAgent),
    openWalletSelector: async () => {
      if (connectRequestRef.current) {
        debugWallet('connect:ignored-duplicate', { wallet: walletName })
        return connectRequestRef.current
      }
      setAdapterError(null)
      if (connected) {
        debugWallet('connect:already-connected', { wallet: walletName, address: walletAddress })
        return
      }
      if (wallet) {
        const request = connect().catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error)
          console.warn('[WalletFoundation] Explicit reconnect failed.', error)
          setAdapterError(friendlyWalletErrorMessage(message))
          setVisible(true)
        }).finally(() => { connectRequestRef.current = null })
        connectRequestRef.current = request
        debugWallet('connect:selected-wallet', { wallet: walletName, readyState: wallet.readyState })
        return request
      }
      debugWallet('connect:open-selector')
      setVisible(true)
    },
    disconnect: async () => {
      try {
        debugWallet('disconnect:start', { wallet: walletName, address: walletAddress })
        connectRequestRef.current = null
        setAdapterError(null)
        setVisible(false)
        await disconnect()
        debugWallet('disconnect:complete', { wallet: walletName })
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
  }), [adapterError, connect, connected, connecting, disconnect, disconnecting, networkStatus, publicKey, setAdapterError, setVisible, switchToDevnet, wallet, walletAddress, walletName])

  return <WalletFoundationContext.Provider value={value}>{children}</WalletFoundationContext.Provider>
}

function friendlyWalletError(error: WalletError): string {
  return friendlyWalletErrorMessage(error.message)
}

function friendlyWalletErrorMessage(rawMessage: string): string {
  const message = rawMessage.toLowerCase()
  if (message.includes('rejected') || message.includes('declined')) return 'Connection was cancelled in the wallet.'
  if (message.includes('not found') || message.includes('not installed')) return 'That wallet is unavailable. Install or unlock it, then try again.'
  if (message.includes('locked')) return 'Unlock your wallet, then try connecting again.'
  if (message.includes('timeout')) return 'The wallet took too long to respond. Please try again.'
  if (message.includes('already')) return 'A wallet connection is already in progress. Check the wallet popup, then try again.'
  return rawMessage || 'The wallet could not connect. Demo Mode is still available.'
}

function debugWallet(event: string, details: Record<string, unknown> = {}) {
  console.debug(`[WalletFoundation] ${event}`, details)
}
