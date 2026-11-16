// simulation.js — one fixed step of the whole world, in a strict order: the
// wisp, its bolts, the shades, the waves, the fighting, the pickups, and
// last the particle weather. Pure rules, no sound, no drawing: the live loop
// and the screenshot staging both call this, so a staged frame is a frame
// the real game could honestly reach.

import { SCREEN_DAWN, SCREEN_OVER, SCREEN_PLAY } from './state.js';
import { stepWisp, stepBolts } from './player.js';
import { stepShades } from './enemies.js';
import { stepWaves } from './waves.js';
import { stepCombat, stepPickups, hurtWisp } from './combat.js';
import { stepParticles, ring } from './particles.js';
import { PALETTE } from './config.js';

/**
 * Advances `state` by dt (one fixed step during play). Fills and returns an
 * events object naming everything that happened — the caller turns events
 * into sound and screen changes it owns.
 */
export function stepWorld(state, input, dt) {
  const events = {};
  state.time += dt;
  if (state.tree.hurtFlash > 0) state.tree.hurtFlash -= dt;

  if (state.screen === SCREEN_PLAY && !state.paused) {
    state.runTime += dt;
    stepWisp(state, input, dt, events);
    stepBolts(state, dt);
    stepShades(state, dt, events);
    stepWaves(state, dt, events);
    stepCombat(state, dt, events);
    stepPickups(state, dt, events);

    if (events.treeGnawed) state.tree.hurtFlash = 0.18;
    if (events.wispBitten && state.wisp.mercyTimer <= 0) {
      if (hurtWisp(state, events)) events.wispDown = true;
    }
    if (state.tree.health <= 0) {
      state.tree.health = 0;
      events.treeDown = true;
    }
    if (events.wispDown || events.treeDown) {
      state.screen = SCREEN_OVER;
      events.runEnded = true;
    } else if (events.nightCleared) {
      state.screen = SCREEN_DAWN;
      ring(state.particles, state.wisp.x, state.wisp.y, PALETTE.amber, 420, 5);
      ring(state.particles, state.wisp.x, state.wisp.y, PALETTE.blossomSoft, 300, 4);
      events.runEnded = true;
    }
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 26);
  }

  stepParticles(state.particles, dt, state.time);
  return events;
}
