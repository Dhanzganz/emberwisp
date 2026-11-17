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
import { stepParticles, ring, burst, firework } from './particles.js';
import { stepBanner } from './banner.js';
import { PALETTE, TREE } from './config.js';
import { range, whole } from './random.js';

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

    stepBanner(state, dt);
    if (events.waveCleared) {
      // v3: the tree itself celebrates a cleared wave — a blossom burst
      // from the canopy the player just saved, so the reward moment
      // happens in the world, not only in a banner.
      ring(state.particles, TREE.x, TREE.y - 30, PALETTE.blossomSoft, 300, 3);
      burst(state.particles, state.next, TREE.x, TREE.y - 40, PALETTE.blossomSoft, 22, 200);
      burst(state.particles, state.next, TREE.x, TREE.y - 40, PALETTE.blossom, 12, 150);
    }
    if (events.treeGnawed) {
      state.tree.hurtFlash = 0.18;
      // The whole garden trembles while teeth are in the tree: a low rumble
      // for as long as the gnawing lasts, and a jolt as each shade latches.
      state.shake = Math.max(state.shake, 2.4);
      if (events.shadeLatched) state.shake = Math.max(state.shake, 6);
    }
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
      // v3: dawn is the game's biggest moment — it earns a firework show.
      state.celebration = 3.4;
      state.celebrationTimer = 0;
      events.runEnded = true;
    }
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 26);
  }

  // v3: on the dawn screen the sunrise eases in and the celebration
  // fireworks pop across the sky for a few seconds — the win keeps moving
  // after the last wave falls, instead of freezing into a static panel.
  if (state.screen === SCREEN_DAWN) {
    state.dawnGlow = Math.min(1, state.dawnGlow + dt / 1.6);
    if (state.celebration > 0) {
      state.celebration -= dt;
      state.celebrationTimer -= dt;
      if (state.celebrationTimer <= 0) {
        state.celebrationTimer = 0.3;
        const colors = [PALETTE.blossom, PALETTE.amber, PALETTE.spark, PALETTE.blossomSoft];
        firework(
          state.particles, state.next,
          TREE.x + range(state.next, -390, 390),
          TREE.y - range(state.next, 150, 330),
          colors[whole(state.next, 0, 3)],
        );
      }
    }
  }

  stepParticles(state.particles, dt, state.time);
  return events;
}
