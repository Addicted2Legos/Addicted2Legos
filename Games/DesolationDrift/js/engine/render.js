/**
 * RENDER
 * Pure(ish) drawing functions. Nothing here mutates game state.
 */
function render(ctx, canvas, state) {
  const { map, tileSize } = state;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawSky(ctx, canvas);
  drawTerrain(ctx, state);
  drawFence(ctx, state);
  drawNodes(ctx, state);
  drawPlacementGhost(ctx, state);
  drawBuildings(ctx, state);
  drawEnemies(ctx, state);
  drawUnits(ctx, state);
  drawProjectiles(ctx, state);
  drawMessages(ctx, canvas, state);
}

function drawSky(ctx, canvas) {
  // Thin strip of starfield above the map is handled in CSS behind the
  // canvas; the canvas itself is just the desert, so nothing to do here.
}

function drawTerrain(ctx, state) {
  const { map, tileSize } = state;
  for (let r = 0; r < map.rows; r++) {
    for (let c = 0; c < map.cols; c++) {
      const type = TILE_TYPES[map.tiles[r][c]];
      const px = c * tileSize;
      const py = r * tileSize;
      // deterministic pseudo-random shade pick per tile for texture
      const shadeIdx = (c * 7 + r * 13) % type.colors.length;
      ctx.fillStyle = type.colors[shadeIdx];
      ctx.fillRect(px, py, tileSize + 1, tileSize + 1);

      if (type.id === 'sand' || type.id === 'sandDark') {
        drawSandGrain(ctx, px, py, tileSize, c, r);
      } else if (type.id === 'rock') {
        drawRockOutcrop(ctx, px, py, tileSize, c, r);
      } else if (type.id === 'ruins') {
        drawRuinColumns(ctx, px, py, tileSize, c, r);
      }
    }
  }
}

