"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/auth-provider";

/* ─── Types ─── */
interface City { id: string; name: string }
interface Pos { id: string; posName: string; owner: string | null }
interface Fridge { id: string; serialNumber: string; brand: string | null }
interface Alert {
  id: string; type: string; urgency: string; status: string; description: string | null; createdAt: string;
  refrigerator: { serialNumber: string; brand: string | null };
  pos: { posName: string; owner: string | null; city: { name: string } };
  assignedTo: { fullName: string } | null;
}

/* ─── Constants ─── */
const TYPES = [
  { key: "REPARATION", label: "Réparation", emoji: "🔧" },
  { key: "ENTRETIEN", label: "Entretien", emoji: "🛠️" },
];

const URGENCIES = [
  { key: "LOW", label: "Basse", color: "text-gray-500 dark:text-gray-400", active: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 ring-1 ring-gray-300 dark:ring-gray-600" },
  { key: "MEDIUM", label: "Moyenne", color: "text-amber-600 dark:text-amber-400", active: "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-1 ring-amber-400" },
  { key: "HIGH", label: "Haute", color: "text-orange-600 dark:text-orange-400", active: "bg-orange-50 dark:bg-orange-500/15 text-orange-700 dark:text-orange-300 ring-1 ring-orange-400" },
  { key: "CRITICAL", label: "Critique", color: "text-red-600 dark:text-red-400", active: "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300 ring-1 ring-red-400" },
];

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

/* ─── Animated Counter ─── */
function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    if (target === ref.current) return;
    const start = ref.current;
    const diff = target - start;
    const startTime = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + diff * ease));
      if (progress < 1) requestAnimationFrame(tick);
      else ref.current = target;
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return value;
}

