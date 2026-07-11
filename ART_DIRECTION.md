# Catch the Magician — Art Direction

## Visual north star

Catch the Magician is a premium-feeling, mobile-first endless runner with the instant readability and momentum of Temple Run and Subway Surfers, reimagined as stylized dark fantasy. It should feel magical, dangerous, and elegant—not realistic, gritty, or visually noisy.

The visual target is **stylized low-poly fantasy**: large readable forms, intentional silhouettes, controlled detail, rich colour contrast, and satisfying motion. Every visual decision must preserve lane readability and mobile performance.

## Core visual language

- **Primary mood:** ancient mystery, speed, purple magic, suspended sky ruins.
- **Palette:** near-black plum, deep indigo, royal purple, violet, magenta, pale moonlit stone, and warm gold only for high-value readability cues.
- **Contrast rule:** playable routes stay darker and calmer; hazards, interaction points, and magic are brighter or more animated.
- **Geometry:** low-poly planes, faceted crystal forms, broad arches, broken columns, angular bridges, and deliberately oversized silhouettes.
- **Avoid:** photoreal textures, dense surface noise, excessive particle fog, flat grey stone, or effects that hide a lane boundary.

## Ancient Arcane Ruins biome

The MVP biome is a chain of floating ceremonial ruins over a deep indigo void. It combines broken temple platforms, narrow levitating causeways, fractured archways, rune monuments, violet crystals, and distant floating debris.

Foreground route pieces must read as clean, broad, three-lane paths. Background islands can be simplified silhouettes with sparse purple rim light. The world should suggest impossible height and ancient scale without requiring complex terrain or dense models.

### Environment style

- Stone is simplified, worn, and faceted: dark desaturated violet-grey base with pale chipped edges.
- Runes use restrained emissive violet lines and clear geometric symbols; they should pulse slowly rather than flash.
- Crystals are translucent-looking faceted meshes with a bright emissive core, not physically accurate glass.
- Floating islands use a clean platform silhouette above a tapered rock underside.
- Repeated props must be visually coherent through one shared material palette.

## Character design

### Hero magician

The hero is a young, fast-moving magician with a strong portrait-readable silhouette:

- White/silver hair creates an immediate focal point against the dark world.
- A short-to-medium purple robe, split cape panels, and crystal staff define the silhouette.
- Garments are stylized broad shapes, not cloth-simulation detail.
- Purple accents glow only at the staff crystal, trim, and brief movement trail.
- The run silhouette must remain recognizable while jumping and sliding, even at mobile distance.

Recommended target: **4k–8k triangles**, one rig, one primary material set, no dynamic cloth for the MVP.

### Demon

The demon is intentionally deferred from the current implementation, but future assets must follow this direction:

- Large, shadow-like, and asymmetrical; a broad upper silhouette should read behind the player.
- Red/pink-violet eyes and purple fire are its only high-intensity accents.
- Chains, smoke ribbons, and broken horn-like forms imply threat without high geometry density.
- It must remain visually separated from the player and never obscure lane hazards.

Recommended target: **5k–10k triangles**, one low-poly rig, layered particles instead of complex animated geometry.

## Obstacles and collectibles

### Obstacle design language

Each obstacle communicates its response through shape first, colour second, and motion third.

| Response | Visual language | Examples |
|---|---|---|
| Change lane | Tall, broad, lane-blocking silhouette | Broken wall, collapsed pillar, magic barrier |
| Jump | Low, wide obstacle with a bright top edge | Fallen stone, low spike bed, cracked rune block |
| Slide | Clear overhead horizontal bar/arch | Hanging debris, low arch, magical beam |
| Avoid / death | Strong cross-route boundary or collapsing edge | Bridge break, closing gate, void trigger |

Hazards need a distinct silhouette at reduced bloom, muted audio, and colour-vision differences. Do not rely on red/green differentiation or thin particles alone.

### Collectibles

Collectibles must be readable at speed and use simple faceted models:

- **Magic Essence:** small floating violet orb with a soft internal swirl.
- **Arcane Crystal:** medium faceted purple shard with a clean vertical silhouette.
- **Rare Relic:** gold-violet rune object with a larger glow halo and slower rotation.

Use movement, scale, and silhouette to express value before adding visual complexity.

## Lighting and materials

### Lighting

- Base scene: cool purple hemispheric fill plus a directional moon/key light.
- Key props: limited emissive crystals/runes; only a small number of dynamic lights near the player.
- Backdrop: dark sky gradient and distant rim-lit shapes; avoid a fully black background.
- Gameplay clarity: the route surface must remain brighter than the void, while hazards retain edge contrast.

### Materials

