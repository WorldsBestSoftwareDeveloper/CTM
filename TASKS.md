# Executable Task Breakdown

Complexity: XS (under 1 hour), S (1–3 hours), M (half day), L (up to a day). A task is complete only when its acceptance criteria are met.

## Milestone 1 completion

- [x] **T01** — Vite/React/TypeScript/Tailwind/Framer Motion/PWA foundation completed.
- [x] **T02** — animated splash, loading, and Home flow completed.
- [x] **T04** — local Demo Mode and deferred Ranked Mode state completed.
- [ ] T03 and T09–T24 remain scheduled for later milestones.

## Milestone 2 completion

- [x] **T05 (gameplay-scene scope)** — Babylon engine, reusable `GameScene`, React bridge, render loop, lighting, camera, and disposal completed. The lightweight CSS Home scene remains intentionally unchanged.
- [x] **T06** — typed component maps, direct entity factories, and a capped fixed-step gameplay simulation completed.
- [x] **T07** — portrait-first camera, three smooth lanes, keyboard/WASD controls, and swipe controls completed with a fixed MVP input threshold.
- [x] **T08** — responsive jump/slide states, primitive ground/obstacle/death collisions, pause/resume, restart, and Game Over return-to-Home completed.
- [ ] At the Milestone 2 handoff, T03 and T09–T24 remained scheduled for later milestones.

## Milestone 3 completion

- [x] **T09 (Arcane World scope)** — imported GLTF hero, visible environment-kit obstacles, pooled collectibles, and pooled particle effects completed. Demon factories remain excluded by the current milestone scope.
- [x] **T10 (Arcane World scope)** — pooled Ancient Ruins chunks and fixed recycled obstacle/collectible lanes completed with bounded object counts and readable lane coverage.
- [x] **T11 (collection/score scope)** — distance, score, Magic Essence, Arcane Crystal, and Rare Relic collection completed. Combo, multiplier, power-ups, and demon pressure remain future work.
- [ ] T03, T12–T24 remain scheduled for later milestones.

## Milestone 3.5 completion

- [x] **T09 (hero/demon scope)** — hero remains GLTF-backed with preserved movement/collision; demon GLTF loading, fallback visual, Animation 2 chase playback, and detected idle/attack/death animation hooks completed.
- [x] **T10 (pattern scope)** — fixed obstacle strip replaced with deterministic weighted handcrafted obstacle patterns, increasing difficulty gates, bounded obstacle pool reuse, and solvable lane responses.
- [x] **T11 (demon pressure scope)** — demon proximity, catch distance, smooth chase, level-based acceleration, catch Game Over, proximity HUD, and score/distance/collectible HUD completed.
- [x] **T15/T16 (visual-polish scope only)** — camera smoothing/anticipation/FOV/shake, fog intensity, pooled demon smoke, purple fog, ambient rune particles, running dust, landing dust, magic trail, and collect bursts completed. Audio, settings, and accessibility portions remain later work.
- [ ] T03, T12–T14, T16 audio/settings portions, and T17–T24 remain scheduled for later milestones.

## Milestone 4A completion

- [x] **T16 (audio integration scope only)** — ambient/chase music preload and crossfade, animation-phase footstep cues with speed fallback, non-overlapping demon roar cues, pause/death/restart cleanup, and reusable audio objects completed.
- [ ] T03 settings persistence, T12 power-ups, T13 final navigation, T14 loading manifest, T16 settings-driven audio controls, T17 accessibility, and T18–T24 remain scheduled for later milestones.

## Milestone 4B completion

- [x] **T03** — persisted lightweight settings completed for master/music/SFX volume, reduced screen shake, reduced bloom, and touch/swipe sensitivity.
- [x] **T16 (game-feel/settings scope)** — animation blending, camera feedback, pooled visual effects polish, HUD presentation pulses, audio settings controls, and reduced-effects hooks completed.
- [x] **T17 (settings/reduced-effects scope)** — reduced screen shake, reduced bloom, persisted controls, touch-operable settings panel, and desktop/mobile-friendly presentation completed.
- [ ] T12 power-ups, T13 final leaderboard/profile navigation, T14 loading manifest, T18 offline install validation, and T19–T24 remain scheduled for later milestones.

