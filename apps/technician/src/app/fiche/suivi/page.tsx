"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";

/* ── Types ── */
interface Refrigerator {
  id: string;
  serialNumber: string;
  brand: string | null;
  refrigeratorType: string | null;
  status: string;
  pos: {
    id: string;
    posName: string;
    owner: string | null;
    phoneNumber: string | null;
    streetNo: string | null;
    neighbourhood: string | null;
    city: { name: string };
  };
}

/* ════════════════════════════════════════════
   Fiche de Suivi Entretien — Report Form
   ════════════════════════════════════════════ */
export default function FicheDeSuiviPage() {
  const { user } = useAuth();

  /* ── Fridge search ── */
  const [fridgeQuery, setFridgeQuery] = useState("");
  const [fridgeResults, setFridgeResults] = useState<Refrigerator[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedFridge, setSelectedFridge] = useState<Refrigerator | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  /* ── Fiche fields ── */
  const [posName, setPosName] = useState("");
  const [address, setAddress] = useState("");
  const [owner, setOwner] = useState("");
  const [phone, setPhone] = useState("");
  const [fridgeId, setFridgeId] = useState("");
  const [brand, setBrand] = useState("");

  /* ── Submission ── */
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  /* ── Close dropdown on outside click ── */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* ── Debounced fridge search ── */
  function handleFridgeSearch(query: string) {
    setFridgeQuery(query);
    setSelectedFridge(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setFridgeResults([]); setShowDropdown(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/refrigerators?search=${encodeURIComponent(query.trim())}&limit=15`);
        const data: Refrigerator[] = await res.json();
        setFridgeResults(data);
        setShowDropdown(true);
      } catch { setFridgeResults([]); } finally { setSearching(false); }
    }, 300);
  }

  function selectFridge(fridge: Refrigerator) {
    setSelectedFridge(fridge);
    setFridgeQuery(`${fridge.serialNumber} — ${fridge.pos.posName}`);
    setShowDropdown(false);
    setPosName(fridge.pos.posName);
    setAddress(fridge.pos.streetNo || "");
    setOwner(fridge.pos.owner || "");
    setPhone(fridge.pos.phoneNumber || "");
    setFridgeId(fridge.serialNumber);
    setBrand(fridge.brand || "");
  }

  /* ── Submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFridge || !user) return;
    setError(""); setSubmitting(true);
    try {
      const res = await fetch("/api/interventions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refrigeratorId: selectedFridge.id,
          technicianId: user.userId,
          type: "MAINTENANCE",
          interventionDate: new Date().toISOString().split("T")[0],
          status: "PENDING",
        }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Échec de la soumission"); }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la soumission");
    } finally { setSubmitting(false); }
  };

  function resetForm() {
    setSubmitted(false); setSelectedFridge(null); setFridgeQuery(""); setPosName("");
    setAddress(""); setOwner(""); setPhone(""); setFridgeId(""); setBrand(""); setError("");
  }

  /* ── Success screen ── */
  if (submitted) {
    return (
      <div className="flex-1 flex items-center justify-center px-3">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h2 className="text-base font-bold text-white mb-0.5">Fiche soumise</h2>
          <p className="text-[11px] text-gray-500 mb-4">Rapport d&apos;entretien envoyé à l&apos;administration.</p>
          <div className="flex items-center justify-center gap-2">
            <button onClick={resetForm} className="px-4 py-2 rounded-lg bg-teal-500 active:bg-teal-600 text-white text-sm font-semibold transition-colors">
              Nouvelle fiche
            </button>
            <Link href="/fiche" className="px-4 py-2 rounded-lg bg-[#141414] border border-white/6 text-sm font-semibold text-gray-400 active:bg-white/4 transition-colors">
              Retour
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const inputCls = "w-full px-2.5 py-2 bg-white/6 border border-white/6 rounded-lg text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30";

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-lg mx-auto px-3 pt-2 pb-6">

        <Link href="/fiche" className="inline-flex items-center gap-1 text-xs text-teal-400 font-medium mb-2">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Retour aux fiches
        </Link>

        <form onSubmit={handleSubmit} className="space-y-2.5">

          {/* ── Fridge Search ── */}
          <div ref={searchRef} className="relative">
            <label className="block text-[11px] font-semibold text-gray-500 mb-0.5">Rechercher un frigo</label>
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text" value={fridgeQuery}
                onChange={(e) => handleFridgeSearch(e.target.value)}
                onFocus={() => fridgeResults.length > 0 && setShowDropdown(true)}
                placeholder="N° série, PDV ou marque..."
                className="w-full pl-8 pr-3 py-2 bg-white/6 border border-white/6 rounded-lg text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-3.5 h-3.5 border-2 border-gray-600 border-t-teal-500 rounded-full animate-spin" />
                </div>
              )}
            </div>
            {showDropdown && fridgeResults.length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl max-h-52 overflow-auto">
                {fridgeResults.map((f) => (
                  <button key={f.id} type="button" onClick={() => selectFridge(f)}
                    className="w-full text-left px-3 py-2 active:bg-white/5 transition-colors border-b border-white/4 last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white font-mono">{f.serialNumber}</span>
                      <span className="text-[11px] text-gray-500">{f.brand || "—"}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">{f.pos.posName} · {f.pos.city.name}</p>
                  </button>
                ))}
              </div>
            )}
            {showDropdown && !searching && fridgeResults.length === 0 && fridgeQuery.trim().length >= 2 && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl px-3 py-4 text-center">
                <p className="text-xs text-gray-500">Aucun frigo trouvé</p>
              </div>
            )}
          </div>

          {/* ── Fiche Fields ── */}
          <div className="bg-[#141414] rounded-lg border border-white/6 p-2.5 space-y-2">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Informations de la fiche</p>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-0.5">PDV / POS <span className="text-red-400">*</span></label>
              <input type="text" value={posName} onChange={(e) => setPosName(e.target.value)} required placeholder="Nom du point de vente" className={inputCls} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-0.5">Adresse</label>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Adresse du PDV" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-0.5">Propriétaire</label>
                <input type="text" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Nom" className={inputCls} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-0.5">Téléphone</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="N° tél." className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-0.5">ID Frigo <span className="text-red-400">*</span></label>
                <input type="text" value={fridgeId} readOnly placeholder="N° série" className={`${inputCls} opacity-60 cursor-not-allowed`} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-0.5">Marque</label>
                <input type="text" value={brand} readOnly placeholder="Marque" className={`${inputCls} opacity-60 cursor-not-allowed`} />
              </div>
            </div>
          </div>

          {error && <div className="bg-red-500/10 text-red-400 text-xs px-3 py-2 rounded-lg border border-red-500/20">{error}</div>}

          <button type="submit" disabled={submitting || !selectedFridge}
            className="w-full h-10 rounded-lg bg-teal-500 active:bg-teal-600 text-white text-sm font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? "Soumission…" : "Soumettre la fiche"}
          </button>
          {!selectedFridge && <p className="text-center text-[11px] text-gray-600">Sélectionnez un frigo pour remplir la fiche</p>}
        </form>
      </div>
    </div>
  );
}
