"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import Link from "next/link";

/* ─── Types ─── */
interface City { id: string; name: string; posCount: number; fridgeCount: number }
interface DashboardData {
  totalFridges: number; servicedFridges: number; repairedFridges: number;
  totalInterventions: number; totalRepairCost: number;
  activeFridges: number; underRepairFridges: number; inactiveFridges: number;
  interventionsThisMonth: number; totalPos: number; totalCities: number;
  maintenanceCount: number; repairCount: number;
  completedMaintenanceCount: number; completedRepairCount: number;
}
interface AlertRequest {
  id: string; type: string; urgency: string; status: string; description: string; createdAt: string;
  refrigerator: { serialNumber: string };
  pos: { posName: string; neighbourhood: string | null; city: { name: string } };
  assignedTo: { fullName: string } | null;
}

/* ─── Helpers ─── */
const fmtN = (n: number) => n.toLocaleString();
const fmtBIF = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : String(n);

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
      const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = Math.round(start + diff * ease);
      setValue(current);
      if (progress < 1) requestAnimationFrame(tick);
      else ref.current = target;
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return value;
}

/* ─── Animated KPI Card ─── */
function KpiCard({ label, value, color, sub, format = "number", onClick }: {
  label: string; value: number; color: string; sub?: string; format?: "number" | "currency" | "percent"; onClick?: () => void;
}) {
  const animated = useCountUp(value);
  const display = format === "currency" ? fmtBIF(animated) : format === "percent" ? `${animated}%` : fmtN(animated);
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-[#141414] px-4 py-3.5 group transition-all duration-200 hover:bg-gray-50 dark:hover:bg-white/3 ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{label}</div>
      <div className="flex items-baseline gap-1 mt-1">
        <span className={`text-xl font-bold ${color} transition-transform duration-200 group-hover:scale-105 origin-left`}>{display}</span>
        {sub && <span className="text-xs text-gray-400">{sub}</span>}
      </div>
    </div>
  );
}

