// render.js — everything the eye sees, drawn on one canvas in layers: night
// sky and garden, the Heartbloom tree, shades and bolts and pickups, the
// particle weather, the HUD, and the screens (title, pause, game over, dawn).
// Nothing here changes the world; it only reads state and paints it.

import { PALETTE, SCORE, TREE, VIEW, WAVES, WISP } from './config.js';
import { SCREEN_DAWN, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './state.js';
import { KIND_BOSS, KIND_BRUTE, KIND_DART } from './enemies.js';
import { PICKUP_HEART } from './combat.js';
import { waveStatusText } from './waves.js';

/** Button rectangles the screens draw and the menu clicks test against. */
export const BUTTON_START = { x: VIEW.width / 2 - 130, y: 566, w: 260, h: 58 };
export const BUTTON_RESTART = { x: VIEW.width / 2 - 130, y: 540, w: 260, h: 58 };

/** A soft radial glow disc — the basic light of this garden. */
function glow(ctx, x, y, radius, color, alpha) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function circle(ctx, x, y, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** The whole frame: world first, then HUD, then whichever screen veils it. */
export function drawFrame(ctx, state, input) {
  ctx.save();
  if (state.shake > 0.2) {
    const jolt = state.shake;
    ctx.translate((state.next() - 0.5) * jolt, (state.next() - 0.5) * jolt);
  }
  drawGarden(ctx, state);
  drawPickups(ctx, state);
  drawTree(ctx, state);
  drawShades(ctx, state);
  drawBolts(ctx, state);
  drawWisp(ctx, state);
  drawParticles(ctx, state);
  ctx.restore();

  if (state.screen === SCREEN_PLAY) drawHud(ctx, state);
  if (state.screen === SCREEN_TITLE) drawTitle(ctx, state, input);
  if (state.screen === SCREEN_OVER) drawEndPanel(ctx, state, input, false);
  if (state.screen === SCREEN_DAWN) drawEndPanel(ctx, state, input, true);
  if (state.paused && state.screen === SCREEN_PLAY) drawPause(ctx, state);
}

/** Sky, moon, lawn, stones, grass and the corner blossom trees. */
function drawGarden(ctx, state) {
  const garden = state.garden;
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  sky.addColorStop(0, PALETTE.nightTop);
  sky.addColorStop(0.55, PALETTE.nightBottom);
  sky.addColorStop(1, '#0a2422');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  // Stars, twinkling on their own phases (they thin out below the horizon).
  for (const star of garden.stars) {
    const alpha = 0.35 + 0.3 * Math.sin(state.time * 1.7 + star.twinkle);
    ctx.globalAlpha = Math.max(0.08, alpha);
    circle(ctx, star.x, star.y, star.size, '#dfefff');
  }
  ctx.globalAlpha = 1;

  // The moon, top right, with its halo.
  glow(ctx, 1130, 96, 120, '#cfe8ff', 0.5);
  circle(ctx, 1130, 96, 34, '#e8f3ff');
  circle(ctx, 1118, 88, 7, '#c9dcee');
  circle(ctx, 1142, 106, 5, '#c9dcee');

  // The lawn's heart: a warm glow pooled around the tree clearing.
  glow(ctx, TREE.x, TREE.y, 340, PALETTE.gardenGlow, 0.55);
  glow(ctx, TREE.x, TREE.y, 150, '#1d6a58', 0.5);

  // Stones lie still; grass leans with a slow wind.
  for (const stone of garden.stones) {
    ctx.fillStyle = stone.shade > 0.5 ? '#33565e' : '#28454c';
    ctx.beginPath();
    ctx.ellipse(stone.x, stone.y, stone.radius, stone.radius * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineWidth = 2;
  for (const tuft of garden.tufts) {
    const lean = tuft.lean + Math.sin(state.time * 1.3 + tuft.x * 0.05) * 2.2;
    ctx.strokeStyle = tuft.shade > 0.5 ? PALETTE.grassBlade : PALETTE.leafDark;
    ctx.beginPath();
    ctx.moveTo(tuft.x, tuft.y);
    ctx.quadraticCurveTo(tuft.x + lean * 0.4, tuft.y - tuft.tall * 0.6, tuft.x + lean, tuft.y - tuft.tall);
    ctx.stroke();
  }

  // Corner blossom trees frame the garden.
  for (const tree of garden.cornerTrees) drawCornerTree(ctx, state, tree);

  // A mown ring marks the clearing the wisp defends.
  ctx.strokeStyle = 'rgba(253,243,216,0.10)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(TREE.x, TREE.y, TREE.canopyRadius + 26, 0, Math.PI * 2);
  ctx.stroke();
}

function drawCornerTree(ctx, state, tree) {
  const sway = Math.sin(state.time * 0.9 + tree.sway) * 3;
  ctx.strokeStyle = PALETTE.trunkDark;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(tree.x, tree.y + 46);
  ctx.quadraticCurveTo(tree.x + sway * 0.4, tree.y + 16, tree.x + sway, tree.y - 8);
  ctx.stroke();
  for (const blossom of tree.blossoms) {
    const tone = blossom.tone;
    ctx.fillStyle = tone > 0.6 ? PALETTE.blossom : tone > 0.3 ? '#e86bb8' : '#c94f9e';
    ctx.globalAlpha = 0.9;
    circle(ctx, tree.x + blossom.dx + sway, tree.y + blossom.dy, blossom.radius);
  }
  ctx.globalAlpha = 1;
  glow(ctx, tree.x + sway, tree.y, 60, PALETTE.blossom, 0.13);
}

/** The Heartbloom: roots, trunk, and a canopy of glowing blossom that thins as it is gnawed. */
function drawTree(ctx, state) {
  const tree = state.tree;
  const healthFrac = Math.max(0, tree.health / 100);
  const sway = Math.sin(state.time * 0.8 + tree.sway) * 4;

  glow(ctx, TREE.x, TREE.y - 16, 170, PALETTE.blossom, 0.16 + healthFrac * 0.1);
  // Roots.
  ctx.strokeStyle = PALETTE.trunkDark;
  ctx.lineWidth = 7;
  for (const angle of [0.5, 1.6, 2.8, 3.9, 5.1]) {
    ctx.beginPath();
    ctx.moveTo(TREE.x, TREE.y + 8);
    ctx.quadraticCurveTo(
      TREE.x + Math.cos(angle) * 22, TREE.y + 14,
      TREE.x + Math.cos(angle) * 38, TREE.y + 20 + Math.sin(angle) * 5,
    );
    ctx.stroke();
  }
  // Trunk.
  ctx.strokeStyle = PALETTE.trunk;
  ctx.lineWidth = 15;
  ctx.beginPath();
  ctx.moveTo(TREE.x, TREE.y + 16);
  ctx.quadraticCurveTo(TREE.x + sway * 0.3, TREE.y - 14, TREE.x + sway, TREE.y - 40);
  ctx.stroke();
  // Canopy: layered blossom discs over a deep shadow layer; a hurt tree
  // flashes and sheds coverage.
  const hurt = tree.hurtFlash > 0;
  const discs = 9;
  for (let pass = 0; pass < 2; pass += 1) {
    for (let i = 0; i < discs; i += 1) {
      const angle = (i / discs) * Math.PI * 2 + tree.sway;
      const dist = i === 0 ? 0 : TREE.canopyRadius * 0.52;
      const x = TREE.x + Math.cos(angle) * dist + sway + (pass === 0 ? 7 : 0);
      const y = TREE.y - 34 + Math.sin(angle) * dist * 0.62 + (pass === 0 ? 9 : 0);
      const radius = (i === 0 ? 40 : 27) * (0.45 + healthFrac * 0.55);
      ctx.fillStyle = pass === 0 ? '#a03d84' : hurt ? '#ff8fa8' : i % 2 ? PALETTE.blossom : '#e86bb8';
      ctx.globalAlpha = 0.92;
      circle(ctx, x, y, radius);
    }
  }
  ctx.globalAlpha = 1;
  // Blossom lights dotted through the canopy.
  for (let i = 0; i < 12; i += 1) {
    const angle = i * 2.4 + tree.sway * 2;
    const dist = 14 + (i % 4) * 13;
    const x = TREE.x + Math.cos(angle) * dist + sway;
    const y = TREE.y - 34 + Math.sin(angle) * dist * 0.6;
    const pulse = 0.6 + 0.4 * Math.sin(state.time * 2.2 + i * 1.7);
    ctx.globalAlpha = pulse * healthFrac;
    circle(ctx, x, y, 2.6, PALETTE.blossomSoft);
  }
  ctx.globalAlpha = 1;
  circle(ctx, TREE.x, TREE.y + 4, TREE.trunkRadius * 0.55, PALETTE.trunkDark);
}

/** The wisp: a bead of amber light with a face, a glow, and a dash stretch. */
function drawWisp(ctx, state) {
  const wisp = state.wisp;
  // Mercy invulnerability flickers the whole sprite.
  if (wisp.mercyTimer > 0 && Math.floor(state.time * 14) % 2 === 0) return;
  glow(ctx, wisp.x, wisp.y, 74, PALETTE.amber, 0.55);
  glow(ctx, wisp.x, wisp.y, 30, PALETTE.ember, 0.5);

  const stretch = wisp.dashTimer > 0 ? 1.45 : 1;
  ctx.save();
  ctx.translate(wisp.x, wisp.y);
  ctx.rotate(wisp.aim);
  ctx.scale(stretch, 1 / Math.sqrt(stretch));
  const body = ctx.createRadialGradient(-3, -4, 1, 0, 0, wisp.radius + 2);
  body.addColorStop(0, '#fff6d8');
  body.addColorStop(0.55, PALETTE.amber);
  body.addColorStop(1, PALETTE.ember);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, 0, wisp.radius, 0, Math.PI * 2);
  ctx.fill();
  // Eyes look down the aim.
  circle(ctx, 4.5, -4, 2.1, '#40260d');
  circle(ctx, 4.5, 4, 2.1, '#40260d');
  ctx.restore();

  // Muzzle flash: a brief star at the snout when a bolt leaves.
  if (wisp.flash > 0.3) {
    const fx = wisp.x + Math.cos(wisp.aim) * (wisp.radius + 9);
    const fy = wisp.y + Math.sin(wisp.aim) * (wisp.radius + 9);
    glow(ctx, fx, fy, 20, PALETTE.spark, wisp.flash * 0.8);
  }
}

/** Ember bolts: bright beads with a short comet tail. */
function drawBolts(ctx, state) {
  for (const bolt of state.bolts) {
    const tailX = bolt.x - bolt.vx * 0.03;
    const tailY = bolt.y - bolt.vy * 0.03;
    ctx.strokeStyle = PALETTE.ember;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(bolt.x, bolt.y);
    ctx.stroke();
    glow(ctx, bolt.x, bolt.y, 13, PALETTE.ember, 0.7);
    circle(ctx, bolt.x, bolt.y, bolt.radius * 0.7, '#ffe9b0');
  }
}

/** The shades: flapping wings, hungry eyes; the boss wears a crown of horns. */
function drawShades(ctx, state) {
  for (const moth of state.moths) {
    const flap = Math.sin(moth.phase) * 0.55;
    const facing = Math.atan2(TREE.y - moth.y, TREE.x - moth.x);
    ctx.save();
    ctx.translate(moth.x, moth.y);
    ctx.rotate(facing + Math.PI / 2);

    const wingColor = moth.kind === KIND_BOSS ? PALETTE.bossWing
      : moth.kind === KIND_BRUTE ? PALETTE.bruteWing
        : PALETTE.shadeWing;
    const bodyColor = moth.kind === KIND_BOSS ? PALETTE.bossBody
      : moth.kind === KIND_BRUTE ? PALETTE.bruteBody
        : moth.kind === KIND_DART ? '#6f5fe0'
          : PALETTE.shadeBody;

    // Wings: two ellipses that beat with the phase.
    ctx.fillStyle = wingColor;
    ctx.globalAlpha = 0.82;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.rotate(side * (0.5 + flap * 0.5));
      ctx.beginPath();
      ctx.ellipse(side * moth.radius * 0.95, -moth.radius * 0.15, moth.radius * 0.95, moth.radius * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    // Body and head.
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, moth.radius * 0.55, moth.radius * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();
    circle(ctx, 0, -moth.radius * 0.72, moth.radius * 0.34, bodyColor);
    // A fresh hit flashes white over the body — a tint, never a swap, so
    // even the boss keeps its colours at the moment it is struck.
    if (moth.flash > 0) {
      ctx.globalAlpha = Math.min(0.8, moth.flash * 6);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, 0, moth.radius * 0.55, moth.radius * 0.78, 0, 0, Math.PI * 2);
      ctx.fill();
      circle(ctx, 0, -moth.radius * 0.72, moth.radius * 0.34, '#ffffff');
      ctx.globalAlpha = 1;
    }
    // Eyes glow amber — hunger you can read at a glance.
    circle(ctx, -moth.radius * 0.14, -moth.radius * 0.78, 1.9, PALETTE.spark);
    circle(ctx, moth.radius * 0.14, -moth.radius * 0.78, 1.9, PALETTE.spark);
    if (moth.kind === KIND_BOSS) {
      ctx.strokeStyle = PALETTE.bossWing;
      ctx.lineWidth = 3;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * moth.radius * 0.3, -moth.radius * 0.95);
        ctx.quadraticCurveTo(side * moth.radius * 0.7, -moth.radius * 1.5, side * moth.radius * 1.05, -moth.radius * 1.25);
        ctx.stroke();
      }
    }
    ctx.restore();

    // A latched shade shakes as it gnaws — and the boss shows a health bar.
    if (moth.latched && Math.floor(state.time * 10) % 2 === 0) {
      glow(ctx, moth.x, moth.y, moth.radius + 8, PALETTE.danger, 0.25);
    }
    if (moth.kind === KIND_BOSS || (moth.kind === KIND_BRUTE && moth.health < moth.maxHealth)) {
      const w = moth.radius * 2;
      const frac = Math.max(0, moth.health / moth.maxHealth);
      ctx.fillStyle = 'rgba(6,16,20,0.7)';
      ctx.fillRect(moth.x - w / 2, moth.y - moth.radius - 14, w, 5);
      ctx.fillStyle = moth.kind === KIND_BOSS ? PALETTE.bossWing : PALETTE.bruteWing;
      ctx.fillRect(moth.x - w / 2, moth.y - moth.radius - 14, w * frac, 5);
    }
  }
}

/** Pickups: a four-point spark star, or a heart that beats. */
function drawPickups(ctx, state) {
  for (const pickup of state.pickups) {
    const bob = Math.sin(state.time * 3 + pickup.phase) * 3;
    const blink = pickup.life < 2 ? (Math.floor(state.time * 8) % 2 === 0 ? 0.25 : 1) : 1;
    ctx.save();
    ctx.globalAlpha = blink;
    if (pickup.kind === PICKUP_HEART) {
      const beat = 1 + Math.sin(state.time * 5 + pickup.phase) * 0.12;
      glow(ctx, pickup.x, pickup.y + bob, 26, PALETTE.heart, 0.5);
      ctx.translate(pickup.x, pickup.y + bob);
      ctx.scale(beat, beat);
      ctx.fillStyle = PALETTE.heart;
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.bezierCurveTo(-11, -2, -7, -11, 0, -5);
      ctx.bezierCurveTo(7, -11, 11, -2, 0, 8);
      ctx.fill();
    } else {
      glow(ctx, pickup.x, pickup.y + bob, 24, PALETTE.spark, 0.55);
      ctx.translate(pickup.x, pickup.y + bob);
      ctx.rotate(state.time * 2 + pickup.phase);
      ctx.fillStyle = PALETTE.spark;
      ctx.beginPath();
      for (let i = 0; i < 8; i += 1) {
        const angle = (i / 8) * Math.PI * 2;
        const radius = i % 2 === 0 ? 9 : 3.4;
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

/** Trail, specks, rings, floating words, and the drifting motes on top. */
function drawParticles(ctx, state) {
  const particles = state.particles;
  for (const bead of particles.trail) {
    const frac = bead.life / bead.maxLife;
    glow(ctx, bead.x, bead.y, bead.radius * 2.2 * frac + 4, PALETTE.amber, 0.20 * frac);
  }
  for (const mote of particles.motes) {
    const alpha = 0.25 + 0.2 * Math.sin(state.time + mote.phase);
    ctx.globalAlpha = Math.max(0.05, alpha);
    circle(ctx, mote.x, mote.y, mote.size, mote.hue > 0.5 ? PALETTE.blossomSoft : PALETTE.spark);
  }
  ctx.globalAlpha = 1;
  for (const speck of particles.specks) {
    const frac = speck.life / speck.maxLife;
    ctx.globalAlpha = frac;
    if (speck.glow) glow(ctx, speck.x, speck.y, speck.size * 3, speck.color, 0.5 * frac);
    circle(ctx, speck.x, speck.y, speck.size * frac + 0.5, speck.color);
  }
  ctx.globalAlpha = 1;
  for (const wave of particles.rings) {
    const frac = wave.life / wave.maxLife;
    ctx.globalAlpha = frac * 0.8;
    ctx.strokeStyle = wave.color;
    ctx.lineWidth = wave.width * frac + 0.5;
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  for (const text of particles.texts) {
    const frac = text.life / text.maxLife;
    ctx.globalAlpha = Math.min(1, frac * 1.6);
    ctx.font = `700 ${text.size}px "Trebuchet MS", sans-serif`;
    ctx.fillStyle = text.color;
    ctx.fillText(text.text, text.x, text.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

/** The HUD: score and combo top-left, dawn progress top-centre, lives and dash top-right, tree health under the tree. */
function drawHud(ctx, state) {
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.textCream;
  ctx.font = '700 30px "Trebuchet MS", sans-serif';
  ctx.fillText(`${state.score}`, 22, 42);
  ctx.font = '600 13px "Trebuchet MS", sans-serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText('SCORE', 23, 60);

  // Combo meter: it pays to keep killing.
  if (state.combo.multiplier > 1) {
    const frac = state.combo.timer / SCORE.comboWindow;
    ctx.fillStyle = PALETTE.spark;
    ctx.font = '700 19px "Trebuchet MS", sans-serif';
    ctx.fillText(`COMBO ×${formatMultiplier(state.combo.multiplier)}`, 22, 88);
    ctx.fillStyle = 'rgba(6,16,20,0.65)';
    ctx.fillRect(22, 96, 120, 5);
    ctx.fillStyle = PALETTE.spark;
    ctx.fillRect(22, 96, 120 * Math.max(0, frac), 5);
  }

  // Dawn progress: a sky strip that fills as waves fall.
  const progress = Math.min(1, (state.wave.number - (state.wave.phase === 'calm' ? 1 : 0)) / WAVES.total);
  const stripW = 380;
  const stripX = VIEW.width / 2 - stripW / 2;
  ctx.fillStyle = 'rgba(6,16,20,0.65)';
  roundedRect(ctx, stripX, 16, stripW, 14, 7);
  ctx.fill();
  const dawnGrad = ctx.createLinearGradient(stripX, 0, stripX + stripW, 0);
  dawnGrad.addColorStop(0, '#274b8f');
  dawnGrad.addColorStop(1, '#ffb347');
  ctx.fillStyle = dawnGrad;
  if (progress > 0) {
    roundedRect(ctx, stripX, 16, stripW * progress, 14, 7);
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.textCream;
  ctx.font = '600 13px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(waveStatusText(state), VIEW.width / 2, 50);
  ctx.textAlign = 'left';

  // Lives as hearts, and the dash pip that refills.
  for (let i = 0; i < WISP.maxLives; i += 1) {
    const x = VIEW.width - 34 - i * 30;
    ctx.fillStyle = i < state.wisp.lives ? PALETTE.heart : 'rgba(185,214,206,0.25)';
    ctx.beginPath();
    ctx.moveTo(x, 40);
    ctx.bezierCurveTo(x - 10, 30, x - 6, 20, x, 26);
    ctx.bezierCurveTo(x + 6, 20, x + 10, 30, x, 40);
    ctx.fill();
  }
  const dashReady = state.wisp.dashCooldown <= 0;
  ctx.fillStyle = dashReady ? PALETTE.spark : 'rgba(185,214,206,0.4)';
  ctx.font = '600 13px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(dashReady ? 'DASH READY (SHIFT)' : 'dash…', VIEW.width - 22, 66);
  ctx.textAlign = 'left';

  // The tree's health, a bar rooted under the canopy.
  const barW = 190;
  const barX = TREE.x - barW / 2;
  const barY = TREE.y + 62;
  const frac = Math.max(0, state.tree.health / 100);
  ctx.fillStyle = 'rgba(6,16,20,0.7)';
  roundedRect(ctx, barX, barY, barW, 11, 5);
  ctx.fill();
  ctx.fillStyle = frac > 0.3 ? PALETTE.leaf : PALETTE.danger;
  if (frac > 0) {
    roundedRect(ctx, barX, barY, barW * frac, 11, 5);
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '600 11px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HEARTBLOOM', TREE.x, barY + 26);
  ctx.textAlign = 'left';
}

/** A translucent veil panel used by every screen. */
function veil(ctx, alpha) {
  ctx.fillStyle = `rgba(4,12,18,${alpha})`;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

function drawButton(ctx, rect, label, hovered) {
  ctx.fillStyle = hovered ? PALETTE.amber : 'rgba(255,179,71,0.16)';
  roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 12);
  ctx.fill();
  ctx.strokeStyle = PALETTE.amber;
  ctx.lineWidth = 2;
  roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 12);
  ctx.stroke();
  ctx.fillStyle = hovered ? '#2a1a05' : PALETTE.textCream;
  ctx.font = '700 24px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 8);
  ctx.textAlign = 'left';
}

function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

/** The title screen: the garden at rest, the name in lights, how to play. */
function drawTitle(ctx, state, input) {
  veil(ctx, 0.34);
  ctx.textAlign = 'center';
  // The name, lit like the blossom.
  ctx.font = '900 96px "Trebuchet MS", sans-serif';
  ctx.fillStyle = PALETTE.blossomSoft;
  ctx.fillText('EMBERWISP', VIEW.width / 2, 238);
  ctx.font = '900 96px "Trebuchet MS", sans-serif';
  ctx.strokeStyle = PALETTE.blossom;
  ctx.lineWidth = 2;
  ctx.strokeText('EMBERWISP', VIEW.width / 2, 238);
  ctx.font = '600 21px "Trebuchet MS", sans-serif';
  ctx.fillStyle = PALETTE.textCream;
  ctx.fillText('Guard the Heartbloom till dawn. Ten waves of shades are coming for its light.', VIEW.width / 2, 288);

  ctx.font = '600 18px "Trebuchet MS", sans-serif';
  ctx.fillStyle = PALETTE.textDim;
  const lines = [
    'WASD or arrows — fly        Mouse — aim, hold to shoot ember bolts',
    'SHIFT or SPACE — dash through danger        P — pause        M — mute',
    'Pop shades for sparks and combo. Catch hearts to mend your light.',
    'If the tree falls, or your three lives fade, the night wins.',
  ];
  lines.forEach((line, index) => ctx.fillText(line, VIEW.width / 2, 356 + index * 30));

  const hovered = pointInRect(input.mouseX, input.mouseY, BUTTON_START);
  drawButton(ctx, BUTTON_START, 'BEGIN THE NIGHT', hovered);
  ctx.font = '600 14px "Trebuchet MS", sans-serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText('or press ENTER', VIEW.width / 2, BUTTON_START.y + BUTTON_START.h + 30);
  ctx.textAlign = 'left';
}

/** The pause veil. */
function drawPause(ctx, state) {
  veil(ctx, 0.55);
  ctx.textAlign = 'center';
  ctx.font = '900 54px "Trebuchet MS", sans-serif';
  ctx.fillStyle = PALETTE.textCream;
  ctx.fillText('PAUSED', VIEW.width / 2, VIEW.height / 2 - 10);
  ctx.font = '600 17px "Trebuchet MS", sans-serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText('P or ESC to breathe again', VIEW.width / 2, VIEW.height / 2 + 30);
  ctx.textAlign = 'left';
}

/** One panel for both endings: the night won (over) or dawn broke (win). */
function drawEndPanel(ctx, state, input, dawn) {
  veil(ctx, dawn ? 0.38 : 0.6);
  if (dawn) {
    // Sunrise wash from the horizon.
    const sky = ctx.createLinearGradient(0, VIEW.height, 0, VIEW.height * 0.3);
    sky.addColorStop(0, 'rgba(255,179,71,0.34)');
    sky.addColorStop(1, 'rgba(255,179,71,0)');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }
  ctx.textAlign = 'center';
  ctx.font = '900 72px "Trebuchet MS", sans-serif';
  ctx.fillStyle = dawn ? PALETTE.amber : PALETTE.danger;
  ctx.fillText(dawn ? 'DAWN BREAKS' : 'THE NIGHT WINS', VIEW.width / 2, 268);
  ctx.font = '600 20px "Trebuchet MS", sans-serif';
  ctx.fillStyle = PALETTE.textCream;
  ctx.fillText(
    dawn ? 'The Heartbloom still blooms, and its light is yours.' : 'The last blossom fades… but gardens grow back.',
    VIEW.width / 2, 312,
  );

  ctx.font = '700 25px "Trebuchet MS", sans-serif';
  const stats = [
    `SCORE  ${state.score}`,
    `SHADES POPPED  ${state.kills}      BEST COMBO  ×${formatMultiplier(state.bestCombo)}`,
    `WAVES SURVIVED  ${Math.min(state.wave.number, WAVES.total)} of ${WAVES.total}      TIME  ${formatClock(state.runTime)}`,
  ];
  stats.forEach((line, index) => ctx.fillText(line, VIEW.width / 2, 386 + index * 40));

  const hovered = pointInRect(input.mouseX, input.mouseY, BUTTON_RESTART);
  drawButton(ctx, BUTTON_RESTART, dawn ? 'GUARD AGAIN' : 'TRY AGAIN', hovered);
  ctx.font = '600 14px "Trebuchet MS", sans-serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText('or press ENTER', VIEW.width / 2, BUTTON_RESTART.y + BUTTON_RESTART.h + 30);
  ctx.textAlign = 'left';
}

/** "3.5" for 3.50, "5" for 5.00 — combo numbers without trailing zeroes. */
function formatMultiplier(value) {
  return value.toFixed(2).replace(/\.?0+$/, '');
}

function formatClock(seconds) {
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${minutes}:${rest < 10 ? '0' : ''}${rest}`;
}

export { pointInRect };
