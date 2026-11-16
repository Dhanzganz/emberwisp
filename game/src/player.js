// player.js — the wisp: flight with real acceleration and drag, a dash with
// i-frames and a cooldown, and ember bolts fired toward the mouse. Movement
// answers on the same step the key lands — no input lag, no easing tricks.

import { VIEW, WISP } from './config.js';
import { dropTrail } from './particles.js';

/**
 * Steps the wisp for one fixed step. `input` is the shared input object;
 * returns events ({fired, dashed}) the caller turns into sound and sparks.
 */
export function stepWisp(state, input, dt, events) {
  const wisp = state.wisp;

  // Aim always faces the mouse, even mid-dash.
  wisp.aim = Math.atan2(input.mouseY - wisp.y, input.mouseX - wisp.x);
  if (wisp.fireTimer > 0) wisp.fireTimer -= dt;
  if (wisp.dashCooldown > 0) wisp.dashCooldown -= dt;
  if (wisp.mercyTimer > 0) wisp.mercyTimer -= dt;
  if (wisp.flash > 0) wisp.flash -= dt * 6;

  // Flight: accelerate toward the held direction, drag when coasting.
  let driveX = 0;
  let driveY = 0;
  if (input.held.left) driveX -= 1;
  if (input.held.right) driveX += 1;
  if (input.held.up) driveY -= 1;
  if (input.held.down) driveY += 1;
  const driving = driveX !== 0 || driveY !== 0;
  if (driving) {
    const length = Math.hypot(driveX, driveY);
    wisp.vx += (driveX / length) * WISP.accel * dt;
    wisp.vy += (driveY / length) * WISP.accel * dt;
  }

  // Dash: a burst along the held direction (or the aim, if standing still).
  if (input.dashPressed && wisp.dashCooldown <= 0 && wisp.dashTimer <= 0) {
    const angle = driving ? Math.atan2(driveY, driveX) : wisp.aim;
    wisp.dashTimer = WISP.dashSeconds;
    wisp.dashCooldown = WISP.dashCooldown;
    wisp.vx = Math.cos(angle) * WISP.dashSpeed;
    wisp.vy = Math.sin(angle) * WISP.dashSpeed;
    events.dashed = true;
  }
  const dashing = wisp.dashTimer > 0;
  if (dashing) wisp.dashTimer -= dt;

  // Clamp to top speed unless a dash is carrying the wisp past it.
  const speed = Math.hypot(wisp.vx, wisp.vy);
  const cap = dashing ? WISP.dashSpeed : WISP.speed;
  if (speed > cap) {
    wisp.vx = (wisp.vx / speed) * cap;
    wisp.vy = (wisp.vy / speed) * cap;
  }
  if (!driving && !dashing) {
    const dragFactor = Math.max(0, 1 - WISP.drag * dt);
    wisp.vx *= dragFactor;
    wisp.vy *= dragFactor;
  }

  wisp.x += wisp.vx * dt;
  wisp.y += wisp.vy * dt;
  // The garden walls are soft hedges: stop at the edge, keep the slide.
  const margin = wisp.radius + 4;
  if (wisp.x < margin) { wisp.x = margin; wisp.vx = Math.max(0, wisp.vx); }
  if (wisp.x > VIEW.width - margin) { wisp.x = VIEW.width - margin; wisp.vx = Math.min(0, wisp.vx); }
  if (wisp.y < margin) { wisp.y = margin; wisp.vy = Math.max(0, wisp.vy); }
  if (wisp.y > VIEW.height - margin) { wisp.y = VIEW.height - margin; wisp.vy = Math.min(0, wisp.vy); }

  dropTrail(state.particles, wisp.x, wisp.y, wisp.radius * (dashing ? 1.25 : 0.9));

  // Firing: hold the mouse, bolts leave at a steady drumbeat toward the aim.
  if (input.mouseDown && wisp.fireTimer <= 0) {
    wisp.fireTimer = WISP.fireInterval;
    wisp.flash = 1;
    state.bolts.push({
      x: wisp.x + Math.cos(wisp.aim) * (wisp.radius + 6),
      y: wisp.y + Math.sin(wisp.aim) * (wisp.radius + 6),
      vx: Math.cos(wisp.aim) * WISP.boltSpeed,
      vy: Math.sin(wisp.aim) * WISP.boltSpeed,
      life: WISP.boltLife,
      radius: WISP.boltRadius,
    });
    events.fired = true;
  }
}

/** Steps every live bolt; bolts die of old age at the garden's edge of range. */
export function stepBolts(state, dt) {
  const bolts = state.bolts;
  for (let i = bolts.length - 1; i >= 0; i -= 1) {
    const bolt = bolts[i];
    bolt.life -= dt;
    bolt.x += bolt.vx * dt;
    bolt.y += bolt.vy * dt;
    if (bolt.life <= 0 || bolt.x < -20 || bolt.x > VIEW.width + 20 || bolt.y < -20 || bolt.y > VIEW.height + 20) {
      bolts.splice(i, 1);
    }
  }
}
