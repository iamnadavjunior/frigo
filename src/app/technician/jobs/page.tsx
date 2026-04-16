"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";

/* ── Types ── */
interface Job {
  id: string;
  type: "REPAIR" | "MAINTENANCE";
  urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "ASSIGNED" | "IN_PROGRESS";
  description: string;
  createdAt: string;
  assignedAt: string | null;
  refrigerator: { id: string; serialNumber: string; brand: string | null; refrigeratorType: string | null };
  pos: { id: string; posName: string; owner: string | null; neighbourhood: string | null; phoneNumber: string | null; streetNo: string | null; city: { name: string } };
  interventions: { id: string; status: string }[];
}

interface RecentWork {
  id: string;
  interventionDate: string;
  refrigerator: { serialNumber: string; pos: { posName: string; city: { name: string } } };
  serviceRequest: { type: string; urgency: string } | null;
  costItems: { totalCost: number }[];
}

interface StatsData {
  activeJobs: number;
  totalCompleted: number;
  completedThisWeek: number;
  completedThisMonth: number;
  recentWork: RecentWork[];
}

/* ── Helpers ── */
const urgencyColor: Record<string, { dot: string; badge: string; text: string }> = {
  CRITICAL: { dot: "bg-red-500", badge: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400", text: "text-red-500" },
  HIGH: { dot: "bg-orange-500", badge: "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400", text: "text-orange-500" },
  MEDIUM: { dot: "bg-yellow-500", badge: "bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400", text: "text-yellow-500" },
  LOW: { dot: "bg-gray-400", badge: "bg-gray-50 dark:bg-white/4 text-gray-500 dark:text-gray-400", text: "text-gray-400" },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/* ════════════════════════════════ Main Dashboard ════════════════════════════════ */
export default function TechnicianDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    const [jobsRes, statsRes] = await Promise.all([
      fetch("/api/technician/jobs"),
      fetch("/api/technician/stats"),
    ]);
    let jobsData = [];
    let statsData = null;
    try {
      jobsData = jobsRes.ok ? await jobsRes.json() : [];
    } catch {
      jobsData = [];
    }
    try {
      statsData = statsRes.ok ? await statsRes.json() : null;
    } catch {
      statsData = null;
    }
    setJobs(Array.isArray(jobsData) ? jobsData : []);
    setStats(statsData);
  }, []);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "TECHNICIAN" && user.role !== "ADMIN") {
      router.replace("/dashboard");
      return;
    }
    fetchData().finally(() => setLoading(false));
  }, [user, router, fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

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

  const firstName = user?.fullName?.split(" ")[0] ?? "Technician";

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* ════ Header ════ */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Bonjour,</p>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">{firstName} 👋</h1>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/6 text-gray-500 hover:bg-gray-50 dark:hover:bg-white/4 transition-colors"
          >
            <svg className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        </div>

        {/* ════ KPI Strip ════ */}
        {stats && (
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Actifs", value: String(stats.activeJobs), color: stats.activeJobs > 0 ? "text-blue-500" : "text-gray-900 dark:text-white", bg: "bg-blue-50 dark:bg-blue-500/8" },
              { label: "Semaine", value: String(stats.completedThisWeek), color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/8" },
              { label: "Mois", value: String(stats.completedThisMonth), color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-500/8" },
              { label: "Total", value: String(stats.totalCompleted), color: "text-gray-900 dark:text-white", bg: "bg-gray-50 dark:bg-white/4" },
            ].map((kpi) => (
              <div key={kpi.label} className={`${kpi.bg} rounded-xl px-3 py-2.5 text-center`}>
                <div className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</div>
                <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mt-0.5">{kpi.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ════ Active Jobs ════ */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            {jobs.length > 0 && <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />}
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tâches actives</span>
            {jobs.length > 0 && (
              <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-500">{jobs.length}</span>
            )}
          </div>

          {jobs.length === 0 ? (
            <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-200 dark:border-white/6 flex flex-col items-center justify-center py-14 text-center">
              <svg className="w-10 h-10 text-gray-200 dark:text-gray-700 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <p className="text-sm font-medium text-gray-400">Aucune tâche en attente</p>
              <p className="text-xs text-gray-300 dark:text-gray-600 mt-0.5">Les nouvelles assignations apparaîtront ici</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => {
                const reported = job.interventions.some((i) => i.status === "COMPLETED");
                const uc = urgencyColor[job.urgency];
                return (
                  <div key={job.id} className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-200 dark:border-white/6 overflow-hidden">
                    {/* Card header with urgency accent */}
                    <div className={`px-4 py-2.5 flex items-center justify-between border-b border-gray-100 dark:border-white/5`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${uc.dot}`} />
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${uc.badge}`}>{job.urgency}</span>
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${job.type === "REPAIR" ? "bg-red-50 dark:bg-red-500/10 text-red-500" : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500"}`}>
                          {job.type === "REPAIR" ? "Réparation" : "Entretien"}
                        </span>
                        {reported && <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-green-50 dark:bg-green-500/10 text-green-500">✓</span>}
                      </div>
                      <span className="text-xs text-gray-400">{timeAgo(job.createdAt)}</span>
                    </div>

                    {/* Card body */}
                    <div className="px-4 py-3">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">{job.pos.posName}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <svg className="w-3.5 h-3.5 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
                        <span>{job.pos.city.name}{job.pos.neighbourhood ? ` · ${job.pos.neighbourhood}` : ""}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <svg className="w-3.5 h-3.5 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5V18M15 7.5V18M3 16.811V8.69c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 0 1 0 1.954l-7.108 4.061A1.125 1.125 0 0 1 3 16.811Z" /></svg>
                        <span className="font-mono">{job.refrigerator.serialNumber}</span>
                        {job.refrigerator.brand && <span className="text-gray-300 dark:text-gray-600">·</span>}
                        {job.refrigerator.brand && <span>{job.refrigerator.brand}</span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-2 line-clamp-2">{job.description}</p>
                    </div>

                    {/* Card footer with actions */}
                    <div className="px-4 py-3 border-t border-gray-100 dark:border-white/5 flex items-center gap-2">
                      {job.pos.phoneNumber && (
                        <a href={`tel:${job.pos.phoneNumber}`} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-100 dark:bg-white/5 text-xs font-semibold text-gray-600 dark:text-gray-400 active:bg-gray-200 dark:active:bg-white/10 transition-colors">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                          </svg>
                          Appeler
                        </a>
                      )}
                      <Link
                        href={`/technician/jobs/${job.id}`}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                          reported
                            ? "bg-gray-100 dark:bg-white/5 text-gray-500"
                            : "bg-blue-600 active:bg-blue-700 text-white"
                        }`}
                      >
                        {reported ? "Voir" : "Rapport"}
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ════ Recent Work ════ */}
        {stats && stats.recentWork.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Travail récent</span>
              <Link href="/technician/history" className="text-xs font-medium text-blue-500 active:text-blue-600 transition">Tout voir →</Link>
            </div>
            <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-200 dark:border-white/6 overflow-hidden divide-y divide-gray-50 dark:divide-white/4">
              {stats.recentWork.slice(0, 3).map((w) => {
                const totalCost = w.costItems.reduce((s, c) => s + c.totalCost, 0);
                const srType = w.serviceRequest?.type;
                return (
                  <Link
                    key={w.id}
                    href={`/technician/history/${w.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/50 dark:hover:bg-white/2 transition-colors"
                  >
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${srType === "REPAIR" ? "bg-red-400" : "bg-emerald-400"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{w.refrigerator.pos.posName}</span>
                        <span className="text-xs font-mono text-gray-400 truncate">{w.refrigerator.serialNumber}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{w.refrigerator.pos.city.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-400">{formatDate(w.interventionDate)}</p>
                      {totalCost > 0 && (
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mt-0.5">{totalCost.toLocaleString()} BIF</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
