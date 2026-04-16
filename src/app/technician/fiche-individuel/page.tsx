"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
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
   Fiche Individuel pour Frigo — REPAIR Report
   ════════════════════════════════════════════ */
export default function FicheIndividuelPage() {
  const { user } = useAuth();
  const router = useRouter();

  /* ── Fridge search ── */
  const [fridgeQuery, setFridgeQuery] = useState("");
  const [fridgeResults, setFridgeResults] = useState<Refrigerator[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedFridge, setSelectedFridge] = useState<Refrigerator | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  /* ── Fiche fields (pre-filled from search, editable) ── */
  const [posName, setPosName] = useState("");
  const [address, setAddress] = useState("");
  const [owner, setOwner] = useState("");
  const [phone, setPhone] = useState("");
  const [fridgeId, setFridgeId] = useState("");
  const [brand, setBrand] = useState("");
  const [fridgeType, setFridgeType] = useState("");
  const [puissance, setPuissance] = useState("");

  /* ── Work description ── */
  const [workDone, setWorkDone] = useState("");

  /* ── Submission ── */
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  /* ── Auth guard ── */
  useEffect(() => {
    if (user && user.role !== "TECHNICIAN" && user.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [user, router]);

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
    if (query.trim().length < 2) {
      setFridgeResults([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/refrigerators?search=${encodeURIComponent(query.trim())}&limit=15`);
        const data: Refrigerator[] = await res.json();
        setFridgeResults(data);
        setShowDropdown(true);
      } catch {
        setFridgeResults([]);
      } finally {
        setSearching(false);
      }
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
    setFridgeType(fridge.refrigeratorType || "");
    setPuissance("");
  }

  /* ── Submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFridge || !user) return;
    if (!workDone.trim()) {
      setError("Veuillez décrire le travail effectué.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const notes = [
        puissance ? `Puissance: ${puissance}` : "",
        fridgeType ? `Type: ${fridgeType}` : "",
      ].filter(Boolean).join(" | ");

      const res = await fetch("/api/interventions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refrigeratorId: selectedFridge.id,
          technicianId: user.userId,
          type: "REPAIR",
          interventionDate: new Date().toISOString().split("T")[0],
          workDone: workDone.trim(),
          notes: notes || undefined,
          status: "PENDING",
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

  function resetForm() {
    setSubmitted(false);
    setSelectedFridge(null);
    setFridgeQuery("");
    setPosName("");
    setAddress("");
    setOwner("");
    setPhone("");
    setFridgeId("");
    setBrand("");
    setFridgeType("");
    setPuissance("");
    setWorkDone("");
    setError("");
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
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-0.5">Fiche soumise</h2>
          <p className="text-[11px] text-gray-400 mb-4">
            Rapport de réparation envoyé à l&apos;administration.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={resetForm}
              className="px-4 py-2 rounded-lg bg-teal-500 active:bg-teal-600 text-white text-sm font-semibold transition-colors"
            >
              Nouvelle fiche
            </button>
            <Link
              href="/technician/fiche"
              className="px-4 py-2 rounded-lg bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/6 text-sm font-semibold text-gray-500 active:bg-gray-50 dark:active:bg-white/4 transition-colors"
            >
              Retour
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const inputCls = "w-full px-2.5 py-2 bg-white dark:bg-white/6 border border-gray-200 dark:border-white/6 rounded-lg text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30";

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-lg mx-auto px-3 pt-2 pb-6">

        {/* Back link */}
        <Link href="/technician/fiche" className="inline-flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 font-medium mb-2">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Retour aux fiches
        </Link>

        <form onSubmit={handleSubmit} className="space-y-2.5">

          {/* ── Fridge Search ── */}
          <div ref={searchRef} className="relative">
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-0.5">
              Rechercher un frigo
            </label>
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                value={fridgeQuery}
                onChange={(e) => handleFridgeSearch(e.target.value)}
                onFocus={() => fridgeResults.length > 0 && setShowDropdown(true)}
                placeholder="N° série, PDV ou marque..."
                className="w-full pl-8 pr-3 py-2 bg-white dark:bg-white/6 border border-gray-200 dark:border-white/6 rounded-lg text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-3.5 h-3.5 border-2 border-gray-300 dark:border-gray-600 border-t-teal-500 rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Dropdown */}
            {showDropdown && fridgeResults.length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-lg shadow-xl max-h-52 overflow-auto">
                {fridgeResults.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => selectFridge(f)}
                    className="w-full text-left px-3 py-2 active:bg-gray-50 dark:active:bg-white/5 transition-colors border-b border-gray-50 dark:border-white/4 last:border-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 dark:text-white font-mono">{f.serialNumber}</span>
                      <span className="text-[11px] text-gray-400">{f.brand || "—"}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">{f.pos.posName} · {f.pos.city.name}</p>
                  </button>
                ))}
              </div>
            )}
            {showDropdown && !searching && fridgeResults.length === 0 && fridgeQuery.trim().length >= 2 && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-lg shadow-xl px-3 py-4 text-center">
                <p className="text-xs text-gray-400">Aucun frigo trouvé</p>
              </div>
            )}
          </div>

          {/* ── Fiche Fields ── */}
          <div className="bg-white dark:bg-[#141414] rounded-lg border border-gray-200 dark:border-white/6 p-2.5 space-y-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Informations du frigo</p>

            <div>
              <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-0.5">PDV / POS <span className="text-red-400">*</span></label>
              <input type="text" value={posName} onChange={(e) => setPosName(e.target.value)} required placeholder="Nom du point de vente" className={inputCls} />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-0.5">Adresse</label>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Adresse du PDV" className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-0.5">Propriétaire</label>
                <input type="text" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Nom" className={inputCls} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-0.5">Téléphone</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="N° tél." className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-0.5">ID Frigo <span className="text-red-400">*</span></label>
                <input type="text" value={fridgeId} readOnly placeholder="N° série" className={`${inputCls} bg-gray-50 dark:bg-white/3 cursor-not-allowed`} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-0.5">Marque</label>
                <input type="text" value={brand} readOnly placeholder="Marque" className={`${inputCls} bg-gray-50 dark:bg-white/3 cursor-not-allowed`} />
              </div>
            </div>

            {/* ── Fridge Type & Puissance ── */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-0.5">Type de frigo</label>
                <input type="text" value={fridgeType} onChange={(e) => setFridgeType(e.target.value)} placeholder="Type" className={inputCls} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-0.5">Puissance</label>
                <input type="text" value={puissance} onChange={(e) => setPuissance(e.target.value)} placeholder="ex: 250W" className={inputCls} />
              </div>
            </div>
          </div>

          {/* ── Work Done ── */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-0.5">
              Travail effectué <span className="text-red-400">*</span>
            </label>
            <textarea
              value={workDone}
              onChange={(e) => setWorkDone(e.target.value)}
              required
              rows={3}
              placeholder="Décrivez la réparation effectuée..."
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* ── Error ── */}
          {error && (
            <div className="bg-red-500/10 text-red-400 text-xs px-3 py-2 rounded-lg border border-red-500/20">
              {error}
            </div>
          )}

          {/* ── Submit ── */}
          <button
            type="submit"
            disabled={submitting || !selectedFridge}
            className="w-full h-10 rounded-lg bg-teal-500 active:bg-teal-600 text-white text-sm font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Soumission…" : "Soumettre la fiche"}
          </button>

          {!selectedFridge && (
            <p className="text-center text-[11px] text-gray-400">Sélectionnez un frigo pour remplir la fiche</p>
          )}
        </form>
      </div>
    </div>
  );
}
