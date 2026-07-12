import { useSessionKeyManager } from '@magicblock-labs/gum-react-sdk'
import { ConnectionMagicRouter } from '@magicblock-labs/ephemeral-rollups-sdk'
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react'
import { Connection, PublicKey, type Transaction } from '@solana/web3.js'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CATCH_THE_MAGICIAN_PROGRAM_ID } from './program'
import { MagicBlockContext, type MagicBlockSession, type MagicBlockStage, type MagicBlockState } from './MagicBlockContext'

const defaultRouterEndpoint = 'https://devnet-router.magicblock.app'
const defaultEphemeralEndpoint = 'https://devnet.magicblock.app'
const defaultValidator = 'MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57'
const sessionDurationMinutes = 60
const sessionTopUpLamports = 2_000_000

export function MagicBlockProvider({ children }: { children: ReactNode }) {
  const anchorWallet = useAnchorWallet()
  if (!anchorWallet) return <DisconnectedMagicBlockProvider>{children}</DisconnectedMagicBlockProvider>
  return <ConnectedMagicBlockProvider>{children}</ConnectedMagicBlockProvider>
}

function ConnectedMagicBlockProvider({ children }: { children: ReactNode }) {
  const { connection } = useConnection()
  const anchorWallet = useAnchorWallet()
  if (!anchorWallet) throw new Error('ConnectedMagicBlockProvider requires an Anchor wallet.')
  const sessionWallet = useSessionKeyManager(anchorWallet, connection, 'devnet')
  const base = useBaseMagicBlockState()
  const [stage, setStage] = useState<MagicBlockStage>('idle')
  const [statusText, setStatusText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<MagicBlockSession | null>(null)
  const prepareSessionRef = useRef<Promise<MagicBlockSession> | null>(null)

  useEffect(() => {
    if (!anchorWallet) {
      setSession(null)
      setStage('idle')
      setStatusText(null)
      setError(null)
      return
    }
    let cancelled = false
    void sessionWallet.getSessionToken().then((token) => {
      if (cancelled) return
      const publicKey = sessionWallet.publicKey
      if (token && publicKey) {
        setSession({ token, publicKey })
        setStage('ready')
        setStatusText('Ready')
        debugMagicBlock('session:restored', { owner: anchorWallet.publicKey.toBase58(), session: publicKey.toBase58() })
      }
    }).catch((reason) => debugMagicBlock('session:restore-failed', { reason }))
    return () => { cancelled = true }
  }, [anchorWallet, sessionWallet])

  const prepareSession = useCallback(async (): Promise<MagicBlockSession> => {
    if (!anchorWallet) throw new Error('Connect a wallet before creating a Ranked session.')
    if (prepareSessionRef.current) return prepareSessionRef.current
    if (session) return session
    setError(null)
    setStage('connecting')
    setStatusText('Connecting...')
    debugMagicBlock('session:prepare:start', { owner: anchorWallet.publicKey.toBase58() })

    const request = (async () => {
      const existingToken = await sessionWallet.getSessionToken()
      if (existingToken && sessionWallet.publicKey) {
        const restored = { token: existingToken, publicKey: sessionWallet.publicKey }
        setSession(restored)
        setStage('ready')
        setStatusText('Ready')
        debugMagicBlock('session:prepare:restored', { session: restored.publicKey.toBase58() })
        return restored
      }

      setStage('creating-session')
      setStatusText('Creating Session...')
      const created = await sessionWallet.createSession(
        CATCH_THE_MAGICIAN_PROGRAM_ID,
        sessionTopUpLamports,
        sessionDurationMinutes,
        ({ sessionToken, publicKey }) => debugMagicBlock('session:created-callback', { sessionToken, publicKey }),
      )
      const token = created?.sessionToken ?? sessionWallet.sessionToken
      const publicKey = created?.publicKey ?? sessionWallet.publicKey
      if (!token || !publicKey) {
        setStage('error')
        setStatusText(null)
        setError('Unable to start Ranked session.')
        throw new Error('MagicBlock session key creation did not return a usable session.')
      }
      const next = { token, publicKey }
      setSession(next)
      setStage('ready')
      setStatusText('Ready')
      debugMagicBlock('session:prepare:created', { session: publicKey.toBase58() })
      return next
    })().finally(() => {
      prepareSessionRef.current = null
    })
    prepareSessionRef.current = request
    return request
  }, [anchorWallet, session, sessionWallet])

  const sendSessionTransaction = useCallback(async (transaction: Transaction, options = {}) => {
    if (!sessionWallet.sendTransaction) throw new Error('MagicBlock session wallet is not ready.')
    setError(null)
    setStage('settling')
    setStatusText('Settling Result...')
    const signature = await sessionWallet.sendTransaction(transaction, base.ephemeralConnection, {
      preflightCommitment: 'confirmed',
      skipPreflight: true,
      ...options,
    })
    debugMagicBlock('session:transaction-sent', { signature })
    return signature
  }, [base.ephemeralConnection, sessionWallet])

  const value = useMemo<MagicBlockState>(() => ({
    ...base,
    stage,
    statusText,
    error: error ?? sessionWallet.error,
    session,
    prepareSession,
    sendSessionTransaction,
    markSettling: () => {
      setStage('settling')
      setStatusText('Settling Result...')
    },
    clearCompletedSession: () => {
      setSession(null)
      setStage('idle')
      setStatusText(null)
      setError(null)
    },
    clearError: () => {
      setError(null)
      if (stage === 'error') setStage('idle')
    },
  }), [base, error, prepareSession, sendSessionTransaction, session, sessionWallet.error, stage, statusText])

  return <MagicBlockContext.Provider value={value}>{children}</MagicBlockContext.Provider>
}

function DisconnectedMagicBlockProvider({ children }: { children: ReactNode }) {
  const base = useBaseMagicBlockState()
  const value = useMemo<MagicBlockState>(() => ({
    ...base,
    stage: 'idle',
    statusText: null,
    error: null,
    session: null,
    prepareSession: async () => { throw new Error('Connect a wallet before creating a Ranked session.') },
    sendSessionTransaction: async () => { throw new Error('MagicBlock session wallet is not ready.') },
    markSettling: () => undefined,
    clearCompletedSession: () => undefined,
    clearError: () => undefined,
  }), [base])
  return <MagicBlockContext.Provider value={value}>{children}</MagicBlockContext.Provider>
}

function useBaseMagicBlockState() {
  const routerEndpoint = import.meta.env.VITE_MAGICBLOCK_ROUTER_URL?.trim() || defaultRouterEndpoint
  const ephemeralEndpoint = import.meta.env.VITE_MAGICBLOCK_ER_URL?.trim() || defaultEphemeralEndpoint
  const validator = useMemo(() => new PublicKey(import.meta.env.VITE_MAGICBLOCK_VALIDATOR_ID?.trim() || defaultValidator), [])
  const routerConnection = useMemo(() => new ConnectionMagicRouter(routerEndpoint, { commitment: 'confirmed' }), [routerEndpoint])
  const ephemeralConnection = useMemo(() => new Connection(ephemeralEndpoint, { commitment: 'confirmed' }), [ephemeralEndpoint])
  const getDelegationStatus = useCallback(async (account: PublicKey) => {
    const status = await routerConnection.getDelegationStatus(account)
    debugMagicBlock('delegation:status', { account: account.toBase58(), delegated: status.isDelegated })
    return status.isDelegated
  }, [routerConnection])
  return useMemo(() => ({ routerConnection, ephemeralConnection, validator, getDelegationStatus }), [ephemeralConnection, getDelegationStatus, routerConnection, validator])
}

function debugMagicBlock(event: string, details: Record<string, unknown> = {}) {
  if (import.meta.env.DEV) console.debug(`[MagicBlock] ${event}`, details)
}
