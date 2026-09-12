import React from "react";
import { useSocket } from "../context/SocketContext";
import { Activity, RefreshCw } from "lucide-react";

export const ActivityFeed: React.FC = () => {
  const { activities, isConnected, refreshActivities } = useSocket();

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      TODO: "status-todo",
      IN_PROGRESS: "status-progress",
      IN_REVIEW: "status-review",
      DONE: "status-done",
    };
    return <span className={`status-pill ${map[status] || ""}`}>{status.replace("_", " ")}</span>;
  };

  return (
    <div className="activity-panel">
      <div className="activity-header">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-brand" />
          <h3 className="m-0 font-semibold text-base">Real-Time Activity Feed</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">
            {isConnected ? "Live stream (DB-backed)" : "Offline catch-up"}
          </span>
          <button className="icon-button-sm" onClick={() => refreshActivities()} title="Reload from PostgreSQL">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      <div className="activity-stream">
        {activities.length === 0 ? (
          <div className="p-4 text-center text-muted text-sm">No recent activity</div>
        ) : (
          activities
            .slice()
            .reverse()
            .map((act) => (
              <div key={act.id} className="activity-item">
                <div className="activity-avatar">
                  {act.actor?.name ? act.actor.name.charAt(0) : "U"}
                </div>
                <div className="activity-details">
                  <div className="activity-top">
                    <span className="activity-actor">
                      {act.actor?.name || "User"}
                    </span>
                    <span className="activity-timestamp">
                      {new Date(act.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </div>
                  <div className="activity-task-title">
                    {act.task?.title || "Task"}
                  </div>
                  <div className="activity-transition">
                    {statusBadge(act.fromStatus)} &rarr; {statusBadge(act.toStatus)}
                  </div>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
};
