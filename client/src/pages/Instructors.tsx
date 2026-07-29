import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Alert, Card, PageHeader } from "../components/ui";
import { formatDate } from "../utils/format";
import type { SafeUser } from "../types";

export default function Instructors() {
  const { user } = useAuth();
  const isAdmin = user?.role === "administrator";
  const [instructors, setInstructors] = useState<SafeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.instructors
      .list()
      .then(setInstructors)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const sorted = [...instructors].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <PageHeader
        title="Instructors"
        subtitle={
          isAdmin
            ? "Shared with User Accounts on the Accounting side — add or edit instructor accounts there"
            : "Instructor roster"
        }
      />

      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading instructors…</p>
      ) : sorted.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-400">
          {isAdmin ? (
            <>
              No instructors yet.{" "}
              <Link to="/user-accounts" className="text-brand-600 hover:underline">
                Add one in User Accounts
              </Link>
              .
            </>
          ) : (
            "No instructors yet."
          )}
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-5 py-2 font-medium">Name</th>
                  <th className="px-5 py-2 font-medium">Email</th>
                  <th className="px-5 py-2 font-medium hidden md:table-cell">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sorted.map((i) => (
                  <tr key={i.id}>
                    <td className="px-5 py-2.5 font-medium text-slate-800 dark:text-slate-100">{i.name}</td>
                    <td className="px-5 py-2.5 text-slate-500">{i.email}</td>
                    <td className="px-5 py-2.5 text-slate-500 hidden md:table-cell">{formatDate(i.createdAt.slice(0, 10))}</td>
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
