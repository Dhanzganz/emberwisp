// input.js — everything the player is doing with keyboard and mouse, kept in
// one object the simulation reads each step. The page owns the listeners; the
// sim never touches the DOM, so headless drivers can fake this object whole.

export function createInput() {
  return {
    /** Held movement keys, by direction name: up, down, left, right. */
    held: { up: false, down: false, left: false, right: false },
    /** Dash was pressed since the last step consumed it. */
    dashPressed: false,
    /** Confirm (Enter / Space on a menu) was pressed since last consumed. */
    confirmPressed: false,
    /** Pause was pressed since last consumed. */
    pausePressed: false,
    /** Mouse position in game coordinates, and whether the button is down. */
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    /** A click that landed this frame, in game coordinates (menus use it). */
    clickX: -1,
    clickY: -1,
  };
}

const KEY_DIRECTIONS = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
};

/**
 * Wires a canvas and window into the input object. `toGame` converts a mouse
 * event's client position into game coordinates (the canvas is scaled by CSS).
 */
export function bindInput(input, canvas, toGame) {
  window.addEventListener('keydown', (event) => {
    const direction = KEY_DIRECTIONS[event.code];
    if (direction) {
      input.held[direction] = true;
      event.preventDefault();
      return;
    }
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight' || event.code === 'Space') {
      if (!event.repeat) input.dashPressed = true;
      if (event.code === 'Space') event.preventDefault();
    }
    if (event.code === 'Enter') input.confirmPressed = true;
    if (event.code === 'KeyP' || event.code === 'Escape') input.pausePressed = true;
  });
  window.addEventListener('keyup', (event) => {
    const direction = KEY_DIRECTIONS[event.code];
    if (direction) input.held[direction] = false;
  });
  canvas.addEventListener('mousemove', (event) => {
    const point = toGame(event.clientX, event.clientY);
    input.mouseX = point.x;
    input.mouseY = point.y;
  });
  canvas.addEventListener('mousedown', (event) => {
    const point = toGame(event.clientX, event.clientY);
    input.mouseX = point.x;
    input.mouseY = point.y;
    input.mouseDown = true;
    input.clickX = point.x;
    input.clickY = point.y;
  });
  window.addEventListener('mouseup', () => {
    input.mouseDown = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
}

/** Clears the one-frame latches (dash, confirm, pause, click) after a step. */
export function consumeInput(input) {
  input.dashPressed = false;
  input.confirmPressed = false;
  input.pausePressed = false;
  input.clickX = -1;
  input.clickY = -1;
}
