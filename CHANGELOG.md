# Changelog

## 0.6.0-c — Milestone 6C: MagicBlock Ephemeral Rollups Integration

### Implemented

- Added MagicBlock Ephemeral Rollups dependencies and a dedicated React `MagicBlockProvider`/context for Ranked Mode session lifecycle state.
- Added Devnet Magic Router, Ephemeral Rollup, and validator configuration with environment-variable overrides:
  - `VITE_MAGICBLOCK_ROUTER_URL`
  - `VITE_MAGICBLOCK_ER_URL`
  - `VITE_MAGICBLOCK_VALIDATOR_ID`
- Added session key creation/restoration through the installed MagicBlock GUM React SDK, including single-flight session preparation so repeated Ranked clicks do not create duplicate sessions.
- Updated Ranked Mode to create or restore a session key before gameplay, start `RunSession` with the session authority, delegate `RunSession` and `PlayerProfile`, finish the run through the session signer on the Ephemeral Rollup, and settle by committing/undelegating.
- Added Anchor MagicBlock instructions and regenerated frontend IDL/types:
  - `delegate_run_session`
  - `delegate_player_profile`
  - `commit_ranked_session`
  - `undelegate_ranked_session`
- Routed `start_run` and delegation transactions through base Devnet, while using Magic Router for delegation-status reads and the Ephemeral Rollup connection for session-signed finish/settlement transactions.
- Added `scripts/validate-magicblock.mjs` for Devnet validation of session creation, delegation, ER finish, undelegation/settlement, and profile refresh.

### Devnet

- Program ID: `74bg3UqJQTXJQihCw1JX7F3NWh9PUhj4UFqjE81rCpnR`.
- MagicBlock deployment/IDL upgrade signature: `eKx4j4uRVLDusQE6bZr9CmSz4KRukxPJycGghYtQZhxUHeJqo68Cm4JqGxpgtTzPpqBvNqs5sZ18GY7d7LsxCiY`.
- Devnet validation script signatures:
  - session key creation: `ygfzmq5vfQa7NZB5UbbDQnuoh8uFBuSe1ZacvF6r5488GRuJ2udvMctFh6knfTAaD5tTj6g1DgNiue2g9Bj6XjY`
  - `start_run`: `4Lhw85WyRDnbSemyjVtyffwFRxgdD9W9LtkdC4vRXPqub5KrzVb1Fox6PWCVuRBCdn2Fv4UrB1GRMW7vL65daLb3`
  - `delegate_run_session`: `5z6x15voktx9LvTEq6yznV2r33hJqDBnKqCoVcofWBEoyngrYcVh3iJv4SaP925KABwxLb9AiYMHh1yb2Quzcvu8`
  - `delegate_player_profile`: `3NbNuDmkLjejR9oTRMgDzaB5MKGTGTkduzjA5Eeuo1x8xBKqes7vCLY3x9WLnUAvtF5gVNR4VbHv7TYrRitTa1vW`
  - `finish_run` through session key on ER: `2HL5gmwk8vzdD8idTMM9ZfkJaoRjucQdhviP62DmkykbuKF7K29ECfq54nm95LPNNyLjeL9pj3f5pGotEtAqGL1g`
  - `undelegate_ranked_session`: `5fq6ju3cyUJeD5mqE77iYm3gN21P5B7639NbRaoxaLfD4mTgJwywMScyanfjJUzUZuxGcEpTcJRvYFLLjB3QRQ4t`

### Validation

- `anchor build` passes and regenerates the SBF program, IDL, and TypeScript bindings.
- Deployed Devnet IDL semantically matches the frontend IDL: address and instruction set match.
- `cargo test --workspace` passes: 1 passed, 0 failed. Anchor/Rust emits upstream `target_os="solana"` cfg warnings only.
- `node scripts/validate-magicblock.mjs` passes on Devnet:
  - session key creation verified
  - `RunSession` delegation verified
  - `PlayerProfile` delegation verified
  - session-signed ER `finish_run` verified
  - undelegation/settlement verified
  - profile refresh after settlement verified
  - Demo Mode code was not imported or executed by the validation path
