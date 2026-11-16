// random.js — a small seeded random generator. The whole garden grows from
// one seed, so a staged screenshot (and a fair replay) always grows the same
// garden: same stars, same petals, same moths in the same order.

/** Returns a function that yields the next float in [0, 1) of this stream. */
export function makeRandom(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** A float in [min, max) drawn from the stream. */
export function range(next, min, max) {
  return min + next() * (max - min);
}

/** An integer in [min, max] (both ends included) drawn from the stream. */
export function whole(next, min, max) {
  return min + Math.floor(next() * (max - min + 1));
}

/** One item of the array, drawn from the stream. */
export function pick(next, items) {
  return items[Math.floor(next() * items.length)];
}

/** True with probability `chance` (0..1), drawn from the stream. */
export function chance(next, probability) {
  return next() < probability;
}
