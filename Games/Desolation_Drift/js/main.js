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
  resizeCanvas();

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
      const btn = document.createElement('button');
      btn.className = 'build-btn';
      btn.id = `build-${def.id}`;
      const costStr = Object.entries(def.cost).map(([k, v]) => `${RESOURCES[k].icon}${v}`).join(' ');
      btn.innerHTML = `<span class="bb-icon">${def.icon}</span><span class="bb-label">${def.name}</span><span class="bb-cost">${costStr}</span>`;
      btn.addEventListener('click', () => handleBuildTap(def.id));
      buildBarEl.appendChild(btn);
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
    if (!selectedBuilding.complete) {
      btn.textContent = `Building… ${Math.round(selectedBuilding.progress * 100)}%`;
      btn.disabled = true;
      return;
    }
    if (!selectedBuilding.def.produces) {
      btn.textContent = 'Nothing to train here';
      btn.disabled = true;
      return;
    }
    const unitDef = UNITS[selectedBuilding.def.produces];
    const costStr = Object.entries(unitDef.cost).map(([k, v]) => `${RESOURCES[k].icon}${v}`).join(' ');
    const queued = selectedBuilding.productionQueue > 0 ? ` (queue: ${selectedBuilding.productionQueue})` : '';
    btn.textContent = `Train ${unitDef.name} — ${costStr}${queued}`;
    btn.disabled = !canAfford(state, unitDef.cost);
  }
  document.getElementById('bp-close').addEventListener('click', hideBuildingPanel);
  document.getElementById('bp-train').addEventListener('click', () => {
    if (!selectedBuilding) return;
    const result = queueTraining(state, selectedBuilding);
    if (!result.ok) toast(result.reason);
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
