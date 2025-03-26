import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';

class SocketManager {
  private static instance: SocketManager;
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  private constructor() {}

  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  connect() {
    if (!this.socket) {
      const socketUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      
      // Configure socket options
      this.socket = io(socketUrl, {
        transports: ['websocket'], // Force WebSocket transport
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        forceNew: true,
        // Add path if your server uses a specific path
        path: '/socket.io',
        // Handle different platforms
        extraHeaders: Platform.select({
          ios: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          android: {},
        }) as { [header: string]: string } | undefined,
      });

      // Setup event listeners
      this.socket.on('connect', () => {
        console.log('Socket connected successfully');
        this.reconnectAttempts = 0;
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.log('Max reconnection attempts reached, stopping reconnection');
          this.socket?.disconnect();
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
      });
    }

    return this.socket;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.reconnectAttempts = 0;
    }
  }
}

export const socketManager = SocketManager.getInstance(); 