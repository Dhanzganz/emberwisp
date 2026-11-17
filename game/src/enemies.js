// enemies.js — the shades that come for the Heartbloom. Five kinds share one
// hunger: cross the garden, latch onto the canopy, and gnaw. Moths flutter,
// brutes lumber, darts zigzag, and podmoths — plump, slow, and ripe — split
// into two quick pips when popped; the Gloom Moth boss arrives every fifth
// wave and sheds moths while it lives. All behaviour is here; drawing is not.

import { BOSS, PALETTE, SHADE, TREE, VIEW } from './config.js';
import { range } from './random.js';

export const KIND_MOTH = 'moth';
export const KIND_BRUTE = 'brute';
export const KIND_DART = 'dart';
export const KIND_SPLITTER = 'splitter';
export const KIND_PIP = 'pip';
export const KIND_BOSS = 'boss';

const KIND_STATS = {
  [KIND_MOTH]: { radius: 13, health: 2, speed: 1.0, gnaw: 1.0, score: 25 },
  [KIND_BRUTE]: { radius: 21, health: 6, speed: 0.62, gnaw: 1.9, score: 60 },
  [KIND_DART]: { radius: 10, health: 1, speed: 1.65, gnaw: 0.7, score: 40 },
  [KIND_SPLITTER]: { radius: 17, health: 3, speed: 0.8, gnaw: 1.2, score: 50 },
  [KIND_PIP]: { radius: 8, health: 1, speed: 1.72, gnaw: 0.5, score: 10 },
  [KIND_BOSS]: { radius: BOSS.radius, health: BOSS.health, speed: 1.0, gnaw: 2.9, score: BOSS.score },
};

/** Spawns one shade of `kind` just outside a random edge of the garden. */
export function spawnShade(state, kind) {
  const next = state.next;
  const stats = KIND_STATS[kind];
  const edge = Math.floor(next() * 4);
  const margin = 30;
  let x;
  let y;
  if (edge === 0) { x = range(next, 0, VIEW.width); y = -margin; }
  else if (edge === 1) { x = VIEW.width + margin; y = range(next, 0, VIEW.height); }
  else if (edge === 2) { x = range(next, 0, VIEW.width); y = VIEW.height + margin; }
  else { x = -margin; y = range(next, 0, VIEW.height); }
  const healthScale = 1 + (state.wave.number - 1) * 0.1;
  const moth = {
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: stats.radius,
    health: Math.round(stats.health * (kind === KIND_BOSS ? 1 : healthScale)),
    maxHealth: Math.round(stats.health * (kind === KIND_BOSS ? 1 : healthScale)),
    speedScale: stats.speed * range(next, 0.85, 1.15),
    gnawScale: stats.gnaw,
    score: stats.score,
    phase: range(next, 0, Math.PI * 2),
    latched: false,
    biteTimer: 0,
    shedTimer: BOSS.shedInterval,
    flash: 0,
    wobbleSeed: range(next, 0, Math.PI * 2),
  };
  state.moths.push(moth);
  return moth;
}

/** Which kinds a wave sends, and in what mix, as the night deepens. */
export function kindForSpawn(state) {
  const wave = state.wave.number;
  const roll = state.next();
  if (wave >= 3 && roll < 0.16) return KIND_BRUTE;
  if (wave >= 4 && roll > 0.86) return KIND_DART;
  if (wave >= 4 && roll > 0.75) return KIND_SPLITTER;
  return KIND_MOTH;
}

/**
 * The two pips a popped podmoth leaves behind, born at its body with a
 * little outward scatter so they do not stack on one point. Combat calls
 * this; the pips then home on the tree like any other shade.
 */
export function spawnPips(state, x, y) {
  for (const side of [-1, 1]) {
    const pip = spawnShade(state, KIND_PIP);
    pip.x = x + side * 13;
    pip.y = y + range(state.next, -8, 8);
    pip.phase = range(state.next, 0, Math.PI * 2);
    // Born mid-fight, a pip gets a breath before its teeth count: it must
    // not bite the wisp that popped its parent in the same instant.
    pip.biteTimer = 0.8;
  }
}

/**
 * Steps every shade: home toward the tree (each kind with its own gait),
 * latch on at the canopy and gnaw, bite the wisp on contact, and — for the
 * boss — shed fresh moths. Returns the events the caller turns into sound,
 * particles and score: {treeGnawed, wispBitten}.
 */
