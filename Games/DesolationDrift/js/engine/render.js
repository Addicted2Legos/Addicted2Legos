/**
 * RENDER
 * Pure(ish) drawing functions. Nothing here mutates game state.
 */

// Shared key-light direction (screen space, "light travels this way") used
// to keep rim highlights/shadow placement consistent across every drawing
// function below — sun low in the upper-left, matching the CSS gas-giant glow.
const LIGHT = { x: -0.55, y: -0.8 };

// Oblique building shape for a ~60°-overhead camera: at that steep an angle
// you mostly see the ROOFTOP (near full footprint size, all the surface
// detail lives here) with only a short wall skirt peeking out below it — not
// a tall front facade. Footprint (col/row/size, used for placement and
// collision) is untouched, so no gameplay math changes.
const ROOF_MARGIN = 0.05;  // roof inset from the tile edges, so it doesn't fill the footprint edge-to-edge
const WALL_FRAC = 0.16;    // visible wall-skirt height below the roof, as a fraction of footprint depth
const WALL_FRAC_BY_TYPE = { storage: 0.12 };

function buildingBox(px, py, w, h, type) {
  const wallFrac = WALL_FRAC_BY_TYPE[type] ?? WALL_FRAC;
  const mx = w * ROOF_MARGIN;
  const my = h * ROOF_MARGIN;
  const wallH = h * wallFrac;
  const roofX = px + mx;
  const roofY = py + my;
  const roofW = w - mx * 2;
  const roofH = h - my * 2 - wallH;
  return { roofX, roofY, roofW, roofH, wallY: roofY + roofH, wallH };
}

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
  applyAtmosphere(ctx, canvas);
}

// Soft multi-layer shadow puddle under any ground object — replaces flat
// single-ellipse shadows with a wider faint layer + a tighter dark core so
// objects feel like they're sitting IN the light rather than pasted on it.
function drawContactShadow(ctx, cx, groundY, w) {
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(cx, groundY, w * 0.62, w * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.26;
  ctx.beginPath();
  ctx.ellipse(cx, groundY, w * 0.42, w * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Final full-canvas pass: warm key-light wash on the lit side, cool falloff
// on the shadow side, and a vignette to pull the eye toward the base — the
// cheap trick that reads as "lit scene" instead of "flat sprites on sand".
function applyAtmosphere(ctx, canvas) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  let g = ctx.createRadialGradient(
    canvas.width * 0.1, canvas.height * 0.02, 0,
    canvas.width * 0.1, canvas.height * 0.02, canvas.width * 0.95,
  );
  g.addColorStop(0, 'rgba(255,198,132,0.16)');
  g.addColorStop(1, 'rgba(255,198,132,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  g = ctx.createRadialGradient(
    canvas.width * 0.95, canvas.height, 0,
    canvas.width * 0.95, canvas.height, canvas.width * 0.9,
  );
  g.addColorStop(0, 'rgba(18,30,52,0.24)');
  g.addColorStop(1, 'rgba(18,30,52,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  g = ctx.createRadialGradient(
    canvas.width / 2, canvas.height * 0.55, canvas.height * 0.32,
    canvas.width / 2, canvas.height * 0.55, canvas.height * 0.95,
  );
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(4,5,9,0.48)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
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

      applyTileLighting(ctx, px, py, tileSize);
    }
  }
}