- `npm.cmd run lint` passes.
- `npm.cmd run typecheck` passes.
- `npm.cmd run build` passes.

### Scope boundaries

- Demo Mode remains offline/local and does not initialize MagicBlock.
- No leaderboard, anti-cheat, score verification, checkpoints, NFTs, tokens, backend, gameplay, asset, audio, camera, obstacle, or UI redesign work was added.

## 0.6.0-b2 — Milestone 6B Phase 2: Ranked Anchor Client

### Implemented

- Deployed the existing `catch_the_magician` Anchor program to Devnet and connected the React wallet layer to the generated IDL and TypeScript binding.
- Added deterministic `PlayerProfile` and `RunSession` PDA derivation, on-demand profile initialization at the first explicit Play Ranked action, and on-chain profile refresh after confirmed transactions.
- Added Ranked run start/finish transactions. Active run IDs are generated locally, persisted per wallet, recovered after refresh, and cleared only after a confirmed `finish_run`.
- Added explicit transaction stages: Preparing, Awaiting wallet approval, Sending, Confirming, Complete, plus friendly rejection, timeout, insufficient-funds, and transaction-failure states.
- Added a single-flight transaction coordinator to prevent duplicate concurrent submissions; timed-out or failed transactions are never retried automatically.
- Connected Ranked Game Over to `finish_run` and Ranked Play Again to a new `start_run` while preserving all existing gameplay timing and mechanics.
- Extended the existing Profile presentation with on-chain runs played, best score, and best distance.

### Scope boundaries

- Demo Mode continues to use the same local asset/gameplay path and never creates or submits a transaction.
- No MagicBlock, session key, Ephemeral Rollup, delegation, checkpoint, leaderboard, anti-cheat, score verification, instruction, gameplay, asset, audio, PWA, or visual-theme work was added.

### Devnet

- Program ID: `74bg3UqJQTXJQihCw1JX7F3NWh9PUhj4UFqjE81rCpnR`.
- Initial deployment signature: `Yv5qZQosX4LXwJhKB6VRBnEiCBfnun8SGfDxBsTMdWqiUgzAHdjaY1VWMxJZNDYgjzwuMhR6RwyEF7s5JWs6V4b`.
- Validation upgrade signature from `anchor test`: `3Azj8dNtqu32we422VF85ZZ8v4Sq1qbMNykb5TVePDi8163pX7q2PSrXVjdfLBD1S38avKj3euUmYWEzDpNQATtQ`.

### Validation

- `anchor test` passes on Devnet: 1 passed, 0 failed.
- Frontend lint, typecheck, and production build results are recorded at handoff.

## 0.6.0-b1 — Milestone 6B Phase 1: Anchor Foundation

### Implemented

- Added an Anchor 0.32.1 workspace inside the existing repository with the `catch_the_magician` program configured for Devnet.
- Generated program ID `74bg3UqJQTXJQihCw1JX7F3NWh9PUhj4UFqjE81rCpnR` and applied it consistently to `declare_id!`, `Anchor.toml`, the generated IDL, and frontend configuration.
- Added `PlayerProfile` and `RunSession` PDA accounts with explicit account sizing, stored bumps, wallet authority constraints, and run lifecycle status.
- Added `initialize_player`, `start_run`, and `finish_run`; finishing a run updates local profile run count, best score, and best distance with overflow protection.
- Added the Anchor TypeScript client dependency, generated IDL/type bindings, typed program construction, and deterministic PDA helpers for player profiles and run sessions.

### Scope boundaries

- No MagicBlock, session keys, delegation, checkpoints, leaderboards, score verification, transaction UI, or Demo Mode integration was added.
- Phase 1 accepts wallet-supplied final score and distance without competitive verification; verification remains explicitly out of scope.

### Validation

- `anchor build` generated the SBF program, IDL, and TypeScript type through the verified WSL toolchain.
- Frontend lint, typecheck, and production build results are recorded at handoff.

## 0.6.0-a — Milestone 6A: Wallet Foundation

### Implemented

