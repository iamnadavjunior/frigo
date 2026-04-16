"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";

/* ── Types ── */
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

type ImportStep = "upload" | "preview" | "importing" | "done";
type Tab = "profile" | "team" | "import";

interface TeamUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
}

/* ── Icons ── */
function IcnUser({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  );
}

function IcnUpload({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function IcnTeam({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  );
}

function generatePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const all = upper + lower + digits;
  let pwd = upper[Math.floor(Math.random() * upper.length)];
  pwd += lower[Math.floor(Math.random() * lower.length)];
  pwd += digits[Math.floor(Math.random() * digits.length)];
  for (let i = 0; i < 5; i++) pwd += all[Math.floor(Math.random() * all.length)];
  // Shuffle
  return pwd.split("").sort(() => Math.random() - 0.5).join("");
}

const roleMeta: Record<string, { label: string; color: string }> = {
  ADMIN: { label: "CABU Admin", color: "bg-violet-500 text-violet-50" },
  TECHNICIAN: { label: "Technician", color: "bg-emerald-500 text-emerald-50" },
  BRARUDI: { label: "BRARUDI", color: "bg-amber-500 text-amber-50" },
};

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  // City list for import
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string>("");

  useEffect(() => {
    fetch("/api/cities")
      .then((r) => r.json())
      .then((data: { id: string; name: string }[]) => setCities(data))
      .catch(() => {});
  }, []);

  // Import state
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
  const [columnMapping, setColumnMapping] = useState<{ fileColumn: string; mappedTo: string | null }[]>([]);
  const [sheetInfo, setSheetInfo] = useState<{ name: string; totalRawRows: number }>({ name: "", totalRawRows: 0 });
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    errors: ParseError[];
    total: number;
  } | null>(null);
  const [error, setError] = useState("");

  const meta = roleMeta[user?.role || ""] || { label: user?.role || "", color: "bg-gray-500 text-white" };
  const isAdmin = user?.role === "ADMIN";

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
      const res = await fetch("/api/import/parse", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Parse failed");
      }
      const data = await res.json();
      setRows(data.rows || []);
      setParseErrors(data.errors || []);
      setColumnMapping(data.columnMapping || []);
      setSheetInfo({ name: data.sheetName || "", totalRawRows: data.totalRawRows || 0 });
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
        body: JSON.stringify({ rows, cityId: selectedCityId || undefined }),
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

  const resetImport = () => {
    setStep("upload");
    setFile(null);
    setRows([]);
    setParseErrors([]);
    setColumnMapping([]);
    setSheetInfo({ name: "", totalRawRows: 0 });
  };

  /* ── Team management state ── */
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createRole, setCreateRole] = useState("TECHNICIAN");
  const [createPassword, setCreatePassword] = useState(() => generatePassword());
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createdCreds, setCreatedCreds] = useState<{ name: string; email: string; password: string } | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetCopied, setResetCopied] = useState(false);

  const loadTeam = () => {
    setTeamLoading(true);
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => setTeamUsers(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setTeamLoading(false));
  };

  useEffect(() => {
    if (activeTab === "team" && user?.role === "ADMIN") loadTeam();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreateLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: createName, email: createEmail, userRole: createRole, password: createPassword }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to create account");
      }
      const saved = { name: createName, email: createEmail, password: createPassword };
      setCreatedCreds(saved);
      setCopiedCreds(false);
      setCreateName("");
      setCreateEmail("");
      setCreateRole("TECHNICIAN");
      setCreatePassword(generatePassword());
      setShowCreateForm(false);
      loadTeam();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleToggleActive = async (userId: string, newActive: boolean) => {
    await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: newActive }),
    });
    loadTeam();
  };

  const openResetPassword = (u: TeamUser) => {
    setResetTarget({ id: u.id, name: u.fullName });
    setResetPassword(generatePassword());
    setResetCopied(false);
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    setResetLoading(true);
    await fetch(`/api/users/${resetTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: resetPassword }),
    });
    setResetLoading(false);
    setResetCopied(false);
  };

  const tabs: { key: Tab; label: string; icon: typeof IcnUser; adminOnly?: boolean }[] = [
    { key: "profile", label: "Profile", icon: IcnUser },
    { key: "team", label: "Team", icon: IcnTeam, adminOnly: true },
    { key: "import", label: "Import Data", icon: IcnUpload, adminOnly: true },
  ];

  const visibleTabs = tabs.filter((t) => !t.adminOnly || user?.role === "ADMIN");

  return (
    <div className="flex-1 overflow-auto">
      <div className={`mx-auto px-4 py-4 space-y-4 ${isAdmin ? 'max-w-7xl sm:px-6 sm:py-6 sm:space-y-6' : 'max-w-lg'}`}>
        {/* Header — only for admin */}
        {isAdmin && (
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your profile and preferences</p>
          </div>
        )}

        {/* Tabs — only show when multiple tabs */}
        {visibleTabs.length > 1 && (
          <div>
            <div className="flex gap-1 border-b border-gray-200 dark:border-white/6">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    activeTab === tab.key
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="space-y-3">
            {/* Profile card */}
            <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 overflow-hidden">
              {/* Avatar + name */}
              <div className="px-4 py-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-linear-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-base font-bold text-white shrink-0">
                  {user?.fullName?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "U"}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">{user?.fullName}</h2>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>
                <span className={`ml-auto shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${meta.color}`}>
                  {meta.label}
                </span>
              </div>
            </div>

            {/* Info rows */}
            <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 divide-y divide-gray-100 dark:divide-white/6">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs font-semibold text-gray-400 uppercase">Nom complet</span>
                <span className="text-sm text-gray-800 dark:text-gray-200">{user?.fullName}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs font-semibold text-gray-400 uppercase">Email</span>
                <span className="text-sm text-gray-800 dark:text-gray-200 truncate ml-4">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs font-semibold text-gray-400 uppercase">Rôle</span>
                <span className="text-sm text-gray-800 dark:text-gray-200">{meta.label}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs font-semibold text-gray-400 uppercase">Statut</span>
                <span className="inline-flex items-center gap-1.5 text-sm">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-gray-800 dark:text-gray-200">Actif</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Team Tab */}
        {activeTab === "team" && user?.role === "ADMIN" && (
          <div className="space-y-4">

            {/* Created credentials card */}
            {createdCreds && (
              <div className="bg-green-500/10 border border-green-500/25 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-green-500">Account created — share these credentials</p>
                  <button onClick={() => setCreatedCreds(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none">&times;</button>
                </div>
                <div className="bg-white dark:bg-[#141414] rounded-lg border border-green-500/20 p-3 font-mono text-sm space-y-1">
                  <div><span className="text-gray-400">Name:&nbsp;&nbsp;&nbsp;</span><span className="text-gray-800 dark:text-gray-200 font-semibold">{createdCreds.name}</span></div>
                  <div><span className="text-gray-400">Email:&nbsp;&nbsp;&nbsp;</span><span className="text-gray-800 dark:text-gray-200">{createdCreds.email}</span></div>
                  <div><span className="text-gray-400">Password: </span><span className="text-gray-800 dark:text-gray-200 font-bold tracking-wider">{createdCreds.password}</span></div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`Name: ${createdCreds.name}\nEmail: ${createdCreds.email}\nPassword: ${createdCreds.password}`);
                    setCopiedCreds(true);
                    setTimeout(() => setCopiedCreds(false), 2500);
                  }}
                  className="mt-3 text-sm text-green-600 dark:text-green-400 font-medium hover:underline"
                >
                  {copiedCreds ? "Copied!" : "Copy all to clipboard"}
                </button>
              </div>
            )}

            {/* Reset password card */}
            {resetTarget && (
              <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-amber-500">Reset password for {resetTarget.name}</p>
                  <button onClick={() => setResetTarget(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none">&times;</button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white dark:bg-[#141414] rounded-lg border border-amber-500/20 px-3 py-2 font-mono text-sm font-bold text-gray-800 dark:text-gray-200 tracking-wider">
                    {resetPassword}
                  </div>
                  <button
                    onClick={() => setResetPassword(generatePassword())}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-2 py-2 border border-gray-200 dark:border-white/10 rounded-lg"
                  >
                    Regenerate
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={handleResetPassword}
                    disabled={resetLoading}
                    className="text-sm bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2 rounded-lg disabled:opacity-60 transition-colors"
                  >
                    {resetLoading ? "Resetting…" : "Apply New Password"}
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(resetPassword);
                      setResetCopied(true);
                      setTimeout(() => setResetCopied(false), 2500);
                    }}
                    className="text-sm text-amber-600 dark:text-amber-400 font-medium hover:underline"
                  >
                    {resetCopied ? "Copied!" : "Copy password"}
                  </button>
                </div>
              </div>
            )}

            {/* Create form */}
            {showCreateForm && (
              <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 p-5">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">New Account</h3>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  {createError && (
                    <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">{createError}</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                        placeholder="e.g. Jean Ndayishimiye"
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-white/6 border border-gray-200 dark:border-white/6 rounded-lg text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Email *</label>
                      <input
                        type="email"
                        required
                        value={createEmail}
                        onChange={(e) => setCreateEmail(e.target.value)}
                        placeholder="jean@cabu.bi"
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-white/6 border border-gray-200 dark:border-white/6 rounded-lg text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Role *</label>
                      <select
                        value={createRole}
                        onChange={(e) => setCreateRole(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-white/6 border border-gray-200 dark:border-white/6 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      >
                        <option value="TECHNICIAN">Technician</option>
                        <option value="BRARUDI">BRARUDI</option>
                        <option value="ADMIN">CABU Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Temporary Password</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={createPassword}
                          className="flex-1 px-3 py-2 bg-gray-50 dark:bg-white/6 border border-gray-200 dark:border-white/6 rounded-lg text-sm font-mono font-bold text-gray-800 dark:text-gray-200 tracking-wider"
                        />
                        <button
                          type="button"
                          onClick={() => setCreatePassword(generatePassword())}
                          title="Regenerate password"
                          className="px-2 py-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border border-gray-200 dark:border-white/6 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={createLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg disabled:opacity-60 transition-colors"
                    >
                      {createLoading ? "Creating…" : "Create Account"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowCreateForm(false); setCreateError(""); }}
                      className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-2"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Header + create button */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {teamLoading ? "Loading…" : `${teamUsers.length} account${teamUsers.length !== 1 ? "s" : ""}`}
              </p>
              {!showCreateForm && (
                <button
                  onClick={() => { setShowCreateForm(true); setCreatedCreds(null); setResetTarget(null); }}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Create Account
                </button>
              )}
            </div>

            {/* Users table */}
            <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 overflow-hidden">
              {teamLoading ? (
                <div className="p-8 text-center text-sm text-gray-400">Loading team…</div>
              ) : teamUsers.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400">No accounts yet.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-white/6">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Email</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Role</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                    {teamUsers.map((u) => (
                      <tr key={u.id} className={`hover:bg-gray-50 dark:hover:bg-white/[0.02] ${!u.active ? "opacity-50" : ""}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                              {u.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-[140px]">{u.fullName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${roleMeta[u.role]?.color || "bg-gray-500 text-white"}`}>
                            {roleMeta[u.role]?.label || u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${u.active ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${u.active ? "bg-green-500" : "bg-gray-400"}`} />
                            {u.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openResetPassword(u)}
                              className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-medium"
                            >
                              Reset pwd
                            </button>
                            {u.id !== user?.userId && (
                              <button
                                onClick={() => handleToggleActive(u.id, !u.active)}
                                className={`text-xs font-medium hover:underline ${u.active ? "text-red-500 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}
                              >
                                {u.active ? "Deactivate" : "Activate"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Import Data Tab */}
        {activeTab === "import" && user?.role === "ADMIN" && (
          <div>
            {error && (
              <div className="bg-red-500/10 text-red-400 text-sm px-3 py-2 rounded border border-red-500/20 mb-4">
                {error}
              </div>
            )}

            {/* Upload Step */}
            {step === "upload" && (
              <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 p-6">
                <h2 className="text-sm font-medium text-gray-400 mb-4">Importer un fichier Excel / Upload Excel File</h2>
                <p className="text-sm text-gray-500 mb-2">
                  Importez un fichier Excel (.xlsx, .xls) ou CSV contenant la base de données des réfrigérateurs.
                </p>
                <p className="text-xs text-gray-400 mb-4">
                  Colonnes supportées (FR/EN) : Nom du PDV, Canal, Propriétaire, Téléphone, Commune/Ville,
                  Quartier, N°, Adresse, Type de frigo, Marque, Numéro de série.
                </p>

                {/* City Selector */}
                <div className="mb-5">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Commune cible / Target City</label>
                  <select
                    value={selectedCityId}
                    onChange={(e) => setSelectedCityId(e.target.value)}
                    className="w-full sm:w-72 h-9 px-3 text-sm bg-gray-50 dark:bg-white/4 border border-gray-200 dark:border-white/6 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/30 cursor-pointer"
                  >
                    <option value="">Détection auto depuis le fichier</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    {selectedCityId
                      ? `All rows will be imported under "${cities.find((c) => c.id === selectedCityId)?.name}", ignoring any city column in the file.`
                      : "If no city is selected, the system will try to detect the city from a \"City\" or \"Ville\" column in the file."}
                  </p>
                </div>

                <div className="border-2 border-dashed border-gray-200 dark:border-white/6 rounded-lg p-8 text-center">
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
                    <p className="text-xs text-gray-400 mt-0.5">
                      Sheet: &ldquo;{sheetInfo.name}&rdquo; &middot; {sheetInfo.totalRawRows} data row{sheetInfo.totalRawRows !== 1 ? "s" : ""} found
                      {parseErrors.filter((e) => e.row > 0).length > 0 && (
                        <span className="text-orange-400"> &middot; {parseErrors.filter((e) => e.row > 0).length} row error{parseErrors.filter((e) => e.row > 0).length !== 1 ? "s" : ""}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={resetImport} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-300 px-3 py-2">
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

                {/* Column Mapping Summary */}
                {columnMapping.length > 0 && (
                  <div className="bg-white dark:bg-[#141414] rounded-lg border border-gray-200 dark:border-white/6 p-4 mb-4">
                    <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2.5">Column Mapping</h3>
                    <div className="flex flex-wrap gap-2">
                      {columnMapping.filter((c) => c.fileColumn.trim() !== "").map((col, i) => (
                        <div key={i} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                          col.mappedTo
                            ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                            : "bg-gray-50 dark:bg-white/4 border-gray-200 dark:border-white/6 text-gray-400"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${col.mappedTo ? "bg-emerald-400" : "bg-gray-300 dark:bg-gray-600"}`} />
                          <span className="font-semibold">{col.fileColumn}</span>
                          {col.mappedTo ? (
                            <span className="text-emerald-500 dark:text-emerald-400">&rarr; {col.mappedTo}</span>
                          ) : (
                            <span className="italic">ignored</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Structure Warnings (row 0 errors) */}
                {parseErrors.filter((e) => e.row === 0).length > 0 && (
                  <div className="bg-amber-500/10 rounded-lg border border-amber-500/20 p-4 mb-4">
                    <h3 className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-1.5">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                      File Structure Warnings
                    </h3>
                    <div className="space-y-1.5">
                      {parseErrors.filter((e) => e.row === 0).map((err, i) => (
                        <p key={i} className="text-xs text-amber-400/90 leading-relaxed">{err.message}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Row-level Errors */}
                {parseErrors.filter((e) => e.row > 0).length > 0 && (
                  <div className="bg-orange-500/10 rounded-lg border border-orange-500/20 p-4 mb-4">
                    <h3 className="text-sm font-medium text-orange-400 mb-2">Row Errors ({parseErrors.filter((e) => e.row > 0).length} rows will be skipped)</h3>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {parseErrors.filter((e) => e.row > 0).map((err, i) => (
                        <p key={i} className="text-xs text-orange-400/80"><span className="font-semibold">Row {err.row}:</span> {err.message}</p>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-white dark:bg-[#141414] rounded-lg border border-gray-200 dark:border-white/6 overflow-hidden">
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0">
                        <tr className="bg-white dark:bg-[#141414] border-b border-gray-200 dark:border-white/6">
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
                      <tbody className="divide-y divide-gray-100 dark:divide-white/4">
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
                    <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 dark:bg-white/2 border-t border-gray-200 dark:border-white/6">
                      Showing first 100 of {rows.length} rows
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Done Step */}
            {step === "done" && result && (
              <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-white/6 p-6">
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
                  <div className="bg-gray-50 dark:bg-white/4 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">{result.total}</div>
                    <div className="text-sm text-gray-500">Total</div>
                  </div>
                </div>
                {result.errors.length > 0 && (
                  <div className="bg-orange-500/10 rounded-lg border border-orange-500/20 p-4 mb-4">
                    <h3 className="text-sm font-medium text-orange-400 mb-2">Import Errors</h3>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {result.errors.map((err, i) => (
                        <p key={i} className="text-xs text-orange-400/80">Row {err.row}: {err.message}</p>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  onClick={resetImport}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors"
                >
                  Import More Data
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
