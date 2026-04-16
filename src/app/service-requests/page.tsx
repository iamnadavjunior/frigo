"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";

/* ── Types ── */
interface ServiceRequest {
  id: string;
  type: "REPAIR" | "MAINTENANCE";
  urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "PENDING" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED";
  description: string;
  contactName: string | null;
  contactPhone: string | null;
  adminNotes: string | null;
  createdAt: string;
  assignedAt: string | null;
  resolvedAt: string | null;
  refrigerator: { id: string; serialNumber: string; brand: string | null; status: string };
  pos: { id: string; posName: string; owner: string | null; neighbourhood: string | null; city: { id: string; name: string } };
  assignedTo: { id: string; fullName: string } | null;
}
interface Technician { id: string; fullName: string; }
interface FridgeOption { id: string; serialNumber: string; posId: string; posName: string; }

/* ── Helpers ── */
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
function fmtTime(iso: string) { return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); }
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ── Urgency / Status visuals ── */
const urgencyMeta: Record<string, { label: string; color: string; dot: string }> = {
  CRITICAL: { label: "Critical", color: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10", dot: "bg-red-500" },
  HIGH: { label: "High", color: "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-500/10", dot: "bg-orange-500" },
  MEDIUM: { label: "Medium", color: "text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-500/10", dot: "bg-yellow-500" },
  LOW: { label: "Low", color: "text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-white/6", dot: "bg-gray-400" },
};
const statusMeta: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pending", color: "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10" },
  ASSIGNED: { label: "Assigned", color: "text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10" },
  IN_PROGRESS: { label: "In Progress", color: "text-indigo-700 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-500/10" },
  RESOLVED: { label: "Resolved", color: "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-500/10" },
  CANCELLED: { label: "Cancelled", color: "text-gray-500 bg-gray-50 dark:text-gray-500 dark:bg-white/4" },
};

function UrgencyBadge({ u }: { u: string }) {
  const m = urgencyMeta[u] || urgencyMeta.MEDIUM;
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${m.color}`}><span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />{m.label}</span>;
}
function StatusBadge({ s }: { s: string }) {
  const m = statusMeta[s] || statusMeta.PENDING;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${m.color}`}>{m.label}</span>;
}

