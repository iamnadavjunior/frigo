"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";

/* ─── Types ─── */
interface City { id: string; name: string }
interface PosOption { id: string; posName: string; cityId: string }
interface Fridge {
  id: string;
  serialNumber: string;
  brand: string | null;
  refrigeratorType: string | null;
  status: string;
  createdAt: string;
  pos: { id: string; posName: string; city: { id: string; name: string } };
}

/* ─── Helpers ─── */
const statusCfg: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  ACTIVE:       { label: "Active",       dot: "bg-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
  INACTIVE:     { label: "Inactive",     dot: "bg-gray-400",    bg: "bg-gray-100 dark:bg-white/6",          text: "text-gray-500 dark:text-gray-400" },
  UNDER_REPAIR: { label: "Under Repair", dot: "bg-orange-400",  bg: "bg-orange-50 dark:bg-orange-500/10",   text: "text-orange-600 dark:text-orange-400" },
};

const EMPTY_FORM = { serialNumber: "", posId: "", brand: "", refrigeratorType: "", cityId: "" };

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

function AnimatedStat({ label, value, color }: { label: string; value: number; color: string }) {
  const animated = useCountUp(value);
  return (
    <div className="bg-white dark:bg-[#141414] px-4 py-3 group hover:bg-gray-50/50 dark:hover:bg-white/2 transition-colors">
      <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</div>
      <div className={`text-xl font-bold mt-0.5 ${color} transition-all`}>{animated}</div>
    </div>
  );
}

