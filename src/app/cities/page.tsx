"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/components/auth-provider";

interface City {
  id: string;
  name: string;
  posCount: number;
  fridgeCount: number;
}

function IcnMapPin({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  );
}

function IcnPlus({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function IcnPencil({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
  );
}

function IcnTrash({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}

export default function CitiesPage() {
  useAuth();
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const editRef = useRef<HTMLInputElement>(null);

  const fetchCities = () => {
    fetch("/api/cities")
      .then((r) => r.json())
      .then((data) => setCities(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCities();
  }, []);

  useEffect(() => {
    if (editId && editRef.current) editRef.current.focus();
  }, [editId]);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setError("");
    setAdding(true);
    try {
      const res = await fetch("/api/cities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to add city");
        return;
      }
      setNewName("");
      fetchCities();
    } catch {
      setError("Network error");
    } finally {
      setAdding(false);
    }
  };

  const handleUpdate = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    setError("");
    try {
      const res = await fetch(`/api/cities/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update city");
        return;
      }
      setEditId(null);
      fetchCities();
    } catch {
      setError("Network error");
    }
  };

  const handleDelete = async (id: string) => {
    setError("");
    try {
      const res = await fetch(`/api/cities/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete city");
        return;
      }
      setDeleteConfirm(null);
      fetchCities();
    } catch {
      setError("Network error");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-white/10" />
          <div className="w-28 h-2 rounded bg-gray-200 dark:bg-white/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="px-6 py-6 space-y-6 max-w-3xl">
        {/* Header */}
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Locations</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {cities.length} {cities.length === 1 ? "city" : "cities"} registered
          </p>
        </div>

        {/* Add new city */}
        <div className="flex gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="New city name..."
            className="flex-1 h-9 px-3 text-sm bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newName.trim()}
            className="h-9 px-4 flex items-center gap-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            <IcnPlus className="w-4 h-4" />
            Add
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 text-red-500 text-sm px-3 py-2 rounded-lg border border-red-500/20">
            {error}
          </div>
        )}

        {/* City list */}
        <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 overflow-hidden">
          {cities.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-gray-400">
              No cities yet. Add your first city above.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-white/6">
              {cities.map((city) => (
                <div
                  key={city.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-white/2 transition-colors"
                >
                  {/* Icon */}
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/6 flex items-center justify-center shrink-0">
                    <IcnMapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </div>

                  {/* Name / Edit */}
                  <div className="flex-1 min-w-0">
                    {editId === city.id ? (
                      <input
                        ref={editRef}
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdate(city.id);
                          if (e.key === "Escape") setEditId(null);
                        }}
                        onBlur={() => setEditId(null)}
                        className="w-full h-8 px-2 text-sm bg-transparent border border-blue-500 rounded text-gray-900 dark:text-white focus:outline-none"
                      />
                    ) : (
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {city.name}
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500 shrink-0">
                    <span>{city.posCount} POS</span>
                    <span>{city.fridgeCount} fridges</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {deleteConfirm === city.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleDelete(city.id)}
                          className="h-7 px-2.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="h-7 px-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditId(city.id);
                            setEditName(city.name);
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-white/6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          title="Edit"
                        >
                          <IcnPencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(city.id)}
                          className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <IcnTrash className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
