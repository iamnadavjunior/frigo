"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";

/* ── Types ── */
interface AlertItem {
  id: string; type: string; urgency: string; status: string; description: string; createdAt: string;
  refrigerator: { serialNumber: string; brand: string | null };
  pos: { posName: string; owner: string | null; city: { name: string } };
  assignedTo: { fullName: string } | null;
}

const statusBadge: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", label: "En attente" },
  ASSIGNED: { bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", label: "Assigné" },
  IN_PROGRESS: { bg: "bg-indigo-50 dark:bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400", label: "En cours" },
  RESOLVED: { bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", label: "Résolu" },
  CANCELLED: { bg: "bg-red-50 dark:bg-red-500/10", text: "text-red-500 dark:text-red-400", label: "Annulé" },
};

const urgencyLabel: Record<string, { text: string; color: string }> = {
  LOW: { text: "Basse", color: "text-gray-400" },
  MEDIUM: { text: "Moyenne", color: "text-amber-500" },
  HIGH: { text: "Haute", color: "text-orange-500" },
  CRITICAL: { text: "Critique", color: "text-red-500" },
};

const statusTabs = [
  { key: "ALL", label: "Tout" },
  { key: "PENDING", label: "En attente" },
  { key: "ASSIGNED", label: "Assigné" },
  { key: "RESOLVED", label: "Résolu" },
];

/* ════════════════════════════════════════════════════════════════
   BRARUDI — Alert History Page
   ════════════════════════════════════════════════════════════════ */
export default function BrarudiHistoryPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (tab !== "ALL") params.set("status", tab);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (search) params.set("search", search);
    try {
      const res = await fetch(`/api/brarudi/alerts?${params}`);
      const json = await res.json();
      setData(json.alerts || []);
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
    setDateFrom(""); setDateTo(""); setSearch(""); setSearchInput("");
  };
  const hasFilters = dateFrom || dateTo || search;

  /* Group by date */
  const grouped: Record<string, AlertItem[]> = {};
  data.forEach(item => {
    const key = new Date(item.createdAt).toISOString().split("T")[0];
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* ════ Status Tabs ════ */}
        <div className="flex items-center bg-gray-100 dark:bg-white/6 rounded-xl p-1 gap-1">
          {statusTabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                tab === t.key
                  ? "bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ════ Search + Date ════ */}
        <div className="space-y-2">
          <form onSubmit={handleSearch} className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Rechercher PDV, N° série..."
              className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/6 rounded-xl text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </form>
          <div className="flex items-center gap-2">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="flex-1 h-10 px-3 bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/6 rounded-xl text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
            <span className="text-xs text-gray-400 shrink-0">à</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="flex-1 h-10 px-3 bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/6 rounded-xl text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
            {hasFilters && (
              <button onClick={clearFilters} className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-500/10 text-red-400">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
        </div>

        {/* ════ Content ════ */}
        {loading ? (
          <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-200 dark:border-white/6 py-14 text-center">
            <div className="animate-pulse flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-white/10" />
              <div className="w-28 h-2 rounded bg-gray-200 dark:bg-white/10" />
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-200 dark:border-white/6 py-14 text-center">
            <svg className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
            <p className="text-sm font-medium text-gray-400">Aucune alerte trouvée</p>
            {hasFilters && <button onClick={clearFilters} className="text-xs text-amber-500 mt-2">Effacer les filtres</button>}
          </div>
        ) : (
          <div className="space-y-5">
            {sortedDates.map(dateKey => {
              const items = grouped[dateKey];
              return (
                <div key={dateKey}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{fmtDate(dateKey + "T12:00:00")}</span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-white/6" />
                    <span className="text-xs text-gray-400">{items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {items.map(alert => {
                      const st = statusBadge[alert.status] || statusBadge.PENDING;
                      const urg = urgencyLabel[alert.urgency] || urgencyLabel.MEDIUM;
                      return (
                        <div key={alert.id} className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-200 dark:border-white/6 px-4 py-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>{st.label}</span>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${alert.type === "REPAIR" ? "bg-red-50 dark:bg-red-500/10 text-red-500" : "bg-blue-50 dark:bg-blue-500/10 text-blue-500"}`}>
                                {alert.type === "REPAIR" ? "Réparation" : "Entretien"}
                              </span>
                              <span className={`text-[10px] font-bold ${urg.color}`}>{urg.text}</span>
                            </div>
                            <span className="text-xs text-gray-400">{fmtTime(alert.createdAt)}</span>
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{alert.pos.posName}</h3>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                            <span className="font-mono">{alert.refrigerator.serialNumber}</span>
                            {alert.refrigerator.brand && <><span className="text-gray-300 dark:text-gray-600">·</span><span>{alert.refrigerator.brand}</span></>}
                            <span className="text-gray-300 dark:text-gray-600">·</span>
                            <span>{alert.pos.city.name}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{alert.description}</p>
                          {alert.assignedTo && (
                            <div className="mt-1.5 flex items-center gap-1 text-xs text-blue-500">
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" /></svg>
                              Technicien: {alert.assignedTo.fullName}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
