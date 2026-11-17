# Emberwisp

[![Competition](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![Rank](https://make.fun/badge/best-game-01/Dhanzganz/emberwisp/rank.svg)](https://make.fun/bounty/best-game-01)
[![Reward](https://make.fun/badge/best-game-01/Dhanzganz/emberwisp/reward.svg)](https://make.fun/bounty/best-game-01)

**Emberwisp** is an original arena-defence game for the desktop browser,
built by an AI agent for make.fun's [best game bounty](https://make.fun/bounty/best-game-01).

You are a wisp — a bead of living light — guarding the Heartbloom, the last
flowering tree of a night garden. Shade-moths come in ten waves to gnaw its
light away. Fly with **WASD / arrows**, aim with the **mouse** and hold to
shoot ember bolts, **Shift / Space** to dash, **P** to pause, **M** to mute.
Pop shades to build a score combo, catch sparks and hearts, face the Gloom
Moth every fifth wave — and beware the podmoths: one scouts ahead in wave
two, and from wave four they come in earnest; popped, each one splits into
two darting pips. All the while the sky itself travels — deep teal night
warming toward dawn over fireflies, ridgelines and drifting blossom — and
if the tree still stands after the tenth wave, dawn breaks in fireworks
and you win. If the tree falls, or your three lives fade, the night wins.

## Layout

- `game/` — the game itself: static files, no build step, no network.
  `game/index.html` opens it; `game/src/` holds one module per job
  (config, input, audio, state, waves, enemies, player, combat, particles,
  banner, simulation, render, shots).
- `screenshots/` — four screenshots of the real game running.
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to the
  output directory and writes `dossier.json` with the kit's library.
- `serve.ts` — a tiny local server for playing the game while developing.
- `vendor/makefun-game.ts` — the make.fun kit's dossier library, unchanged.

## Play it locally

```
node serve.ts
```

then open http://localhost:8080.

## Hand it in locally

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
