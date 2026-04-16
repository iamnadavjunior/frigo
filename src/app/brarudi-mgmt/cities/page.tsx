"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";

interface City {
  id: string;
  name: string;
  posCount: number;
  fridgeCount: number;
}

function IcnMapPin({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  );
}

export default function BrarudiMgmtCitiesPage() {
  useAuth();
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cities")
      .then((r) => r.json())
      .then((data) => setCities(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalPos = cities.reduce((s, c) => s + c.posCount, 0);
  const totalFridges = cities.reduce((s, c) => s + c.fridgeCount, 0);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-white/10" />
          <div className="w-28 h-2 rounded bg-gray-200 dark:bg-white/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6 space-y-5">

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-3 gap-px bg-gray-200 dark:bg-white/6 rounded-xl overflow-hidden">
        <div className="bg-white dark:bg-[#141414] px-4 py-3">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Communes</div>
          <div className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{cities.length}</div>
        </div>
        <div className="bg-white dark:bg-[#141414] px-4 py-3">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Points de Vente</div>
          <div className="text-xl font-bold text-blue-500 mt-0.5">{totalPos.toLocaleString()}</div>
        </div>
        <div className="bg-white dark:bg-[#141414] px-4 py-3">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Frigos Total</div>
          <div className="text-xl font-bold text-emerald-500 mt-0.5">{totalFridges.toLocaleString()}</div>
        </div>
      </div>

      {/* ── City distribution cards ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">City Distribution</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {cities.map((city) => {
            const pct = totalFridges > 0 ? Math.round((city.fridgeCount / totalFridges) * 100) : 0;
            return (
              <div key={city.id} className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 transition-all overflow-hidden">
                <div className="h-1 bg-gray-100 dark:bg-white/4">
                  <div className="h-full bg-blue-500 rounded-r transition-all" style={{ width: `${Math.max(pct, 2)}%` }} />
                </div>
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{city.name}</span>
                    <span className="text-xs text-gray-400">{pct}%</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">{city.fridgeCount}</div>
                      <div className="text-xs text-gray-400">fridges</div>
                    </div>
                    <div className="h-8 w-px bg-gray-100 dark:bg-white/6" />
                    <div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">{city.posCount}</div>
                      <div className="text-xs text-gray-400">POS</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {cities.length === 0 && (
        <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 px-4 py-12 text-center">
          <IcnMapPin className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Aucune commune enregistrée</p>
        </div>
      )}
    </div>
  );
}
