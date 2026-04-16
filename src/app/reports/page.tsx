"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";
import * as XLSX from "xlsx";

/* ─── Types ─── */
interface CostItem { itemName: string; quantity: number; unitCost: number; totalCost: number }
interface ReportEntry {
  id: string;
  type: string;
  status: string;
  interventionDate: string;
  issueDescription: string | null;
  workDone: string | null;
  notes: string | null;
  refrigerator: {
    id: string;
    serialNumber: string;
    brand: string | null;
    refrigeratorType: string | null;
    pos: {
      posName: string;
      channel: string | null;
      owner: string | null;
      phoneNumber: string | null;
      neighbourhood: string | null;
      idNumber: string | null;
      streetNo: string | null;
      city: { id: string; name: string };
    };
  };
  technician: { fullName: string };
  costItems: CostItem[];
}

interface ReportResponse {
  tab: string;
  period: string;
  dateRange: { from: string; to: string };
  summary: {
    total: number;
    uniqueFridges: number;
    uniquePOS: number;
    totalCost: number;
    totalFridgesInScope: number;
    servicedCount: number;
    nonServicedCount: number;
  };
  byDate: Record<string, ReportEntry[]>;
  data: ReportEntry[];
}

interface City { id: string; name: string }

/* ─── Animated Counter Hook ─── */
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

/* ─── Helpers ─── */
const fmtDateHead = (d: string) => new Date(d).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
const fmtRange = (from: string, to: string) => {
  const f = new Date(from);
  const t = new Date(to);
  const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  if (f.toDateString() === t.toDateString()) {
    return `${f.getDate()} ${months[f.getMonth()]} ${f.getFullYear()}`;
  }
  if (f.getMonth() === t.getMonth() && f.getFullYear() === t.getFullYear()) {
    return `${String(f.getDate()).padStart(2, "0")} au ${String(t.getDate()).padStart(2, "0")} ${months[f.getMonth()]} ${f.getFullYear()}`;
  }
  return `${String(f.getDate()).padStart(2, "0")} ${months[f.getMonth()]} au ${String(t.getDate()).padStart(2, "0")} ${months[t.getMonth()]} ${t.getFullYear()}`;
};

