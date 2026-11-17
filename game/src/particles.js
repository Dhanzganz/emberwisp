// particles.js — the garden's juice: every hit lands with a burst, every
// pickup floats its points to the sky, the wisp leaves a trail of light, and
// the air itself drifts with motes. Particles are pure decoration: they read
// the world, never change it, and are stepped after the rules each frame.

import { VIEW } from './config.js';
import { range } from './random.js';

export function createParticles() {
  return {
    /** Flying specks: {x, y, vx, vy, life, maxLife, size, color, drag, gravity, glow}. */
    specks: [],
    /** Expanding rings: {x, y, radius, speed, life, maxLife, color, width}. */
    rings: [],
    /** Floating score words: {x, y, life, text, color, size}. */
    texts: [],
    /** The wisp's fading trail: {x, y, life, maxLife, radius}. */
    trail: [],
    /** Afterimages the dash leaves behind: {x, y, aim, life, maxLife}. */
    ghosts: [],
    /** Ambient motes that drift forever: {x, y, phase, speed, size, hue}. */
    motes: [],
  };
}

/** Seeds the ambient motes that make the night air feel alive. */
export function seedMotes(particles, next, count = 70) {
  for (let i = 0; i < count; i += 1) {
    particles.motes.push({
      x: range(next, 0, VIEW.width),
      y: range(next, 0, VIEW.height),
      phase: range(next, 0, Math.PI * 2),
      speed: range(next, 4, 14),
      size: range(next, 1.2, 3.2),
      hue: range(next, 0, 1),
    });
  }
}

/** A burst of specks flying out of a point — a moth bursting, a spark popping. */
export function burst(particles, next, x, y, color, count, speed = 190) {
  for (let i = 0; i < count; i += 1) {
    const angle = range(next, 0, Math.PI * 2);
    const pace = range(next, speed * 0.25, speed);
    const life = range(next, 0.3, 0.75);
    particles.specks.push({
      x,
      y,
      vx: Math.cos(angle) * pace,
      vy: Math.sin(angle) * pace,
      life,
      maxLife: life,
      size: range(next, 1.6, 3.8),
      color,
      drag: 3.2,
      gravity: 60,
      glow: true,
    });
  }
}

/** A soft ring that expands and fades — dash wakes, boss deaths, dawn. */
export function ring(particles, x, y, color, speed = 260, width = 3) {
  particles.rings.push({ x, y, radius: 6, speed, life: 0.55, maxLife: 0.55, color, width });
}

/** A word that floats up and fades — "+25", "COMBO x3", "DASH READY". */
export function floatText(particles, x, y, text, color, size = 17) {
  particles.texts.push({ x, y, life: 1.05, maxLife: 1.05, text, color, size });
}

/** Drops one fading bead of the wisp's trail at its position. */
export function dropTrail(particles, x, y, radius) {
  particles.trail.push({ x, y, life: 0.34, maxLife: 0.34, radius });
  if (particles.trail.length > 90) particles.trail.splice(0, particles.trail.length - 90);
}

/**
 * Stamps one afterimage of the dashing wisp: a silhouette that holds its
 * place and aim while it fades, so a dash reads as a streak of selves.
 */
export function dropGhost(particles, x, y, aim) {
  particles.ghosts.push({ x, y, aim, life: 0.3, maxLife: 0.3 });
  if (particles.ghosts.length > 14) particles.ghosts.splice(0, particles.ghosts.length - 14);
}

/** Advances every decorative system by dt seconds. */
export function stepParticles(particles, dt, time) {
  const specks = particles.specks;
  for (let i = specks.length - 1; i >= 0; i -= 1) {
    const speck = specks[i];
    speck.life -= dt;
    if (speck.life <= 0) {
      specks.splice(i, 1);
      continue;
    }
    const dragFactor = Math.max(0, 1 - speck.drag * dt);
    speck.vx *= dragFactor;
    speck.vy = speck.vy * dragFactor + speck.gravity * dt;
    speck.x += speck.vx * dt;
    speck.y += speck.vy * dt;
  }
  const rings = particles.rings;
  for (let i = rings.length - 1; i >= 0; i -= 1) {
    const wave = rings[i];
    wave.life -= dt;
    wave.radius += wave.speed * dt;
    if (wave.life <= 0) rings.splice(i, 1);
  }
  const texts = particles.texts;
  for (let i = texts.length - 1; i >= 0; i -= 1) {
    const text = texts[i];
    text.life -= dt;
    text.y -= 34 * dt;
    if (text.life <= 0) texts.splice(i, 1);
  }
  const trail = particles.trail;
  for (let i = trail.length - 1; i >= 0; i -= 1) {
    trail[i].life -= dt;
    if (trail[i].life <= 0) trail.splice(i, 1);
  }
  const ghosts = particles.ghosts;
  for (let i = ghosts.length - 1; i >= 0; i -= 1) {
    ghosts[i].life -= dt;
    if (ghosts[i].life <= 0) ghosts.splice(i, 1);
  }
  for (const mote of particles.motes) {
    mote.y -= mote.speed * dt;
    mote.x += Math.sin(time * 0.7 + mote.phase) * 6 * dt;
    if (mote.y < -6) {
      mote.y = VIEW.height + 6;
      mote.x = (mote.x + 173) % VIEW.width;
    }
  }
}