## Pre-Milestone 5 completion

- [x] **T02/T14 (startup presentation scope only)** — premium branded splash, premium loading presentation, official logo integration, loading statuses/tips, non-blocking hero preview, and smooth startup transitions completed.
- [ ] Full staged gameplay asset manifest/background loading, PWA offline install validation, and runtime cache work remain excluded until Milestone 5.

## Milestone 5 completion

- [x] **T02/T14 (production loading scope)** — premium loading and Home polish completed with official logos, CSS-only rune loading presentation, randomized tips, fade transitions, and no Babylon/gameplay asset fetch before Home.
- [x] **T18 (PWA install/cache scope)** — install prompt handling, official logo manifest assets, automatic service-worker update behavior, app-shell precache focus, and on-demand runtime caching for audio/character/environment assets completed.
- [x] **Repository hygiene** — added `.gitignore` for dependencies, build output, caches, logs, env files, and editor/OS files so source and public game assets remain push-ready.
- [ ] Full installed-device offline smoke testing remains part of later Demo-Ready QA because this workspace is not currently a Git repo and browser/device install verification is external to the production build step.

## Milestone 6A completion

- [x] **T19 (wallet-foundation scope)** — Devnet-only Solana Wallet Adapter providers, Wallet Standard desktop discovery, automatic Mobile Wallet Adapter support on compatible Android Chrome/PWA environments, reconnect/disconnect state, RPC network validation, wallet error recovery, Profile presentation, and future-session-key Ranked gating completed.
- [ ] MagicBlock, session keys, Anchor programs, on-chain profiles/runs, transactions, score submission, and leaderboards remain excluded until their approved milestones.

## Milestone 6B Phase 1 completion

- [x] **T20 (program-foundation scope)** — in-repository Anchor workspace, generated program identity, `PlayerProfile`, `RunSession`, `initialize_player`, `start_run`, `finish_run`, generated IDL/type bindings, frontend program configuration, and PDA helpers completed.
- [ ] Deployment, MagicBlock, session keys, delegation, checkpoints, score verification, and leaderboard state remain excluded from Phase 1.

## Milestone 6B Phase 2 completion

- [x] **T20 (frontend integration scope)** — deployed Devnet program connection, PlayerProfile initialization/fetch, RunSession start/finish, persisted run recovery, transaction progress, duplicate prevention, and on-chain profile refresh completed.
- [ ] MagicBlock, session keys, delegation, checkpoints, leaderboards, anti-cheat, and score verification remain excluded.

## Milestone 6C completion

- [x] **T21 (MagicBlock/session scope)** — MagicBlock session key creation/restoration, base-chain account delegation, Ephemeral Rollup finish, commit-and-undelegate settlement, single-flight session preparation, Devnet validation script, and frontend IDL/type regeneration completed.
- [ ] Checkpoints, leaderboards, anti-cheat, score verification, and leaderboard UI remain excluded until later approved milestones.

