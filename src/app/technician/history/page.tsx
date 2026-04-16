"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";

/* ── Types ── */
interface CostItem {
  id: string;
  totalCost: number;
}

interface Intervention {
  id: string;
  interventionDate: string;
  workDone: string;
  notes: string | null;
  refrigerator: {
    serialNumber: string;
    brand: string | null;
    refrigeratorType: string | null;
    pos: { posName: string; owner: string | null; phoneNumber: string | null; streetNo: string | null; city: { name: string } };
  };
  serviceRequest: { type: string; urgency: string; description: string } | null;
  costItems: CostItem[];
}

interface HistoryResponse {
  interventions: Intervention[];
  total: number;
  page: number;
  limit: number;
}

/* ── Helpers ── */
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/* ─── Animated Counter Hook ─── */
function useCountUp(target: number, duration = 1200) {
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

function AnimatedBadge({ value }: { value: number }) {
  const animated = useCountUp(value);
  return <span className="text-emerald-500 font-bold transition-all">{animated}</span>;
}

/* ════════════════════════════════════════════
   History List Page
   ════════════════════════════════════════════ */
export default function TechnicianHistoryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);

  const fetchPage = useCallback(async (p: number) => {
    if (p > 1) setPageLoading(true);
    const res = await fetch(`/api/technician/history?page=${p}`);
    const json: HistoryResponse = await res.json();
    setData(json);
    setPage(p);
    setPageLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "TECHNICIAN" && user.role !== "ADMIN") {
      router.replace("/dashboard");
      return;
    }
    fetchPage(1).finally(() => setLoading(false));
  }, [user, router, fetchPage]);

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

  const interventions = data?.interventions ?? [];
  const total = data?.total ?? 0;
  const limit = data?.limit ?? 20;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* ════ Count badge — animated ════ */}
        <p className="text-xs text-gray-400"><AnimatedBadge value={total} /> intervention{total !== 1 ? "s" : ""} terminée{total !== 1 ? "s" : ""}</p>

        {/* ════ Content ════ */}
        <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-200 dark:border-white/6 overflow-hidden">
          {interventions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <svg className="w-10 h-10 text-gray-200 dark:text-gray-700 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <p className="text-sm font-medium text-gray-400">Aucun travail terminé</p>
              <p className="text-xs text-gray-300 dark:text-gray-600 mt-0.5">Les rapports soumis apparaîtront ici</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-white/4">
              {interventions.map((item) => {
                const totalCost = item.costItems.reduce((s, c) => s + c.totalCost, 0);
                const srType = item.serviceRequest?.type;
                return (
                  <Link
                    key={item.id}
                    href={`/technician/history/${item.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/50 dark:hover:bg-white/2 transition-colors"
                  >
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${srType === "REPAIR" ? "bg-red-400" : "bg-emerald-400"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.refrigerator.pos.posName}</span>
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${srType === "REPAIR" ? "bg-red-50 dark:bg-red-500/10 text-red-500" : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500"}`}>
                          {srType === "REPAIR" ? "Réparation" : "Entretien"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {item.refrigerator.serialNumber} · {item.refrigerator.pos.city.name}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-400">{formatDate(item.interventionDate)}</p>
                      {totalCost > 0 && (
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mt-0.5">{totalCost.toLocaleString()} BIF</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ════ Pagination ════ */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <button
              disabled={page <= 1 || pageLoading}
              onClick={() => fetchPage(page - 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/6 text-gray-600 dark:text-gray-400 active:bg-gray-100 dark:active:bg-white/6 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Précédent
            </button>
            <span className="text-xs text-gray-400">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages || pageLoading}
              onClick={() => fetchPage(page + 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/6 text-gray-600 dark:text-gray-400 active:bg-gray-100 dark:active:bg-white/6 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Suivant
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
