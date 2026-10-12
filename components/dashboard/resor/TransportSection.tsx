"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CalendarDays, Clock3, Edit3, LoaderCircle, MapPin, Plus, Save, Trash2, X, Plane } from "lucide-react";

type TransportKind = "flight" | "train" | "ferry" | "bus" | "car" | "other";
type Transport = {
  id: string; trip_id: string; kind: TransportKind; provider: string; reference: string;
  departure_place: string; arrival_place: string; departure_at: string | null;
  arrival_at: string | null; cost_sek: number | null; notes: string; created_at: string;
};
type Draft = Omit<Transport, "id" | "trip_id" | "created_at" | "departure_at" | "arrival_at" | "cost_sek"> & {
  departure_at: string; arrival_at: string; cost_sek: string;
};
const EMPTY: Draft = { kind: "flight", provider: "", reference: "", departure_place: "", arrival_place: "", departure_at: "", arrival_at: "", cost_sek: "", notes: "" };
const kinds: { value: TransportKind; label: string }[] = [
  { value: "flight", label: "Flyg" }, { value: "train", label: "Tåg" },
  { value: "ferry", label: "Färja" }, { value: "bus", label: "Buss" },
  { value: "car", label: "Bil / hyrbil" }, { value: "other", label: "Övrigt" },
];
const field = "w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-400";
const button = "inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10";
function localInput(value: string | null): string {
  if (!value) return "";
  // Behåll den lokala klocktiden som användaren skrev, utan att ändra tidszon.
  return value.slice(0, 16);
}
function prettyDate(value: string | null): string {
  if (!value) return "Tid ej angiven";
  return value.slice(0, 16).replace("T", " kl. ");
}
export default function TransportSection({ tripId }: { tripId: string }) {
  const [items, setItems] = useState<Transport[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ ...EMPTY });
  const [deleteTarget, setDeleteTarget] = useState<Transport | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/resor/transports?tripId=${encodeURIComponent(tripId)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Kunde inte läsa transporter.");
      setItems(data.transports ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "Ett fel uppstod."); }
    finally { setLoading(false); }
  }, [tripId]);
  useEffect(() => { void load(); }, [load]);
  const create = () => { setDraft({ ...EMPTY }); setEditingId(null); setError(""); setOpen(true); };
  const edit = (t: Transport) => {
    setDraft({ kind: t.kind, provider: t.provider, reference: t.reference, departure_place: t.departure_place, arrival_place: t.arrival_place, departure_at: localInput(t.departure_at), arrival_at: localInput(t.arrival_at), cost_sek: t.cost_sek === null ? "" : String(t.cost_sek), notes: t.notes });
    setEditingId(t.id); setError(""); setOpen(true);
  };
  const change = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(p => ({ ...p, [key]: value }));
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setSaving(true);
    try {
      const response = await fetch("/api/resor/transports", {
        method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, id: editingId, trip_id: tripId, departure_at: draft.departure_at || null, arrival_at: draft.arrival_at || null, cost_sek: draft.cost_sek.trim() === "" ? null : Number(draft.cost_sek.replace(",", ".")) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Kunde inte spara transporten.");
      setItems(p => editingId ? p.map(t => t.id === editingId ? data.transport : t) : [...p, data.transport]);
      setOpen(false); setEditingId(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Ett fel uppstod."); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    if (!deleteTarget) return;
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/resor/transports", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: deleteTarget.id, trip_id: tripId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Kunde inte ta bort transporten.");
      setItems(p => p.filter(t => t.id !== deleteTarget.id)); setDeleteTarget(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Ett fel uppstod."); }
    finally { setSaving(false); }
  };
  const sorted = [...items].sort((a, b) => (a.departure_at ?? "9999").localeCompare(b.departure_at ?? "9999"));
  return <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 sm:col-span-2">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><span className="rounded-xl bg-blue-500/15 p-2.5 text-blue-300"><Plane size={21}/></span><div><h3 className="font-semibold">Transport</h3><p className="text-sm text-slate-400">Flyg, tåg, färja, buss och bil</p></div></div>
      <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-3 py-2 text-sm font-semibold hover:bg-blue-400" onClick={create}><Plus size={16}/> Lägg till transport</button>
    </div>
    {loading && <p className="mt-4 flex items-center gap-2 text-sm text-slate-300"><LoaderCircle size={17} className="animate-spin"/> Hämtar transporter…</p>}
    {!loading && sorted.length === 0 && <p className="mt-4 rounded-xl border border-dashed border-white/15 p-5 text-sm text-slate-400">Inga transporter tillagda ännu.</p>}
    {!loading && sorted.length > 0 && <div className="mt-4 space-y-3">{sorted.map(t => <article key={t.id} className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
      <div className="flex flex-wrap justify-between gap-3"><div><p className="text-sm font-semibold text-blue-200">{kinds.find(k => k.value === t.kind)?.label ?? "Transport"}{t.provider ? ` · ${t.provider}` : ""}</p><p className="mt-1 font-semibold">{t.departure_place || "Avresa ej angiven"} → {t.arrival_place || "Ankomst ej angiven"}</p></div><div className="flex gap-2"><button type="button" className={button} onClick={() => edit(t)}><Edit3 size={15}/> Redigera</button><button type="button" className={`${button} text-red-200`} onClick={() => setDeleteTarget(t)}><Trash2 size={15}/></button></div></div>
      <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2"><p className="flex items-center gap-2"><CalendarDays size={15}/> Avresa: {prettyDate(t.departure_at)}</p><p className="flex items-center gap-2"><Clock3 size={15}/> Ankomst: {prettyDate(t.arrival_at)}</p></div>
      {t.reference && <p className="mt-2 text-sm text-slate-300">Bokningsnummer: {t.reference}</p>}{t.cost_sek !== null && <p className="mt-2 text-sm text-slate-300">Kostnad: {t.cost_sek.toLocaleString("sv-SE")} kr</p>}{t.notes && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-400">{t.notes}</p>}
    </article>)}</div>}
    {error && !open && !deleteTarget && <p role="alert" className="mt-4 text-sm text-red-300">{error} <button type="button" onClick={() => void load()} className="underline">Försök igen</button></p>}
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-3" role="dialog" aria-modal="true" aria-label={editingId ? "Redigera transport" : "Ny transport"}><form onSubmit={(e) => void save(e)} className="my-auto w-full max-w-xl space-y-3 rounded-3xl border border-white/15 bg-slate-900 p-5 shadow-2xl sm:p-7"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">{editingId ? "Redigera transport" : "Lägg till transport"}</h2><button type="button" onClick={() => setOpen(false)} aria-label="Stäng"><X size={20}/></button></div>
      <label className="block space-y-1 text-sm">Typ<select className={field} value={draft.kind} onChange={e => change("kind", e.target.value as TransportKind)}>{kinds.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}</select></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-1 text-sm">Bolag / operatör<input className={field} maxLength={120} value={draft.provider} onChange={e => change("provider", e.target.value)} placeholder="Exempel: SAS"/></label><label className="block space-y-1 text-sm">Bokningsnummer<input className={field} maxLength={120} value={draft.reference} onChange={e => change("reference", e.target.value)}/></label></div>
      <div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-1 text-sm">Från<input className={field} maxLength={160} value={draft.departure_place} onChange={e => change("departure_place", e.target.value)} placeholder="Göteborg"/></label><label className="block space-y-1 text-sm">Till<input className={field} maxLength={160} value={draft.arrival_place} onChange={e => change("arrival_place", e.target.value)} placeholder="Köpenhamn"/></label></div>
      <div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-1 text-sm">Avresa (lokal tid)<input type="datetime-local" className={field} value={draft.departure_at} onChange={e => change("departure_at", e.target.value)}/></label><label className="block space-y-1 text-sm">Ankomst (lokal tid)<input type="datetime-local" className={field} value={draft.arrival_at} onChange={e => change("arrival_at", e.target.value)}/></label></div>
      <label className="block space-y-1 text-sm">Kostnad (SEK)<input type="number" min="0" step="0.01" className={field} value={draft.cost_sek} onChange={e => change("cost_sek", e.target.value)} placeholder="Valfritt"/></label>
      <label className="block space-y-1 text-sm">Anteckningar<textarea rows={3} maxLength={2000} className={field} value={draft.notes} onChange={e => change("notes", e.target.value)}/></label>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <div className="flex justify-end gap-2"><button type="button" className={button} onClick={() => setOpen(false)}>Avbryt</button><button disabled={saving} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold disabled:opacity-50"><Save size={16}/>{saving ? "Sparar…" : "Spara transport"}</button></div>
    </form></div>}
    {deleteTarget && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" role="dialog" aria-modal="true" aria-label="Ta bort transport"><div className="w-full max-w-md rounded-3xl border border-white/15 bg-slate-900 p-6"><h2 className="text-xl font-bold">Ta bort transport?</h2><p className="mt-3 text-sm text-slate-300">Transporten tas bort permanent.</p>{error && <p className="mt-2 text-sm text-red-300">{error}</p>}<div className="mt-5 flex justify-end gap-2"><button type="button" className={button} onClick={() => setDeleteTarget(null)}>Avbryt</button><button type="button" disabled={saving} onClick={() => void remove()} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold disabled:opacity-50">{saving ? "Tar bort…" : "Ta bort"}</button></div></div></div>}
  </section>;
}
