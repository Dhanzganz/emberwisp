// config.js — every tuning number and colour of Emberwisp lives here, so the
// rest of the code can talk in names ("the tree's reach") instead of literals.
// The palette is a night garden: deep teal dark, warm amber light, magenta
// blossom, and cold violet for the shades that hunt it.

export const VIEW = {
  width: 1280,
  height: 800,
};

/** The fixed simulation step, in seconds. The world always advances by this. */
export const STEP = 1 / 60;

export const TREE = {
  x: VIEW.width / 2,
  y: VIEW.height / 2 + 30,
  /** Radius of the canopy the wisp defends; shades chew it when they arrive. */
  canopyRadius: 74,
  /** Radius of the trunk core drawn at the centre of the garden. */
  trunkRadius: 17,
  maxHealth: 100,
};

export const WISP = {
  radius: 13,
  /** Top flight speed in pixels per second. */
  speed: 342,
  /** How fast the wisp reaches top speed; high means snappy controls. */
  accel: 2600,
  /** Drag applied per second when no key is held. */
  drag: 6.5,
  maxLives: 3,
  /** Seconds of mercy invulnerability after a hit. */
  mercySeconds: 1.6,
  /** Seconds between ember bolts while the mouse is held. */
  fireInterval: 0.16,
  boltSpeed: 780,
  boltRadius: 5,
  boltLife: 0.9,
  /** Dash: a short burst of speed with its own cooldown. */
  dashSpeed: 980,
  dashSeconds: 0.16,
  dashCooldown: 1.15,
};

export const SHADE = {
  /** Base flight speed of the smallest moth, pixels per second. */
  speed: 54,
  /** How hard a moth gnaws the tree, health per second while latched on. */
  gnawPerSecond: 2.6,
  /** Contact damage cooldown per moth against the wisp, seconds. */
  biteCooldown: 0.9,
};

export const BOSS = {
  everyWaves: 5,
  radius: 46,
  health: 56,
  speed: 30,
  gnawPerSecond: 5.5,
  /** The boss sheds a small moth every few seconds while it lives. */
  shedInterval: 3.4,
  score: 750,
};

export const WAVES = {
  /** Survive this many waves and dawn breaks: the player wins. */
  total: 10,
  /** Seconds of calm between one wave clearing and the next arriving. */
  calmSeconds: 3.2,
  /**
   * Moths in wave n (before the boss adds its own). The first three waves
   * are a gentle apprenticeship; the count — and the share of brutes, darts
   * and podmoths in it — climbs steeply from wave four to the tenth.
   */
  mothsInWave: (wave) => 4 + wave * 3,
  /** Seconds over which a wave's moths trickle in. */
  trickleSeconds: (wave) => Math.min(7 + wave * 1.4, 20),
};

export const SCORE = {
  moth: 25,
  brute: 60,
  spark: 15,
  /** Combo multiplier grows by this per kill inside the combo window. */
  comboStep: 0.25,
  comboWindow: 2.6,
  comboMax: 5,
};

export const PALETTE = {
  nightTop: '#071826',
  nightBottom: '#0d2f33',
  gardenGlow: '#14524a',
  grassBlade: '#1d6a58',
  pathSand: '#274b52',
  amber: '#ffb347',
  ember: '#ff7847',
  blossom: '#ff7ad9',
  blossomSoft: '#ffc7ec',
  leaf: '#39d98a',
  leafDark: '#1f7a4d',
  trunk: '#5a4030',
  trunkDark: '#3a281c',
  shadeBody: '#8f7ff5',
  shadeWing: '#c9c2ff',
  bruteBody: '#e0567a',
  bruteWing: '#ffb3c6',
  splitterBody: '#f59e6c',
  splitterWing: '#ffd9a8',
  pipBody: '#7a68e8',
  bossBody: '#b04df0',
  bossWing: '#c77dff',
  spark: '#ffe066',
  heart: '#ff5d73',
  // v3: the sky's journey across the night — deep teal night warming
  // toward a dawn that only truly arrives when the tenth wave falls.
  skyDawnTop: '#2b3a6e',
  skyDawnBottom: '#7a4a63',
  skyDawnFloor: '#33262e',
  horizonGlow: '#ff9d5c',
  ridgeFar: '#0d2434',
  ridgeNear: '#081a21',
  firefly: '#d8f79a',
  textCream: '#fdf3d8',
  textDim: '#b9d6ce',
  danger: '#ff4d5e',
};
