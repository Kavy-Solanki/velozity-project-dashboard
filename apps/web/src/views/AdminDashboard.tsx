import React, { useState, useEffect, useCallback } from "react";
import { Project, Task, TaskFilters, TaskStatus } from "../types";
import { api } from "../services/api";
import { useSocket } from "../context/SocketContext";
import { TaskFilterBar } from "../components/TaskFilterBar";
import { TaskCard } from "../components/TaskCard";
import { ActivityFeed } from "../components/ActivityFeed";
import { CreateProjectModal } from "../components/CreateProjectModal";
import { CreateTaskModal } from "../components/CreateTaskModal";
import { FolderKanban, CheckSquare, AlertTriangle, Users, Plus } from "lucide-react";

export const AdminDashboard: React.FC = () => {
  const { onlineUserCount } = useSocket();
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
      console.error("Admin dashboard fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen to global real-time task update events
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

  return (
    <div className="dashboard-layout">
      {/* Top Header & Stat Cards */}
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Admin Global Operations</h1>
          <p className="page-subtitle">Full system visibility, presence metrics, and real-time oversight</p>
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

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon bg-purple-50 text-purple-600">
            <FolderKanban size={22} />
          </div>
          <div>
            <span className="stat-label">Total Projects</span>
            <span className="stat-value">{projects.length}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-blue-50 text-blue-600">
            <CheckSquare size={22} />
          </div>
          <div>
            <span className="stat-label">Total Tasks</span>
            <span className="stat-value">{tasks.length}</span>
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

        <div className="stat-card">
          <div className="stat-icon bg-emerald-50 text-emerald-600">
            <Users size={22} />
          </div>
          <div>
            <span className="stat-label">Live Online Users</span>
            <span className="stat-value text-emerald-600">{onlineUserCount}</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Projects & Tasks on left, Realtime Feed on right */}
      <div className="dashboard-main-grid">
        <div className="dashboard-left-col">
          {/* Projects Table */}
          <div className="content-card mb-6">
            <div className="content-card-header">
              <h2 className="content-card-title">All Client Projects</h2>
              <span className="text-xs text-muted">{projects.length} active</span>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Project Name</th>
                    <th>Client</th>
                    <th>Created By</th>
                    <th>Tasks</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.id}>
                      <td className="font-medium text-slate-900">{p.name}</td>
                      <td>{p.client?.name || "N/A"}</td>
                      <td>{p.createdBy?.name || "Admin"}</td>
                      <td>
                        <span className="badge badge-gray">
                          {p._count?.tasks ?? 0} tasks
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tasks Section with Filter Bar */}
          <div className="content-card">
            <div className="content-card-header">
              <h2 className="content-card-title">Global Tasks Directory</h2>
              <span className="text-xs text-muted">{tasks.length} matching</span>
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
              <div className="p-8 text-center text-muted">No tasks match the selected filters.</div>
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
