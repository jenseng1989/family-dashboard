"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { LoaderCircle, RefreshCw, Save, Wallet } from "lucide-react";

type Totals = { transport: number; accommodation: number; activity: number };
type BudgetResponse = { target_sek: number | null; totals: Totals; error?: string };
const money = (amount: number) => new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 2 }).format(amount);

export default function BudgetSection({ tripId }: { tripId: string }) {
  const [budget, setBudget] = useState<BudgetResponse | null>(null);
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const fetchItems = useCallback(() => {
    return fetch(`/api/resor/budget?tripId=${encodeURIComponent(tripId)}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const json = (await response.json()) as BudgetResponse;
        if (!response.ok)
          throw new Error(json.error || "Kunde inte läsa budgeten.");
        setBudget(json);
        setTarget(json.target_sek == null ? "" : String(json.target_sek));
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Ett fel uppstod.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [tripId]);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    return fetchItems();
  }, [fetchItems]);

  const [previousFetchKey, setPreviousFetchKey] = useState(() => [tripId]);
  if (previousFetchKey[0] !== tripId) {
    setPreviousFetchKey([tripId]);
    setLoading(true);
    setError("");
  }
  useEffect(() => { void fetchItems(); }, [fetchItems]);
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    const parsed = target.trim() === "" ? null : Number(target.replace(",", "."));
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0 || parsed > 100000000 || Math.round(parsed * 100) !== parsed * 100)) { setError("Ange en giltig budget i kronor."); setSaving(false); return; }
    try {
      const response = await fetch("/api/resor/budget", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trip_id: tripId, target_sek: parsed }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Kunde inte spara budgeten.");
      setBudget(previous => previous ? { ...previous, target_sek: parsed } : previous);
      setMessage("Budgeten är sparad.");
    } catch (e) { setError(e instanceof Error ? e.message : "Ett fel uppstod."); }
    finally { setSaving(false); }
  };
  const totals = budget?.totals;
  const spent = totals ? totals.transport + totals.accommodation + totals.activity : 0;
  const limit = budget?.target_sek;
  const remaining = limit == null ? null : limit - spent;
  const percent = limit && limit > 0 ? Math.min(100, spent / limit * 100) : 0;
  return <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 sm:col-span-2">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="rounded-xl bg-blue-500/15 p-2.5 text-blue-300"><Wallet size={21}/></span><div><h3 className="font-semibold">Resebudget</h3><p className="text-sm text-slate-400">Planerade kostnader för resan</p></div></div><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-50"><RefreshCw size={16}/> Uppdatera kostnader</button></div>
    {loading ? <p className="mt-4 flex items-center gap-2 text-sm text-slate-300"><LoaderCircle size={17} className="animate-spin"/> Hämtar budget…</p> : <>
      <form onSubmit={(e) => void save(e)} className="mt-5 flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1 space-y-1 text-sm text-slate-200">Totalbudget (SEK)<input type="number" min="0" max="100000000" step="0.01" value={target} onChange={e => {setTarget(e.target.value);setMessage("");}} placeholder="Ange totalbudget" className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-400"/></label><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold hover:bg-blue-400 disabled:opacity-50"><Save size={16}/>{saving ? "Sparar…" : "Spara budget"}</button></form>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">{([ ["Transport", totals?.transport ?? 0], ["Boende", totals?.accommodation ?? 0], ["Aktiviteter", totals?.activity ?? 0] ] as const).map(([label, value]) => <div key={label} className="rounded-xl border border-white/10 bg-slate-950/25 p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-lg font-semibold">{money(value)}</p></div>)}</div>
      <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/25 p-4"><p className="text-sm text-slate-400">Totalt planerat</p><p className="mt-1 text-2xl font-bold">{money(spent)}</p>{limit !== null && limit !== undefined && <><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${remaining !== null && remaining < 0 ? "bg-red-400" : "bg-blue-400"}`} style={{ width: `${percent}%` }}/></div><p className={`mt-2 text-sm ${remaining !== null && remaining < 0 ? "text-red-300" : "text-slate-300"}`}>{remaining !== null && remaining < 0 ? `${money(Math.abs(remaining))} över budget` : `${money(remaining ?? 0)} kvar av ${money(limit)}`}</p></>}</div>
      <p className="mt-3 text-xs text-slate-400">Beloppen summeras från registrerade transporter, boenden och aktiviteter. Detta är planerade kostnader, inte bekräftade betalningar. Uppdatera efter att du ändrat en post.</p>
    </>}
    {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}{message && <p role="status" className="mt-3 text-sm text-green-300">{message}</p>}
  </section>;
}
