import type { RunnerState } from './GameScene'
import { defaultGameSettings, type GameSettings } from '../settings'

export interface RunnerAudioSnapshot {
  runnerState: RunnerState
  forwardSpeed: number
  demonProximity: number
  runAnimationPhase: number | null
  grounded: boolean
}

type MusicTrack = 'ambient' | 'chase'

const musicFadeMs = 750
const chaseEnterProximity = 0.62
const chaseExitProximity = 0.38
const criticalRoarProximity = 0.86
const roarCooldownMs = 7600
const defaultAmbientVolume = 0.36
const defaultChaseVolume = 0.42
const defaultSfxVolume = 0.72

class AudioManager {
  private readonly ambient = this.createAudio('/assets/audio/music/ambient.mp3', true, defaultAmbientVolume)
  private readonly chase = this.createAudio('/assets/audio/music/chase.mp3', true, 0)
  private readonly footsteps = this.createAudio('/assets/audio/sfx/footsteps.mp3', false, defaultSfxVolume)
  private readonly demonRoar = this.createAudio('/assets/audio/sfx/demon-roar.mp3', false, defaultSfxVolume)
  private activeMusic: MusicTrack = 'ambient'
  private fadeTarget: MusicTrack | null = null
  private fadeAnimation = 0
  private hasRoaredThisRun = false
  private lastCriticalRoarAt = -roarCooldownMs
  private lastFootstepPhase = -1
  private fallbackFootstepAt = 0
  private preloaded = false
  private settings: GameSettings = defaultGameSettings

  preload(): void {
    if (this.preloaded) return
    this.preloaded = true
    for (const audio of this.allAudio()) {
      audio.preload = 'auto'
      audio.load()
    }
  }

  applySettings(settings: GameSettings): void {
    this.settings = settings
    this.footsteps.volume = this.sfxVolume()
    this.demonRoar.volume = this.sfxVolume()
    if (this.activeMusic === 'ambient') {
      this.ambient.volume = this.musicVolumeFor('ambient')
      this.chase.volume = 0
      return
    }
    this.chase.volume = this.musicVolumeFor('chase')
    this.ambient.volume = 0
  }

  playHomeAmbient(): void {
    this.preload()
    this.fadeTo('ambient')
    this.stopFootsteps()
  }

  startGameplay(): void {
    this.preload()
    this.hasRoaredThisRun = false
    this.lastCriticalRoarAt = -roarCooldownMs
    this.lastFootstepPhase = -1
    this.fallbackFootstepAt = performance.now()
    this.fadeTo('ambient')
    this.playRoarOnce()
  }

  endGameplay(): void {
    this.fadeTo('ambient')
    this.stopFootsteps()
  }

  updateGameplay(snapshot: RunnerAudioSnapshot): void {
    const isLiveRun = snapshot.runnerState !== 'dead' && snapshot.runnerState !== 'paused'
    if (!isLiveRun) {
      this.endGameplay()
      return
    }

    if (this.activeMusic === 'ambient' && snapshot.demonProximity >= chaseEnterProximity) this.fadeTo('chase')
    if (this.activeMusic === 'chase' && snapshot.demonProximity <= chaseExitProximity) this.fadeTo('ambient')

    if (snapshot.demonProximity >= criticalRoarProximity) this.playCriticalRoar()
    this.updateFootsteps(snapshot)
  }

  private createAudio(src: string, loop: boolean, volume: number): HTMLAudioElement {
    const audio = new Audio(src)
    audio.loop = loop
    audio.volume = volume
    audio.preload = 'auto'
    return audio
  }

  private allAudio(): HTMLAudioElement[] {
    return [this.ambient, this.chase, this.footsteps, this.demonRoar]
  }

