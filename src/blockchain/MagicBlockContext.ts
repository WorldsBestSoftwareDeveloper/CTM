import { createContext, useContext } from 'react'
import type { Connection, PublicKey, Transaction } from '@solana/web3.js'
import type { SendTransactionOptions } from '@solana/wallet-adapter-base'

export type MagicBlockStage = 'idle' | 'connecting' | 'creating-session' | 'ready' | 'settling' | 'error'

export interface MagicBlockSession {
  publicKey: PublicKey
  token: string
}

export interface MagicBlockState {
  stage: MagicBlockStage
  statusText: string | null
  error: string | null
  routerConnection: Connection
  ephemeralConnection: Connection
  validator: PublicKey
  session: MagicBlockSession | null
  prepareSession: () => Promise<MagicBlockSession>
  sendSessionTransaction: (transaction: Transaction, options?: SendTransactionOptions) => Promise<string>
  getDelegationStatus: (account: PublicKey) => Promise<boolean>
  markSettling: () => void
  clearCompletedSession: () => void
  clearError: () => void
}

export const MagicBlockContext = createContext<MagicBlockState | null>(null)

export function useMagicBlock(): MagicBlockState {
  const context = useContext(MagicBlockContext)
  if (!context) throw new Error('useMagicBlock must be used inside MagicBlockProvider')
  return context
}