function StatCard({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  const animated = useCountUp(value);
  return (
    <div className={`${bg} rounded-2xl p-4 text-center`}>
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{animated}</div>
      <div className="text-xs text-gray-400 font-medium mt-0.5">{label}</div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════ */
export default function AlertsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"form" | "feed" | "stats">("form");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState({ total: 0, PENDING: 0, ASSIGNED: 0, IN_PROGRESS: 0, RESOLVED: 0, CANCELLED: 0 });
  const [loading, setLoading] = useState(true);

  /* Form state */
  const [type, setType] = useState("REPARATION");
  const [urgency, setUrgency] = useState("MEDIUM");
  const [cityId, setCityId] = useState("");
  const [posId, setPosId] = useState("");
  const [fridgeId, setFridgeId] = useState("");
  const [description, setDescription] = useState("");
  const [cities, setCities] = useState<City[]>([]);
  const [positions, setPositions] = useState<Pos[]>([]);
  const [fridges, setFridges] = useState<Fridge[]>([]);
  const [loadingPos, setLoadingPos] = useState(false);
  const [loadingFridges, setLoadingFridges] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  /* Fetch alerts + stats */
  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts");
      const json = await res.json();
      setAlerts((json.alerts || []).slice(0, 15));
      if (json.stats) setStats(json.stats);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchAlerts();
      fetch("/api/cities").then(r => r.json()).then(d => setCities(d.cities || [])).catch(() => {});
    }
  }, [user, fetchAlerts]);

  /* Auto-refresh feed every 15s */
  useEffect(() => {
    if (tab !== "feed") return;
    const id = setInterval(fetchAlerts, 15000);
    return () => clearInterval(id);
  }, [tab, fetchAlerts]);

  /* Cascade: city → POS */
  useEffect(() => {
    if (!cityId) { setPositions([]); setPosId(""); setFridges([]); setFridgeId(""); return; }
    setLoadingPos(true);
    fetch(`/api/pos?cityId=${cityId}`)
      .then(r => r.json())
      .then(d => { setPositions(d.pos || []); setPosId(""); setFridges([]); setFridgeId(""); })
      .catch(() => {})
      .finally(() => setLoadingPos(false));
  }, [cityId]);

  /* Cascade: POS → fridges */
  useEffect(() => {
    if (!posId) { setFridges([]); setFridgeId(""); return; }
    setLoadingFridges(true);
    fetch(`/api/refrigerators?posId=${posId}`)
      .then(r => r.json())
      .then(d => { const list = d.refrigerators || []; setFridges(list); if (list.length === 1) setFridgeId(list[0].id); else setFridgeId(""); })
      .catch(() => {})
      .finally(() => setLoadingFridges(false));
  }, [posId]);

  /* Submit */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fridgeId || !posId) { setErrorMsg("Veuillez sélectionner un PDV et un réfrigérateur."); return; }
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refrigeratorId: fridgeId, posId, type, urgency, description }),
      });
      if (!res.ok) throw new Error("Erreur serveur");
      setSuccessMsg("Alerte envoyée avec succès !");
      setCityId(""); setPosId(""); setFridgeId(""); setDescription(""); setUrgency("MEDIUM"); setType("REPARATION");
      fetchAlerts();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch {
      setErrorMsg("Échec de l'envoi. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  const selectClass = "w-full h-11 px-3 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* Tab switcher */}
        <div className="flex items-center bg-gray-100 dark:bg-white/6 rounded-xl p-1 gap-1">
          {([
            { key: "form", label: "Nouvelle alerte" },
            { key: "feed", label: "Récentes" },
            { key: "stats", label: "Résumé" },
          ] as const).map(t => (
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

        {/* ── TAB: FORM ── */}
        {tab === "form" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type */}
            <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-white/6 p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Type d&apos;intervention</p>
              <div className="grid grid-cols-2 gap-2">
                {TYPES.map(t => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setType(t.key)}
                    className={`flex flex-col items-center gap-1.5 py-3.5 rounded-xl border text-sm font-semibold transition-all ${
                      type === t.key
                        ? "border-amber-400 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300"
                        : "border-gray-200 dark:border-white/8 bg-gray-50 dark:bg-white/3 text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    <span className="text-xl">{t.emoji}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Urgency */}
            <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-white/6 p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Urgence</p>
              <div className="grid grid-cols-4 gap-2">
                {URGENCIES.map(u => (
                  <button
                    key={u.key}
                    type="button"
                    onClick={() => setUrgency(u.key)}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                      urgency === u.key ? u.active : `bg-gray-50 dark:bg-white/3 border border-gray-100 dark:border-white/5 ${u.color}`
                    }`}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cascading selects */}
            <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-white/6 p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Localisation</p>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Ville</label>
                <select value={cityId} onChange={e => setCityId(e.target.value)} className={selectClass}>
                  <option value="">-- Sélectionner une ville --</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Point de vente</label>
                <select value={posId} onChange={e => setPosId(e.target.value)} disabled={!cityId || loadingPos} className={selectClass}>
                  <option value="">{loadingPos ? "Chargement…" : "-- Sélectionner un PDV --"}</option>
                  {positions.map(p => <option key={p.id} value={p.id}>{p.posName}{p.owner ? ` (${p.owner})` : ""}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Réfrigérateur</label>
                <select value={fridgeId} onChange={e => setFridgeId(e.target.value)} disabled={!posId || loadingFridges} className={selectClass}>
                  <option value="">{loadingFridges ? "Chargement…" : "-- Sélectionner un réfrigérateur --"}</option>
                  {fridges.map(f => <option key={f.id} value={f.id}>{f.serialNumber}{f.brand ? ` — ${f.brand}` : ""}</option>)}
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-white/6 p-4">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Description (optionnel)</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="Décrivez le problème observé..."
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/8 rounded-xl text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
              />
            </div>

            {/* Feedback */}
            {successMsg && (
              <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                ✓ {successMsg}
              </div>
            )}
            {errorMsg && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !fridgeId}
              className="w-full h-12 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors"
            >
              {submitting ? "Envoi en cours…" : "Envoyer l'alerte"}
            </button>
          </form>
        )}

        {/* ── TAB: FEED ── */}
        {tab === "feed" && (
          <div className="space-y-2">
            {loading ? (
              <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-white/6 py-14 text-center">
                <div className="animate-pulse flex flex-col items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-white/10" />
                  <div className="w-28 h-2 rounded bg-gray-200 dark:bg-white/10" />
                </div>
              </div>
            ) : alerts.length === 0 ? (
              <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-white/6 py-14 text-center">
                <svg className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg>
                <p className="text-sm text-gray-400">Aucune alerte récente</p>
              </div>
            ) : (
              alerts.map(alert => {
                const sb = statusBadge[alert.status] ?? statusBadge.PENDING;
                const ul = urgencyLabel[alert.urgency] ?? urgencyLabel.LOW;
                return (
                  <div key={alert.id} className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-white/6 p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{alert.pos.posName}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{alert.refrigerator.serialNumber}{alert.refrigerator.brand ? ` — ${alert.refrigerator.brand}` : ""}</p>
                      </div>
                      <span className={`shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full ${sb.bg} ${sb.text}`}>{sb.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className={ul.color}>{ul.text}</span>
                      <span className="text-gray-300 dark:text-gray-600">·</span>
                      <span className="text-gray-400">{alert.pos.city.name}</span>
                      <span className="text-gray-300 dark:text-gray-600">·</span>
                      <span className="text-gray-400">{new Date(alert.createdAt).toLocaleDateString("fr-FR")}</span>
                    </div>
                    {alert.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{alert.description}</p>}
                    {alert.assignedTo && (
                      <p className="text-xs text-blue-500 dark:text-blue-400 mt-1.5">↗ {alert.assignedTo.fullName}</p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── TAB: STATS ── */}
        {tab === "stats" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Total alertes" value={stats.total} color="text-gray-900 dark:text-white" bg="bg-white dark:bg-[#141414] border border-gray-100 dark:border-white/6" />
              <StatCard label="En attente" value={stats.PENDING} color="text-amber-500" bg="bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20" />
              <StatCard label="En cours" value={stats.ASSIGNED + stats.IN_PROGRESS} color="text-blue-500" bg="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20" />
              <StatCard label="Résolues" value={stats.RESOLVED} color="text-emerald-500" bg="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20" />
            </div>
            {/* Distribution bar */}
            {stats.total > 0 && (
              <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-100 dark:border-white/6 p-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Distribution</p>
                <div className="flex rounded-full overflow-hidden h-4 gap-px">
                  {stats.PENDING > 0 && <div className="bg-amber-400" style={{ flex: stats.PENDING }} title={`En attente: ${stats.PENDING}`} />}
                  {(stats.ASSIGNED + stats.IN_PROGRESS) > 0 && <div className="bg-blue-400" style={{ flex: stats.ASSIGNED + stats.IN_PROGRESS }} />}
                  {stats.RESOLVED > 0 && <div className="bg-emerald-400" style={{ flex: stats.RESOLVED }} />}
                  {stats.CANCELLED > 0 && <div className="bg-red-400" style={{ flex: stats.CANCELLED }} />}
                </div>
                <div className="flex flex-wrap gap-3 mt-3">
                  {[
                    { color: "bg-amber-400", label: "En attente", val: stats.PENDING },
                    { color: "bg-blue-400", label: "En cours", val: stats.ASSIGNED + stats.IN_PROGRESS },
                    { color: "bg-emerald-400", label: "Résolu", val: stats.RESOLVED },
                    { color: "bg-red-400", label: "Annulé", val: stats.CANCELLED },
                  ].filter(i => i.val > 0).map(item => (
                    <div key={item.label} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                      {item.label} ({item.val})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


