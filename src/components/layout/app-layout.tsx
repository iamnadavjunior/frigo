"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { useTheme } from "@/components/theme-provider";
import { useState, useEffect, useCallback, useRef } from "react";

/* ──────────── Sidebar Icons ──────────── */
function IcnSnowflake({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93 4.93 19.07" />
    </svg>
  );
}

function IcnGlobe({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function IcnUsers({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  );
}

function IcnList({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
  );
}

function IcnAlertTriangle({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  );
}

function IcnSettings({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function IcnSearch({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  );
}

function IcnBell({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
    </svg>
  );
}

function IcnDashboard({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
    </svg>
  );
}

function IcnFinance({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
    </svg>
  );
}

function IcnMenu({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

function IcnSun({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
    </svg>
  );
}

function IcnMoon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
    </svg>
  );
}

function IcnClock({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function IcnBriefcase({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
    </svg>
  );
}

function IcnChevronsLeft({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m11 17-5-5 5-5m7 10-5-5 5-5" />
    </svg>
  );
}

function IcnChevronsRight({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 17 5-5-5-5m7 10 5-5-5-5" />
    </svg>
  );
}
function IcnReport({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}
function IcnClipboard({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
    </svg>
  );
}
/* ──────────── Sidebar Icon Button ──────────── */
function SidebarIconButton({
  icon: Icon,
  href,
  active,
  label,
  badge,
  collapsed,
  shortcut,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  active: boolean;
  label: string;
  badge?: boolean;
  collapsed: boolean;
  shortcut?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      title={label}
      className={`relative flex items-center gap-3 rounded-xl transition-all duration-200 ${
        collapsed ? "w-10 h-10 justify-center" : "w-full h-10 px-3"
      } ${
        active
          ? "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400"
          : "text-gray-400 dark:text-gray-500 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/4 dark:hover:text-gray-300"
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {!collapsed && <span className="text-sm font-medium truncate">{label}</span>}
      {!collapsed && shortcut && (
        <span className="ml-auto text-xs text-gray-400/60 dark:text-gray-600 font-mono">{shortcut}</span>
      )}
      {badge && (
        <span className={`absolute ${collapsed ? "top-1 right-1" : "top-1 left-7"} w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#141414]`} />
      )}
    </Link>
  );
}

/* ──────────── Role meta ──────────── */
interface AlertRequest {
  id: string; type: string; urgency: string; status: string; description: string; createdAt: string;
  refrigerator: { serialNumber: string };
  pos: { posName: string; neighbourhood: string | null; city: { name: string } };
  assignedTo: { fullName: string } | null;
}

const roleMeta: Record<string, { label: string; color: string }> = {
  CABU_ADMIN: { label: "CABU Admin", color: "bg-violet-500" },
  TECHNICIAN: { label: "Technician", color: "bg-emerald-500" },
  BRARUDI_DELEGUE: { label: "BRARUDI Délégué", color: "bg-amber-500" },
  BRARUDI_ADMIN: { label: "BRARUDI Admin", color: "bg-orange-500" },
};

/* ════════════════════════════════════════════════════════════════
   Main Layout
   ════════════════════════════════════════════════════════════════ */
export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [alertData, setAlertData] = useState<{ pending: number; assigned: number; critical: number; total: number; recentRequests: AlertRequest[] }>({ pending: 0, assigned: 0, critical: 0, total: 0, recentRequests: [] });
  const [showAlertPanel, setShowAlertPanel] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  /* Poll service request alerts */
  const fetchAlerts = useCallback(() => {
    fetch("/api/service-requests/alerts").then(r => r.ok ? r.json() : null).then(data => {
      if (data) { setAlertCount(data.total); setAlertData(data); }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchAlerts();
    const iv = setInterval(fetchAlerts, 30000); // poll every 30s
    return () => clearInterval(iv);
  }, [fetchAlerts]);

  /* Close alert panel on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (alertRef.current && !alertRef.current.contains(e.target as Node)) setShowAlertPanel(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FC] dark:bg-[#0a0a0a]">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-white/10" />
          <div className="w-24 h-2 rounded-full bg-gray-200 dark:bg-white/10" />
        </div>
      </div>
    );
  }

  if (!user || pathname === "/login") {
    return <>{children}</>;
  }

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href) && !pathname.startsWith(href + "/new"));

  const meta = roleMeta[user.role] || { label: user.role, color: "bg-gray-500" };

  const sidebarWidth = collapsed ? "w-[68px]" : "w-[220px]";

  const sidebarNav = (
    <div className={`flex flex-col h-full py-4 ${collapsed ? "items-center px-3" : "px-3"}`}>
      {/* Logo */}
      <Link href="/dashboard" className={`flex items-center mb-4 shrink-0 h-10 ${collapsed ? "justify-center" : "px-3"}`}>
        <span className={`font-black text-gray-900 dark:text-white tracking-widest ${collapsed ? "text-lg" : "text-xl"}`}>{collapsed ? "C" : "CABU"}</span>
      </Link>

      {/* Nav icons */}
      <nav className={`flex-1 flex flex-col gap-0.5 ${collapsed ? "items-center" : ""}`}>
        {!collapsed && <div className="px-3 mb-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Analytics</div>}
        <SidebarIconButton icon={IcnDashboard} href="/dashboard" active={isActive("/dashboard")} label="Dashboard" shortcut={collapsed ? undefined : "\u2318D"} collapsed={collapsed} onClick={() => setMobileOpen(false)} />

        {user.role === "TECHNICIAN" && (
          <>
            <SidebarIconButton icon={IcnBriefcase} href="/technician/jobs" active={isActive("/technician/jobs")} label="My Jobs" collapsed={collapsed} onClick={() => setMobileOpen(false)} />
            <SidebarIconButton icon={IcnClock} href="/technician/history" active={isActive("/technician/history")} label="Work History" collapsed={collapsed} onClick={() => setMobileOpen(false)} />
            <SidebarIconButton icon={IcnClipboard} href="/technician/fiche" active={isActive("/technician/fiche")} label="Fiches" collapsed={collapsed} onClick={() => setMobileOpen(false)} />
          </>
        )}

        {user.role !== "TECHNICIAN" && (
          <>
            <SidebarIconButton icon={IcnSnowflake} href="/refrigerators" active={isActive("/refrigerators") || isActive("/communes")} label="Fridges" shortcut={collapsed ? undefined : "\u2318F"} collapsed={collapsed} onClick={() => setMobileOpen(false)} />
            <SidebarIconButton icon={IcnUsers} href="/technicians" active={isActive("/technicians")} label="Technicians" shortcut={collapsed ? undefined : "\u2318T"} collapsed={collapsed} onClick={() => setMobileOpen(false)} />
          </>
        )}

        {!collapsed && <div className="px-3 mt-3 mb-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Data</div>}
        {collapsed && <div className="w-6 border-t border-gray-200 dark:border-white/10 my-2" />}
        {user.role !== "TECHNICIAN" && (
          <SidebarIconButton icon={IcnGlobe} href="/cities" active={isActive("/cities")} label="Locations" collapsed={collapsed} onClick={() => setMobileOpen(false)} />
        )}
        {user.role !== "TECHNICIAN" && (
          <SidebarIconButton icon={IcnFinance} href="/finance" active={isActive("/finance")} label="Finance" collapsed={collapsed} onClick={() => setMobileOpen(false)} />
        )}
        {user.role !== "TECHNICIAN" && (
          <SidebarIconButton icon={IcnList} href="/interventions" active={isActive("/interventions")} label="Maintenance Logs" collapsed={collapsed} onClick={() => setMobileOpen(false)} />
        )}
        {user.role !== "TECHNICIAN" && (
          <SidebarIconButton icon={IcnAlertTriangle} href="/service-requests" active={isActive("/service-requests")} label="Service Requests" badge={alertCount > 0} collapsed={collapsed} onClick={() => setMobileOpen(false)} />
        )}
        {user.role !== "TECHNICIAN" && (
          <SidebarIconButton icon={IcnReport} href="/reports" active={isActive("/reports")} label="Reports" collapsed={collapsed} onClick={() => setMobileOpen(false)} />
        )}
      </nav>

      {/* Separator + Settings + Collapse on same line */}
      <div className={`mt-2 border-t border-gray-200 dark:border-white/10 pt-2 flex items-center ${collapsed ? "flex-col gap-1" : "gap-1"}`}>
        <div className="flex-1">
          <SidebarIconButton icon={IcnSettings} href="/settings" active={isActive("/settings")} label="Settings" collapsed={collapsed} onClick={() => setMobileOpen(false)} />
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center w-8 h-8 shrink-0 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/4 dark:hover:text-gray-300 transition-all duration-200"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <IcnChevronsRight className="w-4 h-4" /> : <IcnChevronsLeft className="w-4 h-4" />}
        </button>
      </div>

    </div>
  );

  /* ════════════════════════════════════════════════════════════════
     BRARUDI — Mobile-first layout for alert delegates
     ════════════════════════════════════════════════════════════════ */
  if (user.role === "BRARUDI_DELEGUE") {
    const brarudiNavItems = [
      { icon: IcnDashboard, href: "/brarudi/alerts", label: "Accueil" },
      { icon: IcnClock, href: "/brarudi/history", label: "Historique" },
      { icon: IcnSettings, href: "/settings", label: "Réglages" },
    ];

    return (
      <div className="min-h-screen flex flex-col bg-[#F8F9FC] dark:bg-[#0a0a0a]">
        {/* ── Header ── */}
        <header className="bg-white dark:bg-[#141414] border-b border-gray-200 dark:border-white/6 sticky top-0 z-30">
          <div className="max-w-lg mx-auto px-4 pt-3 pb-2">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {pathname === "/brarudi/history" ? "Historique" : pathname === "/settings" ? "Réglages" : "Alertes"}
              </h1>
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleTheme}
                  className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-white/6 transition-colors"
                >
                  {theme === "dark" ? <IcnSun className="w-4 h-4 text-gray-400" /> : <IcnMoon className="w-4 h-4 text-gray-500" />}
                </button>
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu(p => !p)}
                    className="w-9 h-9 rounded-full bg-linear-to-br from-amber-400 to-orange-500 flex items-center justify-center text-[10px] font-bold text-white"
                  >
                    {user.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </button>
                  {showUserMenu && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-white/10 shadow-xl z-50 overflow-hidden py-1">
                      <div className="px-4 py-2.5 border-b border-gray-100 dark:border-white/6">
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{user.fullName}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{meta.label}</div>
                      </div>
                      <Link href="/settings" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/4 transition-colors">
                        <IcnSettings className="w-4 h-4 text-gray-400" /> Settings
                      </Link>
                      <button onClick={() => { setShowUserMenu(false); logout(); }} className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="flex-1 pb-20">{children}</main>

        {/* ── Bottom tab bar (flat) ── */}
        <nav className="fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-[#141414] border-t border-gray-200 dark:border-white/6 safe-area-bottom">
          <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
            {brarudiNavItems.map(({ icon: Icon, href, label }) => {
              const active = isActive(href);
              return (
                <Link key={href} href={href} className={`flex flex-col items-center justify-center gap-0.5 w-20 h-full transition-colors ${active ? "text-amber-600 dark:text-amber-400" : "text-gray-400 dark:text-gray-500"}`}>
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-semibold leading-none">{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════
     BRARUDI Management — Desktop sidebar, read-only cities + reports
     ════════════════════════════════════════════════════════════════ */
  if (user.role === "BRARUDI_ADMIN") {
    const mgmtNavItems = [
      { icon: IcnGlobe, href: "/brarudi-mgmt/cities", label: "Distribution" },
      { icon: IcnReport, href: "/brarudi-mgmt/reports", label: "Rapports" },
      { icon: IcnSettings, href: "/settings", label: "Réglages" },
    ];

    return (
      <div className="min-h-screen flex flex-col bg-[#F8F9FC] dark:bg-[#0a0a0a]">
        {/* ── Header ── */}
        <header className="bg-white dark:bg-[#141414] border-b border-gray-200 dark:border-white/6 sticky top-0 z-30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl font-black text-gray-900 dark:text-white tracking-widest">CABU</span>
                <span className="text-xs font-semibold text-orange-500 bg-orange-50 dark:bg-orange-500/10 px-2 py-0.5 rounded-full">BRARUDI Management</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleTheme}
                  className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-white/6 transition-colors"
                >
                  {theme === "dark" ? <IcnSun className="w-4 h-4 text-gray-400" /> : <IcnMoon className="w-4 h-4 text-gray-500" />}
                </button>
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu(p => !p)}
                    className="w-9 h-9 rounded-full bg-linear-to-br from-orange-400 to-amber-500 flex items-center justify-center text-[10px] font-bold text-white"
                  >
                    {user.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </button>
                  {showUserMenu && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-white/10 shadow-xl z-50 overflow-hidden py-1">
                      <div className="px-4 py-2.5 border-b border-gray-100 dark:border-white/6">
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{user.fullName}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{meta.label}</div>
                      </div>
                      <Link href="/settings" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/4 transition-colors">
                        <IcnSettings className="w-4 h-4 text-gray-400" /> Settings
                      </Link>
                      <button onClick={() => { setShowUserMenu(false); logout(); }} className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ── Tab bar (horizontal nav below header) ── */}
        <nav className="bg-white dark:bg-[#141414] border-b border-gray-200 dark:border-white/6">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center gap-1">
            {mgmtNavItems.map(({ icon: Icon, href, label }) => {
              const active = isActive(href);
              return (
                <Link key={href} href={href} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${active ? "border-orange-500 text-orange-600 dark:text-orange-400" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}>
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* ── Page content ── */}
        <main className="flex-1">
          <div className="max-w-5xl mx-auto">{children}</div>
        </main>

        {/* ── Footer ── */}
        <footer className="bg-white dark:bg-[#141414] border-t border-gray-200 dark:border-white/6 px-6 h-10 flex items-center justify-between">
          <span className="text-xs text-gray-400 dark:text-gray-500">Developed by <a href="https://flexostudio.tech/" target="_blank" rel="noopener noreferrer" className="font-bold text-gray-600 dark:text-gray-300 hover:underline">FLEXO STUDIO</a></span>
          <span className="text-xs text-gray-400 dark:text-gray-500">v1.0</span>
        </footer>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════
     Technician — Mobile-first layout with bottom tab bar
     ════════════════════════════════════════════════════════════════ */
  const techNavItems = [
    { icon: IcnDashboard, href: "/technician/jobs", label: "Accueil" },
    { icon: IcnClock, href: "/technician/activity", label: "Activité" },
    { icon: IcnClipboard, href: "/technician/fiche", label: "Fiche" },
    { icon: IcnList, href: "/technician/history", label: "Historique" },
    { icon: IcnSettings, href: "/settings", label: "Réglages" },
  ];

  if (user.role === "TECHNICIAN") {
    const pageTitles: Record<string, string> = {
      "/technician/jobs": "Tâches",
      "/technician/activity": "Activité",
      "/technician/fiche/suivi": "Fiche de Suivi",
      "/technician/fiche-individuel": "Fiche Individuel",
      "/technician/fiche": "Fiches",
      "/technician/history": "Historique",
      "/settings": "Réglages",
    };
    const pageTitle = Object.entries(pageTitles).find(([p]) => pathname.startsWith(p))?.[1] || "Tâches";

    return (
      <div className="min-h-screen flex flex-col bg-[#F8F9FC] dark:bg-[#0a0a0a]">
        {/* ── Header ── */}
        <header className="bg-white dark:bg-[#141414] border-b border-gray-200 dark:border-white/6 sticky top-0 z-30">
          <div className="max-w-lg mx-auto px-4 pt-3 pb-2">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{pageTitle}</h1>
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleTheme}
                  className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-white/6 transition-colors"
                >
                  {theme === "dark" ? <IcnSun className="w-4 h-4 text-gray-400" /> : <IcnMoon className="w-4 h-4 text-gray-500" />}
                </button>
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu(p => !p)}
                    className="w-9 h-9 rounded-full bg-linear-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-[10px] font-bold text-white"
                  >
                    {user.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </button>
                  {showUserMenu && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-white/10 shadow-xl z-50 overflow-hidden py-1">
                      <div className="px-4 py-2.5 border-b border-gray-100 dark:border-white/6">
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{user.fullName}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{meta.label}</div>
                      </div>
                      <Link href="/settings" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/4 transition-colors">
                        <IcnSettings className="w-4 h-4 text-gray-400" /> Settings
                      </Link>
                      <button onClick={() => { setShowUserMenu(false); logout(); }} className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="flex-1 pb-20">{children}</main>

        {/* ── Bottom tab bar (flat) ── */}
        <nav className="fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-[#141414] border-t border-gray-200 dark:border-white/6 safe-area-bottom">
          <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
            {techNavItems.map(({ icon: Icon, href, label }) => {
              const active = isActive(href);
              return (
                <Link key={href} href={href} className={`flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors ${active ? "text-teal-600 dark:text-teal-400" : "text-gray-400 dark:text-gray-500"}`}>
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-semibold leading-none">{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════
     Admin / BRARUDI — Standard sidebar layout
     ════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen flex bg-[#F8F9FC] dark:bg-[#0a0a0a]">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-[2px] z-40 lg:hidden transition-opacity" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar – desktop */}
      <aside className={`hidden lg:flex lg:flex-col lg:shrink-0 ${sidebarWidth} bg-[#F8F9FC] dark:bg-[#0a0a0a] border-r border-gray-200 dark:border-white/6 fixed top-0 left-0 h-screen z-30 transition-all duration-300`}>
        {sidebarNav}
      </aside>

      {/* Spacer for fixed sidebar */}
      <div className={`hidden lg:block lg:shrink-0 ${sidebarWidth} transition-all duration-300`} />

      {/* Sidebar – mobile (always expanded) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-55 bg-[#F8F9FC] dark:bg-[#0a0a0a] border-r border-gray-200 dark:border-white/6 transform transition-transform duration-300 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Force expanded in mobile */}
        <div className="flex flex-col h-full py-4 px-3">
          <Link href="/dashboard" className="flex items-center mb-4 shrink-0 h-10 px-3">
            <span className="text-xl font-black text-gray-900 dark:text-white tracking-widest">CABU</span>
          </Link>
          <nav className="flex-1 flex flex-col gap-0.5">
            <div className="px-3 mb-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Analytics</div>
            <SidebarIconButton icon={IcnDashboard} href="/dashboard" active={isActive("/dashboard")} label="Dashboard" shortcut={"\u2318D"} collapsed={false} onClick={() => setMobileOpen(false)} />

            {user.role === "TECHNICIAN" && (
              <>
                <SidebarIconButton icon={IcnBriefcase} href="/technician/jobs" active={isActive("/technician/jobs")} label="My Jobs" collapsed={false} onClick={() => setMobileOpen(false)} />
                <SidebarIconButton icon={IcnClock} href="/technician/history" active={isActive("/technician/history")} label="Work History" collapsed={false} onClick={() => setMobileOpen(false)} />
                <SidebarIconButton icon={IcnClipboard} href="/technician/fiche" active={isActive("/technician/fiche")} label="Fiches" collapsed={false} onClick={() => setMobileOpen(false)} />
              </>
            )}

            {user.role !== "TECHNICIAN" && (
              <>
                <SidebarIconButton icon={IcnSnowflake} href="/refrigerators" active={isActive("/refrigerators") || isActive("/communes")} label="Fridges" shortcut={"\u2318F"} collapsed={false} onClick={() => setMobileOpen(false)} />
                <SidebarIconButton icon={IcnUsers} href="/pos" active={isActive("/pos")} label="Technicians" shortcut={"\u2318T"} collapsed={false} onClick={() => setMobileOpen(false)} />
              </>
            )}

            <div className="px-3 mt-3 mb-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Data</div>
            {user.role !== "TECHNICIAN" && (
              <SidebarIconButton icon={IcnGlobe} href="/cities" active={isActive("/cities")} label="Locations" collapsed={false} onClick={() => setMobileOpen(false)} />
            )}
            {user.role !== "TECHNICIAN" && (
              <SidebarIconButton icon={IcnFinance} href="/finance" active={isActive("/finance")} label="Finance" collapsed={false} onClick={() => setMobileOpen(false)} />
            )}
            {user.role !== "TECHNICIAN" && (
              <SidebarIconButton icon={IcnList} href="/interventions" active={isActive("/interventions")} label="Maintenance Logs" collapsed={false} onClick={() => setMobileOpen(false)} />
            )}
            {user.role !== "TECHNICIAN" && (
              <SidebarIconButton icon={IcnAlertTriangle} href="/service-requests" active={isActive("/service-requests")} label="Service Requests" badge={alertCount > 0} collapsed={false} onClick={() => setMobileOpen(false)} />
            )}
            {user.role !== "TECHNICIAN" && (
              <SidebarIconButton icon={IcnReport} href="/reports" active={isActive("/reports")} label="Reports" collapsed={false} onClick={() => setMobileOpen(false)} />
            )}
          </nav>
          {/* Separator + Settings */}
          <div className="mt-2 border-t border-gray-200 dark:border-white/10 pt-2">
            <SidebarIconButton icon={IcnSettings} href="/settings" active={isActive("/settings")} label="Settings" collapsed={false} onClick={() => setMobileOpen(false)} />
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="bg-white dark:bg-[#141414] border-b border-gray-200 dark:border-white/6 px-6 h-12 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-1.5 -ml-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/4 mr-2 transition-colors"
            >
              <IcnMenu className="w-4 h-4 text-gray-400 dark:text-gray-400" />
            </button>
            {/* Search */}
            <div className="relative flex items-center">
              <IcnSearch className="absolute left-0 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search..."
                className="w-40 md:w-56 h-9 pl-6 pr-3 text-sm bg-transparent border-none text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-white/4 transition-colors"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? (
                <IcnSun className="w-4 h-4 text-gray-400" />
              ) : (
                <IcnMoon className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {/* Alert bell */}
            <div className="relative" ref={alertRef}>
              <button
                onClick={() => setShowAlertPanel(p => !p)}
                className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-white/4 transition-colors"
                title="Service Requests"
              >
                <IcnBell className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                {alertCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 flex items-center justify-center px-1 text-xs font-bold text-white bg-red-500 rounded-full ring-2 ring-white dark:ring-[#141414]">
                    {alertCount > 99 ? "99+" : alertCount}
                  </span>
                )}
              </button>

              {/* Alert dropdown */}
              {showAlertPanel && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-white/10 shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-white/6 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">Service Alerts</h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {alertData.pending} pending · {alertData.assigned} assigned
                        {alertData.critical > 0 && <span className="text-red-500 font-medium"> · {alertData.critical} critical</span>}
                      </p>
                    </div>
                    <Link href="/service-requests" onClick={() => setShowAlertPanel(false)} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
                      View All
                    </Link>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-white/6">
                    {alertData.recentRequests.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <IcnBell className="w-6 h-6 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                        <p className="text-xs text-gray-400">No pending requests</p>
                      </div>
                    ) : (
                      alertData.recentRequests.map(req => {
                        const urgColor: Record<string, string> = { CRITICAL: "border-l-red-500", HIGH: "border-l-orange-500", MEDIUM: "border-l-yellow-500", LOW: "border-l-gray-300" };
                        return (
                          <Link
                            key={req.id}
                            href="/service-requests"
                            onClick={() => setShowAlertPanel(false)}
                            className={`block px-4 py-3 border-l-2 ${urgColor[req.urgency] || "border-l-gray-300"} hover:bg-gray-50 dark:hover:bg-white/3 transition-colors`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold uppercase ${req.type === "REPAIR" ? "text-orange-600 dark:text-orange-400" : "text-blue-600 dark:text-blue-400"}`}>{req.type}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                req.status === "PENDING" ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                              }`}>{req.status === "PENDING" ? "Pending" : "Assigned"}</span>
                              <span className="text-xs text-gray-400 ml-auto">{(() => { const d = Date.now() - new Date(req.createdAt).getTime(); const m = Math.floor(d/60000); return m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m/60)}h` : `${Math.floor(m/1440)}d`; })()}</span>
                            </div>
                            <p className="text-xs text-gray-700 dark:text-gray-300 mt-1 line-clamp-1">{req.description}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                              <span className="font-mono">{req.refrigerator.serialNumber}</span>
                              <span>·</span>
                              <span>{req.pos.posName} — {req.pos.city.name}</span>
                            </div>
                          </Link>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User avatar + dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(p => !p)}
                className="w-8 h-8 rounded-full bg-linear-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-xs font-bold text-white hover:shadow-md transition-all shrink-0"
              >
                {user?.fullName?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "U"}
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-white/10 shadow-xl z-50 overflow-hidden py-1">
                  <div className="px-4 py-2.5 border-b border-gray-100 dark:border-white/6">
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{user?.fullName}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{meta.label}</div>
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/4 transition-colors"
                  >
                    <IcnSettings className="w-4 h-4 text-gray-400" />
                    Settings
                  </Link>
                  <button
                    onClick={() => { setShowUserMenu(false); logout(); }}
                    className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                    </svg>
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 flex flex-col">{children}</main>

        {/* Footer */}
        <footer className="bg-white dark:bg-[#141414] border-t border-gray-200 dark:border-white/6 px-6 h-10 flex items-center justify-between">
          <span className="text-xs text-gray-400 dark:text-gray-500">Developed by <a href="https://flexostudio.tech/" target="_blank" rel="noopener noreferrer" className="font-bold text-gray-600 dark:text-gray-300 hover:underline">FLEXO STUDIO</a></span>
          <span className="text-xs text-gray-400 dark:text-gray-500">v1.0</span>
        </footer>
      </div>
    </div>
  );
}
