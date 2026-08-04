/**
 * MAIN
 * Boots the game: builds the map, wires DOM <-> state, and runs the loop.
 * This file should stay thin — it delegates to render.js / game.js / input.js.
 */
(function () {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const stage = document.getElementById('stage');
  const resourceBarEl = document.getElementById('resource-bar');
  const buildBarEl = document.getElementById('build-bar');
  const waveNumEl = document.getElementById('wave-num');
  const buildingPanel = document.getElementById('building-panel');
  const placementBar = document.getElementById('placement-bar');
  const gameOverEl = document.getElementById('game-over');

  const mapData = MAPS.frontierCanyon();
  let state = createInitialState(mapData);
  let selectedBuilding = null;

  // ---------- Canvas sizing (responsive, mobile-friendly) ----------
  function resizeCanvas() {
    const availW = stage.clientWidth - 12;
    const availH = stage.clientHeight - 12;
    const aspect = mapData.cols / mapData.rows;
    let w = availW;
    let h = w / aspect;
    if (h > availH) { h = availH; w = h * aspect; }

    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    state.tileSize = w / mapData.cols;
  }
  window.addEventListener('resize', resizeCanvas);

  // ---------- HUD ----------
  function renderResourceBar() {
    resourceBarEl.innerHTML = Object.values(RESOURCES).map((r) => (
      `<div class="resource-chip" id="chip-${r.id}"><span class="icon">${r.icon}</span><span id="val-${r.id}">${Math.floor(state.resources[r.id])}</span></div>`
    )).join('');
  }
  const lastShown = {};
  function updateHUD() {
    Object.values(RESOURCES).forEach((r) => {
      const val = Math.floor(state.resources[r.id]);
      const el = document.getElementById(`val-${r.id}`);
      if (el && lastShown[r.id] !== val) {
        el.textContent = val;
        if (lastShown[r.id] !== undefined) {
          const chip = document.getElementById(`chip-${r.id}`);
          chip.classList.remove('pulse'); void chip.offsetWidth; chip.classList.add('pulse');
        }
        lastShown[r.id] = val;
      }
    });
    waveNumEl.textContent = state.waveNumber;
  }
  renderResourceBar();

  // ---------- Build bar ----------
  function renderBuildBar() {
    buildBarEl.innerHTML = '';
    Object.values(BUILDINGS).forEach((def) => {
      if (def.hidden) return;
      const costStr = Object.entries(def.cost).map(([k, v]) => `${RESOURCES[k].icon}${v}`).join(' ');

      // Name/cost sit outside the button as plain (non-clickable) captions —
      // the button itself is just the icon, so a tap always lands on a big
      // blank target instead of possibly landing on a text glyph.
      const item = document.createElement('div');
      item.className = 'build-item';

      const label = document.createElement('span');
      label.className = 'bb-label';
      label.textContent = def.name;

      const btn = document.createElement('button');
      btn.className = 'build-btn';
      btn.id = `build-${def.id}`;
      btn.innerHTML = `<span class="bb-icon">${def.icon}</span>`;
      btn.addEventListener('click', () => handleBuildTap(def.id));

      const cost = document.createElement('span');
      cost.className = 'bb-cost';
      cost.textContent = costStr;

      item.append(label, btn, cost);
      buildBarEl.appendChild(item);
    });
    refreshBuildBarState();
  }

  function refreshBuildBarState() {
    Object.values(BUILDINGS).forEach((def) => {
      const btn = document.getElementById(`build-${def.id}`);
      if (!btn) return;
      const prereqOk = !def.requires || state.buildings.some((b) => b.type === def.requires && b.complete);
      const afford = canAfford(state, def.cost);
      btn.disabled = !prereqOk;
      btn.style.opacity = prereqOk && afford ? '' : (prereqOk ? '0.75' : '0.35');
      btn.classList.toggle('active', state.placementMode === def.id);
    });
  }

  function handleBuildTap(buildingId) {
    if (state.placementMode === buildingId) { cancelPlacement(state); showPlacementBar(false); refreshBuildBarState(); return; }
    const result = startPlacement(state, buildingId);
    if (!result.ok) { toast(result.reason); return; }
    document.getElementById('placement-name').textContent = BUILDINGS[buildingId].name;
    showPlacementBar(true);
    refreshBuildBarState();
    hideBuildingPanel();
  }

  function showPlacementBar(show) { placementBar.classList.toggle('hidden', !show); }
  document.getElementById('placement-cancel').addEventListener('click', () => {
    cancelPlacement(state); showPlacementBar(false); refreshBuildBarState();
  });

  // ---------- Building panel (train units) ----------
  function showBuildingPanel(building) {
    selectedBuilding = building;
    buildingPanel.classList.remove('hidden');
    document.getElementById('bp-icon').textContent = building.def.icon;
    document.getElementById('bp-name').textContent = building.def.name;
    refreshBuildingPanel();
  }
  function hideBuildingPanel() {
    selectedBuilding = null;
    buildingPanel.classList.add('hidden');
  }
  function refreshBuildingPanel() {
    if (!selectedBuilding) return;
    const btn = document.getElementById('bp-train');
    const caption = document.getElementById('bp-train-caption');
    const icon = document.getElementById('bp-train-icon');
    if (!selectedBuilding.complete) {
      caption.textContent = `Building… ${Math.round(selectedBuilding.progress * 100)}%`;
      icon.textContent = '⏳';
      btn.disabled = true;
      btn.style.opacity = '';
      return;
    }
    if (!selectedBuilding.def.produces) {
      caption.textContent = 'Nothing to train here';
      icon.textContent = '—';
      btn.disabled = true;
      btn.style.opacity = '';
      return;
    }
    const unitDef = UNITS[selectedBuilding.def.produces];
    const costStr = Object.entries(unitDef.cost).map(([k, v]) => `${RESOURCES[k].icon}${v}`).join(' ');
    const queued = selectedBuilding.productionQueue > 0 ? ` · queued ${selectedBuilding.productionQueue}` : '';
    caption.textContent = `Train ${unitDef.name} — ${costStr}${queued}`;
    icon.textContent = unitDef.icon;
    // Stay clickable even when unaffordable — a native `disabled` button
    // eats the click before it ever reaches the handler below, so the
    // "Not enough resources" toast never has a chance to fire and tapping
    // it just looks broken. Dim it instead, same as the build bar does.
    btn.disabled = false;
    btn.style.opacity = canAfford(state, unitDef.cost) ? '' : '0.55';
  }
  document.getElementById('bp-close').addEventListener('click', hideBuildingPanel);
  document.getElementById('bp-train').addEventListener('click', () => {
    if (!selectedBuilding) return;
    const result = queueTraining(state, selectedBuilding);
    // Every click needs an immediate, unmistakable reaction — training
    // takes several seconds to actually produce a unit, so without this a
    // successful click looks identical to a dropped one and invites
    // repeat-clicking (which silently queues/pays for extras).
    if (!result.ok) toast(result.reason);
    else toast(`Training ${UNITS[selectedBuilding.def.produces].name}…`);
    refreshBuildingPanel();
  });

  // ---------- Toasts ----------
  function toast(text) { pushMessage(state, text); }

  // ---------- Input wiring ----------
  setupInput(canvas, state, {
    onSelectionChanged() { hideBuildingPanel(); },
    onBuildingTap(building) { showBuildingPanel(building); },
    onPlacementTap(col, row) {
      const result = confirmPlacement(state, col, row);
      if (!result.ok) { toast(result.reason); return; }
      showPlacementBar(false);
      refreshBuildBarState();
    },
  });

  // ---------- Game over / restart ----------
  function onGameOver() {
    document.getElementById('go-wave').textContent = state.waveNumber;
    gameOverEl.classList.remove('hidden');
  }
  document.getElementById('restart-btn').addEventListener('click', () => {
    resetState(state, MAPS.frontierCanyon());
    resizeCanvas();
    Object.keys(lastShown).forEach((k) => delete lastShown[k]);
    hideBuildingPanel();
    showPlacementBar(false);
    gameOverEl.classList.add('hidden');
    refreshBuildBarState();
  });

  renderBuildBar();

  // Sized last, once the resource/build bars have their real content and the
  // stage has settled into its final flex layout — sizing earlier measures a
  // taller #stage than the page ends up with, so the canvas gets locked to
  // dimensions the CSS max-height then silently clips, leaving clicks
  // misaligned with what's drawn.
  resizeCanvas();

  // ---------- Loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    update(dt, state, {
      onStateChanged() {
        refreshBuildBarState();
        if (selectedBuilding && !state.buildings.includes(selectedBuilding)) hideBuildingPanel();
        else if (selectedBuilding) refreshBuildingPanel();
      },
      onWave() { refreshBuildBarState(); },
      onGameOver,
    });

    render(ctx, canvas, state);
    updateHUD();
    if (selectedBuilding) refreshBuildingPanel();

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