- Added isolated React wallet providers using Solana Wallet Adapter, Wallet Standard discovery, and the adapter's automatic Mobile Wallet Adapter path for supported Android Chrome/PWA environments.
- Configured Devnet-only RPC access, automatic reconnect, disconnect recovery, wallet/public-key change propagation, online/offline detection, and genesis-hash validation of custom RPC endpoints.
- Kept the existing Home design while adding connected states for Play Ranked, Profile, and Disconnect; Play Demo remains independent of wallet and network state.
- Added a lightweight local Profile view showing shortened address, wallet status/provider, Devnet status, Ranked readiness, and Demo availability without blockchain reads.
- Added friendly rejection, unavailable/locked wallet, timeout, disconnect, wrong-network, and unreachable-Devnet messages without allowing wallet failures to crash or block Demo Mode.
- Kept Play Ranked gated behind wallet connection, verified Devnet, and the explicitly future session key.

### Architectural decisions

- Wallet state is owned by React context under `src/wallet`; no wallet or Solana code enters `GameScene`.
- Phantom, Solflare, and Backpack use Wallet Standard discovery instead of individually bundled legacy adapters. This keeps wallet additions extensible and avoids the full all-wallet adapter bundle.
- Solana wallets do not expose a universal selected-network switch API. The app therefore validates its configured RPC by Devnet genesis hash and changes to the public Devnet RPC only after explicit user confirmation.
- `VITE_SOLANA_RPC_URL` is optional. When absent, the official public Devnet endpoint is used.

### Excluded

- No Anchor program, MagicBlock integration, session-key creation, on-chain profile/run, transaction signing, score submission, or leaderboard work was started.

### Validation

- `npm.cmd run lint` passes.
- `npm.cmd run typecheck` passes.
- `npm.cmd run build` passes.
- Physical wallet extension and Android MWA testing remain manual prerequisites before Milestone 6B.

## Production stabilization

- Added a centralized required-asset preload gate with real progress, glTF buffer/texture dependency discovery, one retry, explicit warnings, and hard failure instead of silently starting a partial run.
- Gameplay now waits for the hero, demon, environment modules, materials, textures, and audio before Babylon starts its render and simulation loop.
- Removed hero and demon placeholder spawn paths; the gameplay canvas remains covered until imported meshes are ready.
- Hardened audio preload, first-interaction unlock, and resume behavior for desktop, mobile, visibility changes, and installed-app suspend/resume.
- Reused browser and Babylon caches so required assets are not repeatedly downloaded or reconstructed during a run.
- No gameplay rules, milestone progression, PWA configuration, blockchain scope, or assets were changed.

## 0.5.0 — Milestone 5: Installable PWA, Loading Experience & Production Polish

### Implemented

- Upgraded the loading presentation with the official full logo, dark purple magical atmosphere, floating particles, a lightweight glowing rune circle, randomized gameplay tips, smoother progress interpolation, and fade-based transitions into Home.
- Polished the existing Home layout without changing navigation: added layered parallax ambience, distant ruin silhouettes, fog, floating crystals, rune glow, logo entrance/breathing treatment, and richer button hover feedback.
- Added a browser install prompt path that appears only when the PWA install event is available and the app is not already installed.
- Improved PWA configuration with official logo assets included, an icon manifest entry, automatic service-worker updates, old-cache cleanup, and runtime cache rules for audio/game assets so large gameplay files are cached on demand instead of bloating the startup precache.
- Updated the PWA dependency set to `vite-plugin-pwa@0.17.5` with Workbox 7 peers so Vercel's default strict `npm install` can resolve the Vite 4 project without `--legacy-peer-deps`.
- Added a project `.gitignore` for dependencies, build output, caches, logs, environment files, and OS/editor noise so the source and public game assets can be pushed cleanly.

### Architectural decisions

- Removed the startup Babylon hero preview from the loading path for Milestone 5. The loading screen now uses CSS-only rune/crystal motion, keeping first impression polish while avoiding an unnecessary Babylon/glTF fetch before Home.
- Kept gameplay, obstacle logic, demon AI, wallet, Mobile Wallet Adapter, MagicBlock, Solana, blockchain, leaderboard, Demo/Ranked state, and game balance untouched.
- PWA precaching remains app-shell focused. Heavy audio, character, and environment assets use runtime `CacheFirst` caching after they are requested by gameplay.

