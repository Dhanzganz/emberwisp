// main.js — boots Emberwisp: finds the canvas, builds the first garden,
// wires input and sound, and runs the frame loop. The loop advances the
// world in fixed steps (so the game plays the same on every machine) and
// draws after. Menu clicks and keys move between screens; the simulation
// itself never hears about them.

import { STEP, VIEW } from './config.js';
import { createInput, bindInput, consumeInput } from './input.js';
import {
  createAudio, ensureAudio, startMusic, toggleMute,
  playShoot, playDash, playHit, playMothDown, playSpark, playHeart,
  playWaveHorn, playBossRoar, playTreeHurt, playDawn, playGameOver,
} from './audio.js';
import { createState, restartRun, SCREEN_OVER, SCREEN_DAWN, SCREEN_PLAY, SCREEN_TITLE } from './state.js';
import { stepWorld } from './simulation.js';
import { drawFrame, BUTTON_RESTART, BUTTON_START, pointInRect } from './render.js';
import { stageShotScene, stepShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const input = createInput();
const audio = createAudio();

/** Converts a mouse event's client position into game coordinates. */
function toGame(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * VIEW.width,
    y: ((clientY - rect.top) / rect.height) * VIEW.height,
  };
}
bindInput(input, canvas, toGame);

// Sound may only start from a gesture; the first one also starts the music.
function wakeAudio() {
  ensureAudio(audio);
  startMusic(audio);
}
window.addEventListener('pointerdown', wakeAudio, { once: false });
window.addEventListener('keydown', (event) => {
  wakeAudio();
  if (event.code === 'KeyM') toggleMute(audio);
});

// A ?shot= scene replaces the live game with a staged, deterministic frame.
const shotScene = new URLSearchParams(window.location.search).get('shot');
let state = createState(20261116);
if (shotScene) {
  state = stageShotScene(shotScene, input);
} else {
  state.screen = SCREEN_TITLE;
}

/** Turns one step's events into the sounds they deserve. */
function soundEvents(events) {
  if (events.fired) playShoot(audio);
  if (events.dashed) playDash(audio);
  if (events.mothDown) playMothDown(audio);
  if (events.bossDown) { playMothDown(audio); playHit(audio); }
  if (events.wispHurt) playHit(audio);
  if (events.sparkTaken) playSpark(audio, state.combo.multiplier);
  if (events.heartTaken) playHeart(audio);
  if (events.waveStarted) playWaveHorn(audio);
  if (events.bossArrived) playBossRoar(audio);
  if (events.treeGnawed && Math.random() < 0.06) playTreeHurt(audio);
  if (events.runEnded) {
    if (state.screen === SCREEN_DAWN) playDawn(audio);
    if (state.screen === SCREEN_OVER) playGameOver(audio);
  }
}

/** Menu logic: start, restart, pause — the clicks and keys between screens. */
function stepMenus() {
  if (state.screen === SCREEN_TITLE) {
    const clicked = input.clickX >= 0 && pointInRect(input.clickX, input.clickY, BUTTON_START);
    if (input.confirmPressed || clicked) {
      state = restartRun(state);
    }
  } else if (state.screen === SCREEN_OVER || state.screen === SCREEN_DAWN) {
    const clicked = input.clickX >= 0 && pointInRect(input.clickX, input.clickY, BUTTON_RESTART);
    if (input.confirmPressed || clicked) {
      state = restartRun(state);
    }
  } else if (state.screen === SCREEN_PLAY && input.pausePressed) {
    state.paused = !state.paused;
  }
}

let lastTimestamp = 0;
let accumulator = 0;

function frame(timestamp) {
  requestAnimationFrame(frame);
  if (!lastTimestamp) lastTimestamp = timestamp;
  let elapsed = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;
  if (elapsed > 0.25) elapsed = 0.25; // a stalled tab must not teleport the world
  accumulator += elapsed;
  while (accumulator >= STEP) {
    accumulator -= STEP;
    if (shotScene) {
      stepShot(state, input);
    } else {
      stepMenus();
      const events = stepWorld(state, input, STEP);
      soundEvents(events);
      consumeInput(input);
    }
  }
  drawFrame(ctx, state, input);
}
requestAnimationFrame(frame);
