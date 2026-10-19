export const keys = {
  w: false, a: false, s: false, d: false,
  ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false,
  Space: false,
  e: false,
  '1': false, '2': false, '3': false,
  justPressed: { e: false, '1': false, '2': false, '3': false, Tab: false },
  mouse: { x: 0, y: 0, isDown: false, rightDown: false }
};

export function initInputHandlers(canvas) {
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'w') keys.w = true;
    if (k === 'a') keys.a = true;
    if (k === 's') keys.s = true;
    if (k === 'd') keys.d = true;
    if (e.key === 'ArrowUp') keys.ArrowUp = true;
    if (e.key === 'ArrowLeft') keys.ArrowLeft = true;
    if (e.key === 'ArrowDown') keys.ArrowDown = true;
    if (e.key === 'ArrowRight') keys.ArrowRight = true;
    if (e.key === ' ' || e.code === 'Space') keys.Space = true;

    if (k === 'e') {
      if (!keys.e) keys.justPressed.e = true;
      keys.e = true;
    }
    if (e.key === '1') {
      if (!keys['1']) keys.justPressed['1'] = true;
      keys['1'] = true;
    }
    if (e.key === '2') {
      if (!keys['2']) keys.justPressed['2'] = true;
      keys['2'] = true;
    }
    if (e.key === '3') {
      if (!keys['3']) keys.justPressed['3'] = true;
      keys['3'] = true;
    }
    if (e.key === 'Tab') {
      keys.justPressed.Tab = true;
    }
  });

  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'w') keys.w = false;
    if (k === 'a') keys.a = false;
    if (k === 's') keys.s = false;
    if (k === 'd') keys.d = false;
    if (e.key === 'ArrowUp') keys.ArrowUp = false;
    if (e.key === 'ArrowLeft') keys.ArrowLeft = false;
    if (e.key === 'ArrowDown') keys.ArrowDown = false;
    if (e.key === 'ArrowRight') keys.ArrowRight = false;
    if (e.key === ' ' || e.code === 'Space') keys.Space = false;

    if (k === 'e') keys.e = false;
    if (e.key === '1') keys['1'] = false;
    if (e.key === '2') keys['2'] = false;
    if (e.key === '3') keys['3'] = false;
  });

  if (canvas) {
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      keys.mouse.x = e.clientX - rect.left;
      keys.mouse.y = e.clientY - rect.top;
    });

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) keys.mouse.isDown = true;
      if (e.button === 2) keys.mouse.rightDown = true;
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) keys.mouse.isDown = false;
      if (e.button === 2) keys.mouse.rightDown = false;
    });

    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }
}

export function clearJustPressed() {
  keys.justPressed.e = false;
  keys.justPressed['1'] = false;
  keys.justPressed['2'] = false;
  keys.justPressed['3'] = false;
  keys.justPressed.Tab = false;
}
