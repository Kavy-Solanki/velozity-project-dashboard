import React, { useState, useEffect, useCallback } from "react";
import { Project, Task, TaskFilters, TaskStatus } from "../types";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { TaskFilterBar } from "../components/TaskFilterBar";
import { TaskCard } from "../components/TaskCard";
import { ActivityFeed } from "../components/ActivityFeed";
import { CreateProjectModal } from "../components/CreateProjectModal";
import { CreateTaskModal } from "../components/CreateTaskModal";
import { FolderKanban, CheckSquare, AlertTriangle, Clock, Plus } from "lucide-react";

export const PMDashboard: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filters, setFilters] = useState<TaskFilters>({});
  const [isLoading, setIsLoading] = useState(true);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [projData, taskData] = await Promise.all([
        api.projects.list(),
        api.tasks.list(filters),
      ]);
      setProjects(projData);
      setTasks(taskData);
    } catch (err) {
      console.error("PM dashboard fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen to real-time task update events
  useEffect(() => {
    const handleTaskUpdated = () => {
      fetchData();
    };
    window.addEventListener("task:updated", handleTaskUpdated);
    return () => window.removeEventListener("task:updated", handleTaskUpdated);
  }, [fetchData]);

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

  const overdueCount = tasks.filter((t) => t.isOverdue).length;
  const inReviewCount = tasks.filter((t) => t.status === "IN_REVIEW").length;

  return (
    <div className="dashboard-layout">
      {/* Top Header & Actions */}
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Project Management Portal</h1>
          <p className="page-subtitle">Welcome back, {user?.name}. Managing your owned client projects.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setIsProjectModalOpen(true)}>
            <Plus size={16} /> New Project
          </button>
          <button className="btn-primary" onClick={() => setIsTaskModalOpen(true)}>
            <Plus size={16} /> New Task
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon bg-blue-50 text-blue-600">
            <FolderKanban size={22} />
          </div>
          <div>
            <span className="stat-label">My Projects</span>
            <span className="stat-value">{projects.length}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-indigo-50 text-indigo-600">
            <CheckSquare size={22} />
          </div>
          <div>
            <span className="stat-label">Managed Tasks</span>
            <span className="stat-value">{tasks.length}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-amber-50 text-amber-600">
            <Clock size={22} />
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
            <span className="stat-label">Overdue Tasks</span>
            <span className="stat-value text-rose-600">{overdueCount}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-main-grid">
        <div className="dashboard-left-col">
          {/* Projects Quick Overview */}
          <div className="content-card mb-6">
            <div className="content-card-header">
              <h2 className="content-card-title">My Projects</h2>
              <span className="text-xs text-muted">{projects.length} created</span>
            </div>
            <div className="projects-card-grid">
              {projects.map((p) => (
                <div key={p.id} className="project-item-card">
                  <div className="project-item-top">
                    <h3 className="project-item-name">{p.name}</h3>
                    <span className="badge badge-blue">{p._count?.tasks ?? 0} tasks</span>
                  </div>
                  <p className="project-item-desc">{p.description || "No description provided."}</p>
                  <div className="project-item-footer">
                    <span>Client: <strong>{p.client?.name || "N/A"}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tasks Section with Filter Bar */}
          <div className="content-card">
            <div className="content-card-header">
              <h2 className="content-card-title">Project Tasks Directory</h2>
              <span className="text-xs text-muted">{tasks.length} matching filters</span>
            </div>

            <TaskFilterBar
              filters={filters}
              onFilterChange={setFilters}
              projects={projects}
              showProjectFilter={true}
            />

            {isLoading ? (
              <div className="p-8 text-center text-muted">Loading tasks...</div>
            ) : tasks.length === 0 ? (
              <div className="p-8 text-center text-muted">No tasks found matching current filters.</div>
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

      <CreateProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onCreated={fetchData}
      />

      <CreateTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onCreated={fetchData}
        projects={projects}
      />
    </div>
  );
};
