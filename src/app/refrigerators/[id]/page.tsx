"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useAuth } from "@/components/auth-provider";
import { useParams } from "next/navigation";
import Link from "next/link";

/* ── Types ── */
interface CostItem {
  id: string;
  itemName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

interface AttachmentItem {
  id: string;
  fileName: string;
}

interface Intervention {
  id: string;
  type: "MAINTENANCE" | "REPAIR";
  status: string;
  interventionDate: string;
  issueDescription: string | null;
  workDone: string | null;
  notes: string | null;
  technician: { fullName: string };
  costItems: CostItem[];
  attachments: AttachmentItem[];
}

interface Fridge {
  id: string;
  serialNumber: string;
  brand: string | null;
  refrigeratorType: string | null;
  status: string;
  createdAt: string;
  pos: {
    posName: string;
    owner: string | null;
    neighbourhood: string | null;
    city: { id: string; name: string };
  };
  interventions: Intervention[];
}

interface FridgeData {
  fridge: Fridge;
  maintenanceCount: number;
  repairCount: number;
  totalCost: number;
}

/* ── Helpers ── */
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}
function fmtK(n: number) { return n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(Math.round(n)); }

/* ── Status config ── */
const statusCfg: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  ACTIVE: { label: "Active", dot: "bg-emerald-400", bg: "bg-emerald-400/10", text: "text-emerald-400" },
  INACTIVE: { label: "Inactive", dot: "bg-gray-400", bg: "bg-gray-400/10", text: "text-gray-400" },
  UNDER_REPAIR: { label: "Under Repair", dot: "bg-orange-400", bg: "bg-orange-400/10", text: "text-orange-400" },
};

const interventionStatusCfg: Record<string, { label: string; bg: string; text: string }> = {
  COMPLETED: { label: "Completed", bg: "bg-emerald-400/10", text: "text-emerald-400" },
  IN_PROGRESS: { label: "In Progress", bg: "bg-blue-400/10", text: "text-blue-400" },
  PENDING: { label: "Pending", bg: "bg-amber-400/10", text: "text-amber-400" },
  CANCELLED: { label: "Cancelled", bg: "bg-red-400/10", text: "text-red-400" },
};