- Use a small reusable set: `stone_dark`, `stone_edge`, `rune_emissive`, `crystal_violet`, `hero_robe`, `hero_skin_hair`, `hazard_warning`.
- Prefer standard low-cost Babylon materials, vertex colour variation, and emissive maps/values over complex custom shaders.
- Reuse textures and atlas small props wherever possible. A material should be shared by many meshes.
- Avoid transparency overdraw on route geometry; reserve alpha for a few magic effects.

## Camera and post-processing

### Camera framing

- Portrait-primary, third-person camera positioned behind and above the hero.
- Keep all three lanes visible with clear lower-screen route context and open forward view.
- Hero sits near the lower-middle frame; the forward route occupies the upper-middle frame.
- Lane changes use slight camera lean; it settles smoothly after the movement.
- FOV changes are subtle and limited to speed/feel cues. No cinematic cuts during active play.

### Post-processing

Post-processing must support readability, not decorate every frame:

- Modest bloom for runes, crystals, portals, and hero magic only.
- Gentle depth/atmospheric fog, capped to preserve the next hazard telegraph.
- No chromatic aberration, heavy motion blur, or full-screen lens effects in the MVP.
- Every future effect must respect reduced-bloom and reduced-screen-shake settings.

## UI and animation style

### UI

- Dark translucent plum panels, rounded but angular rune-inspired corners, violet/magenta action states.
- Large numeric HUD values, concise all-caps labels, and high-contrast white/lilac text.
- Buttons should feel tactile: bright primary action, restrained outlined secondary action, clear disabled states.
- UI ornaments use thin rune lines and soft glows—not dense fantasy filigree.

### Animation

- Hero movement is snappy and readable: quick lane commitment, clean airborne arc, decisive slide profile.
- Use short blends between run, jump, slide, and death; no floaty easing on input response.
- Environment movement is slow and atmospheric; gameplay feedback is fast and precise.
- Particles trigger at the action moment, have short lifetimes, and are pooled.

## Performance budgets

Visual quality is constrained by a 60 FPS target on modern Android and a stable 30 FPS fallback.

- Draw calls: **under 100** during normal play.
- Active meshes: **under 300**.
- Hero: **4k–8k triangles**; demon: **5k–10k triangles**; common props: **50–2k triangles**.
- Materials: keep visible material variants low; reuse shared material instances.
- Dynamic lights: one directional + one hemispheric baseline; only a few local lights.
- Particles: small capped pools, adaptive quality tiers, no full-screen alpha storms.
- Use instancing for repeated pillars, crystals, debris, lane markers, collectibles, and simple hazards.
- Use LOD only where it produces measured benefit; prefer silhouette simplification and culling first.

## Asset naming conventions

Use lowercase kebab-case. Prefix by asset class and preserve variant numbers.

```text
chr-hero-magician-v01.glb
chr-demon-shadow-v01.glb
env-ruin-bridge-straight-v01.glb
env-ruin-pillar-broken-a-v01.glb
obs-wall-broken-v01.glb
obs-bar-overhead-v01.glb
col-essence-v01.glb
vfx-rune-burst-v01.json
mat-stone-dark-v01
tex-rune-atlas-v01.ktx2
sfx-collect-essence-v01.ogg
ui-icon-pause-v01.svg
```

Use `chr`, `env`, `obs`, `col`, `vfx`, `mat`, `tex`, `sfx`, `mus`, `ui`, and `ico` prefixes. Keep source/license records next to the procurement list in `ASSETS.md`.

## Recommended asset categories

- Hero and demon models/rigs
- Mixamo-compatible hero animation clips
- Low-poly ruin kit: bridge, platforms, pillars, arches, gates, debris, islands
- Obstacle primitives and high-readability variants
- Collectible/power-up meshes
- Rune/crystal texture atlas
- UI logo, panels, icons, and typography
- Ambient music layers and short gameplay sound effects

## Download versus procedural Babylon creation

### Download or create externally

Use licensed/custom external assets where a unique silhouette, rig, or authored motion matters:

- Hero character, demon, and their animation rigs/clips
- The core low-poly ruin kit and distinctive floating island meshes
- Logo, typography, polished UI illustrations, and core icon set
- Music, voice/roar, and high-quality SFX
- Base texture atlas, if one is needed after testing simple materials

### Create procedurally in Babylon.js

Use Babylon primitives and lightweight systems for repetition, variation, and effects:

- Lane markers, simple bridge segments, temporary collision props, and placeholder obstacles
- Crystals, rune discs, small debris, glow planes, and simple distant silhouettes
- Fog, magic trails, collection bursts, smoke, sparks, and rune particles
- Runtime colour/material variants, emissive pulses, floating/rotation motion, and instanced decorations
- Debug visuals and development-only collision helpers

Do not procedurally create hero/demon rigs, high-detail environment hero pieces, complex UI art, or authored music. The split should minimize production time while keeping the game visually cohesive and easy to optimize.
