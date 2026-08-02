function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initMap();
}
window.addEventListener('resize', resize);

// --- Trailer Glider Rendering ---
function drawTrailerGlider(ctx, isMainBody) {
    ctx.beginPath();

    const fuselageColor = isMainBody ? "#2b5b84" : "transparent";
    const wingColor = isMainBody ? "#e0e0e0" : "transparent";
    const detailColor = isMainBody ? "#d4a359" : "transparent";

    ctx.fillStyle = fuselageColor;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(5, -6);
    ctx.lineTo(3, 24);
    ctx.lineTo(-3, 24);
    ctx.lineTo(-5, -6);
    ctx.closePath();
    if (isMainBody) ctx.fill();

    ctx.fillStyle = wingColor;
    ctx.fillRect(-36, -8, 72, 10);

    if (isMainBody) {
        ctx.strokeStyle = "#1b3b54";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-36, -8, 72, 10);

        ctx.fillStyle = detailColor;
        ctx.beginPath();
        ctx.arc(-32, -3, 3, 0, Math.PI * 2);
        ctx.arc(32, -3, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = detailColor;
        ctx.beginPath();
        ctx.moveTo(-10, 18);
        ctx.lineTo(10, 18);
        ctx.lineTo(0, 26);
        ctx.closePath();
        ctx.fill();
    }
}

// --- HUD Update ---
function updateHUD() {
    document.getElementById('hudSpeed').innerText = Math.round(plane.speed);
    document.getElementById('hudAlt').innerText = Math.round(plane.altitude);
    document.getElementById('hudThrottle').innerText = Math.round(plane.throttle * 100);
    document.getElementById('hudBank').innerText = Math.round(plane.bankAngle * (180 / Math.PI));
    document.getElementById('hudTrailers').innerText = attachedTrailers.length;
}

// --- Main Game Loop ---
function gameLoop(time) {
    const dt = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;

    updatePhysics(dt);
    render();

    requestAnimationFrame(gameLoop);
}
