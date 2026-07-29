import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Alert, Badge, Button, Card, Field, PageHeader, inputClass } from "../components/ui";
import { EditIcon, PlusIcon, TrashIcon } from "../components/Icons";
import { aircraftLabel } from "../utils/format";
import type { Aircraft as AircraftType } from "../types";

const CATEGORY_OPTIONS = [
  "Airplane",
  "Rotorcraft",
  "Glider",
  "Lighter-than-Air",
  "Powered-Lift",
  "Powered Parachute",
  "Weight-Shift-Control",
];

const CLASS_OPTIONS = ["Single-Engine Land", "Multi-Engine Land", "Single-Engine Sea", "Multi-Engine Sea", "Helicopter", "Gyroplane"];

interface AircraftFormState {
  id?: string;
  tailNumber: string;
  make: string;
  model: string;
  category: string;
  class: string;
  complex: boolean;
  highPerformance: boolean;
  tailwheel: boolean;
  active: boolean;
  emptyWeight: string;
  emptyWeightCG: string;
  usefulLoad: string;
  maxGrossWeight: string;
  cgRangeForward: string;
  cgRangeAft: string;
  engine: string;
  horsepower: string;
  fuelCapacity: string;
  usableFuel: string;
  oilCapacity: string;
  cruiseSpeed: string;
}

const emptyForm: AircraftFormState = {
  tailNumber: "",
  make: "",
  model: "",
  category: "",
  class: "",
  complex: false,
  highPerformance: false,
  tailwheel: false,
  active: true,
  emptyWeight: "",
  emptyWeightCG: "",
  usefulLoad: "",
  maxGrossWeight: "",
  cgRangeForward: "",
  cgRangeAft: "",
  engine: "",
  horsepower: "",
  fuelCapacity: "",
  usableFuel: "",
  oilCapacity: "",
  cruiseSpeed: "",
};

function numOrNull(value: string): number | null {
  return value === "" ? null : Number(value);
}

function numToStr(value: number | null): string {
  return value === null ? "" : String(value);
}

