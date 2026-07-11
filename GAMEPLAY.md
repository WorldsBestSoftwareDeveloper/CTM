# Catch the Magician Gameplay Systems

## Core loop

The magician runs through floating Ancient Arcane Ruins while a shadow demon closes in. The player changes lanes, jumps, slides, collects magic items, activates short power-ups, and survives as long as possible. A collision or the demon reaching the player ends the run.

The player opens the game, chooses **Play Demo** for an instant local Practice run or connects a wallet for **Ranked**. After a run, the result screen offers Global Leaderboard, Profile, and immediate Play Again. Demo results are local only; Ranked results follow the MagicBlock lifecycle defined in `ARCHITECTURE.md`.

## Movement and controls

- The runner moves continuously forward; the world advances toward the player.
- Lanes are left, centre, and right. Lane changes use a short eased lateral motion and accept buffered input.
- Left/right: arrow keys or A/D on desktop; horizontal swipe on mobile.
- Jump: Space or upward swipe. It clears low barriers and gaps using a generous, readable arc.
- Slide: Shift or downward swipe. It clears overhead barriers and has a clear start/end silhouette.
- Inputs are ignored only during a brief death transition; pause remains available throughout a live run.

## Chunks, obstacles, and fairness

The biome is a repeating set of seeded chunks: bridge/runway, floating island, ruined pillars, crystals, gates, and debris. Chunk rules guarantee a reachable lane or movement choice. The generator does not place an unavoidable jump/slide/lane combination, hide hazards entirely in fog, or require colour recognition.

MVP obstacles are broken walls, low spikes, magic barriers, overhead debris, rolling rocks, and bridge gaps. Each has a unique silhouette, contrast treatment, timing window, and collision shape. A short telegraph is required before every lethal obstacle.

## Collectibles, score, and power-ups

- **Magic Essence**: common collectible; increases score and persistent essence in Ranked Mode.
- **Arcane Crystal**: less common, higher-value collectible.
- **Rare Relic**: infrequent, high-value collectible with a strong visual cue.
- **Score** combines distance, collectible value, combo, and multiplier.
- **Combo** increases for uninterrupted collection/avoidance and resets after a collision or deliberate break in the chain.

Power-ups are short, readable, mutually understandable effects: Shield (one protection), Speed Boost (faster score/distance plus camera FOV), Magnet (nearby item pull), Slow Time (reduced world speed), Portal Jump (clears a defined hazard window), and Double Score. Effects use timers and a visible HUD slot; they do not stack into untestable combinations.

## Demon and difficulty

The demon remains visible behind the player whenever framing allows. Its proximity rises as the player makes mistakes or falls behind and falls after clean play; it never vanishes from the game fiction. Difficulty increases in stages by movement speed, spawn spacing, obstacle combinations, demon pressure, fog, music layers, and particles. The first minute teaches one mechanic at a time; later stages combine established mechanics without removing fair reaction time.

## Modes and persistence

**Demo Mode** loads the local demo profile and operates offline. It includes the complete runner loop, profile preview, and local result presentation but cannot submit a score.

**Ranked Mode** requires a connected wallet and active session key. At start the RunSession is delegated; checkpoints are written through MagicBlock ER; final score is committed, placed in the global leaderboard, and undelegated. PlayerProfile stores high score, distance, run count, and essence. The only MVP public board is Global.

## HUD and transitions

HUD shows distance, score, essence, combo/multiplier, level, active power-up, demon proximity, pause, and optional debug FPS. The death sequence is brief: impact feedback, result within a short transition, then clearly actionable Leaderboard, Profile, and Play Again controls.

