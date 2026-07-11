import { Engine } from '@babylonjs/core/Engines/engine'
import type { AnimationGroup } from '@babylonjs/core/Animations/animationGroup'
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera'
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight'
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight'
import { PointLight } from '@babylonjs/core/Lights/pointLight'
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color'
import { Scalar } from '@babylonjs/core/Maths/math.scalar'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Texture } from '@babylonjs/core/Materials/Textures/texture'
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder'
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder'
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem'
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader'
import type { AssetContainer } from '@babylonjs/core/assetContainer'
import type { Mesh } from '@babylonjs/core/Meshes/mesh'
import { Scene } from '@babylonjs/core/scene'
import '@babylonjs/loaders/glTF/glTFFileLoader'
import '@babylonjs/loaders/glTF/2.0/glTFLoader'
import type { RunnerAudioSnapshot } from './AudioManager'
import type { GameSettings } from '../settings'
import { AncientRuinsEnvironment } from './environment/AncientRuinsEnvironment'
import { runnerEnvironmentModules, type RunnerEnvironmentModuleId } from './environment/EnvironmentCatalog'

export type RunnerState = 'running' | 'jumping' | 'sliding' | 'dead' | 'paused'
type Entity = number
type CollisionKind = 'ground' | 'obstacle'
type InputAction = 'left' | 'right' | 'jump' | 'slide'
type ObstacleClass = 'lane-change' | 'jump' | 'slide'
type CollectibleType = 'essence' | 'crystal' | 'relic'

interface ObstacleSpawn {
  obstacleClass: ObstacleClass
  lane: -1 | 0 | 1
  z: number
  patternName: string
  sequenceIndex: number
}

export interface HudSnapshot {
  distance: number
  score: number
  essence: number
  crystals: number
  relics: number
  demonProximity: number
  level: number
}

export interface DebugSnapshot {
  fps: number
  lane: number
  playerState: RunnerState
  distance: number
  isJumping: boolean
  isSliding: boolean
  camera: { x: number; y: number; z: number }
  activeObjects: number
}

export interface GameSceneOptions {
  debug?: boolean
  onDeath: () => void
  onHud: (hud: HudSnapshot) => void
  onDebug?: (snapshot: DebugSnapshot) => void
  onAudio?: (snapshot: RunnerAudioSnapshot) => void
  settings: GameSettings
}

interface TransformComponent {
  x: number
  y: number
  z: number
}

interface LaneComponent {
  current: -1 | 0 | 1
  target: -1 | 0 | 1
}

interface RunnerComponent {
  state: RunnerState
  stateBeforePause: Exclude<RunnerState, 'paused'>
  forwardSpeed: number
  verticalVelocity: number
  grounded: boolean
  coyoteTime: number
  jumpBuffer: number
  slideRemaining: number
  colliderHeight: number
}

interface ColliderComponent {
  kind: CollisionKind
  width: number
  height: number
  depth: number
}

interface RenderableComponent {
  root: TransformNode
  visualRoot?: TransformNode
}

interface ObstacleComponent {
  obstacleClass: ObstacleClass
  startZ: number
  patternName: string
  sequenceIndex: number
}

interface CollectibleComponent {
  type: CollectibleType
  value: number
  startZ: number
  collected: boolean
}

interface DemonComponent {
  speed: number
  proximity: number
  catchDistance: number
  catchTimer: number
}

interface GameWorld {
  nextEntity: number
  transforms: Map<Entity, TransformComponent>
  lanes: Map<Entity, LaneComponent>
  runners: Map<Entity, RunnerComponent>
  colliders: Map<Entity, ColliderComponent>
  renderables: Map<Entity, RenderableComponent>
  obstacles: Map<Entity, ObstacleComponent>
  collectibles: Map<Entity, CollectibleComponent>
  demons: Map<Entity, DemonComponent>
}

const fixedStep = 1 / 60
const lanePositions = [-2.2, 0, 2.2] as const
const gravity = 28
const jumpVelocity = 10.8
const coyoteWindow = 0.12
const jumpBufferWindow = 0.14
const slideDuration = 0.7
const heroVisualScale = 0.92
const obstaclePoolSize = 18
const collectiblePoolSize = 10
const obstacleStartZ = 26
const collectibleStartZ = 18
const maxDemonStartDistance = 4.9
const demonPresentationSideOffset = -1.45
const particlePixel =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAHUlEQVR42mP8z8DwnwEJMDGgAcYB6YAEgQEAO6gDDZfvTq8AAAAASUVORK5CYII='

const obstaclePatterns: Array<{
  name: string
  minLevel: number
  weight: number
  spacing: number
  entries: Array<{ obstacleClass: ObstacleClass; lane: -1 | 0 | 1; offset: number }>
}> = [
  { name: 'Jump', minLevel: 1, weight: 5, spacing: 24, entries: [{ obstacleClass: 'jump', lane: 0, offset: 0 }] },
  { name: 'Lane Change', minLevel: 1, weight: 5, spacing: 24, entries: [{ obstacleClass: 'lane-change', lane: 0, offset: 0 }] },
  { name: 'Slide', minLevel: 1, weight: 4, spacing: 25, entries: [{ obstacleClass: 'slide', lane: 1, offset: 0 }] },
  {
    name: 'Jump -> Jump',
    minLevel: 2,
    weight: 3,
    spacing: 34,
    entries: [
      { obstacleClass: 'jump', lane: -1, offset: 0 },
      { obstacleClass: 'jump', lane: 1, offset: 10 },
    ],
  },
  {
    name: 'Slide -> Lane',
    minLevel: 2,
    weight: 3,
    spacing: 34,
    entries: [
      { obstacleClass: 'slide', lane: 0, offset: 0 },
      { obstacleClass: 'lane-change', lane: 1, offset: 10 },
    ],
  },
  {
    name: 'Lane -> Jump',
    minLevel: 2,
    weight: 4,
    spacing: 33,
    entries: [
      { obstacleClass: 'lane-change', lane: -1, offset: 0 },
      { obstacleClass: 'jump', lane: 0, offset: 10 },
    ],
  },
  {
    name: 'Double Lane',
    minLevel: 3,
    weight: 3,
    spacing: 35,
    entries: [
      { obstacleClass: 'lane-change', lane: -1, offset: 0 },
      { obstacleClass: 'lane-change', lane: 1, offset: 0 },
    ],
  },
  {
    name: 'Fake Safe Lane',
    minLevel: 3,
    weight: 2,
    spacing: 36,
    entries: [
      { obstacleClass: 'lane-change', lane: 0, offset: 0 },
      { obstacleClass: 'jump', lane: -1, offset: 11 },
    ],
  },
  {
    name: 'Alternating Left/Right',
    minLevel: 4,
    weight: 2,
    spacing: 42,
    entries: [
      { obstacleClass: 'lane-change', lane: -1, offset: 0 },
      { obstacleClass: 'slide', lane: 1, offset: 12 },
      { obstacleClass: 'jump', lane: -1, offset: 24 },
    ],
  },
]

class AnimationController {
  private active: AnimationGroup | null = null
  private state: 'idle' | 'run' | 'roll' | 'death' | 'paused' = 'idle'

  constructor(private readonly groups: AnimationGroup[]) {
    for (const group of groups) {
      group.enableBlending = true
      group.blendingSpeed = 0.08
      group.stop()
    }
  }

  idle(): void {
    this.play(5, 'idle', true)
  }

  run(): void {
    this.play(17, 'run', true)
  }

  roll(): void {
    this.play(16, 'roll', true)
  }

  death(): void {
    this.play(1, 'death', false)
  }

  pause(): void {
    this.idle()
  }

  resumeFor(runnerState: Exclude<RunnerState, 'paused'>): void {
    if (runnerState === 'dead') {
      this.death()
      return
    }
    if (runnerState === 'sliding') {
      this.roll()
      return
    }
    this.run()
  }

  sync(runnerState: RunnerState): void {
    if (runnerState === 'paused') {
      this.pause()
      return
    }
    if (runnerState === 'dead') {
      this.death()
      return
    }
    if (runnerState === 'sliding') {
      this.roll()
      return
    }
    // Jump is code-driven; the run cycle deliberately continues in the air.
    this.run()
  }

