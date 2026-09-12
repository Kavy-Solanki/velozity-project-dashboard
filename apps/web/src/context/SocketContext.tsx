import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { ActivityLog, Notification } from "../types";
import { api } from "../services/api";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUserCount: number;
  notifications: Notification[];
  unreadCount: number;
  activities: ActivityLog[];
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  refreshActivities: () => Promise<void>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface ActivityCursor {
  createdAt: string;
  id: string;
}

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, accessToken } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [onlineUserCount, setOnlineUserCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [activities, setActivities] = useState<ActivityLog[]>([]);

  const activityCursor = useRef<ActivityCursor | null>(null);

  // Initial fetch for notifications and activity
  const loadInitialData = useCallback(async () => {
    if (!user) return;
    activityCursor.current = null;
    try {
      const [notifs, unread, initialActivities] = await Promise.all([
        api.notifications.list().catch(() => []),
        api.notifications.getUnreadCount().catch(() => ({ count: 0 })),
        api.activity.getCatchup({ limit: 20 }).catch(() => []),
      ]);

      setNotifications(notifs);
      setUnreadCount(unread.count);
      setActivities(initialActivities);

      if (initialActivities.length > 0) {
        const lastActivity = initialActivities[initialActivities.length - 1];
        activityCursor.current = {
          createdAt: lastActivity.createdAt,
          id: lastActivity.id,
        };
      }
    } catch (err) {
      console.error("Failed to load initial data:", err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadInitialData();
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setActivities([]);
      setOnlineUserCount(0);
      activityCursor.current = null;
    }
  }, [user, loadInitialData]);

  // Socket Connection Lifecycle
  useEffect(() => {
    if (!user || !accessToken) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const wsUrl = import.meta.env.VITE_WS_URL || window.location.origin;

    const s = io(wsUrl, {
      auth: { token: accessToken },
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    s.on("connect", () => {
      setIsConnected(true);

      // Trigger Missed-Event Catchup directly from PostgreSQL
      if (activityCursor.current) {
        s.emit(
          "activity:catchup",
          {
            since: activityCursor.current.createdAt,
            lastId: activityCursor.current.id,
          },
          (response: { success: boolean; data?: ActivityLog[] }) => {
            if (response?.success && response.data && response.data.length > 0) {
              setActivities((prev) => {
                const existingIds = new Set(prev.map((a) => a.id));
                const newItems = response.data!.filter((a) => !existingIds.has(a.id));
                const combined = [...prev, ...newItems].slice(-50);
                if (combined.length > 0) {
                  const lastActivity = combined[combined.length - 1];
                  activityCursor.current = {
                    createdAt: lastActivity.createdAt,
                    id: lastActivity.id,
                  };
                }
                return combined;
              });
            }
          },
        );
      }
    });

    s.on("disconnect", () => {
      setIsConnected(false);
    });

    // Real-time presence count (Admin only)
    s.on("presence:count", (data: { count: number }) => {
      setOnlineUserCount(data.count);
    });

    // Real-time activity events
    s.on("activity:new", (activity: ActivityLog) => {
      setActivities((prev) => {
        if (prev.some((a) => a.id === activity.id)) return prev;
        const updated = [...prev, activity].slice(-50);
        activityCursor.current = {
          createdAt: activity.createdAt,
          id: activity.id,
        };
        return updated;
      });
      // Trigger a custom event for views to refresh their task list if needed
      window.dispatchEvent(new CustomEvent("task:updated", { detail: activity }));
    });

    // Real-time notifications
    s.on("notification:new", (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev.filter((n) => n.id !== notification.id)]);
    });

    // Real-time notification unread badge count (no polling!)
    s.on("notification:count", (data: { count: number }) => {
      setUnreadCount(data.count);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [user, accessToken]);

  const markNotificationAsRead = async (id: string) => {
    try {
      const updated = await api.notifications.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? updated : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await api.notifications.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: new Date().toISOString() })),
      );
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const refreshActivities = async () => {
    try {
      const latest = await api.activity.getCatchup({ limit: 20 });
      setActivities(latest);
      if (latest.length > 0) {
        const lastActivity = latest[latest.length - 1];
        activityCursor.current = {
          createdAt: lastActivity.createdAt,
          id: lastActivity.id,
        };
      }
    } catch (err) {
      console.error("Failed to refresh activities:", err);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineUserCount,
        notifications,
        unreadCount,
        activities,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        refreshActivities,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
