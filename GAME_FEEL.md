# Game Feel Targets

## Principle

Responsiveness and readable play take priority over visual complexity. Every effect must confirm player intent or communicate risk; effects that obscure hazards are reduced or removed.

## Control feel

- **Lane switch:** begin feedback immediately, finish in a short eased motion, accept one buffered next input, and never drift between lane centres.
- **Jump:** immediate launch, slightly forgiving input buffer/coyote window, predictable landing, and a clear air silhouette.
- **Slide:** immediate low profile, a visible end transition, and no delayed collision state.
- **Pause:** opens instantly, freezes simulation, and restores without input loss.
- **Sensitivity:** touch-swipe threshold and touch-button option are adjustable in Settings.

## Camera and impact

The follow camera smooths positional changes without lagging behind lane intent. It uses a small look-ahead, brief FOV widening during speed boost, and only intentional shake events. Collision/death uses a short hit pause, a directional camera kick, and controlled vignette/flash; it must not rely on red-only feedback. Reduced Shake disables or greatly lowers these impulses.

## Animation, particles, and magic

Animation transitions blend run, jump, slide, roll, death, and power-up poses with no visible pose snap. Collection particles trigger at item contact, not after a delayed network/game event. Trails and rune particles are lightweight and pooled. Bloom is strongest on magic pickups and portals, limited around the player silhouette, and reduced by quality/accessibility settings.

## Demon tension and music

The demon's position, audio presence, smoke, eye glow, and camera framing increase with proximity. It should feel threatening but must not cover the playable lanes. Ambient music begins sparse; rhythm, percussion, and tension layers fade in at difficulty stages and demon escalation. Collection, jump, slide, power-up, hit, and game-over sounds are immediate and separately volume-controlled.

## Difficulty and readability

Each new mechanic appears in isolation before it is combined. Hazard telegraphs remain visible through fog and particles. Important silhouette, motion, sound, and contrast cues are redundant. The game must remain understandable with reduced bloom, reduced shake, muted audio, and colour-vision differences.

## Acceptance checks

- A player can switch lane, jump, slide, pause, and restart without perceptible UI delay.
- Collision feedback lasts long enough to explain failure but returns to an actionable result screen quickly.
- Lower-quality and reduced-effects settings preserve hazard readability.
- First-time Demo players can understand the three-lane controls from the first playable segment without a tutorial modal.

