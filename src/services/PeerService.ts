
import Peer, { DataConnection } from 'peerjs';
import { Connection, GameEvent } from '../types/game';

class PeerService {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private eventListeners: Map<string, ((data: any) => void)[]> = new Map();
  private currentPeerId: string | null = null;

  initialize(username: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer();
        
        this.peer.on('open', (id) => {
          console.log('My peer ID is: ' + id);
          this.currentPeerId = id;
          resolve(id);
        });

        this.peer.on('connection', (conn) => {
          console.log('Connection received from: ', conn.peer);
          this.setupConnection(conn);
        });

        this.peer.on('error', (err) => {
          console.error('Peer error:', err);
          reject(err);
        });
      } catch (error) {
        console.error('Failed to initialize peer:', error);
        reject(error);
      }
    });
  }

  connectToPeer(peerId: string): Promise<Connection> {
    return new Promise((resolve, reject) => {
      if (!this.peer) {
        reject(new Error('Peer not initialized'));
        return;
      }

      try {
        const conn = this.peer.connect(peerId, {
          reliable: true
        });

        conn.on('open', () => {
          console.log('Connected to: ' + conn.peer);
          this.setupConnection(conn);
          resolve({ id: conn.peer, name: conn.metadata?.name || 'Unknown' });
        });

        conn.on('error', (err) => {
          console.error('Connection error:', err);
          reject(err);
        });
      } catch (error) {
        console.error('Failed to connect to peer:', error);
        reject(error);
      }
    });
  }

  private setupConnection(conn: DataConnection) {
    this.connections.set(conn.peer, conn);

    conn.on('data', (data: GameEvent) => {
      console.log('Received data:', data);
      this.handleEvent(data);
    });

    conn.on('close', () => {
      console.log('Connection closed with: ' + conn.peer);
      this.connections.delete(conn.peer);
      this.emit('peer-disconnected', { peerId: conn.peer });
    });

    conn.on('error', (err) => {
      console.error('Connection error:', err);
    });
  }

  sendToAll(event: GameEvent): void {
    this.connections.forEach((conn) => {
      conn.send(event);
    });
  }

  sendToPeer(peerId: string, event: GameEvent): void {
    const conn = this.connections.get(peerId);
    if (conn) {
      conn.send(event);
    } else {
      console.error('No connection found for peer:', peerId);
    }
  }

  on(eventType: string, callback: (data: any) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)?.push(callback);
  }

  off(eventType: string, callback: (data: any) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(eventType: string, data: any): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }

  handleEvent(event: GameEvent): void {
    this.emit(event.type, event.payload);
  }

  getCurrentPeerId(): string | null {
    return this.currentPeerId;
  }

  getConnections(): Connection[] {
    return Array.from(this.connections.keys()).map(id => ({
      id,
      name: 'Player'
    }));
  }

  disconnect(): void {
    this.connections.forEach((conn) => {
      conn.close();
    });
    this.connections.clear();
    this.peer?.destroy();
    this.peer = null;
    this.currentPeerId = null;
  }
}

export default new PeerService();