  runPhase(): number | null {
    const runGroup = this.groups[17]
    if (!runGroup || this.active !== runGroup || !runGroup.isPlaying) return null
    const frameSpan = runGroup.to - runGroup.from
    if (frameSpan <= 0) return null
    return (((runGroup.getCurrentFrame() - runGroup.from) % frameSpan) + frameSpan) / frameSpan
  }

  dispose(): void {
    for (const group of this.groups) group.stop()
    this.active = null
  }

  private play(index: number, state: 'idle' | 'run' | 'roll' | 'death', loop: boolean): void {
    const next = this.groups[index]
    if (!next || (this.active === next && this.state === state)) return
    this.active?.stop()
    this.active = next
    this.state = state
    next.start(loop, 1)
  }
}

class DemonAnimationController {
  private active: AnimationGroup | null = null
  private readonly runIndex = 2
  private readonly idleIndex: number
  private readonly attackIndex: number
  private readonly deathIndex: number

  constructor(private readonly groups: AnimationGroup[]) {
    for (const group of groups) {
      group.enableBlending = true
      group.blendingSpeed = 0.07
      group.stop()
    }
    this.idleIndex = this.findIndex(/idle/i, this.runIndex)
    this.attackIndex = this.findIndex(/attack|headbutt|punch/i, this.runIndex)
    this.deathIndex = this.findIndex(/death/i, this.runIndex)
  }

  chase(): void {
    this.play(this.runIndex, true)
  }

  idle(): void {
    this.play(this.idleIndex, true)
  }

  attack(): void {
    this.play(this.attackIndex, false)
  }

  death(): void {
    this.play(this.deathIndex, false)
  }

  dispose(): void {
    for (const group of this.groups) group.stop()
    this.active = null
  }

  private findIndex(pattern: RegExp, fallback: number): number {
    const index = this.groups.findIndex((group) => pattern.test(group.name))
    return index >= 0 ? index : fallback
  }

  private play(index: number, loop: boolean): void {
    const next = this.groups[index] ?? this.groups[this.runIndex] ?? this.groups[0]
    if (!next || this.active === next) return
    this.active?.stop()
    this.active = next
    next.start(loop, 1)
  }
}

class InputController {
  private readonly actions: Array<{ action: InputAction; createdAt: number }> = []
  private readonly lastActionAt = new Map<InputAction, number>()
  private pointerStart: { x: number; y: number } | null = null

  constructor(private readonly element: HTMLCanvasElement, private readonly swipeThreshold: () => number) {
    window.addEventListener('keydown', this.onKeyDown, { passive: false })
    element.addEventListener('pointerdown', this.onPointerDown, { passive: true })
    element.addEventListener('pointerup', this.onPointerUp, { passive: true })
  }

  consume(): InputAction[] {
    const now = performance.now()
    const next = this.actions.splice(0, this.actions.length)
    return next.filter((entry) => now - entry.createdAt < 180).map((entry) => entry.action)
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown)
    this.element.removeEventListener('pointerdown', this.onPointerDown)
    this.element.removeEventListener('pointerup', this.onPointerUp)
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const actions: Record<string, InputAction | undefined> = {
      ArrowLeft: 'left',
      a: 'left',
      A: 'left',
      ArrowRight: 'right',
      d: 'right',
      D: 'right',
      ArrowUp: 'jump',
      w: 'jump',
      W: 'jump',
      ' ': 'jump',
      ArrowDown: 'slide',
      s: 'slide',
      S: 'slide',
      Shift: 'slide',
    }
    const action = actions[event.key]
    if (!action || event.repeat) return
    event.preventDefault()
    this.enqueue(action)
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.pointerStart = { x: event.clientX, y: event.clientY }
  }

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (!this.pointerStart) return
    const deltaX = event.clientX - this.pointerStart.x
    const deltaY = event.clientY - this.pointerStart.y
    this.pointerStart = null
    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < this.swipeThreshold()) return
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      this.enqueue(deltaX < 0 ? 'left' : 'right')
      return
    }
    this.enqueue(deltaY < 0 ? 'jump' : 'slide')
  }

  private enqueue(action: InputAction): void {
    const now = performance.now()
    if (now - (this.lastActionAt.get(action) ?? 0) < 90) return
    this.lastActionAt.set(action, now)
    this.actions.push({ action, createdAt: now })
  }
}

export class GameScene {
  private readonly engine: Engine
  private readonly scene: Scene
  private readonly camera: UniversalCamera
  private readonly world: GameWorld
  private readonly input: InputController
  private readonly playerEntity: Entity
  private readonly demonEntity: Entity
  private readonly environment: AncientRuinsEnvironment
  private readonly environmentTemplates = new Map<RunnerEnvironmentModuleId, AssetContainer>()
  private readonly environmentTemplatePromises = new Map<RunnerEnvironmentModuleId, Promise<AssetContainer | null>>()
  private readonly particleSystems: ParticleSystem[] = []
  private readonly collectEffectPool: ParticleSystem[] = []
  private readonly collectibleSources = new Map<CollectibleType, Mesh>()
  private readonly obstacleMaterials = new Map<string, StandardMaterial>()
  private heroAnimation: AnimationController | null = null
  private demonAnimation: DemonAnimationController | null = null
  private runningDust: ParticleSystem | null = null
  private landingDust: ParticleSystem | null = null
  private magicTrail: ParticleSystem | null = null
  private demonSmoke: ParticleSystem | null = null
  private purpleFog: ParticleSystem | null = null
  private ambientRunes: ParticleSystem | null = null
  private catchEffect: ParticleSystem | null = null
  private heroPulse: Mesh | null = null
  private torchGlow: PointLight | null = null
  private crystalGlow: PointLight | null = null
  private demonAuraLight: PointLight | null = null
  private collectEffectIndex = 0
  private obstacleCursor = 0
  private nextObstacleZ = obstacleStartZ
  private readonly pendingObstacleSpawns: ObstacleSpawn[] = []
  private collectibleCursor = 0
  private nextCollectibleZ = collectibleStartZ
  private accumulator = 0
  private hudElapsed = 0
  private debugElapsed = 0
  private score = 0
  private essence = 0
  private crystals = 0
  private relics = 0
  private level = 1
  private wasGrounded = true
  private presentationTime = 0
  private landingImpulse = 0
  private impactShake = 0
  private settings: GameSettings
  private disposed = false