/* ── Icons ── */
function IcnPlus({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
}
function IcnWrench({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.049.58.025 1.194-.14 1.743" /></svg>;
}
function IcnCog({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>;
}
function IcnX({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>;
}
function IcnUser({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>;
}
function IcnMapPin({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>;
}
function IcnPhone({ className = "w-4 h-4" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>;
}

/* ═══════════════════════════════════════════════════════════
   Service Requests Page
   ═══════════════════════════════════════════════════════════ */
export default function ServiceRequestsPage() {
  useAuth();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [fridges, setFridges] = useState<FridgeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"PENDING" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "ALL">("ALL");
  const [showNewModal, setShowNewModal] = useState(false);
  const [assignModal, setAssignModal] = useState<ServiceRequest | null>(null);
  const [detailPanel, setDetailPanel] = useState<ServiceRequest | null>(null);

  const fetchAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/service-requests").then(r => r.json()),
      fetch("/api/pos?role=TECHNICIAN").then(r => r.json()).catch(() => []),
    ])
      .then(([sr, techs]) => {
        setRequests(sr);
        if (Array.isArray(techs)) setTechnicians(techs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Fetch technicians from users
  useEffect(() => {
    // Fetch technicians directly
    fetch("/api/service-requests/technicians").then(r => r.json()).catch(() => []).then(data => {
      if (Array.isArray(data)) setTechnicians(data);
    });
    // Fetch fridges for the new request modal
    fetch("/api/refrigerators?simple=1").then(r => r.json()).catch(() => []).then(data => {
      if (Array.isArray(data)) setFridges(data);
    });
  }, []);

  const filtered = useMemo(() => {
    if (tab === "ALL") return requests;
    return requests.filter(r => r.status === tab);
  }, [requests, tab]);

  const counts = useMemo(() => ({
    ALL: requests.length,
    PENDING: requests.filter(r => r.status === "PENDING").length,
    ASSIGNED: requests.filter(r => r.status === "ASSIGNED").length,
    IN_PROGRESS: requests.filter(r => r.status === "IN_PROGRESS").length,
    RESOLVED: requests.filter(r => r.status === "RESOLVED").length,
  }), [requests]);

  /* ── Assign technician ── */
  const handleAssign = async (requestId: string, techId: string) => {
    const res = await fetch(`/api/service-requests/${requestId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToId: techId }),
    });
    if (res.ok) {
      const updated = await res.json();
      setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
      setAssignModal(null);
    }
  };

  /* ── Update status ── */
  const handleStatus = async (requestId: string, status: string) => {
    const res = await fetch(`/api/service-requests/${requestId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
      setDetailPanel(prev => prev?.id === updated.id ? updated : prev);
    }
  };

  const tabs: { key: typeof tab; label: string }[] = [
    { key: "ALL", label: "All" },
    { key: "PENDING", label: "Pending" },
    { key: "ASSIGNED", label: "Assigned" },
    { key: "IN_PROGRESS", label: "In Progress" },
    { key: "RESOLVED", label: "Resolved" },
  ];

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Service Requests</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage repair &amp; maintenance requests — replaces the WhatsApp group</p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <IcnPlus className="w-4 h-4" />
            New Request
          </button>
        </div>

        {/* Summary cards */}
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-200 dark:bg-white/6 rounded-xl overflow-hidden">
            <div className="bg-white dark:bg-[#141414] px-4 py-3">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Pending</div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-bold text-amber-500">{counts.PENDING}</span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">Awaiting assignment</div>
            </div>
            <div className="bg-white dark:bg-[#141414] px-4 py-3">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Assigned</div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-bold text-blue-500">{counts.ASSIGNED}</span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">Technician dispatched</div>
            </div>
            <div className="bg-white dark:bg-[#141414] px-4 py-3">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">In Progress</div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-bold text-indigo-500">{counts.IN_PROGRESS}</span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">Being worked on</div>
            </div>
            <div className="bg-white dark:bg-[#141414] px-4 py-3">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Resolved</div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-bold text-emerald-500">{counts.RESOLVED}</span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">Completed</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div>
          <div className="flex gap-1 bg-gray-100 dark:bg-white/4 rounded-lg p-1">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                  tab === t.key
                    ? "bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {t.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  tab === t.key ? "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400" : "bg-gray-200 text-gray-500 dark:bg-white/8 dark:text-gray-500"
                }`}>{counts[t.key]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Request list */}
        <div className="flex gap-4">
          {/* Left: list */}
          <div className={`flex-1 space-y-2 ${detailPanel ? "max-w-[55%]" : ""}`}>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 p-4 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-white/10" />
                    <div className="flex-1 space-y-2">
                      <div className="w-2/3 h-3 bg-gray-200 dark:bg-white/10 rounded" />
                      <div className="w-1/3 h-3 bg-gray-200 dark:bg-white/10 rounded" />
                    </div>
                  </div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 p-12 text-center">
                <IcnCog className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No service requests</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Create a new request when a POS needs repair or maintenance</p>
              </div>
            ) : (
              filtered.map(sr => (
                <div
                  key={sr.id}
                  onClick={() => setDetailPanel(sr)}
                  className={`group bg-white dark:bg-[#141414] rounded-xl border transition-all cursor-pointer ${
                    detailPanel?.id === sr.id
                      ? "border-blue-300 dark:border-blue-500/40 ring-1 ring-blue-100 dark:ring-blue-500/20"
                      : "border-gray-200 dark:border-white/6 hover:border-gray-300 dark:hover:border-white/10"
                  } p-4`}
                >
                  <div className="flex items-start gap-3">
                    {/* Type icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      sr.type === "REPAIR"
                        ? "bg-orange-50 dark:bg-orange-500/10 text-orange-500"
                        : "bg-blue-50 dark:bg-blue-500/10 text-blue-500"
                    }`}>
                      {sr.type === "REPAIR" ? <IcnWrench className="w-5 h-5" /> : <IcnCog className="w-5 h-5" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Row 1: type + urgency + status */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-gray-900 dark:text-white uppercase">{sr.type}</span>
                        <UrgencyBadge u={sr.urgency} />
                        <StatusBadge s={sr.status} />
                        <span className="text-xs text-gray-400 ml-auto shrink-0">{timeAgo(sr.createdAt)}</span>
                      </div>

                      {/* Row 2: description */}
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 line-clamp-2">{sr.description}</p>

                      {/* Row 3: fridge + location */}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="font-mono">{sr.refrigerator.serialNumber}</span>
                        <span>·</span>
                        <span>{sr.pos.posName}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1"><IcnMapPin className="w-3 h-3" />{sr.pos.city.name}{sr.pos.neighbourhood ? `, ${sr.pos.neighbourhood}` : ""}</span>
                      </div>

                      {/* Row 4: assigned tech or assign button */}
                      <div className="flex items-center gap-2 mt-2">
                        {sr.assignedTo ? (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                            <IcnUser className="w-3 h-3" />
                            {sr.assignedTo.fullName}
                          </span>
                        ) : sr.status === "PENDING" ? (
                          <button
                            onClick={e => { e.stopPropagation(); setAssignModal(sr); }}
                            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            + Assign Technician
                          </button>
                        ) : null}
                        {sr.contactPhone && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-400 ml-auto">
                            <IcnPhone className="w-3 h-3" />
                            {sr.contactPhone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right: detail panel */}
          {detailPanel && (
            <div className="w-[45%] shrink-0 hidden lg:block">
              <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 p-5 sticky top-16">
                {/* Close */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Request Details</h3>
                  <button onClick={() => setDetailPanel(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><IcnX className="w-4 h-4" /></button>
                </div>

                {/* Meta */}
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900 dark:text-white uppercase">{detailPanel.type}</span>
                    <UrgencyBadge u={detailPanel.urgency} />
                    <StatusBadge s={detailPanel.status} />
                  </div>

                  <p className="text-gray-700 dark:text-gray-300">{detailPanel.description}</p>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 dark:border-white/6">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">Fridge</div>
                      <Link href={`/refrigerators/${detailPanel.refrigerator.id}`} className="text-sm font-mono text-blue-600 dark:text-blue-400 hover:underline">{detailPanel.refrigerator.serialNumber}</Link>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">Point of Sale</div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">{detailPanel.pos.posName}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">Location</div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">{detailPanel.pos.city.name}{detailPanel.pos.neighbourhood ? `, ${detailPanel.pos.neighbourhood}` : ""}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">Submitted</div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">{fmtDate(detailPanel.createdAt)} {fmtTime(detailPanel.createdAt)}</div>
                    </div>
                    {detailPanel.contactName && (
                      <div>
                        <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">Contact</div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">{detailPanel.contactName}</div>
                      </div>
                    )}
                    {detailPanel.contactPhone && (
                      <div>
                        <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">Phone</div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">{detailPanel.contactPhone}</div>
                      </div>
                    )}
                  </div>

                  {/* Assigned tech */}
                  <div className="pt-3 border-t border-gray-100 dark:border-white/6">
                    <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Assigned Technician</div>
                    {detailPanel.assignedTo ? (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400">
                          {detailPanel.assignedTo.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{detailPanel.assignedTo.fullName}</div>
                          {detailPanel.assignedAt && <div className="text-xs text-gray-400">Assigned {fmtDate(detailPanel.assignedAt)}</div>}
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAssignModal(detailPanel)}
                        className="w-full py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border border-dashed border-blue-300 dark:border-blue-500/30 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/5 transition-colors"
                      >
                        + Assign Technician
                      </button>
                    )}
                  </div>

                  {/* Status actions */}
                  <div className="pt-3 border-t border-gray-100 dark:border-white/6 flex gap-2">
                    {detailPanel.status === "ASSIGNED" && (
                      <button onClick={() => handleStatus(detailPanel.id, "IN_PROGRESS")} className="flex-1 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
                        Mark In Progress
                      </button>
                    )}
                    {(detailPanel.status === "IN_PROGRESS" || detailPanel.status === "ASSIGNED") && (
                      <button onClick={() => handleStatus(detailPanel.id, "RESOLVED")} className="flex-1 py-2 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
                        Mark Resolved
                      </button>
                    )}
                    {detailPanel.status !== "CANCELLED" && detailPanel.status !== "RESOLVED" && (
                      <button onClick={() => handleStatus(detailPanel.id, "CANCELLED")} className="py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/4 transition-colors">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Assign Modal ── */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setAssignModal(null)}>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-white/10 shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Assign Technician</h3>
              <button onClick={() => setAssignModal(null)} className="text-gray-400 hover:text-gray-600"><IcnX className="w-4 h-4" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-1">
              <span className="font-mono">{assignModal.refrigerator.serialNumber}</span> — {assignModal.pos.posName}
            </p>
            <p className="text-xs text-gray-400 mb-4">{assignModal.description}</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {technicians.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No technicians found</p>
              ) : (
                technicians.map(tech => (
                  <button
                    key={tech.id}
                    onClick={() => handleAssign(assignModal.id, tech.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-500/30 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition-all text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">
                      {tech.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{tech.fullName}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── New Request Modal ── */}
      {showNewModal && (
        <NewRequestModal
          fridges={fridges}
          onClose={() => setShowNewModal(false)}
          onCreated={sr => { setRequests(prev => [sr, ...prev]); setShowNewModal(false); }}
        />
      )}
    </div>
  );
}

/* ── New Request Modal ── */
function NewRequestModal({ fridges, onClose, onCreated }: {
  fridges: FridgeOption[];
  onClose: () => void;
  onCreated: (sr: ServiceRequest) => void;
}) {
  const [type, setType] = useState<"REPAIR" | "MAINTENANCE">("REPAIR");
  const [urgency, setUrgency] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
  const [fridgeId, setFridgeId] = useState("");
  const [description, setDescription] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredFridges = useMemo(() => {
    if (!searchTerm) return fridges.slice(0, 50);
    const q = searchTerm.toLowerCase();
    return fridges.filter(f => f.serialNumber.toLowerCase().includes(q) || f.posName.toLowerCase().includes(q)).slice(0, 50);
  }, [fridges, searchTerm]);

  const selectedFridge = fridges.find(f => f.id === fridgeId);

  const handleSubmit = async () => {
    if (!fridgeId || !description.trim()) { setError("Select a fridge and provide a description"); return; }
    const fridge = fridges.find(f => f.id === fridgeId);
    if (!fridge) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refrigeratorId: fridgeId, posId: fridge.posId, type, urgency, description: description.trim(), contactName: contactName.trim() || null, contactPhone: contactPhone.trim() || null }),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Failed to create"); }
      const sr = await res.json();
      onCreated(sr);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create request");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-white/10 shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">New Service Request</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><IcnX className="w-4 h-4" /></button>
        </div>

        <div className="space-y-4">
          {/* Type */}
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Request Type</label>
            <div className="flex gap-2">
              {(["REPAIR", "MAINTENANCE"] as const).map(t => (
                <button key={t} onClick={() => setType(t)} className={`flex-1 py-2.5 px-3 text-xs font-medium rounded-lg border transition-all ${
                  type === t
                    ? t === "REPAIR" ? "border-orange-300 dark:border-orange-500/40 bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400" : "border-blue-300 dark:border-blue-500/40 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400"
                    : "border-gray-200 dark:border-white/10 text-gray-500 hover:border-gray-300"
                }`}>{t === "REPAIR" ? "🔧 Repair" : "⚙️ Maintenance"}</button>
              ))}
            </div>
          </div>

          {/* Urgency */}
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Urgency</label>
            <div className="flex gap-2">
              {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map(u => {
                const m = urgencyMeta[u];
                return (
                  <button key={u} onClick={() => setUrgency(u)} className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${
                    urgency === u ? `${m.color} border-current` : "border-gray-200 dark:border-white/10 text-gray-500 hover:border-gray-300"
                  }`}>{m.label}</button>
                );
              })}
            </div>
          </div>

          {/* Fridge */}
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Refrigerator</label>
            <input
              type="text"
              placeholder="Search by serial number or POS name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 mb-2"
            />
            {selectedFridge && (
              <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-500/20">
                <span className="text-xs font-mono text-blue-700 dark:text-blue-400">{selectedFridge.serialNumber}</span>
                <span className="text-xs text-gray-500">— {selectedFridge.posName}</span>
                <button onClick={() => setFridgeId("")} className="ml-auto text-gray-400 hover:text-gray-600"><IcnX className="w-3 h-3" /></button>
              </div>
            )}
            {!selectedFridge && (
              <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-white/10 rounded-lg divide-y divide-gray-100 dark:divide-white/6">
                {filteredFridges.map(f => (
                  <button key={f.id} onClick={() => { setFridgeId(f.id); setSearchTerm(""); }} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-white/4 transition-colors">
                    <span className="text-xs font-mono text-gray-900 dark:text-white">{f.serialNumber}</span>
                    <span className="text-xs text-gray-500">{f.posName}</span>
                  </button>
                ))}
                {filteredFridges.length === 0 && <div className="px-3 py-4 text-xs text-gray-400 text-center">No fridges found</div>}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Description</label>
            <textarea
              rows={3}
              placeholder="Describe the issue or service needed..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
            />
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Contact Name (optional)</label>
              <input type="text" placeholder="POS owner name" value={contactName} onChange={e => setContactName(e.target.value)} className="w-full px-3 py-2 text-sm bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Phone (optional)</label>
              <input type="tel" placeholder="+257 ..." value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="w-full px-3 py-2 text-sm bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </div>
    </div>
  );
}
