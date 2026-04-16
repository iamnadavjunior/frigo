"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface InterventionDetail {
  id: string;
  type: string;
  status: string;
  interventionDate: string;
  issueDescription: string | null;
  workDone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  refrigerator: {
    id: string;
    serialNumber: string;
    brand: string | null;
    refrigeratorType: string | null;
    pos: {
      id: string;
      posName: string;
      city: { name: string };
    };
  };
  technician: { id: string; fullName: string };
  costItems: Array<{
    id: string;
    itemName: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }>;
  attachments: Array<{
    id: string;
    fileName: string;
    filePath: string;
    mimeType: string | null;
    createdAt: string;
  }>;
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    PENDING: "text-amber-400",
    IN_PROGRESS: "text-blue-400",
    COMPLETED: "text-green-400",
    CANCELLED: "text-gray-500",
  };
  const dots: Record<string, string> = {
    PENDING: "bg-amber-400",
    IN_PROGRESS: "bg-blue-400",
    COMPLETED: "bg-green-400",
    CANCELLED: "bg-gray-500",
  };
  return { text: `inline-flex items-center gap-1.5 text-xs font-medium ${colors[status] || "text-gray-500"}`, dot: `w-1.5 h-1.5 rounded-full ${dots[status] || "bg-gray-500"}` };
}

export default function InterventionDetailPage() {
  const params = useParams();
  const [data, setData] = useState<InterventionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/interventions/${params.id}`)
      .then((res) => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="p-4 text-gray-500">Loading...</div>;
  if (!data) return <div className="p-4 text-red-400">Intervention not found</div>;

  const totalCost = data.costItems.reduce((s, c) => s + c.totalCost, 0);

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <Link href="/interventions" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-300">
          ← Back to interventions
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            {data.type} Intervention
          </h1>
          <span className={statusBadge(data.status).text}><span className={statusBadge(data.status).dot} />{data.status.replace("_", " ")}</span>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {new Date(data.interventionDate).toLocaleDateString("en-GB", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Intervention Details */}
        <div className="bg-white dark:bg-[#141414] rounded-lg border border-gray-200 dark:border-white/[0.06] p-4">
          <h2 className="text-sm font-medium text-gray-400 mb-3">Intervention Details</h2>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-500">Type</span>
              <p className={`font-medium ${data.type === "REPAIR" ? "text-orange-400" : "text-blue-400"}`}>
                {data.type}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Status</span>
              <p><span className={statusBadge(data.status).text}><span className={statusBadge(data.status).dot} />{data.status.replace("_", " ")}</span></p>
            </div>
            <div>
              <span className="text-gray-500">Date</span>
              <p className="font-medium text-gray-800 dark:text-gray-200">
                {new Date(data.interventionDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Technician</span>
              <p className="font-medium text-gray-800 dark:text-gray-200">{data.technician.fullName}</p>
            </div>
            {data.issueDescription && (
              <div>
                <span className="text-gray-500">Issue / Problem Found</span>
                <p className="text-gray-700 dark:text-gray-300 mt-0.5">{data.issueDescription}</p>
              </div>
            )}
            {data.workDone && (
              <div>
                <span className="text-gray-500">Work Performed</span>
                <p className="text-gray-700 dark:text-gray-300 mt-0.5">{data.workDone}</p>
              </div>
            )}
            {data.notes && (
              <div>
                <span className="text-gray-500">Notes</span>
                <p className="text-gray-700 dark:text-gray-300 mt-0.5">{data.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Fridge & POS Info */}
        <div className="bg-white dark:bg-[#141414] rounded-lg border border-gray-200 dark:border-white/[0.06] p-4">
          <h2 className="text-sm font-medium text-gray-400 mb-3">Equipment & Location</h2>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-500">Refrigerator</span>
              <p className="font-medium text-gray-800 dark:text-gray-200">
                <Link href={`/refrigerators/${data.refrigerator.id}`} className="hover:text-blue-400">
                  {data.refrigerator.serialNumber}
                </Link>
              </p>
              <p className="text-gray-500 text-xs">
                {data.refrigerator.brand} · {data.refrigerator.refrigeratorType}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Point of Sale</span>
              <p className="font-medium text-gray-800 dark:text-gray-200">
                <Link href={`/pos/${data.refrigerator.pos.id}`} className="hover:text-blue-400">
                  {data.refrigerator.pos.posName}
                </Link>
              </p>
            </div>
            <div>
              <span className="text-gray-500">City</span>
              <p className="font-medium text-gray-800 dark:text-gray-200">{data.refrigerator.pos.city.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Items */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-gray-400 mb-3">Cost Items</h2>
        <div className="bg-white dark:bg-[#141414] rounded-lg border border-gray-200 dark:border-white/[0.06] overflow-hidden">
          {data.costItems.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-500 text-sm">No cost items recorded</div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/[0.06]">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Item</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Unit Cost</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                  {data.costItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-4 py-2.5 text-gray-800 dark:text-gray-200">{item.itemName}</td>
                      <td className="px-4 py-2.5 text-right text-gray-400">{item.quantity}</td>
                      <td className="px-4 py-2.5 text-right text-gray-400">{item.unitCost.toLocaleString()} BIF</td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-800 dark:text-gray-200">{item.totalCost.toLocaleString()} BIF</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-white/[0.03]">
                    <td colSpan={3} className="px-4 py-2.5 text-right font-medium text-gray-400">Total</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900 dark:text-white">{totalCost.toLocaleString()} BIF</td>
                  </tr>
                </tfoot>
              </table>
            </>
          )}
        </div>
      </div>

      {/* Attachments */}
      {data.attachments.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-400 mb-3">Attachments</h2>
          <div className="bg-white dark:bg-[#141414] rounded-lg border border-gray-200 dark:border-white/[0.06] p-4">
            <div className="space-y-2">
              {data.attachments.map((att) => (
                <div key={att.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span className="text-sm text-gray-800 dark:text-gray-200">{att.fileName}</span>
                    <span className="text-xs text-gray-500">{att.mimeType}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(att.createdAt).toLocaleDateString("en-GB")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="mt-8 text-xs text-gray-400">
        Created: {new Date(data.createdAt).toLocaleString()} · Updated: {new Date(data.updatedAt).toLocaleString()}
      </div>
    </div>
  );
}