  constructor(canvas: HTMLCanvasElement, private readonly options: GameSceneOptions) {
    this.settings = options.settings
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false })
    this.scene = new Scene(this.engine)
    this.world = this.createWorld()
    this.camera = this.createCamera()
    this.configureScene()
    this.playerEntity = this.createPlayer()
    this.demonEntity = this.createDemon()
    this.createGameplayWorld()
    this.environment = new AncientRuinsEnvironment(this.scene)
    void this.environment.initialize()
    this.createVfxPool()
    this.input = new InputController(canvas, () => 32 / this.settings.swipeSensitivity)
    window.addEventListener('resize', this.resize)
  }

  start(): void {
    this.engine.runRenderLoop(this.renderFrame)
  }

  pause(): void {
    const runner = this.runner()
    if (runner.state === 'dead' || runner.state === 'paused') return
    runner.stateBeforePause = runner.state
    runner.state = 'paused'
    this.demonAnimation?.idle()
    this.stopContinuousVfx()
  }

  resume(): void {
    const runner = this.runner()
    if (runner.state !== 'paused') return
    runner.state = runner.stateBeforePause
    this.heroAnimation?.resumeFor(runner.state)
    this.demonAnimation?.chase()
  }

  updateSettings(settings: GameSettings): void {
    this.settings = settings
  }

  restart(): void {
    const transform = this.transform(this.playerEntity)
    const lane = this.lane(this.playerEntity)
    const runner = this.runner()
    transform.x = 0
    transform.y = 0
    transform.z = 0
    lane.current = 0
    lane.target = 0
    runner.state = 'running'
    runner.stateBeforePause = 'running'
    runner.verticalVelocity = 0
    runner.grounded = true
    runner.coyoteTime = coyoteWindow
    runner.jumpBuffer = 0
    runner.slideRemaining = 0
    runner.colliderHeight = 2
    this.heroAnimation?.sync(runner.state)
    this.score = 0
    this.essence = 0
    this.crystals = 0
    this.relics = 0
    this.level = 1
    this.wasGrounded = true
    this.presentationTime = 0
    this.landingImpulse = 0
    this.impactShake = 0
    this.resetDemon()
    this.resetPooledTrackObjects()
    this.accumulator = 0
    this.syncRenderables()
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    window.removeEventListener('resize', this.resize)
    this.input.dispose()
    this.heroAnimation?.dispose()
    this.demonAnimation?.dispose()
    this.environment.dispose()
    for (const system of this.particleSystems) system.dispose()
    for (const source of this.collectibleSources.values()) source.dispose()
    for (const container of this.environmentTemplates.values()) container.dispose()
    this.engine.stopRenderLoop(this.renderFrame)
    this.scene.dispose()
    this.engine.dispose()
  }

  private readonly resize = (): void => this.engine.resize()

  private readonly renderFrame = (): void => {
    if (this.disposed) return
    const deltaSeconds = Math.min(this.engine.getDeltaTime() / 1000, 0.1)
    this.presentationTime += deltaSeconds
    this.accumulator = Math.min(this.accumulator + deltaSeconds, fixedStep * 5)
    while (this.accumulator >= fixedStep) {
      this.step(fixedStep)
      this.accumulator -= fixedStep
    }
    this.updateCamera(deltaSeconds)
    this.syncRenderables()
    this.publishUi(deltaSeconds)
    this.publishAudio()
    this.scene.render()
  }

  private step(deltaSeconds: number): void {
    const runner = this.runner()
    if (runner.state === 'paused' || runner.state === 'dead') return
    for (const action of this.input.consume()) this.applyInput(action)
    this.updateDifficultySystem(deltaSeconds)
    this.updateRunnerSystem(deltaSeconds)
    this.updateDemonSystem(deltaSeconds)
    this.environment.update(this.transform(this.playerEntity).z)
    this.updatePooledTrackObjects()
    this.updateCollisionSystem()
    this.updateCollectibleSystem()
    this.updateVfx()
  }

  private applyInput(action: InputAction): void {
    const runner = this.runner()
    if (runner.state === 'dead' || runner.state === 'paused') return
    const lane = this.lane(this.playerEntity)
    if (action === 'left') {
      lane.target = Math.max(-1, lane.target - 1) as -1 | 0 | 1
      return
    }
    if (action === 'right') {
      lane.target = Math.min(1, lane.target + 1) as -1 | 0 | 1
      return
    }
    if (action === 'jump') {
      runner.jumpBuffer = jumpBufferWindow
      return
    }
    if (action === 'slide' && runner.state === 'running') {
      runner.state = 'sliding'
      runner.slideRemaining = slideDuration
      runner.colliderHeight = 1.05
      this.collider(this.playerEntity).height = runner.colliderHeight
    }
  }

  private updateRunnerSystem(deltaSeconds: number): void {
    const transform = this.transform(this.playerEntity)
    const lane = this.lane(this.playerEntity)
    const runner = this.runner()
    transform.z += runner.forwardSpeed * deltaSeconds
    transform.x = Scalar.Lerp(transform.x, lanePositions[lane.target + 1], Math.min(1, deltaSeconds * 14))
    if (Math.abs(transform.x - lanePositions[lane.target + 1]) < 0.015) {
      transform.x = lanePositions[lane.target + 1]
      lane.current = lane.target
    }

    runner.jumpBuffer = Math.max(0, runner.jumpBuffer - deltaSeconds)
    if (runner.state === 'running') {
      runner.coyoteTime = coyoteWindow
      if (runner.jumpBuffer > 0 && (runner.grounded || runner.coyoteTime > 0)) this.beginJump()
    }
    if (runner.state === 'jumping') {
      runner.coyoteTime = Math.max(0, runner.coyoteTime - deltaSeconds)
      runner.verticalVelocity -= gravity * deltaSeconds
      transform.y += runner.verticalVelocity * deltaSeconds
      if (transform.y <= 0) {
        transform.y = 0
        runner.verticalVelocity = 0
        runner.grounded = true
        runner.state = 'running'
        runner.coyoteTime = coyoteWindow
        if (runner.jumpBuffer > 0) this.beginJump()
      }
    }
    if (runner.state === 'sliding') {
      runner.slideRemaining -= deltaSeconds
      if (runner.slideRemaining <= 0) {
        runner.state = 'running'
        runner.colliderHeight = 2
        this.collider(this.playerEntity).height = runner.colliderHeight
      }
    }
  }

  private beginJump(): void {
    const runner = this.runner()
    runner.state = 'jumping'
    runner.grounded = false
    runner.verticalVelocity = jumpVelocity
    runner.jumpBuffer = 0
  }

  private updateDifficultySystem(deltaSeconds: number): void {
    const player = this.transform(this.playerEntity)
    const runner = this.runner()
    this.level = this.difficultyLevelForDistance(player.z)
    const targetSpeed = 6 + Math.min(3.2, (this.level - 1) * 0.28 + player.z / 900)
    runner.forwardSpeed = Scalar.Lerp(runner.forwardSpeed, targetSpeed, Math.min(1, deltaSeconds * 0.7))
  }

  private updateDemonSystem(deltaSeconds: number): void {
    const demon = this.world.demons.get(this.demonEntity)
    if (!demon) return
    const player = this.transform(this.playerEntity)
    const demonTransform = this.transform(this.demonEntity)
    const runner = this.runner()
    const distanceBehind = Math.max(0, player.z - demonTransform.z)
    demon.proximity = Scalar.Clamp(1 - (distanceBehind - demon.catchDistance) / (maxDemonStartDistance - demon.catchDistance), 0, 1)
    const levelPush = Math.min(1.9, (this.level - 1) * 0.16)
    const chaseSpeed = runner.forwardSpeed - 0.12 + levelPush + demon.proximity * 0.35
    demon.speed = Scalar.Lerp(demon.speed, chaseSpeed, Math.min(1, deltaSeconds * 0.9))
    demonTransform.z = Math.min(player.z - 1.45, demonTransform.z + demon.speed * deltaSeconds)
    const closeCentering = Scalar.Lerp(demonPresentationSideOffset, -0.35, demon.proximity)
    demonTransform.x = Scalar.Lerp(demonTransform.x, player.x * 0.42 + closeCentering, Math.min(1, deltaSeconds * 3.2))
    demonTransform.y = -0.08 + Math.sin(performance.now() * 0.004) * 0.035

    if (player.z - demonTransform.z <= demon.catchDistance) {
      demon.catchTimer += deltaSeconds
      demon.proximity = 1
      this.demonAnimation?.attack()
      if (demon.catchTimer >= 0.55) this.killRunner()
      return
    }
    demon.catchTimer = 0
    this.demonAnimation?.chase()
  }

  private updateCollisionSystem(): void {
    const playerTransform = this.transform(this.playerEntity)
    const playerCollider = this.collider(this.playerEntity)
    for (const [entity, collider] of this.world.colliders) {
      if (entity === this.playerEntity || collider.kind === 'ground') continue
      const obstacleTransform = this.transform(entity)
      if (!this.intersects(playerTransform, playerCollider, obstacleTransform, collider)) continue
      this.killRunner()
      return
    }
  }

  private updatePooledTrackObjects(): void {
    const playerZ = this.transform(this.playerEntity).z
    for (const entity of this.world.obstacles.keys()) {
      const transform = this.transform(entity)
      if (playerZ - transform.z > 10) this.configureObstacleFromSpawn(entity, this.nextObstacleSpawn())
    }
    for (const [entity, collectible] of this.world.collectibles) {
      const transform = this.transform(entity)
      if (playerZ - transform.z <= 10) continue
      this.configureCollectible(entity, this.nextCollectibleSpawn())
      collectible.collected = false
      this.world.renderables.get(entity)?.root.setEnabled(true)
    }
  }

  private resetPooledTrackObjects(): void {
    this.obstacleCursor = 0
    this.nextObstacleZ = obstacleStartZ
    this.pendingObstacleSpawns.length = 0
    for (const entity of this.world.obstacles.keys()) this.configureObstacleFromSpawn(entity, this.nextObstacleSpawn())
    this.collectibleCursor = 0
    this.nextCollectibleZ = collectibleStartZ
    for (const entity of this.world.collectibles.keys()) {
      this.configureCollectible(entity, this.nextCollectibleSpawn())
      const collectible = this.world.collectibles.get(entity)
      if (!collectible) continue
      collectible.collected = false
      this.world.renderables.get(entity)?.root.setEnabled(true)
    }
  }

  private nextObstacleSpawn(): ObstacleSpawn {
    if (this.pendingObstacleSpawns.length === 0) {
      const level = this.difficultyLevelForDistance(this.nextObstacleZ)
      const pattern = this.selectObstaclePattern(this.obstacleCursor, level)
      const densityTrim = Math.min(7, (level - 1) * 0.8)
      for (const entry of pattern.entries) {
        this.pendingObstacleSpawns.push({
          obstacleClass: entry.obstacleClass,
          lane: entry.lane,
          z: this.nextObstacleZ + entry.offset,
          patternName: pattern.name,
          sequenceIndex: this.obstacleCursor,
        })
      }
      this.nextObstacleZ += Math.max(18, pattern.spacing - densityTrim)
      this.obstacleCursor += 1
    }
    const spawn = this.pendingObstacleSpawns.shift()
    if (!spawn) throw new Error('Missing obstacle spawn')
    return spawn
  }

  private selectObstaclePattern(index: number, level: number): typeof obstaclePatterns[number] {
    const available = obstaclePatterns.filter((pattern) => pattern.minLevel <= level)
    const totalWeight = available.reduce((sum, pattern) => sum + pattern.weight, 0)
    let roll = this.random(index * 17 + level * 31) * totalWeight
    for (const pattern of available) {
      roll -= pattern.weight
      if (roll <= 0) return pattern
    }
    return available[available.length - 1] ?? obstaclePatterns[0]
  }

  private nextCollectibleSpawn(): { type: CollectibleType; lane: -1 | 0 | 1; z: number } {
    const level = this.difficultyLevelForDistance(this.nextCollectibleZ)
    const lane = ([-1, 0, 1] as const)[Math.floor(this.random(this.collectibleCursor * 11 + 3) * 3)]
    const roll = this.random(this.collectibleCursor * 13 + level)
    const type: CollectibleType = roll > 0.92 ? 'relic' : roll > 0.68 ? 'crystal' : 'essence'
    const spawn = { type, lane, z: this.nextCollectibleZ }
    this.nextCollectibleZ += Math.max(9, 17 - level * 0.55)
    this.collectibleCursor += 1
    return spawn
  }

  private updateCollectibleSystem(): void {
    const playerTransform = this.transform(this.playerEntity)
    const playerCollider = this.collider(this.playerEntity)
    const collectibleCollider: ColliderComponent = { kind: 'obstacle', width: 0.78, height: 0.9, depth: 0.78 }
    for (const [entity, collectible] of this.world.collectibles) {
      if (collectible.collected) continue
      const collectibleTransform = this.transform(entity)
      if (!this.intersects(playerTransform, playerCollider, collectibleTransform, collectibleCollider)) continue
      collectible.collected = true
      this.world.renderables.get(entity)?.root.setEnabled(false)
      this.score += collectible.value
      if (collectible.type === 'essence') this.essence += 1
      if (collectible.type === 'crystal') this.crystals += 1
      if (collectible.type === 'relic') this.relics += 1
      this.triggerCollectEffect(collectibleTransform)
    }
  }

  private updateVfx(): void {
    const runner = this.runner()
    const player = this.transform(this.playerEntity)
    const demon = this.world.demons.get(this.demonEntity)
    const demonTransform = this.transform(this.demonEntity)
    const proximity = demon?.proximity ?? 0
    const grounded = runner.grounded && player.y <= 0.01
    const isLive = runner.state !== 'dead' && runner.state !== 'paused'
    const bloomFactor = this.settings.reducedBloom ? 0.56 : 1
    const time = performance.now() * 0.001
    this.scene.fogDensity = (0.011 + proximity * 0.014) * (this.settings.reducedBloom ? 0.8 : 1)
    if (this.torchGlow) this.torchGlow.intensity = (0.55 + Math.sin(time * 8.5) * 0.08 + Math.sin(time * 17.5) * 0.035) * bloomFactor
    if (this.crystalGlow) this.crystalGlow.intensity = (0.44 + Math.sin(time * 2.4) * 0.08) * bloomFactor
    if (this.demonAuraLight) this.demonAuraLight.intensity = isLive ? (0.28 + proximity * 0.65 + Math.sin(time * 5.2) * 0.08) * bloomFactor : 0
    if (this.runningDust) {
      this.runningDust.emitter = new Vector3(player.x, 0.08, player.z - 0.72)
      this.runningDust.emitRate = isLive && grounded ? (42 + this.level * 2.3) * (this.settings.reducedBloom ? 0.72 : 1) : 0
    }
    if (this.magicTrail) {
      this.magicTrail.emitter = new Vector3(player.x, player.y + 1.05, player.z - 0.48)
      this.magicTrail.emitRate = isLive ? (28 + proximity * 28) * bloomFactor : 0
    }
    if (this.demonSmoke) {
      this.demonSmoke.emitter = new Vector3(demonTransform.x, demonTransform.y + 0.78, demonTransform.z - 0.25)
      this.demonSmoke.emitRate = isLive ? 10 + proximity * 30 : 0
    }
    if (this.purpleFog) {
      this.purpleFog.emitter = new Vector3(player.x, 1.1, player.z - 4)
      this.purpleFog.emitRate = isLive ? (3 + proximity * 16) * (this.settings.reducedBloom ? 0.6 : 1) : 0
    }
    if (this.ambientRunes) {
      this.ambientRunes.emitter = new Vector3(player.x, 2.4, player.z + 6)
      this.ambientRunes.emitRate = isLive ? (10 + this.level * 1.35) * bloomFactor : 0
    }
    if (grounded && !this.wasGrounded) {
      this.landingImpulse = 1
      this.triggerLandingDust(player)
    }
    this.wasGrounded = grounded
  }

  private stopContinuousVfx(): void {
    if (this.runningDust) this.runningDust.emitRate = 0
    if (this.magicTrail) this.magicTrail.emitRate = 0
    if (this.demonSmoke) this.demonSmoke.emitRate = 0
    if (this.purpleFog) this.purpleFog.emitRate = 0
    if (this.ambientRunes) this.ambientRunes.emitRate = 0
    if (this.catchEffect) this.catchEffect.emitRate = 0
  }

  private triggerLandingDust(transform: TransformComponent): void {
    if (!this.landingDust) return
    this.landingDust.emitter = new Vector3(transform.x, 0.08, transform.z - 0.15)
    this.landingDust.manualEmitCount = this.settings.reducedBloom ? 22 : 38
    this.landingDust.start()
  }

  private triggerCollectEffect(transform: TransformComponent): void {
    if (this.collectEffectPool.length === 0) return
    const effect = this.collectEffectPool[this.collectEffectIndex % this.collectEffectPool.length]
    this.collectEffectIndex += 1
    effect.stop()
    effect.emitter = new Vector3(transform.x, transform.y, transform.z)
    effect.manualEmitCount = this.settings.reducedBloom ? 20 : 34
    effect.start()
  }

  private triggerCatchEffect(): void {
    if (!this.catchEffect) return
    const player = this.transform(this.playerEntity)
    this.catchEffect.stop()
    this.catchEffect.emitter = new Vector3(player.x, player.y + 1.1, player.z - 0.45)
    this.catchEffect.manualEmitCount = this.settings.reducedBloom ? 28 : 52
    this.catchEffect.start()
  }

  private intersects(
    player: TransformComponent,
    playerCollider: ColliderComponent,
    obstacle: TransformComponent,
    obstacleCollider: ColliderComponent,
  ): boolean {
    const overlapsX = Math.abs(player.x - obstacle.x) < (playerCollider.width + obstacleCollider.width) / 2
    const overlapsZ = Math.abs(player.z - obstacle.z) < (playerCollider.depth + obstacleCollider.depth) / 2
    const playerCenterY = player.y + playerCollider.height / 2
    const obstacleCenterY = obstacle.y
    const overlapsY = Math.abs(playerCenterY - obstacleCenterY) < (playerCollider.height + obstacleCollider.height) / 2
    return overlapsX && overlapsY && overlapsZ
  }

  private killRunner(): void {
    const runner = this.runner()
    if (runner.state === 'dead') return
    runner.state = 'dead'
    this.impactShake = 1
    this.triggerCatchEffect()
    this.stopContinuousVfx()
    this.heroAnimation?.sync(runner.state)
    this.options.onDeath()
  }

  private updateCamera(deltaSeconds: number): void {
    const player = this.transform(this.playerEntity)
    const lane = this.lane(this.playerEntity)
    const runner = this.runner()
    const demon = this.world.demons.get(this.demonEntity)
    const proximity = demon?.proximity ?? 0
    const time = performance.now() * 0.001
    const speedPush = Math.max(0, runner.forwardSpeed - 6)
    const shakeScale = this.settings.reducedScreenShake ? 0.25 : 1
    this.landingImpulse = Math.max(0, this.landingImpulse - deltaSeconds * 2.8)
    this.impactShake = Math.max(0, this.impactShake - deltaSeconds * 3.6)
    const anticipationX = lanePositions[lane.target + 1] * 0.22
    const demonShake = proximity > 0.82 ? (proximity - 0.82) * 0.44 : 0
    const shake = (demonShake + this.impactShake * 0.28) * shakeScale
    const shakeX = Math.sin(time * 43) * shake
    const shakeY = Math.cos(time * 37) * shake * 0.55
    const landingLift = this.landingImpulse * 0.18 * shakeScale
    const jumpCatchUp = runner.state === 'jumping' ? 0.22 : 0
    const desiredPosition = new Vector3(player.x * 0.52 + anticipationX + shakeX, player.y + 4.08 + shakeY + landingLift, player.z - 8.72 - speedPush * 0.13 + jumpCatchUp)
    this.camera.position = Vector3.Lerp(this.camera.position, desiredPosition, Math.min(1, deltaSeconds * 6.6))
    this.camera.setTarget(new Vector3(player.x * 0.42 + anticipationX * 0.34, player.y + 1.3 + this.landingImpulse * 0.08, player.z + 6.25 + speedPush * 0.28))
    const laneTilt = (lane.target - lane.current) * -0.085 + proximity * 0.01 * Math.sin(time * 8)
    this.camera.rotation.z = Scalar.Lerp(this.camera.rotation.z, laneTilt, Math.min(1, deltaSeconds * 8.2))
    const targetFov = 0.88 + Math.min(runner.forwardSpeed / 76, 0.095) + proximity * 0.018
    this.camera.fov = Scalar.Lerp(this.camera.fov, targetFov, Math.min(1, deltaSeconds * 3.6))
  }

  private syncRenderables(): void {
    for (const [entity, renderable] of this.world.renderables) {
      const transform = this.transform(entity)
      renderable.root.position.set(transform.x, transform.y, transform.z)
      if (entity === this.playerEntity) {
        const runner = this.runner()
        const visualRoot = renderable.visualRoot
        if (visualRoot) {
          const pulse = 1 + Math.sin(this.presentationTime * 6.2) * 0.04
          visualRoot.scaling.set(
            heroVisualScale,
            heroVisualScale * (runner.state === 'sliding' ? 0.55 : 1),
            heroVisualScale,
          )
          if (this.heroPulse) {
            const bloomFactor = this.settings.reducedBloom ? 0.48 : 1
            this.heroPulse.scaling.setAll((1.05 + Math.sin(this.presentationTime * 5.6) * 0.18) * pulse)
            this.heroPulse.visibility = runner.state === 'dead' ? 0 : 0.38 * bloomFactor
          }
        }
        this.heroAnimation?.sync(runner.state)
        continue
      }
      if (entity === this.demonEntity && renderable.visualRoot) {
        const proximity = this.world.demons.get(entity)?.proximity ?? 0
        const spawnEase = Math.min(1, this.presentationTime / 1.15)
        const auraPulse = Math.sin(this.presentationTime * 5.4) * 0.025 * proximity
        renderable.visualRoot.scaling.setAll(0.62 * (0.82 + spawnEase * 0.18 + auraPulse))
        continue
      }
      const collectible = this.world.collectibles.get(entity)
      if (collectible && renderable.visualRoot) {
        const time = performance.now() * 0.001
        renderable.root.setEnabled(!collectible.collected)
        renderable.visualRoot.position.y = Math.sin(time * 3.2 + entity) * 0.18
        renderable.visualRoot.rotation.y += 0.045
        renderable.visualRoot.scaling.setAll(1 + Math.sin(time * 4.2 + entity) * (this.settings.reducedBloom ? 0.025 : 0.055))
      }
    }
  }

  private publishUi(deltaSeconds: number): void {
    this.hudElapsed += deltaSeconds
    this.debugElapsed += deltaSeconds
    const distance = Math.floor(this.transform(this.playerEntity).z)
    if (this.hudElapsed >= 0.12) {
      this.hudElapsed = 0
      this.options.onHud({
        distance,
        score: this.score,
        essence: this.essence,
        crystals: this.crystals,
        relics: this.relics,
        demonProximity: this.world.demons.get(this.demonEntity)?.proximity ?? 0,
        level: this.level,
      })
    }
    if (!this.options.debug || !this.options.onDebug || this.debugElapsed < 0.18) return
    this.debugElapsed = 0
    const runner = this.runner()
    const lane = this.lane(this.playerEntity)
    this.options.onDebug({
      fps: Math.round(this.engine.getFps()),
      lane: lane.current,
      playerState: runner.state,
      distance,
      isJumping: runner.state === 'jumping',
      isSliding: runner.state === 'sliding',
      camera: { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z },
      activeObjects: this.world.transforms.size,
    })
  }

  private publishAudio(): void {
    if (!this.options.onAudio) return
    const runner = this.runner()
    const player = this.transform(this.playerEntity)
    this.options.onAudio({
      runnerState: runner.state,
      forwardSpeed: runner.forwardSpeed,
      demonProximity: this.world.demons.get(this.demonEntity)?.proximity ?? 0,
      runAnimationPhase: this.heroAnimation?.runPhase() ?? null,
      grounded: runner.grounded && player.y <= 0.01,
    })
  }

  private createVfxPool(): void {
    const texture = new Texture(particlePixel, this.scene, true, false)
    this.runningDust = this.createParticleSystem('running-dust', 96, texture, new Color4(0.58, 0.45, 0.66, 0.58))
    this.runningDust.emitter = new Vector3(0, 0, 0)
    this.runningDust.minEmitBox = new Vector3(-0.35, 0.05, -0.5)
    this.runningDust.maxEmitBox = new Vector3(0.35, 0.08, -0.85)
    this.runningDust.minSize = 0.08
    this.runningDust.maxSize = 0.22
    this.runningDust.minLifeTime = 0.2
    this.runningDust.maxLifeTime = 0.45
    this.runningDust.emitRate = 0
    this.runningDust.start()

    this.magicTrail = this.createParticleSystem('hero-magic-trail', 118, texture, new Color4(0.82, 0.28, 1, 0.72))
    this.magicTrail.emitter = new Vector3(0, 0.8, 0)
    this.magicTrail.minEmitBox = new Vector3(-0.12, 0.85, -0.45)
    this.magicTrail.maxEmitBox = new Vector3(0.12, 1.35, -0.62)
    this.magicTrail.minSize = 0.06
    this.magicTrail.maxSize = 0.19
    this.magicTrail.minLifeTime = 0.22
    this.magicTrail.maxLifeTime = 0.5
    this.magicTrail.emitRate = 0
    this.magicTrail.start()

    this.demonSmoke = this.createParticleSystem('demon-smoke', 150, texture, new Color4(0.08, 0.005, 0.13, 0.82))
    this.demonSmoke.minEmitBox = new Vector3(-0.35, 0.05, -0.28)
    this.demonSmoke.maxEmitBox = new Vector3(0.35, 0.9, 0.28)
    this.demonSmoke.minSize = 0.08
    this.demonSmoke.maxSize = 0.28
    this.demonSmoke.minLifeTime = 0.35
    this.demonSmoke.maxLifeTime = 0.95
    this.demonSmoke.emitRate = 0
    this.demonSmoke.start()

    this.purpleFog = this.createParticleSystem('purple-magical-fog', 130, texture, new Color4(0.38, 0.09, 0.58, 0.35))
    this.purpleFog.minEmitBox = new Vector3(-4.4, 0.2, -1.6)
    this.purpleFog.maxEmitBox = new Vector3(4.4, 2.5, 2.2)
    this.purpleFog.minSize = 0.18
    this.purpleFog.maxSize = 0.52
    this.purpleFog.minLifeTime = 0.8
    this.purpleFog.maxLifeTime = 1.8
    this.purpleFog.emitRate = 0
    this.purpleFog.start()

    this.ambientRunes = this.createParticleSystem('ambient-rune-sparkles', 90, texture, new Color4(0.85, 0.38, 1, 0.62))
    this.ambientRunes.minEmitBox = new Vector3(-4.8, -0.6, -2)
    this.ambientRunes.maxEmitBox = new Vector3(4.8, 1.6, 7)
    this.ambientRunes.minSize = 0.04
    this.ambientRunes.maxSize = 0.13
    this.ambientRunes.minLifeTime = 0.7
    this.ambientRunes.maxLifeTime = 1.6
    this.ambientRunes.emitRate = 0
    this.ambientRunes.start()

    this.landingDust = this.createParticleSystem('landing-dust', 76, texture, new Color4(0.78, 0.54, 0.9, 0.72))
    this.landingDust.minEmitBox = new Vector3(-0.15, 0, -0.15)
    this.landingDust.maxEmitBox = new Vector3(0.15, 0.05, 0.15)
    this.landingDust.targetStopDuration = 0.18

    this.catchEffect = this.createParticleSystem('demon-catch-burst', 90, texture, new Color4(0.9, 0.08, 1, 0.88))
    this.catchEffect.minEmitBox = new Vector3(-0.28, -0.18, -0.28)
    this.catchEffect.maxEmitBox = new Vector3(0.28, 0.36, 0.28)
    this.catchEffect.minSize = 0.11
    this.catchEffect.maxSize = 0.32
    this.catchEffect.minLifeTime = 0.18
    this.catchEffect.maxLifeTime = 0.62
    this.catchEffect.targetStopDuration = 0.22

    for (let index = 0; index < 4; index += 1) {
      const system = this.createParticleSystem(`collect-burst-${index}`, 82, texture, new Color4(0.95, 0.42, 1, 0.9))
      system.minEmitBox = new Vector3(-0.08, -0.08, -0.08)
      system.maxEmitBox = new Vector3(0.08, 0.08, 0.08)
      system.minSize = 0.07
      system.maxSize = 0.18
      system.minLifeTime = 0.16
      system.maxLifeTime = 0.42
      system.targetStopDuration = 0.2
      this.collectEffectPool.push(system)
    }
  }

  private createParticleSystem(name: string, capacity: number, texture: Texture, color: Color4): ParticleSystem {
    const system = new ParticleSystem(name, capacity, this.scene)
    system.particleTexture = texture
    system.color1 = color
    system.color2 = new Color4(color.r * 0.55, color.g * 0.55, color.b, color.a * 0.65)
    system.colorDead = new Color4(color.r, color.g, color.b, 0)
    system.direction1 = new Vector3(-0.25, 0.35, -0.25)
    system.direction2 = new Vector3(0.25, 0.9, 0.25)
    system.minEmitPower = 0.35
    system.maxEmitPower = 1.15
    system.updateSpeed = 0.012
    system.emitRate = 0
    system.blendMode = ParticleSystem.BLENDMODE_ADD
    this.particleSystems.push(system)
    return system
  }

  private configureScene(): void {
    this.scene.clearColor = new Color4(0.035, 0.01, 0.07, 1)
    this.scene.ambientColor = new Color3(0.22, 0.08, 0.32)
    this.scene.fogMode = Scene.FOGMODE_EXP2
    this.scene.fogColor = new Color3(0.09, 0.015, 0.14)
    this.scene.fogDensity = 0.012
    const hemi = new HemisphericLight('ambient-arcane', new Vector3(0, 1, 0), this.scene)
    hemi.intensity = 0.92
    hemi.diffuse = new Color3(0.74, 0.42, 1)
    hemi.groundColor = new Color3(0.05, 0.01, 0.09)
    const key = new DirectionalLight('moon-key', new Vector3(-0.4, -1, 0.35), this.scene)
    key.position = new Vector3(12, 18, -8)
    key.intensity = 1.45
    key.diffuse = new Color3(0.84, 0.62, 1)
    const torchGlow = new PointLight('pooled-torch-glow', new Vector3(-4.8, 2.2, 18), this.scene)
    torchGlow.intensity = 0.55
    torchGlow.diffuse = new Color3(1, 0.46, 0.18)
    torchGlow.range = 18
    this.torchGlow = torchGlow
    const crystalGlow = new PointLight('pooled-crystal-glow', new Vector3(4.8, 1.6, 34), this.scene)
    crystalGlow.intensity = 0.42
    crystalGlow.diffuse = new Color3(0.55, 0.24, 1)
    crystalGlow.range = 20
    this.crystalGlow = crystalGlow
  }

  private createCamera(): UniversalCamera {
    const camera = new UniversalCamera('runner-camera', new Vector3(0, 4.1, -8.5), this.scene)
    camera.fov = 0.92
    camera.minZ = 0.1
    camera.maxZ = 250
    return camera
  }

  private createPlayer(): Entity {
    const entity = this.createEntity({ x: 0, y: 0, z: 0 })
    this.world.lanes.set(entity, { current: 0, target: 0 })
    this.world.runners.set(entity, {
      state: 'running', stateBeforePause: 'running', forwardSpeed: 6, verticalVelocity: 0,
      grounded: true, coyoteTime: coyoteWindow, jumpBuffer: 0, slideRemaining: 0, colliderHeight: 2,
    })
    this.world.colliders.set(entity, { kind: 'ground', width: 0.9, height: 2, depth: 0.8 })
    const root = new TransformNode('player-root', this.scene)
    const visualRoot = new TransformNode('hero-visual-root', this.scene)
    visualRoot.parent = root
    visualRoot.scaling.setAll(heroVisualScale)
    this.heroPulse = this.createHeroPulse(visualRoot)
    this.world.renderables.set(entity, { root, visualRoot })
    void this.loadHero(visualRoot)
    return entity
  }

  private createHeroPulse(parent: TransformNode): Mesh {
    const material = new StandardMaterial('hero-magic-pulse-material', this.scene)
    material.diffuseColor = new Color3(0.65, 0.18, 1)
    material.emissiveColor = new Color3(0.9, 0.32, 1)
    material.alpha = 0.26
    const pulse = CreateSphere('hero-magic-pulse', { diameter: 0.42, segments: 8 }, this.scene)
    pulse.parent = parent
    pulse.position.set(0, 1.05, -0.22)
    pulse.material = material
    pulse.isPickable = false
    return pulse
  }

  private async loadHero(visualRoot: TransformNode): Promise<void> {
    try {
      const result = await SceneLoader.ImportMeshAsync('', '/assets/characters/hero/', 'magician.gltf', this.scene)
      if (this.disposed) {
        for (const mesh of result.meshes) mesh.dispose()
        return
      }
      for (const node of [...result.transformNodes, ...result.meshes]) {
        if (!node.parent) node.parent = visualRoot
      }
      this.heroAnimation = new AnimationController(result.animationGroups)
      this.heroAnimation.sync(this.runner().state)
    } catch {
      // The game remains mechanically playable if the visual asset cannot be fetched.
    }
  }

  private createDemon(): Entity {
    const entity = this.createEntity({ x: 0, y: 0.08, z: -maxDemonStartDistance })
    this.world.demons.set(entity, { speed: 4.8, proximity: 0, catchDistance: 1.35, catchTimer: 0 })
    const root = new TransformNode('demon-root', this.scene)
    const visualRoot = new TransformNode('demon-visual-root', this.scene)
    visualRoot.parent = root
    visualRoot.position.y = -0.08
    visualRoot.scaling.setAll(0.62)
    this.createDemonFallback(visualRoot)
    this.demonAuraLight = new PointLight('demon-aura-glow', new Vector3(0, 1.15, -0.55), this.scene)
    this.demonAuraLight.parent = root
    this.demonAuraLight.diffuse = new Color3(0.75, 0.05, 0.95)
    this.demonAuraLight.range = 7
    this.demonAuraLight.intensity = 0
    this.world.renderables.set(entity, { root, visualRoot })
    void this.loadDemon(visualRoot)
    return entity
  }

  private async loadDemon(visualRoot: TransformNode): Promise<void> {
    try {
      const result = await SceneLoader.ImportMeshAsync('', '/assets/characters/demon/', 'Glub.gltf', this.scene)
      if (this.disposed) {
        for (const mesh of result.meshes) mesh.dispose()
        return
      }
      visualRoot.getChildMeshes(false).forEach((mesh) => mesh.dispose())
      for (const node of [...result.transformNodes, ...result.meshes]) {
        if (!node.parent) node.parent = visualRoot
      }
      this.demonAnimation = new DemonAnimationController(result.animationGroups)
      this.demonAnimation.chase()
    } catch {
      // A visible fallback remains so chase gameplay never becomes invisible.
    }
  }

  private createDemonFallback(parent: TransformNode): void {
    const bodyMaterial = new StandardMaterial('demon-fallback-material', this.scene)
    bodyMaterial.diffuseColor = new Color3(0.08, 0.005, 0.11)
    bodyMaterial.emissiveColor = new Color3(0.22, 0.02, 0.35)
    const eyeMaterial = new StandardMaterial('demon-eye-material', this.scene)
    eyeMaterial.diffuseColor = new Color3(1, 0.16, 0.56)
    eyeMaterial.emissiveColor = new Color3(1, 0.08, 0.62)
    const body = CreateSphere('demon-fallback-body', { diameter: 1.6, segments: 8 }, this.scene)
    body.parent = parent
    body.position.y = 1.05
    body.material = bodyMaterial
    const leftEye = CreateSphere('demon-fallback-eye-left', { diameter: 0.24, segments: 6 }, this.scene)
    leftEye.parent = parent
    leftEye.position.set(-0.28, 1.35, -0.72)
    leftEye.material = eyeMaterial
    const rightEye = CreateSphere('demon-fallback-eye-right', { diameter: 0.24, segments: 6 }, this.scene)
    rightEye.parent = parent
    rightEye.position.set(0.28, 1.35, -0.72)
    rightEye.material = eyeMaterial
  }

  private resetDemon(): void {
    const player = this.transform(this.playerEntity)
    const demonTransform = this.transform(this.demonEntity)
    const demon = this.world.demons.get(this.demonEntity)
    demonTransform.x = 0
    demonTransform.y = 0.08
    demonTransform.z = player.z - maxDemonStartDistance
    if (demon) {
      demon.speed = 4.8
      demon.proximity = 0
      demon.catchTimer = 0
    }
    this.demonAnimation?.chase()
  }

  private createGameplayWorld(): void {
    const road = CreateBox('training-road', { width: 9, height: 0.2, depth: 160 }, this.scene)
    road.position.set(0, -0.11, 76)
    const roadMaterial = new StandardMaterial('training-road-material', this.scene)
    roadMaterial.diffuseColor = new Color3(0.12, 0.04, 0.18)
    roadMaterial.emissiveColor = new Color3(0.025, 0.006, 0.05)
    road.material = roadMaterial
    this.createLaneMarker(-1)
    this.createLaneMarker(1)
    this.createObstaclePool()
    this.createCollectiblePool()
  }

  private createLaneMarker(laneIndex: -1 | 1): void {
    const marker = CreateBox(`lane-marker-${laneIndex}`, { width: 0.05, height: 0.025, depth: 160 }, this.scene)
    marker.position.set(laneIndex * 1.1, 0.015, 76)
    const material = new StandardMaterial(`lane-marker-material-${laneIndex}`, this.scene)
    material.emissiveColor = new Color3(0.42, 0.1, 0.62)
    material.alpha = 0.75
    marker.material = material
  }

  private createObstaclePool(): void {
    for (let index = 0; index < obstaclePoolSize; index += 1) this.createObstacle(`ruins-obstacle-${index}`, this.nextObstacleSpawn())
  }

  private createObstacle(name: string, spawn: ObstacleSpawn): void {
    const spec = this.obstacleSpec(spawn.obstacleClass)
    const entity = this.createEntity({ x: lanePositions[spawn.lane + 1], y: spec.y, z: spawn.z })
    this.world.colliders.set(entity, { kind: 'obstacle', width: spec.width, height: spec.height, depth: spec.depth })
    const root = new TransformNode(`${name}-root`, this.scene)
    this.world.renderables.set(entity, { root })
    this.configureObstacleFromSpawn(entity, spawn)
  }

  private configureObstacleFromSpawn(entity: Entity, spawn: ObstacleSpawn): void {
    const spec = this.obstacleSpec(spawn.obstacleClass)
    const transform = this.transform(entity)
    transform.x = lanePositions[spawn.lane + 1]
    transform.y = spec.y
    transform.z = spawn.z
    this.world.colliders.set(entity, { kind: 'obstacle', width: spec.width, height: spec.height, depth: spec.depth })
    this.world.obstacles.set(entity, {
      obstacleClass: spawn.obstacleClass,
      startZ: spawn.z,
      patternName: spawn.patternName,
      sequenceIndex: spawn.sequenceIndex,
    })
    const renderable = this.world.renderables.get(entity)
    if (!renderable) return
    renderable.visualRoot?.dispose(false, true)
    const name = renderable.root.name.replace(/-root$/, '')
    const visualRoot = new TransformNode(`${name}-${spawn.sequenceIndex}-visual`, this.scene)
    visualRoot.parent = renderable.root
    visualRoot.position.y = spec.visualOffsetY
    visualRoot.rotation.set(spec.rotationX, spec.rotationY, spec.rotationZ)
    visualRoot.scaling.set(spec.scaleX, spec.scaleY, spec.scaleZ)
    renderable.visualRoot = visualRoot
    const fallback = this.createVisibleFallback(`${name}-${spawn.sequenceIndex}`, visualRoot, spec.width, spec.height, spec.depth)
    this.createObstacleDefinitionMesh(`${name}-${spawn.sequenceIndex}`, spawn.obstacleClass, visualRoot, spec.width, spec.height, spec.depth)
    void this.attachEnvironmentVisual(spec.asset, visualRoot, `${name}-${spawn.sequenceIndex}`, fallback)
  }

  private obstacleSpec(obstacleClass: ObstacleClass): {
    asset: RunnerEnvironmentModuleId
    y: number
    width: number
    height: number
    depth: number
    visualOffsetY: number
    rotationX: number
    rotationY: number
    rotationZ: number
    scaleX: number
    scaleY: number
    scaleZ: number
  } {
    if (obstacleClass === 'jump') {
      return {
        asset: 'brick4', y: 0.48, width: 1.55, height: 0.96, depth: 1.18,
        visualOffsetY: -0.08, rotationX: 0.04, rotationY: 0.45, rotationZ: -0.03,
        scaleX: 1.55, scaleY: 1.32, scaleZ: 1.35,
      }
    }
    if (obstacleClass === 'slide') {
      return {
        asset: 'log', y: 1.72, width: 1.55, height: 0.42, depth: 0.9,
        visualOffsetY: 0, rotationX: 0, rotationY: Math.PI / 2, rotationZ: Math.PI / 2,
        scaleX: 1.4, scaleY: 1.4, scaleZ: 1.4,
      }
    }
    return {
      asset: 'wall', y: 0.95, width: 1.35, height: 1.9, depth: 0.9,
      visualOffsetY: -0.9, rotationX: 0, rotationY: Math.PI / 2, rotationZ: 0,
      scaleX: 0.48, scaleY: 0.62, scaleZ: 0.52,
    }
  }

  private async attachEnvironmentVisual(
    asset: RunnerEnvironmentModuleId,
    parent: TransformNode,
    name: string,
    fallback: Mesh,
  ): Promise<void> {
    const container = await this.loadEnvironmentTemplate(asset)
    if (this.disposed || parent.isDisposed()) return
    if (!container) {
      return
    }
    const instance = container.instantiateModelsToScene((sourceName) => `${name}-${sourceName}`, false, { doNotInstantiate: false })
    for (const rootNode of instance.rootNodes) rootNode.parent = parent
    fallback.dispose()
  }

  private loadEnvironmentTemplate(asset: RunnerEnvironmentModuleId): Promise<AssetContainer | null> {
    const cached = this.environmentTemplates.get(asset)
    if (cached) return Promise.resolve(cached)
    const pending = this.environmentTemplatePromises.get(asset)
    if (pending) return pending
    const module = runnerEnvironmentModules[asset]
    const promise = SceneLoader.LoadAssetContainerAsync('', module.file, this.scene)
      .then((container) => {
        if (this.disposed) {
          container.dispose()
          return null
        }
        this.environmentTemplates.set(asset, container)
        return container
      })
      .catch(() => null)
    this.environmentTemplatePromises.set(asset, promise)
    return promise
  }

  private createVisibleFallback(name: string, parent: TransformNode, width: number, height: number, depth: number): Mesh {
    const mesh = CreateBox(`${name}-fallback`, { width, height, depth }, this.scene)
    mesh.parent = parent
    mesh.position.y = height / 2
    const material = new StandardMaterial(`${name}-fallback-material`, this.scene)
    material.diffuseColor = new Color3(0.42, 0.36, 0.31)
    material.emissiveColor = new Color3(0.025, 0.018, 0.014)
    mesh.material = material
    return mesh
  }

  private createObstacleDefinitionMesh(name: string, obstacleClass: ObstacleClass, parent: TransformNode, width: number, height: number, depth: number): void {
    if (obstacleClass === 'jump') {
      const base = CreateBox(`${name}-stone-base`, { width, height: height * 0.52, depth }, this.scene)
      base.parent = parent
      base.position.y = height * 0.26
      base.rotation.set(0.06, -0.12, 0.03)
      base.material = this.getObstacleMaterial('jump-stone', new Color3(0.56, 0.49, 0.4), new Color3(0.035, 0.028, 0.02))
      const cap = CreateBox(`${name}-stone-cap`, { width: width * 0.82, height: height * 0.34, depth: depth * 0.72 }, this.scene)
      cap.parent = parent
      cap.position.set(-width * 0.08, height * 0.7, depth * 0.04)
      cap.rotation.set(-0.05, 0.28, -0.06)
      cap.material = this.getObstacleMaterial('jump-highlight', new Color3(0.68, 0.61, 0.5), new Color3(0.045, 0.036, 0.025))
      const edge = CreateBox(`${name}-stone-edge`, { width: width * 0.18, height: height * 0.72, depth: depth * 0.95 }, this.scene)
      edge.parent = parent
      edge.position.set(width * 0.43, height * 0.42, -depth * 0.04)
      edge.rotation.set(0.02, -0.34, 0.14)
      edge.material = this.getObstacleMaterial('jump-dark-edge', new Color3(0.31, 0.28, 0.25), new Color3(0.018, 0.014, 0.012))
      return
    }
    if (obstacleClass === 'slide') {
      const beam = CreateBox(`${name}-low-beam-read`, { width, height, depth }, this.scene)
      beam.parent = parent
      beam.position.y = height / 2
      beam.material = this.getObstacleMaterial('slide-beam', new Color3(0.34, 0.22, 0.14), new Color3(0.035, 0.018, 0.01))
      return
    }
    const wall = CreateBox(`${name}-wall-read`, { width, height, depth }, this.scene)
    wall.parent = parent
    wall.position.y = height / 2
    wall.material = this.getObstacleMaterial('lane-wall', new Color3(0.5, 0.43, 0.36), new Color3(0.03, 0.023, 0.018))
  }

  private getObstacleMaterial(key: string, diffuse: Color3, emissive: Color3): StandardMaterial {
    const cached = this.obstacleMaterials.get(key)
    if (cached) return cached
    const material = new StandardMaterial(`obstacle-${key}-material`, this.scene)
    material.diffuseColor = diffuse
    material.emissiveColor = emissive
    material.specularColor = new Color3(0.08, 0.07, 0.06)
    this.obstacleMaterials.set(key, material)
    return material
  }

  private createCollectiblePool(): void {
    for (let index = 0; index < collectiblePoolSize; index += 1) this.createCollectible(`collectible-${index}`, this.nextCollectibleSpawn())
  }

  private createCollectible(name: string, spawn: { type: CollectibleType; lane: -1 | 0 | 1; z: number }): void {
    const entity = this.createEntity({ x: lanePositions[spawn.lane + 1], y: 1.05, z: spawn.z })
    const root = new TransformNode(`${name}-root`, this.scene)
    const visualRoot = new TransformNode(`${name}-visual`, this.scene)
    visualRoot.parent = root
    this.world.renderables.set(entity, { root, visualRoot })
    this.configureCollectible(entity, spawn)
  }

  private configureCollectible(entity: Entity, spawn: { type: CollectibleType; lane: -1 | 0 | 1; z: number }): void {
    const transform = this.transform(entity)
    transform.x = lanePositions[spawn.lane + 1]
    transform.y = 1.05
    transform.z = spawn.z
    const value = spawn.type === 'relic' ? 250 : spawn.type === 'crystal' ? 75 : 20
    this.world.collectibles.set(entity, { type: spawn.type, value, startZ: spawn.z, collected: false })
    const renderable = this.world.renderables.get(entity)
    if (!renderable?.visualRoot) return
    renderable.visualRoot.getChildMeshes(false).forEach((mesh) => mesh.dispose())
    const source = this.collectibleSource(spawn.type)
    const instance = source.createInstance(`${renderable.root.name}-${spawn.type}-${this.collectibleCursor}`)
    instance.parent = renderable.visualRoot
    instance.isVisible = true
    renderable.root.setEnabled(true)
  }

  private collectibleSource(type: CollectibleType): Mesh {
    const cached = this.collectibleSources.get(type)
    if (cached) return cached
    const color =
      type === 'relic' ? new Color3(1, 0.78, 0.25) : type === 'crystal' ? new Color3(0.33, 0.86, 1) : new Color3(0.82, 0.28, 1)
    const material = new StandardMaterial(`${type}-pickup-material`, this.scene)
    material.diffuseColor = color
    material.emissiveColor = color.scale(0.55)
    const mesh =
      type === 'essence'
        ? CreateSphere(`${type}-pickup-source`, { diameter: 0.42, segments: 8 }, this.scene)
        : CreateCylinder(`${type}-pickup-source`, { height: type === 'relic' ? 0.48 : 0.72, diameterTop: 0, diameterBottom: type === 'relic' ? 0.72 : 0.46, tessellation: type === 'relic' ? 8 : 6 }, this.scene)
    mesh.material = material
    mesh.isVisible = false
    this.collectibleSources.set(type, mesh)
    return mesh
  }

  private createWorld(): GameWorld {
    return {
      nextEntity: 1,
      transforms: new Map(),
      lanes: new Map(),
      runners: new Map(),
      colliders: new Map(),
      renderables: new Map(),
      obstacles: new Map(),
      collectibles: new Map(),
      demons: new Map(),
    }
  }

  private createEntity(transform: TransformComponent): Entity {
    const entity = this.world.nextEntity++
    this.world.transforms.set(entity, transform)
    return entity
  }

  private transform(entity: Entity): TransformComponent {
    const transform = this.world.transforms.get(entity)
    if (!transform) throw new Error(`Missing transform for entity ${entity}`)
    return transform
  }

  private lane(entity: Entity): LaneComponent {
    const lane = this.world.lanes.get(entity)
    if (!lane) throw new Error(`Missing lane for entity ${entity}`)
    return lane
  }

  private runner(): RunnerComponent {
    const runner = this.world.runners.get(this.playerEntity)
    if (!runner) throw new Error('Missing player runner state')
    return runner
  }

  private collider(entity: Entity): ColliderComponent {
    const collider = this.world.colliders.get(entity)
    if (!collider) throw new Error(`Missing collider for entity ${entity}`)
    return collider
  }

  private difficultyLevelForDistance(distance: number): number {
    return Math.max(1, Math.floor(distance / 95) + 1)
  }

  private random(seed: number): number {
    const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
    return value - Math.floor(value)
  }
}
