"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CalendarDays, CheckCircle2, Clock3, Edit3, Lightbulb, LoaderCircle, MapPin, Plane, Plus, Save, Trash2, X } from "lucide-react";

type Status = "upcoming" | "idea" | "past";
type Trip = { id: string; title: string; destination: string; start_date: string | null; end_date: string | null; description: string; status: Status; created_at: string };
type Draft = { title: string; destination: string; start_date: string; end_date: string; description: string; status: Status };
const EMPTY: Draft = { title: "", destination: "", start_date: "", end_date: "", description: "", status: "idea" };
const sections: { status: Status; title: string; icon: typeof Plane; empty: string }[] = [
  { status: "upcoming", title: "Kommande resor", icon: CalendarDays, empty: "Inga kommande resor ännu." },
  { status: "idea", title: "Reseidéer", icon: Lightbulb, empty: "Inga reseidéer ännu." },
  { status: "past", title: "Tidigare resor", icon: CheckCircle2, empty: "Inga tidigare resor ännu." },
];
const field = "w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-400";
function dateText(t: Trip) {
  if (!t.start_date) return "Datum ej bestämt";
  const format = (d: string) => new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
  return t.end_date && t.end_date !== t.start_date ? `${format(t.start_date)} – ${format(t.end_date)}` : format(t.start_date);
}

