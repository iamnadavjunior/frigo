"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useAuth } from "@/components/auth-provider";
import { useParams } from "next/navigation";
import Link from "next/link";

/* ── Types ── */
interface CostItem { id: string; itemName: string; quantity: number; unitCost: number; totalCost: number; }
interface AttachmentItem { id: string; fileName: string; }
interface Intervention {
  id: string; type: "MAINTENANCE" | "REPAIR"; status: string; interventionDate: string;
  issueDescription: string | null; workDone: string | null; notes: string | null;
  technician: { fullName: string }; costItems: CostItem[]; attachments: AttachmentItem[];
}
interface FridgeDetail {
  id: string; serialNumber: string; brand: string | null; refrigeratorType: string | null;
  status: string; createdAt: string;
  pos: { posName: string; owner: string | null; neighbourhood: string | null; city: { id: string; name: string } };
  interventions: Intervention[];
}
interface FridgeDetailData { fridge: FridgeDetail; maintenanceCount: number; repairCount: number; totalCost: number; }
interface FridgeIntervention { id: string; type: "MAINTENANCE" | "REPAIR"; status: string; interventionDate: string; }
interface CommuneFridge {
  id: string; serialNumber: string; brand: string | null; refrigeratorType: string | null;
  status: string; posName: string; posId: string; channel: string | null; owner: string | null;
  phoneNumber: string | null; neighbourhood: string | null; idNumber: string | null; streetNo: string | null;
  maintenanceCount: number; repairCount: number; isServiced: boolean; isRepaired: boolean;
  interventions: FridgeIntervention[];
}
interface CommuneStats { totalFridges: number; servicedFridges: number; nonServicedFridges: number; repairedFridges: number; nonRepairedFridges: number; }
interface CommuneData { city: { id: string; name: string }; stats: CommuneStats; fridges: CommuneFridge[]; }

/* ── Helpers ── */
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
function fmtCurrency(n: number) { return new Intl.NumberFormat("en-US").format(Math.round(n)); }
function fmtK(n: number) { return n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(Math.round(n)); }

