"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";

interface Intervention {
  id: string;
  type: string;
  status: string;
  interventionDate: string;
  issueDescription: string | null;
  workDone: string | null;
  refrigerator: {
    serialNumber: string;
    pos: { posName: string; city: { name: string } };
  };
  technician: { fullName: string };
  costItems: Array<{ totalCost: number }>;
  _count: { attachments: number };
}

interface City {
  id: string;
  name: string;
}
interface Technician {
  id: string;
  fullName: string;
}

export default function InterventionsListPage() {
  const { user } = useAuth();
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [cityId, setCityId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [cities, setCities] = useState<City[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/lookups")
      .then((res) => res.json())
      .then((data) => {
        setCities(data.cities || []);
        setTechnicians(data.technicians || []);
      })
      .catch(console.error);
  }, []);

  const fetchInterventions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (type) params.set("type", type);
    if (status) params.set("status", status);
    if (technicianId) params.set("technicianId", technicianId);
    if (cityId) params.set("cityId", cityId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    params.set("page", String(page));
    params.set("limit", "25");

    try {
      const res = await fetch(`/api/interventions?${params}`);
      const data = await res.json();
      setInterventions(data.data || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Failed to fetch interventions:", error);
    } finally {
      setLoading(false);
    }
  }, [search, type, status, technicianId, cityId, dateFrom, dateTo, page]);

  useEffect(() => {
    fetchInterventions();
  }, [fetchInterventions]);

  const totalPages = Math.ceil(total / 25);
  const canCreate = user?.role === "ADMIN" || user?.role === "TECHNICIAN";

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Interventions</h1>
          <p className="text-sm text-gray-500">{total} total</p>
        </div>
        {canCreate && (
          <Link
            href="/interventions/new"
            className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            + New Intervention
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.06] rounded-md text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-500 w-48 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
        />
        <select
          value={type}
          onChange={(e) => { setType(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.06] rounded-md text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
        >
          <option value="">All Types</option>
          <option value="MAINTENANCE">Maintenance</option>
          <option value="REPAIR">Repair</option>
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.06] rounded-md text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select
          value={cityId}
          onChange={(e) => { setCityId(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.06] rounded-md text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
        >
          <option value="">All Cities</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={technicianId}
          onChange={(e) => { setTechnicianId(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.06] rounded-md text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
        >
          <option value="">All Technicians</option>
          {technicians.map((t) => (
            <option key={t.id} value={t.id}>{t.fullName}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.06] rounded-md text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
          title="From date"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.06] rounded-md text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
          title="To date"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#141414] rounded-lg border border-gray-200 dark:border-white/[0.06] overflow-hidden">
        {loading ? (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">Loading...</div>
        ) : interventions.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">No interventions found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/[0.06]">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">POS</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">City</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fridge SN</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Technician</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                {interventions.map((inv) => {
                  const cost = inv.costItems.reduce((s, c) => s + c.totalCost, 0);
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-4 py-2.5">
                        <Link href={`/interventions/${inv.id}`} className="text-gray-800 dark:text-gray-200 hover:text-blue-400">
                          {new Date(inv.interventionDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-medium ${inv.type === "REPAIR" ? "text-orange-400" : "text-blue-400"}`}>
                          {inv.type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{inv.refrigerator.pos.posName}</td>
                      <td className="px-4 py-2.5 text-gray-500">{inv.refrigerator.pos.city.name}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{inv.refrigerator.serialNumber}</td>
                      <td className="px-4 py-2.5 text-gray-400">{inv.technician.fullName}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                          inv.status === "COMPLETED" ? "text-green-400" :
                          inv.status === "IN_PROGRESS" ? "text-blue-400" :
                          inv.status === "PENDING" ? "text-amber-400" :
                          "text-gray-500"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            inv.status === "COMPLETED" ? "bg-green-400" :
                            inv.status === "IN_PROGRESS" ? "bg-blue-400" :
                            inv.status === "PENDING" ? "bg-amber-400" :
                            "bg-gray-500"
                          }`} />
                          {inv.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-400">
                        {cost > 0 ? `${cost.toLocaleString()} BIF` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-white/[0.06] rounded-md text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-white/5"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-white/[0.06] rounded-md text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-white/5"
          >
            Next
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