export default function ResorDashboard() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<Trip | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/resor/trips", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Kunde inte läsa resor.");
      setTrips(json.trips ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "Ett fel uppstod."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const openCreate = () => { setDraft({ ...EMPTY }); setEditingId(null); setFormOpen(true); setError(""); };
  const openEdit = (t: Trip) => { setDraft({ title: t.title, destination: t.destination, start_date: t.start_date ?? "", end_date: t.end_date ?? "", description: t.description, status: t.status }); setEditingId(t.id); setFormOpen(true); setError(""); };
  const change = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((previous) => ({ ...previous, [key]: value }));
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError("");
    if (draft.start_date && draft.end_date && draft.end_date < draft.start_date) { setError("Slutdatum kan inte vara före startdatum."); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/resor/trips", { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...draft, id: editingId, start_date: draft.start_date || null, end_date: draft.end_date || null }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Kunde inte spara resan.");
      setTrips((previous) => editingId ? previous.map((t) => t.id === editingId ? json.trip : t) : [json.trip, ...previous]);
      setFormOpen(false); setEditingId(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Ett fel uppstod."); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    if (!deleteTarget) return;
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/resor/trips", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: deleteTarget.id }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Kunde inte ta bort resan.");
      setTrips((previous) => previous.filter((t) => t.id !== deleteTarget.id)); setDeleteTarget(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Ett fel uppstod."); }
    finally { setSaving(false); }
  };
  return <div className="w-full min-w-0 space-y-5 text-white">
    <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-blue-500/20 via-white/[0.07] to-cyan-500/10 p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-start gap-3"><span className="rounded-2xl bg-blue-400/15 p-3 text-blue-200"><Plane size={25}/></span><div><p className="text-xs font-semibold uppercase tracking-widest text-blue-300">Familjens reseplanering</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">Resor</h1><p className="mt-2 text-sm text-slate-300">Samla idéer, planera resor och spara era minnen.</p></div></div><button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold hover:bg-blue-400"><Plus size={17}/> Ny resa</button></div>
      <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">{sections.map((s) => { const Icon = s.icon; return <div key={s.status} className="rounded-2xl border border-white/10 bg-slate-950/25 p-3 sm:p-4"><Icon size={18} className="text-blue-300"/><p className="mt-2 text-2xl font-bold">{trips.filter((t) => t.status === s.status).length}</p><p className="mt-1 text-xs text-slate-400">{s.title}</p></div>; })}</div>
    </header>
    {error && <div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error} <button onClick={() => void load()} className="ml-2 underline">Försök igen</button></div>}
    {loading ? <div className="flex items-center gap-2 p-8 text-sm text-slate-300"><LoaderCircle className="animate-spin" size={18}/> Hämtar resor…</div> : sections.map((s) => { const Icon = s.icon; const items = trips.filter((t) => t.status === s.status); return <section key={s.status} className="rounded-3xl border border-white/10 bg-white/[0.05] p-4 sm:p-6"><div className="mb-4 flex items-center gap-3"><div className="rounded-xl bg-blue-500/15 p-2.5 text-blue-300"><Icon size={20}/></div><h2 className="text-lg font-bold">{s.title}</h2></div>{items.length ? <div className="grid gap-3 md:grid-cols-2">{items.map((t) => <article key={t.id} className="rounded-2xl border border-white/10 bg-slate-950/20 p-4"><h3 className="font-semibold">{t.title}</h3><p className="mt-2 flex items-center gap-2 text-sm text-slate-300"><MapPin size={15}/>{t.destination}</p><p className="mt-1 flex items-center gap-2 text-sm text-slate-400"><Clock3 size={15}/>{dateText(t)}</p>{t.description && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-300">{t.description}</p>}<div className="mt-4 flex gap-2"><button onClick={() => openEdit(t)} className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs hover:bg-white/10"><Edit3 size={14}/> Redigera</button><button onClick={() => setDeleteTarget(t)} className="inline-flex items-center gap-2 rounded-lg border border-red-300/20 px-3 py-2 text-xs text-red-200 hover:bg-red-400/10"><Trash2 size={14}/> Ta bort</button></div></article>)}</div> : <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-400">{s.empty}</p>}</section>; })}
    {formOpen && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={editingId ? "Redigera resa" : "Ny resa"}><form onSubmit={(e) => void save(e)} className="my-auto w-full max-w-lg space-y-4 rounded-3xl border border-white/15 bg-slate-900 p-5 shadow-2xl sm:p-7"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">{editingId ? "Redigera resa" : "Skapa en resa"}</h2><button type="button" onClick={() => setFormOpen(false)} aria-label="Stäng"><X size={20}/></button></div><label className="block space-y-1 text-sm">Namn på resan<input required maxLength={120} className={field} value={draft.title} onChange={(e) => change("title", e.target.value)} placeholder="Exempel: Sommarsemester"/></label><label className="block space-y-1 text-sm">Resmål<input required maxLength={120} className={field} value={draft.destination} onChange={(e) => change("destination", e.target.value)} placeholder="Exempel: Färöarna"/></label><label className="block space-y-1 text-sm">Status<select className={field} value={draft.status} onChange={(e) => change("status", e.target.value as Status)}><option value="idea">Reseidé</option><option value="upcoming">Kommande resa</option><option value="past">Tidigare resa</option></select></label><div className="grid grid-cols-2 gap-3"><label className="block space-y-1 text-sm">Från<input type="date" className={field} value={draft.start_date} onChange={(e) => change("start_date", e.target.value)}/></label><label className="block space-y-1 text-sm">Till<input type="date" className={field} value={draft.end_date} onChange={(e) => change("end_date", e.target.value)}/></label></div><label className="block space-y-1 text-sm">Beskrivning<textarea rows={4} maxLength={2000} className={field} value={draft.description} onChange={(e) => change("description", e.target.value)} placeholder="Vad vill ni göra på resan?"/></label>{error && <p role="alert" className="text-sm text-red-300">{error}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={() => setFormOpen(false)} className="rounded-xl border border-white/15 px-4 py-2 text-sm">Avbryt</button><button disabled={saving} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold disabled:opacity-50"><Save size={16}/>{saving ? "Sparar…" : "Spara resa"}</button></div></form></div>}
    {deleteTarget && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" role="dialog" aria-modal="true" aria-label="Bekräfta borttagning"><div className="w-full max-w-md rounded-3xl border border-white/15 bg-slate-900 p-6"><h2 className="text-xl font-bold">Ta bort resa?</h2><p className="mt-3 text-sm text-slate-300">Vill du ta bort ”{deleteTarget.title}”? Detta kan inte ångras.</p>{error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}<div className="mt-5 flex justify-end gap-2"><button onClick={() => setDeleteTarget(null)} className="rounded-xl border border-white/15 px-4 py-2 text-sm">Avbryt</button><button disabled={saving} onClick={() => void remove()} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold disabled:opacity-50">{saving ? "Tar bort…" : "Ta bort"}</button></div></div></div>}
  </div>;
}
