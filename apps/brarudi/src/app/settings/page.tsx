"use client";

import Image from "next/image";
import { useAuth } from "@/components/auth-provider";

export default function SettingsPage() {
  const { user, logout } = useAuth();

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {/* Profile card */}
        <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-white/6 p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-amber-300 dark:border-amber-500/40 shrink-0">
              <Image src="/icons/icon-192.png" alt="avatar" width={56} height={56} className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-base font-bold text-gray-900 dark:text-white">{user?.fullName}</p>
              <p className="text-xs text-gray-400 mt-0.5">{user?.email}</p>
              <span className="inline-block mt-1.5 text-[10px] font-semibold bg-amber-50 dark:bg-amber-500/12 text-amber-700 dark:text-amber-400 px-2.5 py-0.5 rounded-full">Délégué BRARUDI</span>
            </div>
          </div>
        </div>

        {/* App info */}
        <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-white/6 divide-y divide-gray-100 dark:divide-white/6">
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">Application</span>
            <span className="text-sm text-gray-400">BRARUDI Délégué v1.0</span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">Système</span>
            <span className="text-sm text-gray-400">CABU Fridge Management</span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">Rôle</span>
            <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">BRARUDI</span>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 font-semibold py-3 rounded-xl text-sm hover:bg-red-100 dark:hover:bg-red-500/15 transition-colors"
        >
          Se déconnecter
        </button>

        <p className="text-center text-[10px] text-gray-300 dark:text-gray-600 pb-2">Développé par FLEXO STUDIO</p>
      </div>
    </div>
  );
}
