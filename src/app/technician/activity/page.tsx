"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";

/* ── Types ── */
interface FicheItem {
  _kind: "fiche";
  id: string;
  type: string;
  status: string;
  interventionDate: string;
  workDone: string | null;
  createdAt: string;
  refrigerator: {
    serialNumber: string;
    brand: string | null;
    pos: { posName: string; owner: string | null; city: { name: string } };
  };
}

interface JobItem {
  _kind: "job";
  id: string;
  type: string;
  urgency: string;
  status: string;
  description: string;
  assignedAt: string | null;
  createdAt: string;
  refrigerator: { serialNumber: string; brand: string | null };
  pos: { posName: string; owner: string | null; city: { name: string } };
}

type ActivityItem = FicheItem | JobItem;

/* ── Helpers ── */
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

const statusStyle: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", label: "En attente" },
  COMPLETED: { bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", label: "Terminé" },
  CANCELLED: { bg: "bg-red-50 dark:bg-red-500/10", text: "text-red-500 dark:text-red-400", label: "Rejeté" },
  IN_PROGRESS: { bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", label: "En cours" },
  ASSIGNED: { bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", label: "Assigné" },
  RESOLVED: { bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", label: "Résolu" },
};

const urgencyStyle: Record<string, string> = {
  CRITICAL: "text-red-500",
  HIGH: "text-orange-500",
  MEDIUM: "text-yellow-500",
  LOW: "text-gray-400",
};

/* ════════════════════════════════════════════════════════════════
   Unified Activity / Tracking Page
   ════════════════════════════════════════════════════════════════ */
export default function TechnicianActivityPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"all" | "fiches" | "jobs">("all");
  const [data, setData] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ tab });
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (search) params.set("search", search);
    try {
      const res = await fetch(`/api/technician/activity?${params}`);
      const json = await res.json();
      setData(json.data || []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [tab, dateFrom, dateTo, search]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setSearch("");
    setSearchInput("");
  };

  const hasFilters = dateFrom || dateTo || search;

  /* ── Group items by date ── */
  const grouped: Record<string, ActivityItem[]> = {};
  data.forEach((item) => {
    const dateKey = new Date(item.createdAt).toISOString().split("T")[0];
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(item);
  });
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const tabs = [
    { key: "all" as const, label: "Tout", count: null },
    { key: "fiches" as const, label: "Fiches", count: null },
    { key: "jobs" as const, label: "Tâches", count: null },
  ];

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-lg mx-auto px-3 pt-2 pb-4 space-y-2.5">

        {/* ════ Tab Switcher ════ */}
        <div className="flex items-center bg-gray-100 dark:bg-white/6 rounded-lg p-0.5 gap-0.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                tab === t.key
                  ? "bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 active:bg-white/50 dark:active:bg-white/3"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ════ Search & Date Filters ════ */}
        <div className="space-y-1.5">
          <form onSubmit={handleSearch} className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher PDV, N° série..."
              className="w-full pl-8 pr-3 py-2 bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/6 rounded-lg text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </form>

          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="flex-1 h-9 px-2.5 bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/6 rounded-lg text-[11px] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
            <span className="text-[10px] text-gray-400 shrink-0">à</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="flex-1 h-9 px-2.5 bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/6 rounded-lg text-[11px] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-500/10 text-red-400 active:bg-red-100 dark:active:bg-red-500/15"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* ════ Content ════ */}
        {loading ? (
          <div className="py-10 text-center">
            <div className="animate-pulse flex flex-col items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gray-200 dark:bg-white/10" />
              <div className="w-20 h-1.5 rounded bg-gray-200 dark:bg-white/10" />
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="py-10 text-center">
            <svg className="w-8 h-8 text-gray-200 dark:text-gray-700 mx-auto mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <p className="text-xs font-medium text-gray-400">Aucune activité trouvée</p>
            {hasFilters && (
              <button onClick={clearFilters} className="text-[11px] text-teal-500 mt-1 active:underline">
                Effacer les filtres
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedDates.map((dateKey) => {
              const items = grouped[dateKey];
              const dayLabel = fmtDate(dateKey + "T12:00:00");
              return (
                <div key={dateKey}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{dayLabel}</span>
                    <div className="flex-1 h-px bg-gray-100 dark:bg-white/6" />
                    <span className="text-[10px] text-gray-400">{items.length}</span>
                  </div>
                  <div className="space-y-1.5">
                    {items.map((item) => (
                      <ActivityCard key={item.id + item._kind} item={item} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Activity Card Component
   ────────────────────────────────────────────── */
function ActivityCard({ item }: { item: ActivityItem }) {
  const st = statusStyle[item.status] || statusStyle.PENDING;

  if (item._kind === "fiche") {
    const fiche = item as FicheItem;
    return (
      <Link href={`/technician/history/${fiche.id}`} className="block">
        <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 active:bg-gray-50 dark:active:bg-white/3 transition-colors px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-px rounded-full bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" /></svg>
                Fiche
              </span>
              <span className={`text-[10px] font-semibold px-1.5 py-px rounded-full ${st.bg} ${st.text}`}>{st.label}</span>
            </div>
            <span className="text-[10px] text-gray-400">{fmtTime(fiche.createdAt)}</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{fiche.refrigerator.pos.posName}</h3>
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-gray-500">
            <span className="font-mono">{fiche.refrigerator.serialNumber}</span>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span>{fiche.refrigerator.pos.city.name}</span>
          </div>
          {fiche.workDone && (
            <p className="text-[11px] text-gray-400 mt-1 line-clamp-1">{fiche.workDone}</p>
          )}
        </div>
      </Link>
    );
  }

  const job = item as JobItem;
  const uc = urgencyStyle[job.urgency] || "text-gray-400";
  return (
    <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 px-3 py-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-semibold px-1.5 py-px rounded-full ${job.type === "REPAIR" ? "bg-red-50 dark:bg-red-500/10 text-red-500" : "bg-blue-50 dark:bg-blue-500/10 text-blue-500"}`}>
            {job.type === "REPAIR" ? "Répar." : "Entret."}
          </span>
          <span className={`text-[10px] font-semibold px-1.5 py-px rounded-full ${st.bg} ${st.text}`}>{st.label}</span>
          <span className={`text-[10px] font-bold ${uc}`}>{job.urgency}</span>
        </div>
        <span className="text-[10px] text-gray-400">{fmtTime(job.createdAt)}</span>
      </div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{job.pos.posName}</h3>
      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-gray-500">
        <span className="font-mono">{job.refrigerator.serialNumber}</span>
        <span className="text-gray-300 dark:text-gray-600">·</span>
        <span>{job.pos.city.name}</span>
      </div>
      <p className="text-[11px] text-gray-400 mt-1 line-clamp-1">{job.description}</p>
    </div>
  );
}
