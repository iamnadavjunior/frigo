"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface Technician {
  id: string;
  fullName: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
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

function AnimatedStat({ label, value, color }: { label: string; value: number; color: string }) {
  const animated = useCountUp(value);
  return (
    <div className="bg-white dark:bg-[#141414] px-4 py-2.5 group hover:bg-gray-50/50 dark:hover:bg-white/2 transition-colors">
      <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</div>
      <div className={`text-lg font-bold ${color} mt-0.5 transition-all`}>{animated}</div>
    </div>
  );
}

export default function TechniciansPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchTechnicians = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      const techs = (data as Technician[]).filter(
        (u) => u.role === "TECHNICIAN"
      );
      setTechnicians(techs);
    } catch (error) {
      console.error("Failed to fetch technicians:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTechnicians();
  }, [fetchTechnicians]);

  const filtered = technicians.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.fullName.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Technicians
          </h1>
          <span className="text-sm text-gray-500">
            {filtered.length} technician{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Stats strip */}
        {technicians.length > 0 && (
          <div className="grid grid-cols-3 gap-px bg-gray-200 dark:bg-white/6 rounded-xl overflow-hidden">
            <AnimatedStat label="Total" value={technicians.length} color="text-gray-900 dark:text-white" />
            <AnimatedStat label="Active" value={technicians.filter(t => t.active).length} color="text-emerald-500" />
            <AnimatedStat label="Inactive" value={technicians.filter(t => !t.active).length} color="text-gray-400" />
          </div>
        )}

        {/* Search */}
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-white/6 border border-gray-200 dark:border-white/6 rounded-lg text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-500 w-64 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
          />
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 overflow-hidden">
          {loading ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              No technicians found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/5">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-white/4">
                  {filtered.map((tech) => (
                    <tr
                      key={tech.id}
                      className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-linear-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                            {tech.fullName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <span className="text-gray-800 dark:text-gray-200 font-medium">
                            {tech.fullName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-gray-400">
                        {tech.email}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                            tech.active
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                              : "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              tech.active ? "bg-emerald-500" : "bg-gray-400"
                            }`}
                          />
                          {tech.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">
                        {new Date(tech.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
