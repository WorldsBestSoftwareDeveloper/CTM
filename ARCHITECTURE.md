# Catch the Magician Architecture

## 1. Purpose and scope

Catch the Magician is a portrait-primary, browser-based 3D endless runner. The MVP is deliberately small: one hero, one demon, one Ancient Arcane Ruins biome, Demo Mode, Ranked Mode, a persistent profile, and one global leaderboard. The product is a PWA deployed to Solana Devnet.

The implementation must favour a polished, immediately playable game over infrastructure. There is no backend, token economy, NFT marketplace, purchases, clans, replay-verification service, or server-authoritative simulation. Daily, weekly, and friends leaderboards are future work.

## 2. System overview

```text
React application
  ├─ Splash / loading / home / HUD / menus / settings
  ├─ Wallet, Mobile Wallet Adapter, session-key providers
  ├─ Babylon GameCanvas
  │   ├─ Babylon scene and render resources
  │   └─ lightweight ECS-style gameplay simulation
  └─ PWA shell, asset cache, local settings/demo profile

Solana Devnet
  ├─ Anchor game program
  ├─ PlayerProfile PDA
  ├─ delegated RunSession PDA
  └─ GlobalLeaderboard PDA

MagicBlock
  ├─ Magic Router for transaction routing
  ├─ Ephemeral Rollup for checkpoint updates
  └─ session keys for the active ranked run
```

React owns screen state and non-frame UI. Babylon owns all rendering objects, materials, animation groups, audio emitters, particles, camera, lights, and post-processing. The gameplay layer owns simulation state. React must never re-render per frame and Babylon render objects must never be used as gameplay state.

## 3. Product flow

The initial path must reach an actionable Home screen in 15 seconds or less on a representative modern Android device:

```text
Launch → animated splash → loading screen → Home
                                      ├─ Play Demo → local Practice run
                                      └─ Connect Wallet → Ranked → Play
Run end → Game Over → Global Leaderboard → Profile → Play Again
```

Demo Mode is the default safe path. It uses a bundled local profile, needs neither wallet nor network, launches gameplay immediately, and never creates or submits a score. Ranked Mode requires a wallet, online connection, and a valid session. User-facing language uses `Demo` and `Ranked`; game UI must not use project-event terminology.

## 4. Frontend and React architecture

Use React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, and vite-plugin-pwa.

### Providers and state

- `AppProvider`: route/screen state, loading state, toast/error state, and game-session transitions.
- `SettingsProvider`: persisted visual, audio, input, and accessibility settings in localStorage.
- `WalletProvider`: Solana Wallet Adapter desktop adapters and Mobile Wallet Adapter capability detection.
- `SessionProvider`: MagicBlock session-key lifecycle for Ranked Mode only.
- `GameBridge`: a narrow imperative interface between React and `GameRuntime` (`start`, `pause`, `resume`, `dispose`, events).

React state is split by cadence: UI/navigation state in React context, persistent preferences in localStorage, wallet/session state in providers, and frame-rate simulation state only in `GameRuntime`. Do not add Redux, Zustand, a query cache, or a global event framework for the MVP.

### Screens

`SplashScreen`, `LoadingScreen`, `HomeScreen`, `WalletSheet`, `ModeSheet`, `GameScreen`, `PauseOverlay`, `GameOverScreen`, `LeaderboardScreen`, `ProfileScreen`, and `SettingsSheet` are lazy UI boundaries. Home uses a low-cost animated CSS/canvas/Babylon background, not the full gameplay scene.

## 5. Game and ECS-style architecture

This is not a general ECS framework. Use a small `GameWorld` with numeric entity IDs, typed component maps, and explicit system functions. Components are TypeScript interfaces; a system receives `world`, `deltaSeconds`, and only the component collections it needs. Entities are created by direct factories and removed by a `CleanupSystem`.

Core components: `Transform`, `Lane`, `Runner`, `Velocity`, `Collider`, `Renderable`, `Animation`, `Collectible`, `Obstacle`, `Powerup`, `Lifetime`, `Demon`, and `PoolTag`. Core systems: `InputSystem`, `RunnerSystem`, `LaneSystem`, `JumpSlideSystem`, `SpawnSystem`, `ChunkSystem`, `CollisionSystem`, `CollectibleSystem`, `PowerupSystem`, `DemonSystem`, `DifficultySystem`, `ScoreSystem`, `FeedbackSystem`, `CleanupSystem`.

The simulation uses a fixed 1/60-second step with a capped catch-up count. Babylon's render loop interpolates transform presentation. The runner stays near the origin; chunks, hazards, and props move toward the player and are recycled. Spawn generation uses a per-run seed for repeatable debugging, but no claim of competitive anti-cheat is made.

## 6. Babylon.js scene and rendering

One `GameRuntime` owns one engine and switches between a small Home scene and a Gameplay scene. Gameplay scene layers are:

1. **World**: pooled runway chunks, floating islands, bridges, pillars, crystals, gates, and debris.
2. **Actors**: hero, demon, hazards, collectibles, and power-ups.
3. **Atmosphere**: sky gradient, fog, rune glow, particles, and sparse floating debris.
4. **Presentation**: follow camera, HUD-safe framing, bloom, restrained lens flare, and screen-feedback events.

