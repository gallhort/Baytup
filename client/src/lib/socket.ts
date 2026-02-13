import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private connectionCallbacks: Set<() => void> = new Set();
  private disconnectionCallbacks: Set<() => void> = new Set();
  private isInitialized: boolean = false;

  constructor() {
    // Don't auto-connect in constructor to avoid SSR/build-time issues
    // Connection will be initialized on first use
  }

  private connect() {
    // Only connect in browser environment
    if (typeof window === 'undefined') {
      return;
    }

    if (this.socket?.connected) return;

    const token = localStorage.getItem('token');
    if (!token) {
      // Don't connect without auth - server requires authentication
      return;
    }

    const SERVER_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

    this.socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      auth: {
        token
      }
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.connectionCallbacks.forEach(callback => callback());
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      this.disconnectionCallbacks.forEach(callback => callback());
    });

    this.socket.on('connect_error', (error) => {
      console.error('🚫 Socket connection error:', error);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      this.isConnected = true;
      this.connectionCallbacks.forEach(callback => callback());
    });

    this.socket.on('reconnect_failed', () => {
      console.error('💥 Failed to reconnect to server after maximum attempts');
    });

    this.isInitialized = true;
  }

  private ensureConnection() {
    if (typeof window === 'undefined') {
      return;
    }
    if (!this.isInitialized) {
      this.connect();
    }
  }

  // Connection status methods
  public getConnectionStatus(): boolean {
    this.ensureConnection();
    return this.isConnected && this.socket?.connected || false;
  }

  public onConnect(callback: () => void) {
    this.ensureConnection();
    this.connectionCallbacks.add(callback);
    if (this.isConnected) callback();

    return () => this.connectionCallbacks.delete(callback);
  }

  public onDisconnect(callback: () => void) {
    this.ensureConnection();
    this.disconnectionCallbacks.add(callback);
    return () => this.disconnectionCallbacks.delete(callback);
  }

  // Listings methods
  public joinListingsRoom(filters?: any) {
    this.ensureConnection();
    if (!this.socket) return;
    this.socket.emit('join-listings', filters);
  }

  public leaveListingsRoom() {
    this.ensureConnection();
    if (!this.socket) return;
    this.socket.emit('leave-listings');
  }

  public searchListings(searchData: any): Promise<any> {
    this.ensureConnection();
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }


      // Set up one-time listeners for this search
      const successHandler = (data: any) => {
        this.socket?.off('listings-error', errorHandler);
        resolve(data);
      };

      const errorHandler = (error: any) => {
        console.error('❌ Listings search error:', error);
        this.socket?.off('listings-data', successHandler);
        reject(error);
      };

      // Set up listeners
      this.socket.once('listings-data', successHandler);
      this.socket.once('listings-error', errorHandler);

      // Emit search request
      this.socket.emit('search-listings', searchData);
    });
  }

  public onListingsUpdate(callback: (data: any) => void) {
    this.ensureConnection();
    if (!this.socket) return () => {};

    const handler = (data: any) => {
      callback(data);
    };

    this.socket.on('listings-updated', handler);

    return () => this.socket?.off('listings-updated', handler);
  }

  // Individual listing methods
  public joinListingRoom(listingId: string) {
    this.ensureConnection();
    if (!this.socket) return;
    this.socket.emit('join-listing', listingId);
  }

  public leaveListingRoom(listingId: string) {
    this.ensureConnection();
    if (!this.socket) return;
    this.socket.emit('leave-listing', listingId);
  }

  public onListingUpdate(listingId: string, callback: (data: any) => void) {
    this.ensureConnection();
    if (!this.socket) return () => {};

    const handler = (data: any) => {
      callback(data);
    };

    this.socket.on(`listing-${listingId}-updated`, handler);

    return () => this.socket?.off(`listing-${listingId}-updated`, handler);
  }

  // Generic event methods
  public on(event: string, callback: (data: any) => void) {
    this.ensureConnection();
    if (!this.socket) return () => {};
    this.socket.on(event, callback);
    return () => this.socket?.off(event, callback);
  }

  public emit(event: string, data?: any) {
    this.ensureConnection();
    if (!this.socket) return;
    this.socket.emit(event, data);
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.isInitialized = false;
    }
  }

  // Utility method to wait for connection
  public waitForConnection(): Promise<void> {
    this.ensureConnection();
    return new Promise((resolve) => {
      if (this.isConnected) {
        resolve();
      } else {
        const cleanup = this.onConnect(() => {
          cleanup();
          resolve();
        });
      }
    });
  }
}

// Create and export singleton instance
const socketService = new SocketService();

export default socketService;
export { SocketService };