/* ─── SVG Donut Chart ─── */
function DonutChart({ segments, size = 160, strokeWidth = 20, label }: {
  segments: { value: number; color: string; label: string }[];
  size?: number; strokeWidth?: number; label?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return <div className="flex items-center justify-center" style={{ width: size, height: size }}><span className="text-xs text-gray-400">No data</span></div>;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {segments.map((seg, i) => {
          const pct = seg.value / total;
          const dash = pct * circumference;
          const currentOffset = offset;
          offset += dash;
          return (
            <circle
              key={i}
              cx={size / 2} cy={size / 2} r={radius}
              fill="none" stroke={seg.color}
              strokeWidth={hovered === i ? strokeWidth + 4 : strokeWidth}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-currentOffset}
              className="transition-all duration-500 ease-out cursor-pointer"
              style={{ opacity: hovered !== null && hovered !== i ? 0.3 : 1 }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {hovered !== null ? (
          <>
            <span className="text-lg font-bold text-gray-900 dark:text-white">{segments[hovered].value}</span>
            <span className="text-[10px] text-gray-400">{segments[hovered].label}</span>
          </>
        ) : (
          <>
            <span className="text-lg font-bold text-gray-900 dark:text-white">{total}</span>
            <span className="text-[10px] text-gray-400">{label || "Total"}</span>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── SVG Bar Chart ─── */
function BarChart({ bars, height = 140 }: {
  bars: { label: string; value: number; color: string; sub?: string }[];
  height?: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...bars.map(b => b.value), 1);
  return (
    <div className="flex items-end gap-3 justify-center" style={{ height }}>
      {bars.map((bar, i) => {
        const pct = (bar.value / max) * 100;
        return (
          <div
            key={i}
            className="flex flex-col items-center gap-1 flex-1 max-w-16 relative group"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            {/* Tooltip */}
            {hovered === i && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap z-10 shadow-lg">
                {fmtN(bar.value)}{bar.sub ? ` ${bar.sub}` : ""}
              </div>
            )}
            <div
              className="w-full rounded-t-md transition-all duration-700 ease-out cursor-pointer hover:opacity-80"
              style={{
                height: `${Math.max(pct, 3)}%`,
                backgroundColor: bar.color,
                transform: hovered === i ? "scaleY(1.05)" : "scaleY(1)",
                transformOrigin: "bottom",
              }}
            />
            <span className="text-[10px] text-gray-400 truncate w-full text-center">{bar.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Mini Sparkline ─── */
function Sparkline({ data, color = "#3b82f6", height = 32, width = 100 }: {
  data: number[]; color?: string; height?: number; width?: number;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`).join(" ");
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" points={points} />
      <circle cx={(data.length - 1) / (data.length - 1) * width} cy={height - ((data[data.length - 1] - min) / range) * (height - 4) - 2} r={2.5} fill={color} />
    </svg>
  );
}

/* ─── Progress Ring ─── */
function ProgressRing({ value, size = 48, strokeWidth = 4, color = "#3b82f6" }: {
  value: number; size?: number; strokeWidth?: number; color?: string;
}) {
  const animated = useCountUp(Math.min(value, 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (animated / 100) * circumference;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" className="text-gray-100 dark:text-white/6" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round" className="transition-all duration-1000 ease-out" />
      </svg>
      <span className="absolute text-xs font-bold text-gray-700 dark:text-gray-300">{animated}%</span>
    </div>
  );
}

/* ════════════════════════════ Main ════════════════════════════ */
export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [cities, setCities] = useState<City[]>([]);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<{ pending: number; assigned: number; critical: number; total: number; recentRequests: AlertRequest[] }>({ pending: 0, assigned: 0, critical: 0, total: 0, recentRequests: [] });
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  /* Redirect technicians to their mobile dashboard */
  useEffect(() => {
    if (user?.role === "TECHNICIAN") router.replace("/technician/jobs");
    if (user?.role === "BRARUDI") router.replace("/brarudi/alerts");
    if (user?.role === "BRARUDI_MGMT") router.replace("/brarudi-mgmt/cities");
  }, [user, router]);

  const fetchData = useCallback(() => {
    Promise.all([
      fetch("/api/dashboard").then((r) => r.json()),
      fetch("/api/cities").then((r) => r.json()),
      fetch("/api/service-requests/alerts").then((r) => r.ok ? r.json() : null).catch(() => null),
    ])
      .then(([dashData, cityData, alertData]) => {
        setData(dashData);
        setCities(cityData);
        if (alertData) setAlerts(alertData);
        setLastRefresh(new Date());
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* Auto-refresh every 30s */
  useEffect(() => {
    const iv = setInterval(fetchData, 30_000);
    return () => clearInterval(iv);
  }, [fetchData]);

  /* ── Derived stats ── */
  const d = data;
  const healthRate = d && d.totalFridges > 0 ? Math.round((d.activeFridges / d.totalFridges) * 100) : 0;
  const completionRate = d && d.totalInterventions > 0 ? Math.round(((d.completedMaintenanceCount + d.completedRepairCount) / d.totalInterventions) * 100) : 0;

  const cityCards = useMemo(() => cities.map((c) => ({
    id: c.id, name: c.name, fridges: c.fridgeCount, pos: c.posCount,
  })), [cities]);
  const totalFleetFridges = cityCards.reduce((s, c) => s + c.fridges, 0);

  /* Synthetic sparkline data from available metrics */
  const sparkData = useMemo(() => {
    if (!d) return [];
    const base = d.interventionsThisMonth;
    return Array.from({ length: 7 }, (_, i) => Math.max(0, Math.round(base * (0.4 + Math.sin(i * 0.8) * 0.3 + Math.random() * 0.3))));
  }, [d]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-white/10" />
          <div className="w-28 h-2 rounded bg-gray-200 dark:bg-white/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ════ Header bar with filters ════ */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Last updated {lastRefresh.toLocaleTimeString()} · Auto-refreshes every 30s
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="text-xs bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="all">All Cities</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button
              onClick={fetchData}
              className="text-xs bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" /></svg>
              Refresh
            </button>
          </div>
        </div>

        {/* ════ KPI Strip ════ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-px bg-gray-200 dark:bg-white/6 rounded-xl overflow-hidden">
          <KpiCard label="Total Fridges" value={d?.totalFridges ?? 0} color="text-gray-900 dark:text-white" onClick={() => router.push("/refrigerators")} />
          <KpiCard label="Active" value={d?.activeFridges ?? 0} color="text-emerald-500" sub={`${healthRate}%`} onClick={() => router.push("/refrigerators")} />
          <KpiCard label="Under Repair" value={d?.underRepairFridges ?? 0} color="text-orange-500" onClick={() => router.push("/service-requests")} />
          <KpiCard label="Interventions" value={d?.totalInterventions ?? 0} color="text-gray-900 dark:text-white" onClick={() => router.push("/interventions")} />
          <KpiCard label="This Month" value={d?.interventionsThisMonth ?? 0} color="text-blue-500" />
          <KpiCard label="Total Cost" value={d?.totalRepairCost ?? 0} color="text-red-500" sub="BIF" format="currency" onClick={() => router.push("/finance")} />
          <KpiCard label="Completion" value={completionRate} color={completionRate >= 80 ? "text-emerald-500" : completionRate >= 50 ? "text-orange-500" : "text-red-500"} format="percent" />
        </div>

        {/* ════ Charts Row ════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Fridge Status Donut */}
          <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Fridge Status</h3>
              <ProgressRing value={healthRate} color="#10b981" />
            </div>
            <div className="flex justify-center">
              <DonutChart
                label="Fridges"
                segments={[
                  { value: d?.activeFridges ?? 0, color: "#10b981", label: "Active" },
                  { value: d?.underRepairFridges ?? 0, color: "#f97316", label: "Under Repair" },
                  { value: d?.inactiveFridges ?? 0, color: "#6b7280", label: "Inactive" },
                ]}
              />
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {[
                { label: "Active", color: "bg-emerald-500", value: d?.activeFridges ?? 0 },
                { label: "Repair", color: "bg-orange-500", value: d?.underRepairFridges ?? 0 },
                { label: "Inactive", color: "bg-gray-500", value: d?.inactiveFridges ?? 0 },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <div className={`w-2 h-2 rounded-full ${item.color}`} />
                  {item.label} ({item.value})
                </div>
              ))}
            </div>
          </div>

          {/* Interventions Bar Chart */}
          <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Interventions Breakdown</h3>
            <BarChart
              bars={[
                { label: "Maint.", value: d?.maintenanceCount ?? 0, color: "#3b82f6", sub: "total" },
                { label: "Repair", value: d?.repairCount ?? 0, color: "#f97316", sub: "total" },
                { label: "Done M", value: d?.completedMaintenanceCount ?? 0, color: "#10b981", sub: "done" },
                { label: "Done R", value: d?.completedRepairCount ?? 0, color: "#14b8a6", sub: "done" },
              ]}
            />
            <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-gray-100 dark:border-white/5">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-500">{fmtN(d?.maintenanceCount ?? 0)}</div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Maintenance</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-500">{fmtN(d?.repairCount ?? 0)}</div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Repairs</div>
              </div>
            </div>
          </div>

          {/* Activity Overview */}
          <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Activity Overview</h3>
            <div className="space-y-4">
              {/* Sparkline */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-400">This month trend</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">{fmtN(d?.interventionsThisMonth ?? 0)}</div>
                </div>
                <Sparkline data={sparkData} />
              </div>

              {/* Quick stats */}
              <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-white/5">
                {[
                  { label: "Total POS", value: d?.totalPos ?? 0, icon: "🏪" },
                  { label: "Cities", value: d?.totalCities ?? 0, icon: "🌍" },
                  { label: "Serviced Fridges", value: d?.servicedFridges ?? 0, icon: "✅" },
                  { label: "Repaired Fridges", value: d?.repairedFridges ?? 0, icon: "🔧" },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between group hover:bg-gray-50 dark:hover:bg-white/2 -mx-2 px-2 py-1 rounded-lg transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{stat.icon}</span>
                      <span className="text-xs text-gray-500">{stat.label}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{fmtN(stat.value)}</span>
                  </div>
                ))}
              </div>

              {/* Cost highlight */}
              <div className="bg-red-50 dark:bg-red-500/5 rounded-lg px-3 py-2.5 flex items-center justify-between">
                <span className="text-xs font-medium text-red-600 dark:text-red-400">Total Repair Cost</span>
                <span className="text-sm font-bold text-red-600 dark:text-red-400">{fmtN(d?.totalRepairCost ?? 0)} BIF</span>
              </div>
            </div>
          </div>
        </div>

        {/* ════ Service Request Alerts ════ */}
        {alerts.total > 0 && (
          <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Service Requests</span>
                <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-500/10 text-red-500">{alerts.pending} pending</span>
                {alerts.critical > 0 && <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400">{alerts.critical} critical</span>}
              </div>
              <Link href="/service-requests" className="text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">Manage →</Link>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-white/4 max-h-64 overflow-y-auto">
              {alerts.recentRequests.slice(0, 6).map((req) => {
                const urgCfg: Record<string, string> = { CRITICAL: "text-red-500 bg-red-50 dark:bg-red-500/10", HIGH: "text-orange-500 bg-orange-50 dark:bg-orange-500/10", MEDIUM: "text-yellow-600 bg-yellow-50 dark:bg-yellow-500/10", LOW: "text-gray-400 bg-gray-50 dark:bg-white/4" };
                return (
                  <Link key={req.id} href="/service-requests" className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/50 dark:hover:bg-white/2 transition-colors">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${req.type === "REPAIR" ? "bg-red-400" : "bg-emerald-400"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${urgCfg[req.urgency] || urgCfg.LOW}`}>{req.urgency}</span>
                        <span className="text-xs font-mono text-gray-500 truncate">{req.refrigerator.serialNumber}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{req.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-gray-400">{req.pos.posName}</div>
                      <div className="text-xs text-gray-300 dark:text-gray-600">{req.pos.city.name}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ════ City Distribution ════ */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">City Distribution</span>
            <Link href="/communes" className="text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">View all →</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(selectedCity === "all" ? cityCards : cityCards.filter(c => c.id === selectedCity)).map((city) => {
              const pct = totalFleetFridges > 0 ? Math.round((city.fridges / totalFleetFridges) * 100) : 0;
              return (
                <Link key={city.id || city.name} href={city.id ? `/communes/${city.id}` : "/communes"} className="group bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 hover:border-blue-300 dark:hover:border-blue-500/30 hover:shadow-md hover:shadow-blue-500/5 transition-all duration-200 overflow-hidden">
                  <div className="h-1 bg-gray-100 dark:bg-white/4">
                    <div className="h-full bg-blue-500 rounded-r transition-all duration-700 ease-out" style={{ width: `${Math.max(pct, 2)}%` }} />
                  </div>
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{city.name}</span>
                      <span className="text-xs text-gray-400 group-hover:text-blue-400 transition-colors">{pct}%</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">{city.fridges}</div>
                        <div className="text-xs text-gray-400">fridges</div>
                      </div>
                      <div className="h-8 w-px bg-gray-100 dark:bg-white/6" />
                      <div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">{city.pos}</div>
                        <div className="text-xs text-gray-400">POS</div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
