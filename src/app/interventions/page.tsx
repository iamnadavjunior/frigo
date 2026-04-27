"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";

interface Intervention {
  id: string;
  type: string;
  status: string;
  interventionDate: string;
  issueDescription: string | null;
  workDone: string | null;
  refrigerator: {
    serialNumber: string;
    pos: { posName: string; city: { name: string } };
  };
  technician: { fullName: string };
  costItems: Array<{ totalCost: number }>;
  _count: { attachments: number };
}

interface City {
  id: string;
  name: string;
}
interface Technician {
  id: string;
  fullName: string;
}

/* ── Animated Counter ── */
function useCountUp(target: number, duration = 900) {
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

/* ── KPI Card ── */
function KpiCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  const animated = useCountUp(value);
  return (
    <div className="bg-white dark:bg-[#141414] px-4 py-3 group hover:bg-gray-50 dark:hover:bg-white/3 transition-all duration-200">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{label}</span>
        <span className="text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500 transition-colors">{icon}</span>
      </div>
      <span className={`text-xl font-bold ${color} transition-transform duration-200 group-hover:scale-105 origin-left inline-block`}>{animated}</span>
    </div>
  );
}

/* ── Mini Donut ── */
function MiniDonut({ segments, size = 60 }: { segments: { value: number; color: string; label: string }[]; size?: number }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {segments.filter(s => s.value > 0).map((seg, i) => {
          const pct = seg.value / total;
          const dash = pct * circumference;
          const currentOffset = offset;
          offset += dash;
          return (
            <circle key={i} cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={seg.color}
              strokeWidth={hovered === i ? strokeWidth + 3 : strokeWidth}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-currentOffset}
              className="transition-all duration-300 cursor-pointer"
              style={{ opacity: hovered !== null && hovered !== i ? 0.3 : 1 }}
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold text-gray-900 dark:text-white">
          {hovered !== null ? segments.filter(s => s.value > 0)[hovered]?.value : total}
        </span>
      </div>
    </div>
  );
}

/* ── Status badge colors ── */
const statusColors: Record<string, { text: string; bg: string; dot: string }> = {
  COMPLETED: { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", dot: "bg-emerald-500" },
  IN_PROGRESS: { text: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10", dot: "bg-blue-500" },
  PENDING: { text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10", dot: "bg-amber-500" },
  CANCELLED: { text: "text-gray-500 dark:text-gray-400", bg: "bg-gray-50 dark:bg-white/5", dot: "bg-gray-400" },
};

export default function InterventionsListPage() {
  const { user } = useAuth();
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [cityId, setCityId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [cities, setCities] = useState<City[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    fetch("/api/lookups")
      .then((res) => res.json())
      .then((data) => {
        setCities(data.cities || []);
        setTechnicians(data.technicians || []);
      })
      .catch(console.error);
  }, []);

  const fetchInterventions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (type) params.set("type", type);
    if (status) params.set("status", status);
    if (technicianId) params.set("technicianId", technicianId);
    if (cityId) params.set("cityId", cityId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    params.set("page", String(page));
    params.set("limit", "25");

    try {
      const res = await fetch(`/api/interventions?${params}`);
      const data = await res.json();
      setInterventions(data.data || []);
      setTotal(data.total || 0);
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Failed to fetch interventions:", error);
    } finally {
      setLoading(false);
    }
  }, [search, type, status, technicianId, cityId, dateFrom, dateTo, page]);

  useEffect(() => {
    fetchInterventions();
  }, [fetchInterventions]);

  /* Auto-refresh every 30s */
  useEffect(() => {
    const iv = setInterval(fetchInterventions, 30_000);
    return () => clearInterval(iv);
  }, [fetchInterventions]);

  const totalPages = Math.ceil(total / 25);
  const canCreate = user?.role === "CABU_ADMIN" || user?.role === "TECHNICIAN";

  /* ── Compute stats from current page data ── */
  const stats = useMemo(() => {
    const maintenanceCount = interventions.filter(i => i.type === "MAINTENANCE").length;
    const repairCount = interventions.filter(i => i.type === "REPAIR").length;
    const completedCount = interventions.filter(i => i.status === "COMPLETED").length;
    const pendingCount = interventions.filter(i => i.status === "PENDING").length;
    const inProgressCount = interventions.filter(i => i.status === "IN_PROGRESS").length;
    const cancelledCount = interventions.filter(i => i.status === "CANCELLED").length;
    const totalCost = interventions.reduce((s, i) => s + i.costItems.reduce((cs, c) => cs + c.totalCost, 0), 0);
    return { maintenanceCount, repairCount, completedCount, pendingCount, inProgressCount, cancelledCount, totalCost };
  }, [interventions]);

  const inputClass = "px-3 py-2 bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/8 rounded-lg text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500/40 transition-colors";

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Interventions</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {total} total · Updated {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchInterventions} className="text-xs bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" /></svg>
            Refresh
          </button>
          {canCreate && (
            <Link
              href="/interventions/new"
              className="bg-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              New Intervention
            </Link>
          )}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-px bg-gray-200 dark:bg-white/6 rounded-xl overflow-hidden">
        <KpiCard label="Total" value={total} color="text-gray-900 dark:text-white" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 1 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" /></svg>} />
        <KpiCard label="Maintenance" value={stats.maintenanceCount} color="text-blue-500" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" /></svg>} />
        <KpiCard label="Repair" value={stats.repairCount} color="text-orange-500" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.049.58.025 1.194-.14 1.743" /></svg>} />
        <KpiCard label="Completed" value={stats.completedCount} color="text-emerald-500" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>} />
        <KpiCard label="Pending" value={stats.pendingCount} color="text-amber-500" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>} />
        <KpiCard label="Cost" value={stats.totalCost} color="text-violet-500" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>} />
      </div>

      {/* Visual breakdown row */}
      {interventions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 px-5 py-4 flex items-center gap-5">
            <MiniDonut segments={[
              { value: stats.maintenanceCount, color: "#3b82f6", label: "Maintenance" },
              { value: stats.repairCount, color: "#f97316", label: "Repair" },
            ]} />
            <div className="flex-1 space-y-2">
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-gray-500"><span className="w-2 h-2 rounded-full bg-blue-500" />Maintenance</span>
                  <span className="font-medium text-gray-900 dark:text-white">{stats.maintenanceCount}</span>
                </div>
                <div className="h-1.5 bg-gray-100 dark:bg-white/6 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-700" style={{ width: `${interventions.length > 0 ? (stats.maintenanceCount / interventions.length) * 100 : 0}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-gray-500"><span className="w-2 h-2 rounded-full bg-orange-500" />Repair</span>
                  <span className="font-medium text-gray-900 dark:text-white">{stats.repairCount}</span>
                </div>
                <div className="h-1.5 bg-gray-100 dark:bg-white/6 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full transition-all duration-700" style={{ width: `${interventions.length > 0 ? (stats.repairCount / interventions.length) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 px-5 py-4 flex items-center gap-5">
            <MiniDonut segments={[
              { value: stats.completedCount, color: "#10b981", label: "Completed" },
              { value: stats.inProgressCount, color: "#3b82f6", label: "In Progress" },
              { value: stats.pendingCount, color: "#f59e0b", label: "Pending" },
              { value: stats.cancelledCount, color: "#6b7280", label: "Cancelled" },
            ]} />
            <div className="flex-1 space-y-1.5">
              {[
                { label: "Completed", count: stats.completedCount, color: "bg-emerald-500" },
                { label: "In Progress", count: stats.inProgressCount, color: "bg-blue-500" },
                { label: "Pending", count: stats.pendingCount, color: "bg-amber-500" },
                { label: "Cancelled", count: stats.cancelledCount, color: "bg-gray-400" },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-gray-500"><span className={`w-2 h-2 rounded-full ${s.color}`} />{s.label}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className={`${inputClass} pl-8 w-48`}
          />
        </div>
        <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className={inputClass}>
          <option value="">All Types</option>
          <option value="MAINTENANCE">Maintenance</option>
          <option value="REPAIR">Repair</option>
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={inputClass}>
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select value={cityId} onChange={(e) => { setCityId(e.target.value); setPage(1); }} className={inputClass}>
          <option value="">All Cities</option>
          {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={technicianId} onChange={(e) => { setTechnicianId(e.target.value); setPage(1); }} className={inputClass}>
          <option value="">All Technicians</option>
          {technicians.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className={inputClass} title="From date" />
        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className={inputClass} title="To date" />
        {(search || type || status || cityId || technicianId || dateFrom || dateTo) && (
          <button onClick={() => { setSearch(""); setType(""); setStatus(""); setCityId(""); setTechnicianId(""); setDateFrom(""); setDateTo(""); setPage(1); }}
            className="px-3 py-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors font-medium">
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 overflow-hidden">
        {loading && interventions.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <div className="animate-pulse flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-white/10" />
              <div className="w-28 h-2 rounded bg-gray-200 dark:bg-white/10" />
            </div>
          </div>
        ) : interventions.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <svg className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
            <p className="text-sm font-medium text-gray-500">No interventions found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/6">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">POS</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">City</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fridge SN</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Technician</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/4">
                {interventions.map((inv) => {
                  const cost = inv.costItems.reduce((s, c) => s + c.totalCost, 0);
                  const sc = statusColors[inv.status] || statusColors.CANCELLED;
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-white/3 transition-colors group">
                      <td className="px-4 py-3">
                        <Link href={`/interventions/${inv.id}`} className="text-gray-800 dark:text-gray-200 group-hover:text-blue-500 transition-colors font-medium">
                          {new Date(inv.interventionDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          inv.type === "REPAIR"
                            ? "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
                            : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                        }`}>
                          {inv.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-40 truncate">{inv.refrigerator.pos.posName}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{inv.refrigerator.pos.city.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">{inv.refrigerator.serialNumber}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{inv.technician.fullName}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${sc.bg} ${sc.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                          {inv.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {cost > 0 ? (
                          <span className="font-medium text-gray-900 dark:text-white">{cost.toLocaleString()} <span className="text-[10px] text-gray-400">BIF</span></span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-white/8 rounded-lg text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
            Previous
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (page <= 4) {
                pageNum = i + 1;
              } else if (page >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = page - 3 + i;
              }
              return (
                <button key={pageNum} onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                    page === pageNum
                      ? "bg-blue-500 text-white"
                      : "text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
                  }`}>
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-white/8 rounded-lg text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center gap-1"
          >
            Next
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
