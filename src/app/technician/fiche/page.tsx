"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

/* ════════════════════════════════════════════
   Fiches — Chooser Hub
   Two form types: Suivi (SERVICED) & Individuel (REPAIR)
   ════════════════════════════════════════════ */
export default function FicheHubPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== "TECHNICIAN" && user.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-lg mx-auto px-3 pt-4 pb-6 space-y-4">

        <p className="text-[11px] text-gray-400 text-center">
          Choisissez le type de fiche à remplir
        </p>

        {/* ── Fiche de Suivi — SERVICED ── */}
        <Link
          href="/technician/fiche/suivi"
          className="block bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 p-4 active:scale-[0.98] transition-all"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-teal-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Fiche de Suivi</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Rapport d&apos;entretien (SERVICED)</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-1">
                Collecte de données pour les rapports d&apos;entretien régulier des frigos.
              </p>
            </div>
            <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0 mt-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </div>
        </Link>

        {/* ── Fiche Individuel — REPAIR ── */}
        <Link
          href="/technician/fiche-individuel"
          className="block bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 p-4 active:scale-[0.98] transition-all"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.049.58.025 1.192-.14 1.743" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Fiche Individuel pour Frigo</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Rapport de réparation (REPAIRED)</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-1">
                Fiche détaillée avec puissance et type du frigo pour les rapports de réparation.
              </p>
            </div>
            <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0 mt-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </div>
        </Link>

      </div>
    </div>
  );
}
