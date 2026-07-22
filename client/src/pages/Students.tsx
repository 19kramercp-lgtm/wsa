import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Alert, Card, PageHeader } from "../components/ui";
import { fullName } from "../utils/format";
import type { Client } from "../types";

export default function Students() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.clients
      .list()
      .then(setClients)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const sorted = [...clients].sort((a, b) => fullName(a).localeCompare(fullName(b)));

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle="Shared with Clients on the Accounting side — add or edit a student's contact info there"
      />

      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading students…</p>
      ) : sorted.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-400">
          No students yet.{" "}
          <Link to="/clients" className="text-brand-600 hover:underline">
            Add one in Clients
          </Link>
          .
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-5 py-2 font-medium">Name</th>
                  <th className="px-5 py-2 font-medium">Phone</th>
                  <th className="px-5 py-2 font-medium hidden md:table-cell">Email</th>
                  <th className="px-5 py-2 font-medium text-right">Training Record</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sorted.map((c) => (
                  <tr key={c.id}>
                    <td className="px-5 py-2.5 font-medium text-slate-800 dark:text-slate-100">{fullName(c)}</td>
                    <td className="px-5 py-2.5 text-slate-500">{c.phone || "—"}</td>
                    <td className="px-5 py-2.5 text-slate-500 hidden md:table-cell">{c.email || "—"}</td>
                    <td className="px-5 py-2.5 text-right">
                      <Link to={`/training/students/${c.id}`} className="text-brand-600 hover:underline font-medium">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
