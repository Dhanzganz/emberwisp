// waves.js — the night's director. Between waves the garden breathes for a
// few calm seconds; then the next wave trickles in from the edges, every
// fifth wave led by the Gloom Moth. Clear the tenth wave and dawn breaks.

import { BOSS, WAVES } from './config.js';
import { kindForSpawn, spawnShade, KIND_BOSS } from './enemies.js';
import { raiseBanner } from './banner.js';

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
    raiseBanner(state, `WAVE ${wave.number} CLEARED`, 'Breathe. Mend. The night deepens.', 1.7);
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
    raiseBanner(state, 'THE GLOOM MOTH COMES', 'It sheds moths while it lives — end it.', 2.6);
  } else if (wave.number >= WAVES.total) {
    raiseBanner(state, 'THE LAST WAVE', 'Hold the garden till dawn.', 2.6);
  } else {
    raiseBanner(state, `WAVE ${wave.number}`, waveSubtitle(wave.number), 2.3);
  }
}

/** The banner's smaller line: each wave's new threat names itself once. */
function waveSubtitle(wave) {
  if (wave === 1) return 'The shades are coming for the light.';
  if (wave === 3) return 'Brutes lumber in — they take a beating.';
  if (wave === 4) return 'Podmoths! Popped, they split into pips.';
  if (wave === 6) return 'The dark thickens. Stay near the tree.';
  if (wave === 8) return 'Almost dawn. Do not let them latch.';
  return 'Guard the Heartbloom.';
}

/** Short label for the HUD: what the night is doing right now. */
export function waveStatusText(state) {
  const wave = state.wave;
  if (wave.phase === 'calm') {
    if (wave.number === 0) return 'The night is young…';
    return `Wave ${wave.number} of ${WAVES.total} cleared — breathe`;
  }
  const left = wave.toSpawn + state.moths.length;
  return `Wave ${wave.number} of ${WAVES.total} — ${left} shades remain`;
}
