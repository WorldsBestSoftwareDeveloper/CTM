# Medieval Village Kit Classification

Source: `public/assets/environment/Medieval Village MegaKit[Standard]/glTF/`

The inspected kit contains **176 glTF modules**. Module names are classified automatically by the same prefix rules used in `src/game/environment/EnvironmentCatalog.ts`.

| Category | Count | Interpretation for Arcane Ruins |
|---|---:|---|
| Floor | 17 | Route platforms, broken paving, suspended path segments |
| Wall | 20 | Ruin facades and side-route silhouettes |
| Corner | 8 | Broken building edges and lane-side framing |
| Doorway | 12 | Arcane gates, sealed portals, and facade openings |
| Roof | 39 | Partial overhangs and distant ruin caps only |
| Stairs | 19 | Raised side structures and background elevation |
| Balcony | 4 | Upper ruin ledges and visual depth |
| Overhang | 20 | Collapsed facade pieces and lane-side shadows |
| Props | 23 | Debris, crates, borders, fences, vines, and supports |
| Decorations | 14 | Windows, shutters, and vine details |
| Rocks | 0 | No dedicated rock-named modules; use brick/debris props and procedural shards |

## Active MVP representatives

The environment loader intentionally loads a small representative subset once: uneven-brick floor, uneven-brick wall, arch, exterior brick corner, round doorway wall, wooden roof, exterior stair, simple balcony, brick overhang, brick debris, crate, and vine.

These are assembled into three Ancient Arcane Ruins layouts—courtyard, collapsed facade, and ruined overlook—then reused by a seven-chunk pool. The route remains open and visually calm; modules frame it from the sides or above rather than create unplanned collisions.

## Performance policy

- Kit containers are loaded once and instantiated into the chunk pool.
- Seven chunk roots recycle ahead of the player; no modules are reloaded during a run.
- The active MVP uses floor, wall, arch, corner, doorway, roof variants, stairs, balconies, overhangs, window walls, supports, fences, chimneys, wagons, debris, crates, and vines rather than loading all 176 files. Banners, torches, statues, and rubble are lightweight Babylon primitives with shared materials because matching kit modules are not present.
- All kit scenery is presentation-only. Gameplay collision remains owned by the existing primitive collision layer until dedicated obstacle work is approved.
