import { BN } from '@coral-xyz/anchor'
import { SessionTokenManager } from '@magicblock-labs/gum-sdk'
import { ConnectionMagicRouter } from '@magicblock-labs/ephemeral-rollups-sdk'
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react'
import { Connection, Keypair, PublicKey, type Transaction } from '@solana/web3.js'
import type { AnchorWallet } from '@solana/wallet-adapter-react'
import type { SendTransactionOptions } from '@solana/wallet-adapter-base'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CATCH_THE_MAGICIAN_PROGRAM_ID } from './program'
import { MagicBlockContext, type MagicBlockSession, type MagicBlockStage, type MagicBlockState } from './MagicBlockContext'

const defaultRouterEndpoint = 'https://devnet-router.magicblock.app'
const defaultEphemeralEndpoint = 'https://devnet.magicblock.app'
const defaultValidator = 'MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57'
const sessionDurationMinutes = 60
const sessionTopUpLamports = 2_000_000
const sessionStoragePrefix = 'ctm:magicblock-session'

export function MagicBlockProvider({ children }: { children: ReactNode }) {
  const anchorWallet = useAnchorWallet()
  if (!anchorWallet) return <DisconnectedMagicBlockProvider>{children}</DisconnectedMagicBlockProvider>
  return <ConnectedMagicBlockProvider>{children}</ConnectedMagicBlockProvider>
}

function ConnectedMagicBlockProvider({ children }: { children: ReactNode }) {
  const { connection } = useConnection()
  const anchorWallet = useAnchorWallet()
  if (!anchorWallet) throw new Error('ConnectedMagicBlockProvider requires an Anchor wallet.')
  const sessionWallet = useMagicBlockSessionManager(anchorWallet, connection)
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
      sessionWallet.clearSession()
      setSession(null)
      setStage('idle')
      setStatusText(null)
      setError(null)
    },
    clearError: () => {
      setError(null)
      if (stage === 'error') setStage('idle')
    },
  }), [base, error, prepareSession, sendSessionTransaction, session, sessionWallet, stage, statusText])

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

interface StoredSession {
  token: string
  secretKey: number[]
  validUntil: number
}

function useMagicBlockSessionManager(anchorWallet: AnchorWallet, connection: Connection) {
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [sessionKeypair, setSessionKeypair] = useState<Keypair | null>(null)
  const [error, setError] = useState<string | null>(null)
  const manager = useMemo(() => new SessionTokenManager(anchorWallet, connection), [anchorWallet, connection])
  const storageKey = useMemo(
    () => `${sessionStoragePrefix}:${anchorWallet.publicKey.toBase58()}:${CATCH_THE_MAGICIAN_PROGRAM_ID.toBase58()}`,
    [anchorWallet.publicKey],
  )

  const clearSession = useCallback(() => {
    window.localStorage.removeItem(storageKey)
    setSessionToken(null)
    setSessionKeypair(null)
  }, [storageKey])

  const getSessionToken = useCallback(async () => {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) {
      clearSession()
      return null
    }
    try {
      const stored = JSON.parse(raw) as StoredSession
      const now = Math.ceil(Date.now() / 1000)
      if (!stored.token || !stored.secretKey?.length || now >= stored.validUntil) {
        clearSession()
        return null
      }
      const token = new PublicKey(stored.token)
      const keypair = Keypair.fromSecretKey(Uint8Array.from(stored.secretKey))
      const account = await manager.get(token)
      if (
        !account.authority.equals(anchorWallet.publicKey)
        || !account.targetProgram.equals(CATCH_THE_MAGICIAN_PROGRAM_ID)
        || !account.sessionSigner.equals(keypair.publicKey)
        || account.validUntil.toNumber() <= now
      ) {
        clearSession()
        return null
      }
      setSessionToken(stored.token)
      setSessionKeypair(keypair)
      setError(null)
      return stored.token
    } catch (reason) {
      debugMagicBlock('session:stored-invalid', { reason })
      clearSession()
      return null
    }
  }, [anchorWallet.publicKey, clearSession, manager, storageKey])

  const createSession = useCallback(async (
    targetProgram: PublicKey,
    topUpLamports = 0,
    validForMinutes = sessionDurationMinutes,
    sessionCreatedCallback?: (sessionInfo: { sessionToken: string; publicKey: string }) => void,
  ) => {
    try {
      const keypair = Keypair.generate()
      const validUntil = Math.ceil((Date.now() + validForMinutes * 60 * 1000) / 1000)
      const topUp = topUpLamports > 0
      const builder = manager.program.methods
        .createSession(topUp, new BN(validUntil), topUp ? new BN(topUpLamports) : null)
        .accounts({
          targetProgram,
          sessionSigner: keypair.publicKey,
          authority: anchorWallet.publicKey,
        })
        .signers([keypair])
      const pubkeys = await builder.pubkeys()
      await builder.rpc()
      if (!pubkeys.sessionToken) throw new Error('MagicBlock session token PDA was not returned.')
      const token = pubkeys.sessionToken.toBase58()
      const stored: StoredSession = {
        token,
        secretKey: Array.from(keypair.secretKey),
        validUntil,
      }
      window.localStorage.setItem(storageKey, JSON.stringify(stored))
      setSessionToken(token)
      setSessionKeypair(keypair)
      setError(null)
      sessionCreatedCallback?.({ sessionToken: token, publicKey: keypair.publicKey.toBase58() })
      return { sessionToken: token, publicKey: keypair.publicKey }
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : String(reason)
      setError(message)
      throw reason
    }
  }, [anchorWallet.publicKey, manager, storageKey])

  const sendTransaction = useCallback(async (
    transaction: Transaction,
    transactionConnection = connection,
    options: SendTransactionOptions = {},
  ) => {
    if (!sessionKeypair || !sessionToken) throw new Error('Cannot send transaction before a MagicBlock session is ready.')
    transaction.feePayer = transaction.feePayer ?? sessionKeypair.publicKey
    transaction.recentBlockhash = transaction.recentBlockhash
      ?? (await transactionConnection.getLatestBlockhash({
        commitment: options.preflightCommitment,
        minContextSlot: options.minContextSlot,
      })).blockhash
    transaction.sign(sessionKeypair)
    return transactionConnection.sendRawTransaction(transaction.serialize(), options)
  }, [connection, sessionKeypair, sessionToken])

  return useMemo(() => ({
    publicKey: sessionToken && sessionKeypair ? sessionKeypair.publicKey : null,
    sessionToken,
    error,
    getSessionToken,
    createSession,
    sendTransaction,
    clearSession,
  }), [clearSession, createSession, error, getSessionToken, sendTransaction, sessionKeypair, sessionToken])
}

function debugMagicBlock(event: string, details: Record<string, unknown> = {}) {
  if (import.meta.env.DEV) console.debug(`[MagicBlock] ${event}`, details)
}
