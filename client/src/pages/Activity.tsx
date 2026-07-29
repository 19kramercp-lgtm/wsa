import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useClients } from "../utils/useClients";
import { Alert, Card, PageHeader, inputClass } from "../components/ui";
import { formatCurrency, formatDate, fullName } from "../utils/format";
import type { ActivityEntry } from "../types";

export default function Activity() {
  const { user } = useAuth();
  const isStudent = user?.role === "student";
  const { clients } = useClients();

  const [selectedClientId, setSelectedClientId] = useState("");
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    api.activity
      .list(isStudent ? undefined : selectedClientId || undefined)
      .then(setEntries)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [selectedClientId, isStudent]);

  const total = entries.reduce((sum, e) => sum + e.amount, 0);

  if (isStudent && !user?.clientId) {
    return (
      <div>
        <PageHeader title="Activity" subtitle="Charges recorded to your student account" />
        <Card className="p-10 text-center text-sm text-slate-400">
          Your account isn't linked to a student record yet — ask your administrator to link it in User Accounts.
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Activity"
        subtitle={isStudent ? "Charges recorded to your student account" : "Revenue charged to students"}
        actions={
          !isStudent ? (
            <select className={`${inputClass} w-56`} value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)}>
              <option value="">All Students</option>
              {[...clients]
                .sort((a, b) => fullName(a).localeCompare(fullName(b)))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {fullName(c)}
                  </option>
                ))}
            </select>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading activity…</p>
      ) : entries.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-400">No charges recorded yet.</Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-5 py-2 font-medium">Date</th>
                  {!isStudent && !selectedClientId && <th className="px-5 py-2 font-medium">Student</th>}
                  <th className="px-5 py-2 font-medium">Description</th>
                  <th className="px-5 py-2 font-medium hidden md:table-cell">Category</th>
                  <th className="px-5 py-2 font-medium hidden md:table-cell">Reference</th>
                  <th className="px-5 py-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="px-5 py-2.5 text-slate-500">{formatDate(e.date)}</td>
                    {!isStudent && !selectedClientId && (
                      <td className="px-5 py-2.5 font-medium text-slate-800 dark:text-slate-100">{e.studentName}</td>
                    )}
                    <td className="px-5 py-2.5 text-slate-700 dark:text-slate-200">{e.memo}</td>
                    <td className="px-5 py-2.5 text-slate-500 hidden md:table-cell">{e.accountName || "—"}</td>
                    <td className="px-5 py-2.5 font-mono text-xs text-slate-400 hidden md:table-cell">{e.reference}</td>
                    <td className="px-5 py-2.5 text-right font-medium text-slate-800 dark:text-slate-100">
                      {formatCurrency(e.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-5 py-2.5 font-semibold text-slate-700 dark:text-slate-200" colSpan={!isStudent && !selectedClientId ? 5 : 4}>
                    Total
                  </td>
                  <td className="px-5 py-2.5 text-right font-semibold text-slate-800 dark:text-slate-100">
                    {formatCurrency(total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
