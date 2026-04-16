"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-provider";

interface ParsedRow {
  rowIndex: number;
  cityId?: string;
  posName?: string;
  channel?: string;
  owner?: string;
  phoneNumber?: string;
  state?: string;
  city?: string;
  neighbourhood?: string;
  idNumber?: string;
  streetNo?: string;
  refrigeratorType?: string;
  brand?: string;
  serialNumber?: string;
}

interface ParseError {
  row: number;
  message: string;
}

type Step = "upload" | "preview" | "importing" | "done";

export default function ImportPage() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
  const [, setHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    errors: ParseError[];
    total: number;
  } | null>(null);
  const [error, setError] = useState("");

  if (user?.role !== "ADMIN") {
    return (
      <div className="text-center py-12 text-gray-500">
        Admin access required for data import.
      </div>
    );
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError("");
    }
  };

  const handleParse = async () => {
    if (!file) return;
    setError("");
    setImporting(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/import/parse", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Parse failed");
      }

      const data = await res.json();
      setRows(data.rows || []);
      setParseErrors(data.errors || []);
      setHeaders(data.headers || []);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      setImporting(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setError("");

    try {
      const res = await fetch("/api/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Import failed");
      }

      const data = await res.json();
      setResult(data);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setStep("upload");
    setFile(null);
    setRows([]);
    setParseErrors([]);
    setHeaders([]);
    setResult(null);
    setError("");
  };

  return (
    <div className="p-4 lg:p-6">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Import Data</h1>

      {error && (
        <div className="bg-red-500/10 text-red-400 text-sm px-3 py-2 rounded border border-red-500/20 mb-4">
          {error}
        </div>
      )}

      {/* Upload Step */}
      {step === "upload" && (
        <div className="bg-white dark:bg-[#141414] rounded-lg border border-gray-200 dark:border-white/[0.06] p-6">
          <h2 className="text-sm font-medium text-gray-400 mb-4">Upload Excel File</h2>
          <p className="text-sm text-gray-500 mb-4">
            Upload an Excel file (.xlsx, .xls) or CSV containing the refrigerator database.
            The file should contain columns for: City, POS Name, Channel, Owner, Phone, State,
            Neighbourhood, ID Number, Street, Refrigerator Type, Brand, and Serial Number.
          </p>

          <div className="border-2 border-dashed border-gray-200 dark:border-white/[0.06] rounded-lg p-8 text-center">
            <input
              type="file"
              onChange={handleFileSelect}
              accept=".xlsx,.xls,.csv"
              className="text-sm text-gray-400"
            />
            {file && (
              <p className="text-sm text-gray-500 mt-2">
                Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={handleParse}
              disabled={!file || importing}
              className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {importing ? "Parsing..." : "Parse & Preview"}
            </button>
          </div>
        </div>
      )}

      {/* Preview Step */}
      {step === "preview" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Preview: {rows.length} rows ready to import
              </h2>
              {parseErrors.length > 0 && (
                <p className="text-sm text-orange-400">
                  {parseErrors.length} rows had errors and will be skipped
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={reset}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-300 px-3 py-2"
              >
                Start Over
              </button>
              <button
                onClick={handleImport}
                disabled={importing || rows.length === 0}
                className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                {importing ? "Importing..." : `Import ${rows.length} Rows`}
              </button>
            </div>
          </div>

          {/* Parse errors */}
          {parseErrors.length > 0 && (
            <div className="bg-orange-500/10 rounded-lg border border-orange-500/20 p-4 mb-4">
              <h3 className="text-sm font-medium text-orange-400 mb-2">Parse Errors (rows skipped)</h3>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {parseErrors.map((err, i) => (
                  <p key={i} className="text-xs text-orange-400/80">
                    Row {err.row}: {err.message}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Data preview table */}
          <div className="bg-white dark:bg-[#141414] rounded-lg border border-gray-200 dark:border-white/[0.06] overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-xs">
                <thead className="sticky top-0">
                  <tr className="bg-white dark:bg-[#141414] border-b border-gray-200 dark:border-white/[0.06]">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Row</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">City</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">POS Name</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Owner</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Channel</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Brand</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Serial Number</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                  {rows.slice(0, 100).map((row) => (
                    <tr key={row.rowIndex} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-3 py-1.5 text-gray-500">{row.rowIndex}</td>
                      <td className="px-3 py-1.5 text-gray-400">{row.city || row.state || "—"}</td>
                      <td className="px-3 py-1.5 font-medium text-gray-800 dark:text-gray-200">{row.posName || "—"}</td>
                      <td className="px-3 py-1.5 text-gray-400">{row.owner || "—"}</td>
                      <td className="px-3 py-1.5 text-gray-400">{row.channel || "—"}</td>
                      <td className="px-3 py-1.5 text-gray-400">{row.refrigeratorType || "—"}</td>
                      <td className="px-3 py-1.5 text-gray-400">{row.brand || "—"}</td>
                      <td className="px-3 py-1.5 font-mono text-gray-700 dark:text-gray-300">{row.serialNumber || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 100 && (
              <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 dark:bg-white/[0.02] border-t border-gray-200 dark:border-white/[0.06]">
                Showing first 100 of {rows.length} rows
              </div>
            )}
          </div>
        </div>
      )}

      {/* Done Step */}
      {step === "done" && result && (
        <div className="bg-white dark:bg-[#141414] rounded-lg border border-gray-200 dark:border-white/[0.06] p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Import Complete</h2>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-green-500/10 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{result.imported}</div>
              <div className="text-sm text-green-400/70">Imported</div>
            </div>
            <div className="bg-orange-500/10 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-400">{result.skipped}</div>
              <div className="text-sm text-orange-400/70">Skipped</div>
            </div>
            <div className="bg-gray-50 dark:bg-white/[0.04] rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">{result.total}</div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="bg-orange-500/10 rounded-lg border border-orange-500/20 p-4 mb-4">
              <h3 className="text-sm font-medium text-orange-400 mb-2">Import Errors</h3>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {result.errors.map((err, i) => (
                  <p key={i} className="text-xs text-orange-400/80">
                    Row {err.row}: {err.message}
                  </p>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={reset}
            className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            Import More Data
          </button>
        </div>
      )}
    </div>
  );
}
