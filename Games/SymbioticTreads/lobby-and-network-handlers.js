import { PeerManager } from './network/peerManager.js';

let network = null;
let isHost = false;

// Client inputs received by the Host
let remoteKeys = {}; 

function handleNetworkData(data) {
  if (isHost) {
    // Host receives Scavenger inputs
    if (data.type === 'INPUT') remoteKeys = data.keys;
  } else {
    // Client receives authoritative game state from Host
    if (data.type === 'STATE') {
      gameState.rover.x = data.state.rover.x;
      gameState.rover.y = data.state.rover.y;
      gameState.scavenger.x = data.state.scavenger.x;
      gameState.scavenger.y = data.state.scavenger.y;
    }
  }
}

document.getElementById('btn-host').addEventListener('click', () => {
  isHost = true;
  localTarget = gameState.rover; // Pilot camera follows Rover
  document.getElementById('lobby').style.display = 'none';
  network = new PeerManager(true, null, handleNetworkData);
});

document.getElementById('btn-join').addEventListener('click', () => {
  const code = document.getElementById('input-join').value;
  if (!code) return;
  
  isHost = false;
  localTarget = gameState.scavenger; // Scavenger camera follows Scavenger
  document.getElementById('lobby').style.display = 'none';
  network = new PeerManager(false, code, handleNetworkData);
});