export default function Aircraft() {
  const { user } = useAuth();
  const canEdit = user?.role === "administrator" || user?.role === "instructor";

  const [aircraft, setAircraft] = useState<AircraftType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AircraftFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api.aircraft
      .list()
      .then(setAircraft)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        tailNumber: form.tailNumber,
        make: form.make,
        model: form.model,
        category: form.category,
        class: form.class,
        complex: form.complex,
        highPerformance: form.highPerformance,
        tailwheel: form.tailwheel,
        active: form.active,
        emptyWeight: numOrNull(form.emptyWeight),
        emptyWeightCG: numOrNull(form.emptyWeightCG),
        usefulLoad: numOrNull(form.usefulLoad),
        maxGrossWeight: numOrNull(form.maxGrossWeight),
        cgRangeForward: numOrNull(form.cgRangeForward),
        cgRangeAft: numOrNull(form.cgRangeAft),
        engine: form.engine,
        horsepower: numOrNull(form.horsepower),
        fuelCapacity: numOrNull(form.fuelCapacity),
        usableFuel: numOrNull(form.usableFuel),
        oilCapacity: numOrNull(form.oilCapacity),
        cruiseSpeed: numOrNull(form.cruiseSpeed),
      };
      if (form.id) {
        await api.aircraft.update(form.id, payload);
      } else {
        await api.aircraft.create(payload);
      }
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(a: AircraftType) {
    setForm({
      id: a.id,
      tailNumber: a.tailNumber,
      make: a.make,
      model: a.model,
      category: a.category,
      class: a.class,
      complex: a.complex,
      highPerformance: a.highPerformance,
      tailwheel: a.tailwheel,
      active: a.active,
      emptyWeight: numToStr(a.emptyWeight),
      emptyWeightCG: numToStr(a.emptyWeightCG),
      usefulLoad: numToStr(a.usefulLoad),
      maxGrossWeight: numToStr(a.maxGrossWeight),
      cgRangeForward: numToStr(a.cgRangeForward),
      cgRangeAft: numToStr(a.cgRangeAft),
      engine: a.engine,
      horsepower: numToStr(a.horsepower),
      fuelCapacity: numToStr(a.fuelCapacity),
      usableFuel: numToStr(a.usableFuel),
      oilCapacity: numToStr(a.oilCapacity),
      cruiseSpeed: numToStr(a.cruiseSpeed),
    });
    setShowForm(true);
  }

  async function remove(a: AircraftType) {
    if (!confirm(`Delete ${aircraftLabel(a)}? This cannot be undone.`)) return;
    setError(null);
    try {
      await api.aircraft.remove(a.id);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const sorted = [...aircraft].sort((a, b) => a.tailNumber.localeCompare(b.tailNumber));

  return (
    <div>
      <PageHeader
        title="Aircraft"
        subtitle="Fleet used for flight sessions on the Calendar"
        actions={
          canEdit ? (
            <Button
              onClick={() => {
                setForm(emptyForm);
                setShowForm((s) => !s);
              }}
            >
              <PlusIcon width={16} height={16} /> Add Aircraft
            </Button>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      {showForm && canEdit && (
        <Card className="p-5 mb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-3">Basic Info</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Tail Number">
                  <input
                    className={inputClass}
                    value={form.tailNumber}
                    onChange={(e) => setForm({ ...form, tailNumber: e.target.value })}
                    placeholder="e.g. N12345"
                    required
                    autoFocus
                  />
                </Field>
                <Field label="Make">
                  <input
                    className={inputClass}
                    value={form.make}
                    onChange={(e) => setForm({ ...form, make: e.target.value })}
                    placeholder="e.g. Cessna"
                  />
                </Field>
                <Field label="Model">
                  <input
                    className={inputClass}
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    placeholder="e.g. 172S"
                  />
                </Field>
                <Field label="Category">
                  <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    <option value="">—</option>
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Class">
                  <select className={inputClass} value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value })}>
                    <option value="">—</option>
                    {CLASS_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
                {form.id && (
                  <Field label="Status">
                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 h-full">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 dark:border-slate-700"
                        checked={form.active}
                        onChange={(e) => setForm({ ...form, active: e.target.checked })}
                      />
                      Active (shown when scheduling new flight sessions)
                    </label>
                  </Field>
                )}
                <div className="sm:col-span-2 flex flex-wrap gap-5">
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 dark:border-slate-700"
                      checked={form.complex}
                      onChange={(e) => setForm({ ...form, complex: e.target.checked })}
                    />
                    Complex
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 dark:border-slate-700"
                      checked={form.highPerformance}
                      onChange={(e) => setForm({ ...form, highPerformance: e.target.checked })}
                    />
                    High Performance
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 dark:border-slate-700"
                      checked={form.tailwheel}
                      onChange={(e) => setForm({ ...form, tailwheel: e.target.checked })}
                    />
                    Tailwheel
                  </label>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-3">Weight &amp; Balance</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Empty Weight (lbs)">
                  <input
                    type="number"
                    step="any"
                    className={inputClass}
                    value={form.emptyWeight}
                    onChange={(e) => setForm({ ...form, emptyWeight: e.target.value })}
                  />
                </Field>
                <Field label="Empty Weight CG (in)">
                  <input
                    type="number"
                    step="any"
                    className={inputClass}
                    value={form.emptyWeightCG}
                    onChange={(e) => setForm({ ...form, emptyWeightCG: e.target.value })}
                  />
                </Field>
                <Field label="Useful Load (lbs)">
                  <input
                    type="number"
                    step="any"
                    className={inputClass}
                    value={form.usefulLoad}
                    onChange={(e) => setForm({ ...form, usefulLoad: e.target.value })}
                  />
                </Field>
                <Field label="Max Gross Weight (lbs)">
                  <input
                    type="number"
                    step="any"
                    className={inputClass}
                    value={form.maxGrossWeight}
                    onChange={(e) => setForm({ ...form, maxGrossWeight: e.target.value })}
                  />
                </Field>
                <Field label="CG Range Forward (in)">
                  <input
                    type="number"
                    step="any"
                    className={inputClass}
                    value={form.cgRangeForward}
                    onChange={(e) => setForm({ ...form, cgRangeForward: e.target.value })}
                  />
                </Field>
                <Field label="CG Range Aft (in)">
                  <input
                    type="number"
                    step="any"
                    className={inputClass}
                    value={form.cgRangeAft}
                    onChange={(e) => setForm({ ...form, cgRangeAft: e.target.value })}
                  />
                </Field>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-3">Airplane Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <Field label="Engine">
                    <input
                      className={inputClass}
                      value={form.engine}
                      onChange={(e) => setForm({ ...form, engine: e.target.value })}
                      placeholder="e.g. Lycoming O-320"
                    />
                  </Field>
                </div>
                <Field label="Horsepower">
                  <input
                    type="number"
                    step="any"
                    className={inputClass}
                    value={form.horsepower}
                    onChange={(e) => setForm({ ...form, horsepower: e.target.value })}
                  />
                </Field>
                <Field label="Cruise Speed (kts)">
                  <input
                    type="number"
                    step="any"
                    className={inputClass}
                    value={form.cruiseSpeed}
                    onChange={(e) => setForm({ ...form, cruiseSpeed: e.target.value })}
                  />
                </Field>
                <Field label="Fuel Capacity (gal)">
                  <input
                    type="number"
                    step="any"
                    className={inputClass}
                    value={form.fuelCapacity}
                    onChange={(e) => setForm({ ...form, fuelCapacity: e.target.value })}
                  />
                </Field>
                <Field label="Usable Fuel (gal)">
                  <input
                    type="number"
                    step="any"
                    className={inputClass}
                    value={form.usableFuel}
                    onChange={(e) => setForm({ ...form, usableFuel: e.target.value })}
                  />
                </Field>
                <Field label="Oil Capacity (qt)">
                  <input
                    type="number"
                    step="any"
                    className={inputClass}
                    value={form.oilCapacity}
                    onChange={(e) => setForm({ ...form, oilCapacity: e.target.value })}
                  />
                </Field>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {form.id ? "Save Changes" : "Add Aircraft"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setForm(emptyForm);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading aircraft…</p>
      ) : sorted.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-400">No aircraft yet. Add one to get started.</Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-5 py-2 font-medium">Tail Number</th>
                  <th className="px-5 py-2 font-medium">Make / Model</th>
                  <th className="px-5 py-2 font-medium hidden md:table-cell">Category / Class</th>
                  <th className="px-5 py-2 font-medium hidden lg:table-cell">Flags</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                  {canEdit && <th className="px-5 py-2 font-medium text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sorted.map((a) => (
                  <tr key={a.id}>
                    <td className="px-5 py-2.5 font-medium text-slate-800 dark:text-slate-100">{a.tailNumber}</td>
                    <td className="px-5 py-2.5 text-slate-500">{[a.make, a.model].filter(Boolean).join(" ") || "—"}</td>
                    <td className="px-5 py-2.5 text-slate-500 hidden md:table-cell">
                      {[a.category, a.class].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-5 py-2.5 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {a.complex && <Badge tone="blue">Complex</Badge>}
                        {a.highPerformance && <Badge tone="amber">High Perf</Badge>}
                        {a.tailwheel && <Badge tone="slate">Tailwheel</Badge>}
                        {!a.complex && !a.highPerformance && !a.tailwheel && <span className="text-slate-400">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-2.5">
                      <Badge tone={a.active ? "green" : "slate"}>{a.active ? "Active" : "Inactive"}</Badge>
                    </td>
                    {canEdit && (
                      <td className="px-5 py-2.5">
                        <div className="flex justify-end gap-1">
                          <button
                            className="p-1.5 rounded-md text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800"
                            onClick={() => startEdit(a)}
                            title="Edit"
                          >
                            <EditIcon width={16} height={16} />
                          </button>
                          <button
                            className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800"
                            onClick={() => remove(a)}
                            title="Delete"
                          >
                            <TrashIcon width={16} height={16} />
                          </button>
                        </div>
                      </td>
                    )}
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
