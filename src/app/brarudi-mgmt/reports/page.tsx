"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/components/auth-provider";
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

/* ═══════════════════════════════════════════════════════════════ */
export default function BrarudiMgmtReportsPage() {
  useAuth();
  const [tab, setTab] = useState<"repairs" | "maintenance">("repairs");
  const [period, setPeriod] = useState<"day" | "week" | "month" | "custom">("day");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [cityId, setCityId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportResponse | null>(null);

  useEffect(() => {
    fetch("/api/lookups")
      .then((res) => res.json())
      .then((data) => setCities(data.cities || []))
      .catch(console.error);
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("tab", tab);
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

    const colCount = isRepair ? 14 : 13;
    const titleRow: (string | null)[] = Array(colCount).fill(null);
    if (isRepair) {
      titleRow[6] = "                       " + title;
    } else {
      titleRow[0] = "                                                                                 " + title;
    }

    const headers = ["Date", "N°", "Nom du PDV", "Canal", "Propriétaire", "N° TEL", "Province", "Commune", "Colline/Quartier", "N° d'identification", "Avenue & N°", "Type Frigo", "Marque"];
    if (isRepair) headers.push("objet de l'intervention");

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

    const aoa = [titleRow, headers, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true });

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

    ws["!rows"] = [{ hpx: 21 }, { hpx: 18.75 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${sheetName} DU ${titleDate}.xlsx`);
  }, [report, tab, sortedDates]);

  return (
    <div className="px-4 sm:px-6 py-6 space-y-5">

      {/* ── Header: Tabs + Period + City filter ── */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-bold text-gray-900 dark:text-white shrink-0">Rapports</h1>

        <div className="w-px h-6 bg-gray-200 dark:bg-white/8 shrink-0" />

        {/* Tabs: Réparations / Entretiens */}
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
        </div>

        <div className="w-px h-6 bg-gray-200 dark:bg-white/8 shrink-0" />

        {/* Period filter */}
        <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-white/6 rounded-lg p-0.5 h-8 shrink-0">
          {([["day", "Aujourd\u2019hui"], ["week", "Semaine"], ["custom", "Personnalisé"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => { setPeriod(key as typeof period); setSelectedMonth(""); }}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap ${selectedMonth === "" && period === key ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
            >{label}</button>
          ))}
        </div>

        {/* Custom date inputs */}
        {period === "custom" && selectedMonth === "" && (
          <>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 px-2 text-xs bg-gray-50 dark:bg-white/4 border border-gray-200 dark:border-white/6 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-orange-500/30" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="h-8 px-2 text-xs bg-gray-50 dark:bg-white/4 border border-gray-200 dark:border-white/6 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-orange-500/30" />
          </>
        )}

        <div className="w-px h-6 bg-gray-200 dark:bg-white/8 shrink-0" />

        {/* Month filter */}
        <select
          value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
          className="h-8 px-2 text-xs bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/6 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-orange-500/30 cursor-pointer shrink-0"
        >
          <option value="">Mois</option>
          {["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"].map((m, i) => (
            <option key={i} value={String(i)}>{m}</option>
          ))}
        </select>

        {/* City filter */}
        <select
          value={cityId} onChange={(e) => setCityId(e.target.value)}
          className="h-8 px-2 text-xs bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/6 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-orange-500/30 cursor-pointer shrink-0"
        >
          <option value="">Toutes les communes</option>
          {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {/* Download Excel */}
        {!loading && report && report.data.length > 0 && (
          <button
            onClick={downloadExcel}
            className="h-8 px-3 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            Excel
          </button>
        )}
      </div>

      {/* ── Summary Cards ── */}
      {!loading && report && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-px bg-gray-200 dark:bg-white/6 rounded-xl overflow-hidden">
          <SummaryCard label="Total" value={String(report.summary.total)} color={tab === "repairs" ? "text-red-500" : "text-emerald-500"} />
          <SummaryCard label="Frigos" value={String(report.summary.uniqueFridges)} color="text-blue-500" />
          <SummaryCard label="PDV" value={String(report.summary.uniquePOS)} color="text-gray-900 dark:text-white" />
          <SummaryCard label={tab === "repairs" ? "Coût Total" : "Coût"} value={report.summary.totalCost > 0 ? `${report.summary.totalCost.toLocaleString()} BIF` : "—"} color="text-orange-500" />
          <SummaryCard label="Flotte Totale" value={String(report.summary.totalFridgesInScope)} color="text-gray-900 dark:text-white" />
          <SummaryCard label={tab === "repairs" ? "Réparés" : "Entretenus"} value={String(report.summary.servicedCount)} color="text-emerald-500" />
          <SummaryCard label={tab === "repairs" ? "Non Réparés" : "Non Entretenus"} value={String(report.summary.nonServicedCount)} color={report.summary.nonServicedCount > 0 ? "text-red-500" : "text-emerald-500"} />
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

              {/* Table */}
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
    </div>
  );
}

/* ─── Shared Summary Card ─── */
function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white dark:bg-[#141414] px-4 py-3">
      <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</div>
      <div className={`text-xl font-bold mt-0.5 ${color}`}>{value}</div>
    </div>
  );
}