/* ─── Status Donut ─── */
function StatusDonut({ active, inactive, repair }: { active: number; inactive: number; repair: number }) {
  const total = active + inactive + repair;
  if (total === 0) return null;
  const r = 36, cx = 50, cy = 50, circum = 2 * Math.PI * r;
  const segs = [
    { value: active, color: "#10b981", label: "Active" },
    { value: inactive, color: "#9ca3af", label: "Inactive" },
    { value: repair, color: "#f97316", label: "Repair" },
  ].filter(s => s.value > 0);
  let offset = 0;
  return (
    <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 px-4 py-3">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Status Distribution</div>
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 100 100" className="w-16 h-16 shrink-0 -rotate-90">
          {segs.map(s => {
            const pct = s.value / total;
            const dash = circum * pct;
            const gap = circum - dash;
            const seg = <circle key={s.label} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={8} strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-offset} strokeLinecap="round" className="transition-all duration-700" />;
            offset += dash;
            return seg;
          })}
        </svg>
        <div className="flex flex-col gap-1">
          {segs.map(s => (
            <div key={s.label} className="flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-gray-500 dark:text-gray-400">{s.label}</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300 ml-auto">{s.value}</span>
              <span className="text-gray-400">({Math.round(s.value / total * 100)}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function RefrigeratorsPage() {
  /* ── Data ── */
  const [fridges, setFridges] = useState<Fridge[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [posList, setPosList] = useState<PosOption[]>([]);
  const [loading, setLoading] = useState(true);

  /* ── Filters ── */
  const [search, setSearch] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  /* ── Add-form ── */
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  /* ── Fetch data ── */
  const loadFridges = useCallback(() => {
    setLoading(true);
    fetch("/api/refrigerators?limit=2000")
      .then((r) => r.json())
      .then((d) => { setFridges(Array.isArray(d) ? d : []); setLastRefresh(new Date()); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    loadFridges();
    fetch("/api/cities").then((r) => r.json()).then((d) => setCities(Array.isArray(d) ? d : [])).catch(console.error);
    fetch("/api/pos?limit=5000").then((r) => r.json()).then((d: Record<string, unknown>) => { const arr = Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : []; setPosList(arr); }).catch(console.error);
  }, [loadFridges]);

  // Auto-refresh every 30s
  useEffect(() => {
    const iv = setInterval(loadFridges, 30_000);
    return () => clearInterval(iv);
  }, [loadFridges]);

  /* ── Filtered POS for add-form city selection ── */
  const posForCity = useMemo(() => {
    if (!form.cityId) return [];
    return posList.filter((p) => p.cityId === form.cityId);
  }, [form.cityId, posList]);

  /* ── Filtered fridges list ── */
  const filtered = useMemo(() => {
    let list = fridges;
    if (filterCity) list = list.filter((f) => f.pos.city.id === filterCity);
    if (filterStatus) list = list.filter((f) => f.status === filterStatus);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (f) =>
          f.serialNumber.toLowerCase().includes(q) ||
          (f.brand && f.brand.toLowerCase().includes(q)) ||
          f.pos.posName.toLowerCase().includes(q) ||
          f.pos.city.name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [fridges, filterCity, filterStatus, search]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const total = fridges.length;
    const active = fridges.filter((f) => f.status === "ACTIVE").length;
    const inactive = fridges.filter((f) => f.status === "INACTIVE").length;
    const repair = fridges.filter((f) => f.status === "UNDER_REPAIR").length;
    return { total, active, inactive, repair };
  }, [fridges]);

  /* ── Submit new fridge ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!form.serialNumber.trim()) { setFormError("Serial number is required"); return; }
    if (!form.posId) { setFormError("Please select a Point of Sale"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/refrigerators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serialNumber: form.serialNumber.trim(),
          posId: form.posId,
          brand: form.brand.trim() || null,
          refrigeratorType: form.refrigeratorType.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setFormError(err.error || "Failed to add fridge");
        return;
      }
      setForm(EMPTY_FORM);
      setShowForm(false);
      loadFridges();
    } catch {
      setFormError("Network error");
    } finally {
      setSaving(false);
    }
  };

  /* ── Render ── */
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ════ Header ════ */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 mr-auto">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Fridge Management</h1>
            <p className="text-xs text-gray-400">Register and manage all refrigerators in the system</p>
          </div>
          {lastRefresh && (
            <span className="text-xs text-gray-400 hidden sm:inline">
              Updated {lastRefresh.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={loadFridges}
            disabled={loading}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-white/6 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
            title="Refresh"
          >
            <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
          </button>
          <button
            onClick={() => { setShowForm((v) => !v); setFormError(""); }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${
              showForm
                ? "bg-gray-100 dark:bg-white/6 text-gray-500 border border-gray-200 dark:border-white/8"
                : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
            }`}
          >
            {showForm ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                Cancel
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Add Fridge
              </>
            )}
          </button>
        </div>

        {/* ════ Add Fridge Form ════ */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white dark:bg-[#141414] rounded-xl border border-emerald-200 dark:border-emerald-500/20 overflow-hidden">
            <div className="px-4 py-3 border-b border-emerald-100 dark:border-emerald-500/10 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              </div>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Register New Fridge</span>
            </div>

            <div className="p-4 space-y-4">
              {/* Step 1: Location */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-xs font-bold text-emerald-500">1</span>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Select Location</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-7">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">City *</label>
                    <select
                      value={form.cityId}
                      onChange={(e) => setForm({ ...form, cityId: e.target.value, posId: "" })}
                      className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/8 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition [&>option]:bg-white [&>option]:dark:bg-[#1a1a1a]"
                    >
                      <option value="">Choose a city...</option>
                      {cities.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Point of Sale *</label>
                    <select
                      value={form.posId}
                      onChange={(e) => setForm({ ...form, posId: e.target.value })}
                      disabled={!form.cityId}
                      className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/8 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition disabled:opacity-40 disabled:cursor-not-allowed [&>option]:bg-white [&>option]:dark:bg-[#1a1a1a]"
                    >
                      <option value="">{form.cityId ? `Choose POS (${posForCity.length} available)...` : "Select a city first"}</option>
                      {posForCity.map((p) => (
                        <option key={p.id} value={p.id}>{p.posName}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Step 2: Fridge Details */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-xs font-bold text-emerald-500">2</span>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Fridge Details</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pl-7">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Serial Number *</label>
                    <input
                      type="text"
                      value={form.serialNumber}
                      onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                      placeholder="e.g. FRG-2024-001"
                      className="w-full px-3 py-2 text-sm font-mono bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/8 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Brand</label>
                    <input
                      type="text"
                      value={form.brand}
                      onChange={(e) => setForm({ ...form, brand: e.target.value })}
                      placeholder="e.g. Samsung, LG, Haier"
                      className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/8 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Type</label>
                    <input
                      type="text"
                      value={form.refrigeratorType}
                      onChange={(e) => setForm({ ...form, refrigeratorType: e.target.value })}
                      placeholder="e.g. Chest Freezer, Upright"
                      className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/8 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* Error + Submit */}
              {formError && (
                <div className="ml-7 flex items-center gap-2 text-xs text-red-500 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
                  {formError}
                </div>
              )}
              <div className="flex items-center justify-end gap-2 pl-7">
                <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setFormError(""); }} className="px-4 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg shadow-sm transition"
                >
                  {saving ? "Adding..." : "Register Fridge"}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ════ Stats Strip — Animated ════ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-200 dark:bg-white/6 rounded-xl overflow-hidden">
          <AnimatedStat label="Total Fridges" value={stats.total} color="text-gray-900 dark:text-white" />
          <AnimatedStat label="Active" value={stats.active} color="text-emerald-500" />
          <AnimatedStat label="Inactive" value={stats.inactive} color="text-gray-400" />
          <AnimatedStat label="Under Repair" value={stats.repair} color="text-orange-500" />
        </div>

        {/* ════ Status Donut ════ */}
        <StatusDonut active={stats.active} inactive={stats.inactive} repair={stats.repair} />

        {/* ════ Search + Filters ════ */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-50 max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search serial, brand, POS, city..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/8 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:ring-2 focus:ring-gray-200 dark:focus:ring-white/10 outline-none transition"
            />
          </div>
          <select
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            className="px-3 py-2 text-xs bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/8 rounded-lg text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-white/10 transition [&>option]:bg-white [&>option]:dark:bg-[#1a1a1a]"
          >
            <option value="">All Cities</option>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-xs bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/8 rounded-lg text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-white/10 transition [&>option]:bg-white [&>option]:dark:bg-[#1a1a1a]"
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="UNDER_REPAIR">Under Repair</option>
          </select>
          {(search || filterCity || filterStatus) && (
            <button
              onClick={() => { setSearch(""); setFilterCity(""); setFilterStatus(""); }}
              className="px-2.5 py-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
            >
              Clear
            </button>
          )}
          <span className="ml-auto text-xs text-gray-400">{filtered.length} fridge{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* ════ Fridge Table ════ */}
        <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-sm text-gray-400">Loading fridges...</div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/6 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-300 dark:text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93 4.93 19.07" /></svg>
              </div>
              <p className="text-sm text-gray-400 mb-1">No fridges found</p>
              <p className="text-xs text-gray-300 dark:text-gray-600">
                {fridges.length > 0 ? "Try adjusting your filters" : "Click \"Add Fridge\" to register your first unit"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/5">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Serial Number</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Brand</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Point of Sale</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">City</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-white/4">
                  {filtered.map((f) => {
                    const st = statusCfg[f.status] || statusCfg.ACTIVE;
                    return (
                      <tr key={f.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/2 transition-colors">
                        <td className="px-4 py-2.5">
                          <Link href={`/refrigerators/${f.id}`} className="font-mono text-xs font-semibold text-gray-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                            {f.serialNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{f.brand || "—"}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{f.refrigeratorType || "—"}</td>
                        <td className="px-4 py-2.5">
                          <Link href={`/pos/${f.pos.id}`} className="text-xs text-gray-600 dark:text-gray-400 hover:text-emerald-500 transition-colors">
                            {f.pos.posName}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-400">{f.pos.city.name}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-400 font-mono">
                          {new Date(f.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
