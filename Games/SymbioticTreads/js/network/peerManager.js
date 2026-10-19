export class PeerManager {
  constructor(isHost, roomCode, onDataReceived, onOpenCallback) {
    this.isHost = isHost;
    this.onDataReceived = onDataReceived;
    this.onOpenCallback = onOpenCallback;
    this.connections = [];
    this.myId = null;
    
    // Generate a random 5-character ID for the host, or use the provided code to join
    this.peerId = isHost ? this.generateId() : null;
    this.peer = new Peer(this.peerId);

    this.peer.on('open', (id) => {
      this.myId = id;
      console.log(`My Peer ID: ${id}`);
      if (this.onOpenCallback) this.onOpenCallback(id);
      if (isHost) {
        // Host ready
      } else {
        this.connectToHost(roomCode);
      }
    });

    if (this.isHost) {
      this.peer.on('connection', (conn) => this.setupConnection(conn));
    }
  }

  generateId() {
    return 'base-' + Math.random().toString(36).substring(2, 7);
  }

  connectToHost(roomCode) {
    const conn = this.peer.connect(roomCode);
    this.setupConnection(conn);
  }

  setupConnection(conn) {
    conn.on('open', () => {
      console.log('Connected to peer!');
      this.connections.push(conn);
    });

    conn.on('data', (data) => {
      this.onDataReceived(data);
    });
  }

  send(data) {
    this.connections.forEach(conn => {
      if (conn.open) conn.send(data);
    });
  }
}
