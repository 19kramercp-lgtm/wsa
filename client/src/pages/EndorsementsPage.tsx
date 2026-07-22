import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Badge, Card, Field, PageHeader, inputClass } from "../components/ui";
import { fullName, formatDate, todayISO } from "../utils/format";
import type { Client, EndorsementRecord } from "../types";

export default function EndorsementsPage() {
  const [endorsements, setEndorsements] = useState<EndorsementRecord[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.endorsements.list(), api.clients.list()])
      .then(([e, c]) => {
        setEndorsements(e);
        setClients(c);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const sortedClients = useMemo(() => [...clients].sort((a, b) => fullName(a).localeCompare(fullName(b))), [clients]);

  const filtered = (clientId ? endorsements.filter((e) => e.clientId === clientId) : endorsements)
    .slice()
    .sort((a, b) => b.dateGiven.localeCompare(a.dateGiven));

  const today = todayISO();

  return (
    <div>
      <PageHeader title="Endorsements" subtitle="Every endorsement given across all students, with expirations at a glance" />

      <Card className="p-5 mb-6">
        <Field label="Student">
          <select className={inputClass} value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">All students</option>
            {sortedClients.map((c) => (
              <option key={c.id} value={c.id}>
                {fullName(c)}
              </option>
            ))}
          </select>
        </Field>
      </Card>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">Loading endorsements…</p>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-400">No endorsements recorded yet.</Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-5 py-2 font-medium">Student</th>
                  <th className="px-5 py-2 font-medium">Endorsement</th>
                  <th className="px-5 py-2 font-medium">FAR</th>
                  <th className="px-5 py-2 font-medium">Given By</th>
                  <th className="px-5 py-2 font-medium">Date</th>
                  <th className="px-5 py-2 font-medium">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((record) => {
                  const expired = record.expiresOn ? record.expiresOn < today : false;
                  return (
                    <tr key={record.id}>
                      <td className="px-5 py-2.5">
                        <Link
                          to={`/training/students/${record.clientId}`}
                          className="font-medium text-brand-600 hover:underline"
                        >
                          {clientById.get(record.clientId) ? fullName(clientById.get(record.clientId)!) : "Unknown"}
                        </Link>
                      </td>
                      <td className="px-5 py-2.5 text-slate-700 dark:text-slate-200">{record.title}</td>
                      <td className="px-5 py-2.5 font-mono text-xs text-slate-400">{record.farReference || "—"}</td>
                      <td className="px-5 py-2.5 text-slate-500">{record.instructorName || "—"}</td>
                      <td className="px-5 py-2.5 text-slate-500">{formatDate(record.dateGiven)}</td>
                      <td className="px-5 py-2.5">
                        {record.expiresOn ? (
                          <Badge tone={expired ? "red" : "slate"}>{formatDate(record.expiresOn)}</Badge>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
