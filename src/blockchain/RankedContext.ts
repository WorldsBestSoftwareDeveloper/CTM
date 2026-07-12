import { createContext, useContext } from 'react'

export type TransactionStage = 'idle' | 'preparing' | 'connecting-session' | 'creating-session' | 'delegating' | 'ready' | 'awaiting-approval' | 'sending' | 'confirming' | 'settling' | 'complete' | 'error'

export interface OnChainProfile {
  address: string
  runsPlayed: number
  bestScore: number
  bestDistance: number
}

export interface RankedState {
  profile: OnChainProfile | null
  activeRunId: bigint | null
  transactionStage: TransactionStage
  transactionLabel: string | null
  transactionSignature: string | null
  error: string | null
  busy: boolean
  beginRun: () => Promise<void>
  finishRun: (score: number, distance: number) => Promise<void>
  refreshProfile: () => Promise<void>
  clearTransaction: () => void
}

export const RankedContext = createContext<RankedState | null>(null)

export function useRanked(): RankedState {
  const context = useContext(RankedContext)
  if (!context) throw new Error('useRanked must be used inside RankedProvider')
  return context
}

export function transactionStageLabel(stage: TransactionStage): string | null {
  if (stage === 'preparing') return 'Preparing...'
  if (stage === 'connecting-session') return 'Preparing Ranked Session...'
  if (stage === 'creating-session') return 'Creating Session...'
  if (stage === 'delegating') return 'Delegating Session...'
  if (stage === 'ready') return 'Ready'
  if (stage === 'awaiting-approval') return 'Awaiting wallet approval...'
  if (stage === 'sending') return 'Sending...'
  if (stage === 'confirming') return 'Confirming...'
  if (stage === 'settling') return 'Settling Result...'
  if (stage === 'complete') return 'Complete'
  return null
}
