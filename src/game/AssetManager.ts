import { runnerEnvironmentModules } from './environment/EnvironmentCatalog'

export interface AssetLoadProgress {
  progress: number
  status: string
}

type ProgressListener = (progress: AssetLoadProgress) => void

const heroUrl = '/assets/characters/hero/magician.gltf'
const demonUrl = '/assets/characters/demon/Glub.gltf'
const audioUrls = [
  '/assets/audio/music/ambient.mp3',
  '/assets/audio/music/chase.mp3',
  '/assets/audio/sfx/footsteps.mp3',
  '/assets/audio/sfx/demon-roar.mp3',
]

class AssetManager {
  private preloadPromise: Promise<void> | null = null
  private ready = false
  private readonly verified = new Set<string>()

  isReady(): boolean {
    return this.ready
  }

  preload(listener?: ProgressListener): Promise<void> {
    if (this.ready) {
      listener?.({ progress: 100, status: 'Preparing Magic...' })
      return Promise.resolve()
    }
    if (this.preloadPromise) return this.preloadPromise

    this.preloadPromise = this.loadAll(listener).catch((error) => {
      this.preloadPromise = null
      throw error
    })
    return this.preloadPromise
  }

  private async loadAll(listener?: ProgressListener): Promise<void> {
    const gltfUrls = [heroUrl, demonUrl, ...Object.values(runnerEnvironmentModules).map((asset) => asset.file)]
    const dependencies = new Set<string>()
    let completed = 0
    const initialTotal = gltfUrls.length + audioUrls.length
    const report = (status: string, total = initialTotal) => {
      listener?.({ progress: Math.min(99, Math.round((completed / Math.max(1, total)) * 100)), status })
    }

    for (const url of gltfUrls) {
      report(url === heroUrl ? 'Loading Hero...' : url === demonUrl ? 'Loading Demon...' : 'Loading Environment...')
      const response = await this.fetchWithRetry(url)
      const document = await response.json() as { buffers?: Array<{ uri?: string }>; images?: Array<{ uri?: string }> }
      for (const dependency of [...(document.buffers ?? []), ...(document.images ?? [])]) {
        if (!dependency.uri || dependency.uri.startsWith('data:')) continue
        dependencies.add(new URL(dependency.uri, new URL(url, window.location.origin)).pathname)
      }
      completed += 1
    }

    const allDependencies = [...dependencies]
    const total = initialTotal + allDependencies.length
    for (const url of allDependencies) {
      report(url.match(/\.(png|jpe?g|webp)$/i) ? 'Loading Textures...' : 'Loading Materials...', total)
      await this.fetchWithRetry(url)
      completed += 1
    }
    for (const url of audioUrls) {
      report('Loading Audio...', total)
      await this.fetchWithRetry(url)
      completed += 1
    }

    this.ready = true
    listener?.({ progress: 100, status: 'Preparing Magic...' })
  }

  private async fetchWithRetry(url: string): Promise<Response> {
    if (this.verified.has(url)) return fetch(url)
    let lastError: unknown
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const response = await fetch(url, { cache: 'force-cache' })
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
        this.verified.add(url)
        return response
      } catch (error) {
        lastError = error
        if (attempt === 1) continue
      }
    }
    console.warn(`[AssetManager] Failed to load required asset after retry: ${url}`, lastError)
    throw new Error(`Required asset failed to load: ${url}`)
  }
}

export const assetManager = new AssetManager()