### Known limitations

- The workspace still has no Git metadata, so Git status/diff and commits cannot run until the folder is initialized or connected to a repository.
- Offline behavior is configured through the generated service worker, but full installed-app offline verification still requires serving the production build in a browser/device context.

### Validation

- `npm.cmd run lint` passes.
- `npm.cmd run typecheck` passes.
- `npm.cmd run build` passes.

## 0.4.2 — Pre-Milestone 5: Premium Loading & Splash Experience

### Implemented

- Rebuilt the startup splash with the official `logo-full.png`, smooth fade/scale reveal, soft purple glow, floating particles, subtle fog, distant ruin silhouettes, and animated background gradient.
- Replaced the basic loading screen with a premium branded presentation using `logo-icon.png` above `logo-full.png`, status text, loading percentage, rotating gameplay tips, and a rune-framed shimmer loading bar.
- Added one-time brand image preloading for `logo-full.png` and `logo-icon.png`; loading progress now includes actual logo readiness plus a short minimum presentation window.
- Added a startup-only lazy `StartupHeroPreview` component that loads the existing magician glTF, plays Idle if available or Run as fallback, and presents the hero over a rotating magical rune circle with gentle lighting/camera drift.
- Updated Home to use the official full logo as title artwork and the icon in the brand lockup without changing Demo/Ranked behavior.
- Added reduced-bloom/reduced-motion-soft CSS hooks for startup presentation based on existing persisted settings.

### Architectural decisions

- The hero preview is isolated from the gameplay scene and disposes its own lightweight Babylon engine/scene on unmount.
- No gameplay mechanics, Babylon gameplay scene code, wallet, Mobile Wallet Adapter, MagicBlock, Solana, blockchain, leaderboard, PWA configuration, Demo flow, Ranked flow, or balance code was changed.
- The official logo artwork is reused by URL/browser cache instead of regenerating, distorting, or duplicating the assets.

### Known limitations

- The animated hero preview is lazy and non-blocking; on very slow devices/networks the CSS fallback can appear briefly while the model chunk loads so Home can still remain fast.
- The loading progress reflects brand asset readiness and the short presentation budget, but full gameplay assets still remain lazy-loaded when Play is selected.

### Validation

- `npm.cmd run lint` passes.
- `npm.cmd run typecheck` passes.
- `npm.cmd run build` passes.

## 0.4.1 — Milestone 4A/4B: Game Feel, Visual Polish, Settings

### Implemented

- Improved hero and demon animation switching with Babylon animation blending enabled on imported animation groups.
- Added presentation-only camera polish: smoother damping, refined lane lean, landing impulse, jump catch-up, speed-based FOV scaling, critical demon shake, and short collision impact shake.
- Strengthened pooled hero feedback with denser run dust, stronger magic trail, landing dust bursts, collection bursts, and a subtle emissive hero pulse.
- Improved demon threat presentation with darker smoke, stronger fallback eye glow, a reusable aura light, smoother spawn scale-in, and a pooled catch burst.
- Tuned atmosphere with stronger moon lighting, warmer torch flicker, crystal glow pulse, gentler fog scaling, and more readable floating rune particles.
- Added HUD polish for score, collectible, and level-up pulses plus a smoother Game Over/pause overlay presentation.
- Added a lightweight persisted Settings panel with Master Volume, Music Volume, SFX Volume, Reduced Screen Shake, Reduced Bloom, and Touch Sensitivity.

### Architectural decisions

- Settings are stored in a small localStorage-backed module and passed as snapshots to the AudioManager and GameScene; no global state library or continuous React-driven gameplay updates were added.
- Reduced Screen Shake and Reduced Bloom affect presentation only. They do not change movement, obstacle, collision, demon catch, score, Demo, Ranked, wallet, MagicBlock, Solana, leaderboard, or PWA behavior.
- Touch sensitivity changes only the swipe threshold. Desktop controls remain unchanged.

### Known limitations

- Reduced Bloom currently lowers emissive/pulse/particle/light intensity; a full post-processing bloom pipeline remains outside this slice.
- Settings are available from gameplay/pause. A standalone Home settings route can be added later if needed without changing the storage model.