/* ── Icons ── */
function IcnSnowflake({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93 4.93 19.07" /></svg>;
}
function IcnWrench({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.049.58.025 1.194-.14 1.743" /></svg>;
}
function IcnCheck({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
}
function IcnWarning({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>;
}

/* ── useCountUp hook ── */
function useCountUp(target: number, duration = 1200) {
  const countRef = useRef<HTMLSpanElement>(null);
  const prevRef = useRef(0);
  useEffect(() => {
    const el = countRef.current;
    if (!el) return;
    const from = prevRef.current;
    prevRef.current = target;
    if (from === target) { el.textContent = String(target); return; }
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      el.textContent = String(Math.round(from + (target - from) * ease));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return countRef;
}

/* ── SummaryMetric (dashboard style) ── */
function SummaryMetric({ title, value, trendLabel, trendColor, onClick, active }: {
  icon?: React.ReactNode; title: string; value: string; trendLabel: string; trendValue?: string; trendColor?: "green" | "red" | "orange";
  onClick?: () => void; active?: boolean;
}) {
  const num = parseInt(value.replace(/[^0-9]/g, ""), 10);
  const animRef = useCountUp(isNaN(num) ? 0 : num);
  const valueColors = { green: "text-emerald-500", red: "text-red-500", orange: "text-orange-500" };
  const tc = trendColor || "green";
  return (
    <div onClick={onClick} className={`${onClick ? "cursor-pointer" : ""} transition-all`}>
      <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">{title}</div>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span ref={animRef} className={`text-xl font-bold ${active ? valueColors[tc] : "text-gray-900 dark:text-white"}`}>{value}</span>
      </div>
      <div className="text-xs text-gray-400 mt-0.5">{trendLabel}</div>
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
  const totalCost = totalRepairCost + totalMaintCost;

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
            <span className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{fmtCurrency(hovered?.cumulative ?? totalCost)}</span>
            {hovered ? (
              <span className="text-xs text-gray-400">{hovered.label} &middot; Period: {fmtCurrency(hovered.total)}</span>
            ) : (
              <span className={`text-xs font-semibold ${totalCost > 0 ? "text-red-400" : "text-gray-400"}`}>
                {totalCost > 0 ? `▲ ${fmtCurrency(totalCost)} total spend` : "No data"}
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
            {filtered.length === 1 ? "Need at least 2 months of data for chart" : "No cost data for this period"}
          </div>
        ) : (
          <svg ref={chartRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-56 cursor-crosshair" onMouseMove={handleMouseMove} onMouseLeave={() => setHoveredIdx(null)}>
            <defs>
              <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="repairGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id="maintGrad" x1="0" y1="0" x2="0" y2="1">
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
            } fill="url(#cumGrad)" />

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
                    <rect x={x - barW / 2} y={baseY - repH - maintH} width={barW} height={repH} rx={1} fill="url(#repairGrad)" opacity={hoveredIdx === i ? 1 : 0.7} />
                  )}
                  {d.maintenance > 0 && (
                    <rect x={x - barW / 2} y={baseY - maintH} width={barW} height={maintH} rx={1} fill="url(#maintGrad)" opacity={hoveredIdx === i ? 1 : 0.7} />
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

const statusCfg: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  ACTIVE: { label: "Active", dot: "bg-emerald-400", bg: "bg-emerald-400/10", text: "text-emerald-400" },
  INACTIVE: { label: "Inactive", dot: "bg-gray-400", bg: "bg-gray-400/10", text: "text-gray-400" },
  UNDER_REPAIR: { label: "Repair", dot: "bg-orange-400", bg: "bg-orange-400/10", text: "text-orange-400" },
  COMPLETED: { label: "Done", dot: "bg-emerald-400", bg: "bg-emerald-400/10", text: "text-emerald-400" },
  IN_PROGRESS: { label: "In Progress", dot: "bg-blue-400", bg: "bg-blue-400/10", text: "text-blue-400" },
  PENDING: { label: "Pending", dot: "bg-amber-400", bg: "bg-amber-400/10", text: "text-amber-400" },
  CANCELLED: { label: "Cancelled", dot: "bg-red-400", bg: "bg-red-400/10", text: "text-red-400" },
};

function StatusBadge({ status }: { status: string }) {
  const st = statusCfg[status] || statusCfg.ACTIVE;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
      {st.label}
    </span>
  );
}

const PAGE_SIZE = 20;

/* ════════════════════════════════════════════════════════════════
   Reparation Panel — All REPAIR interventions for a fridge
   ════════════════════════════════════════════════════════════════ */
function ReparationPanel({ fridge, interventions, loading }: { fridge: FridgeDetail | null; interventions: Intervention[]; loading: boolean }) {
  const repairs = useMemo(() => interventions.filter((i) => i.type === "REPAIR"), [interventions]);
  const totalRepairCost = useMemo(() => repairs.reduce((sum, r) => sum + r.costItems.reduce((s, c) => s + c.totalCost, 0), 0), [repairs]);
  const completedRepairs = repairs.filter((r) => r.status === "COMPLETED").length;
  const pendingRepairs = repairs.filter((r) => r.status === "PENDING" || r.status === "IN_PROGRESS").length;

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-32 rounded bg-gray-200 dark:bg-white/10" />
          <div className="h-20 rounded bg-gray-100 dark:bg-white/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 overflow-hidden">
      {/* Panel Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-white/6 bg-red-50/50 dark:bg-red-500/4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-500/15 flex items-center justify-center">
              <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.049.58.025 1.194-.14 1.743" /></svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Reparation</h3>
              <p className="text-xs text-gray-500">Repair history &amp; financial report</p>
            </div>
          </div>
          {fridge && (
            <Link href={`/refrigerators/${fridge.id}`} className="text-xs font-medium text-red-500 hover:text-red-600 hover:underline transition-colors">
              Full Report &rarr;
            </Link>
          )}
        </div>

        {/* Summary Stats */}
        {fridge && (
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="bg-white dark:bg-white/4 rounded-lg px-3 py-2 border border-gray-100 dark:border-white/6">
              <div className="text-xs text-gray-400 uppercase tracking-wide">Total Repairs</div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">{repairs.length}</div>
            </div>
            <div className="bg-white dark:bg-white/4 rounded-lg px-3 py-2 border border-gray-100 dark:border-white/6">
              <div className="text-xs text-gray-400 uppercase tracking-wide">Repair Cost</div>
              <div className="text-lg font-bold text-red-500">{fmtCurrency(totalRepairCost)} <span className="text-xs font-normal">BIF</span></div>
            </div>
            <div className="bg-white dark:bg-white/4 rounded-lg px-3 py-2 border border-gray-100 dark:border-white/6">
              <div className="text-xs text-gray-400 uppercase tracking-wide">Status</div>
              <div className="text-xs font-semibold mt-0.5">
                <span className="text-emerald-500">{completedRepairs} done</span>
                {pendingRepairs > 0 && <span className="text-amber-500"> &middot; {pendingRepairs} pending</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Repair Timeline */}
      <div className="px-5 py-4 max-h-80 overflow-y-auto">
        {!fridge ? (
          <div className="py-8 text-center text-xs text-gray-400">Select a fridge to view repair history</div>
        ) : repairs.length === 0 ? (
          <div className="py-8 text-center">
            <svg className="w-8 h-8 text-gray-200 dark:text-gray-700 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
            <p className="text-xs text-gray-400">No repairs recorded for this unit</p>
          </div>
        ) : (
          <div className="space-y-3">
            {repairs.map((r) => {
              const cost = r.costItems.reduce((s, c) => s + c.totalCost, 0);
              return (
                <div key={r.id} className="relative pl-5 pb-3 border-l-2 border-red-200 dark:border-red-500/20 last:pb-0">
                  <div className="absolute -left-1.25 top-1 w-2 h-2 rounded-full bg-red-400 dark:bg-red-500 ring-2 ring-white dark:ring-[#141414]" />
                  <div className="bg-gray-50 dark:bg-white/3 rounded-lg border border-gray-100 dark:border-white/4 p-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-gray-900 dark:text-white">{fmtDate(r.interventionDate)}</span>
                        <StatusBadge status={r.status} />
                      </div>
                      {cost > 0 && <span className="text-xs font-bold text-red-500 shrink-0">{fmtCurrency(cost)} BIF</span>}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                      {r.issueDescription && <span className="font-medium text-gray-700 dark:text-gray-300">Issue: </span>}
                      {r.issueDescription || "No description"}
                    </p>
                    {r.workDone && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Work: </span>{r.workDone}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-white/4">
                      <span className="text-xs text-gray-400">Tech: <span className="font-medium text-gray-600 dark:text-gray-300">{r.technician.fullName}</span></span>
                      {r.costItems.length > 0 && (
                        <span className="text-xs text-gray-400">{r.costItems.map((c) => `${c.itemName} x${c.quantity}`).join(", ")}</span>
                      )}
                    </div>
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

/* ════════════════════════════════════════════════════════════════
   Serviced Panel — All MAINTENANCE interventions for a fridge
   ════════════════════════════════════════════════════════════════ */
function ServicedPanel({ fridge, interventions, loading }: { fridge: FridgeDetail | null; interventions: Intervention[]; loading: boolean }) {
  const services = useMemo(() => interventions.filter((i) => i.type === "MAINTENANCE"), [interventions]);
  const totalServiceCost = useMemo(() => services.reduce((sum, s) => sum + s.costItems.reduce((a, c) => a + c.totalCost, 0), 0), [services]);
  const lastService = services.length > 0 ? services[0] : null;

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-32 rounded bg-gray-200 dark:bg-white/10" />
          <div className="h-20 rounded bg-gray-100 dark:bg-white/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 overflow-hidden">
      {/* Panel Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-white/6 bg-emerald-50/50 dark:bg-emerald-500/4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Serviced</h3>
              <p className="text-xs text-gray-500">Maintenance history &amp; technical report</p>
            </div>
          </div>
          {fridge && (
            <Link href={`/refrigerators/${fridge.id}`} className="text-xs font-medium text-emerald-500 hover:text-emerald-600 hover:underline transition-colors">
              Full Report &rarr;
            </Link>
          )}
        </div>

        {/* Summary Stats */}
        {fridge && (
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="bg-white dark:bg-white/4 rounded-lg px-3 py-2 border border-gray-100 dark:border-white/6">
              <div className="text-xs text-gray-400 uppercase tracking-wide">Total Services</div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">{services.length}</div>
            </div>
            <div className="bg-white dark:bg-white/4 rounded-lg px-3 py-2 border border-gray-100 dark:border-white/6">
              <div className="text-xs text-gray-400 uppercase tracking-wide">Service Cost</div>
              <div className="text-lg font-bold text-emerald-500">{fmtCurrency(totalServiceCost)} <span className="text-xs font-normal">BIF</span></div>
            </div>
            <div className="bg-white dark:bg-white/4 rounded-lg px-3 py-2 border border-gray-100 dark:border-white/6">
              <div className="text-xs text-gray-400 uppercase tracking-wide">Last Service</div>
              <div className="text-xs font-semibold text-gray-900 dark:text-white mt-0.5">{lastService ? fmtDate(lastService.interventionDate) : "Never"}</div>
            </div>
          </div>
        )}
      </div>

      {/* Service Timeline */}
      <div className="px-5 py-4 max-h-80 overflow-y-auto">
        {!fridge ? (
          <div className="py-8 text-center text-xs text-gray-400">Select a fridge to view service history</div>
        ) : services.length === 0 ? (
          <div className="py-8 text-center">
            <svg className="w-8 h-8 text-gray-200 dark:text-gray-700 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
            <p className="text-xs text-gray-400">No maintenance records for this unit</p>
          </div>
        ) : (
          <div className="space-y-3">
            {services.map((s) => {
              const cost = s.costItems.reduce((a, c) => a + c.totalCost, 0);
              return (
                <div key={s.id} className="relative pl-5 pb-3 border-l-2 border-emerald-200 dark:border-emerald-500/20 last:pb-0">
                  <div className="absolute -left-1.25 top-1 w-2 h-2 rounded-full bg-emerald-400 dark:bg-emerald-500 ring-2 ring-white dark:ring-[#141414]" />
                  <div className="bg-gray-50 dark:bg-white/3 rounded-lg border border-gray-100 dark:border-white/4 p-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-gray-900 dark:text-white">{fmtDate(s.interventionDate)}</span>
                        <StatusBadge status={s.status} />
                      </div>
                      {cost > 0 && <span className="text-xs font-bold text-emerald-500 shrink-0">{fmtCurrency(cost)} BIF</span>}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                      {s.workDone || s.issueDescription || "Routine maintenance"}
                    </p>
                    {s.notes && (
                      <p className="text-xs text-gray-500 mt-1 italic leading-relaxed">{s.notes}</p>
                    )}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-white/4">
                      <span className="text-xs text-gray-400">Tech: <span className="font-medium text-gray-600 dark:text-gray-300">{s.technician.fullName}</span></span>
                      {s.costItems.length > 0 && (
                        <span className="text-xs text-gray-400">{s.costItems.map((c) => `${c.itemName} x${c.quantity}`).join(", ")}</span>
                      )}
                    </div>
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

/* ════════════════════════════════════════════════════════════════
   Non Repaired Panel — Why these fridges haven't been repaired
   ════════════════════════════════════════════════════════════════ */
function NonRepairedPanel({ fridges, stats }: { fridges: CommuneFridge[]; stats: CommuneStats }) {
  const nonRepaired = fridges.filter((f) => !f.isRepaired);
  const byStatus: Record<string, CommuneFridge[]> = {};
  nonRepaired.forEach((f) => {
    const key = f.status;
    if (!byStatus[key]) byStatus[key] = [];
    byStatus[key].push(f);
  });

  return (
    <div className="bg-white dark:bg-[#141414] rounded-xl border border-orange-200 dark:border-orange-500/20 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-orange-100 dark:border-orange-500/10 bg-orange-50 dark:bg-orange-500/6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-500/15 flex items-center justify-center">
            <svg className="w-4.5 h-4.5 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Non Repaired Fridges</h3>
            <p className="text-xs text-gray-500">These units have never had a completed repair intervention</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="bg-white dark:bg-white/4 rounded-lg px-3 py-2 border border-orange-100 dark:border-orange-500/10">
            <div className="text-xs text-gray-400 uppercase tracking-wide">Not Repaired</div>
            <div className="text-lg font-bold text-orange-500">{nonRepaired.length}</div>
          </div>
          <div className="bg-white dark:bg-white/4 rounded-lg px-3 py-2 border border-orange-100 dark:border-orange-500/10">
            <div className="text-xs text-gray-400 uppercase tracking-wide">Of Total Fleet</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{stats.totalFridges > 0 ? Math.round((nonRepaired.length / stats.totalFridges) * 100) : 0}%</div>
          </div>
          <div className="bg-white dark:bg-white/4 rounded-lg px-3 py-2 border border-orange-100 dark:border-orange-500/10">
            <div className="text-xs text-gray-400 uppercase tracking-wide">Status Breakdown</div>
            <div className="text-xs font-semibold mt-0.5 space-x-1.5">
              {Object.entries(byStatus).map(([status, list]) => (
                <span key={status} className={statusCfg[status]?.text || "text-gray-500"}>{list.length} {statusCfg[status]?.label || status}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Fridge list with reasons */}
      <div className="px-5 py-4 max-h-96 overflow-y-auto">
        {nonRepaired.length === 0 ? (
          <div className="py-8 text-center">
            <svg className="w-8 h-8 text-emerald-300 dark:text-emerald-700 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
            <p className="text-xs text-gray-400">All fridges have been repaired</p>
          </div>
        ) : (
          <div className="space-y-2">
            {nonRepaired.map((f) => {
              const reason = f.repairCount === 0
                ? "No repair intervention has ever been created for this fridge"
                : `Has ${f.repairCount} repair intervention(s) but none completed yet`;
              return (
                <div key={f.id} className="flex items-start gap-3 p-3 rounded-lg border border-orange-100 dark:border-orange-500/10 bg-orange-50/30 dark:bg-orange-500/3 hover:bg-orange-50 dark:hover:bg-orange-500/6 transition-colors">
                  <div className="w-7 h-7 rounded-md bg-orange-100 dark:bg-orange-500/15 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008Z" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/refrigerators/${f.id}`} className="text-xs font-bold font-mono text-gray-900 dark:text-white hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
                        {f.serialNumber}
                      </Link>
                      <StatusBadge status={f.status} />
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{f.posName}{f.owner ? ` · ${f.owner}` : ""}{f.neighbourhood ? ` · ${f.neighbourhood}` : ""}</div>
                    <div className="flex items-center gap-1 mt-1.5">
                      <svg className="w-3 h-3 text-orange-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>
                      <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">{reason}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-gray-400">{f.brand || "N/A"}</div>
                    <div className="text-xs text-gray-400">{f.refrigeratorType || ""}</div>
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

/* ════════════════════════════════════════════════════════════════
   Non Serviced Panel — Why these fridges haven't been serviced
   ════════════════════════════════════════════════════════════════ */
function NonServicedPanel({ fridges, stats }: { fridges: CommuneFridge[]; stats: CommuneStats }) {
  const nonServiced = fridges.filter((f) => !f.isServiced);
  const byStatus: Record<string, CommuneFridge[]> = {};
  nonServiced.forEach((f) => {
    const key = f.status;
    if (!byStatus[key]) byStatus[key] = [];
    byStatus[key].push(f);
  });

  return (
    <div className="bg-white dark:bg-[#141414] rounded-xl border border-red-200 dark:border-red-500/20 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-red-100 dark:border-red-500/10 bg-red-50 dark:bg-red-500/6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-500/15 flex items-center justify-center">
            <svg className="w-4.5 h-4.5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Non Serviced Fridges</h3>
            <p className="text-xs text-gray-500">These units have never had a completed maintenance service</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="bg-white dark:bg-white/4 rounded-lg px-3 py-2 border border-red-100 dark:border-red-500/10">
            <div className="text-xs text-gray-400 uppercase tracking-wide">Not Serviced</div>
            <div className="text-lg font-bold text-red-500">{nonServiced.length}</div>
          </div>
          <div className="bg-white dark:bg-white/4 rounded-lg px-3 py-2 border border-red-100 dark:border-red-500/10">
            <div className="text-xs text-gray-400 uppercase tracking-wide">Of Total Fleet</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{stats.totalFridges > 0 ? Math.round((nonServiced.length / stats.totalFridges) * 100) : 0}%</div>
          </div>
          <div className="bg-white dark:bg-white/4 rounded-lg px-3 py-2 border border-red-100 dark:border-red-500/10">
            <div className="text-xs text-gray-400 uppercase tracking-wide">Status Breakdown</div>
            <div className="text-xs font-semibold mt-0.5 space-x-1.5">
              {Object.entries(byStatus).map(([status, list]) => (
                <span key={status} className={statusCfg[status]?.text || "text-gray-500"}>{list.length} {statusCfg[status]?.label || status}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Fridge list with reasons */}
      <div className="px-5 py-4 max-h-96 overflow-y-auto">
        {nonServiced.length === 0 ? (
          <div className="py-8 text-center">
            <svg className="w-8 h-8 text-emerald-300 dark:text-emerald-700 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
            <p className="text-xs text-gray-400">All fridges have been serviced</p>
          </div>
        ) : (
          <div className="space-y-2">
            {nonServiced.map((f) => {
              const reason = f.maintenanceCount === 0
                ? "No maintenance intervention has ever been scheduled for this fridge"
                : `Has ${f.maintenanceCount} maintenance record(s) but none completed yet`;
              return (
                <div key={f.id} className="flex items-start gap-3 p-3 rounded-lg border border-red-100 dark:border-red-500/10 bg-red-50/30 dark:bg-red-500/3 hover:bg-red-50 dark:hover:bg-red-500/6 transition-colors">
                  <div className="w-7 h-7 rounded-md bg-red-100 dark:bg-red-500/15 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/refrigerators/${f.id}`} className="text-xs font-bold font-mono text-gray-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 transition-colors">
                        {f.serialNumber}
                      </Link>
                      <StatusBadge status={f.status} />
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{f.posName}{f.owner ? ` · ${f.owner}` : ""}{f.neighbourhood ? ` · ${f.neighbourhood}` : ""}</div>
                    <div className="flex items-center gap-1 mt-1.5">
                      <svg className="w-3 h-3 text-red-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>
                      <span className="text-xs text-red-600 dark:text-red-400 font-medium">{reason}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-gray-400">{f.brand || "N/A"}</div>
                    <div className="text-xs text-gray-400">{f.refrigeratorType || ""}</div>
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

/* ════════════════════════════════════════════════════════════════
   Fridge Drawer — Individual refrigerator record
   ════════════════════════════════════════════════════════════════ */
function FridgeDrawer({ open, onClose, fridgeDetail, loading }: {
  open: boolean;
  onClose: () => void;
  fridgeDetail: FridgeDetailData | null;
  loading: boolean;
}) {
  const fd = fridgeDetail?.fridge ?? null;
  const interventions = fd?.interventions ?? [];
  const repairs = interventions.filter((i) => i.type === "REPAIR");
  const maintenance = interventions.filter((i) => i.type === "MAINTENANCE");
  const [tab, setTab] = useState<"overview" | "maintenance" | "repairs">("overview");

  const technicianMap = new Map<string, { name: string; repairCount: number; maintCount: number }>();
  interventions.forEach((i) => {
    const name = i.technician.fullName;
    const prev = technicianMap.get(name) || { name, repairCount: 0, maintCount: 0 };
    if (i.type === "REPAIR") prev.repairCount++; else prev.maintCount++;
    technicianMap.set(name, prev);
  });
  const technicians = [...technicianMap.values()];

  const totalRepairCost = repairs.reduce((s, r) => s + r.costItems.reduce((a, c) => a + c.totalCost, 0), 0);
  const totalMaintCost = maintenance.reduce((s, m) => s + m.costItems.reduce((a, c) => a + c.totalCost, 0), 0);
  const totalCost = totalRepairCost + totalMaintCost;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 dark:bg-black/50 z-40 transition-opacity duration-300 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-xl bg-white dark:bg-[#0f0f0f] shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "translate-x-full"}`}>

        {/* Header */}
        <div className="shrink-0 border-b border-gray-100 dark:border-white/6">
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            {loading || !fd ? (
              <div className="animate-pulse flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-white/10" />
                <div className="space-y-1.5">
                  <div className="h-4 w-36 rounded bg-gray-200 dark:bg-white/10" />
                  <div className="h-3 w-24 rounded bg-gray-100 dark:bg-white/5" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                  <IcnSnowflake className="w-5 h-5 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{fd.pos.posName}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-mono text-gray-500">{fd.serialNumber}</span>
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <span className="text-xs text-gray-400">{fd.brand || "—"}</span>
                    {fd.refrigeratorType && (
                      <>
                        <span className="text-gray-300 dark:text-gray-600">·</span>
                        <span className="text-xs text-gray-400">{fd.refrigeratorType}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors shrink-0 ml-3"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Tabs */}
          {!loading && fd && (
            <div className="flex px-5 gap-1">
              {([
                { key: "overview" as const, label: "Overview" },
                { key: "maintenance" as const, label: `Maintenance (${maintenance.length})` },
                { key: "repairs" as const, label: `Repairs (${repairs.length})` },
              ]).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                    tab === t.key
                      ? "border-gray-900 dark:border-white text-gray-900 dark:text-white"
                      : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-5 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse rounded-xl bg-gray-50 dark:bg-white/3 p-5 space-y-3">
                  <div className="h-3 w-28 rounded bg-gray-200 dark:bg-white/10" />
                  <div className="h-16 rounded bg-gray-100 dark:bg-white/5" />
                </div>
              ))}
            </div>
          ) : !fd ? (
            <div className="p-6 flex items-center justify-center text-sm text-gray-400">No data available</div>
          ) : (
            <>
              {/* ── Overview Tab ── */}
              {tab === "overview" && (
                <div className="p-5 space-y-4">

                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-gray-50 dark:bg-white/3 border border-gray-100 dark:border-white/5 p-3 text-center">
                      <div className="text-lg font-bold text-gray-900 dark:text-white">{interventions.length}</div>
                      <div className="text-xs text-gray-400 mt-0.5">Interventions</div>
                    </div>
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/6 border border-emerald-100 dark:border-emerald-500/10 p-3 text-center">
                      <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{maintenance.length}</div>
                      <div className="text-xs text-emerald-500 mt-0.5">Services</div>
                    </div>
                    <div className="rounded-xl bg-red-50 dark:bg-red-500/6 border border-red-100 dark:border-red-500/10 p-3 text-center">
                      <div className="text-lg font-bold text-red-500">{repairs.length}</div>
                      <div className="text-xs text-red-400 mt-0.5">Repairs</div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="rounded-xl bg-gray-50 dark:bg-white/3 border border-gray-100 dark:border-white/5 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-gray-100 dark:border-white/5">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Details</span>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-white/5">
                      {([
                        ["POS", fd.pos.posName],
                        ["Owner", fd.pos.owner || "—"],
                        ["Neighbourhood", fd.pos.neighbourhood || "—"],
                        ["City", fd.pos.city.name],
                        ["Brand", fd.brand || "—"],
                        ["Type", fd.refrigeratorType || "—"],
                        ["Serial", fd.serialNumber],
                        ["Registered", fmtDate(fd.createdAt)],
                      ] as const).map(([label, val]) => (
                        <div key={label} className="flex items-center justify-between px-4 py-2">
                          <span className="text-xs text-gray-400">{label}</span>
                          <span className={`text-xs font-medium text-gray-900 dark:text-white ${label === "Serial" ? "font-mono" : ""}`}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cost Summary */}
                  {totalCost > 0 && (
                    <div className="rounded-xl bg-gray-50 dark:bg-white/3 border border-gray-100 dark:border-white/5 overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-gray-100 dark:border-white/5">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Costs</span>
                      </div>
                      <div className="px-4 py-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Repairs</span>
                          <span className="text-xs font-semibold text-red-500">{fmtCurrency(totalRepairCost)} BIF</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Maintenance</span>
                          <span className="text-xs font-semibold text-emerald-500">{fmtCurrency(totalMaintCost)} BIF</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/8 overflow-hidden flex">
                          <div className="bg-red-400 transition-all" style={{ width: `${(totalRepairCost / totalCost) * 100}%` }} />
                          <div className="bg-emerald-400 transition-all" style={{ width: `${(totalMaintCost / totalCost) * 100}%` }} />
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-white/5">
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Total</span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{fmtCurrency(totalCost)} BIF</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Technicians */}
                  {technicians.length > 0 && (
                    <div className="rounded-xl bg-gray-50 dark:bg-white/3 border border-gray-100 dark:border-white/5 overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-gray-100 dark:border-white/5">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Technicians</span>
                      </div>
                      <div className="divide-y divide-gray-100 dark:divide-white/5">
                        {technicians.map((t) => (
                          <div key={t.name} className="flex items-center justify-between px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-white/8 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                                {t.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs font-medium text-gray-900 dark:text-white">{t.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {t.repairCount > 0 && <span className="text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-500/10 px-1.5 py-0.5 rounded">{t.repairCount}R</span>}
                              {t.maintCount > 0 && <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded">{t.maintCount}S</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Maintenance Tab ── */}
              {tab === "maintenance" && (
                <div className="p-5">
                  {maintenance.length === 0 ? (
                    <div className="py-12 text-center">
                      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/6 flex items-center justify-center mx-auto mb-3">
                        <IcnCheck className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                      </div>
                      <p className="text-sm text-gray-400">No maintenance records</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {maintenance.map((m) => {
                        const cost = m.costItems.reduce((s, c) => s + c.totalCost, 0);
                        return (
                          <div key={m.id} className="rounded-xl bg-gray-50 dark:bg-white/3 border border-gray-100 dark:border-white/5 p-3.5">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span className="text-xs font-semibold text-gray-900 dark:text-white">{fmtDate(m.interventionDate)}</span>
                                <StatusBadge status={m.status} />
                              </div>
                              {cost > 0 && <span className="text-xs font-bold text-emerald-500">{fmtCurrency(cost)} BIF</span>}
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{m.workDone || m.issueDescription || "Routine maintenance"}</p>
                            {m.notes && <p className="text-xs text-gray-400 mt-1.5 italic">{m.notes}</p>}
                            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-white/5 text-xs text-gray-400">
                              <span className="font-medium text-gray-500 dark:text-gray-300">{m.technician.fullName}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Repairs Tab ── */}
              {tab === "repairs" && (
                <div className="p-5">
                  {repairs.length === 0 ? (
                    <div className="py-12 text-center">
                      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/6 flex items-center justify-center mx-auto mb-3">
                        <IcnWrench className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                      </div>
                      <p className="text-sm text-gray-400">No repair records</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {repairs.map((r) => {
                        const cost = r.costItems.reduce((s, c) => s + c.totalCost, 0);
                        return (
                          <div key={r.id} className="rounded-xl bg-gray-50 dark:bg-white/3 border border-gray-100 dark:border-white/5 p-3.5">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                <span className="text-xs font-semibold text-gray-900 dark:text-white">{fmtDate(r.interventionDate)}</span>
                                <StatusBadge status={r.status} />
                              </div>
                              {cost > 0 && <span className="text-xs font-bold text-red-500">{fmtCurrency(cost)} BIF</span>}
                            </div>
                            {r.issueDescription && <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed"><span className="font-medium text-gray-700 dark:text-gray-300">Issue: </span>{r.issueDescription}</p>}
                            {r.workDone && <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mt-1"><span className="font-medium text-gray-700 dark:text-gray-300">Work: </span>{r.workDone}</p>}
                            {r.costItems.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {r.costItems.map((c) => (
                                  <span key={c.id} className="text-xs bg-gray-100 dark:bg-white/6 text-gray-500 px-1.5 py-0.5 rounded">{c.itemName} ×{c.quantity}</span>
                                ))}
                              </div>
                            )}
                            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-white/5 text-xs text-gray-400">
                              <span className="font-medium text-gray-500 dark:text-gray-300">{r.technician.fullName}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && fd && (
          <div className="shrink-0 border-t border-gray-100 dark:border-white/6 px-5 py-3">
            <Link
              href={`/refrigerators/${fd.id}`}
              className="flex items-center justify-center gap-2 w-full h-9 rounded-lg bg-gray-50 dark:bg-white/4 border border-gray-200 dark:border-white/6 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/6 transition-colors"
            >
              View Full Detail
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            </Link>
          </div>
        )}
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════
   Page
   ════════════════════════════════════════════════════════════════ */
export default function CommuneDetailPage() {
  useAuth();
  const params = useParams();

  const [data, setData] = useState<CommuneData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fridgeDetail, setFridgeDetail] = useState<FridgeDetailData | null>(null);
  const [fridgeLoading, setFridgeLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  /* Search, filter, pagination */
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("ALL");

  const [datePreset, setDatePreset] = useState<"all" | "today" | "week" | "month" | "custom">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<"serial" | "pos" | "status">("serial");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [metricFilter, setMetricFilter] = useState<"all" | "repaired" | "non_repaired" | "serviced" | "non_serviced">("all");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  /* Fetch city data */
  const fetchData = useCallback(() => {
    fetch(`/api/cities/${params.id}`)
      .then((r) => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then((d: CommuneData) => {
        setData(d);
        if (d.fridges.length > 0 && !selectedId) setSelectedId(d.fridges[0].id);
        setLastRefresh(new Date());
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id, selectedId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* Auto-refresh every 30s */
  useEffect(() => {
    const iv = setInterval(fetchData, 30_000);
    return () => clearInterval(iv);
  }, [fetchData]);

  /* Fetch selected fridge detail */
  useEffect(() => {
    if (!selectedId) return;
    setFridgeLoading(true);
    fetch(`/api/refrigerators/${selectedId}`)
      .then((r) => r.json())
      .then(setFridgeDetail)
      .catch(console.error)
      .finally(() => setFridgeLoading(false));
  }, [selectedId]);

  /* Unique values for dropdowns */
  const channels = useMemo(() => {
    if (!data) return [];
    const set = new Set(data.fridges.map((f) => f.channel).filter(Boolean) as string[]);
    return [...set].sort();
  }, [data]);



  /* Resolve date range from preset */
  const dateRange = useMemo<{ from: string; to: string } | null>(() => {
    const now = new Date();
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (datePreset === "today") {
      const s = fmt(now);
      return { from: s, to: s };
    }
    if (datePreset === "week") {
      const d = new Date(now);
      d.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      return { from: fmt(d), to: fmt(now) };
    }
    if (datePreset === "month") {
      return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: fmt(now) };
    }
    if (datePreset === "custom" && dateFrom) {
      return { from: dateFrom, to: dateTo || fmt(now) };
    }
    return null;
  }, [datePreset, dateFrom, dateTo]);

  /* Helper: check if a fridge has a matching intervention in the date range */
  const fridgeInDateRange = useCallback((f: CommuneFridge, type?: "MAINTENANCE" | "REPAIR") => {
    if (!dateRange) return true;
    return f.interventions.some((i) => {
      if (type && i.type !== type) return false;
      if (i.status !== "COMPLETED") return false;
      const d = i.interventionDate.slice(0, 10);
      return d >= dateRange.from && d <= dateRange.to;
    });
  }, [dateRange]);

  /* Filtered fridges (channel + neighbourhood + date applied before stats) */
  const baseFiltered = useMemo(() => {
    if (!data) return [];
    let list = data.fridges;
    if (channelFilter !== "ALL") list = list.filter((f) => f.channel === channelFilter);
    return list;
  }, [data, channelFilter]);

  /* Dynamic stats based on channel + neighbourhood + date filters */
  const filteredStats = useMemo(() => {
    const total = baseFiltered.length;
    if (!dateRange) {
      const serviced = baseFiltered.filter((f) => f.isServiced).length;
      const repaired = baseFiltered.filter((f) => f.isRepaired).length;
      return { totalFridges: total, servicedFridges: serviced, nonServicedFridges: total - serviced, repairedFridges: repaired, nonRepairedFridges: total - repaired };
    }
    const serviced = baseFiltered.filter((f) => fridgeInDateRange(f, "MAINTENANCE")).length;
    const repaired = baseFiltered.filter((f) => fridgeInDateRange(f, "REPAIR")).length;
    return { totalFridges: total, servicedFridges: serviced, nonServicedFridges: total - serviced, repairedFridges: repaired, nonRepairedFridges: total - repaired };
  }, [baseFiltered, dateRange, fridgeInDateRange]);

  /* Filtered + sorted + paginated list */
  const { totalFiltered, totalPages, paged } = useMemo(() => {
    if (!data) return { totalFiltered: 0, totalPages: 0, paged: [] as CommuneFridge[] };
    let list = baseFiltered;

    /* Apply metric filter (date-aware) */
    if (dateRange) {
      if (metricFilter === "repaired") list = list.filter((f) => fridgeInDateRange(f, "REPAIR"));
      else if (metricFilter === "non_repaired") list = list.filter((f) => !fridgeInDateRange(f, "REPAIR"));
      else if (metricFilter === "serviced") list = list.filter((f) => fridgeInDateRange(f, "MAINTENANCE"));
      else if (metricFilter === "non_serviced") list = list.filter((f) => !fridgeInDateRange(f, "MAINTENANCE"));
    } else {
      if (metricFilter === "repaired") list = list.filter((f) => f.isRepaired);
      else if (metricFilter === "non_repaired") list = list.filter((f) => !f.isRepaired);
      else if (metricFilter === "serviced") list = list.filter((f) => f.isServiced);
      else if (metricFilter === "non_serviced") list = list.filter((f) => !f.isServiced);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((f) =>
        f.serialNumber.toLowerCase().includes(q) ||
        f.posName.toLowerCase().includes(q) ||
        (f.brand?.toLowerCase().includes(q) ?? false) ||
        (f.owner?.toLowerCase().includes(q) ?? false) ||
        (f.channel?.toLowerCase().includes(q) ?? false) ||
        (f.phoneNumber?.toLowerCase().includes(q) ?? false) ||
        (f.neighbourhood?.toLowerCase().includes(q) ?? false)
      );
    }

    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "serial") cmp = a.serialNumber.localeCompare(b.serialNumber);
      else if (sortKey === "pos") cmp = a.posName.localeCompare(b.posName);
      else cmp = a.status.localeCompare(b.status);
      return sortDir === "asc" ? cmp : -cmp;
    });

    const totalFiltered = list.length;
    const totalPages = Math.ceil(totalFiltered / PAGE_SIZE);
    const start = (page - 1) * PAGE_SIZE;
    const paged = list.slice(start, start + PAGE_SIZE);
    return { totalFiltered, totalPages, paged };
  }, [data, baseFiltered, search, sortKey, sortDir, page, metricFilter, dateRange, fridgeInDateRange]);

  useEffect(() => { setPage(1); }, [search, sortKey, sortDir, metricFilter, channelFilter, datePreset, dateFrom, dateTo]);

  const toggleSort = useCallback((key: "serial" | "pos" | "status") => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }, [sortKey]);

  const fd = fridgeDetail?.fridge ?? null;

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
  if (!data || !data.city) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <p className="text-gray-500">City not found</p>
        <Link href="/dashboard" className="text-sm text-blue-500 hover:underline">&larr; Back to Dashboard</Link>
      </div>
    );
  }

const { fridges, city } = data;
    const stats = filteredStats;

  const SortArrow = ({ col }: { col: "serial" | "pos" | "status" }) => (
    <svg className={`w-3 h-3 inline ml-0.5 transition-transform ${sortKey === col ? "text-blue-500" : "text-gray-300 dark:text-gray-600"} ${sortKey === col && sortDir === "desc" ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
  );

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ── Header + Filters ── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 mr-auto">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{city.name}</h1>
            {lastRefresh && (
              <span className="text-xs text-gray-400 ml-1 hidden sm:inline">
                {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <button onClick={fetchData} className="ml-1 p-1 rounded-md text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors" title="Refresh">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182M20.016 4.656v4.992" /></svg>
            </button>
          </div>

          <select
            value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}
            className="h-8 px-2 text-xs bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/6 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/30 cursor-pointer [&>option]:bg-white [&>option]:dark:bg-[#1a1a1a] [&>option]:text-gray-700 [&>option]:dark:text-gray-300"
          >
            <option value="ALL">Tous les canaux</option>
            {channels.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <div className="w-px h-6 bg-gray-200 dark:bg-white/8" />

          <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-white/6 rounded-lg p-0.5 h-8">
            {([["all", "Tout"], ["today", "Aujourd&apos;hui"], ["week", "Semaine"], ["month", "Mois"], ["custom", "Personnalisé"]] as const).map(([key, label]) => (
              <button key={key} onClick={() => setDatePreset(key as typeof datePreset)}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap ${datePreset === key ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
              >{key === "today" ? "Aujourd\u2019hui" : label}</button>
            ))}
          </div>

          {datePreset === "custom" && (
            <>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="h-8 px-2 text-xs bg-gray-50 dark:bg-white/4 border border-gray-200 dark:border-white/6 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/30" />
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="h-8 px-2 text-xs bg-gray-50 dark:bg-white/4 border border-gray-200 dark:border-white/6 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/30" />
            </>
          )}

          {(channelFilter !== "ALL" || datePreset !== "all") && (
            <button onClick={() => { setChannelFilter("ALL"); setDatePreset("all"); setDateFrom(""); setDateTo(""); }}
              className="h-8 px-3 text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/8 rounded-lg transition-colors whitespace-nowrap"
            >
              Effacer filtres
            </button>
          )}
        </div>

        {/* ── Summary Cards (Dashboard style) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-gray-200 dark:bg-white/6 rounded-xl overflow-hidden">
            <div className={`px-4 py-3 transition-colors ${metricFilter === "all" ? "bg-emerald-50/70 dark:bg-emerald-500/6" : "bg-white dark:bg-[#141414] hover:bg-gray-50 dark:hover:bg-white/3"}`}>
              <SummaryMetric
                icon={<IcnSnowflake className="w-4 h-4" />}
                title="All Fridges"
                value={stats.totalFridges.toLocaleString()}
                trendLabel={`${baseFiltered.filter((f) => f.status === "ACTIVE").length} active`}
                trendValue={`${Math.round((baseFiltered.filter((f) => f.status === "ACTIVE").length / Math.max(stats.totalFridges, 1)) * 100)}%`}
                trendColor="green"
                onClick={() => setMetricFilter("all")}
                active={metricFilter === "all"}
              />
            </div>
            <div className={`px-4 py-3 transition-colors ${metricFilter === "repaired" ? "bg-emerald-50/70 dark:bg-emerald-500/6" : "bg-white dark:bg-[#141414] hover:bg-gray-50 dark:hover:bg-white/3"}`}>
              <SummaryMetric
                icon={<IcnWrench className="w-4 h-4" />}
                title="Repaired"
                value={String(stats.repairedFridges)}
                trendLabel="completed repair"
                trendColor="green"
                onClick={() => setMetricFilter(metricFilter === "repaired" ? "all" : "repaired")}
                active={metricFilter === "repaired"}
              />
            </div>
            <div className={`px-4 py-3 transition-colors ${metricFilter === "non_repaired" ? (stats.nonRepairedFridges > 0 ? "bg-orange-50/70 dark:bg-orange-500/6" : "bg-emerald-50/70 dark:bg-emerald-500/6") : "bg-white dark:bg-[#141414] hover:bg-gray-50 dark:hover:bg-white/3"}`}>
              <SummaryMetric
                icon={<IcnWarning className="w-4 h-4" />}
                title="Non Repaired"
                value={String(stats.nonRepairedFridges)}
                trendLabel="never repaired"
                trendColor={stats.nonRepairedFridges > 0 ? "orange" : "green"}
                onClick={() => setMetricFilter(metricFilter === "non_repaired" ? "all" : "non_repaired")}
                active={metricFilter === "non_repaired"}
              />
            </div>
            <div className={`px-4 py-3 transition-colors ${metricFilter === "serviced" ? "bg-emerald-50/70 dark:bg-emerald-500/6" : "bg-white dark:bg-[#141414] hover:bg-gray-50 dark:hover:bg-white/3"}`}>
              <SummaryMetric
                icon={<IcnCheck className="w-4 h-4" />}
                title="Serviced"
                value={String(stats.servicedFridges)}
                trendLabel="maintenance done"
                trendColor="green"
                onClick={() => setMetricFilter(metricFilter === "serviced" ? "all" : "serviced")}
                active={metricFilter === "serviced"}
              />
            </div>
            <div className={`px-4 py-3 transition-colors ${metricFilter === "non_serviced" ? (stats.nonServicedFridges > 0 ? "bg-red-50/70 dark:bg-red-500/6" : "bg-emerald-50/70 dark:bg-emerald-500/6") : "bg-white dark:bg-[#141414] hover:bg-gray-50 dark:hover:bg-white/3"}`}>
              <SummaryMetric
                icon={<IcnWarning className="w-4 h-4" />}
                title="Non Serviced"
                value={String(stats.nonServicedFridges)}
                trendLabel="pending service"
                trendColor={stats.nonServicedFridges > 0 ? "red" : "green"}
                onClick={() => setMetricFilter(metricFilter === "non_serviced" ? "all" : "non_serviced")}
                active={metricFilter === "non_serviced"}
              />
            </div>
        </div>

        {/* ── Fridge List ── */}
        <div>
            <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 overflow-hidden flex flex-col">

              {/* Toolbar */}
              <div className="px-4 py-3 border-b border-gray-100 dark:border-white/6 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {metricFilter === "all" ? "All Fridges" : metricFilter === "repaired" ? "Repaired Fridges" : metricFilter === "non_repaired" ? "Non Repaired Fridges" : metricFilter === "serviced" ? "Serviced Fridges" : "Non Serviced Fridges"}
                  </h3>
                  <span className="text-xs text-gray-400 font-medium">{totalFiltered} of {filteredStats.totalFridges}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                    <input
                      type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search serial, POS, owner..."
                      className="w-full h-8 pl-8 pr-3 text-xs bg-gray-50 dark:bg-white/4 border border-gray-200 dark:border-white/6 rounded-lg text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all"
                    />
                  </div>

                </div>
              </div>

              {/* Table header */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-225">
                  <thead>
                    <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-50 dark:border-white/4 bg-gray-50/50 dark:bg-white/2">
                      <th className="px-3 py-2 text-left">
                        <button onClick={() => toggleSort("pos")} className="flex items-center hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                          Nom du PDV <SortArrow col="pos" />
                        </button>
                      </th>
                      <th className="px-3 py-2 text-left">Canal</th>
                      <th className="px-3 py-2 text-left">Propriétaire</th>
                      <th className="px-3 py-2 text-left">Téléphone</th>
                      <th className="px-3 py-2 text-left">Quartier</th>
                      <th className="px-3 py-2 text-left">N°</th>
                      <th className="px-3 py-2 text-left">Adresse</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Marque</th>
                      <th className="px-3 py-2 text-left">
                        <button onClick={() => toggleSort("serial")} className="flex items-center hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                          N° de série <SortArrow col="serial" />
                        </button>
                      </th>

                    </tr>
                  </thead>
                  <tbody>
                    {paged.length === 0 ? (
                      <tr><td colSpan={10} className="px-4 py-10 text-center text-xs text-gray-400">No units match your filters</td></tr>
                    ) : paged.map((fridge) => {
                      const isActive = fridge.id === selectedId;
                      return (
                        <tr
                          key={fridge.id}
                          onClick={() => { setSelectedId(fridge.id); setDrawerOpen(true); }}
                          className={`cursor-pointer border-b border-gray-50 dark:border-white/4 transition-colors ${
                            isActive
                              ? "bg-blue-50/80 dark:bg-blue-500/8"
                              : "hover:bg-gray-50 dark:hover:bg-white/2"
                          }`}
                        >
                          <td className="px-3 py-2.5 text-xs font-medium text-gray-900 dark:text-white truncate max-w-40">{fridge.posName}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-500 truncate max-w-22.5">{fridge.channel || "—"}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-300 truncate max-w-30">{fridge.owner || "—"}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-500 font-mono truncate max-w-25">{fridge.phoneNumber || "—"}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-500 truncate max-w-25">{fridge.neighbourhood || "—"}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-500 font-mono">{fridge.idNumber || "—"}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-500 truncate max-w-25">{fridge.streetNo || "—"}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-500 truncate max-w-22.5">{fridge.refrigeratorType || "—"}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-500 truncate max-w-20">{fridge.brand || "—"}</td>
                          <td className="px-3 py-2.5 text-xs font-mono font-medium text-gray-900 dark:text-white truncate max-w-30">{fridge.serialNumber}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-2.5 border-t border-gray-100 dark:border-white/6 flex items-center justify-between bg-gray-50/50 dark:bg-white/2">
                  <span className="text-xs text-gray-400">Page {page}/{totalPages}</span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let p: number;
                      if (totalPages <= 5) p = i + 1;
                      else if (page <= 3) p = i + 1;
                      else if (page >= totalPages - 2) p = totalPages - 4 + i;
                      else p = page - 2 + i;
                      return (
                        <button key={p} onClick={() => setPage(p)}
                          className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-medium transition-colors ${p === page ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"}`}
                        >{p}</button>
                      );
                    })}
                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
        </div>

        {/* Fridge Drawer */}
        <FridgeDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          fridgeDetail={fridgeDetail}
          loading={fridgeLoading}
        />

      </div>
    </div>
  );
}