// Raking key-light across the ground plane (warm toward the light corner,
// cooling away from it) plus a hairline bevel so tiles read as a lit surface
// instead of a flat-shaded checkerboard.
function applyTileLighting(ctx, px, py, tileSize) {
  const grad = ctx.createLinearGradient(
    px - LIGHT.x * tileSize, py - LIGHT.y * tileSize,
    px + LIGHT.x * tileSize, py + LIGHT.y * tileSize,
  );
  grad.addColorStop(0, 'rgba(255,210,155,0.12)');
  grad.addColorStop(0.55, 'rgba(255,210,155,0)');
  grad.addColorStop(1, 'rgba(8,12,22,0.16)');
  ctx.fillStyle = grad;
  ctx.fillRect(px, py, tileSize + 1, tileSize + 1);

  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px, py + tileSize);
  ctx.lineTo(px, py);
  ctx.lineTo(px + tileSize, py);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath();
  ctx.moveTo(px + tileSize, py);
  ctx.lineTo(px + tileSize, py + tileSize);
  ctx.lineTo(px, py + tileSize);
  ctx.stroke();
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

    if (node.type === 'crudeOil') {
      // one pumpjack per deposit, not a scattered cluster — it's a single
      // piece of equipment, not a pile of ore
      const phase = state.elapsed / 700 + node.col * 1.7 + node.row * 2.3;
      drawOilPump(ctx, cx, cy, tileSize * (0.38 + 0.08 * pct), phase);
    } else {
      const clusterSizes = [0.34, 0.24, 0.27, 0.19];
      const offsets = [[-0.18, 0.08], [0.16, 0.12], [-0.02, -0.14], [0.2, -0.08]];
      ctx.save();
      offsets.forEach(([ox, oy], i) => {
        const s = clusterSizes[i] * tileSize * (0.6 + 0.4 * pct);
        const px = cx + ox * tileSize;
        const py = cy + oy * tileSize;
        if (node.type === 'wood') {
          drawTree(ctx, px, py, s, i);
        } else if (node.type === 'metal') {
          drawOrePile(ctx, px, py, s, i);
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
    }

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

// A nodding-donkey pumpjack marks a Crude Oil deposit: an A-frame Samson
// post, a walking beam that slowly rocks (horsehead down / counterweight up
// and back), and a pump rod reaching down to the wellhead.
function drawOilPump(ctx, cx, cy, s, phase) {
  const tilt = Math.sin(phase) * 0.32;
  ctx.save();

  // oil puddle at the base
  ctx.fillStyle = 'rgba(10,8,6,0.5)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.62, s * 0.95, s * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  // base skid
  ctx.fillStyle = '#332a1e';
  ctx.fillRect(cx - s * 0.6, cy + s * 0.36, s * 1.2, s * 0.16);
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - s * 0.6, cy + s * 0.36, s * 1.2, s * 0.16);

  // wellhead stub, with a glinting drop of oil
  ctx.fillStyle = '#5a4a34';
  ctx.fillRect(cx - s * 0.05, cy + s * 0.1, s * 0.1, s * 0.28);
  ctx.save();
  ctx.fillStyle = '#c97b3d';
  ctx.shadowColor = '#c97b3d';
  ctx.shadowBlur = s * 0.25;
  ctx.beginPath();
  ctx.arc(cx, cy + s * 0.1, s * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Samson post (A-frame legs)
  const pivotX = cx + s * 0.02;
  const pivotY = cy - s * 0.32;
  ctx.strokeStyle = '#4a3c2a';
  ctx.lineWidth = Math.max(1.4, s * 0.1);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.3, cy + s * 0.36);
  ctx.lineTo(pivotX, pivotY);
  ctx.moveTo(cx + s * 0.36, cy + s * 0.36);
  ctx.lineTo(pivotX, pivotY);
  ctx.stroke();

  // walking beam, pivoting at the post's peak and rocking with `tilt`
  ctx.save();
  ctx.translate(pivotX, pivotY);
  ctx.rotate(tilt);
  ctx.strokeStyle = '#6b5a3e';
  ctx.lineWidth = Math.max(1.4, s * 0.09);
  ctx.beginPath();
  ctx.moveTo(-s * 0.58, 0);
  ctx.lineTo(s * 0.42, 0);
  ctx.stroke();
  // counterweight, opposite the horsehead
  ctx.fillStyle = '#2e2620';
  ctx.beginPath();
  ctx.arc(s * 0.36, 0, s * 0.15, 0, Math.PI * 2);
  ctx.fill();
  // horsehead
  ctx.fillStyle = '#241d15';
  ctx.beginPath();
  ctx.moveTo(-s * 0.58, -s * 0.06);
  ctx.quadraticCurveTo(-s * 0.8, s * 0.04, -s * 0.62, s * 0.2);
  ctx.quadraticCurveTo(-s * 0.44, s * 0.12, -s * 0.38, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // pump rod, hanging from the horsehead tip down toward the wellhead
  const headX = pivotX - s * 0.58 * Math.cos(tilt);
  const headY = pivotY - s * 0.58 * Math.sin(tilt);
  ctx.strokeStyle = '#8a7a5a';
  ctx.lineWidth = Math.max(1, s * 0.05);
  ctx.beginPath();
  ctx.moveTo(headX, headY + s * 0.12);
  ctx.lineTo(cx, cy + s * 0.08);
  ctx.stroke();

  ctx.restore();
}

// A pile of broken rock with raw metal ore embedded in it: two or three
// jagged, overlapping boulders (varied per-instance via `seed`) with
// angular steel-blue ore chunks glinting on top.
function drawOrePile(ctx, x, y, s, seed) {
  ctx.save();

  // ground contact shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + s * 0.7, s * 0.72, s * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();

  // jagged boulder outline shared by every rock in the pile, at various
  // offsets/scales/rotations so the heap doesn't look copy-pasted
  const jag = [
    [-0.85, 0.55], [-0.9, -0.1], [-0.4, -0.7], [0.15, -0.85],
    [0.65, -0.45], [0.9, 0.15], [0.5, 0.75], [-0.15, 0.9],
  ];
  const rocks = [
    { ox: -0.34, oy: 0.2, sc: 0.62, rot: 0.3, tone: 0 },
    { ox: 0.3, oy: 0.24, sc: 0.56, rot: -0.5, tone: 1 },
    { ox: 0, oy: -0.08, sc: 0.7, rot: 0.1, tone: 0 },
  ];
  rocks.forEach(({ ox, oy, sc, rot, tone }, i) => {
    ctx.save();
    ctx.translate(x + ox * s, y + oy * s);
    ctx.rotate(rot + seed * 0.4 + i * 0.6);
    const rs = sc * s;
    ctx.beginPath();
    jag.forEach(([jx, jy], j) => {
      const wob = 1 + 0.08 * Math.sin((seed + i) * 3 + j * 2.1);
      const px = jx * rs * wob;
      const py = jy * rs * wob;
      if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, -rs, 0, rs);
    if (tone === 0) {
      grad.addColorStop(0, '#8a8175');
      grad.addColorStop(1, '#3c372e');
    } else {
      grad.addColorStop(0, '#6b6357');
      grad.addColorStop(1, '#2c2820');
    }
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // sunlit rim on the upper-left edge
    ctx.strokeStyle = 'rgba(220,225,230,0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(jag[2][0] * rs, jag[2][1] * rs);
    ctx.lineTo(jag[1][0] * rs, jag[1][1] * rs);
    ctx.lineTo(jag[0][0] * rs, jag[0][1] * rs);
    ctx.stroke();
    ctx.restore();
  });

  // angular ore chunks embedded in the pile, catching a bright glint
  const orePts = [[-0.06, -0.14], [0.24, 0.06], [-0.3, 0.1]];
  orePts.forEach(([ox, oy], i) => {
    const ex = x + ox * s;
    const ey = y + oy * s;
    const er = s * (0.17 + 0.03 * (i % 2));
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(seed + i * 1.3);
    ctx.beginPath();
    ctx.moveTo(0, -er);
    ctx.lineTo(er * 0.8, -er * 0.1);
    ctx.lineTo(er * 0.3, er * 0.8);
    ctx.lineTo(-er * 0.7, er * 0.3);
    ctx.closePath();
    ctx.fillStyle = '#9fb4c7';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(-er * 0.15, -er * 0.3, er * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

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

const BUILDING_ACCENTS = {
  barracks: '#ff5d6c',
  storage: '#ffd24f',
  tower: '#e0a45c',
  roverBay: '#5fa8ff',
  cryoGarage: '#7fe8ff',
};

function drawBuildings(ctx, state) {
  const { tileSize } = state;
  // Painter's algorithm: closer (larger-row) buildings should draw on top of
  // farther ones so their wall skirts correctly overlap.
  const ordered = [...state.buildings].sort((a, b) => (a.row + a.def.size.h) - (b.row + b.def.size.h));
  ordered.forEach((b) => {
    const px = b.col * tileSize;
    const py = b.row * tileSize;
    const w = b.def.size.w * tileSize;
    const h = b.def.size.h * tileSize;
    const box = buildingBox(px, py, w, h, b.type);

    drawContactShadow(ctx, px + w / 2, py + h * 0.98, w * 0.96);

    ctx.save();
    if (!b.complete) ctx.globalAlpha = 0.6 + 0.3 * b.progress;

    const accent = BUILDING_ACCENTS[b.type] || '#4fe7ff';
    let topY = box.roofY; // where the label/hp bar float — towers override this below

    if (b.type === 'tower') {
      // Bowman's Watch draws its own full stilted silhouette (ground to
      // platform) instead of the generic short wall skirt, so it actually
      // rises up off the map rather than sitting nearly flush with it.
      const atk = b.def.attack;
      const cxTile = b.col + b.def.size.w / 2;
      const cyTile = b.row + b.def.size.h / 2;
      const target = atk ? findNearestEnemyInRange({ x: cxTile, y: cyTile }, state, atk.range) : null;
      const aimAngle = target
        ? Math.atan2(target.y - cyTile, target.x - cxTile)
        : Math.sin(state.elapsed / 1400) * Math.PI * 0.55; // idle sentry sweep — "always on the lookout"
      topY = drawArrowTower(ctx, px + w / 2, py + h, w, accent, aimAngle, !!target);
    } else {
      // wall skirt: a short band of the base material peeking out below the
      // roof — all you'd see of the walls from this steep an angle
      const skirtGrad = ctx.createLinearGradient(0, box.wallY, 0, box.wallY + box.wallH);
      skirtGrad.addColorStop(0, '#342c22');
      skirtGrad.addColorStop(1, '#1c170f');
      ctx.fillStyle = skirtGrad;
      ctx.fillRect(box.roofX, box.wallY, box.roofW, box.wallH);
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(box.roofX + box.roofW * 0.88, box.wallY, box.roofW * 0.12, box.wallH);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(box.roofX, box.wallY, box.roofW, box.wallH);

      // rooftop: the dominant, near-full-footprint face — all the building's
      // surface detail (vents, pipes, windows, plaques) lives up here
      if (b.type === 'storage') {
        drawMatterVault(ctx, box.roofX, box.roofY, box.roofW, box.roofH);
      } else if (b.type === 'roverBay') {
        drawRoverBayBuilding(ctx, box.roofX, box.roofY, box.roofW, box.roofH, accent, state.elapsed);
      } else {
        drawGenericBuildingFront(ctx, box.roofX, box.roofY, box.roofW, box.roofH, accent, b);
      }

      // rim highlight along the sun-facing top edge, so it still reads as a
      // raised object rather than a flat decal on the ground
      ctx.strokeStyle = 'rgba(255,214,160,0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(box.roofX, box.roofY);
      ctx.lineTo(box.roofX + box.roofW, box.roofY);
      ctx.stroke();
    }

    ctx.restore();

    if (!b.complete) {
      drawProgressBar(ctx, px + w * 0.1, py + h + tileSize * 0.06, w * 0.8, tileSize * 0.12, b.progress, '#5fe0a0');
    } else if (b.productionQueue > 0) {
      const pct = b.productionProgress / (UNITS[b.def.produces].buildTime);
      drawProgressBar(ctx, px + w * 0.1, py + h + tileSize * 0.06, w * 0.8, tileSize * 0.1, pct, '#ffd24f');
    }
    if (b.complete && b.hp < b.maxHp) {
      drawHpBar(ctx, px, topY - tileSize * 0.06, w, tileSize * 0.08, b.hp / b.maxHp);
    }
  });
}

// Generic building front face (barracks, storage, etc): riveted metal panel
// body, low roof trim, glowing window slits and an icon plaque — same look
// as before, now drawn onto the box's tall front face instead of a flat tile.
// Roof plan for barracks/generic buildings, drawn as if looking straight
// down at the rooftop: flat panel, overhead sun wash (no hard vertical
// light/shadow split — that's an elevation cue), a row of round roof vents,
// and a painted ID roundel instead of a wall-mounted icon plaque.
function drawGenericBuildingFront(ctx, px, py, w, h, accent, b) {
  // base pad (visible edge of the roof slab)
  ctx.fillStyle = '#3a3229';
  ctx.fillRect(px + w * 0.03, py + h * 0.03, w * 0.94, h * 0.94);

  // roof panel, lit from the same overhead sun as the ground
  const grad = ctx.createLinearGradient(px - LIGHT.x * w, py - LIGHT.y * h, px + LIGHT.x * w, py + LIGHT.y * h);
  grad.addColorStop(0, '#6b5f54');
  grad.addColorStop(1, '#332b22');
  ctx.fillStyle = grad;
  ctx.fillRect(px + w * 0.06, py + h * 0.06, w * 0.88, h * 0.88);

  // panel seams, front-to-back only — a top-down grid of roof plates
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  [0.35, 0.65].forEach((fx) => {
    ctx.beginPath();
    ctx.moveTo(px + w * fx, py + h * 0.06);
    ctx.lineTo(px + w * fx, py + h * 0.94);
    ctx.stroke();
  });
  ctx.beginPath();
  ctx.moveTo(px + w * 0.06, py + h * 0.5);
  ctx.lineTo(px + w * 0.94, py + h * 0.5);
  ctx.stroke();

  // accent trim line along the near (lit) edge
  ctx.save();
  ctx.globalAlpha *= 0.85;
  ctx.fillStyle = accent;
  ctx.fillRect(px + w * 0.06, py + h * 0.88, w * 0.88, h * 0.035);
  ctx.restore();

  // glowing roof vents
  ctx.save();
  ctx.fillStyle = accent;
  ctx.shadowColor = accent;
  ctx.shadowBlur = w * 0.1;
  [0.24, 0.76].forEach((fx) => {
    ctx.beginPath();
    ctx.arc(px + w * fx, py + h * 0.28, h * 0.08, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  [0.24, 0.76].forEach((fx) => {
    ctx.beginPath();
    ctx.arc(px + w * fx, py + h * 0.28, h * 0.08, 0, Math.PI * 2);
    ctx.stroke();
  });

  // painted ID roundel with the building's icon
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.arc(px + w / 2, py + h * 0.68, h * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.font = `${Math.round(h * 0.18)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.fillText(b.def.icon, px + w / 2, py + h * 0.685);
}

// Rover Bay: an auto-assembly factory seen from above — a skylight strip
// down the roof, twin supply tanks, smoking vent stacks, and an open bay
// door revealing the assembly floor inside (a rover chassis on the line
// under a working robotic arm, tool racks along the back wall).
function drawRoverBayBuilding(ctx, px, py, w, h, accent, elapsed) {
  const m = Math.min(w, h);

  // base pad
  ctx.fillStyle = '#1c1f24';
  ctx.fillRect(px + w * 0.03, py + h * 0.03, w * 0.94, h * 0.94);

  // roof panel, lit from the same overhead sun as the ground
  const panelGrad = ctx.createLinearGradient(px - LIGHT.x * w, py - LIGHT.y * h, px + LIGHT.x * w, py + LIGHT.y * h);
  panelGrad.addColorStop(0, '#5c6874');
  panelGrad.addColorStop(1, '#2a2f36');
  ctx.fillStyle = panelGrad;
  ctx.fillRect(px + w * 0.06, py + h * 0.06, w * 0.88, h * 0.88);
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(px + w * 0.06, py + h * 0.06, w * 0.88, h * 0.88);

  // skylight strip
  const skyY = py + h * 0.13;
  const skyH = h * 0.1;
  ctx.fillStyle = 'rgba(18,26,32,0.85)';
  ctx.fillRect(px + w * 0.12, skyY, w * 0.5, skyH);
  ctx.save();
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.55;
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(px + w * (0.14 + i * 0.08), skyY + skyH * 0.15, w * 0.05, skyH * 0.7);
  }
  ctx.restore();

  // twin roof tanks
  [0.72, 0.86].forEach((fx) => {
    const tx = px + w * fx;
    const ty = py + h * 0.24;
    const tr = m * 0.09;
    ctx.beginPath();
    ctx.arc(tx, ty, tr, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(tx, ty, tr * 0.84, 0, Math.PI * 2);
    const tankGrad = ctx.createLinearGradient(tx - tr, ty - tr, tx + tr, ty + tr);
    tankGrad.addColorStop(0, '#a8b4bc');
    tankGrad.addColorStop(1, '#4a545c');
    ctx.fillStyle = tankGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // vent stack, gently smoking
  const stackX = px + w * 0.2;
  const stackY = py + h * 0.15;
  const stackR = m * 0.05;
  ctx.beginPath();
  ctx.arc(stackX, stackY, stackR, 0, Math.PI * 2);
  ctx.fillStyle = '#2c2f34';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.stroke();
  const t = elapsed || 0;
  for (let i = 0; i < 3; i++) {
    const cycle = 2200;
    const phase = ((t + i * (cycle / 3)) % cycle) / cycle;
    const drift = phase * m * 0.4;
    const puffAlpha = 0.3 * (1 - phase);
    if (puffAlpha <= 0) continue;
    ctx.beginPath();
    ctx.fillStyle = `rgba(214,218,222,${puffAlpha})`;
    ctx.arc(stackX - drift * 0.3, stackY - drift, stackR * (0.5 + phase * 0.6), 0, Math.PI * 2);
    ctx.fill();
  }

  // open bay door, revealing the assembly floor
  const bayX = px + w * 0.1;
  const bayY = py + h * 0.48;
  const bayW = w * 0.8;
  const bayH = h * 0.44;
  ctx.fillStyle = '#0c0e10';
  ctx.fillRect(bayX, bayY, bayW, bayH);
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.6;
  ctx.strokeRect(bayX, bayY, bayW, bayH);
  ctx.restore();

  // warm interior work-light glow
  ctx.save();
  const glow = ctx.createRadialGradient(
    bayX + bayW * 0.5, bayY + bayH * 0.5, 0,
    bayX + bayW * 0.5, bayY + bayH * 0.5, bayW * 0.5,
  );
  glow.addColorStop(0, 'rgba(255,214,140,0.22)');
  glow.addColorStop(1, 'rgba(255,214,140,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(bayX, bayY, bayW, bayH);
  ctx.restore();

  // rover chassis on the line
  ctx.fillStyle = '#4a5560';
  ctx.beginPath();
  ctx.roundRect(bayX + bayW * 0.12, bayY + bayH * 0.34, bayW * 0.32, bayH * 0.36, bayH * 0.08);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.stroke();
  ctx.fillStyle = '#141416';
  [0.17, 0.4].forEach((fx) => {
    ctx.beginPath();
    ctx.arc(bayX + bayW * fx, bayY + bayH * 0.76, bayH * 0.07, 0, Math.PI * 2);
    ctx.fill();
  });

  // robotic arm, working over the chassis
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(1.5, bayH * 0.06);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(bayX + bayW * 0.6, bayY + bayH * 0.14);
  ctx.lineTo(bayX + bayW * 0.54, bayY + bayH * 0.4);
  ctx.lineTo(bayX + bayW * 0.4, bayY + bayH * 0.52);
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(bayX + bayW * 0.6, bayY + bayH * 0.14, bayH * 0.06, 0, Math.PI * 2);
  ctx.fill();

  // tool rack along the back wall
  ctx.fillStyle = '#7a5c3a';
  ctx.fillRect(bayX + bayW * 0.68, bayY + bayH * 0.14, bayW * 0.24, bayH * 0.16);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.strokeRect(bayX + bayW * 0.68, bayY + bayH * 0.14, bayW * 0.24, bayH * 0.16);

  // accent trim along the near edge
  ctx.save();
  ctx.globalAlpha *= 0.85;
  ctx.fillStyle = accent;
  ctx.fillRect(px + w * 0.06, py + h * 0.9, w * 0.88, h * 0.03);
  ctx.restore();
}

// Matter Vault: ported from the MatterVault.html concept art — a two-tier
// stepped structure (diamond rooftops + slanted walls) with a glowing cyan
// coolant silo on one side, a rusted pressure tank on the other, roof vents
// and ducting, and a glowing vault entrance archway.
function drawMatterVault(ctx, px, py, w, h) {
  // Coordinate mapping: the reference art laid the building out in an
  // ~500x285 bounding box (x:130-630, y:155-440); sx/sy remap those raw
  // coordinates into this building's render box.
  const SX0 = 130; const SY0 = 155; const SW = 500; const SH = 285;
  const sx = (X) => px + ((X - SX0) / SW) * w;
  const sy = (Y) => py + ((Y - SY0) / SH) * h;
  const sw = (W) => (W / SW) * w;
  const sh = (H) => (H / SH) * h;

  const CYAN = '#00f3ff';
  const ORANGE = '#ff9d00';

  const poly = (pts) => {
    ctx.beginPath();
    pts.forEach(([X, Y], i) => {
      if (i === 0) ctx.moveTo(sx(X), sy(Y)); else ctx.lineTo(sx(X), sy(Y));
    });
    ctx.closePath();
  };
  const fillPoly = (pts, style) => { poly(pts); ctx.fillStyle = style; ctx.fill(); };
  const strokePoly = (pts, style, lw) => { poly(pts); ctx.strokeStyle = style; ctx.lineWidth = lw || 1; ctx.stroke(); };
  const ell = (cx, cy, rx, ry, style) => {
    ctx.beginPath();
    ctx.ellipse(sx(cx), sy(cy), Math.max(0.5, sw(rx)), Math.max(0.5, sh(ry)), 0, 0, Math.PI * 2);
    ctx.fillStyle = style;
    ctx.fill();
  };
  const wallGrad = (x0, y0, x1, y1) => {
    const g = ctx.createLinearGradient(sx(x0), sy(y0), sx(x1), sy(y1));
    g.addColorStop(0, '#52616d'); g.addColorStop(0.5, '#37424a'); g.addColorStop(1, '#1e242a');
    return g;
  };
  const rustGrad = (x0, y0, x1, y1) => {
    const g = ctx.createLinearGradient(sx(x0), sy(y0), sx(x1), sy(y1));
    g.addColorStop(0, '#8c4e33'); g.addColorStop(0.6, '#5e3321'); g.addColorStop(1, '#2a3036');
    return g;
  };
  const roofGrad = (x0, y0, x1, y1) => {
    const g = ctx.createLinearGradient(sx(x0), sy(y0), sx(x1), sy(y1));
    g.addColorStop(0, '#7a8c9e'); g.addColorStop(1, '#475460');
    return g;
  };
  const roofRustGrad = (x0, y0, x1, y1) => {
    const g = ctx.createLinearGradient(sx(x0), sy(y0), sx(x1), sy(y1));
    g.addColorStop(0, '#a66144'); g.addColorStop(1, '#523122');
    return g;
  };

  // rear base structure & silos
  ctx.fillStyle = wallGrad(210, 220, 260, 290);
  ctx.fillRect(sx(210), sy(220), sw(50), sh(70));
  ell(235, 220, 25, 16, roofGrad(210, 204, 260, 236));
  ctx.save();
  ctx.shadowColor = CYAN;
  ctx.shadowBlur = sw(10);
  const cyanTubeA = ctx.createLinearGradient(sx(217), sy(200), sx(253), sy(200));
  cyanTubeA.addColorStop(0, '#005b66'); cyanTubeA.addColorStop(0.5, CYAN); cyanTubeA.addColorStop(1, '#005b66');
  ell(235, 200, 18, 22, cyanTubeA);
  ell(235, 188, 14, 8, '#e0f8ff');
  ctx.restore();

  ell(580, 280, 38, 22, '#1b1d20');
  ctx.fillStyle = rustGrad(542, 280, 618, 340);
  ctx.fillRect(sx(542), sy(280), sw(76), sh(60));
  ctx.beginPath();
  ctx.ellipse(sx(580), sy(280), sw(38), sh(22), 0, 0, Math.PI * 2);
  ctx.fillStyle = roofRustGrad(542, 258, 618, 302);
  ctx.fill();
  ctx.strokeStyle = '#2d1910';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ell(580, 265, 22, 12, wallGrad(558, 253, 602, 277));
  ctx.save();
  ctx.shadowColor = CYAN;
  ctx.shadowBlur = sw(8);
  const cyanTubeB = ctx.createLinearGradient(sx(570), sy(255), sx(590), sy(255));
  cyanTubeB.addColorStop(0, '#005b66'); cyanTubeB.addColorStop(0.5, CYAN); cyanTubeB.addColorStop(1, '#005b66');
  ell(580, 255, 10, 6, cyanTubeB);
  ctx.restore();

  // lower tier base: walls, then the large lower roof surface
  fillPoly([[230, 340], [380, 420], [380, 360], [230, 290]], rustGrad(230, 290, 380, 420));
  strokePoly([[230, 340], [380, 420], [380, 360], [230, 290]], '#1a2126', 1.2);
  fillPoly([[380, 420], [570, 340], [570, 280], [380, 360]], wallGrad(380, 280, 570, 420));
  strokePoly([[380, 420], [570, 340], [570, 280], [380, 360]], '#1a2126', 1.2);
  fillPoly([[230, 290], [380, 360], [570, 280], [420, 220]], roofRustGrad(230, 220, 570, 360));
  strokePoly([[230, 290], [380, 360], [570, 280], [420, 220]], '#2c353d', 1.5);

  // upper tier: factory core walls + roof
  fillPoly([[280, 240], [380, 290], [380, 240], [280, 200]], wallGrad(280, 200, 380, 290));
  fillPoly([[380, 290], [510, 235], [510, 190], [380, 240]], rustGrad(380, 190, 510, 290));
  fillPoly([[280, 200], [380, 240], [510, 190], [410, 160]], roofGrad(280, 160, 510, 240));
  strokePoly([[280, 200], [380, 240], [510, 190], [410, 160]], '#1a2126', 1.5);

  // roof exhaust stacks
  ell(350, 195, 12, 7, '#111');
  ctx.fillStyle = wallGrad(338, 180, 362, 195);
  ctx.fillRect(sx(338), sy(180), sw(24), sh(15));
  ell(350, 180, 12, 7, roofGrad(338, 173, 362, 187));
  ell(350, 180, 8, 4, '#090d12');

  ell(380, 205, 9, 5, '#111');
  ctx.fillStyle = rustGrad(371, 193, 389, 205);
  ctx.fillRect(sx(371), sy(193), sw(18), sh(12));
  ell(380, 193, 9, 5, roofRustGrad(371, 188, 389, 198));
  ell(380, 193, 5, 3, '#090d12');

  // roof air intake grid
  fillPoly([[420, 200], [460, 185], [480, 193], [440, 208]], '#222b33');
  strokePoly([[420, 200], [460, 185], [480, 193], [440, 208]], '#455463', 1.2);
  ctx.save();
  ctx.strokeStyle = CYAN;
  ctx.shadowColor = CYAN;
  ctx.shadowBlur = sw(3);
  ctx.lineWidth = 1;
  [[430, 200, 450, 192], [435, 202, 455, 194], [440, 204, 460, 196]].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(sx(x1), sy(y1));
    ctx.lineTo(sx(x2), sy(y2));
    ctx.stroke();
  });
  ctx.restore();

  // piping: heavy rusted pipeline off the left silo, glowing energy conduit off the roof
  ctx.beginPath();
  ctx.moveTo(sx(235), sy(230));
  ctx.bezierCurveTo(sx(235), sy(280), sx(180), sy(300), sx(140), sy(310));
  ctx.strokeStyle = '#222';
  ctx.lineWidth = sh(12);
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(sx(235), sy(230));
  ctx.bezierCurveTo(sx(235), sy(280), sx(180), sy(300), sx(140), sy(310));
  ctx.strokeStyle = '#6e4b38';
  ctx.lineWidth = sh(8);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(sx(510), sy(210));
  ctx.lineTo(sx(545), sy(225));
  ctx.lineTo(sx(545), sy(270));
  ctx.lineTo(sx(580), sy(280));
  ctx.strokeStyle = '#1b2228';
  ctx.lineWidth = sh(7);
  ctx.stroke();
  ctx.save();
  ctx.shadowColor = CYAN;
  ctx.shadowBlur = sw(4);
  ctx.beginPath();
  ctx.moveTo(sx(510), sy(210));
  ctx.lineTo(sx(545), sy(225));
  ctx.lineTo(sx(545), sy(270));
  ctx.lineTo(sx(580), sy(280));
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = sh(3);
  ctx.stroke();
  ctx.restore();

  // roof ribs / structural supports
  ctx.strokeStyle = '#2e3842';
  ctx.lineWidth = sh(3);
  [[310, 212, 410, 172], [330, 220, 430, 180], [350, 228, 450, 188]].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(sx(x1), sy(y1));
    ctx.lineTo(sx(x2), sy(y2));
    ctx.stroke();
  });

  // vault entrance, flattened isometric archway
  fillPoly([[250, 350], [320, 388], [320, 340], [250, 305]], '#1d242a');
  strokePoly([[250, 350], [320, 388], [320, 340], [250, 305]], '#37434f', 1);
  fillPoly([[260, 355], [310, 382], [310, 348], [260, 322]], '#0d1114');
  ctx.save();
  ctx.globalAlpha *= 0.35;
  ctx.shadowColor = ORANGE;
  ctx.shadowBlur = sw(6);
  fillPoly([[265, 352], [305, 374], [305, 352], [265, 332]], ORANGE);
  ctx.restore();

  // entrance ramp pad & light track
  ctx.save();
  ctx.globalAlpha *= 0.8;
  ctx.shadowColor = ORANGE;
  ctx.shadowBlur = sw(6);
  fillPoly([[235, 360], [265, 350], [310, 375], [280, 388]], ORANGE);
  ctx.restore();
  ctx.save();
  ctx.shadowColor = ORANGE;
  ctx.shadowBlur = sw(4);
  strokePoly([[225, 365], [260, 352], [315, 380], [275, 395]], ORANGE, sh(2));
  ctx.restore();

  // door status light arc
  ctx.save();
  ctx.shadowColor = ORANGE;
  ctx.shadowBlur = sw(5);
  ctx.strokeStyle = ORANGE;
  ctx.lineWidth = sh(4);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(sx(255), sy(310));
  ctx.lineTo(sx(315), sy(342));
  ctx.stroke();
  ctx.restore();
}

// Bowman's Watch: a timber platform up on four angled stilts — tall enough
// to genuinely rise off the map at the same oblique angle as the camera —
// ringed with sharpened stakes, and topped with a swiveling alien crossbow
// that tracks whatever it's about to shoot, or sweeps the horizon when it
// has nothing to aim at. Returns the platform's topmost y, so callers can
// float the HP bar/label above the actual structure instead of the (much
// lower) generic building box.
function drawArrowTower(ctx, cx, groundY, w, accent, aimAngle, hasTarget) {
  const r = w * 0.46;
  const platformCy = groundY - w * 1.55;

  // ground shadow under the whole stilted structure
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(cx, groundY, r * 1.35, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Four legs laid out explicitly (not by angle alone — mirrored angles
  // produce the same cosine and silently collapse onto one visible line).
  // Back pair sits higher/narrower and is drawn first so it reads as set
  // behind the front pair, which is wider and reaches all the way down —
  // the same near/far trick used for the buildings' roof/side shading.
  const backHipY = platformCy + r * 0.26;
  const frontHipY = platformCy + r * 0.42;
  const legs = [
    { hipX: cx - r * 0.5, hipY: backHipY, footX: cx - r * 1.05, footY: groundY - r * 0.32, front: false },
    { hipX: cx + r * 0.5, hipY: backHipY, footX: cx + r * 1.05, footY: groundY - r * 0.32, front: false },
    { hipX: cx - r * 0.68, hipY: frontHipY, footX: cx - r * 1.7, footY: groundY, front: true },
    { hipX: cx + r * 0.68, hipY: frontHipY, footX: cx + r * 1.7, footY: groundY, front: true },
  ];
  ctx.lineCap = 'round';
  legs.forEach((leg) => {
    ctx.strokeStyle = leg.front ? '#4a3524' : '#3a2a1a';
    ctx.lineWidth = Math.max(1.5, r * (leg.front ? 0.13 : 0.1));
    ctx.beginPath();
    ctx.moveTo(leg.hipX, leg.hipY);
    ctx.lineTo(leg.footX, leg.footY);
    ctx.stroke();
  });
  // cross braces, roughly a third of the way down each pair
  ctx.strokeStyle = '#3a2a1c';
  ctx.lineWidth = Math.max(1.5, r * 0.055);
  [[0, 1, 0.5], [2, 3, 0.55]].forEach(([ai, bi, t]) => {
    const a = legs[ai];
    const b = legs[bi];
    const braceY = a.hipY + (a.footY - a.hipY) * t;
    ctx.beginPath();
    ctx.moveTo(a.hipX + (a.footX - a.hipX) * t, braceY);
    ctx.lineTo(b.hipX + (b.footX - b.hipX) * t, braceY);
    ctx.stroke();
  });

  // round timber platform, lit from the same overhead sun as the ground
  const platGrad = ctx.createLinearGradient(cx - LIGHT.x * r, platformCy - LIGHT.y * r, cx + LIGHT.x * r, platformCy + LIGHT.y * r);
  platGrad.addColorStop(0, '#8a6a44');
  platGrad.addColorStop(1, '#4a3626');
  ctx.beginPath();
  ctx.arc(cx, platformCy, r, 0, Math.PI * 2);
  ctx.fillStyle = platGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // plank seams
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1;
  [-0.5, 0, 0.5].forEach((fx) => {
    const half = Math.sqrt(Math.max(0, r * r - fx * fx * r * r));
    ctx.beginPath();
    ctx.moveTo(cx + fx * r, platformCy - half);
    ctx.lineTo(cx + fx * r, platformCy + half);
    ctx.stroke();
  });

  // ring of sharpened stakes around the rim
  ctx.fillStyle = '#6b4e30';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const sxp = cx + Math.cos(a) * r * 0.98;
    const syp = platformCy + Math.sin(a) * r * 0.98;
    ctx.save();
    ctx.translate(sxp, syp);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(r * 0.16, 0);
    ctx.lineTo(-r * 0.06, -r * 0.09);
    ctx.lineTo(-r * 0.06, r * 0.09);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // accent glow ring, marking its firing radius
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.globalAlpha *= 0.55;
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.beginPath();
  ctx.arc(cx, platformCy, r * 0.82, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // quiver, fanned with a few arrow shafts pointing outward
  const qx = cx - r * 0.6;
  const qy = platformCy + r * 0.5;
  ctx.fillStyle = '#5c4023';
  ctx.beginPath();
  ctx.ellipse(qx, qy, r * 0.14, r * 0.11, Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9a06a';
  ctx.lineWidth = Math.max(1, r * 0.045);
  [-0.35, 0, 0.35].forEach((spread) => {
    ctx.beginPath();
    ctx.moveTo(qx, qy);
    ctx.lineTo(qx - r * (0.5 + spread * 0.2), qy + r * (0.5 - spread * 0.5));
    ctx.stroke();
  });

  drawAlienCrossbow(ctx, cx, platformCy, r, aimAngle, hasTarget);

  return platformCy - r * 1.15;
}

// A funny little alien contraption riding on top of the platform: curved
// glow-arms with a taut string, a big googly single eye standing in for a
// sight, and a nocked bolt — swivels on its base to track its target, or
// keeps a slow sentry sweep going when it doesn't have one.
function drawAlienCrossbow(ctx, cx, cy, r, angle, active) {
  ctx.save();
  ctx.translate(cx, cy - r * 0.15);
  ctx.rotate(angle);

  const glow = active ? '#8dffb8' : '#5c9c78';

  // swivel base
  ctx.fillStyle = '#2e2418';
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.34, r * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // curved bow arms, facing forward (+x, the aim direction)
  ctx.strokeStyle = glow;
  ctx.lineWidth = Math.max(1.5, r * 0.06);
  ctx.beginPath();
  ctx.arc(-r * 0.02, 0, r * 0.36, -Math.PI * 0.4, Math.PI * 0.4);
  ctx.stroke();

  // taut bowstring, meeting at the nock point
  const tipTopX = -r * 0.02 + Math.cos(-Math.PI * 0.4) * r * 0.36;
  const tipTopY = Math.sin(-Math.PI * 0.4) * r * 0.36;
  const tipBotX = -r * 0.02 + Math.cos(Math.PI * 0.4) * r * 0.36;
  const tipBotY = Math.sin(Math.PI * 0.4) * r * 0.36;
  ctx.strokeStyle = 'rgba(210,255,225,0.65)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tipTopX, tipTopY);
  ctx.lineTo(r * 0.22, 0);
  ctx.lineTo(tipBotX, tipBotY);
  ctx.stroke();

  // stock body
  ctx.fillStyle = '#463b2c';
  ctx.beginPath();
  ctx.ellipse(-r * 0.1, 0, r * 0.24, r * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // big googly alien eye standing in for a sight — gives it its funny,
  // wide-awake "always on the lookout" character
  ctx.beginPath();
  ctx.fillStyle = '#e8fff2';
  ctx.ellipse(-r * 0.06, -r * 0.02, r * 0.15, r * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.stroke();
  ctx.beginPath();
  ctx.fillStyle = active ? '#1c8a52' : '#2c4c3c';
  ctx.shadowColor = glow;
  ctx.shadowBlur = active ? r * 0.35 : r * 0.1;
  ctx.arc(-r * 0.01, -r * 0.02, r * 0.075, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.fillStyle = '#0a0a0a';
  ctx.arc(0, -r * 0.02, r * 0.032, 0, Math.PI * 2);
  ctx.fill();

  // nocked, glowing bolt — ready to fire
  ctx.strokeStyle = glow;
  ctx.lineWidth = Math.max(1, r * 0.035);
  ctx.beginPath();
  ctx.moveTo(-r * 0.12, 0);
  ctx.lineTo(r * 0.3, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.fillStyle = glow;
  ctx.moveTo(r * 0.34, 0);
  ctx.lineTo(r * 0.22, -r * 0.05);
  ctx.lineTo(r * 0.22, r * 0.05);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
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
    const isLaserRover = u.def.id === 'laserRover';
    const isFrostTrike = u.def.id === 'frostTrike';
    const r = tileSize * 0.24 * (isLaserRover ? 1.7 : isWorker ? 1.5 : (isSoldier || isFrostTrike) ? 1.2 : 1);

    if (selected) {
      ctx.beginPath();
      ctx.ellipse(px, py + r * 0.6, r * 1.5, r * 0.7, 0, 0, Math.PI * 2);
      ctx.strokeStyle = '#5fe0ff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    drawContactShadow(ctx, px, py + r * 0.7, r * 1.7);

    if (isWorker) {
      const walkPhase = (state.elapsed / 130) + (u.walkSeed || 0);
      drawWorkerVehicle(ctx, px, py, r, u.moving, walkPhase, u.facing || 1);
    } else if (isSoldier) {
      const walkPhase = (state.elapsed / 130) + (u.walkSeed || 0);
      drawWastelandTrooper(ctx, px, py, r, u.moving, walkPhase, u.facing || 1);
    } else if (isLaserRover) {
      const phase = (state.elapsed / 130) + (u.walkSeed || 0);
      drawLaserRover(ctx, px, py, r, u.moving, phase, u.facing || 1);
    } else if (isFrostTrike) {
      const phase = (state.elapsed / 130) + (u.walkSeed || 0);
      drawFrostTrike(ctx, px, py, r, u.moving, phase, u.facing || 1);
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

// Krezkit's ride: a stand-on skid-steer loader ported from the SkidSteer.html
// prototype — alien operator gripping the joystick console, bucket loaded
// with glowing crystal ore, wheels spinning while it drives. Replaces the
// old walking prospector bot for the graphics overhaul.
const SKID_YELLOW = '#ffd700';
const SKID_BLACK = '#1e2024';
const SKID_ALIEN_SKIN = '#94e8b4';
const SKID_VEST = '#d4ff00';

function drawSkidSteerWheel(ctx, x, y, rotationAngle) {
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 16, 16, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1c1e22';
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#333842';
  ctx.stroke();

  ctx.fillStyle = SKID_YELLOW;
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(rotationAngle);
  ctx.fillStyle = '#222';
  ctx.fillRect(-6, -2, 12, 4);
  ctx.fillRect(-2, -6, 4, 12);
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawWorkerVehicle(ctx, px, py, r, moving, phase, facing) {
  ctx.save();
  const dir = facing >= 0 ? 1 : -1;
  const scale = r / 58;
  // ground contact (wheel base) lines up with the rest of the game's units,
  // which anchor their contact shadow at py + r * 0.7
  ctx.translate(px, py + r * 0.7);
  ctx.scale(scale, scale);
  ctx.translate(0, -10);
  if (dir === -1) ctx.scale(-1, 1);
  ctx.scale(1, 0.866); // oblique compression, matching the ~60° overhead camera

  const vib = moving ? Math.sin(phase * 4) * 0.8 : 0;
  ctx.translate(0, vib);
  const wheelRotation = moving ? phase * 4 : 0;

  // rear operator standing platform
  ctx.fillStyle = SKID_BLACK;
  ctx.fillRect(-65, 12, 22, 5);
  ctx.fillRect(-63, 5, 4, 8);

  // main chassis
  ctx.fillStyle = SKID_YELLOW;
  ctx.beginPath();
  ctx.moveTo(-45, -28);
  ctx.lineTo(15, -28);
  ctx.lineTo(28, -5);
  ctx.lineTo(28, 8);
  ctx.lineTo(-45, 8);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = SKID_BLACK;
  ctx.fillRect(-45, -12, 70, 10);
  ctx.fillStyle = 'white';
  ctx.font = 'bold 7px sans-serif';
  ctx.fillText('KREZKIT', -24, -5);

  // control console tower
  ctx.fillStyle = SKID_YELLOW;
  ctx.beginPath();
  ctx.moveTo(-45, -28);
  ctx.lineTo(-30, -42);
  ctx.lineTo(-20, -42);
  ctx.lineTo(-20, -28);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#888';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-28, -42);
  ctx.lineTo(-28, -48);
  ctx.stroke();
  ctx.fillStyle = '#cc0000';
  ctx.beginPath();
  ctx.arc(-28, -49, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // wheels
  drawSkidSteerWheel(ctx, -32, 10, wheelRotation);
  drawSkidSteerWheel(ctx, 12, 10, wheelRotation);

  // standing alien operator
  ctx.save();
  ctx.translate(-55, 12);
  ctx.scale(1.8, 2.0);

  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.ellipse(-2, 0, 3, 1.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(3, 0, 3, 1.2, 0, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = SKID_ALIEN_SKIN;
  ctx.fillRect(-3, -16, 2.5, 16);
  ctx.fillRect(2, -16, 2.5, 16);

  ctx.translate(0, -16);
  ctx.fillStyle = SKID_VEST;
  ctx.beginPath();
  ctx.roundRect(-7, -14, 14, 14, 3);
  ctx.fill();
  ctx.fillStyle = 'white';
  ctx.fillRect(-7, -11, 14, 1.5);
  ctx.fillRect(-7, -5, 14, 1.5);

  ctx.strokeStyle = SKID_ALIEN_SKIN;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(2, -8);
  ctx.lineTo(15, -17);
  ctx.stroke();

  ctx.translate(0, -14);
  ctx.fillStyle = SKID_ALIEN_SKIN;
  ctx.beginPath();
  ctx.ellipse(0, -5, 7.5, 9.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'black';
  ctx.beginPath(); ctx.ellipse(-3, -5, 2.5, 4, 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(3, -5, 2.5, 4, -0.1, 0, Math.PI * 2); ctx.fill();

  ctx.translate(0, -12);
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(0, 0, 8.5, Math.PI, 0);
  ctx.lineTo(10, 0); ctx.lineTo(-10, 0);
  ctx.fill();
  ctx.strokeStyle = '#bbb';
  ctx.stroke();

  ctx.restore(); // end alien operator

  // front lift arm + bucket
  ctx.strokeStyle = SKID_BLACK;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-40, -22);
  ctx.quadraticCurveTo(-5, -55, 38, -10);
  ctx.stroke();

  ctx.fillStyle = SKID_YELLOW;
  ctx.beginPath(); ctx.arc(-40, -22, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(38, -10, 3, 0, Math.PI * 2); ctx.fill();

  ctx.translate(42, -10);
  ctx.rotate(0.15);

  // glowing crystal ore payload
  ctx.save();
  ctx.fillStyle = '#5fe0ff';
  ctx.shadowColor = '#4fe7ff';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.ellipse(6, -6, 14, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = SKID_BLACK;
  ctx.beginPath();
  ctx.moveTo(-4, -6);
  ctx.lineTo(20, -1);
  ctx.lineTo(18, 18);
  ctx.lineTo(-4, 14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1;
  ctx.stroke();

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

  // rim light along the sun-facing edge of the coat
  ctx.strokeStyle = 'rgba(255,224,190,0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px - r * 0.4, by - r * 0.56);
  ctx.lineTo(px - r * 0.56, by + r * 0.46);
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

// Star Rover: a high-profile six-wheeled combat rover, viewed at the same
// oblique ~60° angle as the buildings — a raised armored hull sits visibly
// above its wheels (a dark skirt between them sells the height) instead of
// reading as a flat top-down silhouette, topped with a turret-mounted laser
// that swivels to face whichever way the rover is driving.
function drawLaserRover(ctx, px, py, r, moving, phase, facing) {
  ctx.save();
  const dir = facing >= 0 ? 1 : -1;
  const bob = moving ? Math.abs(Math.sin(phase * 3)) * r * 0.03 : 0;
  const groundY = py + r * 0.55 - bob;
  const hullBottomY = groundY - r * 0.16;
  const hullTopY = hullBottomY - r * 0.62;

  // three wheels along the near side — the other three are implied, hidden
  // behind the hull, same convention as the skid-steer worker vehicle
  ctx.fillStyle = '#141416';
  [-0.55, 0, 0.55].forEach((fx) => {
    ctx.beginPath();
    ctx.ellipse(px + fx * r, groundY, r * 0.18, r * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = '#8a6a44';
  [-0.55, 0, 0.55].forEach((fx) => {
    ctx.beginPath();
    ctx.arc(px + fx * r, groundY, r * 0.05, 0, Math.PI * 2);
    ctx.fill();
  });

  // dark lower skirt between the wheels and the hull — the short "wall"
  // that, same as on the buildings, is what makes the height read
  ctx.fillStyle = '#232a30';
  ctx.beginPath();
  ctx.roundRect(px - r * 0.85, hullBottomY, r * 1.7, groundY - hullBottomY, r * 0.08);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // wide armored hull/hood — the dominant lit surface
  const hullGrad = ctx.createLinearGradient(px, hullTopY, px, hullBottomY);
  hullGrad.addColorStop(0, '#c3d2db');
  hullGrad.addColorStop(1, '#5c6b78');
  ctx.beginPath();
  ctx.roundRect(px - r * 0.85, hullTopY, r * 1.7, hullBottomY - hullTopY, r * 0.18);
  ctx.fillStyle = hullGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // rim light along the sun-facing top edge
  ctx.strokeStyle = 'rgba(255,230,190,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px - r * 0.8, hullTopY + r * 0.06);
  ctx.lineTo(px + r * 0.6, hullTopY + r * 0.06);
  ctx.stroke();

  // hull panel seams
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1;
  [-0.32, 0.1, 0.5].forEach((fx) => {
    ctx.beginPath();
    ctx.moveTo(px + fx * r, hullTopY + r * 0.08);
    ctx.lineTo(px + fx * r, hullBottomY - r * 0.05);
    ctx.stroke();
  });

  // raised turret on the hull
  const turretCy = hullTopY + r * 0.3;
  ctx.fillStyle = '#3d4650';
  ctx.beginPath();
  ctx.arc(px, turretCy, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.stroke();

  // laser barrel, pointed the way it's driving
  ctx.strokeStyle = '#242a30';
  ctx.lineWidth = r * 0.13;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(px + dir * r * 0.16, turretCy);
  ctx.lineTo(px + dir * r * 0.86, turretCy);
  ctx.stroke();

  // glowing laser core + emitter tip
  ctx.save();
  ctx.fillStyle = '#ff5d5d';
  ctx.shadowColor = '#ff5d5d';
  ctx.shadowBlur = r * 0.38;
  ctx.beginPath();
  ctx.arc(px, turretCy, r * 0.11, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(px + dir * r * 0.86, turretCy, r * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

// Frost Trike: a light three-wheeler — two rear wheels, one front wheel,
// and a forward cryo-emitter dish that pulses with cold light.
function drawFrostTrike(ctx, px, py, r, moving, phase, facing) {
  ctx.save();
  const dir = facing >= 0 ? 1 : -1;
  const bob = moving ? Math.abs(Math.sin(phase * 4)) * r * 0.04 : 0;
  const by = py - bob;

  ctx.fillStyle = '#141416';
  [-1, 1].forEach((side) => {
    ctx.beginPath();
    ctx.ellipse(px - dir * r * 0.4, by + side * r * 0.36, r * 0.14, r * 0.19, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.beginPath();
  ctx.ellipse(px + dir * r * 0.55, by, r * 0.13, r * 0.17, 0, 0, Math.PI * 2);
  ctx.fill();

  // slim frosted chassis, tapering toward the front wheel
  const bodyGrad = ctx.createLinearGradient(px, by - r * 0.3, px, by + r * 0.3);
  bodyGrad.addColorStop(0, '#eaf9ff');
  bodyGrad.addColorStop(1, '#9fd0e0');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(px - dir * r * 0.5, by - r * 0.32);
  ctx.lineTo(px + dir * r * 0.5, by - r * 0.12);
  ctx.lineTo(px + dir * r * 0.5, by + r * 0.12);
  ctx.lineTo(px - dir * r * 0.5, by + r * 0.32);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px - dir * r * 0.5, by - r * 0.3);
  ctx.lineTo(px + dir * r * 0.5, by - r * 0.12);
  ctx.stroke();

  // cryo emitter dish, out front
  const emitX = px + dir * r * 0.62;
  ctx.beginPath();
  ctx.arc(emitX, by, r * 0.16, 0, Math.PI * 2);
  ctx.fillStyle = '#2a3a42';
  ctx.fill();
  ctx.save();
  ctx.fillStyle = '#bdf2ff';
  ctx.shadowColor = '#bdf2ff';
  ctx.shadowBlur = r * 0.4;
  ctx.beginPath();
  ctx.arc(emitX, by, r * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // pulsing cold ring
  ctx.save();
  ctx.globalAlpha = 0.35 + 0.25 * Math.sin(phase * 2);
  ctx.strokeStyle = '#bdf2ff';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(emitX, by, r * 0.24, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

function drawEnemies(ctx, state) {
  const { tileSize } = state;
  state.enemies.forEach((e) => {
    const px = e.x * tileSize;
    const py = e.y * tileSize;
    const r = tileSize * 0.24;
    const frozen = e.frozenUntil > state.elapsed;
    drawContactShadow(ctx, px, py + r * 0.7, r * 1.7);

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

    if (frozen) drawFrozenLasso(ctx, px, py, r, state.elapsed / 500);

    drawHpBar(ctx, px - r, py - r * 1.8, r * 2, r * 0.35, e.hp / e.maxHp);
  });
}

// A lasso cinched around a frozen enemy — a zigzag rope loop (with a
// trailing tail and knot) instead of a static ice shell, so it reads as
// "roped and held" rather than just chilled. Slowly spins in place, like
// the loop is still settling after the throw.
function drawFrozenLasso(ctx, px, py, r, phase) {
  const segs = 14;
  const baseR = r * 1.2;
  const zig = r * 0.16;
  const spin = phase * 0.6;

  ctx.save();
  ctx.strokeStyle = '#bdf2ff';
  ctx.lineWidth = Math.max(1.5, r * 0.1);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = '#bdf2ff';
  ctx.shadowBlur = r * 0.3;
  ctx.beginPath();
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2 + spin;
    const rr = baseR + (i % 2 === 0 ? zig : -zig);
    const x = px + Math.cos(a) * rr;
    const y = py + Math.sin(a) * rr * 0.82; // slight ellipse — sits better over a round body
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  // brighter inner pass, like taut rope catching the light
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = Math.max(1, r * 0.035);
  ctx.shadowBlur = 0;
  ctx.stroke();

  // trailing tail and knot, as if the slack end is still hanging off
  const tailA = spin + 0.6;
  const tailStartR = baseR + zig;
  const tailX1 = px + Math.cos(tailA) * tailStartR;
  const tailY1 = py + Math.sin(tailA) * tailStartR * 0.82;
  const tailX2 = tailX1 + Math.cos(tailA + 0.5) * r * 0.5;
  const tailY2 = tailY1 + Math.sin(tailA + 0.5) * r * 0.5 + r * 0.3;
  ctx.strokeStyle = '#bdf2ff';
  ctx.lineWidth = Math.max(1.5, r * 0.08);
  ctx.beginPath();
  ctx.moveTo(tailX1, tailY1);
  ctx.lineTo(tailX2, tailY2);
  ctx.stroke();
  ctx.fillStyle = '#bdf2ff';
  ctx.beginPath();
  ctx.arc(tailX2, tailY2, r * 0.09, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawProjectiles(ctx, state) {
  const { tileSize } = state;
  state.projectiles.forEach((p) => {
    const x1 = p.x1 * tileSize; const y1 = p.y1 * tileSize;
    const x2 = p.x2 * tileSize; const y2 = p.y2 * tileSize;
    if (p.kind === 'arrow') {
      drawArrowProjectile(ctx, x1, y1, x2, y2, p.color);
      return;
    }
    if (p.kind === 'laser') {
      drawLaserProjectile(ctx, x1, y1, x2, y2, p.color);
      return;
    }
    if (p.kind === 'freeze') {
      drawFreezeProjectile(ctx, x1, y1, x2, y2, p.color);
      return;
    }
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });
}

// A rover's laser: a thick glowing core beam with a thin bright center line.
function drawLaserProjectile(ctx, x1, y1, x2, y2, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.2;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

// A trike's freeze weapon: a lasso throw — a zigzag rope trailing from the
// trike, opening into a loop right where it's about to cinch down.
function drawFreezeProjectile(ctx, x1, y1, x2, y2, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 4;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const segs = 5;
  ctx.beginPath();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const zig = (i === 0 || i === segs) ? 0 : (i % 2 === 0 ? 1 : -1) * 3.5;
    const x = x1 + dx * t + nx * zig;
    const y = y1 + dy * t + ny * zig;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // open loop at the target end, about to close around it
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.ellipse(x2, y2, 8, 6, 0, 0.3, Math.PI * 1.9);
  ctx.stroke();
  ctx.restore();
}

// A fired arrow: wooden shaft, a triangular head at the target end, and a
// small fletching notch at the tail — distinct from the plain laser tracers.
function drawArrowProjectile(ctx, x1, y1, x2, y2, color) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.translate(x2, y2);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(-2, -3);
  ctx.lineTo(-2, 3);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  const tailX = -Math.hypot(x2 - x1, y2 - y1);
  ctx.beginPath();
  ctx.moveTo(tailX, 0);
  ctx.lineTo(tailX + 5, -2.5);
  ctx.moveTo(tailX, 0);
  ctx.lineTo(tailX + 5, 2.5);
  ctx.stroke();
  ctx.restore();
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