/* ─── Day Bar Chart ─── */
function DayBarChart({ dates, byDate, color }: { dates: string[]; byDate: Record<string, ReportEntry[]>; color: string }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const counts = dates.map(d => byDate[d]?.length || 0);
  const max = Math.max(...counts, 1);
  if (dates.length === 0) return <div className="h-28 flex items-center justify-center text-xs text-gray-400">Aucune donnée</div>;

  return (
    <div className="flex items-end gap-1" style={{ height: 110 }}>
      {dates.map((dateKey, i) => {
        const count = counts[i];
        const pct = (count / max) * 100;
        const dayLabel = new Date(dateKey).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
        return (
          <div key={dateKey} className="flex flex-col items-center flex-1 relative"
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            {hovered === i && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap z-10 shadow-lg">
                {count}
              </div>
            )}
            <div
              className="w-full rounded-t-sm transition-all duration-500 min-h-1"
              style={{
                height: `${Math.max(pct, 4)}%`,
                backgroundColor: color,
                opacity: hovered !== null && hovered !== i ? 0.35 : 1,
              }}
            />
            <span className={`text-[8px] mt-1 transition-colors ${hovered === i ? "text-gray-900 dark:text-white font-bold" : "text-gray-400"}`}>
              {dates.length <= 7 ? dayLabel : (i % Math.ceil(dates.length / 7) === 0 ? dayLabel : "")}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
export default function ReportsPage() {
  useAuth();
  const [tab, setTab] = useState<"repairs" | "maintenance" | "pending">("repairs");
  const [period, setPeriod] = useState<"day" | "week" | "month" | "custom">("day");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [cityId, setCityId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportResponse | null>(null);

  /* ── Pending fiches state ── */
  const [pendingFiches, setPendingFiches] = useState<ReportEntry[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/lookups")
      .then((res) => res.json())
      .then((data) => setCities(data.cities || []))
      .catch(console.error);
  }, []);

  /* ── Fetch pending fiches count on mount ── */
  const fetchPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const res = await fetch("/api/reports/pending");
      const data = await res.json();
      setPendingFiches(data.data || []);
      setPendingCount(data.total || 0);
    } catch { /* ignore */ }
    finally { setPendingLoading(false); }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  /* ── Approve / Reject handler ── */
  const handleFicheAction = async (id: string, action: "approve" | "reject") => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/interventions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action === "approve" ? "COMPLETED" : "CANCELLED" }),
      });
      if (res.ok) {
        setPendingFiches((prev) => prev.filter((f) => f.id !== id));
        setPendingCount((c) => Math.max(0, c - 1));
      }
    } catch { /* ignore */ }
    finally { setActionLoading(null); }
  };

  const fetchReport = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("tab", tab === "pending" ? "maintenance" : tab);
    if (selectedMonth !== "") {
      params.set("monthIndex", selectedMonth);
    } else {
      params.set("period", period);
      if (period === "custom") {
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);
      }
    }
    if (cityId) params.set("cityId", cityId);

    try {
      const res = await fetch(`/api/reports?${params}`);
      const data = await res.json();
      setReport(data);
    } catch (error) {
      console.error("Failed to fetch report:", error);
    } finally {
      setLoading(false);
    }
  }, [tab, period, dateFrom, dateTo, cityId, selectedMonth]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const sortedDates = useMemo(() => {
    if (!report?.byDate) return [];
    return Object.keys(report.byDate).sort();
  }, [report]);

  const reportTitle = tab === "repairs" ? "RÉPARATIONS" : "ENTRETIENS";
  const dateRangeLabel = report ? fmtRange(report.dateRange.from, report.dateRange.to) : "";

  const downloadExcel = useCallback(() => {
    if (!report || report.data.length === 0) return;
    const isRepair = tab === "repairs";
    const sheetName = isRepair ? "REPARATIONS" : "ENTRETIENS";
    const months = ["JANVIER","FÉVRIER","MARS","AVRIL","MAI","JUIN","JUILLET","AOÛT","SEPTEMBRE","OCTOBRE","NOVEMBRE","DÉCEMBRE"];

    /* ── Build title like the reference file ── */
    const from = new Date(report.dateRange.from);
    const to = new Date(report.dateRange.to);
    let titleDate: string;
    if (from.toDateString() === to.toDateString()) {
      titleDate = `${String(from.getDate()).padStart(2,"0")} ${months[from.getMonth()]} ${from.getFullYear()}`;
    } else if (from.getMonth() === to.getMonth()) {
      titleDate = `${String(from.getDate()).padStart(2,"0")} AU ${String(to.getDate()).padStart(2,"0")} ${months[from.getMonth()]} ${from.getFullYear()}`;
    } else {
      titleDate = `${String(from.getDate()).padStart(2,"0")} ${months[from.getMonth()]} AU ${String(to.getDate()).padStart(2,"0")} ${months[to.getMonth()]} ${to.getFullYear()}`;
    }
    const title = `${sheetName} DU ${titleDate}`;

    /* ── Row 1: Title row (empty cells + title) ── */
    const colCount = isRepair ? 14 : 13;
    const titleRow: (string | null)[] = Array(colCount).fill(null);
    if (isRepair) {
      // REPARATIONS: title in col G (index 6) with leading spaces
      titleRow[6] = "                       " + title;
    } else {
      // ENTRETIENS: title in col A with leading spaces
      titleRow[0] = "                                                                                 " + title;
    }

    /* ── Row 2: Headers ── */
    const headers = ["Date", "N°", "Nom du PDV", "Canal", "Propriétaire", "N° TEL", "Province", "Commune", "Colline/Quartier", "N° d'identification", "Avenue & N°", "Type Frigo", "Marque"];
    if (isRepair) headers.push("objet de l'intervention");

    /* ── Data rows: date only on first entry per date group ── */
    const dataRows: (string | number | null | Date)[][] = [];
    let idx = 0;
    for (const dateKey of sortedDates) {
      const entries = report.byDate[dateKey];
      let isFirstOfDate = true;
      for (const e of entries) {
        idx++;
        const row: (string | number | null | Date)[] = [
          isFirstOfDate ? new Date(dateKey) : null,
          idx,
          e.refrigerator.pos.posName,
          e.refrigerator.pos.channel || "",
          e.refrigerator.pos.owner || "",
          e.refrigerator.pos.phoneNumber ? Number(e.refrigerator.pos.phoneNumber.replace(/\D/g, "")) || e.refrigerator.pos.phoneNumber : "",
          "Bujumbura Mairie",
          e.refrigerator.pos.city.name,
          e.refrigerator.pos.neighbourhood || "",
          e.refrigerator.pos.idNumber || "",
          e.refrigerator.pos.streetNo || "",
          e.refrigerator.refrigeratorType || "",
          e.refrigerator.brand || "",
        ];
        if (isRepair) row.push(e.workDone || e.issueDescription || "");
        dataRows.push(row);
        isFirstOfDate = false;
      }
    }

    /* ── Build sheet ── */
    const aoa = [titleRow, headers, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true });

    /* ── Format date cells as short date ── */
    for (let r = 2; r < aoa.length; r++) {
      const addr = XLSX.utils.encode_cell({ r, c: 0 });
      if (ws[addr] && ws[addr].t === "d") {
        ws[addr].t = "n";
        ws[addr].v = XLSX.SSF.parse_date_code(ws[addr].v)
          ? ws[addr].v
          : Math.floor((aoa[r][0] as Date).getTime() / 86400000) + 25569;
        ws[addr].z = "m/d/yy";
      }
    }

    /* ── Column widths (matching reference file) ── */
    if (isRepair) {
      ws["!cols"] = [
        { wch: 11 }, { wch: 3.14 }, { wch: 18.14 }, { wch: 8 }, { wch: 12.86 },
        { wch: 9.71 }, { wch: 17.43 }, { wch: 8.14 }, { wch: 9.14 }, { wch: 12.86 },
        { wch: 16.14 }, { wch: 7.57 }, { wch: 9.29 }, { wch: 65.14 },
      ];
    } else {
      ws["!cols"] = [
        { wch: 9.86 }, { wch: 5.57 }, { wch: 21.43 }, { wch: 11.71 }, { wch: 16.43 },
        { wch: 9.14 }, { wch: 17.29 }, { wch: 10.86 }, { wch: 11 }, { wch: 12.43 },
        { wch: 21.43 }, { wch: 9.71 }, { wch: 9.14 },
      ];
    }

    /* ── Row heights ── */
    ws["!rows"] = [{ hpx: 21 }, { hpx: 18.75 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${sheetName} DU ${titleDate}.xlsx`);
  }, [report, tab, sortedDates]);

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ── Header: Tabs + Period + City filter on one line ── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Back + Title */}
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          </Link>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white shrink-0">Rapports</h1>

          <div className="w-px h-6 bg-gray-200 dark:bg-white/8 shrink-0" />

          {/* Tabs: Réparations / Entretiens / Fiches en attente */}
          <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-white/6 rounded-lg p-0.5 h-8 shrink-0">
            <button
              onClick={() => setTab("repairs")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                tab === "repairs"
                  ? "bg-white dark:bg-[#1a1a1a] text-red-600 dark:text-red-400 shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              Réparations
            </button>
            <button
              onClick={() => setTab("maintenance")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                tab === "maintenance"
                  ? "bg-white dark:bg-[#1a1a1a] text-emerald-600 dark:text-emerald-400 shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              Entretiens
            </button>
            <button
              onClick={() => { setTab("pending"); fetchPending(); }}
              className={`relative px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                tab === "pending"
                  ? "bg-white dark:bg-[#1a1a1a] text-amber-600 dark:text-amber-400 shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              Fiches en attente
              {pendingCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-4.5 h-4.5 flex items-center justify-center px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>

          {tab !== "pending" && <div className="w-px h-6 bg-gray-200 dark:bg-white/8 shrink-0" />}

          {/* Period filter */}
          {tab !== "pending" && (
          <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-white/6 rounded-lg p-0.5 h-8 shrink-0">
            {([["day", "Aujourd\u2019hui"], ["week", "Semaine"], ["custom", "Personnalisé"]] as const).map(([key, label]) => (
              <button key={key} onClick={() => { setPeriod(key as typeof period); setSelectedMonth(""); }}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap ${selectedMonth === "" && period === key ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
              >{label}</button>
            ))}
          </div>
          )}

          {/* Custom date inputs */}
          {tab !== "pending" && period === "custom" && selectedMonth === "" && (
            <>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="h-8 px-2 text-xs bg-gray-50 dark:bg-white/4 border border-gray-200 dark:border-white/6 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/30" />
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="h-8 px-2 text-xs bg-gray-50 dark:bg-white/4 border border-gray-200 dark:border-white/6 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/30" />
            </>
          )}

          {tab !== "pending" && <div className="w-px h-6 bg-gray-200 dark:bg-white/8 shrink-0" />}

          {/* Month filter */}
          {tab !== "pending" && (
          <select
            value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-8 px-2 text-xs bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/6 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/30 cursor-pointer shrink-0"
          >
            <option value="">Mois</option>
            {["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"].map((m, i) => (
              <option key={i} value={String(i)}>{m}</option>
            ))}
          </select>
          )}

          {/* City filter */}
          {tab !== "pending" && (
          <select
            value={cityId} onChange={(e) => setCityId(e.target.value)}
            className="h-8 px-2 text-xs bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/6 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/30 cursor-pointer shrink-0"
          >
            <option value="">Toutes les communes</option>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          )}

          {/* Download Excel */}
          {tab !== "pending" && !loading && report && report.data.length > 0 && (
            <button
              onClick={downloadExcel}
              className="h-8 px-3 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
              Excel
            </button>
          )}
        </div>

        {/* ══════════════ Pending Fiches Tab ══════════════ */}
        {tab === "pending" && (
          <>
            {pendingLoading ? (
              <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 px-4 py-12 text-center">
                <div className="animate-pulse flex flex-col items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-white/10" />
                  <div className="w-28 h-2 rounded bg-gray-200 dark:bg-white/10" />
                </div>
              </div>
            ) : pendingFiches.length === 0 ? (
              <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 px-4 py-12 text-center">
                <svg className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                <p className="text-sm font-medium text-gray-500">Aucune fiche en attente</p>
                <p className="text-xs text-gray-400 mt-1">Les fiches soumises par les techniciens apparaîtront ici</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingFiches.map((fiche) => {
                  const pos = fiche.refrigerator.pos;
                  const date = new Date(fiche.interventionDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
                  const isActioning = actionLoading === fiche.id;
                  return (
                    <div key={fiche.id} className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 overflow-hidden">
                      {/* Fiche header */}
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-amber-50/50 dark:bg-amber-500/4">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400">
                            En attente
                          </span>
                          <span className="text-xs text-gray-500">{date}</span>
                        </div>
                        <span className="text-xs text-gray-400">par {fiche.technician.fullName}</span>
                      </div>

                      {/* Fiche data grid */}
                      <div className="px-4 py-3">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2.5">
                          <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">PDV / POS</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{pos.posName}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Adresse</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{pos.streetNo || "—"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Propriétaire</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{pos.owner || "—"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Téléphone</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{pos.phoneNumber || "—"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">ID Frigo</p>
                            <p className="text-sm font-mono text-gray-600 dark:text-gray-300 mt-0.5">{fiche.refrigerator.serialNumber}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Marque</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{fiche.refrigerator.brand || "—"}</p>
                          </div>
                        </div>
                        {fiche.workDone && (
                          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Travail effectué</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5 leading-relaxed">{fiche.workDone}</p>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="px-4 py-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleFicheAction(fiche.id, "reject")}
                          disabled={isActioning}
                          className="px-4 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                        >
                          Rejeter
                        </button>
                        <button
                          onClick={() => handleFicheAction(fiche.id, "approve")}
                          disabled={isActioning}
                          className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-colors"
                        >
                          {isActioning ? "..." : "Approuver"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ══════════════ Reports Content (repairs/maintenance tabs) ══════════════ */}
        {tab !== "pending" && <>
        {/* ── Summary Cards ── */}
        {!loading && report && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-px bg-gray-200 dark:bg-white/6 rounded-xl overflow-hidden">
            <SummaryCard label="Total" value={String(report.summary.total)} color={tab === "repairs" ? "text-red-500" : "text-emerald-500"} />
            <SummaryCard label="Frigos" value={String(report.summary.uniqueFridges)} color="text-blue-500" />
            <SummaryCard label="PDV" value={String(report.summary.uniquePOS)} color="text-gray-900 dark:text-white" />
            <SummaryCard label={tab === "repairs" ? "Coût Total" : "Coût"} value={report.summary.totalCost > 0 ? `${report.summary.totalCost.toLocaleString()} BIF` : "—"} color="text-orange-500" isBIF />
            <SummaryCard label="Flotte Totale" value={String(report.summary.totalFridgesInScope)} color="text-gray-900 dark:text-white" />
            <SummaryCard label={tab === "repairs" ? "Réparés" : "Entretenus"} value={String(report.summary.servicedCount)} color="text-emerald-500" />
            <SummaryCard label={tab === "repairs" ? "Non Réparés" : "Non Entretenus"} value={String(report.summary.nonServicedCount)} color={report.summary.nonServicedCount > 0 ? "text-red-500" : "text-emerald-500"} />
          </div>
        )}

        {/* ── Visual Insights ── */}
        {!loading && report && report.data.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Coverage Ring */}
            <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Couverture de la flotte</h3>
              <div className="flex items-center justify-around">
                <ProgressRing value={report.summary.servicedCount} max={report.summary.totalFridgesInScope} label={tab === "repairs" ? "Réparés" : "Entretenus"} color={tab === "repairs" ? "#ef4444" : "#10b981"} />
                <ProgressRing value={report.summary.nonServicedCount} max={report.summary.totalFridgesInScope} label={tab === "repairs" ? "Non Réparés" : "Non Entretenus"} color="#f59e0b" />
                <ProgressRing value={report.summary.uniquePOS} max={report.summary.total} label="PDV uniques" color="#3b82f6" />
              </div>
            </div>

            {/* Day-by-day mini bar chart */}
            <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Interventions par jour</h3>
              <DayBarChart dates={sortedDates} byDate={report.byDate} color={tab === "repairs" ? "#ef4444" : "#10b981"} />
            </div>
          </div>
        )}

        {/* ── Report Title Banner ── */}
        {!loading && report && report.data.length > 0 && (
          <div className={`rounded-xl overflow-hidden border ${tab === "repairs" ? "border-red-200 dark:border-red-500/20" : "border-emerald-200 dark:border-emerald-500/20"}`}>
            <div className={`px-5 py-4 text-center ${tab === "repairs" ? "bg-red-50 dark:bg-red-500/6" : "bg-emerald-50 dark:bg-emerald-500/6"}`}>
              <h2 className={`text-lg font-bold uppercase tracking-wide ${tab === "repairs" ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                {reportTitle} DU {dateRangeLabel.toUpperCase()}
              </h2>
            </div>
          </div>
        )}

        {/* ── Data ── */}
        {loading ? (
          <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 px-4 py-12 text-center">
            <div className="animate-pulse flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-white/10" />
              <div className="w-28 h-2 rounded bg-gray-200 dark:bg-white/10" />
            </div>
          </div>
        ) : !report || report.data.length === 0 ? (
          <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 px-4 py-12 text-center">
            <svg className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
            <p className="text-sm text-gray-500">Aucune {tab === "repairs" ? "réparation" : "entretien"} trouvée pour cette période</p>
          </div>
        ) : (
          /* ── Date-grouped report tables ── */
          sortedDates.map((dateKey) => {
            const entries = report.byDate[dateKey];
            const dayCost = entries.reduce((s, e) => s + e.costItems.reduce((cs, c) => cs + c.totalCost, 0), 0);
            const isRepairTab = tab === "repairs";

            return (
              <div key={dateKey} className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 overflow-hidden">
                {/* Date header */}
                <div className={`px-4 py-3 border-b border-gray-100 dark:border-white/5 flex items-center justify-between ${isRepairTab ? "bg-red-50/50 dark:bg-red-500/4" : "bg-emerald-50/50 dark:bg-emerald-500/4"}`}>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white capitalize">{fmtDateHead(dateKey)}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{entries.length} {isRepairTab ? "réparation" : "entretien"}{entries.length > 1 ? "s" : ""}</p>
                  </div>
                  <div className="text-right">
                    {dayCost > 0 && <span className="text-xs font-bold text-orange-500">{dayCost.toLocaleString()} BIF</span>}
                  </div>
                </div>

                {/* Table — Excel layout */}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-275">
                    <thead>
                      <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-white/4 bg-gray-50/50 dark:bg-white/2">
                        <th className="px-3 py-2 text-left w-10">N°</th>
                        <th className="px-3 py-2 text-left">Nom du PDV</th>
                        <th className="px-3 py-2 text-left">Canal</th>
                        <th className="px-3 py-2 text-left">Propriétaire</th>
                        <th className="px-3 py-2 text-left">N° TEL</th>
                        <th className="px-3 py-2 text-left">Commune</th>
                        <th className="px-3 py-2 text-left">Quartier</th>
                        <th className="px-3 py-2 text-left">N° d&apos;identification</th>
                        <th className="px-3 py-2 text-left">Avenue & N°</th>
                        <th className="px-3 py-2 text-left">Type Frigo</th>
                        <th className="px-3 py-2 text-left">Marque</th>
                        {isRepairTab && <th className="px-3 py-2 text-left">Objet de l&apos;intervention</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry, idx) => (
                        <tr key={entry.id} className="border-b border-gray-50 dark:border-white/4 hover:bg-gray-50 dark:hover:bg-white/2 transition-colors">
                          <td className="px-3 py-2.5 text-xs text-gray-400 font-mono">{idx + 1}</td>
                          <td className="px-3 py-2.5 text-xs font-medium text-gray-900 dark:text-white truncate max-w-40">{entry.refrigerator.pos.posName}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-500 truncate max-w-20">{entry.refrigerator.pos.channel || "—"}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-300 truncate max-w-28">{entry.refrigerator.pos.owner || "—"}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-500 font-mono truncate max-w-24">{entry.refrigerator.pos.phoneNumber || "—"}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-500 truncate max-w-24">{entry.refrigerator.pos.city.name}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-500 truncate max-w-24">{entry.refrigerator.pos.neighbourhood || "—"}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-500 font-mono truncate max-w-32">{entry.refrigerator.pos.idNumber || "—"}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-500 truncate max-w-28">{entry.refrigerator.pos.streetNo || "—"}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-500 truncate max-w-20">{entry.refrigerator.refrigeratorType || "—"}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-500 truncate max-w-20">{entry.refrigerator.brand || "—"}</td>
                          {isRepairTab && (
                            <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400 max-w-64">
                              <span className="line-clamp-2">{entry.workDone || entry.issueDescription || "—"}</span>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
        </>}
      </div>
    </div>
  );
}

/* ─── Shared Summary Card (Animated) ─── */
function SummaryCard({ label, value, color, isBIF }: { label: string; value: string; color: string; isBIF?: boolean }) {
  const numericVal = parseInt(value.replace(/[^0-9]/g, ""), 10);
  const isNumeric = !isNaN(numericVal) && value !== "—";
  const animated = useCountUp(isNumeric ? numericVal : 0);
  const display = isNumeric ? (isBIF ? `${animated.toLocaleString()} BIF` : String(animated)) : value;

  return (
    <div className="bg-white dark:bg-[#141414] px-4 py-3 group hover:bg-gray-50 dark:hover:bg-white/3 transition-all duration-200">
      <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{label}</div>
      <div className={`text-xl font-bold mt-0.5 ${color} transition-transform duration-200 group-hover:scale-105 origin-left`}>{display}</div>
    </div>
  );
}

/* ─── Progress Ring ─── */
function ProgressRing({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const animated = useCountUp(pct);
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animated / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-gray-100 dark:text-white/6" />
          <circle cx="40" cy="40" r={radius} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-gray-900 dark:text-white">{animated}%</span>
        </div>
      </div>
      <span className="text-[10px] text-gray-400 font-medium">{label}</span>
    </div>
  );
}