Use a third-person follow camera with smoothing, camera-relative lane framing, dynamic FOV for speed boost, and settings-controlled shake. Use a low-poly material palette, one directional/hemispheric lighting setup, limited point lights, fog, and a single default rendering pipeline. Hero/demon/major props use `AssetContainer` or `TransformNode` roots. Do not recreate meshes or materials within a run.

Quality tiers: **High** targets 60 FPS; **Low** targets a stable 30 FPS by lowering resolution scale, particle capacity, shadow settings, bloom, fog quality, and nonessential background detail. Reduced-bloom and reduced-shake settings override the selected tier.

## 7. Performance strategy

Performance work is continuous, not a final phase. Targets:

- 60 FPS on modern Android devices; graceful 30 FPS on lower-end hardware.
- Fewer than 100 draw calls and 300 active meshes during ordinary gameplay.
- GPU instances for repeated ruins, crystals, debris, collectibles, and simple hazards.
- Object pools for chunks, obstacles, pickups, particles, and audio emitters.
- Texture atlases for compatible world/UI textures; compressed textures where tooling supports them.
- Frustum culling, simple distance culling, and LOD only for repeated environment props where it reduces measured cost.
- Lazy loading, background loading, and disposal of scenes/containers that cannot be reused.

A performance overlay is debug-only and reports FPS, draw calls, active meshes, pooled allocations, and asset phase. Every gameplay feature has a budget check before polish expands it.

## 8. Asset loading and PWA

Startup loads only the app shell, UI, fonts, icons, wallet shell, service-worker registration, and Home scene. The Home route must not wait for hero, full environment, audio, or particle bundles.

Choosing Play requests the **minimum playable set**: hero, first environment chunk, obstacle/collectible placeholders, essential animations, core effects, and key audio. A progress UI states the phase and supports cancellation back to Home. Gameplay starts when this set is ready. Remaining chunks, optional audio, VFX variants, and decorative assets load in the background.

`vite-plugin-pwa` precaches the versioned app shell, Demo Mode essentials, fonts, icons, and Home assets. Runtime caching stores first-run gameplay assets using conservative size limits. Demo must remain playable from cached assets when offline; Ranked Mode is disabled with a clear reason when offline. Failed noncritical assets use local primitive/low-poly placeholders. Do not queue offline Ranked scores.

## 9. Blockchain, wallet, and MagicBlock

Anchor program accounts are intentionally limited:

- `PlayerProfile` PDA: authority, display/avatar selection identifier, high score, highest distance, runs played, essence total, and last-updated slot.
- `RunSession` PDA: player authority, session-key authority, run status, seed, checkpoint score/distance, final score/distance, and run nonce. This is the account delegated for Ranked gameplay.
- `GlobalLeaderboard` PDA: fixed bounded top-N entries containing player public key, score, distance, and update slot.

Program instructions: `initialize_profile`, `start_run`, `delegate_run_session`, `checkpoint_run`, `end_run`, `commit_final_score`, `update_global_leaderboard`, and `undelegate_run_session`. Configuration and program IDs are environment values; the release target is Devnet.

Ranked flow is foreground and visible to the player:

```text
Start Run → Delegate RunSession → ER checkpoints → End Run
→ Commit final score → Update GlobalLeaderboard → Undelegate RunSession
```

Magic Router sends standard transactions to the appropriate base-layer or ER endpoint. A MagicBlock session key is created after wallet connection, scoped to the program and limited to the active run; it signs checkpoint actions. Wallet connection/session failure leaves Demo Mode usable. Finalization uses the direct, attached leaderboard update required by the transaction flow; there is no worker, cron, queue, backend, or synchronization job.

Desktop adapters include Phantom, Backpack, and Solflare where supported. Mobile uses Mobile Wallet Adapter and Seeker-compatible browser discovery. The wallet is never required for Demo Mode. Browser gameplay is not fully cheat-proof; this MVP demonstrates delegated real-time updates and a persistent public ranking rather than a server-verified esport system.

## 10. Accessibility and controls

Desktop supports arrows/A-D, Space, and Shift. Mobile supports swipe left/right/up/down with optional touch buttons. The settings sheet provides master/music/SFX volume, reduced shake, reduced bloom, sensitivity, and reset defaults. It persists locally.

Obstacles differ by silhouette, placement, animation, and contrast; color is never their only meaning. HUD text and icons have contrast-safe states, pause is always available, and settings are keyboard/touch operable.

## 11. Folder structure

```text
apps/web/
  src/
    app/           providers, routing, screen state
    components/    UI screens and shared controls
    game/          runtime, ecs, systems, entities, scene, assets, pools
    features/      profile, leaderboard, wallet, settings
    lib/           Solana, MagicBlock, utilities, configuration
    styles/        Tailwind entry and tokens
  public/          PWA icons, splash assets, precached Demo essentials
programs/catch-the-magician/
  src/             Anchor instructions, state, errors
tests/             program and client integration tests
docs/              optional supporting diagrams and license register
```

Keep feature ownership local. A module may expose a small public API, but avoid barrels, base classes, factories, or abstractions that do not remove immediate duplication.

