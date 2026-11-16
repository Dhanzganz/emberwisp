// audio.js — every sound in Emberwisp is synthesized with WebAudio: no audio
// files, nothing to load, nothing to fetch. A tiny synth voice plays blips for
// shots and chimes for pickups, and a slow two-oscillator pad drifts under
// the garden as music. Sound starts on the first user gesture, as browsers
// require, and M mutes it.

export function createAudio() {
  return {
    context: null,
    master: null,
    muted: false,
    musicNodes: null,
    lastShotAt: 0,
  };
}

/** Creates the context on first use (call from a click or key handler). */
export function ensureAudio(audio) {
  if (audio.context) {
    if (audio.context.state === 'suspended') audio.context.resume();
    return;
  }
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return;
  audio.context = new Ctor();
  audio.master = audio.context.createGain();
  audio.master.gain.value = 0.5;
  audio.master.connect(audio.context.destination);
}

/** One short synth note: frequency glides from `from` to `to` over `seconds`. */
function blip(audio, from, to, seconds, type, volume, when = 0) {
  if (!audio.context || audio.muted) return;
  const ctx = audio.context;
  const start = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(30, to), start + seconds);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  osc.connect(gain).connect(audio.master);
  osc.start(start);
  osc.stop(start + seconds + 0.02);
}

export function playShoot(audio) {
  if (!audio.context || audio.muted) return;
  // Throttle: a held mouse fires faster than ears want individual blips.
  const now = audio.context.currentTime;
  if (now - audio.lastShotAt < 0.05) return;
  audio.lastShotAt = now;
  blip(audio, 880, 320, 0.09, 'square', 0.05);
}

export function playDash(audio) {
  blip(audio, 240, 720, 0.14, 'sine', 0.12);
}

export function playHit(audio) {
  blip(audio, 190, 60, 0.16, 'sawtooth', 0.14);
}

export function playMothDown(audio) {
  blip(audio, 620, 140, 0.18, 'triangle', 0.13);
  blip(audio, 1240, 300, 0.12, 'sine', 0.07, 0.02);
}

export function playSpark(audio, combo) {
  const lift = Math.min(combo, 8) * 40;
  blip(audio, 990 + lift, 1560 + lift, 0.11, 'sine', 0.1);
}

export function playHeart(audio) {
  blip(audio, 520, 780, 0.14, 'sine', 0.12);
  blip(audio, 780, 1040, 0.16, 'sine', 0.1, 0.09);
}

export function playWaveHorn(audio) {
  blip(audio, 196, 196, 0.3, 'triangle', 0.16);
  blip(audio, 294, 294, 0.34, 'triangle', 0.14, 0.1);
}

export function playBossRoar(audio) {
  blip(audio, 110, 55, 0.7, 'sawtooth', 0.2);
  blip(audio, 165, 82, 0.7, 'square', 0.08, 0.05);
}

export function playTreeHurt(audio) {
  blip(audio, 140, 90, 0.2, 'sawtooth', 0.1);
}

export function playDawn(audio) {
  // A small rising arpeggio: the night is over.
  const notes = [523, 659, 784, 1046];
  notes.forEach((note, index) => blip(audio, note, note, 0.34, 'sine', 0.12, index * 0.11));
}

export function playGameOver(audio) {
  const notes = [392, 330, 262, 196];
  notes.forEach((note, index) => blip(audio, note, note * 0.94, 0.4, 'triangle', 0.13, index * 0.16));
}

/** Starts the ambient pad: two detuned triangles breathing through a filter. */
export function startMusic(audio) {
  if (!audio.context || audio.musicNodes) return;
  const ctx = audio.context;
  const gain = ctx.createGain();
  gain.gain.value = 0.045;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 520;
  const first = ctx.createOscillator();
  first.type = 'triangle';
  first.frequency.value = 110;
  const second = ctx.createOscillator();
  second.type = 'triangle';
  second.frequency.value = 164.8;
  const breath = ctx.createOscillator();
  breath.type = 'sine';
  breath.frequency.value = 0.07;
  const breathGain = ctx.createGain();
  breathGain.gain.value = 0.02;
  breath.connect(breathGain).connect(gain.gain);
  first.connect(filter);
  second.connect(filter);
  filter.connect(gain).connect(audio.master);
  first.start();
  second.start();
  breath.start();
  audio.musicNodes = { gain, first, second, breath };
}

/** Toggles mute (the M key); returns the new muted state. */
export function toggleMute(audio) {
  audio.muted = !audio.muted;
  if (audio.master) audio.master.gain.value = audio.muted ? 0 : 0.5;
  return audio.muted;
}
