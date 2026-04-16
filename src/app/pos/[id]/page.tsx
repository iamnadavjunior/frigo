"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface PosDetail {
  id: string;
  posName: string;
  owner: string | null;
  phoneNumber: string | null;
  channel: string | null;
  state: string | null;
  neighbourhood: string | null;
  idNumber: string | null;
  streetNo: string | null;
  city: { name: string };
  refrigerators: Array<{
    id: string;
    refrigeratorType: string | null;
    brand: string | null;
    serialNumber: string;
    status: string;
    _count: { interventions: number };
  }>;
}

interface Intervention {
  id: string;
  type: string;
  status: string;
  interventionDate: string;
  issueDescription: string | null;
  workDone: string | null;
  refrigerator: { serialNumber: string };
  technician: { fullName: string };
  costItems: Array<{ totalCost: number }>;
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/[0.06]">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">{value || "—"}</span>
    </div>
  );
}

function statusColor(status: string) {
  const colors: Record<string, string> = {
    ACTIVE: "text-green-400 bg-green-500/10",
    INACTIVE: "text-gray-400 bg-white dark:bg-white/[0.06]",
    UNDER_REPAIR: "text-orange-400 bg-orange-500/10",
  };
  return colors[status] || "text-gray-400 bg-white dark:bg-white/[0.06]";
}

export default function PosDetailPage() {
  const params = useParams();
  const [pos, setPos] = useState<PosDetail | null>(null);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/pos/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setPos(data.pos);
        setInterventions(data.recentInterventions || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="text-gray-500 p-6">Loading...</div>;
  if (!pos) return <div className="text-red-400 p-6">POS not found</div>;

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <Link href="/pos" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-300">
          ← Back to POS list
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white mt-2">{pos.posName}</h1>
        <p className="text-sm text-gray-500">{pos.city.name}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* POS Info */}
        <div className="bg-white dark:bg-[#141414] rounded-lg border border-gray-200 dark:border-white/[0.06] p-4">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">POS Information</h2>
          <InfoRow label="POS Name" value={pos.posName} />
          <InfoRow label="Owner" value={pos.owner} />
          <InfoRow label="Phone Number" value={pos.phoneNumber} />
          <InfoRow label="Channel" value={pos.channel} />
          <InfoRow label="State" value={pos.state} />
          <InfoRow label="City" value={pos.city.name} />
          <InfoRow label="Neighbourhood" value={pos.neighbourhood} />
          <InfoRow label="ID Number" value={pos.idNumber} />
          <InfoRow label="Street & No." value={pos.streetNo} />
        </div>

        {/* Refrigerators */}
        <div className="bg-white dark:bg-[#141414] rounded-lg border border-gray-200 dark:border-white/[0.06] p-4">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Refrigerators ({pos.refrigerators.length})
          </h2>
          {pos.refrigerators.length === 0 ? (
            <p className="text-sm text-gray-500">No refrigerators registered</p>
          ) : (
            <div className="space-y-2">
              {pos.refrigerators.map((fridge) => (
                <Link
                  key={fridge.id}
                  href={`/refrigerators/${fridge.id}`}
                  className="block p-3 rounded border border-gray-200 dark:border-white/[0.06] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{fridge.serialNumber}</span>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {fridge.brand || "Unknown brand"} · {fridge.refrigeratorType || "Unknown type"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{fridge._count.interventions} interventions</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${statusColor(fridge.status)}`}>
                        {fridge.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Interventions */}
      <div>
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Recent Interventions</h2>
        <div className="bg-white dark:bg-[#141414] rounded-lg border border-gray-200 dark:border-white/[0.06] overflow-hidden">
          {interventions.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">No interventions yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/[0.06]">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
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
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{inv.refrigerator.serialNumber}</td>
                        <td className="px-4 py-2.5 text-gray-400">{inv.technician.fullName}</td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs">{inv.status.replace("_", " ")}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right">{cost > 0 ? `${cost.toLocaleString()} BIF` : "—"}</td>
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
