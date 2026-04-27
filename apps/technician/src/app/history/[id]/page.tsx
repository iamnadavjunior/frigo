"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

/* ── Types ── */
interface CostItem { id: string; itemName: string; quantity: number; unitCost: number; totalCost: number; }
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
    pos: { posName: string; owner: string | null; neighbourhood: string | null; streetNo: string | null; phoneNumber: string | null; city: { name: string } };
  };
  serviceRequest: { type: string; urgency: string; description: string } | null;
  costItems: CostItem[];
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const urgencyLabel: Record<string, { text: string; cls: string }> = {
  CRITICAL: { text: "Critical", cls: "bg-red-500/10 text-red-400 border-red-500/20" },
  HIGH: { text: "High", cls: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  MEDIUM: { text: "Medium", cls: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  LOW: { text: "Low", cls: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
};

export default function ProofOfWorkPage() {
  const params = useParams();
  const id = params?.id as string;
  const [intervention, setIntervention] = useState<Intervention | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/interventions/${id}`)
      .then((r) => { if (!r.ok) { setNotFound(true); return null; } return r.json(); })
      .then((data) => { if (data) setIntervention(data); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10" />
          <div className="w-28 h-2 rounded-full bg-white/10" />
        </div>
      </div>
    );
  }

  if (notFound || !intervention) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 text-sm">Rapport introuvable.</p>
        <Link href="/history" className="text-teal-400 text-sm mt-3 inline-block">← Retour</Link>
      </div>
    );
  }

  const grandTotal = intervention.costItems.reduce((s, c) => s + c.totalCost, 0);
  const srUrg = intervention.serviceRequest?.urgency;
  const urgencyInfo = srUrg ? urgencyLabel[srUrg] : null;

  return (
    <div className="max-w-lg mx-auto px-4 pb-16 pt-2 space-y-3">

      <Link href="/history" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Historique
      </Link>

      {/* Summary card */}
      <div className="bg-[#141414] rounded-xl border border-white/6 overflow-hidden">
        <div className="px-3 py-2.5 flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">{intervention.refrigerator.pos.posName}</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {intervention.refrigerator.pos.city.name}
              {intervention.refrigerator.pos.neighbourhood ? ` · ${intervention.refrigerator.pos.neighbourhood}` : ""}
              {intervention.refrigerator.pos.owner ? ` · ${intervention.refrigerator.pos.owner}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {urgencyInfo && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${urgencyInfo.cls}`}>{urgencyInfo.text}</span>}
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">Terminé</span>
          </div>
        </div>
        <div className="px-3 py-2 border-t border-white/6 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="font-mono font-medium text-gray-300">{intervention.refrigerator.serialNumber}</span>
            {intervention.refrigerator.brand && <><span className="text-gray-700">·</span><span>{intervention.refrigerator.brand}</span></>}
          </div>
          <span className="text-gray-500 shrink-0">{formatDateTime(intervention.interventionDate)}</span>
        </div>
        <div className="px-3 py-2 border-t border-white/6 flex items-center justify-between text-xs">
          <span className={`font-semibold px-1.5 py-0.5 rounded-full ${intervention.type === "REPAIR" ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"}`}>
            {intervention.type === "REPAIR" ? "Réparation" : "Entretien"}
          </span>
          <span className="text-gray-500">{intervention.technician.fullName}</span>
        </div>
      </div>

      {/* Reported issue */}
      {intervention.serviceRequest && (
        <div className="bg-[#141414] rounded-xl border border-white/6 p-3 space-y-1">
          <p className="text-[10px] font-semibold text-gray-500 uppercase">Problème signalé</p>
          <p className="text-xs text-gray-400 leading-relaxed">{intervention.serviceRequest.description}</p>
        </div>
      )}

      {/* Work done */}
      <div className="bg-[#141414] rounded-xl border border-white/6 p-3 space-y-1">
        <p className="text-[10px] font-semibold text-gray-500 uppercase">Travail effectué</p>
        <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{intervention.workDone}</p>
        {intervention.notes && (
          <div className="pt-2 mt-2 border-t border-white/6">
            <p className="text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Notes</p>
            <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">{intervention.notes}</p>
          </div>
        )}
      </div>

      {/* Parts & costs */}
      {intervention.costItems.length > 0 && (
        <div className="bg-[#141414] rounded-xl border border-white/6 overflow-hidden">
          <div className="px-3 py-2"><p className="text-[10px] font-semibold text-gray-500 uppercase">Pièces & coûts</p></div>
          <div className="divide-y divide-white/6">
            {intervention.costItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200">{item.itemName}</p>
                  <p className="text-[11px] text-gray-500">{item.quantity} × {item.unitCost.toLocaleString()} BIF</p>
                </div>
                <p className="text-sm font-semibold text-white shrink-0 ml-3">{item.totalCost.toLocaleString()} BIF</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between px-3 py-2.5 bg-white/4 border-t border-white/6">
            <p className="text-xs font-semibold text-gray-300">Total</p>
            <p className="text-sm font-black text-white">{grandTotal.toLocaleString()} BIF</p>
          </div>
        </div>
      )}

      {grandTotal === 0 && (
        <div className="rounded-xl bg-white/4 border border-white/6 px-3 py-3 text-center">
          <p className="text-xs text-gray-500">Aucune pièce ou coût enregistré</p>
        </div>
      )}
    </div>
  );
}
