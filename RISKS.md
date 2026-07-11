# Technical Risks and Mitigations

| Risk | Likelihood / impact | Mitigation and fallback |
|---|---|---|
| Scope exceeds available time | High / High | Ship in milestone order; Demo Mode and core runner are non-negotiable, while optional VFX, extra obstacle variants, and profile cosmetics are cut first. |
| Cold start exceeds 15 seconds | Medium / High | Keep Home bundle separate; load only UI/fonts/Home scene at launch; measure cold launch on Android; use primitive fallback Home art. |
| Gameplay assets delay first play | Medium / High | Define minimum playable bundle, show phase progress/cancel, start with placeholders if a noncritical asset fails, background-load extras. |
| Mobile GPU cannot sustain 60 FPS | Medium / High | Enforce draw-call/mesh budgets from the first scene; instance/pool assets; quality tiers target stable 30 FPS fallback. |
| Memory pressure or WebGL context loss | Medium / High | Limit retained asset containers, cap particle pools, dispose scene resources, listen for context loss/restoration, offer restart to Home. |
| Effects reduce readability/accessibility | Medium / Medium | Silhouette-first hazards; settings for reduced bloom/shake, audio and sensitivity; test muted/reduced-effects play. |
| Wallet/MWA connection incompatibility | Medium / High | Capability detect adapters, isolate wallet provider, give clear retry/disconnect states, and always retain offline Demo Mode. |
| Session key expires or transaction fails | Medium / High | Display session status; create only for Ranked runs; retry recoverable transaction stages; fail safely to local result with a clear unsaved-score message. |
| MagicBlock ER or Devnet endpoint is unavailable | Medium / High | Configure endpoints; surface connection health; preserve full Demo Mode; provide a recorded Devnet demonstration path for judging. |
| Global leaderboard contention | Low / Medium | Use a bounded leaderboard and simple insertion/update logic; avoid daily/weekly/friend boards and background synchronization. |
| Browser score manipulation | High / Medium | Document the limitation honestly; use RunSession delegation/checkpoints and public score updates as the demonstration. Do not claim cheat-proof ranked competition. |
| PWA cache becomes stale/broken | Medium / Medium | Version cached assets; show update-ready prompt; precache only critical demo assets; test offline cold/warm starts. |
| Third-party asset licensing issue | Medium / High | Maintain source/license register in `ASSETS.md`; use project-owned placeholder until proof is recorded. |
| Landscape layout harms portrait-first game | Low / Medium | Keep gameplay portrait primary; use responsive HUD/camera safe areas and test rotation without forcing a reload. |

## Operational response

No backend, job queue, or manual operations are required for the MVP. If ranked services fail during a presentation, launch Demo Mode, which is intentionally independent of wallet, network, ER, and Devnet availability.

