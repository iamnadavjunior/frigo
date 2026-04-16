"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";

interface FinanceSummary {
  totalCost: number;
  maintenanceCost: number;
  repairCost: number;
  totalItems: number;
  maintenanceItems: number;
  repairItems: number;
  interventionsWithCost: number;
  avgCostPerIntervention: number;
}

interface CityBreakdown {
  cityName: string;
  totalCost: number;
  count: number;
}

interface MonthlyTrend {
  month: string;
  maintenance: number;
  repair: number;
  total: number;
}

interface RecentItem {
  id: string;
  itemName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  createdAt: string;
  intervention: {
    id: string;
    type: "MAINTENANCE" | "REPAIR";
    status: string;
    interventionDate: string;
    refrigerator: {
      serialNumber: string;
      pos: {
        posName: string;
        city: { name: string };
      };
    };
  };
}

interface FinanceData {
  summary: FinanceSummary;
  costByCity: CityBreakdown[];
  monthlyTrend: MonthlyTrend[];
  recentItems: RecentItem[];
}

/* ── Animated Counter Hook ── */
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

/* ── Animated KPI Card ── */
function FinanceKpi({ label, value, color, sub, detail, icon }: {
  label: string; value: number; color: string; sub?: string; detail?: string; icon: React.ReactNode;
}) {
  const animated = useCountUp(value);
  const display = fmt(animated);
  return (
    <div className="bg-white dark:bg-[#141414] px-4 py-4 group hover:bg-gray-50 dark:hover:bg-white/3 transition-all duration-200">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{label}</div>
        <div className="text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500 transition-colors">{icon}</div>
      </div>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className={`text-xl font-bold ${color} transition-transform duration-200 group-hover:scale-105 origin-left`}>{display}</span>
        {sub && <span className="text-xs text-gray-400">{sub}</span>}
      </div>
      {detail && <div className="text-xs text-gray-400 mt-0.5">{detail}</div>}
    </div>
  );
}

