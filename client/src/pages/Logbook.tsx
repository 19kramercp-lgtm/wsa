import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Card, Field, PageHeader, inputClass } from "../components/ui";
import { fullName, formatDate } from "../utils/format";
import type { Aircraft, Client, Instructor, LogbookEntry } from "../types";

export default function Logbook() {
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [clientId, setClientId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.logbook.list(), api.clients.list(), api.aircraft.list(), api.instructors.list()])
      .then(([e, c, a, i]) => {
        setEntries(e);
        setClients(c);
        setAircraft(a);
        setInstructors(i);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const aircraftById = useMemo(() => new Map(aircraft.map((a) => [a.id, a])), [aircraft]);
  const instructorById = useMemo(() => new Map(instructors.map((i) => [i.id, i])), [instructors]);
  const sortedClients = useMemo(() => [...clients].sort((a, b) => fullName(a).localeCompare(fullName(b))), [clients]);

  const filtered = (clientId ? entries.filter((e) => e.clientId === clientId) : entries)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  return (
    <div>
      <PageHeader title="Logbook" subtitle="Every flight logged across all students — filter to one student to review or edit" />

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
        <p className="text-sm text-slate-500">Loading logbook…</p>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-400">No logbook entries yet.</Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-5 py-2 font-medium">Date</th>
                  <th className="px-5 py-2 font-medium">Student</th>
                  <th className="px-5 py-2 font-medium">Aircraft</th>
                  <th className="px-5 py-2 font-medium">Instructor</th>
                  <th className="px-5 py-2 font-medium">Route</th>
                  <th className="px-5 py-2 font-medium text-right">Total</th>
                  <th className="px-5 py-2 font-medium text-right">Landings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-5 py-2.5 text-slate-500">{formatDate(entry.date)}</td>
                    <td className="px-5 py-2.5">
                      <Link
                        to={`/training/students/${entry.clientId}`}
                        className="font-medium text-brand-600 hover:underline"
                      >
                        {clientById.get(entry.clientId) ? fullName(clientById.get(entry.clientId)!) : "Unknown"}
                      </Link>
                    </td>
                    <td className="px-5 py-2.5 text-slate-500">
                      {entry.aircraftId ? aircraftById.get(entry.aircraftId)?.tailNumber ?? "—" : "—"}
                    </td>
                    <td className="px-5 py-2.5 text-slate-500">
                      {entry.instructorId
                        ? fullName(instructorById.get(entry.instructorId) ?? { firstName: "—", lastName: "" })
                        : "Solo"}
                    </td>
                    <td className="px-5 py-2.5 text-slate-500">{entry.route || "—"}</td>
                    <td className="px-5 py-2.5 text-right font-medium text-slate-800 dark:text-slate-100">
                      {entry.totalTime.toFixed(1)}
                    </td>
                    <td className="px-5 py-2.5 text-right text-slate-500">
                      {entry.dayLandings + entry.nightLandings > 0 ? `${entry.dayLandings}/${entry.nightLandings}` : "—"}
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
