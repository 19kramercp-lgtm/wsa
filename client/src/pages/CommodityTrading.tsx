import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { Alert, Badge, Button, Card, Field, PageHeader, inputClass } from "../components/ui";
import { EditIcon, PlusIcon, TrashIcon } from "../components/Icons";
import PLChart, { type PLChartPoint } from "../components/PLChart";
import { formatCurrency, formatDate, todayISO } from "../utils/format";
import type { CommodityOptionType, CommodityTrade, TradeSide } from "../types";

interface FormState {
  id?: string;
  commodity: string;
  optionType: CommodityOptionType;
  side: TradeSide;
  strikePrice: string;
  expirationDate: string;
  contracts: string;
  multiplier: string;
  entryPrice: string;
  entryDate: string;
  exitPrice: string;
  exitDate: string;
  notes: string;
}

const emptyForm: FormState = {
  commodity: "",
  optionType: "call",
  side: "long",
  strikePrice: "",
  expirationDate: "",
  contracts: "1",
  multiplier: "100",
  entryPrice: "",
  entryDate: todayISO(),
  exitPrice: "",
  exitDate: "",
  notes: "",
};

function tradePL(t: CommodityTrade): number {
  if (t.exitPrice === null) return 0;
  const diff = t.side === "long" ? t.exitPrice - t.entryPrice : t.entryPrice - t.exitPrice;
  return Math.round(diff * t.contracts * t.multiplier * 100) / 100;
}

function tradeCostBasis(t: CommodityTrade): number {
  return Math.round(t.entryPrice * t.contracts * t.multiplier * 100) / 100;
}

