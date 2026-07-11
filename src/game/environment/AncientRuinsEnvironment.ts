import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder'
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder'
import { CreatePlane } from '@babylonjs/core/Meshes/Builders/planeBuilder'
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import type { AssetContainer } from '@babylonjs/core/assetContainer'
import type { Scene } from '@babylonjs/core/scene'
import type { EnvironmentModule, RunnerEnvironmentModuleId } from './EnvironmentCatalog'
import { runnerEnvironmentModules } from './EnvironmentCatalog'

interface Placement {
  asset: RunnerEnvironmentModuleId
  x: number
  y: number
  z: number
  rotationY?: number
  scale?: number
  scaleX?: number
  scaleY?: number
  scaleZ?: number
}

interface ChunkLayout {
  name: string
  placements: Placement[]
}

interface RunnerChunk {
  root: TransformNode
  length: number
}

const chunkLength = 24
const poolSize = 7

const layouts: ChunkLayout[] = [
  {
    name: 'arcane-courtyard',
    placements: [
      { asset: 'floor', x: -2.8, y: 0, z: 0, scale: 1.35 }, { asset: 'floor', x: 0, y: 0, z: 0, scale: 1.35 }, { asset: 'floor', x: 2.8, y: 0, z: 0, scale: 1.35 },
      { asset: 'wall', x: -5.1, y: 0, z: 3, rotationY: Math.PI / 2, scale: 1.1 }, { asset: 'wall', x: 5.1, y: 0, z: 3, rotationY: -Math.PI / 2, scale: 1.1 },
      { asset: 'arch', x: -4.8, y: 0, z: 13, rotationY: Math.PI / 2 }, { asset: 'arch', x: 4.8, y: 0, z: 13, rotationY: -Math.PI / 2 },
      { asset: 'windowWall', x: -5.15, y: 0, z: 18, rotationY: Math.PI / 2, scale: 1.1 }, { asset: 'balconyCross', x: -5.2, y: 2.8, z: 17, rotationY: Math.PI / 2, scale: 1.05 },
      { asset: 'debris', x: -5.8, y: 0.1, z: 8, rotationY: 0.45, scale: 1.35 }, { asset: 'vine', x: 5.1, y: 1.6, z: 16, rotationY: Math.PI / 2, scale: 1.15 },
    ],
  },
  {
    name: 'collapsed-facade',
    placements: [
      { asset: 'floor', x: -2.8, y: 0, z: 0, scale: 1.35 }, { asset: 'floor', x: 0, y: 0, z: 0, scale: 1.35 }, { asset: 'floor', x: 2.8, y: 0, z: 0, scale: 1.35 },
      { asset: 'corner', x: -5.1, y: 0, z: 4, rotationY: Math.PI / 2, scale: 1.1 }, { asset: 'corner', x: 5.1, y: 0, z: 15, rotationY: -Math.PI / 2, scale: 1.1, scaleX: -1 },
      { asset: 'doorway', x: -5, y: 0, z: 12, rotationY: Math.PI / 2, scale: 1.05 }, { asset: 'overhang', x: 5, y: 2.1, z: 7, rotationY: -Math.PI / 2, scale: 1.2 },
      { asset: 'roofBroken', x: 5.15, y: 3.9, z: 8, rotationY: -Math.PI / 2, scale: 1.25, scaleX: -1 }, { asset: 'chimney', x: 5.3, y: 3.6, z: 8, rotationY: 0.2, scale: 1.05 },
      { asset: 'crate', x: -5.5, y: 0.2, z: 18, rotationY: 0.35, scale: 1.2 }, { asset: 'debris', x: 5.7, y: 0.1, z: 19, rotationY: -0.65, scale: 1.5 },
    ],
  },
  {
    name: 'ruined-overlook',
    placements: [
      { asset: 'floor', x: -2.8, y: 0, z: 0, scale: 1.35 }, { asset: 'floor', x: 0, y: 0, z: 0, scale: 1.35 }, { asset: 'floor', x: 2.8, y: 0, z: 0, scale: 1.35 },
      { asset: 'stairs', x: -5.4, y: 0, z: 7, rotationY: Math.PI / 2, scale: 1.05 }, { asset: 'balcony', x: -5.3, y: 2.7, z: 7, rotationY: Math.PI / 2, scale: 1.15 },
      { asset: 'roof', x: 5.2, y: 3.8, z: 12, rotationY: -Math.PI / 2, scale: 1.3 }, { asset: 'roofFront', x: 5.2, y: 2.9, z: 10.8, rotationY: -Math.PI / 2, scale: 1.2 }, { asset: 'wall', x: 5, y: 0, z: 12, rotationY: -Math.PI / 2, scale: 1.05 },
      { asset: 'support', x: -5.3, y: 3.4, z: 16, rotationY: Math.PI / 2, scale: 1.35 }, { asset: 'fence', x: 5.4, y: 1.1, z: 18, rotationY: -Math.PI / 2, scale: 1.15 },
      { asset: 'arch', x: -4.8, y: 0, z: 18, rotationY: Math.PI / 2 }, { asset: 'debris', x: 5.8, y: 0.1, z: 4, rotationY: 0.7, scale: 1.2 },
    ],
  },
]

