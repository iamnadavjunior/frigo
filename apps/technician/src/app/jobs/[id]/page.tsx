"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";

interface ServiceRequest {
  id: string;
  type: "REPAIR" | "MAINTENANCE";
  urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: string;
  description: string;
  createdAt: string;
  assignedAt: string | null;
  refrigerator: { id: string; serialNumber: string; brand: string | null; refrigeratorType: string | null };
  pos: { id: string; posName: string; owner: string | null; neighbourhood: string | null; city: { name: string } };
}

interface CostItem {
  itemName: string;
  quantity: number;
  unitCost: number;
}

const urgencyColor: Record<string, string> = {
  CRITICAL: "text-red-400 bg-red-500/10",
  HIGH:     "text-orange-400 bg-orange-500/10",
  MEDIUM:   "text-yellow-400 bg-yellow-500/10",
  LOW:      "text-gray-400 bg-white/5",
};

export default function TechnicianReportPage() {
  const { user } = useAuth();
  const params = useParams();
  const jobId = params.id as string;

  const [job, setJob] = useState<ServiceRequest | null>(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [workDone, setWorkDone] = useState("");
  const [notes, setNotes] = useState("");
  const [costItems, setCostItems] = useState<CostItem[]>([]);

  useEffect(() => {
    if (!jobId) return;
    fetch(`/api/service-requests/${jobId}`)
      .then((r) => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then((data: ServiceRequest) => setJob(data))
      .catch(() => setLoadingJob(false))
      .finally(() => setLoadingJob(false));
  }, [jobId]);

  const addCostItem = () => setCostItems([...costItems, { itemName: "", quantity: 1, unitCost: 0 }]);
  const removeCostItem = (i: number) => setCostItems(costItems.filter((_, idx) => idx !== i));
  const updateCostItem = (i: number, field: keyof CostItem, value: string | number) => {
    const updated = [...costItems];
    (updated[i] as unknown as Record<string, unknown>)[field] = value;
    setCostItems(updated);
  };

  const totalCost = costItems.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job || !user) return;
    if (!workDone.trim()) { setError("Veuillez décrire le travail effectué."); return; }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/interventions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refrigeratorId: job.refrigerator.id,
          technicianId: user.userId,
          serviceRequestId: job.id,
          type: job.type,
          interventionDate: new Date().toISOString().split("T")[0],
          issueDescription: job.description,
          workDone: workDone.trim(),
          status: "COMPLETED",
          notes: notes.trim() || null,
          costItems: costItems.filter((c) => c.itemName.trim()),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Échec de la soumission");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la soumission");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingJob) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/10" />
          <div className="w-20 h-1.5 rounded bg-white/10" />
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-3 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mb-3">
          <svg className="w-7 h-7 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <h2 className="text-base font-bold text-white mb-0.5">Rapport soumis</h2>
        <p className="text-gray-500 text-[11px] mb-4">Fiche enregistrée, tâche marquée comme résolue.</p>
        <Link href="/jobs" className="px-4 py-2 rounded-lg bg-teal-500 active:bg-teal-600 text-white text-sm font-semibold transition-colors">
          Retour aux tâches
        </Link>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-lg mx-auto px-3 py-16 text-center">
        <p className="text-gray-500 text-sm">Tâche introuvable.</p>
        <Link href="/jobs" className="text-teal-400 text-sm mt-3 inline-block">← Retour</Link>
      </div>
    );
  }

  const inputCls = "w-full px-2.5 py-2 bg-[#141414] border border-white/6 rounded-lg text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30";

  return (
    <div className="max-w-lg mx-auto px-3 pt-1 pb-8">
      <Link href="/jobs" className="inline-flex items-center gap-1 text-[11px] text-gray-500 active:text-gray-300 mb-2">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Mes tâches
      </Link>

      <form onSubmit={handleSubmit} className="space-y-2.5">

        {/* Job info summary */}
        <div className="bg-[#141414] rounded-lg border border-white/6 overflow-hidden">
          <div className="px-3 py-2 flex items-center justify-between">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white truncate">{job.pos.posName}</h3>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {job.pos.city.name}{job.pos.neighbourhood ? ` · ${job.pos.neighbourhood}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${urgencyColor[job.urgency]}`}>{job.urgency}</span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${job.type === "REPAIR" ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"}`}>
                {job.type === "REPAIR" ? "Répar." : "Entret."}
              </span>
            </div>
          </div>
          <div className="px-3 py-2 border-t border-white/6 flex items-center gap-3 text-xs text-gray-500">
            <span className="font-mono font-medium text-gray-300">{job.refrigerator.serialNumber}</span>
            {job.refrigerator.brand && <><span className="text-gray-700">·</span><span>{job.refrigerator.brand}</span></>}
            {job.refrigerator.refrigeratorType && <><span className="text-gray-700">·</span><span>{job.refrigerator.refrigeratorType}</span></>}
          </div>
          <div className="px-3 py-2 border-t border-white/6">
            <p className="text-[10px] font-semibold text-gray-600 uppercase mb-0.5">Problème signalé</p>
            <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">{job.description}</p>
          </div>
        </div>

        {/* Work Done */}
        <div className="space-y-2">
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-0.5">
              Travail effectué <span className="text-red-400">*</span>
            </label>
            <textarea
              value={workDone}
              onChange={(e) => setWorkDone(e.target.value)}
              required rows={3}
              placeholder="Décrivez ce que vous avez fait..."
              className={`${inputCls} resize-none`}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-0.5">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Observations, avertissements..."
              className={`${inputCls} resize-none`}
            />
          </div>
        </div>

        {/* Parts / Cost Items */}
        <div className="bg-[#141414] rounded-lg border border-white/6 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-gray-600 uppercase">Pièces & matériel</p>
            <button type="button" onClick={addCostItem} className="text-xs text-teal-400 font-semibold px-2 py-1 rounded-lg active:bg-teal-500/10">
              + Ajouter
            </button>
          </div>
          {costItems.length === 0 ? (
            <p className="text-xs text-gray-600 py-1">Aucune pièce. Touchez « Ajouter » si nécessaire.</p>
          ) : (
            <div className="space-y-2">
              {costItems.map((item, i) => (
                <div key={i} className="space-y-1.5 bg-white/4 rounded-lg p-2">
                  <div className="flex gap-2 items-center">
                    <input
                      type="text" placeholder="Nom de la pièce" value={item.itemName}
                      onChange={(e) => updateCostItem(i, "itemName", e.target.value)}
                      className={`flex-1 ${inputCls}`}
                    />
                    <button type="button" onClick={() => removeCostItem(i)}
                      className="w-7 h-7 flex items-center justify-center text-gray-600 active:text-red-400 rounded-lg shrink-0">×</button>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-600 mb-0.5 block">Qté</label>
                      <input type="number" min="1" value={item.quantity}
                        onChange={(e) => updateCostItem(i, "quantity", parseInt(e.target.value) || 1)}
                        className={`${inputCls} text-center`} />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-600 mb-0.5 block">Coût unit. (BIF)</label>
                      <input type="number" min="0" value={item.unitCost}
                        onChange={(e) => updateCostItem(i, "unitCost", parseFloat(e.target.value) || 0)}
                        className={inputCls} />
                    </div>
                  </div>
                </div>
              ))}
              <div className="text-right text-sm font-semibold text-gray-300 pt-1.5 border-t border-white/6">
                Total: {totalCost.toLocaleString()} BIF
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-400 text-xs px-3 py-2 rounded-lg border border-red-500/20">{error}</div>
        )}

        <button
          type="submit" disabled={submitting}
          className="w-full h-10 rounded-lg bg-teal-500 active:bg-teal-600 text-white text-sm font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
              Soumettre le rapport
            </>
          )}
        </button>
      </form>
    </div>
  );
}