### Validation

- `npm.cmd run lint` passes.
- `npm.cmd run typecheck` passes.
- `npm.cmd run build` passes.

## 0.4.0-audio — Milestone 4A: Audio Integration Only

### Implemented

- Added a lightweight reusable `AudioManager` that preloads `ambient.mp3`, `chase.mp3`, `footsteps.mp3`, and `demon-roar.mp3` once and reuses the same audio objects during play.
- Added ambient music for Home and normal gameplay, with a short crossfade into chase music when demon proximity becomes dangerous and a hysteresis fade back to ambient after the player regains distance.
- Added animation-synchronized footstep cues using the hero Run animation phase when available, with speed-based cadence as a fallback before animation frame data is ready.
- Added one non-overlapping demon roar at run start plus cooldown-gated critical-proximity roars.
- Stopped footsteps during jump, slide, pause, Game Over, and route cleanup; restart resets the run audio state.

### Architectural decisions

- Audio is kept outside React render state. `GameScene` emits a narrow audio snapshot directly from the Babylon/game loop, while React only owns lifecycle actions such as entering Home, starting a run, pause, restart, and cleanup.
- No settings, volume UI, accessibility toggles, wallet, MagicBlock, leaderboard, gameplay mechanics, or future milestone systems were added.

### Known limitations

- Browser autoplay policies may block Home music until the first user gesture; the manager retries on gameplay interactions and continues normally after audio is unlocked.
- Volume values are fixed for this audio-only slice. User-adjustable master/music/SFX controls remain part of the later settings/accessibility milestone.

### Validation

- `npm.cmd run lint` passes.
- `npm.cmd run typecheck` passes.
- `npm.cmd run build` passes.

## 0.3.5 — Milestone 3.5: Hero, Demon, Patterns, and Visual Polish

### Implemented

- Preserved the existing hero movement controller, lane positioning, jump timing, slide timing, and collision behavior while keeping the imported `/assets/characters/hero/magician.gltf` as the player visual.
- Added a demon entity loaded from `/assets/characters/demon/Glub.gltf` with a visible fallback body if the asset fails. Animation 2 is used as the continuous chase animation; named Idle, Headbutt/Punch, and Death clips are detected for pause/catch/future states when present.
- Added a demon chase system with smooth following, level-based acceleration, catch distance, a short catch sequence, and Game Over after capture. The demon is clamped behind the player so it does not overtake visually before the catch resolves.
- Replaced the fixed obstacle strip with deterministic weighted handcrafted patterns: Jump, Lane Change, Slide, Jump -> Jump, Slide -> Lane, Lane -> Jump, Double Lane, Fake Safe Lane, and Alternating Left/Right.
- Added gradual difficulty scaling for runner speed, obstacle spacing, collectible spacing, demon speed, particle intensity, fog density, and HUD level display.
- Added demon proximity HUD, heartbeat-style vignette, stronger purple fog near capture, camera shake near capture, smoother camera anticipation, lane lean, and speed/FOV scaling.
- Expanded pooled particles with demon smoke, purple magical fog, and ambient rune sparkles while retaining running dust, landing dust, magic trail, and collection bursts.
- Improved fantasy lighting with stronger moonlight, purple ambient light, exponential fog, and low-cost torch/crystal point glows.

### Architectural decisions

- Pattern spawning remains lightweight and deterministic: a bounded obstacle pool is reassigned to pattern entries instead of allocating new hazards or using a server/random service.
- Demon pressure is gameplay-local only and has no wallet, MagicBlock, leaderboard, Solana, backend, or verification dependency.
- Proximity UI is driven by low-frequency HUD snapshots; React still does not run per-frame gameplay logic.

### Animation fallbacks

- Hero Jump continues using code-driven vertical movement while the Run animation keeps playing because no dedicated Jump clip is mapped for this MVP.
- Hero Roll remains mapped to Slide, and Hero Death remains mapped to the Fall/Death clip.
- Demon Animation 2 is used for chase as requested. Optional demon Idle/Attack/Death clips are detected by name and used when available.

### Validation

