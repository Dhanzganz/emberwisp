// combat.js — where bolts meet shades. A hit flashes and knocks a moth; a
// kill bursts it into sparks, feeds the combo, and sometimes drops a pickup:
// sparks for score, hearts for life. Also here: the pickups' own drift and
// collection, and what happens when the wisp itself is hurt.

import { PALETTE, SCORE, WISP } from './config.js';
import { KIND_BOSS, KIND_BRUTE, shadeColor } from './enemies.js';
import { burst, floatText, ring } from './particles.js';
import { chance, range } from './random.js';

export const PICKUP_SPARK = 'spark';
export const PICKUP_HEART = 'heart';

/** Steps bolt-against-shade collisions for one fixed step. */
export function stepCombat(state, dt, events) {
  const bolts = state.bolts;
  for (let i = bolts.length - 1; i >= 0; i -= 1) {
    const bolt = bolts[i];
    let spent = false;
    for (let j = state.moths.length - 1; j >= 0; j -= 1) {
      const moth = state.moths[j];
      const dx = moth.x - bolt.x;
      const dy = moth.y - bolt.y;
      const reach = moth.radius + bolt.radius;
      if (dx * dx + dy * dy > reach * reach) continue;
      spent = true;
      moth.health -= 1;
      moth.flash = 0.12;
      // A knock shove, so hits feel like they land — scaled by the shade's
      // bulk, so a moth skids, a brute shrugs, and the Gloom Moth cannot
      // be pinned at range by bolt fire alone.
      const shoveScale = 13 / moth.radius;
      moth.x += bolt.vx * 0.012 * shoveScale;
      moth.y += bolt.vy * 0.012 * shoveScale;
      burst(state.particles, state.next, bolt.x, bolt.y, PALETTE.ember, 3, 130);
      if (moth.health <= 0) killShade(state, j, events);
      break;
    }
    if (spent) bolts.splice(i, 1);
  }
  // The combo cools if the wisp stops killing.
  const combo = state.combo;
  if (combo.timer > 0) {
    combo.timer -= dt;
    if (combo.timer <= 0) {
      combo.multiplier = 1;
      combo.chain = 0;
    }
  }
}

/** Removes the shade at `index`, pays its score, rolls its drops. */
function killShade(state, index, events) {
  const moth = state.moths[index];
  state.moths.splice(index, 1);
  state.kills += 1;

  const combo = state.combo;
  combo.chain += 1;
  combo.multiplier = Math.min(SCORE.comboMax, 1 + combo.chain * SCORE.comboStep);
  combo.timer = SCORE.comboWindow;
  state.bestCombo = Math.max(state.bestCombo, combo.multiplier);

  const gained = Math.round(moth.score * combo.multiplier);
  state.score += gained;
  const color = shadeColor(moth.kind);
  burst(state.particles, state.next, moth.x, moth.y, color, moth.kind === KIND_BOSS ? 46 : 14, moth.kind === KIND_BOSS ? 300 : 210);
  burst(state.particles, state.next, moth.x, moth.y, PALETTE.blossomSoft, 6, 140);
  floatText(state.particles, moth.x, moth.y - 12, `+${gained}`, PALETTE.textCream, moth.kind === KIND_BOSS ? 24 : 15);
  if (moth.kind === KIND_BOSS) {
    ring(state.particles, moth.x, moth.y, PALETTE.bossWing, 380, 5);
    state.shake = Math.max(state.shake, 13);
    events.bossDown = true;
  } else {
    events.mothDown = true;
  }

  // Drops: sparks often, hearts rarely — brutes and the boss are generous.
  if (moth.kind === KIND_BOSS) {
    dropPickup(state, PICKUP_HEART, moth.x, moth.y);
    dropPickup(state, PICKUP_SPARK, moth.x - 22, moth.y + 8);
    dropPickup(state, PICKUP_SPARK, moth.x + 22, moth.y + 8);
  } else if (moth.kind === KIND_BRUTE) {
    dropPickup(state, PICKUP_SPARK, moth.x, moth.y);
    if (chance(state.next, 0.2)) dropPickup(state, PICKUP_HEART, moth.x, moth.y);
  } else if (chance(state.next, 0.5)) {
    dropPickup(state, PICKUP_SPARK, moth.x, moth.y);
  }
}

function dropPickup(state, kind, x, y) {
  state.pickups.push({
    kind,
    x,
    y,
    vx: range(state.next, -24, 24),
    vy: range(state.next, -30, -6),
    life: 8,
    phase: range(state.next, 0, Math.PI * 2),
  });
}

/** Steps pickups: they drift, bob, age out, and fly to the wisp when close. */
export function stepPickups(state, dt, events) {
  const wisp = state.wisp;
  for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
    const pickup = state.pickups[i];
    pickup.life -= dt;
    if (pickup.life <= 0) {
      state.pickups.splice(i, 1);
      continue;
    }
    const dx = wisp.x - pickup.x;
    const dy = wisp.y - pickup.y;
    const distance = Math.hypot(dx, dy) || 1;
    if (distance < 120) {
      // Magnet: a kind pickup hurries to the wisp that earned it.
      const pull = 340 * (1 - distance / 120) + 60;
      pickup.vx += (dx / distance) * pull * dt * 4;
      pickup.vy += (dy / distance) * pull * dt * 4;
    }
    pickup.vx *= Math.max(0, 1 - 2.4 * dt);
    pickup.vy *= Math.max(0, 1 - 2.4 * dt);
    pickup.x += pickup.vx * dt;
    pickup.y += pickup.vy * dt;
    if (distance < wisp.radius + 13) {
      collectPickup(state, pickup, events);
      state.pickups.splice(i, 1);
    }
  }
}

function collectPickup(state, pickup, events) {
  if (pickup.kind === PICKUP_SPARK) {
    const gained = SCORE.spark;
    state.score += gained;
    state.combo.timer = Math.min(SCORE.comboWindow, state.combo.timer + 0.4);
    burst(state.particles, state.next, pickup.x, pickup.y, PALETTE.spark, 7, 130);
    floatText(state.particles, pickup.x, pickup.y - 10, `+${gained}`, PALETTE.spark, 13);
    events.sparkTaken = true;
  } else {
    if (state.wisp.lives < WISP.maxLives) {
      state.wisp.lives += 1;
      floatText(state.particles, pickup.x, pickup.y - 12, '+1 LIFE', PALETTE.heart, 16);
    } else {
      state.score += 150;
      floatText(state.particles, pickup.x, pickup.y - 12, '+150', PALETTE.heart, 15);
    }
    burst(state.particles, state.next, pickup.x, pickup.y, PALETTE.heart, 10, 150);
    events.heartTaken = true;
  }
}

/**
 * The wisp takes a bite: lose a life, flash mercy invulnerability, shake the
 * garden. Returns true when that was the last life (the run is over).
 */
export function hurtWisp(state, events) {
  const wisp = state.wisp;
  wisp.lives -= 1;
  wisp.mercyTimer = WISP.mercySeconds;
  state.shake = Math.max(state.shake, 10);
  state.combo.multiplier = 1;
  state.combo.chain = 0;
  state.combo.timer = 0;
  burst(state.particles, state.next, wisp.x, wisp.y, PALETTE.danger, 18, 240);
  ring(state.particles, wisp.x, wisp.y, PALETTE.danger, 240, 3);
  events.wispHurt = true;
  return wisp.lives <= 0;
}
