# MVP Asset Production Plan

Only assets required to ship the one-biome game are in scope. Every imported third-party asset needs a recorded source URL, license, attribution requirement, modification permission, and proof of commercial/event use if applicable. Prefer one coherent low-poly pack over visually conflicting downloads.

| Category | Asset / purpose | Format | Estimated poly budget | Load stage | Recommended source | License requirement | Placeholder strategy |
|---|---|---:|---:|---|---|---|---|
| Characters | Hero magician, rigged; white hair, robe, staff, cape | GLB | 4k–8k triangles | Minimum playable | Custom low-poly model or licensed low-poly character | Commercial-compatible, redistribution terms recorded | Primitive humanoid with purple material/staff |
| Characters | Shadow demon, rigged; eyes, chains, smoke anchors | GLB | 5k–10k triangles | Background | Licensed/custom low-poly monster | Commercial-compatible; rig modification permitted | Dark scaled humanoid with emissive eyes |
| Animations | Idle, run, jump, slide, roll, death | GLB animation clips | N/A | Minimum playable | Mixamo-compatible clips, retargeted | License and character-use compatibility recorded | Procedural bob/run and simple transform poses |
| Environment | Arcane runway, floating island, bridge, pillar, gate | GLB | 300–2k per unique prop | Minimum playable/background | Compatible low-poly fantasy environment pack | Commercial-compatible; retain attribution | Box/plane chunks with emissive rune decals |
| Environment | Crystals, debris, rune props | GLB | 50–800 each | Background / pooled | Same pack or simple authored meshes | Same compatible license | Instanced primitives |
| Models | Broken wall, spikes, barrier, overhead debris, rolling rock, gap markers | GLB | 100–1.5k each | Minimum playable / pooled | Authored simple meshes or compatible pack | Compatible commercial license | Cubes, cones, planes with high-contrast materials |
| Models | Essence, crystal, relic, shield/magnet/portal pickup | GLB | 50–500 each | Minimum playable / pooled | Authored simple stylized meshes | Compatible commercial license | Instanced sphere/crystal primitives |
| Effects | Magic trail, smoke, sparks, collection burst, fog, rune glow | Babylon particle config / texture PNG | N/A | Minimum playable/background | Babylon.js particle systems; authored textures | Texture license recorded | Flat colour particles/noise-free particles |
| UI | Logo, splash motif, panels, buttons, HUD frames | SVG/PNG/CSS | N/A | Startup | Custom-designed | Project-owned | Text/CSS cards |
| Icons | Controls, settings, audio, pause, power-ups, wallet status | SVG | N/A | Startup | Custom SVG set | Project-owned | Unicode/text labels only during development |
| Audio | Ambient loop, tension layers, footsteps, collect, magic, jump, slide, roar, game-over | OGG/MP3 | N/A | Essential/background | Licensed library or AI-generated with provenance | Explicit game-use license and generation/source record | Silent fallback or Web Audio tones |
| Fonts | Display and readable UI font | WOFF2 | N/A | Startup | Open font family | OFL/compatible license retained | System sans-serif |

## Pipeline rules

- Prefer GLB for meshes/animation, KTX2/compressed texture outputs where available, SVG for UI icons, WOFF2 fonts, and OGG for runtime audio where browser testing supports it.
- Keep material count low; atlas environment textures where practical. Do not add DCC automation or an asset server.
- Startup contains only fonts, icons, UI, and Home-scene materials. Hero, first chunk, essential obstacles, core VFX, and essential audio are minimum playable. Demon, extra chunks, music layers, and decorative variants load in the background.
- Asset containers, clones, particle systems, and audio emitters are pooled or cached. Dispose non-reusable source resources on scene teardown.

