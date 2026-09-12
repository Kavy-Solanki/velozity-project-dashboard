class PresenceTracker {
  // Map of userId -> Set of active socketIds
  private userSockets: Map<string, Set<string>> = new Map();

  add(userId: string, socketId: string): { isNewUser: boolean; onlineCount: number } {
    let sockets = this.userSockets.get(userId);
    const isNewUser = !sockets || sockets.size === 0;

    if (!sockets) {
      sockets = new Set();
      this.userSockets.set(userId, sockets);
    }
    sockets.add(socketId);

    return {
      isNewUser,
      onlineCount: this.userSockets.size,
    };
  }

  remove(userId: string, socketId: string): { isUserOffline: boolean; onlineCount: number } {
    const sockets = this.userSockets.get(userId);
    if (!sockets) {
      return { isUserOffline: false, onlineCount: this.userSockets.size };
    }

    sockets.delete(socketId);
    const isUserOffline = sockets.size === 0;

    if (isUserOffline) {
      this.userSockets.delete(userId);
    }

    return {
      isUserOffline,
      onlineCount: this.userSockets.size,
    };
  }

  getOnlineCount(): number {
    return this.userSockets.size;
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }
}

export const presenceTracker = new PresenceTracker();