/**
 * Loads each selected kit module once, instances it into a fixed chunk pool, and
 * recycles chunk roots ahead of the player. It owns scenery only—never gameplay collision.
 */
export class AncientRuinsEnvironment {
  private readonly templates = new Map<RunnerEnvironmentModuleId, AssetContainer>()
  private readonly chunks: RunnerChunk[] = []
  private initialized = false
  private disposed = false
  private bannerMaterial: StandardMaterial | null = null
  private torchMaterial: StandardMaterial | null = null
  private statueMaterial: StandardMaterial | null = null
  private rubbleMaterial: StandardMaterial | null = null

  constructor(private readonly scene: Scene) {}

  async initialize(): Promise<void> {
    const entries = Object.entries(runnerEnvironmentModules) as Array<[RunnerEnvironmentModuleId, EnvironmentModule]>
    const results = await Promise.all(entries.map(async ([id, asset]) => [id, await SceneLoader.LoadAssetContainerAsync('', asset.file, this.scene)] as const))
    if (this.disposed) return
    for (const result of results) {
      this.templates.set(result[0], result[1])
    }
    this.buildPool()
    this.initialized = true
  }

  update(playerZ: number): void {
    if (!this.initialized) return
    for (const chunk of this.chunks) {
      if (playerZ - chunk.root.position.z > chunk.length * 1.5) chunk.root.position.z += chunk.length * poolSize
    }
  }

  dispose(): void {
    this.disposed = true
    for (const chunk of this.chunks) chunk.root.dispose(false, true)
    for (const container of this.templates.values()) container.dispose()
    this.chunks.length = 0
    this.templates.clear()
  }

  private buildPool(): void {
    for (let index = 0; index < poolSize; index += 1) {
      const chunk: RunnerChunk = { root: new TransformNode(`ruins-chunk-${index}`, this.scene), length: chunkLength }
      chunk.root.position.z = index * chunkLength
      this.populateChunk(chunk, layouts[index % layouts.length])
      this.populateScatter(chunk, index)
      this.populateProceduralDecorations(chunk, index)
      this.chunks.push(chunk)
    }
  }

  private populateChunk(chunk: RunnerChunk, layout: ChunkLayout): void {
    for (const [placementIndex, placement] of layout.placements.entries()) {
      const container = this.templates.get(placement.asset)
      if (!container) continue
      const placementRoot = new TransformNode(`${layout.name}-${placement.asset}-${placementIndex}`, this.scene)
      placementRoot.parent = chunk.root
      placementRoot.position.set(placement.x, placement.y, placement.z)
      placementRoot.rotation.y = placement.rotationY ?? 0
      const scale = placement.scale ?? 1
      placementRoot.scaling.set(scale * (placement.scaleX ?? 1), scale * (placement.scaleY ?? 1), scale * (placement.scaleZ ?? 1))
      // Babylon uses mesh instances when possible; geometry/material source data stays in the template container.
      const instance = container.instantiateModelsToScene((sourceName) => `${layout.name}-${sourceName}-${placementIndex}`, false, { doNotInstantiate: false })
      for (const rootNode of instance.rootNodes) rootNode.parent = placementRoot
    }
  }

  private populateScatter(chunk: RunnerChunk, seed: number): void {
    const assets: RunnerEnvironmentModuleId[] = ['debris', 'crate', 'vine', 'support', 'fence', 'wagon']
    for (let index = 0; index < 4; index += 1) {
      const side = this.random(seed * 19 + index * 7) > 0.5 ? 1 : -1
      const placement: Placement = {
        asset: assets[Math.floor(this.random(seed * 23 + index * 13) * assets.length)],
        x: side * (5.25 + this.random(seed + index) * 1.1),
        y: index === 2 ? 1.8 : 0.1,
        z: 2 + this.random(seed * 31 + index) * 19,
        rotationY: this.random(seed * 37 + index) * Math.PI * 2,
        scale: 0.75 + this.random(seed * 41 + index) * 0.6,
        scaleX: this.random(seed * 43 + index) > 0.5 ? -1 : 1,
      }
      this.populateChunk(chunk, { name: `scatter-${seed}-${index}`, placements: [placement] })
    }
  }

