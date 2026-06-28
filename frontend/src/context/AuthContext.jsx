import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("dabba-user");
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.checkAuth()
      .then((res) => setUser(res.payload))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user) localStorage.setItem("dabba-user", JSON.stringify(user));
    else localStorage.removeItem("dabba-user");
  }, [user]);

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: Boolean(user),
    login: async (credentials) => {
      const res = await api.login(credentials);
      setUser(res.payload);
      return res;
    },
    register: async (payload) => {
      const res = await api.register(payload);
      setUser(res.payload);
      return res;
    },
    logout: async () => {
      await api.logout();
      setUser(null);
    },
    updateProfile: async (payload) => {
      const res = await api.updateProfile(payload);
      setUser(res.payload);
      return res;
    }
  }), [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
