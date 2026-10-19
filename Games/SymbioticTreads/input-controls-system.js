export const keys = {
  w: false, a: false, s: false, d: false,
  ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false
};

export function initInputHandlers() {
  window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) {
      keys[e.key] = true;
    }
  });

  window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) {
      keys[e.key] = false;
    }
  });
}