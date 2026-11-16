// waves.js — the night's director. Between waves the garden breathes for a
// few calm seconds; then the next wave trickles in from the edges, every
// fifth wave led by the Gloom Moth. Clear the tenth wave and dawn breaks.

import { BOSS, WAVES } from './config.js';
import { kindForSpawn, spawnShade, KIND_BOSS } from './enemies.js';
import { floatText } from './particles.js';
import { PALETTE } from './config.js';

/**
 * Steps the wave state machine. Returns events ({waveStarted, bossArrived,
 * nightCleared}) for sound and banners.
 */
export function stepWaves(state, dt, events) {
  const wave = state.wave;

  if (wave.phase === 'calm') {
    wave.phaseTimer -= dt;
    if (wave.phaseTimer <= 0) {
      beginWave(state, events);
    }
    return;
  }

  // Active: trickle the remaining moths in on their interval.
  if (wave.toSpawn > 0) {
    wave.spawnTimer -= dt;
    if (wave.spawnTimer <= 0) {
      wave.spawnTimer = wave.spawnInterval;
      wave.toSpawn -= 1;
      spawnShade(state, kindForSpawn(state));
    }
    return;
  }

  // Active and everything is in: the wave ends when the garden is clear.
  if (state.moths.length === 0) {
    if (wave.number >= WAVES.total) {
      events.nightCleared = true;
      return;
    }
    wave.phase = 'calm';
    wave.phaseTimer = WAVES.calmSeconds;
    events.waveCleared = true;
  }
}

/** Opens the next wave: counts its moths, sets the trickle, raises the boss. */
function beginWave(state, events) {
  const wave = state.wave;
  wave.number += 1;
  wave.phase = 'active';
  const total = WAVES.mothsInWave(wave.number);
  wave.toSpawn = total;
  wave.spawnInterval = WAVES.trickleSeconds(wave.number) / total;
  wave.spawnTimer = 0.4;
  wave.bossSpawned = wave.number % BOSS.everyWaves === 0;
  events.waveStarted = true;
  if (wave.bossSpawned) {
    spawnShade(state, KIND_BOSS);
    wave.toSpawn = Math.max(4, Math.floor(total / 2));
    events.bossArrived = true;
    floatText(state.particles, state.wisp.x, state.wisp.y - 44, 'THE GLOOM MOTH COMES', PALETTE.bossWing, 22);
  } else {
    floatText(state.particles, state.wisp.x, state.wisp.y - 44, `WAVE ${wave.number}`, PALETTE.textCream, 20);
  }
}

/** Short label for the HUD: what the night is doing right now. */
export function waveStatusText(state) {
  const wave = state.wave;
  if (wave.phase === 'calm') {
    if (wave.number === 0) return 'The night is young…';
    return `Wave ${wave.number} cleared — breathe`;
  }
  const left = wave.toSpawn + state.moths.length;
  return `Wave ${wave.number} of ${WAVES.total} — ${left} shades remain`;
}