/* ── SummaryMetric (dashboard style) ── */
function SummaryMetric({ title, value, sub, color }: {
  title: string; value: string; sub?: string; color?: "default" | "green" | "red" | "orange" | "blue";
}) {
  const accent: Record<string, string> = {
    default: "text-gray-900 dark:text-white",
    green: "text-emerald-600 dark:text-emerald-400",
    red: "text-red-500 dark:text-red-400",
    orange: "text-orange-500 dark:text-orange-400",
    blue: "text-blue-500 dark:text-blue-400",
  };
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">{title}</div>
      <div className={`text-xl font-bold tracking-tight ${accent[color || "default"]}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   TradingView-style Financial Chart
   ════════════════════════════════════════════════════════════════ */
interface ChartDataPoint {
  date: string; label: string; repair: number; maintenance: number; total: number; cumulative: number;
}

function FinancialChart({ interventions, loading }: { interventions: Intervention[]; loading: boolean }) {
  const [period, setPeriod] = useState<"1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "ALL">("1M");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const chartRef = useRef<SVGSVGElement>(null);

  /* Build data grouped by day */
  const dailyData = useMemo(() => {
    if (!interventions.length) return [];
    const map = new Map<string, { repair: number; maintenance: number }>();
    interventions.forEach((int) => {
      const d = new Date(int.interventionDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const cost = int.costItems.reduce((s, c) => s + c.totalCost, 0);
      const prev = map.get(key) || { repair: 0, maintenance: 0 };
      if (int.type === "REPAIR") prev.repair += cost; else prev.maintenance += cost;
      map.set(key, prev);
    });
    const entries = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let cum = 0;
    return entries.map(([k, v]) => {
      cum += v.repair + v.maintenance;
      const [y, m, d] = k.split("-");
      return { date: k, label: `${parseInt(d)} ${months[parseInt(m) - 1]} ${y.slice(2)}`, repair: v.repair, maintenance: v.maintenance, total: v.repair + v.maintenance, cumulative: cum };
    });
  }, [interventions]);

  /* Aggregate helper: group daily data into weekly or monthly buckets */
  const aggregate = useCallback((data: ChartDataPoint[], mode: "day" | "week" | "month"): ChartDataPoint[] => {
    if (mode === "day") return data;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const buckets = new Map<string, { repair: number; maintenance: number; label: string }>();
    data.forEach((d) => {
      let key: string, label: string;
      if (mode === "week") {
        const dt = new Date(d.date);
        const day = dt.getDay();
        const monday = new Date(dt);
        monday.setDate(dt.getDate() - ((day + 6) % 7));
        key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
        label = `${monday.getDate()} ${months[monday.getMonth()]} ${String(monday.getFullYear()).slice(2)}`;
      } else {
        const [y, m] = d.date.split("-");
        key = `${y}-${m}`;
        label = `${months[parseInt(m) - 1]} ${y.slice(2)}`;
      }
      const prev = buckets.get(key) || { repair: 0, maintenance: 0, label };
      prev.repair += d.repair;
      prev.maintenance += d.maintenance;
      buckets.set(key, prev);
    });
    const entries = [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    let cum = 0;
    return entries.map(([k, v]) => {
      cum += v.repair + v.maintenance;
      return { date: k, label: v.label, repair: v.repair, maintenance: v.maintenance, total: v.repair + v.maintenance, cumulative: cum };
    });
  }, []);

  const filtered = useMemo(() => {
    if (!dailyData.length) return [];
    const now = new Date();
    let cutoff: Date;
    let mode: "day" | "week" | "month";
    switch (period) {
      case "1D": cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30); mode = "day"; break;
      case "1W": cutoff = new Date(now.getFullYear(), now.getMonth() - 3, 1); mode = "week"; break;
      case "1M": cutoff = new Date(now.getFullYear(), now.getMonth() - 6, 1); mode = "month"; break;
      case "3M": cutoff = new Date(now.getFullYear(), now.getMonth() - 3, 1); mode = "month"; break;
      case "6M": cutoff = new Date(now.getFullYear(), now.getMonth() - 6, 1); mode = "month"; break;
      case "1Y": cutoff = new Date(now.getFullYear() - 1, now.getMonth(), 1); mode = "month"; break;
      case "ALL": default: return aggregate(dailyData, "month");
    }
    const cutKey = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;
    const sliced = dailyData.filter((d) => d.date >= cutKey);
    return aggregate(sliced, mode);
  }, [dailyData, period, aggregate]);

  const maxTotal = Math.max(...filtered.map((d) => d.total), 1);
  const maxCum = Math.max(...filtered.map((d) => d.cumulative), 1);
  const totalRepairCost = filtered.reduce((s, d) => s + d.repair, 0);
  const totalMaintCost = filtered.reduce((s, d) => s + d.maintenance, 0);
  const chartTotalCost = totalRepairCost + totalMaintCost;

  const W = 720, H = 220, PL = 0, PR = 60, PT = 10, PB = 28;
  const cw = W - PL - PR, ch = H - PT - PB;

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!chartRef.current || filtered.length < 2) return;
    const rect = chartRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.round(((x - PL) / cw) * (filtered.length - 1));
    setHoveredIdx(Math.max(0, Math.min(filtered.length - 1, idx)));
  }, [filtered.length, cw]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-40 rounded bg-gray-200 dark:bg-white/10" />
          <div className="h-48 rounded bg-gray-100 dark:bg-white/5" />
        </div>
      </div>
    );
  }

  const hovered = hoveredIdx !== null ? filtered[hoveredIdx] : null;

  return (
    <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 overflow-hidden">
      {/* Chart Header */}
      <div className="px-5 pt-4 pb-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Financial Report</h3>
            <span className="text-xs font-mono text-gray-400 bg-gray-100 dark:bg-white/6 px-1.5 py-0.5 rounded">BIF</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{fmtCurrency(hovered?.cumulative ?? chartTotalCost)}</span>
            {hovered ? (
              <span className="text-xs text-gray-400">{hovered.label} &middot; Period: {fmtCurrency(hovered.total)}</span>
            ) : (
              <span className={`text-xs font-semibold ${chartTotalCost > 0 ? "text-red-400" : "text-gray-400"}`}>
                {chartTotalCost > 0 ? `▲ ${fmtCurrency(chartTotalCost)} total spend` : "No data"}
              </span>
            )}
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-red-500" />
              <span className="text-xs text-gray-500">Repair <span className="font-semibold text-gray-700 dark:text-gray-300">{fmtCurrency(hovered?.repair ?? totalRepairCost)}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              <span className="text-xs text-gray-500">Maintenance <span className="font-semibold text-gray-700 dark:text-gray-300">{fmtCurrency(hovered?.maintenance ?? totalMaintCost)}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-0.5 bg-blue-400 rounded" />
              <span className="text-xs text-gray-500">Cumulative</span>
            </div>
          </div>
        </div>
        {/* Period selector */}
        <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-white/6 rounded-lg p-0.5">
          {(["1D", "1W", "1M", "3M", "6M", "1Y", "ALL"] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${period === p ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
            >{p}</button>
          ))}
        </div>
      </div>

      {/* SVG Chart */}
      <div className="px-3 pb-3">
        {filtered.length < 2 ? (
          <div className="h-56 flex items-center justify-center text-xs text-gray-400">
            {filtered.length === 1 ? "Need at least 2 data points for chart" : "No cost data for this period"}
          </div>
        ) : (
          <svg ref={chartRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-56 cursor-crosshair" onMouseMove={handleMouseMove} onMouseLeave={() => setHoveredIdx(null)}>
            <defs>
              <linearGradient id="fridgeCumGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="fridgeRepairGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id="fridgeMaintGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.4" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
              const y = PT + ch * (1 - pct);
              return (
                <g key={pct}>
                  <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="currentColor" className="text-gray-100 dark:text-white/6" strokeWidth={0.5} strokeDasharray={pct > 0 && pct < 1 ? "3,3" : "0"} />
                  <text x={W - PR + 6} y={y + 3} className="text-[12px] fill-gray-400 dark:fill-gray-500 font-mono">{fmtK(maxCum * pct)}</text>
                </g>
              );
            })}

            {/* Cumulative area fill */}
            <path d={
              `M ${PL},${PT + ch} ` +
              filtered.map((d, i) => {
                const x = PL + (i / (filtered.length - 1)) * cw;
                const y = PT + ch * (1 - d.cumulative / maxCum);
                return `L ${x},${y}`;
              }).join(" ") +
              ` L ${PL + cw},${PT + ch} Z`
            } fill="url(#fridgeCumGrad)" />

            {/* Cumulative line */}
            <path d={
              filtered.map((d, i) => {
                const x = PL + (i / (filtered.length - 1)) * cw;
                const y = PT + ch * (1 - d.cumulative / maxCum);
                return `${i === 0 ? "M" : "L"} ${x},${y}`;
              }).join(" ")
            } fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinejoin="round" />

            {/* Volume bars (stacked repair + maintenance) */}
            {filtered.map((d, i) => {
              const x = PL + (i / (filtered.length - 1)) * cw;
              const barW = Math.max(cw / filtered.length * 0.55, 4);
              const repH = (d.repair / maxTotal) * (ch * 0.35);
              const maintH = (d.maintenance / maxTotal) * (ch * 0.35);
              const baseY = PT + ch;
              return (
                <g key={i}>
                  {d.repair > 0 && (
                    <rect x={x - barW / 2} y={baseY - repH - maintH} width={barW} height={repH} rx={1} fill="url(#fridgeRepairGrad)" opacity={hoveredIdx === i ? 1 : 0.7} />
                  )}
                  {d.maintenance > 0 && (
                    <rect x={x - barW / 2} y={baseY - maintH} width={barW} height={maintH} rx={1} fill="url(#fridgeMaintGrad)" opacity={hoveredIdx === i ? 1 : 0.7} />
                  )}
                </g>
              );
            })}

            {/* Data point dots on cumulative line */}
            {filtered.map((d, i) => {
              const x = PL + (i / (filtered.length - 1)) * cw;
              const y = PT + ch * (1 - d.cumulative / maxCum);
              return (
                <circle key={i} cx={x} cy={y} r={hoveredIdx === i ? 4 : 2} fill="#3b82f6" stroke="white" strokeWidth={hoveredIdx === i ? 2 : 0} className="dark:stroke-[#141414]" />
              );
            })}

            {/* X-axis labels */}
            {filtered.map((d, i) => {
              const x = PL + (i / (filtered.length - 1)) * cw;
              const show = filtered.length <= 12 || i % Math.ceil(filtered.length / 10) === 0 || i === filtered.length - 1;
              return show ? (
                <text key={i} x={x} y={H - 4} textAnchor="middle" className="text-[12px] fill-gray-400 dark:fill-gray-500 font-mono">{d.label}</text>
              ) : null;
            })}

            {/* Crosshair */}
            {hoveredIdx !== null && (
              <>
                <line
                  x1={PL + (hoveredIdx / (filtered.length - 1)) * cw}
                  y1={PT}
                  x2={PL + (hoveredIdx / (filtered.length - 1)) * cw}
                  y2={PT + ch}
                  stroke="currentColor" className="text-gray-300 dark:text-gray-600" strokeWidth={0.5} strokeDasharray="3,2"
                />
                <line
                  x1={PL}
                  y1={PT + ch * (1 - filtered[hoveredIdx].cumulative / maxCum)}
                  x2={W - PR}
                  y2={PT + ch * (1 - filtered[hoveredIdx].cumulative / maxCum)}
                  stroke="#3b82f6" strokeWidth={0.5} strokeDasharray="3,2" opacity={0.5}
                />
                {/* Price tag on right axis */}
                <rect
                  x={W - PR + 1}
                  y={PT + ch * (1 - filtered[hoveredIdx].cumulative / maxCum) - 8}
                  width={PR - 4} height={16} rx={3} fill="#3b82f6"
                />
                <text
                  x={W - PR + PR / 2 - 1}
                  y={PT + ch * (1 - filtered[hoveredIdx].cumulative / maxCum) + 3}
                  textAnchor="middle" className="text-xs fill-white font-mono font-bold"
                >{fmtK(filtered[hoveredIdx].cumulative)}</text>
              </>
            )}
          </svg>
        )}
      </div>
    </div>
  );
}

/* ── Generate Intelligent Report from data ── */
function generateReport(fridge: Fridge, maintenanceCount: number, repairCount: number, totalCost: number): string[] {
  const paragraphs: string[] = [];
  const totalInterventions = fridge.interventions.length;
  const status = fridge.status;

  // Health overview
  if (status === "ACTIVE" && repairCount === 0) {
    paragraphs.push(`This unit is in excellent condition with ${maintenanceCount} scheduled maintenance visit${maintenanceCount !== 1 ? "s" : ""} and no repairs on record. The fridge is performing within expected parameters.`);
  } else if (status === "ACTIVE" && repairCount > 0) {
    paragraphs.push(`This unit is currently operational with ${totalInterventions} total intervention${totalInterventions !== 1 ? "s" : ""} on record (${maintenanceCount} maintenance, ${repairCount} repair${repairCount !== 1 ? "s" : ""}). While the unit is active, the repair history warrants attention.`);
  } else if (status === "UNDER_REPAIR") {
    paragraphs.push(`This unit is currently under repair. It has accumulated ${totalInterventions} intervention${totalInterventions !== 1 ? "s" : ""} (${maintenanceCount} maintenance, ${repairCount} repair${repairCount !== 1 ? "s" : ""}). Immediate attention is required to restore operational status.`);
  } else {
    paragraphs.push(`This unit is currently inactive with ${totalInterventions} intervention${totalInterventions !== 1 ? "s" : ""} on record. A thorough inspection is recommended before reactivation.`);
  }

  // Cost analysis
  if (totalCost > 0) {
    const maintenanceCost = fridge.interventions
      .filter((i) => i.type === "MAINTENANCE")
      .reduce((sum, i) => sum + i.costItems.reduce((s, c) => s + c.totalCost, 0), 0);
    const repairCost = fridge.interventions
      .filter((i) => i.type === "REPAIR")
      .reduce((sum, i) => sum + i.costItems.reduce((s, c) => s + c.totalCost, 0), 0);

    if (repairCost > maintenanceCost && maintenanceCost > 0) {
      paragraphs.push(`Cost analysis indicates repair expenses (${fmtCurrency(repairCost)} BIF) exceed routine maintenance costs (${fmtCurrency(maintenanceCost)} BIF). Consider evaluating the unit's long-term viability or increasing preventive maintenance frequency.`);
    } else if (maintenanceCost > 0) {
      paragraphs.push(`Total investment of ${fmtCurrency(totalCost)} BIF is distributed with ${fmtCurrency(maintenanceCost)} BIF in maintenance and ${fmtCurrency(repairCost)} BIF in repairs. The maintenance-to-repair ratio suggests appropriate preventive care.`);
    } else {
      paragraphs.push(`Total expenditure on this unit stands at ${fmtCurrency(totalCost)} BIF. All costs are repair-related — implementing a regular maintenance schedule could help reduce future repair expenses.`);
    }
  } else {
    paragraphs.push("No cost data has been recorded for this unit. Ensure cost tracking is enabled for all future interventions to enable accurate financial analysis.");
  }

  // Frequency analysis
  if (fridge.interventions.length >= 2) {
    const dates = fridge.interventions.map((i) => new Date(i.interventionDate).getTime()).sort((a, b) => a - b);
    const intervals = dates.slice(1).map((d, i) => d - dates[i]);
    const avgDays = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length / (1000 * 60 * 60 * 24));
    paragraphs.push(`Average interval between interventions is ${avgDays} day${avgDays !== 1 ? "s" : ""}. ${avgDays < 30 ? "This high frequency may indicate underlying issues requiring a comprehensive diagnostic." : avgDays < 90 ? "This frequency is within normal operational range." : "The extended interval between visits suggests stable operation."}`);
  }

  if (paragraphs.length === 0) {
    paragraphs.push("Insufficient data to generate a comprehensive report. More intervention records are needed.");
  }

  return paragraphs;
}

