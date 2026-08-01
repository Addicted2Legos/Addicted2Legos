/**
 * INPUT
 * Translates taps/clicks on the canvas into game commands. Works with both
 * mouse and touch since it listens for pointer events.
 */
function setupInput(canvas, state, callbacks) {
  function eventToTile(evt) {
    const rect = canvas.getBoundingClientRect();
    const px = evt.clientX - rect.left;
    const py = evt.clientY - rect.top;
    return {
      col: Math.floor(px / state.tileSize),
      row: Math.floor(py / state.tileSize),
      worldX: px / state.tileSize,
      worldY: py / state.tileSize,
    };
  }

  canvas.addEventListener('pointermove', (evt) => {
    if (!state.placementMode) return;
    const { col, row } = eventToTile(evt);
    state.hoverTile = { col, row };
  });

  canvas.addEventListener('pointerdown', (evt) => {
    evt.preventDefault();
    const tile = eventToTile(evt);

    if (state.placementMode) {
      callbacks.onPlacementTap(tile.col, tile.row);
      return;
    }

    // 1) Did we tap on a player unit? -> select it.
    const tappedUnit = findUnitNear(state.units, tile.worldX, tile.worldY, state.tileSize);
    if (tappedUnit) {
      state.selectedUnitIds = [tappedUnit.id];
      callbacks.onSelectionChanged();
      return;
    }

    // 2) Did we tap on a building? -> select it (for training units).
    const tappedBuilding = findBuildingAt(state.buildings, tile.col, tile.row);
    if (tappedBuilding) {
      callbacks.onBuildingTap(tappedBuilding);
      return;
    }

    // 3) If units are selected, this tap is a command.
    if (state.selectedUnitIds.length > 0) {
      const tappedEnemy = findUnitNear(state.enemies, tile.worldX, tile.worldY, state.tileSize);
      const tappedNode = findNodeAt(state.map.nodes, tile.col, tile.row);

      state.selectedUnitIds.forEach((id) => {
        const unit = state.units.find((u) => u.id === id);
        if (!unit) return;
        unit.idleAlerted = false;
        if (tappedEnemy && unit.def.damage) {
          unit.job = { kind: 'attack', targetId: tappedEnemy.id };
        } else if (tappedNode && unit.def.gatherRate) {
          unit.job = { kind: 'gather', nodeId: tappedNode.id };
        } else {
          unit.job = { kind: 'move' };
          unit.targetX = tile.worldX;
          unit.targetY = tile.worldY;
        }
      });
      return;
    }

    // 4) Nothing selected, tapped empty ground -> deselect.
    state.selectedUnitIds = [];
    callbacks.onSelectionChanged();
  });
}

function findUnitNear(list, wx, wy, tileSize) {
  const radius = 0.45;
  let closest = null;
  let closestDist = Infinity;
  list.forEach((u) => {
    const d = Math.hypot(u.x - wx, u.y - wy);
    if (d < radius && d < closestDist) { closest = u; closestDist = d; }
  });
  return closest;
}

function findBuildingAt(buildings, col, row) {
  return buildings.find((b) => col >= b.col && col < b.col + b.def.size.w
    && row >= b.row && row < b.row + b.def.size.h);
}

function findNodeAt(nodes, col, row) {
  return nodes.find((n) => n.col === col && n.row === row && n.amount > 0);
}
