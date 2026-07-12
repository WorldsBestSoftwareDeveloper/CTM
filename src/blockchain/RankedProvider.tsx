import { AnchorProvider, BN } from '@coral-xyz/anchor'
import { useAnchorWallet, useConnection, useWallet } from '@solana/wallet-adapter-react'
import type { Transaction } from '@solana/web3.js'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createCatchTheMagicianProgram, derivePlayerProfileAddress, deriveRunSessionAddress } from './program'
import { RankedContext, type OnChainProfile, type TransactionStage } from './RankedContext'

const rpcTimeoutMs = 20000

export function RankedProvider({ children }: { children: ReactNode }) {
  const { connection } = useConnection()
  const signingWallet = useAnchorWallet()
  const { connected, publicKey, wallet } = useWallet()
  const [profile, setProfile] = useState<OnChainProfile | null>(null)
  const [activeRunId, setActiveRunId] = useState<bigint | null>(null)
  const [transactionStage, setTransactionStage] = useState<TransactionStage>('idle')
  const [transactionLabel, setTransactionLabel] = useState<string | null>(null)
  const [transactionSignature, setTransactionSignature] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const operationRef = useRef<Promise<void> | null>(null)
  const lifecycleRef = useRef(0)
  const walletIdentityRef = useRef<string | null>(null)

  const walletAddress = publicKey?.toBase58() ?? null
  const walletIdentity = connected && walletAddress ? `${wallet?.adapter.name ?? 'unknown'}:${walletAddress}` : null

  const provider = useMemo(
    () => signingWallet && walletAddress ? new AnchorProvider(connection, signingWallet, { commitment: 'confirmed', preflightCommitment: 'confirmed' }) : null,
    [connection, signingWallet, walletAddress],
  )
  const program = useMemo(() => provider ? createCatchTheMagicianProgram(provider) : null, [provider])

  const storageKey = useCallback(() => walletAddress ? `ctm:ranked-run:${walletAddress}` : null, [walletAddress])

  useEffect(() => {
    if (walletIdentityRef.current === walletIdentity) return
    const previous = walletIdentityRef.current
    walletIdentityRef.current = walletIdentity
    lifecycleRef.current += 1
    operationRef.current = null
    setProfile(null)
    setActiveRunId(null)
    setTransactionStage('idle')
    setTransactionLabel(null)
    setTransactionSignature(null)
    setError(null)
    debugRanked('wallet-lifecycle-reset', { previous, next: walletIdentity })
  }, [walletIdentity])

  const readProfile = useCallback(async (): Promise<OnChainProfile | null> => {
    if (!program || !signingWallet || !walletAddress) return null
    debugRanked('profile:read:start', { wallet: walletAddress })
    const [address] = derivePlayerProfileAddress(signingWallet.publicKey)
    const account = await withTimeout(program.account.playerProfile.fetchNullable(address), 'Profile lookup timed out.')
    const next = account ? {
      address: address.toBase58(),
      runsPlayed: account.runsPlayed.toNumber(),
      bestScore: account.bestScore.toNumber(),
      bestDistance: account.bestDistance.toNumber(),
    } : null
    setProfile(next)
    debugRanked('profile:read:complete', { wallet: walletAddress, exists: Boolean(next) })
    return next
  }, [program, signingWallet, walletAddress])

  const refreshProfile = useCallback(async () => { await readProfile() }, [readProfile])

  useEffect(() => {
    if (!connected || !signingWallet || !walletAddress || !program) {
      setProfile(null)
      setActiveRunId(null)
      return
    }
    void readProfile().catch((reason) => console.warn('[RankedProvider] Profile refresh failed.', reason))
    const key = storageKey()
    const stored = key ? window.localStorage.getItem(key) : null
    if (!stored) return
    try {
      const runId = BigInt(stored)
      const [runAddress] = deriveRunSessionAddress(signingWallet.publicKey, runId)
      debugRanked('run:recover:start', { wallet: walletAddress, runId: runId.toString() })
      void program.account.runSession.fetchNullable(runAddress).then((account) => {
        if (account && 'active' in account.status) {
          setActiveRunId(runId)
          debugRanked('run:recover:active', { wallet: walletAddress, runId: runId.toString() })
        } else if (key) {
          window.localStorage.removeItem(key)
          debugRanked('run:recover:cleared', { wallet: walletAddress, runId: runId.toString() })
        }
      }).catch((reason) => console.warn('[RankedProvider] Active run recovery failed.', reason))
    } catch {
      if (key) window.localStorage.removeItem(key)
    }
  }, [connected, program, readProfile, signingWallet, storageKey, walletAddress])

  const execute = useCallback((label: string, action: () => Promise<void>): Promise<void> => {
    if (operationRef.current) {
      debugRanked('transaction:ignored-duplicate', { label, wallet: walletAddress })
      return operationRef.current
    }
    const lifecycle = lifecycleRef.current
    debugRanked('transaction:start', { label, wallet: walletAddress })
    setError(null)
    setTransactionLabel(label)
    setTransactionSignature(null)
    setTransactionStage('preparing')
    const operation = action().catch((reason: unknown) => {
      const message = transactionErrorMessage(reason)
      console.warn(`[RankedProvider] ${label} failed.`, reason)
      if (lifecycle === lifecycleRef.current) {
        setError(message)
        setTransactionStage('error')
      }
      throw reason
    }).finally(() => {
      if (lifecycle === lifecycleRef.current) operationRef.current = null
      debugRanked('transaction:end', { label, wallet: walletAddress, currentLifecycle: lifecycle === lifecycleRef.current })
    })
    operationRef.current = operation
    return operation
  }, [walletAddress])

  const send = useCallback(async (builder: { transaction: () => Promise<Transaction> }): Promise<string> => {
    if (!signingWallet || !walletAddress || !connected) throw new Error('Connect a wallet before starting Ranked Mode.')
    const lifecycle = lifecycleRef.current
    const transaction = await builder.transaction()
    const latest = await withTimeout(connection.getLatestBlockhash('confirmed'), 'RPC timed out while preparing the transaction.')
    if (lifecycle !== lifecycleRef.current) throw new Error('Wallet changed before the transaction could be signed.')
    transaction.feePayer = signingWallet.publicKey
    transaction.recentBlockhash = latest.blockhash
    debugRanked('transaction:awaiting-wallet', { wallet: walletAddress })
    setTransactionStage('awaiting-approval')
    const signed = await signingWallet.signTransaction(transaction)
    if (lifecycle !== lifecycleRef.current) throw new Error('Wallet changed before the signed transaction could be sent.')
    setTransactionStage('sending')
    const signature = await withTimeout(connection.sendRawTransaction(signed.serialize(), { preflightCommitment: 'confirmed' }), 'RPC timed out while sending the transaction.')
    setTransactionSignature(signature)
    debugRanked('transaction:sent', { wallet: walletAddress, signature })
    setTransactionStage('confirming')
    const confirmation = await withTimeout(connection.confirmTransaction({ signature, ...latest }, 'confirmed'), 'RPC timed out while confirming the transaction.')
    if (confirmation.value.err) throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`)
    setTransactionStage('complete')
    debugRanked('transaction:confirmed', { wallet: walletAddress, signature })
    return signature
  }, [connected, connection, signingWallet, walletAddress])

  const beginRun = useCallback(() => execute('Starting Ranked run', async () => {
    if (!program || !signingWallet || !walletAddress) throw new Error('Connect a wallet before starting Ranked Mode.')
    const key = storageKey()
    if (activeRunId !== null) {
      setTransactionStage('complete')
      debugRanked('run:start:already-active', { wallet: walletAddress, runId: activeRunId.toString() })
      return
    }

    const [profileAddress] = derivePlayerProfileAddress(signingWallet.publicKey)
    const existingProfile = await readProfile()
    if (!existingProfile) {
      debugRanked('profile:initialize:start', { wallet: walletAddress })
      await send(program.methods.initializePlayer().accountsPartial({ playerProfile: profileAddress, authority: signingWallet.publicKey }))
      await readProfile()
      setTransactionStage('preparing')
      debugRanked('profile:initialize:complete', { wallet: walletAddress })
    }

    const runId = BigInt(Date.now())
    const [runAddress] = deriveRunSessionAddress(signingWallet.publicKey, runId)
    await send(program.methods.startRun(new BN(runId.toString())).accountsPartial({ playerProfile: profileAddress, runSession: runAddress, authority: signingWallet.publicKey }))
    setActiveRunId(runId)
    if (key) window.localStorage.setItem(key, runId.toString())
    debugRanked('run:start:complete', { wallet: walletAddress, runId: runId.toString() })
  }), [activeRunId, execute, program, readProfile, send, signingWallet, storageKey, walletAddress])

  const finishRun = useCallback((score: number, distance: number) => execute('Saving Ranked result', async () => {
    if (!program || !signingWallet || !walletAddress || activeRunId === null) throw new Error('No active Ranked run was found.')
    const [profileAddress] = derivePlayerProfileAddress(signingWallet.publicKey)
    const [runAddress] = deriveRunSessionAddress(signingWallet.publicKey, activeRunId)
    await send(program.methods.finishRun(new BN(Math.max(0, Math.floor(score))), new BN(Math.max(0, Math.floor(distance)))).accountsPartial({ playerProfile: profileAddress, runSession: runAddress, authority: signingWallet.publicKey }))
    setActiveRunId(null)
    const key = storageKey()
    if (key) window.localStorage.removeItem(key)
    await readProfile()
    debugRanked('run:finish:complete', { wallet: walletAddress, score, distance })
  }), [activeRunId, execute, program, readProfile, send, signingWallet, storageKey, walletAddress])

  const value = useMemo(() => ({
    profile,
    activeRunId,
    transactionStage,
    transactionLabel,
    transactionSignature,
    error,
    busy: operationRef.current !== null,
    beginRun,
    finishRun,
    refreshProfile,
    clearTransaction: () => {
      if (operationRef.current) return
      setTransactionStage('idle')
      setTransactionLabel(null)
      setTransactionSignature(null)
      setError(null)
    },
  }), [activeRunId, beginRun, error, finishRun, profile, refreshProfile, transactionLabel, transactionSignature, transactionStage])

  return <RankedContext.Provider value={value}>{children}</RankedContext.Provider>
}

async function withTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
  let timeout = 0
  const timer = new Promise<never>((_, reject) => { timeout = window.setTimeout(() => reject(new Error(message)), rpcTimeoutMs) })
  try {
    return await Promise.race([promise, timer])
  } finally {
    window.clearTimeout(timeout)
  }
}

function transactionErrorMessage(reason: unknown): string {
  const message = reason instanceof Error ? reason.message : String(reason)
  const normalized = message.toLowerCase()
  if (normalized.includes('reject') || normalized.includes('declin') || normalized.includes('cancel')) return 'The wallet approval was cancelled.'
  if (normalized.includes('timeout') || normalized.includes('timed out')) return 'Devnet took too long to respond. Your transaction was not retried automatically.'
  if (normalized.includes('insufficient')) return 'The wallet does not have enough Devnet SOL for this transaction.'
  return message || 'The Ranked transaction failed. Demo Mode remains available.'
}

function debugRanked(event: string, details: Record<string, unknown> = {}) {
  console.debug(`[RankedProvider] ${event}`, details)
}
