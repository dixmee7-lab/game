import Peer, { DataConnection } from 'peerjs';
import { PeerNetworkMessage, RacerState, CarModelId } from '../types';

export interface RemotePlayer {
  peerId: string;
  name: string;
  carId: CarModelId;
  conn: DataConnection;
  racerState: RacerState;
  lastPing: number;
}

export class MultiplayerNetwork {
  private peer: Peer | null = null;
  private connections = new Map<string, DataConnection>();
  private remotePlayers = new Map<string, RemotePlayer>();
  public myPeerId: string = '';
  public isHost: boolean = false;
  public roomCode: string = '';
  public onPlayerJoined?: (player: RemotePlayer) => void;
  public onPlayerLeft?: (peerId: string) => void;
  public onMessageReceived?: (msg: PeerNetworkMessage) => void;
  public onConnected?: (peerId: string) => void;
  public onError?: (err: any) => void;

  public init(customRoomCode?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Create Peer with clean ID
      const prefix = 'hn-kart-';
      const cleanCode = customRoomCode ? customRoomCode.toUpperCase().replace(/[^A-Z0-9]/g, '') : Math.random().toString(36).substring(2, 7).toUpperCase();
      this.roomCode = cleanCode;
      const fullPeerId = customRoomCode ? `${prefix}${cleanCode}` : `${prefix}${cleanCode}`;

      try {
        this.peer = new Peer(fullPeerId, {
          debug: 1,
        });

        this.peer.on('open', (id) => {
          this.myPeerId = id;
          if (this.onConnected) this.onConnected(id);
          resolve(cleanCode);
        });

        this.peer.on('connection', (conn) => {
          this.handleIncomingConnection(conn);
        });

        this.peer.on('error', (err) => {
          console.warn('Peer error:', err);
          if (this.onError) this.onError(err);
          // If ID is taken, connect as client
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  public joinRoom(targetRoomCode: string, playerName: string, carId: CarModelId): Promise<void> {
    return new Promise((resolve, reject) => {
      const prefix = 'hn-kart-';
      const hostFullId = `${prefix}${targetRoomCode.toUpperCase().trim()}`;
      
      // Initialize client peer with random ID
      const clientPeerId = `${prefix}client-${Math.random().toString(36).substring(2, 8)}`;
      this.peer = new Peer(clientPeerId, { debug: 1 });

      this.peer.on('open', (myId) => {
        this.myPeerId = myId;
        const conn = this.peer!.connect(hostFullId, {
          reliable: false, // low-latency UDP-style Datachannel
          metadata: { name: playerName, carId },
        });

        conn.on('open', () => {
          this.connections.set(hostFullId, conn);
          this.setupConnectionHandlers(conn, hostFullId, playerName, carId);
          resolve();
        });

        conn.on('error', (err) => {
          reject(err);
        });
      });

      this.peer.on('error', (err) => {
        reject(err);
      });
    });
  }

  private handleIncomingConnection(conn: DataConnection) {
    conn.on('open', () => {
      const meta = conn.metadata || {};
      const name = meta.name || `Racer-${conn.peer.substring(conn.peer.length - 4)}`;
      const carId: CarModelId = meta.carId || 'ioniq-5-n';

      this.connections.set(conn.peer, conn);
      this.setupConnectionHandlers(conn, conn.peer, name, carId);
    });
  }

  private setupConnectionHandlers(conn: DataConnection, peerId: string, name: string, carId: CarModelId) {
    const remoteRacer: RacerState = {
      id: peerId,
      name,
      carId,
      isPlayer: false,
      isAi: false,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      speed: 0,
      driftGauge: 0,
      isDrifting: false,
      driftDirection: 0,
      isBoosting: false,
      isHyperBoosting: false,
      boostTimeRemaining: 0,
      isFlying: false,
      flyingTimeRemaining: 0,
      invulnerableTimeRemaining: 0,
      hasItem: 'none',
      currentLap: 1,
      lapProgress: 0,
      totalDistance: 0,
      rank: 2,
      lapTimes: [],
      bestLapTime: null,
      finishTime: null,
      isFinished: false,
    };

    const remotePlayer: RemotePlayer = {
      peerId,
      name,
      carId,
      conn,
      racerState: remoteRacer,
      lastPing: Date.now(),
    };

    this.remotePlayers.set(peerId, remotePlayer);
    if (this.onPlayerJoined) {
      this.onPlayerJoined(remotePlayer);
    }

    conn.on('data', (data: any) => {
      if (this.onMessageReceived) {
        this.onMessageReceived(data as PeerNetworkMessage);
      }

      if (data.type === 'sync' && data.data) {
        const d = data.data;
        const player = this.remotePlayers.get(peerId);
        if (player) {
          player.lastPing = Date.now();
          player.racerState.position = d.position;
          player.racerState.rotation = d.rotation;
          player.racerState.speed = d.speed;
          player.racerState.isDrifting = d.isDrifting;
          player.racerState.driftDirection = d.driftDirection;
          player.racerState.isBoosting = d.isBoosting;
          player.racerState.isHyperBoosting = d.isHyperBoosting;
          player.racerState.isFlying = d.isFlying;
          player.racerState.invulnerableTimeRemaining = d.invulnerableTimeRemaining;
          player.racerState.lapProgress = d.lapProgress;
          player.racerState.currentLap = d.currentLap;
          player.racerState.isFinished = d.isFinished;
        }
      }
    });

    conn.on('close', () => {
      this.connections.delete(peerId);
      this.remotePlayers.delete(peerId);
      if (this.onPlayerLeft) {
        this.onPlayerLeft(peerId);
      }
    });
  }

  public broadcast(msg: PeerNetworkMessage) {
    this.connections.forEach((conn) => {
      if (conn.open) {
        conn.send(msg);
      }
    });
  }

  public getRemotePlayers(): RemotePlayer[] {
    return Array.from(this.remotePlayers.values());
  }

  public disconnect() {
    this.connections.forEach((conn) => conn.close());
    this.connections.clear();
    this.remotePlayers.clear();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }
}

export const multiplayerNet = new MultiplayerNetwork();
