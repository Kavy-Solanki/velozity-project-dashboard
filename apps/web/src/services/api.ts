import {
  User,
  Project,
  Task,
  Client,
  Notification,
  ActivityLog,
  TaskFilters,
  TaskStatus,
} from "../types";

let inMemoryAccessToken: string | null = null;

export const tokenStorage = {
  get: () => inMemoryAccessToken,
  set: (token: string | null) => {
    inMemoryAccessToken = token;
  },
};

const BASE_URL = import.meta.env.VITE_API_URL || "/api/v1";

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth, headers, ...customOptions } = options;

  const reqHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  const token = tokenStorage.get();
  if (token && !skipAuth) {
    reqHeaders["Authorization"] = `Bearer ${token}`;
  }

  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...customOptions,
    headers: reqHeaders,
    credentials: "include", // For HttpOnly refresh cookie
  });

  // Handle 401: attempt silent refresh once
  if (response.status === 401 && !endpoint.startsWith("/auth/login") && !endpoint.startsWith("/auth/refresh")) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          const newToken = data.data.accessToken;
          tokenStorage.set(newToken);
          isRefreshing = false;
          onRefreshed(newToken);

          // Retry original request
          reqHeaders["Authorization"] = `Bearer ${newToken}`;
          const retryRes = await fetch(url, {
            ...customOptions,
            headers: reqHeaders,
            credentials: "include",
          });
          const retryData = await retryRes.json();
          if (!retryRes.ok) throw new Error(retryData.error?.message || "Request failed");
          return retryData.data;
        } else {
          isRefreshing = false;
          tokenStorage.set(null);
          window.dispatchEvent(new Event("auth:unauthorized"));
          throw new Error("Session expired. Please log in again.");
        }
      } catch (err) {
        isRefreshing = false;
        tokenStorage.set(null);
        window.dispatchEvent(new Event("auth:unauthorized"));
        throw err;
      }
    } else {
      // Queue requests while refreshing
      return new Promise<T>((resolve, reject) => {
        refreshSubscribers.push(async (newToken: string) => {
          try {
            reqHeaders["Authorization"] = `Bearer ${newToken}`;
            const retryRes = await fetch(url, {
              ...customOptions,
              headers: reqHeaders,
              credentials: "include",
            });
            const retryData = await retryRes.json();
            if (!retryRes.ok) throw new Error(retryData.error?.message || "Request failed");
            resolve(retryData.data);
          } catch (e) {
            reject(e);
          }
        });
      });
    }
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.error?.message || "An error occurred";
    throw new Error(errorMsg);
  }

  return data.data;
}

export const api = {
  auth: {
    login: (credentials: { email: string; password: string }) =>
      request<{ accessToken: string; user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
        skipAuth: true,
      }),
    refresh: () =>
      request<{ accessToken: string; user: User }>("/auth/refresh", {
        method: "POST",
        skipAuth: true,
      }),
    logout: () =>
      request<{ success: boolean }>("/auth/logout", {
        method: "POST",
      }),
    me: () => request<User>("/auth/me"),
    listUsers: (role?: string) =>
      request<User[]>(`/auth/users${role ? `?role=${role}` : ""}`),
  },

  projects: {
    list: () => request<Project[]>("/projects"),
    get: (id: string) => request<Project>(`/projects/${id}`),
    create: (data: { name: string; description?: string; clientId: string }) =>
      request<Project>("/projects", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<{ name: string; description?: string; clientId: string }>) =>
      request<Project>(`/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/projects/${id}`, {
        method: "DELETE",
      }),
  },

  tasks: {
    list: (filters: TaskFilters = {}) => {
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.priority) params.append("priority", filters.priority);
      if (filters.dueFrom) params.append("dueFrom", filters.dueFrom);
      if (filters.dueTo) params.append("dueTo", filters.dueTo);
      if (filters.projectId) params.append("projectId", filters.projectId);

      const qs = params.toString();
      return request<Task[]>(`/tasks${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) => request<Task>(`/tasks/${id}`),
    create: (data: {
      projectId: string;
      title: string;
      description?: string;
      assignedDeveloperId?: string | null;
      priority?: string;
      dueDate: string;
    }) =>
      request<Task>("/tasks", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Task>) =>
      request<Task>(`/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    updateStatus: (id: string, status: TaskStatus) =>
      request<Task>(`/tasks/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/tasks/${id}`, {
        method: "DELETE",
      }),
  },

  clients: {
    list: () => request<Client[]>("/clients"),
    create: (data: { name: string }) =>
      request<Client>("/clients", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  activity: {
    getCatchup: (params: { since?: string; lastId?: string; limit?: number } = {}) => {
      const query = new URLSearchParams();
      if (params.since) query.append("since", params.since);
      if (params.lastId) query.append("lastId", params.lastId);
      if (params.limit) query.append("limit", params.limit.toString());
      const qs = query.toString();
      return request<ActivityLog[]>(`/activity/catchup${qs ? `?${qs}` : ""}`);
    },
  },

  notifications: {
    list: () => request<Notification[]>("/notifications"),
    getUnreadCount: () => request<{ count: number }>("/notifications/unread-count"),
    markAsRead: (id: string) =>
      request<Notification>(`/notifications/${id}/read`, {
        method: "PATCH",
      }),
    markAllAsRead: () =>
      request<{ success: boolean }>("/notifications/read-all", {
        method: "POST",
      }),
  },
};
