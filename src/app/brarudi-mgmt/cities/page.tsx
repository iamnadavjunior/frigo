"use client";

import { useEffect, useState, useRef } from "react";
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

/* ─── Animated Counter Hook ─── */
function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    if (target === ref.current) return;
    const start = ref.current;
    const diff = target - start;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * ease);
      setValue(current);
      if (progress < 1) requestAnimationFrame(tick);
      else ref.current = target;
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return value;
}

function AnimatedKpi({ label, value, color }: { label: string; value: number; color: string }) {
  const animated = useCountUp(value);
  return (
    <div className="bg-white dark:bg-[#141414] px-4 py-3 group hover:bg-gray-50/50 dark:hover:bg-white/2 transition-colors">
      <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</div>
      <div className={`text-xl font-bold ${color} mt-0.5 transition-all`}>{animated.toLocaleString()}</div>
    </div>
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

      {/* ── KPI Strip — Animated ── */}
      <div className="grid grid-cols-3 gap-px bg-gray-200 dark:bg-white/6 rounded-xl overflow-hidden">
        <AnimatedKpi label="Communes" value={cities.length} color="text-gray-900 dark:text-white" />
        <AnimatedKpi label="Points de Vente" value={totalPos} color="text-blue-500" />
        <AnimatedKpi label="Frigos Total" value={totalFridges} color="text-emerald-500" />
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
              <div key={city.id} className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 transition-all overflow-hidden hover:shadow-md hover:border-blue-200 dark:hover:border-blue-500/20 hover:-translate-y-0.5 cursor-default">
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
