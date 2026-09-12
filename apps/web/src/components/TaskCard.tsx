import React, { useState } from "react";
import { Task, TaskStatus } from "../types";
import { useAuth } from "../context/AuthContext";
import { Clock, AlertTriangle, CheckCircle, ArrowRight } from "lucide-react";

interface TaskCardProps {
  task: Task;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<void>;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onStatusChange }) => {
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusClick = async (nextStatus: TaskStatus) => {
    setIsUpdating(true);
    try {
      await onStatusChange(task.id, nextStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  const priorityColors: Record<string, string> = {
    LOW: "badge-gray",
    MEDIUM: "badge-blue",
    HIGH: "badge-orange",
    CRITICAL: "badge-red",
  };

  const statusColors: Record<string, string> = {
    TODO: "status-todo",
    IN_PROGRESS: "status-progress",
    IN_REVIEW: "status-review",
    DONE: "status-done",
  };

  const isDev = user?.role === "DEVELOPER";

  return (
    <div className={`task-card ${task.isOverdue ? "task-overdue-border" : ""}`}>
      <div className="task-card-header">
        <div className="task-badges">
          <span className={`badge ${priorityColors[task.priority]}`}>
            {task.priority}
          </span>
          <span className={`status-pill ${statusColors[task.status]}`}>
            {task.status.replace("_", " ")}
          </span>
          {task.isOverdue && (
            <span className="overdue-tag" title="Overdue: detected by background scheduler">
              <AlertTriangle size={12} /> Overdue
            </span>
          )}
        </div>

        {task.project && (
          <span className="task-project-name" title={task.project.name}>
            {task.project.name}
          </span>
        )}
      </div>

      <h3 className="task-title">{task.title}</h3>
      {task.description && <p className="task-desc">{task.description}</p>}

      <div className="task-meta">
        <div className="task-due-date">
          <Clock size={13} />
          <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
        </div>
        {task.assignedDeveloper && (
          <div className="task-assignee">
            <span>Dev: <strong>{task.assignedDeveloper.name}</strong></span>
          </div>
        )}
      </div>

      <div className="task-actions">
        {/* Developer Quick Status Actions */}
        {isDev ? (
          <div className="dev-status-buttons">
            {task.status === "TODO" && (
              <button
                disabled={isUpdating}
                className="btn-action btn-start"
                onClick={() => handleStatusClick("IN_PROGRESS")}
              >
                Start Task <ArrowRight size={13} />
              </button>
            )}
            {task.status === "IN_PROGRESS" && (
              <button
                disabled={isUpdating}
                className="btn-action btn-review"
                onClick={() => handleStatusClick("IN_REVIEW")}
              >
                Send for Review <ArrowRight size={13} />
              </button>
            )}
            {task.status === "IN_REVIEW" && (
              <span className="in-review-note">
                <Clock size={13} /> In review by Project Manager
              </span>
            )}
            {task.status === "DONE" && (
              <span className="done-note">
                <CheckCircle size={14} /> Completed
              </span>
            )}
          </div>
        ) : (
          /* PM and Admin Status Dropdown */
          <div className="admin-status-select">
            <label className="text-xs text-muted">Status:</label>
            <select
              value={task.status}
              disabled={isUpdating}
              onChange={(e) => handleStatusClick(e.target.value as TaskStatus)}
            >
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="DONE">Done</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
};
