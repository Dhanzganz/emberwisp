# Emberwisp v2 — what changed, and the evidence it is better

v2 is a polish-and-variety pass over the scored v1 entry. Every change
below was verified headlessly: a Node harness (`../simtest.mjs`) plays
whole nights through the game's own simulation modules, and headless
Chromium rendered the real game for the screenshots. Baseline for
comparison is v1 measured with the same harness, same seed (20261116):
**dawn, score 22,962, 202 kills, 246 s, tree 66.7 HP, 2 lives left.**

## 1. A new enemy: the podmoth, and its pips (variety)

- New shade kind **podmoth** (from wave 4): a slow, wide-swaying carrier
  with two visible pip pods on its back. Popped, it **splits into two
  pips** — tiny, fast, skittering shades that dart side to side as they
  close in. It always drops a spark, so popping one is a decision:
  reward now, two new problems now.
- Evidence: simtest unit test parks a podmoth beside the wisp, shoots it
  dead, and counts **exactly 2 pips**. A full-night sim confirms
  podmoths take the field from wave 4. The wave-4 banner teaches the
  mechanic the moment it first appears ("Podmoths! Popped, they split
  into pips.").

## 2. Wave banners (clarity, rhythm)

- New `banner.js` module: wave starts, boss arrivals, the last wave and
  wave clears now raise a centred title banner with a one-line teaching
  subtitle (brutes at wave 3, podmoths at wave 4, boss waves named
  "THE GLOOM MOTH COMES"), replacing v1's small corner float-text.
- Evidence: simtest asserts a banner is raised during a played night;
  the retaken `3-peak.jpg` capture caught a live "WAVE 5 CLEARED —
  Breathe. Mend. The night deepens." banner in the real browser build.

## 3. Game feel (juice)

- **Kill rings:** every shade now dies in an expanding ring of its own
  hue (v1 rang only the boss), plus brighter impact bursts on heavy
  kinds (brutes, podmoths, the boss).
- **Hit-stop:** killing a brute, podmoth or the boss freezes the world
  for 0.05–0.09 s — weight you can feel, implemented in the frame loop
  so the fixed timestep is untouched.
- **Dash ghosts:** a dashing wisp leaves fading afterimage silhouettes
  along its path, on top of the existing ember trail.
- **Danger vignette:** while a shade gnaws the Heartbloom, the garden
  shakes continuously and the screen edges pulse red; below 30 HP the
  tree keeps a slow warning pulse. (Deliberately *not* added: floating
  per-hit damage numbers — bolts deal 1 damage at ~6 shots/s, so "1"s
  would be noise; hit feedback is carried by flash, knockback, bursts,
  rings and the health bars on multi-HP kinds.)
- Evidence: simtest asserts hit-stop = 0.050 s on a brute kill, dash
  ghosts appear during a played night, and shake peaks at 5.6 while a
  moth is latched and gnawing.

## 4. Onboarding (clarity)

- The title screen's objective line is now headed by an amber
  **"— OBJECTIVE —"** label, and the play screen gained a permanent
  bottom-left **HUD legend**: a drawn spark star "+15" and heart
  "+1 LIFE", so the two pickups explain themselves. Tree health, wave
  progress, lives, combo and dash state were already always visible
  and remain so.
- Evidence: visually verified in the retaken `1-start.jpg` and
  `2-play.jpg` (legend readable in the corner of both play frames).

## 5. Difficulty curve (balance)

- Waves 1–3 are gentler: fewer moths per wave (4+3n instead of 5+3n),
  a longer, slower trickle, and slower per-wave health scaling
  (0.10 instead of 0.12). The pressure the podmoths and pips add from
  wave 4 was tuned against the autopilot (podmoth health 3, ~11% of
  spawns, pips born with a 0.8 s bite grace so a pop can never bite
  unfairly in the same instant).
- Evidence (same harness, five seeds): the pilot **never falls before
  wave 4**; it earns dawn on 2 of 5 seeds and falls at waves 9–10 on
  the rest — a competent-player-winnable night with a real late-game
  wall. On the baseline seed v2 scores **24,239 with 229 kills** (v1:
  22,962 / 202) and still reaches dawn with 2 lives. An **idle player
  loses the tree in ~20 s of wave 1** — no stall states.

## 6. Stability

- All 14 source modules pass `node --check`; headless Chromium loaded
  the plain game and all four screenshot scenes with **zero console
  errors**; a long-night sim ends with no NaN anywhere in world state.
- The dossier build (`MAKEFUN_OUTPUT_DIR=… node main.ts`) run twice
  produces **byte-identical output**.
- Screenshots were retaken from the v2 build and visually inspected:
  title with objective, a wave-4 fight with the new HUD legend and a
  kill ring, the Gloom Moth latched at the tree mid-duel with its
  health bar, and the dawn end screen with the real run's stats
  (24,239 / 229 / 10 of 10 waves) and its restart button.
