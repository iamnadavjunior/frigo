"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";

/* ── Types ── */
interface CostItem {
  id: string;
  itemName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

interface Intervention {
  id: string;
  interventionDate: string;
  type: string;
  status: string;
  issueDescription: string | null;
  workDone: string;
  notes: string | null;
  technician: { id: string; fullName: string };
  refrigerator: {
    serialNumber: string;
    brand: string | null;
    refrigeratorType: string | null;
    pos: {
      posName: string;
      owner: string | null;
      neighbourhood: string | null;
      streetNo: string | null;
      phoneNumber: string | null;
      city: { name: string };
    };
  };
  serviceRequest: { type: string; urgency: string; description: string } | null;
  costItems: CostItem[];
}

/* ── Helpers ── */
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const urgencyLabel: Record<string, { text: string; cls: string }> = {
  CRITICAL: { text: "Critical", cls: "bg-red-500/10 text-red-500 border-red-500/20" },
  HIGH: { text: "High", cls: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  MEDIUM: { text: "Medium", cls: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  LOW: { text: "Low", cls: "bg-gray-500/10 text-gray-500 border-gray-500/20" },
};

/* ════════════════════════════════════════════
   Proof-of-Work Detail Page
   ════════════════════════════════════════════ */
export default function ProofOfWorkPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [intervention, setIntervention] = useState<Intervention | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "TECHNICIAN" && user.role !== "ADMIN") {
      router.replace("/dashboard");
      return;
    }
    fetch(`/api/interventions/${id}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => { if (data) setIntervention(data); })
      .finally(() => setLoading(false));
  }, [user, router, id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-white/10" />
          <div className="w-28 h-2 rounded-full bg-gray-200 dark:bg-white/10" />
        </div>
      </div>
    );
  }

  if (notFound || !intervention) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 text-sm">Job report not found.</p>
        <Link href="/technician/history" className="text-blue-500 text-sm mt-3 inline-block">← Back to history</Link>
      </div>
    );
  }

  const grandTotal = intervention.costItems.reduce((s, c) => s + c.totalCost, 0);
  const srUrg = intervention.serviceRequest?.urgency;
  const urgencyInfo = srUrg ? urgencyLabel[srUrg] : null;

  return (
    <div className="max-w-lg mx-auto px-4 pb-16 pt-2 space-y-3">

      {/* Back nav */}
      <Link
        href="/technician/history"
        className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Historique
      </Link>

      {/* Summary card */}
      <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 overflow-hidden">
        {/* POS + badges */}
        <div className="px-3 py-2.5 flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{intervention.refrigerator.pos.posName}</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {intervention.refrigerator.pos.city.name}
              {intervention.refrigerator.pos.neighbourhood ? ` · ${intervention.refrigerator.pos.neighbourhood}` : ""}
              {intervention.refrigerator.pos.owner ? ` · ${intervention.refrigerator.pos.owner}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {urgencyInfo && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${urgencyInfo.cls}`}>
                {urgencyInfo.text}
              </span>
            )}
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
              Terminé
            </span>
          </div>
        </div>
        {/* Fridge + date row */}
        <div className="px-3 py-2 border-t border-gray-100 dark:border-white/6 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{intervention.refrigerator.serialNumber}</span>
            {intervention.refrigerator.brand && <><span className="text-gray-300 dark:text-gray-600">·</span><span>{intervention.refrigerator.brand}</span></>}
          </div>
          <span className="text-gray-400 shrink-0">{formatDateTime(intervention.interventionDate)}</span>
        </div>
        {/* Type + technician */}
        <div className="px-3 py-2 border-t border-gray-100 dark:border-white/6 flex items-center justify-between text-xs">
          <span className={`font-semibold px-1.5 py-0.5 rounded-full ${intervention.type === "REPAIR" ? "bg-red-50 dark:bg-red-500/10 text-red-500" : "bg-blue-50 dark:bg-blue-500/10 text-blue-500"}`}>
            {intervention.type === "REPAIR" ? "Réparation" : "Entretien"}
          </span>
          <span className="text-gray-400">{intervention.technician.fullName}</span>
        </div>
      </div>

      {/* Reported issue */}
      {intervention.serviceRequest && (
        <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 p-3 space-y-1">
          <p className="text-[10px] font-semibold text-gray-400 uppercase">Problème signalé</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{intervention.serviceRequest.description}</p>
        </div>
      )}

      {/* Work done */}
      <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 p-3 space-y-1">
        <p className="text-[10px] font-semibold text-gray-400 uppercase">Travail effectué</p>
        <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">{intervention.workDone}</p>
        {intervention.notes && (
          <div className="pt-2 mt-2 border-t border-gray-100 dark:border-white/6">
            <p className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Notes</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">{intervention.notes}</p>
          </div>
        )}
      </div>

      {/* Parts & costs */}
      {intervention.costItems.length > 0 && (
        <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 overflow-hidden">
          <div className="px-3 py-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase">Pièces & coûts</p>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-white/6">
            {intervention.costItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.itemName}</p>
                  <p className="text-[11px] text-gray-400">{item.quantity} × {item.unitCost.toLocaleString()} BIF</p>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white shrink-0 ml-3">
                  {item.totalCost.toLocaleString()} BIF
                </p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-white/4 border-t border-gray-200 dark:border-white/6">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">Total</p>
            <p className="text-sm font-black text-gray-900 dark:text-white">{grandTotal.toLocaleString()} BIF</p>
          </div>
        </div>
      )}

      {grandTotal === 0 && (
        <div className="rounded-xl bg-gray-50 dark:bg-white/4 border border-gray-200 dark:border-white/6 px-3 py-3 text-center">
          <p className="text-xs text-gray-400">Aucune pièce ou coût enregistré</p>
        </div>
      )}
    </div>
  );
}