/* ── Donut Chart ── */
function DonutChart({ segments, size = 140, strokeWidth = 18 }: {
  segments: { value: number; color: string; label: string }[];
  size?: number; strokeWidth?: number;
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
            <circle key={i} cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={seg.color}
              strokeWidth={hovered === i ? strokeWidth + 4 : strokeWidth}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-currentOffset}
              className="transition-all duration-500 ease-out cursor-pointer"
              style={{ opacity: hovered !== null && hovered !== i ? 0.3 : 1 }}
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {hovered !== null ? (
          <>
            <span className="text-lg font-bold text-gray-900 dark:text-white">{fmt(segments[hovered].value)}</span>
            <span className="text-[10px] text-gray-400">{segments[hovered].label}</span>
          </>
        ) : (
          <>
            <span className="text-lg font-bold text-gray-900 dark:text-white">{fmt(total)}</span>
            <span className="text-[10px] text-gray-400">Total BIF</span>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Stacked Bar Chart for Monthly Trend ── */
function MonthlyBarChart({ data, height = 180 }: { data: MonthlyTrend[]; height?: number }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...data.map(d => d.total), 1);
  return (
    <div className="flex items-end gap-2 justify-between" style={{ height }}>
      {data.map((row, i) => {
        const maintPct = (row.maintenance / max) * 100;
        const repairPct = (row.repair / max) * 100;
        const [, mo] = row.month.split("-");
        const monthLabel = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Number(mo) - 1];
        return (
          <div key={i} className="flex flex-col items-center flex-1 max-w-14 relative"
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            {hovered === i && (
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap z-10 shadow-lg">
                <div>M: {fmt(row.maintenance)}</div>
                <div>R: {fmt(row.repair)}</div>
              </div>
            )}
            <div className="w-full flex flex-col gap-px" style={{ height: `${Math.max((row.total / max) * 100, 3)}%` }}>
              {row.repair > 0 && (
                <div className="w-full rounded-t-sm bg-orange-500 transition-all duration-500" style={{ flex: repairPct, opacity: hovered !== null && hovered !== i ? 0.4 : 1 }} />
              )}
              {row.maintenance > 0 && (
                <div className={`w-full ${row.repair === 0 ? "rounded-t-sm" : ""} rounded-b-sm bg-emerald-500 transition-all duration-500`} style={{ flex: maintPct, opacity: hovered !== null && hovered !== i ? 0.4 : 1 }} />
              )}
            </div>
            <span className={`text-[10px] mt-1 transition-colors ${hovered === i ? "text-gray-900 dark:text-white font-medium" : "text-gray-400"}`}>{monthLabel}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Icons ── */
function IcnMoney({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
    </svg>
  );
}

function IcnWrench({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.049.58.025 1.194-.14 1.743" />
    </svg>
  );
}

function IcnBolt({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
    </svg>
  );
}

function IcnChart({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  );
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "decimal", maximumFractionDigits: 0 }).format(n);

const fmtMonth = (m: string) => {
  const [y, mo] = m.split("-");
  const d = new Date(Number(y), Number(mo) - 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

type Period = "month" | "quarter" | "year" | "all";

export default function FinancePage() {
  useAuth();
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("all");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [sortCol, setSortCol] = useState<"totalCost" | "itemName" | "date">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(`/api/finance?period=${period}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLastRefresh(new Date()); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* Auto-refresh every 30s */
  useEffect(() => {
    const iv = setInterval(fetchData, 30_000);
    return () => clearInterval(iv);
  }, [fetchData]);

  const toggleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  };

  const sortedItems = data?.recentItems ? [...data.recentItems].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortCol === "totalCost") return (a.totalCost - b.totalCost) * dir;
    if (sortCol === "itemName") return a.itemName.localeCompare(b.itemName) * dir;
    return (new Date(a.intervention.interventionDate).getTime() - new Date(b.intervention.interventionDate).getTime()) * dir;
  }) : [];

  if (loading && !data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-white/10" />
          <div className="w-28 h-2 rounded bg-gray-200 dark:bg-white/10" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary, costByCity, monthlyTrend } = data;
  const maxCityTotal = Math.max(...costByCity.map((c) => c.totalCost), 1);
  const maintPct = summary.totalCost > 0 ? Math.round((summary.maintenanceCost / summary.totalCost) * 100) : 0;

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Finance</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Updated {lastRefresh.toLocaleTimeString()} · Auto-refreshes every 30s
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-gray-100 dark:bg-white/6 p-0.5 rounded-lg">
              {(["month", "quarter", "year", "all"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
                    period === p
                      ? "bg-white dark:bg-[#141414] text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  }`}
                >
                  {p === "all" ? "All Time" : `This ${p}`}
                </button>
              ))}
            </div>
            <button onClick={fetchData} className="text-xs bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" /></svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-200 dark:bg-white/6 rounded-xl overflow-hidden">
          <FinanceKpi label="Total Cost" value={summary.totalCost} color="text-blue-500" sub="BIF" detail={`${summary.totalItems} items · ${summary.interventionsWithCost} interventions`} icon={<IcnMoney className="w-4 h-4" />} />
          <FinanceKpi label="Maintenance" value={summary.maintenanceCost} color="text-emerald-500" sub="BIF" detail={`${summary.maintenanceItems} items · ${maintPct}%`} icon={<IcnBolt className="w-4 h-4" />} />
          <FinanceKpi label="Repairs" value={summary.repairCost} color="text-orange-500" sub="BIF" detail={`${summary.repairItems} items · ${100 - maintPct}%`} icon={<IcnWrench className="w-4 h-4" />} />
          <FinanceKpi label="Avg / Intervention" value={summary.avgCostPerIntervention} color="text-violet-500" sub="BIF" detail="per intervention with costs" icon={<IcnChart className="w-4 h-4" />} />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cost Split Donut */}
          <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 p-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Cost Distribution</h2>
            <div className="flex justify-center">
              <DonutChart segments={[
                { value: summary.maintenanceCost, color: "#10b981", label: "Maintenance" },
                { value: summary.repairCost, color: "#f97316", label: "Repairs" },
              ]} />
            </div>
            <div className="flex justify-center gap-5 mt-4">
              <div className="flex items-center gap-1.5 text-xs text-gray-500"><div className="w-2 h-2 rounded-full bg-emerald-500" />Maintenance ({maintPct}%)</div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500"><div className="w-2 h-2 rounded-full bg-orange-500" />Repairs ({100 - maintPct}%)</div>
            </div>
          </div>

          {/* Monthly Trend Bar Chart */}
          <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Monthly Trend</h2>
                <p className="text-xs text-gray-400 mt-0.5">Cost breakdown over time</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-[10px] text-gray-400"><div className="w-2 h-2 rounded-full bg-emerald-500" />Maint.</div>
                <div className="flex items-center gap-1.5 text-[10px] text-gray-400"><div className="w-2 h-2 rounded-full bg-orange-500" />Repair</div>
              </div>
            </div>
            {monthlyTrend.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-sm text-gray-400">No data for this period</div>
            ) : (
              <MonthlyBarChart data={monthlyTrend} />
            )}
          </div>
        </div>

        {/* Cost by City */}
        <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-white/6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Cost by City</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Top cities by total expenditure</p>
          </div>
          {costByCity.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">No data for this period</div>
          ) : (
            <div className="px-5 py-4 space-y-4">
              {costByCity.map((city) => {
                const pct = (city.totalCost / maxCityTotal) * 100;
                const isHovered = hoveredCity === city.cityName;
                return (
                  <div key={city.cityName}
                    onMouseEnter={() => setHoveredCity(city.cityName)}
                    onMouseLeave={() => setHoveredCity(null)}
                    className={`-mx-2 px-2 py-1.5 rounded-lg transition-all duration-200 cursor-default ${isHovered ? "bg-blue-50 dark:bg-blue-500/5" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-sm font-medium transition-colors ${isHovered ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}>{city.cityName}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{city.count} interventions</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{fmt(city.totalCost)} BIF</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-white/6 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${isHovered ? "bg-blue-500" : "bg-blue-400"}`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Cost Items */}
        <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-white/6 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Cost Items</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Click column headers to sort</p>
            </div>
            <Link href="/interventions" className="text-xs text-blue-500 hover:text-blue-600 font-medium">
              View All Interventions
            </Link>
          </div>
          {sortedItems.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">No cost items recorded yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/6">
                    <th onClick={() => toggleSort("itemName")} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 transition-colors select-none">
                      Item {sortCol === "itemName" && (sortDir === "asc" ? "↑" : "↓")}
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Unit Cost</th>
                    <th onClick={() => toggleSort("totalCost")} className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 transition-colors select-none">
                      Total {sortCol === "totalCost" && (sortDir === "asc" ? "↑" : "↓")}
                    </th>
                    <th onClick={() => toggleSort("date")} className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 transition-colors select-none">
                      Date {sortCol === "date" && (sortDir === "asc" ? "↑" : "↓")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/4">
                  {sortedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/2 transition-colors group">
                      <td className="px-5 py-3">
                        <Link href={`/interventions/${item.intervention.id}`} className="text-gray-800 dark:text-gray-200 font-medium group-hover:text-blue-500 transition-colors">
                          {item.itemName}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          item.intervention.type === "MAINTENANCE"
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                            : "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
                        }`}>
                          {item.intervention.type}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs">
                        {item.intervention.refrigerator.pos.city.name} &middot; {item.intervention.refrigerator.pos.posName}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-600 dark:text-gray-300">{item.quantity}</td>
                      <td className="px-5 py-3 text-right text-gray-600 dark:text-gray-300">{fmt(item.unitCost)}</td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900 dark:text-white">{fmt(item.totalCost)}</td>
                      <td className="px-5 py-3 text-right text-gray-400 text-xs">
                        {new Date(item.intervention.interventionDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
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
