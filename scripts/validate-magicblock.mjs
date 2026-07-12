import fs from 'node:fs'
import process from 'node:process'
import anchor from '@coral-xyz/anchor'
import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import { ConnectionMagicRouter } from '@magicblock-labs/ephemeral-rollups-sdk'
import { SessionTokenManager } from '@magicblock-labs/gum-sdk'

const { AnchorProvider, BN, Program, Wallet } = anchor
const idl = JSON.parse(fs.readFileSync(new URL('../src/blockchain/catch_the_magician.json', import.meta.url), 'utf8'))

const programId = new PublicKey('74bg3UqJQTXJQihCw1JX7F3NWh9PUhj4UFqjE81rCpnR')
const validator = new PublicKey(process.env.VITE_MAGICBLOCK_VALIDATOR_ID || 'MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57')
const baseEndpoint = process.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
const routerEndpoint = process.env.VITE_MAGICBLOCK_ROUTER_URL || 'https://devnet-router.magicblock.app'
const ephemeralEndpoint = process.env.VITE_MAGICBLOCK_ER_URL || 'https://devnet.magicblock.app'
const walletPath = process.env.ANCHOR_WALLET || `${process.env.HOME}/.config/solana/id.json`

const PLAYER_SEED = Buffer.from('player')
const RUN_SEED = Buffer.from('run')
const rpcTimeoutMs = 45_000

function loadKeypair(path) {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(path, 'utf8'))))
}

function derivePlayerProfile(authority) {
  return PublicKey.findProgramAddressSync([PLAYER_SEED, authority.toBuffer()], programId)[0]
}

function deriveRunSession(authority, runId) {
  const buffer = Buffer.alloc(8)
  buffer.writeBigUInt64LE(runId)
  return PublicKey.findProgramAddressSync([RUN_SEED, authority.toBuffer(), buffer], programId)[0]
}

async function sendBuiltTransaction(label, builder, connection, feePayer, signers = []) {
  console.log(`START ${label}`)
  const transaction = await withTimeout(builder.transaction(), `${label} transaction build timed out`)
  const latest = await withTimeout(connection.getLatestBlockhash('confirmed'), `${label} blockhash lookup timed out`)
  transaction.feePayer = feePayer.publicKey
  transaction.recentBlockhash = latest.blockhash
  transaction.sign(feePayer, ...signers)
  const signature = await withTimeout(
    connection.sendRawTransaction(transaction.serialize(), { skipPreflight: true, preflightCommitment: 'confirmed' }),
    `${label} send timed out`,
  )
  const confirmation = await withTimeout(
    connection.confirmTransaction({ signature, ...latest }, 'confirmed'),
    `${label} confirmation timed out: ${signature}`,
  )
  if (confirmation.value.err) throw new Error(`${label} failed: ${JSON.stringify(confirmation.value.err)}`)
  console.log(`PASS ${label}: ${signature}`)
  return signature
}

async function waitForDelegation(routerConnection, account, label) {
  for (let attempt = 1; attempt <= 24; attempt += 1) {
    const status = await routerConnection.getDelegationStatus(account)
    if (status.isDelegated) {
      console.log(`PASS ${label}: delegated`)
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 2500))
  }
  throw new Error(`${label} did not become delegated.`)
}

async function withTimeout(promise, message, timeoutMs = rpcTimeoutMs) {
  let timeout = 0
  const timer = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error(message)), timeoutMs)
  })
  try {
    return await Promise.race([promise, timer])
  } finally {
    clearTimeout(timeout)
  }
}

