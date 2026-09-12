import React, { useEffect } from "react";
import { TaskFilters, TaskStatus, TaskPriority, Project } from "../types";
import { Filter, X } from "lucide-react";

interface TaskFilterBarProps {
  filters: TaskFilters;
  onFilterChange: (filters: TaskFilters) => void;
  projects?: Project[];
  showProjectFilter?: boolean;
}

export const TaskFilterBar: React.FC<TaskFilterBarProps> = ({
  filters,
  onFilterChange,
  projects = [],
  showProjectFilter = false,
}) => {
  // Sync state from URL query parameters on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialFilters: TaskFilters = {};

    const statusParam = params.get("status") as TaskStatus | null;
    if (statusParam) initialFilters.status = statusParam;

    const priorityParam = params.get("priority") as TaskPriority | null;
    if (priorityParam) initialFilters.priority = priorityParam;

    const dueFromParam = params.get("dueFrom");
    if (dueFromParam) initialFilters.dueFrom = dueFromParam;

    const dueToParam = params.get("dueTo");
    if (dueToParam) initialFilters.dueTo = dueToParam;

    const projectParam = params.get("projectId");
    if (projectParam) initialFilters.projectId = projectParam;

    if (Object.keys(initialFilters).length > 0) {
      onFilterChange(initialFilters);
    }
  }, []);

  const updateParam = (key: keyof TaskFilters, value: string | undefined) => {
    const newFilters = { ...filters };
    if (!value) {
      delete newFilters[key];
    } else {
      (newFilters as any)[key] = value;
    }

    // Reflect to URL search params
    const params = new URLSearchParams(window.location.search);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState({}, "", newUrl);

    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    window.history.replaceState({}, "", window.location.pathname);
    onFilterChange({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className="filter-bar">
      <div className="filter-title">
        <Filter size={16} />
        <span>Filter Tasks</span>
      </div>

      <div className="filter-controls">
        {showProjectFilter && projects.length > 0 && (
          <div className="filter-group">
            <label>Project</label>
            <select
              value={filters.projectId || ""}
              onChange={(e) => updateParam("projectId", e.target.value || undefined)}
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="filter-group">
          <label>Status</label>
          <select
            value={filters.status || ""}
            onChange={(e) => updateParam("status", e.target.value || undefined)}
          >
            <option value="">All Statuses</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="DONE">Done</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Priority</label>
          <select
            value={filters.priority || ""}
            onChange={(e) => updateParam("priority", e.target.value || undefined)}
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Due From</label>
          <input
            type="date"
            value={filters.dueFrom ? filters.dueFrom.split("T")[0] : ""}
            onChange={(e) =>
              updateParam(
                "dueFrom",
                e.target.value ? new Date(e.target.value).toISOString() : undefined,
              )
            }
          />
        </div>

        <div className="filter-group">
          <label>Due To</label>
          <input
            type="date"
            value={filters.dueTo ? filters.dueTo.split("T")[0] : ""}
            onChange={(e) =>
              updateParam(
                "dueTo",
                e.target.value ? new Date(e.target.value).toISOString() : undefined,
              )
            }
          />
        </div>

        {hasActiveFilters && (
          <button className="clear-filter-btn" onClick={clearFilters} title="Reset URL filters">
            <X size={14} /> Clear
          </button>
        )}
      </div>
    </div>
  );
};
