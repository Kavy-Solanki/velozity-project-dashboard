import React, { useState, useEffect, useCallback } from "react";
import { Task, TaskFilters, TaskStatus } from "../types";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { TaskFilterBar } from "../components/TaskFilterBar";
import { TaskCard } from "../components/TaskCard";
import { ActivityFeed } from "../components/ActivityFeed";
import { CheckCircle2, PlayCircle, Clock, AlertTriangle } from "lucide-react";

export const DeveloperDashboard: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filters, setFilters] = useState<TaskFilters>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      const data = await api.tasks.list(filters);
      setTasks(data);
    } catch (err) {
      console.error("Developer tasks fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Listen to real-time task update events
  useEffect(() => {
    const handleTaskUpdated = () => {
      fetchTasks();
    };
    window.addEventListener("task:updated", handleTaskUpdated);
    return () => window.removeEventListener("task:updated", handleTaskUpdated);
  }, [fetchTasks]);

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await api.tasks.updateStatus(taskId, newStatus);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
      );
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    }
  };

  const todoCount = tasks.filter((t) => t.status === "TODO").length;
  const inProgressCount = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const inReviewCount = tasks.filter((t) => t.status === "IN_REVIEW").length;
  const overdueCount = tasks.filter((t) => t.isOverdue).length;

  return (
    <div className="dashboard-layout">
      {/* Top Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Developer Workspace</h1>
          <p className="page-subtitle">Welcome back, {user?.name}. Your assigned deliverables and task queue.</p>
        </div>
      </div>

      {/* Metrics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon bg-slate-100 text-slate-700">
            <Clock size={22} />
          </div>
          <div>
            <span className="stat-label">To Do</span>
            <span className="stat-value">{todoCount}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-blue-50 text-blue-600">
            <PlayCircle size={22} />
          </div>
          <div>
            <span className="stat-label">In Progress</span>
            <span className="stat-value text-blue-600">{inProgressCount}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-amber-50 text-amber-600">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <span className="stat-label">In Review</span>
            <span className="stat-value text-amber-600">{inReviewCount}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-rose-50 text-rose-600">
            <AlertTriangle size={22} />
          </div>
          <div>
            <span className="stat-label">Overdue</span>
            <span className="stat-value text-rose-600">{overdueCount}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-main-grid">
        <div className="dashboard-left-col">
          <div className="content-card">
            <div className="content-card-header">
              <h2 className="content-card-title">My Assigned Tasks</h2>
              <span className="text-xs text-muted">{tasks.length} total tasks</span>
            </div>

            <TaskFilterBar
              filters={filters}
              onFilterChange={setFilters}
              showProjectFilter={false}
            />

            {isLoading ? (
              <div className="p-8 text-center text-muted">Loading assigned tasks...</div>
            ) : tasks.length === 0 ? (
              <div className="p-8 text-center text-muted">No assigned tasks matching selected filters.</div>
            ) : (
              <div className="tasks-grid">
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-right-col">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
};
