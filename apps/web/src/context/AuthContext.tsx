import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User } from "../types";
import { api, tokenStorage } from "../services/api";

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const setAuthData = useCallback((token: string | null, userData: User | null) => {
    tokenStorage.set(token);
    setAccessToken(token);
    setUser(userData);
  }, []);

  // Check existing session via HttpOnly refresh cookie on initial mount
  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        const data = await api.auth.refresh();
        if (mounted && data) {
          setAuthData(data.accessToken, data.user);
        }
      } catch {
        if (mounted) {
          setAuthData(null, null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    checkAuth();

    const handleUnauthorized = () => {
      setAuthData(null, null);
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => {
      mounted = false;
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, [setAuthData]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await api.auth.login({ email, password });
      setAuthData(data.accessToken, data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // Ignore logout errors
    } finally {
      setAuthData(null, null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