- `npm.cmd run lint` passes.
- `npm.cmd run typecheck` passes.
- `npm.cmd run build` passes.

### Known limitations

- No audio, settings, accessibility toggles, wallet, MagicBlock, Solana, leaderboard, or blockchain code was added.
- Power-ups, combo/multiplier polish, full post-processing, and device-measured performance tuning remain later work.
- Camera shake and fog intensity are currently always enabled as part of this milestone's tension pass; reduced-effects settings are deferred to Milestone 4.
- The lazy gameplay chunk is approximately 1.32 MB raw / 313 KB gzip after adding demon chase, fog, lighting, and particle polish.

### Readability follow-up

- Moved the demon chase band into the camera-visible space behind the hero, enlarged the demon visual, and tightened catch distance so the chase is visible before Game Over.
- Rebuilt jump-obstacle presentation as larger neutral stone rubble with layered geometry and non-purple materials, making it clearer that the player should jump over it.
- Clarified that no Slow Time/slowdown power-up is implemented yet; current speed behavior is gradual runner acceleration plus demon pressure only.
- Rebalanced the demon presentation after playtesting showed it could cover the player and track: the demon now renders smaller, lower, slightly off-center, with reduced smoke, fog, and vignette intensity while preserving the chase mechanics.

## 0.3.0 — Milestone 3: Arcane World and Hero Integration

### Implemented

- Kept the existing runner controller, lane interpolation, jump, slide, pause, restart, and AABB collision behavior intact while replacing development hazard visuals with environment-kit obstacle classes.
- Added visible obstacle classes for lane-change broken walls, jump stone blocks, and slide low beams. The former full-width development death trigger was removed; gameplay death now comes only from visible obstacle collisions.
- Added pooled Magic Essence, Arcane Crystal, and Rare Relic collectibles with float/rotation/glow presentation, score/item-count HUD updates, and pooled collection particles.
- Added lightweight pooled Babylon particle systems for running dust, landing dust, collection bursts, and a magical hero trail.
- Continued the pooled Ancient Arcane Ruins environment and added extra loaded kit modules used by gameplay obstacles.

### Architectural decisions

- Obstacle colliders are created only with visible obstacle roots. Each obstacle gets an immediate visible fallback mesh before its GLTF kit instance resolves, so async asset loading cannot create a ghost collision window.
- Collectibles are not registered as lethal colliders; they use their own ECS-style collection system and recycle forward with the same bounded track-pool approach as obstacles.
- Environment decoration remains presentation-only outside the playable lanes. No demon AI, audio, wallet, MagicBlock, leaderboard, Solana, power-up, or procedural generation work was started.

### Collision cleanup

- Removed every invisible placeholder lane/death collision volume from Milestone 2.
- Verified the only non-player gameplay colliders are visible recycled obstacle entities, each narrower than a lane and attached to a visible mesh or visible fallback.
- If a GLTF obstacle asset fails to load, its visible fallback remains in place so collision still corresponds to something the player can see.
- Removed the fixed center-lane slide obstacle at 142m after playtesting showed it could read as an invisible wall; the run no longer has a collision point at that distance.

### Validation

- `npm.cmd run typecheck` passes.
- `npm.cmd run lint` passes.
- `npm.cmd run build` passes.

### Known limitations

- Obstacle placement is a fixed recycled pattern for this milestone, not a full procedural grammar.
- Combo, multiplier, power-ups, demon pressure, audio, settings-driven reduced effects, and blockchain features remain future milestones.
- The lazy gameplay chunk is approximately 1.31 MB raw / 310 KB gzip after adding Babylon particle and extra kit modules; it is still lazy-loaded, but further code splitting may be useful in later performance work.

## 0.2.0 — Milestone 2: Core Runner

### Implemented

- Added a lazy-loaded Babylon.js `GameScene` with lighting, a smoothed third-person camera, a fixed 60 Hz simulation loop, and development-only debug overlay.
- Added typed component maps and direct systems for runner state, three-lane motion, jumping with gravity/coyote time/input buffering, sliding, and primitive collision checks.
- Added arrow-key/WASD/Space/Shift controls plus swipe input, pause/resume, restart, Return Home, Game Over, and fixed placeholder obstacle/death-trigger testing.

