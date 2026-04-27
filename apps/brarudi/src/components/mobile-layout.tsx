"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { useState, useEffect } from "react";

const navItems = [
  {
    href: "/alerts",
    label: "Alertes",
    icon: (active: boolean) => (
      <svg className="w-5.5 h-5.5" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke={active ? "none" : "currentColor"} strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
      </svg>
    ),
  },
  {
    href: "/history",
    label: "Historique",
    icon: (active: boolean) => (
      <svg className="w-5.5 h-5.5" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke={active ? "none" : "currentColor"} strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Réglages",
    icon: (active: boolean) => (
      <svg className="w-5.5 h-5.5" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke={active ? "none" : "currentColor"} strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
  },
];

export function MobileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("brarudiDarkMode");
    const dark = stored !== "false";
    setIsDark(dark);
    if (dark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, []);

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("brarudiDarkMode", String(next));
    if (next) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-[#0a0a0a]">
      {/* Header */}
      <header className="bg-white dark:bg-[#0d0d0d] border-b border-gray-200 dark:border-white/8 sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 pt-3 pb-2 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">BRARUDI</h1>
          <div className="flex items-center gap-2">
            {/* Dark / Light toggle */}
            <button
              onClick={toggleDark}
              aria-label={isDark ? "Mode clair" : "Mode sombre"}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              {isDark ? (
                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                </svg>
              ) : (
                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                </svg>
              )}
            </button>

            {/* Profile menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu((p) => !p)}
                className="w-9 h-9 rounded-full overflow-hidden border border-gray-200 dark:border-white/10"
              >
                <Image src="/icons/icon-192.png" alt="BRARUDI" width={36} height={36} className="w-full h-full object-cover" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-100 dark:border-white/10 shadow-2xl z-50 overflow-hidden py-1">
                    <div className="px-4 py-2.5 border-b border-gray-100 dark:border-white/6">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.fullName}</div>
                      <div className="text-xs text-amber-500 dark:text-amber-400 font-medium">Délégué BRARUDI</div>
                    </div>
                    <button
                      onClick={() => { setShowMenu(false); logout(); }}
                      className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                      </svg>
                      Se déconnecter
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 pb-28 max-w-lg mx-auto w-full">{children}</main>

      {/* Floating pill bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-40 flex justify-center pb-5 px-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-xs bg-white dark:bg-[#1c1c1e] rounded-4xl shadow-[0_8px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.5)] border border-gray-100 dark:border-white/8 flex items-center px-4 h-15.5">
          {navItems.map(({ href, label, icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className="relative flex items-center justify-center flex-1 h-12 rounded-full transition-all duration-200"
              >
                {active && (
                  <span className="absolute inset-0 rounded-full bg-amber-50 dark:bg-amber-500/12" />
                )}
                <span className={`relative transition-colors duration-200 ${active ? "text-amber-600 dark:text-amber-400" : "text-gray-400 dark:text-gray-500"}`}>
                  {icon(active)}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
