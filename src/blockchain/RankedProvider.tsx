import { AnchorProvider, BN } from '@coral-xyz/anchor'
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react'
import type { Transaction } from '@solana/web3.js'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createCatchTheMagicianProgram, derivePlayerProfileAddress, deriveRunSessionAddress } from './program'
import { RankedContext, type OnChainProfile, type TransactionStage } from './RankedContext'

const rpcTimeoutMs = 20000

export function RankedProvider({ children }: { children: ReactNode }) {
  const { connection } = useConnection()
  const wallet = useAnchorWallet()
  const [profile, setProfile] = useState<OnChainProfile | null>(null)
  const [activeRunId, setActiveRunId] = useState<bigint | null>(null)
  const [transactionStage, setTransactionStage] = useState<TransactionStage>('idle')
  const [transactionLabel, setTransactionLabel] = useState<string | null>(null)
  const [transactionSignature, setTransactionSignature] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const operationRef = useRef<Promise<void> | null>(null)

  const provider = useMemo(() => wallet ? new AnchorProvider(connection, wallet, { commitment: 'confirmed', preflightCommitment: 'confirmed' }) : null, [connection, wallet])
  const program = useMemo(() => provider ? createCatchTheMagicianProgram(provider) : null, [provider])

  const storageKey = useCallback(() => wallet ? `ctm:ranked-run:${wallet.publicKey.toBase58()}` : null, [wallet])

  const readProfile = useCallback(async (): Promise<OnChainProfile | null> => {
    if (!program || !wallet) return null
    const [address] = derivePlayerProfileAddress(wallet.publicKey)
    const account = await withTimeout(program.account.playerProfile.fetchNullable(address), 'Profile lookup timed out.')
    const next = account ? {
      address: address.toBase58(),
      runsPlayed: account.runsPlayed.toNumber(),
      bestScore: account.bestScore.toNumber(),
      bestDistance: account.bestDistance.toNumber(),
    } : null
    setProfile(next)
    return next
  }, [program, wallet])

  const refreshProfile = useCallback(async () => { await readProfile() }, [readProfile])

  useEffect(() => {
    if (!wallet || !program) {
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
      const [runAddress] = deriveRunSessionAddress(wallet.publicKey, runId)
      void program.account.runSession.fetchNullable(runAddress).then((account) => {
        if (account && 'active' in account.status) setActiveRunId(runId)
        else if (key) window.localStorage.removeItem(key)
      }).catch((reason) => console.warn('[RankedProvider] Active run recovery failed.', reason))
    } catch {
      if (key) window.localStorage.removeItem(key)
    }
  }, [program, readProfile, storageKey, wallet])

  const execute = useCallback((label: string, action: () => Promise<void>): Promise<void> => {
    if (operationRef.current) return operationRef.current
    setError(null)
    setTransactionLabel(label)
    setTransactionSignature(null)
    setTransactionStage('preparing')
    const operation = action().catch((reason: unknown) => {
      const message = transactionErrorMessage(reason)
      console.warn(`[RankedProvider] ${label} failed.`, reason)
      setError(message)
      setTransactionStage('error')
      throw reason
    }).finally(() => { operationRef.current = null })
    operationRef.current = operation
    return operation
  }, [])

  const send = useCallback(async (builder: { transaction: () => Promise<Transaction> }): Promise<string> => {
    if (!wallet) throw new Error('Connect a wallet before starting Ranked Mode.')
    const transaction = await builder.transaction()
    const latest = await withTimeout(connection.getLatestBlockhash('confirmed'), 'RPC timed out while preparing the transaction.')
    transaction.feePayer = wallet.publicKey
    transaction.recentBlockhash = latest.blockhash
    setTransactionStage('awaiting-approval')
    const signed = await wallet.signTransaction(transaction)
    setTransactionStage('sending')
    const signature = await withTimeout(connection.sendRawTransaction(signed.serialize(), { preflightCommitment: 'confirmed' }), 'RPC timed out while sending the transaction.')
    setTransactionSignature(signature)
    setTransactionStage('confirming')
    const confirmation = await withTimeout(connection.confirmTransaction({ signature, ...latest }, 'confirmed'), 'RPC timed out while confirming the transaction.')
    if (confirmation.value.err) throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`)
    setTransactionStage('complete')
    return signature
  }, [connection, wallet])

  const beginRun = useCallback(() => execute('Starting Ranked run', async () => {
    if (!program || !wallet) throw new Error('Connect a wallet before starting Ranked Mode.')
    const key = storageKey()
    if (activeRunId !== null) {
      setTransactionStage('complete')
      return
    }

    const [profileAddress] = derivePlayerProfileAddress(wallet.publicKey)
    const existingProfile = await readProfile()
    if (!existingProfile) {
      await send(program.methods.initializePlayer().accountsPartial({ playerProfile: profileAddress, authority: wallet.publicKey }))
      await readProfile()
      setTransactionStage('preparing')
    }

    const runId = BigInt(Date.now())
    const [runAddress] = deriveRunSessionAddress(wallet.publicKey, runId)
    await send(program.methods.startRun(new BN(runId.toString())).accountsPartial({ playerProfile: profileAddress, runSession: runAddress, authority: wallet.publicKey }))
    setActiveRunId(runId)
    if (key) window.localStorage.setItem(key, runId.toString())
  }), [activeRunId, execute, program, readProfile, send, storageKey, wallet])

  const finishRun = useCallback((score: number, distance: number) => execute('Saving Ranked result', async () => {
    if (!program || !wallet || activeRunId === null) throw new Error('No active Ranked run was found.')
    const [profileAddress] = derivePlayerProfileAddress(wallet.publicKey)
    const [runAddress] = deriveRunSessionAddress(wallet.publicKey, activeRunId)
    await send(program.methods.finishRun(new BN(Math.max(0, Math.floor(score))), new BN(Math.max(0, Math.floor(distance)))).accountsPartial({ playerProfile: profileAddress, runSession: runAddress, authority: wallet.publicKey }))
    setActiveRunId(null)
    const key = storageKey()
    if (key) window.localStorage.removeItem(key)
    await readProfile()
  }), [activeRunId, execute, program, readProfile, send, storageKey, wallet])

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
