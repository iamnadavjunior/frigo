"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";

interface User { userId: string; role: string; fullName: string; email: string; }
interface AuthContextType { user: User | null; loading: boolean; logout: () => Promise<void>; }

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, logout: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/login") { Promise.resolve().then(() => setLoading(false)); return; }
    fetch("/api/auth/me")
      .then((res) => { if (res.ok) return res.json(); throw new Error(); })
      .then((data) => setUser(data.user))
      .catch(() => { setUser(null); if (pathname !== "/login") router.push("/login"); })
      .finally(() => setLoading(false));
  }, [pathname, router]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
  };

  return <AuthContext.Provider value={{ user, loading, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
