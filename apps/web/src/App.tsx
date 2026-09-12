import React from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { Navbar } from "./components/Navbar";
import { LoginView } from "./views/LoginView";
import { AdminDashboard } from "./views/AdminDashboard";
import { PMDashboard } from "./views/PMDashboard";
import { DeveloperDashboard } from "./views/DeveloperDashboard";

const DashboardRouter: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="login-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="brand-logo" style={{ animation: "pulse 1.5s infinite" }}>V</div>
          <span className="text-sm text-muted font-medium">Loading session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <SocketProvider>
      <div className="app-container">
        <Navbar />
        <main>
          {user.role === "ADMIN" && <AdminDashboard />}
          {user.role === "PROJECT_MANAGER" && <PMDashboard />}
          {user.role === "DEVELOPER" && <DeveloperDashboard />}
        </main>
      </div>
    </SocketProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DashboardRouter />
    </AuthProvider>
  );
}
