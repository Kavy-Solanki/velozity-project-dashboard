export type Role = "ADMIN" | "PROJECT_MANAGER" | "DEVELOPER";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Client {
  id: string;
  name: string;
  createdAt: string;
  _count?: {
    projects: number;
  };
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  clientId: string;
  createdById: string;
  createdAt: string;
  client?: Client;
  createdBy?: User;
  _count?: {
    tasks: number;
  };
  tasks?: Task[];
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  assignedDeveloperId?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
  project?: Project;
  assignedDeveloper?: User | null;
}

export interface ActivityLog {
  id: string;
  taskId: string;
  actorId: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  createdAt: string;
  actor: User;
  task: Task & {
    project: Project;
  };
}

export interface Notification {
  id: string;
  recipientId: string;
  taskId?: string | null;
  message: string;
  readAt?: string | null;
  createdAt: string;
  task?: {
    id: string;
    title: string;
    projectId?: string;
  };
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  dueFrom?: string;
  dueTo?: string;
  projectId?: string;
}
