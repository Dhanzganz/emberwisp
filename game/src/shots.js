// shots.js — the staged scenes behind ?shot=start|play|peak|end. Each scene
// is the real game, played forward by an autopilot from a fresh garden with
// a fixed seed: the title as it opens, a third-wave fight, the fifth-wave
// boss at its height, and the dawn the autopilot honestly earns (it retries
// other seeds if a run falls, and settles for that run's ending either way).
// Nothing is drawn here that the game would not draw itself.

import { STEP, TREE, VIEW, WISP } from './config.js';
import { createState, SCREEN_DAWN, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './state.js';
import { stepWorld } from './simulation.js';
import { consumeInput } from './input.js';
import { KIND_BOSS } from './enemies.js';

const MAX_FAST_FORWARD = 60 * 60 * 14; // fourteen minutes of game time, worst case

/**
 * While staging the boss scene's first beat, the pilot guards the tree
 * only: it shoots shades that have latched on, but lets fliers — and the
 * Gloom Moth itself — stream in, so the boss reaches the canopy with a
 * crowd around it instead of dying alone mid-garden. Always false in
 * the live game.
 */
let treeGuardOnly = false;

/**
 * While staging the boss scene's second beat, the pilot duels the boss
 * alone and lets its shed moths gather — the crowd around the tree is
 * what makes the frame. Always false in the live game.
 */
let focusBossOnly = false;

/** Fills the input object the way a decent player would, for one step. */
export function pilotInput(state, input) {
  const wisp = state.wisp;
  const target = chooseTarget(state);
  input.held.up = input.held.down = input.held.left = input.held.right = false;
  input.dashPressed = false;
  input.mouseDown = false;

  // A hurt wisp detours for a heart when one is near and safe.
  let goalX = TREE.x;
  let goalY = TREE.y + 170;
  if (target) {
    const ring = target.latched ? 96 : 150;
    const angle = Math.atan2(target.y - TREE.y, target.x - TREE.x);
    goalX = target.x - Math.cos(angle) * 40;
    goalY = target.y - Math.sin(angle) * 40;
    if (!target.latched) {
      goalX = TREE.x + Math.cos(angle) * ring;
      goalY = TREE.y + Math.sin(angle) * ring;
    }
  }
  if (wisp.lives < WISP.maxLives) {
    const heart = state.pickups.find((pickup) => pickup.kind === 'heart');
    if (heart) { goalX = heart.x; goalY = heart.y; }
  }

  const dx = goalX - wisp.x;
  const dy = goalY - wisp.y;
  if (dx < -10) input.held.left = true;
  if (dx > 10) input.held.right = true;
  if (dy < -10) input.held.up = true;
  if (dy > 10) input.held.down = true;

  // Danger close: dash out of a moth's teeth.
  for (const moth of state.moths) {
    const mx = moth.x - wisp.x;
    const my = moth.y - wisp.y;
    if (mx * mx + my * my < 48 * 48) {
      input.dashPressed = true;
      input.held.left = mx > 0;
      input.held.right = mx < 0;
      input.held.up = my > 0;
      input.held.down = my < 0;
      break;
    }
  }

  if (target) {
    // Aim where the target will be when the bolt arrives.
    const distance = Math.hypot(target.x - wisp.x, target.y - wisp.y);
    const lead = distance / WISP.boltSpeed;
    input.mouseX = target.x + target.vx * lead;
    input.mouseY = target.y + target.vy * lead;
    input.mouseDown = distance < 620;
  } else {
    input.mouseX = wisp.x + Math.cos(wisp.aim) * 100;
    input.mouseY = wisp.y + Math.sin(wisp.aim) * 100;
  }
}

/** What to shoot: a gnawing moth first, then the one nearest the tree. */
function chooseTarget(state) {
  if (focusBossOnly) {
    const boss = state.moths.find((moth) => moth.kind === KIND_BOSS);
    if (boss) return boss;
  }
  let best = null;
  let bestScore = Infinity;
  const bossPresent = state.moths.some((moth) => moth.kind === KIND_BOSS);
  for (const moth of state.moths) {
    if (treeGuardOnly && bossPresent && !(moth.latched && moth.kind !== KIND_BOSS)) continue;
    const treeDist = Math.hypot(moth.x - TREE.x, moth.y - TREE.y);
    const score = (moth.latched ? -1000 : 0) + treeDist + (moth.kind === KIND_BOSS ? -60 : 0);
    if (score < bestScore) {
      bestScore = score;
      best = moth;
    }
  }
  return best;
}

/** Steps the staged state once under the pilot (used live during capture). */
export function stepShot(state, input) {
  pilotInput(state, input);
  stepWorld(state, input, STEP);
  consumeInput(input);
}

/**
 * A frozen copy of a live state, deep enough to hand to the renderer and
 * to keep playing from: actors and particles are copied item by item, the
 * garden and the random stream are shared (the garden never changes, and
 * the stream is just a stream).
 */
function snapshotState(state) {
  const copyItems = (list) => list.map((item) => ({ ...item }));
  return {
    ...state,
    wisp: { ...state.wisp },
    tree: { ...state.tree },
    combo: { ...state.combo },
    wave: { ...state.wave },
    banner: state.banner ? { ...state.banner } : null,
    moths: copyItems(state.moths),
    bolts: copyItems(state.bolts),
    pickups: copyItems(state.pickups),
    particles: {
      specks: copyItems(state.particles.specks),
      rings: copyItems(state.particles.rings),
      texts: copyItems(state.particles.texts),
      trail: copyItems(state.particles.trail),
      ghosts: copyItems(state.particles.ghosts),
      motes: copyItems(state.particles.motes),
    },
  };
}

/**
 * How crowded and alive a frame is — the play scene hunts the best one.
 * Shades near the tree count most: the photograph wants the siege, not a
 * skirmish at the garden's edge, and the boss counts once so its bulk
 * cannot dominate the score.
 */
function frameDensity(state) {
  let score = state.bolts.length + (state.combo.multiplier > 1 ? 2 : 0);
  for (const moth of state.moths) {
    if (moth.x < 40 || moth.x > VIEW.width - 40 || moth.y < 40 || moth.y > VIEW.height - 40) continue;
    const nearTree = Math.hypot(moth.x - TREE.x, moth.y - TREE.y) < 400;
    score += moth.kind === KIND_BOSS ? 1 : nearTree ? 3 : 1;
  }
  return score;
}

/**
 * Steps a live state forward under the pilot until `until(state)` holds,
 * the run ends, or the step cap runs out. Returns the state either way.
 */
function advance(state, input, until, cap = MAX_FAST_FORWARD) {
  let steps = 0;
  while (!until(state) && steps < cap) {
    pilotInput(state, input);
    stepWorld(state, input, STEP);
    consumeInput(input);
    steps += 1;
    if (state.screen === SCREEN_OVER || state.screen === SCREEN_DAWN) break;
  }
  return state;
}

/** Plays a fresh run forward under the pilot until `until(state)` is true. */
function fastForward(seed, input, until) {
  const state = createState(seed);
  state.screen = SCREEN_PLAY;
  return advance(state, input, until);
}

/**
 * Builds the staged state for a scene name. During capture the page keeps
 * stepping it with stepShot, so the frame stays alive and honest.
 */
export function stageShotScene(name, input) {
  if (name === 'play') {
    // The hunt: play one honest run and keep the single densest mid-game
    // frame — the garden full, bolts in the air, combo warm. A fixed
    // threshold kept landing on quiet instants; the best frame does not.
    const state = createState(20261116);
    state.screen = SCREEN_PLAY;
    let best = null;
    let bestDensity = -1;
    let steps = 0;
    while (state.screen === SCREEN_PLAY && steps < 60 * 60 * 6) {
      stepShot(state, input);
      steps += 1;
      if (state.wave.number >= 3 && state.wave.number <= 4 && state.kills >= 9) {
        const density = frameDensity(state);
        if (density > bestDensity) {
          bestDensity = density;
          best = snapshotState(state);
        }
      }
      if (state.wave.number > 4) break;
    }
    return best ?? state;
  }
  if (name === 'peak') {
    // The fifth wave, in two beats: the pilot guards the tree while the
    // Gloom Moth crosses the garden and latches on (see treeGuardOnly),
    // then engages — the staged moment is the brawl at the tree, boss
    // gnawing and shedding while the wisp duels it at point blank.
    const bossOf = (s) => s.moths.find((moth) => moth.kind === KIND_BOSS);
    treeGuardOnly = true;
    const state = fastForward(20261116, input, (s) => {
      const boss = bossOf(s);
      return boss !== undefined && boss.latched;
    });
    treeGuardOnly = false;
    if (state.screen === SCREEN_PLAY && bossOf(state)) {
      focusBossOnly = true;
      advance(state, input, (s) => {
        const boss = bossOf(s);
        return boss === undefined || boss.health <= boss.maxHealth * 0.7 || s.moths.length >= 6;
      }, 60 * 15);
      focusBossOnly = false;
    }
    return state;
  }
  if (name === 'end') {
    // A whole night, played to its end. Prefer dawn; a fallen run still
    // shows an honest ending screen, so keep the best attempt either way.
    let fallen = null;
    for (const seed of [20261116, 777001, 424242, 909090]) {
      const state = fastForward(seed, input, (s) => s.screen === SCREEN_DAWN);
      if (state.screen === SCREEN_DAWN) return state;
      if (!fallen || state.score > fallen.score) fallen = state;
    }
    return fallen;
  }
  // 'start' and anything unknown: the title over a fresh garden.
  const state = createState(20261116);
  state.screen = SCREEN_TITLE;
  return state;
}