export function stepShades(state, dt, events) {
  const treeX = TREE.x;
  const treeY = TREE.y;
  for (const moth of state.moths) {
    moth.phase += dt * (moth.kind === KIND_DART || moth.kind === KIND_PIP ? 16 : 10);
    if (moth.flash > 0) moth.flash -= dt;
    if (moth.biteTimer > 0) moth.biteTimer -= dt;

    const dx = treeX - moth.x;
    const dy = treeY - moth.y;
    const distance = Math.hypot(dx, dy) || 1;
    const reach = TREE.canopyRadius + moth.radius * 0.4;

    if (distance <= reach) {
      // Latched: settle onto the canopy rim and gnaw.
      if (!moth.latched) {
        moth.latched = true;
        events.shadeLatched = true;
        const angle = Math.atan2(dy, dx);
        moth.x = treeX - Math.cos(angle) * reach;
        moth.y = treeY - Math.sin(angle) * reach;
      }
      const gnaw = (moth.kind === KIND_BOSS ? BOSS.gnawPerSecond : SHADE.gnawPerSecond * moth.gnawScale) * dt;
      state.tree.health -= gnaw;
      events.treeGnawed = true;
      continue;
    }

    const cruise = moth.kind === KIND_BOSS ? BOSS.speed : SHADE.speed;
    const speed = cruise * moth.speedScale;
    let moveX = (dx / distance) * speed;
    let moveY = (dy / distance) * speed;
    // Each gait bends the straight line home in its own way.
    const wobble = Math.sin(state.time * 3.1 + moth.wobbleSeed);
    if (moth.kind === KIND_MOTH) {
      moveX += -dy / distance * wobble * 26;
      moveY += dx / distance * wobble * 26;
    } else if (moth.kind === KIND_PIP) {
      // Pips skitter: short frantic darts from side to side as they close in.
      const skitter = Math.sin(state.time * 13 + moth.wobbleSeed);
      moveX += (-dy / distance) * skitter * 50;
      moveY += (dx / distance) * skitter * 50;
    } else if (moth.kind === KIND_SPLITTER) {
      // Podmoths roll heavily, swaying wide and slow.
      moveX += (-dy / distance) * wobble * 15;
      moveY += (dx / distance) * wobble * 15;
    } else if (moth.kind === KIND_DART) {
      const zig = Math.sin(state.time * 9 + moth.wobbleSeed) > 0 ? 1 : -1;
      moveX += (-dy / distance) * zig * 52;
      moveY += (dx / distance) * zig * 52;
    } else if (moth.kind === KIND_BOSS) {
      moveX += Math.cos(state.time * 1.4 + moth.wobbleSeed) * 12;
      moveY += Math.sin(state.time * 1.1 + moth.wobbleSeed) * 12;
      moth.shedTimer -= dt;
      if (moth.shedTimer <= 0) {
        moth.shedTimer = BOSS.shedInterval;
        const child = spawnShade(state, KIND_MOTH);
        child.x = moth.x + range(state.next, -20, 20);
        child.y = moth.y + range(state.next, -20, 20);
        events.bossShed = true;
      }
    }
    moth.vx = moveX;
    moth.vy = moveY;
    moth.x += moveX * dt;
    moth.y += moveY * dt;
  }
  biteWisp(state, events);
}

/** A shade that touches the wisp bites it (with a per-moth cooldown). */
function biteWisp(state, events) {
  const wisp = state.wisp;
  if (wisp.mercyTimer > 0) return;
  for (const moth of state.moths) {
    if (moth.latched || moth.biteTimer > 0) continue;
    const dx = moth.x - wisp.x;
    const dy = moth.y - wisp.y;
    const reach = moth.radius + wisp.radius;
    if (dx * dx + dy * dy < reach * reach) {
      moth.biteTimer = SHADE.biteCooldown;
      events.wispBitten = true;
      return;
    }
  }
}

/** Colours by kind, for particles that burst in the shade's own hue. */
export function shadeColor(kind) {
  if (kind === KIND_BRUTE) return PALETTE.bruteBody;
  if (kind === KIND_BOSS) return PALETTE.bossBody;
  if (kind === KIND_SPLITTER) return PALETTE.splitterBody;
  if (kind === KIND_PIP) return PALETTE.pipBody;
  if (kind === KIND_DART) return PALETTE.shadeWing;
  return PALETTE.shadeBody;
}

export function anyBossAlive(state) {
  return state.moths.some((moth) => moth.kind === KIND_BOSS);
}