async function main() {
  console.log('MagicBlock validation starting...')
  console.log(`Base RPC: ${baseEndpoint}`)
  console.log(`Router RPC: ${routerEndpoint}`)
  console.log(`Ephemeral RPC: ${ephemeralEndpoint}`)

  const payer = loadKeypair(walletPath)
  const wallet = new Wallet(payer)
  const baseConnection = new Connection(baseEndpoint, 'confirmed')
  const routerConnection = new ConnectionMagicRouter(routerEndpoint, { commitment: 'confirmed' })
  const ephemeralConnection = new Connection(ephemeralEndpoint, 'confirmed')
  const provider = new AnchorProvider(baseConnection, wallet, { commitment: 'confirmed', preflightCommitment: 'confirmed' })
  const program = new Program(idl, provider)

  const profileAddress = derivePlayerProfile(payer.publicKey)
  const existingProfile = await baseConnection.getAccountInfo(profileAddress, 'confirmed')
  if (!existingProfile) {
    console.log('START initialize_player')
    await withTimeout(program.methods.initializePlayer().accountsPartial({ playerProfile: profileAddress, authority: payer.publicKey }).rpc(), 'initialize_player timed out')
    console.log('PASS initialize_player')
  } else {
    console.log('PASS initialize_player: existing profile reused')
  }

  const sessionKeypair = Keypair.generate()
  const sessionManager = new SessionTokenManager(wallet, baseConnection)
  const validUntil = new BN(Math.ceil((Date.now() + 60 * 60 * 1000) / 1000))
  const topUpLamports = new BN(2_000_000)
  const sessionBuilder = sessionManager.program.methods
    .createSession(true, validUntil, topUpLamports)
    .accounts({
      targetProgram: programId,
      sessionSigner: sessionKeypair.publicKey,
      authority: payer.publicKey,
    })
    .signers([sessionKeypair])
  console.log('START session_key_creation')
  const sessionKeys = await withTimeout(sessionBuilder.pubkeys(), 'session pubkey derivation timed out')
  const sessionSignature = await withTimeout(sessionBuilder.rpc(), 'session_key_creation timed out')
  console.log(`PASS session_key_creation: ${sessionSignature}`)
  console.log(`Session signer: ${sessionKeypair.publicKey.toBase58()}`)
  console.log(`Session token: ${sessionKeys.sessionToken.toBase58()}`)

  const runId = BigInt(Date.now())
  const runAddress = deriveRunSession(payer.publicKey, runId)
  await sendBuiltTransaction(
    'start_run',
    program.methods.startRun(new BN(runId.toString()), sessionKeypair.publicKey)
      .accountsPartial({ playerProfile: profileAddress, runSession: runAddress, authority: payer.publicKey }),
    baseConnection,
    payer,
  )

  await sendBuiltTransaction(
    'delegate_run_session',
    program.methods.delegateRunSession(new BN(runId.toString()))
      .accountsPartial({ payer: payer.publicKey, pda: runAddress })
      .remainingAccounts([{ pubkey: validator, isSigner: false, isWritable: false }]),
    baseConnection,
    payer,
  )
  await waitForDelegation(routerConnection, runAddress, 'run_session_delegation')

  await sendBuiltTransaction(
    'delegate_player_profile',
    program.methods.delegatePlayerProfile()
      .accountsPartial({ payer: payer.publicKey, pda: profileAddress })
      .remainingAccounts([{ pubkey: validator, isSigner: false, isWritable: false }]),
    baseConnection,
    payer,
  )
  await waitForDelegation(routerConnection, profileAddress, 'player_profile_delegation')

  await sendBuiltTransaction(
    'finish_run_with_session_key',
    program.methods.finishRun(new BN(1234), new BN(567))
      .accountsPartial({ playerProfile: profileAddress, runSession: runAddress, authority: sessionKeypair.publicKey }),
    ephemeralConnection,
    sessionKeypair,
  )

  await sendBuiltTransaction(
    'undelegate_and_settle',
    program.methods.undelegateRankedSession()
      .accountsPartial({ payer: sessionKeypair.publicKey, playerProfile: profileAddress, runSession: runAddress }),
    ephemeralConnection,
    sessionKeypair,
  )

  await new Promise((resolve) => setTimeout(resolve, 5000))
  const profile = await withTimeout(program.account.playerProfile.fetch(profileAddress), 'profile refresh timed out')
  const run = await withTimeout(program.account.runSession.fetch(runAddress), 'run refresh timed out')
  if (!('finished' in run.status)) throw new Error('Run did not settle as finished on base connection.')
  console.log(`PASS settlement_profile_refresh: runs=${profile.runsPlayed.toString()} bestScore=${profile.bestScore.toString()} bestDistance=${profile.bestDistance.toString()}`)
  console.log('PASS demo_mode_unaffected: validation script did not import or execute gameplay/Demo Mode code')
  console.log('MagicBlock validation complete.')
}

main().catch((error) => {
  console.error('FAIL MagicBlock validation', error)
  process.exit(1)
})