  private populateProceduralDecorations(chunk: RunnerChunk, seed: number): void {
    const side = seed % 2 === 0 ? -1 : 1
    this.createBanner(chunk.root, side * 5.7, 3.2, 4.5, side)
    this.createTorch(chunk.root, -side * 5.4, 1.15, 12.5)
    this.createTorch(chunk.root, side * 5.4, 1.15, 19)
    this.createStatue(chunk.root, side * 6.1, 1.2, 16.5, seed)
    this.createRubble(chunk.root, -side * 5.7, 0.15, 8.5, seed)
  }

  private createBanner(parent: TransformNode, x: number, y: number, z: number, side: number): void {
    const root = new TransformNode(`ruins-banner-${parent.name}`, this.scene)
    root.parent = parent
    root.position.set(x, y, z)
    root.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2
    const pole = CreateCylinder(`banner-pole-${parent.name}`, { height: 2.8, diameter: 0.08, tessellation: 6 }, this.scene)
    pole.parent = root
    pole.position.y = 0.7
    const cloth = CreatePlane(`banner-cloth-${parent.name}`, { width: 0.82, height: 1.2 }, this.scene)
    cloth.parent = root
    cloth.position.set(side * 0.42, 1.05, 0)
    cloth.rotation.y = Math.PI / 2
    cloth.material = this.getBannerMaterial()
  }

  private createTorch(parent: TransformNode, x: number, y: number, z: number): void {
    const root = new TransformNode(`ruins-torch-${parent.name}-${z}`, this.scene)
    root.parent = parent
    root.position.set(x, y, z)
    const shaft = CreateCylinder(`torch-shaft-${parent.name}-${z}`, { height: 1.8, diameter: 0.1, tessellation: 6 }, this.scene)
    shaft.parent = root
    shaft.position.y = -0.15
    const flame = CreateSphere(`torch-flame-${parent.name}-${z}`, { diameter: 0.34, segments: 6 }, this.scene)
    flame.parent = root
    flame.position.y = 0.86
    flame.material = this.getTorchMaterial()
  }

  private createStatue(parent: TransformNode, x: number, y: number, z: number, seed: number): void {
    const root = new TransformNode(`ruins-statue-${parent.name}`, this.scene)
    root.parent = parent
    root.position.set(x, y, z)
    root.rotation.y = this.random(seed * 53) * Math.PI * 2
    const base = CreateBox(`statue-base-${parent.name}`, { width: 0.9, height: 0.4, depth: 0.9 }, this.scene)
    base.parent = root
    const body = CreateBox(`statue-body-${parent.name}`, { width: 0.45, height: 1.5, depth: 0.4 }, this.scene)
    body.parent = root
    body.position.y = 0.92
    const head = CreateSphere(`statue-head-${parent.name}`, { diameter: 0.48, segments: 6 }, this.scene)
    head.parent = root
    head.position.y = 1.9
    const material = this.getStatueMaterial()
    base.material = material
    body.material = material
    head.material = material
  }

  private createRubble(parent: TransformNode, x: number, y: number, z: number, seed: number): void {
    for (let index = 0; index < 3; index += 1) {
      const block = CreateBox(`ruins-rubble-${parent.name}-${index}`, { width: 0.35 + index * 0.14, height: 0.24 + index * 0.09, depth: 0.32 + index * 0.11 }, this.scene)
      block.parent = parent
      block.position.set(x + (index - 1) * 0.34, y + index * 0.04, z + this.random(seed + index) * 0.55)
      block.rotation.set(this.random(seed * 7 + index) * 0.4, this.random(seed * 11 + index) * Math.PI, this.random(seed * 13 + index) * 0.4)
      block.material = this.getRubbleMaterial()
    }
  }

  private getBannerMaterial(): StandardMaterial {
    this.bannerMaterial ??= this.material('ruins-banner-material', new Color3(0.28, 0.03, 0.48), new Color3(0.13, 0.005, 0.24))
    return this.bannerMaterial
  }

  private getTorchMaterial(): StandardMaterial {
    this.torchMaterial ??= this.material('ruins-torch-material', new Color3(0.88, 0.15, 0.72), new Color3(0.85, 0.03, 0.55))
    return this.torchMaterial
  }

  private getStatueMaterial(): StandardMaterial {
    this.statueMaterial ??= this.material('ruins-statue-material', new Color3(0.22, 0.11, 0.31), new Color3(0.025, 0.005, 0.06))
    return this.statueMaterial
  }

  private getRubbleMaterial(): StandardMaterial {
    this.rubbleMaterial ??= this.material('ruins-rubble-material', new Color3(0.18, 0.08, 0.24), new Color3(0.015, 0.003, 0.04))
    return this.rubbleMaterial
  }

  private material(name: string, diffuse: Color3, emissive: Color3): StandardMaterial {
    const material = new StandardMaterial(name, this.scene)
    material.diffuseColor = diffuse
    material.emissiveColor = emissive
    return material
  }

  private random(seed: number): number {
    const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
    return value - Math.floor(value)
  }
}
