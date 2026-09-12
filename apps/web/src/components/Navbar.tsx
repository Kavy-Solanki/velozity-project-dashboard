import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { Bell, CheckCheck, Users, LogOut, Wifi, WifiOff } from "lucide-react";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { isConnected, onlineUserCount, notifications, unreadCount, markNotificationAsRead, markAllNotificationsAsRead } = useSocket();
  const [showNotifs, setShowNotifs] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const roleColors: Record<string, string> = {
    ADMIN: "bg-purple-100 text-purple-800 border-purple-200",
    PROJECT_MANAGER: "bg-blue-100 text-blue-800 border-blue-200",
    DEVELOPER: "bg-emerald-100 text-emerald-800 border-emerald-200",
  };

  const roleLabels: Record<string, string> = {
    ADMIN: "Administrator",
    PROJECT_MANAGER: "Project Manager",
    DEVELOPER: "Developer",
  };

  return (
    <header className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <div className="brand-logo">V</div>
          <div>
            <span className="brand-title">Velozity</span>
            <span className="brand-sub">Project Dashboard</span>
          </div>
        </div>

        <div className="navbar-actions">
          {/* Connection status badge */}
          <div className={`status-indicator ${isConnected ? "connected" : "disconnected"}`} title={isConnected ? "WebSocket Connected" : "Connecting..."}>
            {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{isConnected ? "Live" : "Offline"}</span>
          </div>

          {/* Admin Live Online Count */}
          {user.role === "ADMIN" && (
            <div className="presence-badge" title="Live unique active users via WebSocket presence">
              <Users size={15} />
              <span>Online Users: <strong>{onlineUserCount}</strong></span>
            </div>
          )}

          {/* Notification Bell with Unread Badge */}
          <div className="notification-wrapper" ref={dropdownRef}>
            <button
              className="icon-button"
              onClick={() => setShowNotifs((prev) => !prev)}
              aria-label="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && <span className="unread-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
            </button>

            {showNotifs && (
              <div className="notification-dropdown">
                <div className="notification-header">
                  <div>
                    <h4 className="m-0 font-semibold">Notifications</h4>
                    <span className="text-xs text-muted">{unreadCount} unread</span>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      className="mark-all-btn"
                      onClick={() => markAllNotificationsAsRead()}
                    >
                      <CheckCheck size={14} /> Mark all read
                    </button>
                  )}
                </div>

                <div className="notification-list">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-muted text-sm">No notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`notification-item ${n.readAt ? "read" : "unread"}`}
                        onClick={() => !n.readAt && markNotificationAsRead(n.id)}
                      >
                        <div className="notification-dot" />
                        <div className="notification-content">
                          <p className="notification-msg">{n.message}</p>
                          <span className="notification-time">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="user-profile">
            <div className="user-avatar">{user.name.charAt(0)}</div>
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className={`role-pill ${roleColors[user.role]}`}>
                {roleLabels[user.role] || user.role}
              </span>
            </div>
          </div>

          {/* Logout */}
          <button className="logout-btn" onClick={() => logout()} title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};