// Sparse dark flecks + a faint crack line so the ground doesn't read as flat color.
function drawSandGrain(ctx, px, py, tileSize, c, r) {
  const seed = (c * 31 + r * 17) % 100;
  ctx.fillStyle = 'rgba(15,20,28,0.22)';
  ctx.beginPath();
  ctx.arc(px + tileSize * (0.2 + (seed % 5) * 0.12), py + tileSize * (0.3 + (seed % 3) * 0.18), tileSize * 0.03, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(px + tileSize * (0.55 + (seed % 4) * 0.1), py + tileSize * (0.65 - (seed % 3) * 0.1), tileSize * 0.025, 0, Math.PI * 2);
  ctx.fill();
  if (seed % 7 === 0) {
    ctx.strokeStyle = 'rgba(15,20,28,0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + tileSize * 0.15, py + tileSize * 0.8);
    ctx.quadraticCurveTo(px + tileSize * 0.5, py + tileSize * 0.9, px + tileSize * 0.85, py + tileSize * 0.7);
    ctx.stroke();
  }
}

// Jagged sunlit boulder cluster, cool grey-blue stone with a bright top rim.
function drawRockOutcrop(ctx, px, py, tileSize, c, r) {
  const seed = (c * 13 + r * 29) % 5;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(px + tileSize * 0.5, py + tileSize * 0.72, tileSize * 0.42, tileSize * 0.18, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fill();

  const points = [
    [0.22, 0.75], [0.16, 0.45], [0.34 + seed * 0.02, 0.18], [0.58, 0.12],
    [0.82, 0.32], [0.86, 0.6], [0.66, 0.78], [0.4, 0.8],
  ];
  ctx.beginPath();
  points.forEach(([ox, oy], i) => {
    const x = px + ox * tileSize;
    const y = py + oy * tileSize;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
  const grad = ctx.createLinearGradient(px, py, px, py + tileSize);
  grad.addColorStop(0, '#7c8a99');
  grad.addColorStop(0.5, '#4a5560');
  grad.addColorStop(1, '#232830');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // sunlit rim highlight along the top-left edge
  ctx.strokeStyle = 'rgba(190,220,255,0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(px + 0.16 * tileSize, py + 0.45 * tileSize);
  ctx.lineTo(px + (0.34 + seed * 0.02) * tileSize, py + 0.18 * tileSize);
  ctx.lineTo(px + 0.58 * tileSize, py + 0.12 * tileSize);
  ctx.stroke();
  ctx.restore();
}

// Weathered ancient pillars: shaft + capital + base, pale stone, cracked.
function drawRuinColumns(ctx, px, py, tileSize, c, r) {
  const seed = (c * 11 + r * 19) % 3;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(px + tileSize * 0.5, py + tileSize * 0.85, tileSize * 0.32, tileSize * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  const cols = [
    { ox: 0.28, w: 0.16, h: 0.62, tilt: 0 },
    { ox: 0.56, w: 0.14, h: (0.4 + seed * 0.08), tilt: seed === 1 ? 0.06 : 0 },
  ];
  cols.forEach(({ ox, w, h, tilt }) => {
    const x = px + ox * tileSize;
    const topY = py + (0.85 - h) * tileSize;
    const shaftW = w * tileSize;
    const shaftH = h * tileSize;
    ctx.save();
    ctx.translate(x + shaftW / 2, py + 0.85 * tileSize);
    ctx.rotate(tilt);
    ctx.translate(-(x + shaftW / 2), -(py + 0.85 * tileSize));
    const grad = ctx.createLinearGradient(x, topY, x + shaftW, topY);
    grad.addColorStop(0, '#6b7480');
    grad.addColorStop(0.5, '#c7d0d8');
    grad.addColorStop(1, '#6b7480');
    ctx.fillStyle = grad;
    ctx.fillRect(x, topY, shaftW, shaftH);
    // capital (top cap)
    ctx.fillStyle = '#b3bcc4';
    ctx.fillRect(x - shaftW * 0.18, topY, shaftW * 1.36, shaftH * 0.1);
    // fluting lines
    ctx.strokeStyle = 'rgba(50,58,68,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + shaftW * 0.5, topY + shaftH * 0.12);
    ctx.lineTo(x + shaftW * 0.5, topY + shaftH);
    ctx.stroke();
    ctx.restore();
  });
  ctx.restore();
}

function drawFence(ctx, state) {
  const { map, tileSize } = state;
  const x0 = tileSize * 0.4;
  const y0 = tileSize * 0.4;
  const w = map.cols * tileSize - tileSize * 0.8;
  const h = map.rows * tileSize - tileSize * 0.8;

  // rails
  ctx.strokeStyle = '#5c4326';
  ctx.lineWidth = Math.max(2, tileSize * 0.045);
  ctx.strokeRect(x0, y0, w, h);
  ctx.strokeStyle = 'rgba(120,90,55,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 + tileSize * 0.08, y0 + tileSize * 0.08, w - tileSize * 0.16, h - tileSize * 0.16);

  // posts at even spacing around the perimeter
  const spacing = tileSize * 0.9;
  const postW = Math.max(3, tileSize * 0.1);
  const postH = tileSize * 0.34;
  const drawPost = (px, py) => {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(px - postW / 2, py + postH * 0.55, postW, postH * 0.18);
    ctx.fillStyle = '#4a3420';
    ctx.fillRect(px - postW / 2, py - postH / 2, postW, postH);
    ctx.fillStyle = 'rgba(255,200,140,0.25)';
    ctx.fillRect(px - postW / 2, py - postH / 2, postW * 0.35, postH);
  };
  for (let px = x0; px <= x0 + w + 0.01; px += spacing) {
    drawPost(px, y0);
    drawPost(px, y0 + h);
  }
  for (let py = y0 + spacing; py < y0 + h; py += spacing) {
    drawPost(x0, py);
    drawPost(x0 + w, py);
  }
}

function drawNodes(ctx, state) {
  const { tileSize } = state;
  state.map.nodes.forEach((node) => {
    if (node.amount <= 0) return;
    const cx = (node.col + 0.5) * tileSize;
    const cy = (node.row + 0.5) * tileSize;
    const resDef = RESOURCES[node.type];
    const pct = node.amount / node.maxAmount;
    const clusterSizes = [0.34, 0.24, 0.27, 0.19];
    const offsets = [[-0.18, 0.08], [0.16, 0.12], [-0.02, -0.14], [0.2, -0.08]];
    ctx.save();
    offsets.forEach(([ox, oy], i) => {
      const s = clusterSizes[i] * tileSize * (0.6 + 0.4 * pct);
      const px = cx + ox * tileSize;
      const py = cy + oy * tileSize;
      if (node.type === 'wood') {
        drawTree(ctx, px, py, s, i);
      } else {
        ctx.fillStyle = resDef.color;
        ctx.globalAlpha = 0.92;
        drawCrystal(ctx, px, py, s);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });
    ctx.restore();

    // amount label
    ctx.font = `${Math.round(tileSize * 0.24)}px 'Rajdhani', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(10,14,20,0.75)';
    ctx.fillRect(cx - tileSize * 0.34, cy + tileSize * 0.32, tileSize * 0.68, tileSize * 0.24);
    ctx.fillStyle = resDef.color;
    ctx.fillText(Math.ceil(node.amount), cx, cy + tileSize * 0.49);
  });
}

function drawCrystal(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.lineTo(x + s * 0.6, y - s * 0.15);
  ctx.lineTo(x + s * 0.35, y + s * 0.8);
  ctx.lineTo(x - s * 0.35, y + s * 0.8);
  ctx.lineTo(x - s * 0.6, y - s * 0.15);
  ctx.closePath();
  ctx.fill();
}

function drawTree(ctx, x, y, s, seed) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + s * 0.78, s * 0.5, s * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#5c4023';
  ctx.fillRect(x - s * 0.09, y + s * 0.1, s * 0.18, s * 0.62);

  ctx.fillStyle = seed % 2 === 0 ? '#5f7a3d' : '#4f6a34';
  ctx.beginPath();
  ctx.arc(x, y - s * 0.3, s * 0.55, 0, Math.PI * 2);
  ctx.arc(x - s * 0.4, y - s * 0.02, s * 0.36, 0, Math.PI * 2);
  ctx.arc(x + s * 0.4, y - s * 0.02, s * 0.36, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.arc(x - s * 0.15, y - s * 0.48, s * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlacementGhost(ctx, state) {
  if (!state.placementMode || !state.hoverTile) return;
  const def = BUILDINGS[state.placementMode];
  const { tileSize } = state;
  const { col, row } = state.hoverTile;
  const valid = isPlacementValid(state, def, col, row);
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = valid ? '#5fe0a0' : '#ff6b6b';
  ctx.fillRect(col * tileSize, row * tileSize, def.size.w * tileSize, def.size.h * tileSize);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = valid ? '#bdffe0' : '#ffd0d0';
  ctx.lineWidth = 2;
  ctx.strokeRect(col * tileSize, row * tileSize, def.size.w * tileSize, def.size.h * tileSize);
  ctx.restore();
}

const BUILDING_ACCENTS = { barracks: '#ff5d6c', storage: '#ffd24f' };

function drawBuildings(ctx, state) {
  const { tileSize } = state;
  state.buildings.forEach((b) => {
    const px = b.col * tileSize;
    const py = b.row * tileSize;
    const w = b.def.size.w * tileSize;
    const h = b.def.size.h * tileSize;

    ctx.save();
    if (!b.complete) ctx.globalAlpha = 0.6 + 0.3 * b.progress;

    const accent = BUILDING_ACCENTS[b.type] || '#4fe7ff';

    if (b.type === 'factory') {
      drawWorkerOutpost(ctx, px, py, w, h, accent);
    } else {
      // base pad
      ctx.fillStyle = '#3a3229';
      ctx.fillRect(px + w * 0.05, py + h * 0.15, w * 0.9, h * 0.8);
      // body
      const grad = ctx.createLinearGradient(px, py, px, py + h);
      grad.addColorStop(0, '#5b5148');
      grad.addColorStop(1, '#332c25');
      ctx.fillStyle = grad;
      ctx.fillRect(px + w * 0.1, py + h * 0.05, w * 0.8, h * 0.75);
      // trim / glow color by type
      ctx.fillStyle = accent;
      ctx.globalAlpha *= 0.85;
      ctx.fillRect(px + w * 0.1, py + h * 0.05, w * 0.8, h * 0.08);
      ctx.globalAlpha = b.complete ? 1 : 0.6 + 0.3 * b.progress;

      // icon
      ctx.font = `${Math.round(h * 0.42)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.fillText(b.def.icon, px + w / 2, py + h * 0.52);
    }

    // label
    ctx.font = `700 ${Math.round(tileSize * 0.16)}px 'Rajdhani', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(px, py - tileSize * 0.22, w, tileSize * 0.2);
    ctx.fillStyle = accent;
    ctx.fillText(b.def.name.toUpperCase(), px + w / 2, py - tileSize * 0.12);
    ctx.restore();

    if (!b.complete) {
      drawProgressBar(ctx, px + w * 0.1, py + h + tileSize * 0.06, w * 0.8, tileSize * 0.12, b.progress, '#5fe0a0');
    } else if (b.productionQueue > 0) {
      const pct = b.productionProgress / (UNITS[b.def.produces].buildTime);
      drawProgressBar(ctx, px + w * 0.1, py + h + tileSize * 0.06, w * 0.8, tileSize * 0.1, pct, '#ffd24f');
    }
    if (b.complete && b.hp < b.maxHp) {
      drawHpBar(ctx, px, py - tileSize * 0.06, w, tileSize * 0.08, b.hp / b.maxHp);
    }
  });
}

// Krezkit's Grubstake: an open-sided timber muster stall — corner posts, a
// lean-to roof, and a service counter workers gather at, lit by a glowing
// lantern instead of a signboard.
function drawWorkerOutpost(ctx, px, py, w, h, accent) {
  // sandy base pad
  ctx.fillStyle = '#3a2f22';
  ctx.fillRect(px + w * 0.04, py + h * 0.2, w * 0.92, h * 0.72);

  // interior shadow
  ctx.fillStyle = '#241c14';
  ctx.fillRect(px + w * 0.14, py + h * 0.28, w * 0.72, h * 0.42);

  // corner + center posts
  ctx.fillStyle = '#5c4630';
  const postW = w * 0.07;
  ctx.fillRect(px + w * 0.08, py + h * 0.06, postW, h * 0.86);
  ctx.fillRect(px + w * 0.92 - postW, py + h * 0.06, postW, h * 0.86);
  ctx.fillRect(px + w * 0.5 - postW / 2, py + h * 0.02, postW, h * 0.3);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + w * 0.08, py + h * 0.06, postW, h * 0.86);
  ctx.strokeRect(px + w * 0.92 - postW, py + h * 0.06, postW, h * 0.86);

  // lean-to roof slab
  const roofGrad = ctx.createLinearGradient(px, py, px, py + h * 0.22);
  roofGrad.addColorStop(0, '#8a6a44');
  roofGrad.addColorStop(1, '#5c4630');
  ctx.fillStyle = roofGrad;
  ctx.beginPath();
  ctx.moveTo(px + w * 0.02, py + h * 0.22);
  ctx.lineTo(px + w * 0.98, py + h * 0.22);
  ctx.lineTo(px + w * 0.88, py + h * 0.04);
  ctx.lineTo(px + w * 0.12, py + h * 0.04);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.stroke();

  // roof edge trim, accent-colored
  ctx.fillStyle = accent;
  ctx.globalAlpha *= 0.85;
  ctx.fillRect(px + w * 0.02, py + h * 0.2, w * 0.96, h * 0.035);
  ctx.globalAlpha /= 0.85;

  // service counter
  ctx.fillStyle = '#7a5c3a';
  ctx.fillRect(px + w * 0.1, py + h * 0.56, w * 0.8, h * 0.1);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.strokeRect(px + w * 0.1, py + h * 0.56, w * 0.8, h * 0.1);

  // open frame beneath the counter
  ctx.fillStyle = '#3a2f22';
  ctx.fillRect(px + w * 0.14, py + h * 0.66, w * 0.06, h * 0.24);
  ctx.fillRect(px + w * 0.8, py + h * 0.66, w * 0.06, h * 0.24);

  // crate on the counter
  ctx.fillStyle = '#9c7a4a';
  ctx.fillRect(px + w * 0.42, py + h * 0.44, w * 0.16, h * 0.14);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.strokeRect(px + w * 0.42, py + h * 0.44, w * 0.16, h * 0.14);

  // hanging lantern
  ctx.beginPath();
  ctx.fillStyle = accent;
  ctx.shadowColor = accent;
  ctx.shadowBlur = w * 0.08;
  ctx.arc(px + w * 0.5, py + h * 0.34, w * 0.035, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawProgressBar(ctx, x, y, w, h, pct, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, pct)), h);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
}

function drawHpBar(ctx, x, y, w, h, pct) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = pct > 0.4 ? '#5fe07a' : '#ff5d5d';
  ctx.fillRect(x, y, w * Math.max(0, pct), h);
}

function drawUnits(ctx, state) {
  const { tileSize } = state;
  state.units.forEach((u) => {
    const px = u.x * tileSize;
    const py = u.y * tileSize;
    const selected = state.selectedUnitIds.includes(u.id);
    const isWorker = u.def.id === 'worker';
    const isSoldier = u.def.id === 'soldier';
    const r = tileSize * 0.24 * (isWorker || isSoldier ? 1.2 : 1);

    if (selected) {
      ctx.beginPath();
      ctx.ellipse(px, py + r * 0.6, r * 1.5, r * 0.7, 0, 0, Math.PI * 2);
      ctx.strokeStyle = '#5fe0ff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // shadow
    ctx.beginPath();
    ctx.ellipse(px, py + r * 0.7, r * 0.9, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();

    if (isWorker) {
      const walkPhase = (state.elapsed / 130) + (u.walkSeed || 0);
      drawWorkerBot(ctx, px, py, r, u.moving, walkPhase, u.facing || 1);
    } else if (isSoldier) {
      const walkPhase = (state.elapsed / 130) + (u.walkSeed || 0);
      drawWastelandTrooper(ctx, px, py, r, u.moving, walkPhase, u.facing || 1);
    } else {
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = u.def.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = `${Math.round(r * 1.5)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(u.def.icon, px, py - r * 0.05);
    }

    if (u.job && u.job.kind === 'gather') {
      ctx.font = `${Math.round(r)}px sans-serif`;
      ctx.fillText('⛏️', px + r * 1.1, py - r * 1.1);
    } else if (u.job && u.job.kind === 'deliver' && u.carrying > 0) {
      ctx.font = `${Math.round(r)}px sans-serif`;
      ctx.fillText(RESOURCES[u.carryType].icon, px + r * 1.1, py - r * 1.1);
    } else if (!u.job && u.idleAlerted) {
      ctx.font = `${Math.round(r)}px sans-serif`;
      ctx.fillText('💤', px + r * 1.1, py - r * 1.1);
    }

    if (u.hp < u.maxHp) drawHpBar(ctx, px - r, py - r * 1.8, r * 2, r * 0.35, u.hp / u.maxHp);
  });
}

// Prospector bot: domed head with a single glowing eye and antennae, rust-toned
// articulated legs that swing through a walk cycle, one arm cradling a raw
// crystal chunk and a simpler mechanical arm on the trailing side.
function drawWorkerBot(ctx, px, py, r, moving, walkPhase, facing) {
  ctx.save();
  const dir = facing >= 0 ? 1 : -1;
  const swing = moving ? Math.sin(walkPhase) : 0;
  const bob = moving ? Math.abs(Math.sin(walkPhase)) * r * 0.09 : 0;
  const by = py - bob; // body reference y, bounces while walking

  // legs (drawn first so the torso overlaps the hip joints)
  drawBotLeg(ctx, px - r * 0.28, by + r * 0.2, r * 0.24, r * 0.68, swing);
  drawBotLeg(ctx, px + r * 0.28, by + r * 0.2, r * 0.24, r * 0.68, -swing);

  // torso
  const bodyGrad = ctx.createLinearGradient(px, by - r * 0.55, px, by + r * 0.3);
  bodyGrad.addColorStop(0, '#aeb5bd');
  bodyGrad.addColorStop(1, '#767d87');
  ctx.fillStyle = bodyGrad;
  roundedRect(ctx, px - r * 0.6, by - r * 0.55, r * 1.2, r * 0.85, r * 0.2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // chest vents
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = Math.max(1, r * 0.05);
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(px - r * 0.22, by - r * 0.16 + i * r * 0.13);
    ctx.lineTo(px + r * 0.04, by - r * 0.16 + i * r * 0.13);
    ctx.stroke();
  }

  // trailing mechanical arm, swings opposite the legs
  ctx.save();
  ctx.translate(px - dir * r * 0.64, by - r * 0.3);
  ctx.rotate(-dir * (0.3 + swing * 0.25));
  ctx.fillStyle = '#5b616a';
  ctx.fillRect(-r * 0.09, 0, r * 0.18, r * 0.5);
  ctx.fillStyle = '#383e46';
  ctx.beginPath();
  ctx.arc(0, r * 0.5, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // leading arm cradling a raw crystal chunk
  ctx.save();
  ctx.translate(px + dir * r * 0.62, by - r * 0.26);
  ctx.rotate(dir * 0.18);
  ctx.fillStyle = '#5b616a';
  ctx.fillRect(-r * 0.09, 0, r * 0.18, r * 0.4);
  ctx.restore();

  const crystalX = px + dir * r * 0.68;
  const crystalY = by + r * 0.24;
  ctx.beginPath();
  ctx.fillStyle = '#5fe0ff';
  ctx.shadowColor = '#4fe7ff';
  ctx.shadowBlur = r * 0.55;
  ctx.moveTo(crystalX, crystalY - r * 0.22);
  ctx.lineTo(crystalX + r * 0.16, crystalY);
  ctx.lineTo(crystalX, crystalY + r * 0.24);
  ctx.lineTo(crystalX - r * 0.16, crystalY);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // shoulder nubs
  ctx.fillStyle = '#454b53';
  ctx.fillRect(px - r * 0.76, by - r * 0.4, r * 0.2, r * 0.28);
  ctx.fillRect(px + r * 0.56, by - r * 0.4, r * 0.2, r * 0.28);

  // domed head
  ctx.fillStyle = '#5b616a';
  ctx.beginPath();
  ctx.arc(px, by - r * 0.8, r * 0.4, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  roundedRect(ctx, px - r * 0.4, by - r * 0.8, r * 0.8, r * 0.22, r * 0.05);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.stroke();

  // antennae
  ctx.strokeStyle = '#454b53';
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.beginPath();
  ctx.moveTo(px - r * 0.18, by - r * 1.15);
  ctx.lineTo(px - r * 0.26, by - r * 1.34);
  ctx.moveTo(px + r * 0.18, by - r * 1.15);
  ctx.lineTo(px + r * 0.26, by - r * 1.34);
  ctx.stroke();
  ctx.fillStyle = '#8ff5ff';
  ctx.beginPath();
  ctx.arc(px - r * 0.26, by - r * 1.34, r * 0.05, 0, Math.PI * 2);
  ctx.arc(px + r * 0.26, by - r * 1.34, r * 0.05, 0, Math.PI * 2);
  ctx.fill();

  // single glowing eye
  ctx.beginPath();
  ctx.fillStyle = '#0d3742';
  ctx.arc(px, by - r * 0.8, r * 0.26, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.fillStyle = '#5fe0ff';
  ctx.shadowColor = '#4fe7ff';
  ctx.shadowBlur = r * 0.5;
  ctx.arc(px + dir * r * 0.03, by - r * 0.8, r * 0.17, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.restore();
}

// One articulated leg: rust-toned upper segment pivots at the hip, lower
// segment counter-rotates so the foot stays roughly under the body.
function drawBotLeg(ctx, hipX, hipY, w, h, swing) {
  const angle = swing * 0.45;
  ctx.save();
  ctx.translate(hipX, hipY);
  ctx.rotate(angle);
  ctx.fillStyle = '#c2652f';
  ctx.fillRect(-w / 2, 0, w, h * 0.55);

  ctx.translate(0, h * 0.55);
  ctx.rotate(-angle * 0.6);
  ctx.fillStyle = '#9c4d21';
  ctx.fillRect(-w / 2, 0, w, h * 0.45);
  ctx.fillStyle = '#2f353c';
  ctx.fillRect(-w * 0.75, h * 0.42, w * 1.5, w * 0.5);

  ctx.restore();
}

// Wasteland trooper: long duster coat over a domed helmet with a wrapped
// collar/scarf, rifle held two-handed out front. Legs swing through the same
// walk cycle as the worker bot.
function drawWastelandTrooper(ctx, px, py, r, moving, walkPhase, facing) {
  ctx.save();
  const dir = facing >= 0 ? 1 : -1;
  const swing = moving ? Math.sin(walkPhase) : 0;
  const bob = moving ? Math.abs(Math.sin(walkPhase)) * r * 0.08 : 0;
  const by = py - bob;

  // legs, glimpsed beneath the coat hem
  drawTrooperLeg(ctx, px - r * 0.2, by + r * 0.32, r * 0.2, r * 0.6, swing);
  drawTrooperLeg(ctx, px + r * 0.2, by + r * 0.32, r * 0.2, r * 0.6, -swing);

  // long coat
  const coatGrad = ctx.createLinearGradient(px, by - r * 0.6, px, by + r * 0.5);
  coatGrad.addColorStop(0, '#c9a06a');
  coatGrad.addColorStop(1, '#8a663f');
  ctx.fillStyle = coatGrad;
  ctx.beginPath();
  ctx.moveTo(px - r * 0.4, by - r * 0.58);
  ctx.lineTo(px + r * 0.4, by - r * 0.58);
  ctx.lineTo(px + r * 0.56, by + r * 0.48);
  ctx.lineTo(px, by + r * 0.6);
  ctx.lineTo(px - r * 0.56, by + r * 0.48);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // coat center seam
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.moveTo(px, by - r * 0.52);
  ctx.lineTo(px, by + r * 0.56);
  ctx.stroke();

  // belt
  ctx.fillStyle = '#4a3620';
  ctx.fillRect(px - r * 0.4, by + r * 0.02, r * 0.8, r * 0.1);

  // rifle, held two-handed out on the facing side
  ctx.save();
  ctx.translate(px, by - r * 0.16);
  ctx.scale(dir, 1);
  ctx.strokeStyle = '#8a663f';
  ctx.lineWidth = r * 0.15;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(r * 0.08, r * 0.16);
  ctx.lineTo(r * 0.5, -r * 0.02);
  ctx.moveTo(r * 0.1, r * 0.05);
  ctx.lineTo(r * 0.62, -r * 0.06);
  ctx.stroke();
  ctx.fillStyle = '#2b2d31';
  ctx.fillRect(r * 0.15, -r * 0.11, r * 0.95, r * 0.1);
  ctx.fillStyle = '#1c1d20';
  ctx.fillRect(r * 0.98, -r * 0.14, r * 0.16, r * 0.06);
  ctx.fillStyle = '#5c4023';
  ctx.fillRect(-r * 0.06, -r * 0.09, r * 0.24, r * 0.15);
  ctx.restore();

  // wrapped collar / scarf
  ctx.fillStyle = '#c98f3a';
  ctx.beginPath();
  ctx.ellipse(px, by - r * 0.58, r * 0.3, r * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // domed helmet
  ctx.fillStyle = '#7d8790';
  ctx.beginPath();
  ctx.arc(px, by - r * 0.78, r * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.stroke();

  // lens
  ctx.fillStyle = '#2b3138';
  ctx.beginPath();
  ctx.ellipse(px + dir * r * 0.04, by - r * 0.78, r * 0.17, r * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8ff5ff';
  ctx.shadowColor = '#4fe7ff';
  ctx.shadowBlur = r * 0.3;
  ctx.beginPath();
  ctx.arc(px + dir * r * 0.08, by - r * 0.78, r * 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.restore();
}

// One leg: coat-colored upper segment pivots at the hip, dark boot segment
// counter-rotates, mirroring the worker bot's walk cycle.
function drawTrooperLeg(ctx, hipX, hipY, w, h, swing) {
  const angle = swing * 0.4;
  ctx.save();
  ctx.translate(hipX, hipY);
  ctx.rotate(angle);
  ctx.fillStyle = '#6b4e2e';
  ctx.fillRect(-w / 2, 0, w, h * 0.55);

  ctx.translate(0, h * 0.55);
  ctx.rotate(-angle * 0.5);
  ctx.fillStyle = '#2a2a2c';
  ctx.fillRect(-w / 2, 0, w, h * 0.45);
  ctx.fillStyle = '#18181a';
  ctx.fillRect(-w * 0.7, h * 0.38, w * 1.4, w * 0.5);

  ctx.restore();
}

function roundedRect(ctx, x, y, w, h, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawEnemies(ctx, state) {
  const { tileSize } = state;
  state.enemies.forEach((e) => {
    const px = e.x * tileSize;
    const py = e.y * tileSize;
    const r = tileSize * 0.24;
    ctx.beginPath();
    ctx.ellipse(px, py + r * 0.7, r * 0.9, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = e.def.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = `${Math.round(r * 1.5)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(e.def.icon, px, py - r * 0.05);

    drawHpBar(ctx, px - r, py - r * 1.8, r * 2, r * 0.35, e.hp / e.maxHp);
  });
}

function drawProjectiles(ctx, state) {
  const { tileSize } = state;
  state.projectiles.forEach((p) => {
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x1 * tileSize, p.y1 * tileSize);
    ctx.lineTo(p.x2 * tileSize, p.y2 * tileSize);
    ctx.stroke();
  });
}

function drawMessages(ctx, canvas, state) {
  if (!state.messages.length) return;
  ctx.textAlign = 'center';
  ctx.font = "700 16px 'Rajdhani', sans-serif";
  state.messages.forEach((m, i) => {
    const alpha = Math.max(0, Math.min(1, (m.expires - state.elapsed) / 600));
    ctx.fillStyle = `rgba(255,214,90,${alpha})`;
    ctx.fillText(m.text, canvas.width / 2, 34 + i * 20);
  });
}

function isPlacementValid(state, def, col, row) {
  const { map } = state;
  if (col < 1 || row < 1 || col + def.size.w > map.cols - 1 || row + def.size.h > map.rows - 1) return false;
  for (let r = row; r < row + def.size.h; r++) {
    for (let c = col; c < col + def.size.w; c++) {
      if (!TILE_TYPES[map.tiles[r][c]].walkable) return false;
    }
  }
  const overlapsBuilding = state.buildings.some((b) => rectsOverlap(
    col, row, def.size.w, def.size.h, b.col, b.row, b.def.size.w, b.def.size.h,
  ));
  if (overlapsBuilding) return false;
  const overlapsNode = map.nodes.some((n) => n.amount > 0
    && n.col >= col - 1 && n.col <= col + def.size.w
    && n.row >= row - 1 && n.row <= row + def.size.h);
  return !overlapsNode;
}

function rectsOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
  return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}