  private fadeTo(track: MusicTrack): void {
    const targetAudio = track === 'ambient' ? this.ambient : this.chase
    const otherAudio = track === 'ambient' ? this.chase : this.ambient
    const targetVolume = this.musicVolumeFor(track)
    if (this.fadeTarget === track) {
      void this.tryPlay(targetAudio)
      return
    }
    const targetStartVolume = targetAudio.volume
    const otherStartVolume = otherAudio.volume
    this.activeMusic = track
    this.fadeTarget = track
    void this.tryPlay(targetAudio)
    if (otherStartVolume > 0.001) void this.tryPlay(otherAudio)
    window.cancelAnimationFrame(this.fadeAnimation)
    const startedAt = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / musicFadeMs)
      targetAudio.volume = this.mix(targetStartVolume, targetVolume, progress)
      otherAudio.volume = this.mix(otherStartVolume, 0, progress)
      if (progress < 1) {
        this.fadeAnimation = window.requestAnimationFrame(tick)
        return
      }
      if (otherAudio !== targetAudio) otherAudio.pause()
    }
    this.fadeAnimation = window.requestAnimationFrame(tick)
  }

  private updateFootsteps(snapshot: RunnerAudioSnapshot): void {
    const shouldStep = snapshot.runnerState === 'running' && snapshot.grounded
    if (!shouldStep) {
      this.stopFootsteps()
      return
    }

    if (snapshot.runAnimationPhase !== null) {
      this.playFootstepFromAnimationPhase(snapshot.runAnimationPhase)
      return
    }

    this.playFootstepFromSpeed(snapshot.forwardSpeed)
  }

  private playFootstepFromAnimationPhase(phase: number): void {
    const wrappedPhase = ((phase % 1) + 1) % 1
    const crossedLeftFoot = this.crossedPhase(this.lastFootstepPhase, wrappedPhase, 0.08)
    const crossedRightFoot = this.crossedPhase(this.lastFootstepPhase, wrappedPhase, 0.58)
    if (this.lastFootstepPhase < 0 || crossedLeftFoot || crossedRightFoot) this.playFootstep()
    this.lastFootstepPhase = wrappedPhase
  }

  private playFootstepFromSpeed(forwardSpeed: number): void {
    const now = performance.now()
    const intervalMs = Math.max(230, 470 - forwardSpeed * 22)
    if (now - this.fallbackFootstepAt < intervalMs) return
    this.fallbackFootstepAt = now
    this.playFootstep()
  }

  private crossedPhase(previous: number, current: number, marker: number): boolean {
    if (previous < 0) return false
    if (previous <= current) return previous < marker && current >= marker
    return marker > previous || marker <= current
  }

  private playFootstep(): void {
    if (!this.footsteps.paused && !this.footsteps.ended) return
    this.footsteps.volume = this.sfxVolume()
    this.footsteps.currentTime = 0
    void this.tryPlay(this.footsteps)
  }

  private stopFootsteps(): void {
    this.lastFootstepPhase = -1
    if (this.footsteps.paused) return
    this.footsteps.pause()
    this.footsteps.currentTime = 0
  }

  private playRoarOnce(): void {
    if (this.hasRoaredThisRun) return
    this.hasRoaredThisRun = true
    this.playRoar()
  }

  private playCriticalRoar(): void {
    const now = performance.now()
    if (now - this.lastCriticalRoarAt < roarCooldownMs) return
    this.lastCriticalRoarAt = now
    this.playRoar()
  }

  private playRoar(): void {
    if (!this.demonRoar.paused && !this.demonRoar.ended) return
    this.demonRoar.volume = this.sfxVolume()
    this.demonRoar.currentTime = 0
    void this.tryPlay(this.demonRoar)
  }

  private async tryPlay(audio: HTMLAudioElement): Promise<void> {
    try {
      await audio.play()
    } catch {
      // Browsers can block playback until the first user gesture; later calls retry.
    }
  }

  private mix(from: number, to: number, progress: number): number {
    return from + (to - from) * progress
  }

  private musicVolumeFor(track: MusicTrack): number {
    const base = track === 'ambient' ? defaultAmbientVolume : defaultChaseVolume
    return base * this.settings.masterVolume * this.settings.musicVolume
  }

  private sfxVolume(): number {
    return defaultSfxVolume * this.settings.masterVolume * this.settings.sfxVolume
  }
}

export const audioManager = new AudioManager()
