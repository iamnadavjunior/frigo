"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/auth-provider";

/* ── Types ── */
interface City { id: string; name: string }
interface PosItem { id: string; posName: string; owner: string | null; cityId: string }
interface Fridge { id: string; serialNumber: string; brand: string | null; posId: string }
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

const pillTabs = [
  { key: "form", label: "Nouvelle alerte", icon: "M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" },
  { key: "feed", label: "Récentes", icon: "M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" },
  { key: "stats", label: "Résumé", icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" },
];

/* ════════════════════════════════════════════════════════════════ */
export default function BrarudiAlertPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("form");

  /* ── Form state ── */
  const [cities, setCities] = useState<City[]>([]);
  const [posList, setPosList] = useState<PosItem[]>([]);
  const [fridges, setFridges] = useState<Fridge[]>([]);
  const [cityId, setCityId] = useState("");
  const [posId, setPosId] = useState("");
  const [fridgeId, setFridgeId] = useState("");
  const [type, setType] = useState<"REPAIR" | "MAINTENANCE">("REPAIR");
  const [urgency, setUrgency] = useState("MEDIUM");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  /* ── Live feed ── */
  const [recentAlerts, setRecentAlerts] = useState<AlertItem[]>([]);
  const [stats, setStats] = useState({ total: 0, PENDING: 0, ASSIGNED: 0, IN_PROGRESS: 0, RESOLVED: 0, CANCELLED: 0 });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    fetch("/api/cities").then(r => r.json()).then(data => {
      const list = Array.isArray(data) ? data : data.cities || [];
      setCities(list.sort((a: City, b: City) => a.name.localeCompare(b.name)));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!cityId) { setPosList([]); setPosId(""); setFridges([]); setFridgeId(""); return; }
    fetch(`/api/pos?cityId=${cityId}&limit=500`).then(r => r.json()).then(data => {
      const list = Array.isArray(data) ? data : data.data || [];
      setPosList(list.sort((a: PosItem, b: PosItem) => a.posName.localeCompare(b.posName)));
    }).catch(() => setPosList([]));
    setPosId(""); setFridges([]); setFridgeId("");
  }, [cityId]);

  useEffect(() => {
    if (!posId) { setFridges([]); setFridgeId(""); return; }
    fetch(`/api/refrigerators?simple=1&posId=${posId}`).then(r => r.json()).then(data => {
      const list = Array.isArray(data) ? data : data.data || [];
      setFridges(list);
      // Auto-select: if only 1 fridge, pick it; otherwise pick first available
      if (list.length >= 1) setFridgeId(list[0].id);
      else setFridgeId("");
    }).catch(() => setFridges([]));
  }, [posId]);

  const fetchAlerts = useCallback(() => {
    fetch("/api/brarudi/alerts").then(r => r.json()).then(data => {
      setRecentAlerts(data.alerts?.slice(0, 15) || []);
      setStats(data.stats || { total: 0, PENDING: 0, ASSIGNED: 0, IN_PROGRESS: 0, RESOLVED: 0, CANCELLED: 0 });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) fetchAlerts();
    const iv = setInterval(fetchAlerts, 15000);
    return () => clearInterval(iv);
  }, [user, fetchAlerts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fridgeId || !posId || !description.trim()) return;
    setSending(true); setError("");
    try {
      const res = await fetch("/api/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refrigeratorId: fridgeId, posId, type, urgency, description: description.trim() }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Erreur"); }
      setSuccess(true);
      setDescription(""); setCityId(""); setPosId(""); setFridgeId("");
      setType("REPAIR"); setUrgency("MEDIUM");
      fetchAlerts();
      setTimeout(() => { setSuccess(false); setActiveTab("feed"); }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally { setSending(false); }
  };

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diff < 1) return "À l'instant";
    if (diff < 60) return `${diff}min`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h`;
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-lg mx-auto px-4 pt-2 pb-4 space-y-3">

        {/* ════ Scrollable pill tabs ════ */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
          {pillTabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
                activeTab === t.key
                  ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                  : "bg-white dark:bg-[#141414] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/8"
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d={t.icon} /></svg>
              {t.label}
            </button>
          ))}
        </div>

        {/* ════ Success toast ════ */}
        {success && (
          <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl px-3 py-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Alerte envoyée !</span>
          </div>
        )}

        {/* ════ FORM TAB ════ */}
        {activeTab === "form" && (
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-2.5">
            {/* Type */}
            <div className="flex gap-2">
              <button type="button" onClick={() => setType("REPAIR")}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${type === "REPAIR" ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20" : "bg-white dark:bg-[#141414] text-gray-500 border-gray-200 dark:border-white/6"}`}>
                🔧 Réparation
              </button>
              <button type="button" onClick={() => setType("MAINTENANCE")}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${type === "MAINTENANCE" ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20" : "bg-white dark:bg-[#141414] text-gray-500 border-gray-200 dark:border-white/6"}`}>
                🛠️ Entretien
              </button>
            </div>

            {/* Urgency pills */}
            <div className="flex gap-1.5">
              {([
                { v: "LOW", l: "Basse", c: "border-gray-300 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300" },
                { v: "MEDIUM", l: "Moyenne", c: "border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400" },
                { v: "HIGH", l: "Haute", c: "border-orange-300 bg-orange-50 text-orange-600 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400" },
                { v: "CRITICAL", l: "Critique", c: "border-red-300 bg-red-50 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400" },
              ] as const).map(o => (
                <button key={o.v} type="button" onClick={() => setUrgency(o.v)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${urgency === o.v ? o.c : "bg-white dark:bg-[#141414] text-gray-400 border-gray-200 dark:border-white/6"}`}>
                  {o.l}
                </button>
              ))}
            </div>

            {/* Cascading selects */}
            <select value={cityId} onChange={e => setCityId(e.target.value)}
              className="w-full h-10 px-3 bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/6 rounded-xl text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30">
              <option value="">📍 Ville...</option>
              {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <select value={posId} onChange={e => setPosId(e.target.value)} disabled={!cityId}
              className="w-full h-10 px-3 bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/6 rounded-xl text-sm text-gray-800 dark:text-gray-200 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-amber-500/30">
              <option value="">{cityId ? "🏪 Point de vente..." : "Choisir une ville d'abord"}</option>
              {posList.map(p => <option key={p.id} value={p.id}>{p.posName}{p.owner ? ` — ${p.owner}` : ""}</option>)}
            </select>

            {/* Fridge auto-selected indicator (read-only) */}
            {posId && fridgeId && fridges.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl">
                <span className="text-sm">❄️</span>
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                  {fridges.find(f => f.id === fridgeId)?.serialNumber}
                  {fridges.find(f => f.id === fridgeId)?.brand ? ` (${fridges.find(f => f.id === fridgeId)?.brand})` : ""}
                </span>
              </div>
            )}
            {posId && fridges.length === 0 && (
              <div className="px-3 py-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl text-xs text-amber-600 dark:text-amber-400 font-medium">
                Aucun frigo trouvé pour ce PDV
              </div>
            )}

            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              placeholder="Décrivez le problème..."
              className="w-full px-3 py-2 bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/6 rounded-xl text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/30" />

            {error && <div className="text-xs text-red-500 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-xl">{error}</div>}

            <button type="submit" disabled={sending || !fridgeId || !posId || !description.trim()}
              className="w-full h-11 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-40 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm">
              {sending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>
                  Envoyer
                </>
              )}
            </button>
          </form>
        )}

        {/* ════ FEED TAB ════ */}
        {activeTab === "feed" && (
          <div className="space-y-2">
            {recentAlerts.length === 0 ? (
              <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 py-10 text-center">
                <svg className="w-8 h-8 text-gray-200 dark:text-gray-700 mx-auto mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>
                <p className="text-xs text-gray-400">Aucune alerte</p>
              </div>
            ) : (
              recentAlerts.map(alert => {
                const st = statusBadge[alert.status] || statusBadge.PENDING;
                return (
                  <div key={alert.id} className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 px-3 py-2.5">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${st.bg} ${st.text}`}>{st.label}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${alert.type === "REPAIR" ? "bg-red-50 dark:bg-red-500/10 text-red-500" : "bg-blue-50 dark:bg-blue-500/10 text-blue-500"}`}>
                          {alert.type === "REPAIR" ? "Répar." : "Entret."}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400">{fmtTime(alert.createdAt)}</span>
                    </div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{alert.pos.posName}</div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                      <span className="font-mono">{alert.refrigerator.serialNumber}</span>
                      <span className="text-gray-300 dark:text-gray-600">·</span>
                      <span>{alert.pos.city.name}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{alert.description}</p>
                    {alert.assignedTo && (
                      <div className="mt-1 text-[10px] text-blue-500 font-medium">→ {alert.assignedTo.fullName}</div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ════ STATS TAB ════ */}
        {activeTab === "stats" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 p-3 text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
                <div className="text-[10px] text-gray-400 font-semibold uppercase">Total envoyé</div>
              </div>
              <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 p-3 text-center">
                <div className="text-2xl font-bold text-amber-500">{stats.PENDING}</div>
                <div className="text-[10px] text-gray-400 font-semibold uppercase">En attente</div>
              </div>
              <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 p-3 text-center">
                <div className="text-2xl font-bold text-blue-500">{stats.ASSIGNED + stats.IN_PROGRESS}</div>
                <div className="text-[10px] text-gray-400 font-semibold uppercase">En cours</div>
              </div>
              <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 p-3 text-center">
                <div className="text-2xl font-bold text-emerald-500">{stats.RESOLVED}</div>
                <div className="text-[10px] text-gray-400 font-semibold uppercase">Résolus</div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 p-3 space-y-2">
              <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Répartition</div>
              {(["PENDING", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CANCELLED"] as const).map(s => {
                const count = stats[s] || 0;
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                const st = statusBadge[s];
                return (
                  <div key={s} className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold w-20 ${st.text}`}>{st.label}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 dark:bg-white/6 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${s === "PENDING" ? "bg-amber-400" : s === "ASSIGNED" ? "bg-blue-400" : s === "IN_PROGRESS" ? "bg-indigo-400" : s === "RESOLVED" ? "bg-emerald-400" : "bg-red-400"}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
