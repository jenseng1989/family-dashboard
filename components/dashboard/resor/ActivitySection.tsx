"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CalendarDays, Clock3, Compass, Edit3, LoaderCircle, MapPin, Plus, Save, Trash2, X } from "lucide-react";

type Activity = { id: string; trip_id: string; name: string; kind: string; location: string; activity_date: string | null; start_time: string | null; cost_sek: number | null; notes: string; created_at: string };
type Draft = { name: string; kind: string; location: string; activity_date: string; start_time: string; cost_sek: string; notes: string };
const EMPTY: Draft = { name: "", kind: "sightseeing", location: "", activity_date: "", start_time: "", cost_sek: "", notes: "" };
const kinds = [{ value: "sightseeing", label: "Sevärdhet" }, { value: "nature", label: "Natur" }, { value: "food", label: "Mat & restaurang" }, { value: "culture", label: "Kultur" }, { value: "adventure", label: "Äventyr" }, { value: "other", label: "Övrigt" }];
const field = "w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-400";
const button = "inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10";

export default function ActivitySection({ tripId }: { tripId: string }) {
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ ...EMPTY });
  const [deleteTarget, setDeleteTarget] = useState<Activity | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/resor/activities?tripId=${encodeURIComponent(tripId)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Kunde inte läsa aktiviteter.");
      setItems(data.activities ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "Ett fel uppstod."); }
    finally { setLoading(false); }
  }, [tripId]);
  useEffect(() => { void load(); }, [load]);

  const create = () => { setDraft({ ...EMPTY }); setEditingId(null); setError(""); setOpen(true); };
  const edit = (a: Activity) => {
    setDraft({ name: a.name, kind: a.kind, location: a.location, activity_date: a.activity_date ?? "", start_time: a.start_time?.slice(0, 5) ?? "", cost_sek: a.cost_sek === null ? "" : String(a.cost_sek), notes: a.notes });
    setEditingId(a.id); setError(""); setOpen(true);
  };
  const change = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(p => ({ ...p, [key]: value }));
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/resor/activities", {
        method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, id: editingId, trip_id: tripId, activity_date: draft.activity_date || null, start_time: draft.start_time || null, cost_sek: draft.cost_sek.trim() === "" ? null : Number(draft.cost_sek.replace(",", ".")) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Kunde inte spara aktiviteten.");
      setItems(p => editingId ? p.map(a => a.id === editingId ? data.activity : a) : [...p, data.activity]);
      setOpen(false); setEditingId(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Ett fel uppstod."); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    if (!deleteTarget) return;
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/resor/activities", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: deleteTarget.id, trip_id: tripId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Kunde inte ta bort aktiviteten.");
      setItems(p => p.filter(a => a.id !== deleteTarget.id)); setDeleteTarget(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Ett fel uppstod."); }
    finally { setSaving(false); }
  };
  const sorted = [...items].sort((a, b) => (a.activity_date ?? "9999").localeCompare(b.activity_date ?? "9999") || (a.start_time ?? "99:99").localeCompare(b.start_time ?? "99:99"));

  return <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 sm:col-span-2">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="rounded-xl bg-blue-500/15 p-2.5 text-blue-300"><Compass size={21}/></span><div><h3 className="font-semibold">Aktiviteter</h3><p className="text-sm text-slate-400">Sevärdheter, utflykter och upplevelser</p></div></div><button type="button" className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-3 py-2 text-sm font-semibold hover:bg-blue-400" onClick={create}><Plus size={16}/> Lägg till aktivitet</button></div>
    {loading && <p className="mt-4 flex items-center gap-2 text-sm text-slate-300"><LoaderCircle size={17} className="animate-spin"/> Hämtar aktiviteter…</p>}
    {!loading && sorted.length === 0 && <p className="mt-4 rounded-xl border border-dashed border-white/15 p-5 text-sm text-slate-400">Inga aktiviteter tillagda ännu.</p>}
    {!loading && sorted.length > 0 && <div className="mt-4 space-y-3">{sorted.map(a => <article key={a.id} className="rounded-2xl border border-white/10 bg-slate-950/25 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm text-blue-200">{kinds.find(k => k.value === a.kind)?.label ?? "Aktivitet"}</p><h4 className="mt-1 font-semibold">{a.name}</h4></div><div className="flex gap-2"><button type="button" className={button} onClick={() => edit(a)}><Edit3 size={15}/> Redigera</button><button type="button" aria-label="Ta bort aktivitet" className={`${button} text-red-200`} onClick={() => setDeleteTarget(a)}><Trash2 size={15}/></button></div></div>{a.location && <p className="mt-2 flex items-center gap-2 text-sm text-slate-300"><MapPin size={15}/>{a.location}</p>}<div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-300">{a.activity_date && <p className="flex items-center gap-2"><CalendarDays size={15}/>{a.activity_date}</p>}{a.start_time && <p className="flex items-center gap-2"><Clock3 size={15}/>{a.start_time.slice(0, 5)}</p>}</div>{a.cost_sek !== null && <p className="mt-2 text-sm text-slate-300">Kostnad: {a.cost_sek.toLocaleString("sv-SE")} kr</p>}{a.notes && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-400">{a.notes}</p>}</article>)}</div>}
    {error && !open && !deleteTarget && <p role="alert" className="mt-4 text-sm text-red-300">{error} <button type="button" onClick={() => void load()} className="underline">Försök igen</button></p>}
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-3" role="dialog" aria-modal="true" aria-label={editingId ? "Redigera aktivitet" : "Ny aktivitet"}><form onSubmit={(e) => void save(e)} className="my-auto w-full max-w-xl space-y-3 rounded-3xl border border-white/15 bg-slate-900 p-5 shadow-2xl sm:p-7"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">{editingId ? "Redigera aktivitet" : "Lägg till aktivitet"}</h2><button type="button" aria-label="Stäng" onClick={() => setOpen(false)}><X size={20}/></button></div>
      <label className="block space-y-1 text-sm">Aktivitetens namn<input required maxLength={160} className={field} value={draft.name} onChange={e => change("name", e.target.value)} placeholder="Exempel: Besök i gamla stan"/></label>
      <label className="block space-y-1 text-sm">Kategori<select className={field} value={draft.kind} onChange={e => change("kind", e.target.value)}>{kinds.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}</select></label>
      <label className="block space-y-1 text-sm">Plats<input maxLength={300} className={field} value={draft.location} onChange={e => change("location", e.target.value)} placeholder="Exempel: Visby"/></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-1 text-sm">Datum<input type="date" className={field} value={draft.activity_date} onChange={e => change("activity_date", e.target.value)}/></label><label className="block space-y-1 text-sm">Tid<input type="time" className={field} value={draft.start_time} onChange={e => change("start_time", e.target.value)}/></label></div>
      <label className="block space-y-1 text-sm">Kostnad (SEK)<input type="number" min="0" step="0.01" className={field} value={draft.cost_sek} onChange={e => change("cost_sek", e.target.value)} placeholder="Valfritt"/></label>
      <label className="block space-y-1 text-sm">Anteckningar<textarea rows={3} maxLength={2000} className={field} value={draft.notes} onChange={e => change("notes", e.target.value)} placeholder="Bokning, öppettider eller annat att komma ihåg"/></label>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}<div className="flex justify-end gap-2"><button type="button" className={button} onClick={() => setOpen(false)}>Avbryt</button><button disabled={saving} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold disabled:opacity-50"><Save size={16}/>{saving ? "Sparar…" : "Spara aktivitet"}</button></div>
    </form></div>}
    {deleteTarget && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" role="dialog" aria-modal="true" aria-label="Ta bort aktivitet"><div className="w-full max-w-md rounded-3xl border border-white/15 bg-slate-900 p-6"><h2 className="text-xl font-bold">Ta bort aktivitet?</h2><p className="mt-3 text-sm text-slate-300">Aktiviteten tas bort permanent.</p>{error && <p className="mt-2 text-sm text-red-300">{error}</p>}<div className="mt-5 flex justify-end gap-2"><button type="button" className={button} onClick={() => setDeleteTarget(null)}>Avbryt</button><button type="button" disabled={saving} onClick={() => void remove()} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold disabled:opacity-50">{saving ? "Tar bort…" : "Ta bort"}</button></div></div></div>}
  </section>;
}