/* ════════════════════════════ Main Page ════════════════════════════ */
export default function RefrigeratorDetailPage() {
  useAuth();
  const params = useParams();
  const [data, setData] = useState<FridgeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "maintenance" | "repair">("all");

  useEffect(() => {
    fetch(`/api/refrigerators/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  /* Computed values */
  const computed = useMemo(() => {
    if (!data) return null;
    const { fridge, maintenanceCount, repairCount, totalCost } = data;

    const maintenanceCost = fridge.interventions
      .filter((i) => i.type === "MAINTENANCE")
      .reduce((sum, i) => sum + i.costItems.reduce((s, c) => s + c.totalCost, 0), 0);
    const repairCost = fridge.interventions
      .filter((i) => i.type === "REPAIR")
      .reduce((sum, i) => sum + i.costItems.reduce((s, c) => s + c.totalCost, 0), 0);

    const report = generateReport(fridge, maintenanceCount, repairCount, totalCost);

    return { maintenanceCost, repairCost, report };
  }, [data]);

  /* Filtered interventions */
  const filteredInterventions = useMemo(() => {
    if (!data) return [];
    if (activeTab === "maintenance") return data.fridge.interventions.filter((i) => i.type === "MAINTENANCE");
    if (activeTab === "repair") return data.fridge.interventions.filter((i) => i.type === "REPAIR");
    return data.fridge.interventions;
  }, [data, activeTab]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-white/10" />
          <div className="w-32 h-2 rounded bg-gray-200 dark:bg-white/10" />
        </div>
      </div>
    );
  }

  /* ── Not found ── */
  if (!data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <p className="text-gray-500">Refrigerator not found</p>
        <Link href="/communes" className="text-sm text-blue-500 hover:underline">&larr; Back to Communes</Link>
      </div>
    );
  }

  const { fridge, maintenanceCount, repairCount, totalCost } = data;
  const st = statusCfg[fridge.status] || statusCfg.ACTIVE;
  const cityId = fridge.pos.city.id;
  const completedCount = fridge.interventions.filter((i) => i.status === "COMPLETED").length;
  const pendingCount = fridge.interventions.filter((i) => i.status === "PENDING" || i.status === "IN_PROGRESS").length;

  const tabItems: { key: "all" | "maintenance" | "repair"; label: string; count: number }[] = [
    { key: "all", label: "All", count: fridge.interventions.length },
    { key: "maintenance", label: "Maintenance", count: maintenanceCount },
    { key: "repair", label: "Repairs", count: repairCount },
  ];

  /* Health score (0–100) */
  const healthScore = (() => {
    let score = 100;
    if (fridge.status === "UNDER_REPAIR") score -= 30;
    if (fridge.status === "INACTIVE") score -= 50;
    score -= Math.min(repairCount * 8, 40);
    if (repairCount > maintenanceCount && maintenanceCount > 0) score -= 10;
    return Math.max(0, Math.min(100, score));
  })();
  const healthColor = healthScore >= 70 ? "emerald" : healthScore >= 40 ? "orange" : "red";
  const healthLabel = healthScore >= 70 ? "Good" : healthScore >= 40 ? "Fair" : "Critical";

  /* Average days between interventions */
  const avgInterval = (() => {
    if (fridge.interventions.length < 2) return null;
    const dates = fridge.interventions.map((i) => new Date(i.interventionDate).getTime()).sort((a, b) => a - b);
    const intervals = dates.slice(1).map((d, i) => d - dates[i]);
    return Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length / (1000 * 60 * 60 * 24));
  })();

  /* Last intervention */
  const lastIntervention = fridge.interventions.length > 0
    ? fridge.interventions.reduce((a, b) => new Date(a.interventionDate) > new Date(b.interventionDate) ? a : b)
    : null;

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ════ Header ════ */}
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/communes/${cityId}`} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/6 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          </Link>
          <div className="min-w-0 mr-auto">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white font-mono truncate">{fridge.serialNumber}</h1>
            <p className="text-xs text-gray-400 truncate">{fridge.pos.posName} · {fridge.pos.city.name}{fridge.pos.neighbourhood ? ` · ${fridge.pos.neighbourhood}` : ""}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${st.bg} ${st.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
            {st.label}
          </span>
        </div>

        {/* ════ KPI Strip ════ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-px bg-gray-200 dark:bg-white/6 rounded-xl overflow-hidden">
          <div className="bg-white dark:bg-[#141414] px-4 py-3">
            <SummaryMetric title="Interventions" value={String(fridge.interventions.length)} sub={`${completedCount} done · ${pendingCount} pending`} />
          </div>
          <div className="bg-white dark:bg-[#141414] px-4 py-3">
            <SummaryMetric title="Services" value={String(maintenanceCount)} sub={`${fmtCurrency(computed?.maintenanceCost ?? 0)} BIF`} color="green" />
          </div>
          <div className="bg-white dark:bg-[#141414] px-4 py-3">
            <SummaryMetric title="Repairs" value={String(repairCount)} sub={`${fmtCurrency(computed?.repairCost ?? 0)} BIF`} color={repairCount > 0 ? "orange" : "default"} />
          </div>
          <div className="bg-white dark:bg-[#141414] px-4 py-3">
            <SummaryMetric title="Total Cost" value={`${fmtCurrency(totalCost)}`} sub="BIF" color={totalCost > 0 ? "red" : "default"} />
          </div>
          <div className="bg-white dark:bg-[#141414] px-4 py-3">
            <SummaryMetric title="Avg Interval" value={avgInterval ? `${avgInterval}d` : "—"} sub={avgInterval ? (avgInterval < 30 ? "High frequency" : avgInterval < 90 ? "Normal" : "Stable") : "N/A"} />
          </div>
          <div className="bg-white dark:bg-[#141414] px-4 py-3">
            <SummaryMetric title="Last Visit" value={lastIntervention ? fmtDate(lastIntervention.interventionDate) : "—"} sub={lastIntervention ? (lastIntervention.type === "REPAIR" ? "Repair" : "Service") : ""} />
          </div>
          <div className="bg-white dark:bg-[#141414] px-4 py-3">
            <div className="flex flex-col gap-0.5">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Health</div>
              <div className="flex items-center gap-2">
                <div className={`text-xl font-bold text-${healthColor}-500`}>{healthScore}</div>
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded bg-${healthColor}-50 dark:bg-${healthColor}-500/10 text-${healthColor}-600 dark:text-${healthColor}-400`}>{healthLabel}</span>
              </div>
              <div className="h-1 rounded-full bg-gray-100 dark:bg-white/8 overflow-hidden mt-0.5">
                <div className={`h-full rounded-full bg-${healthColor}-500 transition-all`} style={{ width: `${healthScore}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* ════ Financial Chart ════ */}
        <FinancialChart interventions={fridge.interventions} loading={loading} />

        {/* ════ Two-column: Details + Timeline ════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* Left: Unit Info + AI Report */}
          <div className="lg:col-span-4 space-y-5">

            {/* Unit Details */}
            <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Unit Information</span>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-white/4">
                {([
                  ["Serial Number", fridge.serialNumber, true],
                  ["Brand", fridge.brand || "—", false],
                  ["Type", fridge.refrigeratorType || "—", false],
                  ["POS", fridge.pos.posName, false],
                  ["Owner", fridge.pos.owner || "—", false],
                  ["City", fridge.pos.city.name, false],
                  ["Neighbourhood", fridge.pos.neighbourhood || "—", false],
                  ["Registered", fmtDate(fridge.createdAt), false],
                ] as [string, string, boolean][]).map(([label, value, mono]) => (
                  <div key={label} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs text-gray-400">{label}</span>
                    <span className={`text-xs font-medium text-gray-900 dark:text-white ${mono ? "font-mono" : ""}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cost Breakdown */}
            {totalCost > 0 && (
              <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cost Breakdown</span>
                </div>
                <div className="px-4 py-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-400" />
                      <span className="text-xs text-gray-500">Repairs</span>
                    </div>
                    <span className="text-xs font-semibold text-red-500">{fmtCurrency(computed?.repairCost ?? 0)} BIF</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-xs text-gray-500">Maintenance</span>
                    </div>
                    <span className="text-xs font-semibold text-emerald-500">{fmtCurrency(computed?.maintenanceCost ?? 0)} BIF</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/8 overflow-hidden flex">
                    <div className="bg-red-400" style={{ width: `${((computed?.repairCost ?? 0) / totalCost) * 100}%` }} />
                    <div className="bg-emerald-400" style={{ width: `${((computed?.maintenanceCost ?? 0) / totalCost) * 100}%` }} />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-white/4">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Total</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{fmtCurrency(totalCost)} BIF</span>
                  </div>
                </div>
              </div>
            )}

            {/* AI Report */}
            <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5 flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" /></svg>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Analysis</span>
                <span className="text-xs font-medium text-purple-500 bg-purple-50 dark:bg-purple-500/10 px-1.5 py-0.5 rounded ml-auto">AI</span>
              </div>
              <div className="px-4 py-3 space-y-2.5">
                {computed?.report.map((paragraph, i) => (
                  <p key={i} className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{paragraph}</p>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Timeline */}
          <div className="lg:col-span-8">
            <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 overflow-hidden">
              {/* Timeline header + tabs */}
              <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Intervention Timeline</span>
                <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-white/6 rounded-lg p-0.5">
                  {tabItems.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setActiveTab(t.key)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                        activeTab === t.key
                          ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm"
                          : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      }`}
                    >
                      {t.label} <span className="font-normal text-gray-400">{t.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Timeline body */}
              <div className="max-h-170 overflow-y-auto">
                {filteredInterventions.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/6 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-5 h-5 text-gray-300 dark:text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                    </div>
                    <p className="text-sm text-gray-400">No {activeTab === "all" ? "" : activeTab} interventions recorded</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 dark:divide-white/4">
                    {filteredInterventions.map((intervention) => {
                      const isMaint = intervention.type === "MAINTENANCE";
                      const intSt = interventionStatusCfg[intervention.status] || interventionStatusCfg.PENDING;
                      const intCost = intervention.costItems.reduce((s, c) => s + c.totalCost, 0);

                      return (
                        <div key={intervention.id} className="px-4 py-3.5 hover:bg-gray-50/50 dark:hover:bg-white/2 transition-colors">
                          {/* Row 1: type + status + cost + date */}
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isMaint ? "bg-emerald-400" : "bg-red-400"}`} />
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${isMaint ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-50 dark:bg-red-500/10 text-red-500"}`}>
                              {isMaint ? "MAINTENANCE" : "REPAIR"}
                            </span>
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${intSt.bg} ${intSt.text}`}>{intSt.label}</span>
                            <span className="ml-auto text-xs text-gray-400 font-mono">{fmtDate(intervention.interventionDate)}</span>
                            {intCost > 0 && <span className="text-xs font-bold text-gray-900 dark:text-white">{fmtCurrency(intCost)} BIF</span>}
                          </div>

                          {/* Description */}
                          {intervention.issueDescription && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 leading-relaxed"><span className="font-medium text-gray-700 dark:text-gray-300">Issue: </span>{intervention.issueDescription}</p>
                          )}
                          {intervention.workDone && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 leading-relaxed"><span className="font-medium text-gray-700 dark:text-gray-300">Work: </span>{intervention.workDone}</p>
                          )}
                          {intervention.notes && (
                            <p className="text-xs text-gray-400 italic mb-1">{intervention.notes}</p>
                          )}

                          {/* Footer: technician + cost items + attachments */}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                              <span className="font-medium text-gray-500 dark:text-gray-300">{intervention.technician.fullName}</span>
                            </span>
                            {intervention.costItems.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1 ml-auto">
                                {intervention.costItems.map((ci) => (
                                  <span key={ci.id} className="text-xs bg-gray-100 dark:bg-white/6 text-gray-500 px-1.5 py-0.5 rounded">{ci.itemName} ×{ci.quantity}</span>
                                ))}
                              </div>
                            )}
                            {intervention.attachments.length > 0 && (
                              <div className="flex items-center gap-1">
                                {intervention.attachments.map((a) => (
                                  <span key={a.id} className="inline-flex items-center gap-0.5 text-xs text-gray-400 bg-gray-50 dark:bg-white/4 px-1.5 py-0.5 rounded">
                                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" /></svg>
                                    {a.fileName}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
