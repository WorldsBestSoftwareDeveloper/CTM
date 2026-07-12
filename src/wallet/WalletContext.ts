import { createContext, useContext } from 'react'

export type WalletNetworkStatus = 'checking' | 'devnet' | 'wrong-network' | 'offline'

export interface WalletFoundationState {
  address: string | null
  connected: boolean
  connecting: boolean
  disconnecting: boolean
  walletName: string | null
  networkStatus: WalletNetworkStatus
  error: string | null
  mobileWalletSupported: boolean
  openWalletSelector: () => Promise<void>
  disconnect: () => Promise<void>
  switchToDevnet: () => void
  clearError: () => void
}

export const WalletFoundationContext = createContext<WalletFoundationState | null>(null)

export function useWalletFoundation(): WalletFoundationState {
  const context = useContext(WalletFoundationContext)
  if (!context) throw new Error('useWalletFoundation must be used inside WalletFoundationProvider')
  return context
}
