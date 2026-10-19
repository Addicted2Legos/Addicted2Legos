function update() {
  if (!network) return; // Wait in lobby

  if (isHost) {
    // Host moves Rover using local keys
    if (keys.w) gameState.rover.y -= gameState.rover.speed;
    if (keys.s) gameState.rover.y += gameState.rover.speed;
    if (keys.a) gameState.rover.x -= gameState.rover.speed;
    if (keys.d) gameState.rover.x += gameState.rover.speed;

    // Host moves Scavenger using remote keys sent over network
    if (remoteKeys.ArrowUp) gameState.scavenger.y -= gameState.scavenger.speed;
    if (remoteKeys.ArrowDown) gameState.scavenger.y += gameState.scavenger.speed;
    if (remoteKeys.ArrowLeft) gameState.scavenger.x -= gameState.scavenger.speed;
    if (remoteKeys.ArrowRight) gameState.scavenger.x += gameState.scavenger.speed;

    // Broadcast authoritative state to the client
    network.send({ type: 'STATE', state: gameState });
    
  } else {
    // Client constantly sends their keystrokes to the Host
    network.send({ type: 'INPUT', keys: keys });
  }
}