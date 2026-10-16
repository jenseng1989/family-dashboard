"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, RefreshCw, Plane, BedDouble, Compass, StickyNote, Plus, Trash2, Save } from "lucide-react";

type Transport = { id: string; kind: string; provider: string; departure_place: string; arrival_place: string; departure_at: string | null; arrival_at: string | null };
type Accommodation = { id: string; name: string; address: string; check_in: string | null; check_out: string | null };
type Activity = { id: string; name: string; location: string; activity_date: string | null; start_time: string | null };
type DayNote = { id: string; trip_id: string; note_date: string | null; title: string; body: string; created_at: string };
type Event = { id: string; date: string | null; time: string; kind: "transport" | "boende" | "aktivitet"; name: string; detail: string };
async function read<T>(path: string, key: string): Promise<T[]> {
  const response = await fetch(path, { cache: "no-store" });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error || "Kunde inte hämta resplanen.");
  return Array.isArray(json[key]) ? json[key] as T[] : [];
}
function days(start: string | null, end: string | null): string[] {
  if (!start || !end) return [];
  const from = Date.parse(`${start}T12:00:00Z`), to = Date.parse(`${end}T12:00:00Z`);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from || to - from > 60 * 86400000) return [];
  const dates: string[] = [];
  for (let d = from; d <= to; d += 86400000) dates.push(new Date(d).toISOString().slice(0, 10));
  return dates;
}
function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("sv-SE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}
export default function ItinerarySection({ tripId, startDate, endDate }: { tripId: string; startDate: string | null; endDate: string | null }) {
  const [transports, setTransports] = useState<Transport[]>([]);
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [dayNotes, setDayNotes] = useState<DayNote[]>([]);
  const [noteDate, setNoteDate] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteError, setNoteError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const q = `?tripId=${encodeURIComponent(tripId)}`;
      const [t, b, a, n] = await Promise.all([
        read<Transport>(`/api/resor/transports${q}`, "transports"),
        read<Accommodation>(`/api/resor/accommodations${q}`, "accommodations"),
        read<Activity>(`/api/resor/activities${q}`, "activities"),
        read<DayNote>(`/api/resor/day-notes${q}`, "notes"),
      ]);
      setTransports(t); setAccommodations(b); setActivities(a); setDayNotes(n);
    } catch (e) { setError(e instanceof Error ? e.message : "Kunde inte hämta resplanen."); }
    finally { setLoading(false); }
  }, [tripId]);
  useEffect(() => { void load(); }, [load]);
  const { groups, undated, calendar } = useMemo(() => {
    const events: Event[] = [];
    for (const t of transports) {
      const detail = [t.provider, `${t.departure_place || "?"} → ${t.arrival_place || "?"}`].filter(Boolean).join(" · ");
      events.push({ id: `t-${t.id}`, date: t.departure_at?.slice(0, 10) ?? null, time: t.departure_at?.slice(11, 16) ?? "", kind: "transport", name: "Transport: Avresa", detail });
      if (t.arrival_at && t.arrival_at.slice(0, 10) !== t.departure_at?.slice(0, 10)) events.push({ id: `ta-${t.id}`, date: t.arrival_at.slice(0, 10), time: t.arrival_at.slice(11, 16), kind: "transport", name: "Transport: ankomst", detail: t.arrival_place });
    }
    for (const b of accommodations) {
      events.push({ id: `b-${b.id}`, date: b.check_in, time: "", kind: "boende", name: `Incheckning: ${b.name}`, detail: b.address });
      if (b.check_out) events.push({ id: `bu-${b.id}`, date: b.check_out, time: "", kind: "boende", name: `Utcheckning: ${b.name}`, detail: b.address });
    }
    for (const a of activities) events.push({ id: `a-${a.id}`, date: a.activity_date, time: a.start_time?.slice(0, 5) ?? "", kind: "aktivitet", name: a.name, detail: a.location });
    const calendar = days(startDate, endDate);
    const dates = [...new Set([...calendar, ...events.flatMap(e => e.date ? [e.date] : []), ...dayNotes.flatMap(n => n.note_date ? [n.note_date] : [])])].sort();
    return { calendar, groups: dates.map(date => ({ date, events: events.filter(e => e.date === date).sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99")) })), undated: events.filter(e => !e.date) };
  }, [transports, accommodations, activities, dayNotes, startDate, endDate]);
  async function noteRequest(method: "POST" | "DELETE", payload: Record<string, unknown>) {
    setNoteBusy(true); setNoteError("");
    try {
      const response = await fetch("/api/resor/day-notes", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trip_id: tripId, ...payload }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Kunde inte spara anteckningen.");
      const updated = await read<DayNote>(`/api/resor/day-notes?tripId=${encodeURIComponent(tripId)}`, "notes");
      setDayNotes(updated);
      if (method === "POST") { setNoteTitle(""); setNoteBody(""); }
    } catch (e) { setNoteError(e instanceof Error ? e.message : "Ett fel uppstod."); }
    finally { setNoteBusy(false); }
  }
  const renderNotes = (date: string | null) => {
    const matching = dayNotes.filter(n => n.note_date === date);
    if (!matching.length) return null;
    return <ul className="mt-3 space-y-2">{matching.map(n => <li key={n.id} className="flex items-start justify-between gap-2 rounded-xl border border-amber-400/15 bg-amber-500/5 p-3 text-sm"><div className="min-w-0"><p className="flex items-center gap-2 font-semibold text-amber-200"><StickyNote size={15}/>{n.title}</p>{n.body && <p className="mt-1 whitespace-pre-wrap break-words text-slate-300">{n.body}</p>}</div><button type="button" disabled={noteBusy} onClick={() => void noteRequest("DELETE", { id: n.id })} className="shrink-0 rounded-lg p-1.5 text-red-300 hover:bg-white/10 disabled:opacity-50" aria-label={`Ta bort ${n.title}`}><Trash2 size={16}/></button></li>)}</ul>;
  };
  const renderEvent = (event: Event) => <li key={event.id} className="flex items-start gap-3 text-sm"><span className="mt-0.5 shrink-0 text-blue-300">{event.kind === "transport" ? <Plane size={17}/> : event.kind === "boende" ? <BedDouble size={17}/> : <Compass size={17}/>}</span><div className="min-w-0"><p className="font-medium">{event.time && <span className="mr-2 text-blue-200">{event.time}</span>}{event.name}</p>{event.detail && <p className="break-words text-slate-400">{event.detail}</p>}</div></li>;
  return <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 sm:col-span-2">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="rounded-xl bg-blue-500/15 p-2.5 text-blue-300"><CalendarDays size={21}/></span><div><h3 className="font-semibold">Resplan dag för dag</h3><p className="text-sm text-slate-400">Transport, boende och aktiviteter i datumordning</p></div></div><button type="button" disabled={loading} onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"><RefreshCw size={16} className={loading ? "animate-spin" : ""}/> Uppdatera resplan</button></div>
    <p className="mt-3 text-xs text-slate-400">Efter att du lagt till eller ändrat en post nedanför, klicka på Uppdatera resplan.</p>
    {loading && <p className="mt-4 text-sm text-slate-300">Hämtar resplan…</p>}
    {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
    {!loading && !error && <div className="mt-4 space-y-3">{calendar.length === 0 && <p className="text-xs text-slate-400">Med start- och slutdatum på högst 61 dagar visas även dagar utan aktiviteter.</p>}{groups.length === 0 && undated.length === 0 && <p className="rounded-xl border border-dashed border-white/15 p-5 text-sm text-slate-400">Inget planerat ännu.</p>}{groups.map(({ date, events }) => <div key={date} className="rounded-2xl border border-white/10 bg-slate-950/25 p-4"><h4 className="font-semibold capitalize text-blue-200">{calendar.includes(date) && startDate ? `Dag ${Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${startDate}T12:00:00Z`)) / 86400000) + 1} · ` : ""}{dateLabel(date)}</h4>{events.length ? <ul className="mt-3 space-y-3">{events.map(renderEvent)}</ul> : !dayNotes.some(n => n.note_date === date) && <p className="mt-2 text-sm text-slate-500">Inget planerat ännu.</p>}{renderNotes(date)}</div>)}{(undated.length > 0 || dayNotes.some(n => !n.note_date)) && <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4"><h4 className="font-semibold text-blue-200">Utan datum</h4><ul className="mt-3 space-y-3">{undated.map(renderEvent)}</ul>{renderNotes(null)}</div>}</div>}
    <form onSubmit={e => { e.preventDefault(); if (noteTitle.trim()) void noteRequest("POST", { note_date: noteDate || null, title: noteTitle.trim(), body: noteBody.trim() }); }} className="mt-4 rounded-xl border border-white/10 bg-slate-950/20 p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><Plus size={16}/> Lägg till egen punkt eller anteckning</p>
      <div className="grid gap-3 sm:grid-cols-[160px_1fr]"><label className="text-xs text-slate-300">Datum (valfritt)<input type="date" value={noteDate} onChange={e => setNoteDate(e.target.value)} className="mt-1 block w-full rounded-lg border border-white/15 bg-slate-900 p-2 text-sm text-white"/></label><label className="text-xs text-slate-300">Rubrik<input required maxLength={160} value={noteTitle} onChange={e => setNoteTitle(e.target.value)} placeholder="T.ex. Packa badkläder" className="mt-1 block w-full rounded-lg border border-white/15 bg-slate-900 p-2 text-sm text-white"/></label></div>
      <label className="mt-3 block text-xs text-slate-300">Anteckning<textarea maxLength={3000} rows={2} value={noteBody} onChange={e => setNoteBody(e.target.value)} placeholder="Valfria detaljer…" className="mt-1 block w-full rounded-lg border border-white/15 bg-slate-900 p-2 text-sm text-white"/></label>
      <button disabled={noteBusy || !noteTitle.trim()} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"><Save size={16}/>{noteBusy ? "Sparar…" : "Spara anteckning"}</button>
      {noteError && <p role="alert" className="mt-2 text-sm text-red-300">{noteError}</p>}
    </form>
  </section>;
}
