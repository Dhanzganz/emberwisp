// state.js — one object holds the whole game: the wisp, the tree, every moth
// and bolt and pickup, and the garden itself (stars, grass, blossom trees at
// the edges) grown once from the seed. Screens are states of this object, so
// a restart is just a fresh state with the same seed.

import { TREE, VIEW, WISP } from './config.js';
import { makeRandom, range, whole } from './random.js';
import { createParticles, seedMotes } from './particles.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';
export const SCREEN_DAWN = 'dawn';

export function createState(seed) {
  const next = makeRandom(seed);
  const state = {
    seed,
    next,
    screen: SCREEN_TITLE,
    paused: false,
    /** Seconds since this state began (drives all ambient animation). */
    time: 0,
    /** Seconds the current run has lasted. */
    runTime: 0,
    score: 0,
    bestCombo: 1,
    kills: 0,
    wisp: {
      x: TREE.x,
      y: TREE.y + 150,
      vx: 0,
      vy: 0,
      radius: WISP.radius,
      lives: WISP.maxLives,
      fireTimer: 0,
      dashTimer: 0,
      dashCooldown: 0,
      mercyTimer: 0,
      /** Facing angle (toward the mouse), for the wisp's glow cone. */
      aim: -Math.PI / 2,
      /** Muzzle flash timer, set on each shot for the renderer. */
      flash: 0,
    },
    tree: {
      health: TREE.maxHealth,
      /** Hurt flash timer for the renderer. */
      hurtFlash: 0,
      /** Sway phase so the canopy breathes. */
      sway: range(next, 0, Math.PI * 2),
    },
    combo: {
      multiplier: 1,
      timer: 0,
      /** Kills in the current unbroken chain; drives the multiplier. */
      chain: 0,
    },
    wave: {
      number: 0,
      /** 'calm' between waves, 'active' while moths remain or still arrive. */
      phase: 'calm',
      phaseTimer: 1.2,
      toSpawn: 0,
      spawnTimer: 0,
      spawnInterval: 1,
      bossSpawned: false,
    },
    moths: [],
    bolts: [],
    pickups: [],
    particles: createParticles(),
    /** Camera shake, in pixels of remaining violence. */
    shake: 0,
    /** Slow-mo timer after a heavy hit (juice; the sim just steps less). */
    banner: null,
    garden: growGarden(next),
  };
  seedMotes(state.particles, next);
  return state;
}

/**
 * Grows the static garden backdrop from the random stream: a star field, a
 * ring of grass tufts and stones that keep clear of the tree, blossom trees
 * in the corners, and a soft mown ring around the Heartbloom. Pure decoration
 * with fixed positions — the renderer breathes life into it with sway.
 */
function growGarden(next) {
  const stars = [];
  for (let i = 0; i < 130; i += 1) {
    stars.push({
      x: range(next, 0, VIEW.width),
      y: range(next, 0, VIEW.height * 0.62),
      size: range(next, 0.7, 2.1),
      twinkle: range(next, 0, Math.PI * 2),
    });
  }
  const tufts = [];
  for (let i = 0; i < 250; i += 1) {
    const x = range(next, 14, VIEW.width - 14);
    const y = range(next, 14, VIEW.height - 14);
    const dx = x - TREE.x;
    const dy = y - TREE.y;
    if (dx * dx + dy * dy < 130 * 130) continue; // keep the tree's clearing clear
    tufts.push({ x, y, lean: range(next, -5, 5), tall: range(next, 9, 19), shade: range(next, 0, 1) });
  }
  const stones = [];
  for (let i = 0; i < 26; i += 1) {
    const x = range(next, 20, VIEW.width - 20);
    const y = range(next, 20, VIEW.height - 20);
    const dx = x - TREE.x;
    const dy = y - TREE.y;
    if (dx * dx + dy * dy < 120 * 120) continue;
    stones.push({ x, y, radius: range(next, 3, 9), shade: range(next, 0, 1) });
  }
  const cornerTrees = [];
  const corners = [
    { x: 64, y: 176 },
    { x: VIEW.width - 66, y: 182 },
    { x: 84, y: VIEW.height - 88 },
    { x: VIEW.width - 88, y: VIEW.height - 80 },
  ];
  for (const corner of corners) {
    const blossoms = [];
    const count = whole(next, 9, 14);
    for (let i = 0; i < count; i += 1) {
      blossoms.push({
        dx: range(next, -44, 44),
        dy: range(next, -30, 26),
        radius: range(next, 7, 15),
        tone: range(next, 0, 1),
      });
    }
    cornerTrees.push({ x: corner.x, y: corner.y, blossoms, sway: range(next, 0, Math.PI * 2) });
  }
  return { stars, tufts, stones, cornerTrees };
}

/** A fresh run in the same garden: same seed, title skipped, all counters reset. */
export function restartRun(state) {
  const fresh = createState(state.seed);
  fresh.screen = SCREEN_PLAY;
  return fresh;
}
