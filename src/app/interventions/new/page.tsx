"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

interface Fridge {
  id: string;
  serialNumber: string;
  brand: string | null;
  refrigeratorType: string | null;
  pos: { posName: string; city: { name: string } };
}

interface Technician {
  id: string;
  fullName: string;
}

interface CostItem {
  itemName: string;
  quantity: number;
  unitCost: number;
}

export default function NewInterventionPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [fridges, setFridges] = useState<Fridge[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [fridgeSearch, setFridgeSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [refrigeratorId, setRefrigeratorId] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [type, setType] = useState<"MAINTENANCE" | "REPAIR">("MAINTENANCE");
  const [interventionDate, setInterventionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [issueDescription, setIssueDescription] = useState("");
  const [workDone, setWorkDone] = useState("");
  const [status, setStatus] = useState("COMPLETED");
  const [notes, setNotes] = useState("");
  const [costItems, setCostItems] = useState<CostItem[]>([]);

  const [selectedFridge, setSelectedFridge] = useState<Fridge | null>(null);

  useEffect(() => {
    fetch("/api/lookups")
      .then((res) => res.json())
      .then((data) => {
        setTechnicians(data.technicians || []);
        // Auto-select technician if current user is a technician
        if (user?.role === "TECHNICIAN") {
          setTechnicianId(user.userId);
        }
      })
      .catch(console.error);
  }, [user]);

  // Search fridges
  useEffect(() => {
    if (fridgeSearch.length < 2) {
      setFridges([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/refrigerators?search=${encodeURIComponent(fridgeSearch)}&limit=10`)
        .then((res) => res.json())
        .then(setFridges)
        .catch(console.error);
    }, 300);
    return () => clearTimeout(timer);
  }, [fridgeSearch]);

  const addCostItem = () => {
    setCostItems([...costItems, { itemName: "", quantity: 1, unitCost: 0 }]);
  };

  const removeCostItem = (index: number) => {
    setCostItems(costItems.filter((_, i) => i !== index));
  };

  const updateCostItem = (index: number, field: keyof CostItem, value: string | number) => {
    const updated = [...costItems];
    (updated[index] as unknown as Record<string, unknown>)[field] = value;
    setCostItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!refrigeratorId) {
      setError("Please select a refrigerator");
      setLoading(false);
      return;
    }
    if (!technicianId) {
      setError("Please select a technician");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/interventions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refrigeratorId,
          technicianId,
          type,
          interventionDate,
          issueDescription: issueDescription || null,
          workDone: workDone || null,
          status,
          notes: notes || null,
          costItems: costItems.filter((c) => c.itemName.trim()),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create intervention");
      }

      const intervention = await res.json();

      router.push(`/interventions/${intervention.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create intervention");
    } finally {
      setLoading(false);
    }
  };

  const totalCost = costItems.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);

  return (
    <div className="max-w-2xl p-4 lg:p-6">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">New Intervention Report</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-500/10 text-red-400 text-sm px-3 py-2 rounded border border-red-500/20">
            {error}
          </div>
        )}

        {/* Fridge Selection */}
        <div className="bg-white dark:bg-[#141414] rounded-lg border border-gray-200 dark:border-white/6 p-4 space-y-4">
          <h2 className="text-sm font-medium text-gray-400">Equipment</h2>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Search Refrigerator</label>
            <input
              type="text"
              placeholder="Type serial number or POS name..."
              value={fridgeSearch}
              onChange={(e) => setFridgeSearch(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-white/6 border border-gray-200 dark:border-white/6 rounded-md text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
            />
            {fridges.length > 0 && !selectedFridge && (
              <div className="mt-1 border border-gray-200 dark:border-white/6 rounded-md max-h-48 overflow-y-auto bg-white dark:bg-[#141414]">
                {fridges.map((f) => (
                  <button
                    type="button"
                    key={f.id}
                    onClick={() => {
                      setRefrigeratorId(f.id);
                      setSelectedFridge(f);
                      setFridgeSearch(f.serialNumber);
                      setFridges([]);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/5 text-sm border-b border-gray-100 dark:border-white/6 last:border-0"
                  >
                    <span className="font-medium text-gray-800 dark:text-gray-200 font-mono">{f.serialNumber}</span>
                    <span className="text-gray-500 ml-2">
                      {f.pos.posName} · {f.pos.city.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedFridge && (
            <div className="bg-gray-50 dark:bg-white/4 rounded p-3 text-sm flex items-center justify-between">
              <div>
                <span className="font-medium font-mono text-gray-800 dark:text-gray-200">{selectedFridge.serialNumber}</span>
                <span className="text-gray-500 ml-2">
                  {selectedFridge.brand} · {selectedFridge.pos.posName} · {selectedFridge.pos.city.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedFridge(null);
                  setRefrigeratorId("");
                  setFridgeSearch("");
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 text-xs"
              >
                Change
              </button>
            </div>
          )}
        </div>

        {/* Intervention Type & Details */}
        <div className="bg-white dark:bg-[#141414] rounded-lg border border-gray-200 dark:border-white/6 p-4 space-y-4">
          <h2 className="text-sm font-medium text-gray-400">Intervention Details</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "MAINTENANCE" | "REPAIR")}
                className="w-full px-3 py-2 bg-white dark:bg-white/6 border border-gray-200 dark:border-white/6 rounded-md text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
              >
                <option value="MAINTENANCE">Maintenance</option>
                <option value="REPAIR">Repair</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Date *</label>
              <input
                type="date"
                value={interventionDate}
                onChange={(e) => setInterventionDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white dark:bg-white/6 border border-gray-200 dark:border-white/6 rounded-md text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Technician *</label>
              <select
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white dark:bg-white/6 border border-gray-200 dark:border-white/6 rounded-md text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
              >
                <option value="">Select technician</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>{t.fullName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-white/6 border border-gray-200 dark:border-white/6 rounded-md text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
              >
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Issue / Problem Found</label>
            <textarea
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              rows={3}
              placeholder="Describe the issue found..."
              className="w-full px-3 py-2 bg-white dark:bg-white/6 border border-gray-200 dark:border-white/6 rounded-md text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Work Performed</label>
            <textarea
              value={workDone}
              onChange={(e) => setWorkDone(e.target.value)}
              rows={3}
              placeholder="Describe the work done..."
              className="w-full px-3 py-2 bg-white dark:bg-white/6 border border-gray-200 dark:border-white/6 rounded-md text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Additional notes..."
              className="w-full px-3 py-2 bg-white dark:bg-white/6 border border-gray-200 dark:border-white/6 rounded-md text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40 resize-none"
            />
          </div>
        </div>

        {/* Cost Items */}
        <div className="bg-white dark:bg-[#141414] rounded-lg border border-gray-200 dark:border-white/6 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-400">Cost Items</h2>
            <button
              type="button"
              onClick={addCostItem}
              className="text-sm text-gray-400 hover:text-gray-800 dark:text-gray-200 px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-white/5"
            >
              + Add Item
            </button>
          </div>

          {costItems.length === 0 ? (
            <p className="text-sm text-gray-500">No cost items. Click &quot;Add Item&quot; to add parts or materials.</p>
          ) : (
            <div className="space-y-3">
              {costItems.map((item, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Item / Part name"
                      value={item.itemName}
                      onChange={(e) => updateCostItem(index, "itemName", e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-white/6 border border-gray-200 dark:border-white/6 rounded-md text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      placeholder="Qty"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateCostItem(index, "quantity", parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-white dark:bg-white/6 border border-gray-200 dark:border-white/6 rounded-md text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
                    />
                  </div>
                  <div className="w-28">
                    <input
                      type="number"
                      placeholder="Unit cost"
                      min="0"
                      value={item.unitCost}
                      onChange={(e) => updateCostItem(index, "unitCost", parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white dark:bg-white/6 border border-gray-200 dark:border-white/6 rounded-md text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
                    />
                  </div>
                  <div className="w-24 pt-2 text-right text-sm text-gray-400">
                    {(item.quantity * item.unitCost).toLocaleString()} BIF
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCostItem(index)}
                    className="pt-2 text-gray-500 hover:text-red-400"
                  >
                    ×
                  </button>
                </div>
              ))}
              {costItems.length > 0 && (
                <div className="text-right text-sm font-medium text-gray-800 dark:text-gray-200 pt-2 border-t border-gray-200 dark:border-white/6">
                  Total: {totalCost.toLocaleString()} BIF
                </div>
              )}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {loading ? "Submitting..." : "Submit Intervention"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-300 px-3 py-2"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
