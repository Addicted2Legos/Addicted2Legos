const input = { stickX: 0, stickY: 0 };

// --- Touch Control Handling ---
const bankContainer = document.getElementById('bankContainer');
const bankKnob = document.getElementById('bankKnob');
let bankTouchId = null;
let bankCenterX = 0;

bankContainer.addEventListener('touchstart', (e) => {
    if (isDead) return;
    const touch = e.changedTouches[0];
    bankTouchId = touch.identifier;
    const rect = bankContainer.getBoundingClientRect();
    bankCenterX = rect.left + rect.width/2;
    updateBankSlider(touch);
}, { passive: false });

window.addEventListener('touchmove', (e) => {
    if (isDead) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === bankTouchId) {
            updateBankSlider(e.changedTouches[i]);
        }
    }
}, { passive: false });

const resetBankSlider = () => {
    bankTouchId = null;
    if (!keysActive()) {
        input.stickX = 0;
    }
    bankKnob.style.transform = `translate(0px, 0px)`;
};

window.addEventListener('touchend', (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === bankTouchId) resetBankSlider();
    }
});

function updateBankSlider(touch) {
    const maxOffset = 55;
    let dx = touch.clientX - bankCenterX;
    dx = Math.max(-maxOffset, Math.min(maxOffset, dx));

    bankKnob.style.transform = `translate(${dx}px, 0px)`;
    input.stickX = dx / maxOffset;
}

// Throttle Control
const throttleContainer = document.getElementById('throttleContainer');
const throttleBar = document.getElementById('throttleBar');

function handleThrottle(e) {
    if (isDead) return;
    const touch = e.touches ? e.touches[0] : e;
    const rect = throttleContainer.getBoundingClientRect();
    let val = 1 - ((touch.clientY - rect.top) / rect.height);
    plane.throttle = Math.max(0, Math.min(1, val));
    throttleBar.style.height = `${plane.throttle * 100}%`;
}

throttleContainer.addEventListener('touchstart', handleThrottle, { passive: false });
throttleContainer.addEventListener('touchmove', handleThrottle, { passive: false });

// --- Keyboard Controls ---
const keys = {};
window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
    }
});
window.addEventListener('keyup', e => keys[e.code] = false);

function keysActive() {
    return keys['ArrowLeft'] || keys['ArrowRight'] || keys['ArrowUp'] || keys['ArrowDown'] || keys['KeyA'] || keys['KeyD'] || keys['KeyW'] || keys['KeyS'];
}

const AUTO_CLIMB_STICK_Y = -0.5; // gentle auto nose-up pitch so touch players don't need a pitch control

function processKeyboardInputs() {
    if (isDead) return;

    if (keys['ArrowLeft'] || keys['KeyA']) input.stickX = -1.0;
    else if (keys['ArrowRight'] || keys['KeyD']) input.stickX = 1.0;
    else if (!bankTouchId) input.stickX = 0;

    if (keys['ArrowUp'] || keys['KeyW']) input.stickY = -1.0;
    else if (keys['ArrowDown'] || keys['KeyS']) input.stickY = 1.0;
    else input.stickY = AUTO_CLIMB_STICK_Y;

    if (keys['ShiftLeft'] || keys['ShiftRight'] || keys['KeyE']) {
        plane.throttle = Math.min(1.0, plane.throttle + 0.012);
    }
    if (keys['Space'] || keys['KeyQ']) {
        plane.throttle = Math.max(0.0, plane.throttle - 0.012);
    }

    throttleBar.style.height = `${plane.throttle * 100}%`;
}
