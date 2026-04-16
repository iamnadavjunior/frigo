"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    setLoading(true);
    fetch(`/api/finance?period=${period}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

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

  if (!data) return null;

  const { summary, costByCity, monthlyTrend, recentItems } = data;
  const maxCityTotal = Math.max(...costByCity.map((c) => c.totalCost), 1);

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Finance</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Intervention costs &amp; expenditure overview</p>
          </div>
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
        </div>

        {/* Summary Cards */}
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-200 dark:bg-white/6 rounded-xl overflow-hidden">
            {/* Total Cost */}
            <div className="bg-white dark:bg-[#141414] px-4 py-3">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Cost</div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-bold text-blue-500">{fmt(summary.totalCost)}</span>
                <span className="text-xs text-gray-400">BIF</span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{summary.totalItems} items · {summary.interventionsWithCost} interventions</div>
            </div>

            {/* Maintenance Cost */}
            <div className="bg-white dark:bg-[#141414] px-4 py-3">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Maintenance</div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-bold text-emerald-500">{fmt(summary.maintenanceCost)}</span>
                <span className="text-xs text-gray-400">BIF</span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{summary.maintenanceItems} items</div>
            </div>

            {/* Repair Cost */}
            <div className="bg-white dark:bg-[#141414] px-4 py-3">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Repairs</div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-bold text-orange-500">{fmt(summary.repairCost)}</span>
                <span className="text-xs text-gray-400">BIF</span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{summary.repairItems} items</div>
            </div>

            {/* Average */}
            <div className="bg-white dark:bg-[#141414] px-4 py-3">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Avg / Intervention</div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-bold text-violet-500">{fmt(summary.avgCostPerIntervention)}</span>
                <span className="text-xs text-gray-400">BIF</span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">per intervention with costs</div>
            </div>
          </div>
        </div>

        {/* Monthly Trend + City Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Trend */}
          <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-white/6">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Monthly Trend</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Last 6 months cost breakdown</p>
            </div>
            {monthlyTrend.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">No data for this period</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-white/6">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Month</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Maintenance</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Repair</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/4">
                    {monthlyTrend.map((row) => (
                      <tr key={row.month} className="hover:bg-gray-50 dark:hover:bg-white/2">
                        <td className="px-5 py-3 text-gray-700 dark:text-gray-300 font-medium">{fmtMonth(row.month)}</td>
                        <td className="px-5 py-3 text-right text-emerald-600 dark:text-emerald-400">{fmt(row.maintenance)}</td>
                        <td className="px-5 py-3 text-right text-orange-500 dark:text-orange-400">{fmt(row.repair)}</td>
                        <td className="px-5 py-3 text-right font-semibold text-gray-900 dark:text-white">{fmt(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
                  return (
                    <div key={city.cityName}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{city.cityName}</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{fmt(city.totalCost)} BIF</span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-white/6 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{city.count} interventions</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Cost Items */}
        <div>
          <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-white/6 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Cost Items</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Latest expenditures across all interventions</p>
              </div>
              <Link
                href="/interventions"
                className="text-xs text-blue-500 hover:text-blue-600 font-medium"
              >
                View All Interventions
              </Link>
            </div>
            {recentItems.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">No cost items recorded yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-white/6">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Unit Cost</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/4">
                    {recentItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/2">
                        <td className="px-5 py-3">
                          <Link
                            href={`/interventions/${item.intervention.id}`}
                            className="text-gray-800 dark:text-gray-200 font-medium hover:text-blue-500"
                          >
                            {item.itemName}
                          </Link>
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              item.intervention.type === "MAINTENANCE"
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                                : "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
                            }`}
                          >
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
                          {new Date(item.intervention.interventionDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
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
    </div>
  );
}