| ID | Description | Dependencies | Complexity | Acceptance criteria |
|---|---|---|---|---|
| T01 | Create Vite React/TypeScript app with Tailwind, Framer Motion, strict lint/type settings, and PWA baseline | None | S | Production build succeeds and app installs with valid icons/manifest. |
| T02 | Create route/screen shell and animated low-cost splash/loading/Home flow | T01 | S | Home is actionable in a measured ≤15-second cold launch budget. |
| T03 | Add persisted settings provider for audio, shake, bloom, and sensitivity | T01 | XS | Values survive reload and are keyboard/touch operable. |
| T04 | Add local demo profile and Demo/Ranked mode state | T02 | XS | Demo starts without wallet/network and is visibly local-only. |
| T05 | Create Babylon engine, Home scene, GameCanvas bridge, and safe disposal | T01,T02 | M | Home animation renders; route changes do not leak engine/scene resources. |
| T06 | Create lightweight `GameWorld`, typed components, entity factories, fixed-step loop | T05 | M | Systems update independent typed component maps; no generic ECS framework exists. |
| T07 | Implement portrait-first camera, runner lanes, desktop controls, and swipe input | T06,T03 | M | Left/right/jump/slide respond predictably on keyboard and touch. |
| T08 | Implement jump/slide collision states, pause, death, and immediate retry | T07 | S | Pause freezes simulation; collision reaches Game Over; Play Again starts a fresh run. |
| T09 | Build hero, demon, hazard, collectible, and VFX factories/pools | T06 | S | Repeated runs reuse objects without unbounded allocation; every gameplay collider has a visible object; demon remains visible behind the player where practical. |
| T10 | Implement recycled Ancient Ruins chunks and fair deterministic obstacle pattern coverage | T09 | M | Chunk count stays bounded and generated sequences have a valid response. |
| T11 | Implement collection, score, distance, Magic Essence, Arcane Crystal, Rare Relic tracking, and demon pressure | T08,T10 | M | HUD values reflect distance, score, collected item counts, level, and demon proximity during play. |
| T12 | Implement six power-ups with timers and readable feedback | T11 | M | Each power-up has a tested effect, expiry, and HUD indication. |
| T13 | Implement HUD, Game Over, leaderboard/profile navigation, and Play Again flow | T11 | S | Run end follows Game Over → Leaderboard → Profile → Play Again. |
| T14 | Add loading manifest, minimum playable bundle, progress/cancel UI, background loading, and placeholders | T05,T09 | M | Demo begins after minimum bundle; noncritical failure does not block play. |
| T15 | Add Babylon low/high quality tiers, performance overlay, instancing, culling, LOD where measured, and draw/mesh budgets | T10,T14 | M | Debug overlay reports metrics; normal play remains <100 draw calls and <300 active meshes. |
| T16 | Add audio, pooled VFX, animation blending, camera feedback, and dynamic music layers | T03,T11,T12 | M | Effects are responsive, pooled, and obey audio/reduced-effects settings. |
| T17 | Implement visual accessibility pass: silhouettes, contrast, reduced effects, orientation QA | T13,T16 | S | Hazards remain identifiable with muted audio and reduced effects. |
| T18 | Configure PWA precache/runtime cache and offline Demo smoke test | T14 | S | Installed app launches cached Demo Mode without network; Ranked is disabled offline. |
| T19 | Add Solana Wallet Adapter desktop connection and Mobile Wallet Adapter capability path | T01,T04 | M | **Complete in Milestone 6A.** Supported desktop/mobile wallet connect/disconnect/rejection states are isolated from Demo; final wallet/device smoke testing requires the manual prerequisites listed in the handoff. |
| T20 | Create Anchor program state and PlayerProfile/RunSession/GlobalLeaderboard instructions | T19 | L | Program tests cover profile init, session state, score ordering, and authorization. |
| T21 | Integrate MagicBlock Magic Router, session keys, account delegation, ER result settlement, and undelegation | T20 | L | **Complete in Milestone 6C.** A Devnet ranked run creates/restores a session key, delegates required PDAs, finishes through the session signer on ER, settles/undelegates, refreshes profile state, and avoids duplicate sessions. |
| T22 | Bind profile/global leaderboard reads to UI and prevent Demo submissions | T13,T21 | M | Ranked updates display after confirmation; Demo creates no transaction. |
| T23 | Add automated unit/integration/e2e smoke coverage for judge flow and settings | T18,T22 | M | Tests cover offline Demo, wallet failure, Ranked happy path, Game Over navigation, and settings persistence. |
| T24 | Run mobile performance/accessibility/recovery QA and produce deployment/runbook docs | T15,T17,T23 | M | Target-device evidence, recovery guidance, and Devnet configuration are documented. |
