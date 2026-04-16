"use client";

import { useEffect, useState, useMemo } from "react";
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

/* ════════════════════════════ Main ════════════════════════════ */
export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [cities, setCities] = useState<City[]>([]);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<{ pending: number; assigned: number; critical: number; total: number; recentRequests: AlertRequest[] }>({ pending: 0, assigned: 0, critical: 0, total: 0, recentRequests: [] });

  /* Redirect technicians to their mobile dashboard */
  useEffect(() => {
    if (user?.role === "TECHNICIAN") {
      router.replace("/technician/jobs");
    }
    if (user?.role === "BRARUDI") {
      router.replace("/brarudi/alerts");
    }
    if (user?.role === "BRARUDI_MGMT") {
      router.replace("/brarudi-mgmt/cities");
    }
  }, [user, router]);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard").then((r) => r.json()),
      fetch("/api/cities").then((r) => r.json()),
      fetch("/api/service-requests/alerts").then((r) => r.ok ? r.json() : null).catch(() => null),
    ])
      .then(([dashData, cityData, alertData]) => {
        setData(dashData);
        setCities(cityData);
        if (alertData) setAlerts(alertData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  /* ── Derived stats ── */
  const d = data;
  const healthRate = d && d.totalFridges > 0 ? Math.round((d.activeFridges / d.totalFridges) * 100) : 0;
  const completionRate = d && d.totalInterventions > 0 ? Math.round(((d.completedMaintenanceCount + d.completedRepairCount) / d.totalInterventions) * 100) : 0;

  const cityCards = useMemo(() => cities.map((c) => ({
    id: c.id, name: c.name, fridges: c.fridgeCount, pos: c.posCount,
  })), [cities]);
  const totalFleetFridges = cityCards.reduce((s, c) => s + c.fridges, 0);

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

        {/* ════ KPI Strip ════ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-px bg-gray-200 dark:bg-white/6 rounded-xl overflow-hidden">
          {([
            { label: "Total Fridges", value: fmtN(d?.totalFridges ?? 0), color: "text-gray-900 dark:text-white" },
            { label: "Active", value: fmtN(d?.activeFridges ?? 0), color: "text-emerald-500", sub: `${healthRate}%` },
            { label: "Under Repair", value: fmtN(d?.underRepairFridges ?? 0), color: "text-orange-500" },
            { label: "Interventions", value: fmtN(d?.totalInterventions ?? 0), color: "text-gray-900 dark:text-white" },
            { label: "This Month", value: fmtN(d?.interventionsThisMonth ?? 0), color: "text-blue-500" },
            { label: "Total Cost", value: `${fmtBIF(d?.totalRepairCost ?? 0)}`, color: "text-red-500", sub: "BIF" },
            { label: "Completion", value: `${completionRate}%`, color: completionRate >= 80 ? "text-emerald-500" : completionRate >= 50 ? "text-orange-500" : "text-red-500" },
          ] as { label: string; value: string; color: string; sub?: string }[]).map((kpi) => (
            <div key={kpi.label} className="bg-white dark:bg-[#141414] px-4 py-3">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">{kpi.label}</div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</span>
                {kpi.sub && <span className="text-xs text-gray-400">{kpi.sub}</span>}
              </div>
            </div>
          ))}
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
            {cityCards.map((city) => {
              const pct = totalFleetFridges > 0 ? Math.round((city.fridges / totalFleetFridges) * 100) : 0;
              return (
                <Link key={city.id || city.name} href={city.id ? `/communes/${city.id}` : "/communes"} className="group bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 hover:border-gray-300 dark:hover:border-white/10 transition-all overflow-hidden">
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
