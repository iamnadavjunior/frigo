"use client";

import { useAuth } from "@/components/auth-provider";

export default function SettingsPage() {
  const { user, logout } = useAuth();

  return (
    <div className="px-4 pt-4 space-y-4">
        {/* Profile card */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-base font-bold text-white">
              {user?.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{user?.fullName}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
              <span className="inline-block mt-1 text-[10px] font-semibold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">Technicien</span>
            </div>
          </div>
        </div>

        {/* App info */}
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-700">Application</span>
            <span className="text-sm text-gray-400">CABU Technician v1.0</span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-700">Système</span>
            <span className="text-sm text-gray-400">CABU Fridge Management</span>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full bg-red-50 border border-red-100 text-red-600 font-semibold py-3 rounded-xl text-sm hover:bg-red-100 transition-colors"
        >
          Se déconnecter
        </button>

        <p className="text-center text-[10px] text-gray-300 pb-2">Développé par FLEXO STUDIO</p>
      </div>
  );
}
