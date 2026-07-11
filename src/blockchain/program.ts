import { Program, type AnchorProvider } from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'
import idl from './catch_the_magician.json'
import type { CatchTheMagician } from './catch_the_magician'

export const CATCH_THE_MAGICIAN_PROGRAM_ID = new PublicKey('74bg3UqJQTXJQihCw1JX7F3NWh9PUhj4UFqjE81rCpnR')

export function createCatchTheMagicianProgram(provider: AnchorProvider): Program<CatchTheMagician> {
  return new Program(idl as CatchTheMagician, provider)
}

export function derivePlayerProfileAddress(authority: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [new TextEncoder().encode('player'), authority.toBuffer()],
    CATCH_THE_MAGICIAN_PROGRAM_ID,
  )
}

export function deriveRunSessionAddress(authority: PublicKey, runId: bigint): [PublicKey, number] {
  const runIdBuffer = new Uint8Array(8)
  new DataView(runIdBuffer.buffer).setBigUint64(0, runId, true)
  return PublicKey.findProgramAddressSync(
    [new TextEncoder().encode('run'), authority.toBuffer(), runIdBuffer],
    CATCH_THE_MAGICIAN_PROGRAM_ID,
  )
}