export default function CommodityTrading() {
  const [trades, setTrades] = useState<CommodityTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api.commodityTrades
      .list()
      .then(setTrades)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const strikePrice = Number(form.strikePrice);
    const contracts = Number(form.contracts);
    const multiplier = Number(form.multiplier) || 100;
    const entryPrice = Number(form.entryPrice);
    if (!strikePrice || strikePrice <= 0) {
      setError("Enter a strike price greater than zero.");
      return;
    }
    if (!contracts || contracts <= 0) {
      setError("Enter a number of contracts greater than zero.");
      return;
    }
    if (entryPrice < 0) {
      setError("Entry price can't be negative.");
      return;
    }
    if ((form.exitPrice && !form.exitDate) || (!form.exitPrice && form.exitDate)) {
      setError("Exit price and exit date must be filled in together.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        commodity: form.commodity,
        optionType: form.optionType,
        side: form.side,
        strikePrice,
        expirationDate: form.expirationDate,
        contracts,
        multiplier,
        entryPrice,
        entryDate: form.entryDate,
        exitPrice: form.exitPrice ? Number(form.exitPrice) : null,
        exitDate: form.exitDate || null,
        notes: form.notes,
      };
      if (form.id) {
        await api.commodityTrades.update(form.id, payload);
      } else {
        await api.commodityTrades.create(payload);
      }
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(t: CommodityTrade) {
    setForm({
      id: t.id,
      commodity: t.commodity,
      optionType: t.optionType,
      side: t.side,
      strikePrice: String(t.strikePrice),
      expirationDate: t.expirationDate,
      contracts: String(t.contracts),
      multiplier: String(t.multiplier),
      entryPrice: String(t.entryPrice),
      entryDate: t.entryDate,
      exitPrice: t.exitPrice !== null ? String(t.exitPrice) : "",
      exitDate: t.exitDate ?? "",
      notes: t.notes,
    });
    setShowForm(true);
  }

  async function remove(t: CommodityTrade) {
    if (!confirm(`Delete this ${t.commodity} trade? This cannot be undone.`)) return;
    setError(null);
    try {
      await api.commodityTrades.remove(t.id);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const closedTrades = useMemo(
    () =>
      trades
        .filter((t) => t.exitPrice !== null && t.exitDate)
        .sort((a, b) => (a.exitDate! === b.exitDate! ? a.createdAt.localeCompare(b.createdAt) : a.exitDate!.localeCompare(b.exitDate!))),
    [trades]
  );
  const openTrades = useMemo(() => trades.filter((t) => t.exitPrice === null), [trades]);

  const totalRealizedPL = useMemo(
    () => Math.round(closedTrades.reduce((sum, t) => sum + tradePL(t), 0) * 100) / 100,
    [closedTrades]
  );
  const totalCostBasis = useMemo(
    () => Math.round(closedTrades.reduce((sum, t) => sum + tradeCostBasis(t), 0) * 100) / 100,
    [closedTrades]
  );
  const returnPct = totalCostBasis !== 0 ? (totalRealizedPL / totalCostBasis) * 100 : 0;

  const chartPoints: PLChartPoint[] = useMemo(() => {
    if (closedTrades.length === 0) return [];
    let running = 0;
    const points: PLChartPoint[] = [{ date: closedTrades[0].exitDate!, label: `Start`, value: 0 }];
    for (const t of closedTrades) {
      running = Math.round((running + tradePL(t)) * 100) / 100;
      points.push({ date: t.exitDate!, label: `${formatDate(t.exitDate!)} · ${t.commodity}`, value: running });
    }
    return points;
  }, [closedTrades]);

  const sorted = [...trades].sort((a, b) => b.entryDate.localeCompare(a.entryDate));

  return (
    <div>
      <PageHeader
        title="P/L Commodity Trading"
        subtitle="Track commodity option positions and overall profit/loss"
        actions={
          <Button
            onClick={() => {
              setForm(emptyForm);
              setShowForm((s) => !s);
            }}
          >
            <PlusIcon width={16} height={16} /> Add Trade
          </Button>
        }
      />

      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="p-5 lg:col-span-2">
          <PLChart points={chartPoints} />
        </Card>
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Return</p>
            <p className={`mt-1.5 text-2xl font-semibold ${returnPct >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {returnPct >= 0 ? "+" : ""}
              {returnPct.toFixed(1)}%
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Open Positions</p>
            <p className="mt-1.5 text-2xl font-semibold text-slate-700 dark:text-slate-200">{openTrades.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Closed Positions</p>
            <p className="mt-1.5 text-2xl font-semibold text-slate-700 dark:text-slate-200">{closedTrades.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Cost Basis (Closed)</p>
            <p className="mt-1.5 text-2xl font-semibold text-slate-700 dark:text-slate-200">
              {formatCurrency(totalCostBasis)}
            </p>
          </Card>
        </div>
      </div>

      {showForm && (
        <Card className="p-5 mb-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Commodity">
              <input
                className={inputClass}
                value={form.commodity}
                onChange={(e) => setForm({ ...form, commodity: e.target.value })}
                placeholder="e.g. Crude Oil (CL)"
                required
              />
            </Field>
            <Field label="Option Type">
              <select
                className={inputClass}
                value={form.optionType}
                onChange={(e) => setForm({ ...form, optionType: e.target.value as CommodityOptionType })}
              >
                <option value="call">Call</option>
                <option value="put">Put</option>
              </select>
            </Field>
            <Field label="Side">
              <select
                className={inputClass}
                value={form.side}
                onChange={(e) => setForm({ ...form, side: e.target.value as TradeSide })}
              >
                <option value="long">Long (Bought to open)</option>
                <option value="short">Short (Sold to open)</option>
              </select>
            </Field>
            <Field label="Strike Price">
              <input
                type="number"
                step="0.01"
                min="0"
                className={inputClass}
                value={form.strikePrice}
                onChange={(e) => setForm({ ...form, strikePrice: e.target.value })}
                placeholder="0.00"
                required
              />
            </Field>
            <Field label="Expiration Date">
              <input
                type="date"
                className={inputClass}
                value={form.expirationDate}
                onChange={(e) => setForm({ ...form, expirationDate: e.target.value })}
                required
              />
            </Field>
            <Field label="Contracts">
              <input
                type="number"
                step="1"
                min="1"
                className={inputClass}
                value={form.contracts}
                onChange={(e) => setForm({ ...form, contracts: e.target.value })}
                required
              />
            </Field>
            <Field label="Contract Multiplier" hint="Units per contract (e.g. 100)">
              <input
                type="number"
                step="1"
                min="1"
                className={inputClass}
                value={form.multiplier}
                onChange={(e) => setForm({ ...form, multiplier: e.target.value })}
              />
            </Field>
            <Field label="Entry Price (premium)">
              <input
                type="number"
                step="0.01"
                min="0"
                className={inputClass}
                value={form.entryPrice}
                onChange={(e) => setForm({ ...form, entryPrice: e.target.value })}
                placeholder="0.00"
                required
              />
            </Field>
            <Field label="Entry Date">
              <input
                type="date"
                className={inputClass}
                value={form.entryDate}
                onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
                required
              />
            </Field>
            <div />
            <Field label="Exit Price (optional)" hint="Fill in with exit date to close the position">
              <input
                type="number"
                step="0.01"
                min="0"
                className={inputClass}
                value={form.exitPrice}
                onChange={(e) => setForm({ ...form, exitPrice: e.target.value })}
                placeholder="0.00"
              />
            </Field>
            <Field label="Exit Date (optional)">
              <input
                type="date"
                className={inputClass}
                value={form.exitDate}
                onChange={(e) => setForm({ ...form, exitDate: e.target.value })}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Notes (optional)">
                <input
                  className={inputClass}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optional notes about this trade"
                />
              </Field>
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <Button type="submit" disabled={saving}>
                {form.id ? "Save Changes" : "Add Trade"}
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
        <p className="text-sm text-slate-500">Loading trades…</p>
      ) : sorted.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-400">No trades yet. Add one to get started.</Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed min-w-[920px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-5 py-2 font-medium">Commodity</th>
                  <th className="px-5 py-2 font-medium w-20">Type</th>
                  <th className="px-5 py-2 font-medium w-20">Side</th>
                  <th className="px-5 py-2 font-medium w-24 text-right">Strike</th>
                  <th className="px-5 py-2 font-medium w-28">Expiration</th>
                  <th className="px-5 py-2 font-medium w-20 text-right">Contracts</th>
                  <th className="px-5 py-2 font-medium w-28 text-right">Entry</th>
                  <th className="px-5 py-2 font-medium w-28 text-right">Exit</th>
                  <th className="px-5 py-2 font-medium w-24">Status</th>
                  <th className="px-5 py-2 font-medium w-28 text-right">P/L</th>
                  <th className="px-5 py-2 font-medium text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sorted.map((t) => {
                  const isClosed = t.exitPrice !== null;
                  const pl = isClosed ? tradePL(t) : 0;
                  return (
                    <tr key={t.id}>
                      <td className="px-5 py-2.5 font-medium text-slate-800 dark:text-slate-100">{t.commodity}</td>
                      <td className="px-5 py-2.5 text-slate-500 capitalize">{t.optionType}</td>
                      <td className="px-5 py-2.5 text-slate-500 capitalize">{t.side}</td>
                      <td className="px-5 py-2.5 text-right text-slate-500">{formatCurrency(t.strikePrice)}</td>
                      <td className="px-5 py-2.5 text-slate-500">{formatDate(t.expirationDate)}</td>
                      <td className="px-5 py-2.5 text-right text-slate-500">{t.contracts}</td>
                      <td className="px-5 py-2.5 text-right text-slate-500">
                        {formatCurrency(t.entryPrice)}
                        <div className="text-xs text-slate-400">{formatDate(t.entryDate)}</div>
                      </td>
                      <td className="px-5 py-2.5 text-right text-slate-500">
                        {t.exitPrice !== null ? formatCurrency(t.exitPrice) : "—"}
                        {t.exitDate && <div className="text-xs text-slate-400">{formatDate(t.exitDate)}</div>}
                      </td>
                      <td className="px-5 py-2.5">
                        <Badge tone={isClosed ? "slate" : "blue"}>{isClosed ? "Closed" : "Open"}</Badge>
                      </td>
                      <td
                        className={`px-5 py-2.5 text-right font-medium ${
                          !isClosed ? "text-slate-400" : pl >= 0 ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {isClosed ? formatCurrency(pl) : "—"}
                      </td>
                      <td className="px-5 py-2.5">
                        <div className="flex justify-end gap-1">
                          <button
                            className="p-1.5 rounded-md text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800"
                            onClick={() => startEdit(t)}
                            title="Edit"
                          >
                            <EditIcon width={16} height={16} />
                          </button>
                          <button
                            className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800"
                            onClick={() => remove(t)}
                            title="Delete"
                          >
                            <TrashIcon width={16} height={16} />
                          </button>
                        </div>
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