### Architectural decisions

- Babylon owns scene objects and camera presentation; lightweight component maps own gameplay values; React receives only low-frequency HUD/debug events and owns menus/overlays.
- Babylon imports use module-level entry points and the game remains lazy-loaded, reducing the runner bundle from roughly 6 MB to roughly 1 MB before compression and keeping it inside the PWA precache limit.
- The three training obstacles are fixed primitives for collision validation; no chunk recycling, procedural generation, demon, collectible, power-up, wallet, or blockchain code was introduced.

### Hero asset update

- Replaced the placeholder hero geometry with `/assets/characters/hero/magician.gltf` using the glTF 2 loader and its embedded animation groups.
- Added a visual-only animation controller: Animation 5 is Idle, 17 is Run, 16 is Roll for Slide, and 1 is Fall for Death. Jump preserves code-driven movement while the Run group continues.
- The imported hierarchy is parented to the existing player transform, preserving the established ECS movement, collider, and camera behavior.

### Environment kit update

- Inspected and classified the 176-module Medieval Village kit, then added a generic filename classifier and a documented catalog.
- Added Ancient Arcane Ruins chunk layouts built from actual floor, wall, arch, corner, doorway, roof, stair, balcony, overhang, debris, crate, and vine modules.

### Ruins density pass

- Layered the reusable Medieval Village modules into denser ruined facades, arches, balconies, broken roofs, stairs, supports, fences, debris, vines, wagons, and elevated details.
- Added deterministic off-lane decoration variation, mirroring, rotation, elevation, and pooled Babylon banner, torch, statue, and rubble dressing; all are presentation-only and reuse their chunk roots and shared materials.
- Superseded by Milestone 3: the former full-width development death trigger has now been removed completely.
- Kept the three lanes clear and preserved the fixed chunk pool, collision system, and gameplay mechanics. No dynamic lights or per-frame decoration allocation were added.
- Asset containers load once; Babylon instantiates scenery into a seven-chunk recycling pool. Scenery does not add gameplay collisions or procedural obstacle generation.

### Known limitations

- Collision is deliberately simple AABB overlap.
- Input sensitivity is a fixed MVP threshold; persisted settings and touch-button alternatives remain later work.
- The workspace has no Git metadata, so the requested internal commits could not be created.
- The in-app browser surface was unavailable for an interactive final check; lint, typecheck, and production build all pass.

## 0.1.0 — Milestone 1: Foundation

### Implemented

- Created a React 19, TypeScript, Vite, Tailwind, Framer Motion-ready, and PWA foundation.
- Added animated splash, loading, and Home screens that reach an actionable Demo button in under two seconds in the local build.
- Added an offline local Demo run with a restartable animated Arcane Ruins preview and no wallet or network dependency.
- Added installable PWA metadata, a custom icon, and a service-worker build configuration.

### Architectural decisions

- The foundation separates screen state from future game-frame state and keeps the initial asset bundle UI-only.
- Demo Mode is intentionally local and scoreless; Ranked Mode is represented by a clear deferred state until its dedicated milestone.
- No Babylon runtime, ECS, wallet adapter, Solana program, or ranked transaction path is included before its planned milestone.
- The project uses the stable Vite 4 line because newer Rollup/Rolldown native packages failed to load in the Windows validation environment.
- The PWA is registered with the browser's native service-worker API. PWA generation uses the Vite PWA/Workbox 6 compatibility line because Workbox 7 requires a native Rollup binary that fails in this Windows environment.

### Deviations and known limitations

- The Demo run is a visual foundation preview, not the interactive runner. Movement, jump/slide, hazards, scoring, Babylon rendering, and accessibility settings begin in later milestones.
- Wallet connection is not implemented; selecting it explains that Ranked Mode is not yet available.
- The service worker is configured and build-generated; offline install behavior must be verified from a served production build/browser context.
- Autoprefixer is not enabled in the initial PostCSS configuration because its optional browser-data dependency was unavailable in this environment; Tailwind compilation is unaffected.
- The initial launch transitions use lightweight CSS animation; Framer Motion remains installed for richer UI transitions in later UI work.
