"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { getWidgetSettings, type WidgetSetting } from "@/lib/widget-settings";
import TransportSection from "@/components/dashboard/resor/TransportSection";
import AccommodationSection from "@/components/dashboard/resor/AccommodationSection";
import ActivitySection from "@/components/dashboard/resor/ActivitySection";
import BudgetSection from "@/components/dashboard/resor/BudgetSection";
import ItinerarySection from "@/components/dashboard/resor/ItinerarySection";
import {
  ArrowLeft, BedDouble, CalendarDays, CheckCircle2, Clock3, Edit3,
  Lightbulb, LoaderCircle, MapPin, Plane, Plus, Save, Trash2, Wallet,
  X, Compass, ChevronRight, ChevronDown, ChevronUp,
} from "lucide-react";

type TravelPanelProps = {
  title: string;
  tripId: string;
  panelId: string;
  children: React.ReactNode;
};

function TravelPanel({ title, tripId, panelId, children }: TravelPanelProps) {
  // Varje resa och widget får sin egen inställning i webbläsaren.
  const storageKey = `family-dashboard-resor-collapsed:${tripId}:${panelId}`;
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      // Tidigare sparat val gäller. Nya widgetar startar minimerade.
      setExpanded(saved === "false");
    } catch {
      setExpanded(false);
    }
    setLoaded(true);
  }, [storageKey]);

  function toggleExpanded() {
    const nextExpanded = !expanded;
    setExpanded(nextExpanded);
    try {
      window.localStorage.setItem(storageKey, String(!nextExpanded));
    } catch {
      // Fungerar även om webbläsaren blockerar lokal lagring.
    }
  }

  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.025]">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        <button
          type="button"
          aria-label={`${expanded ? "Minimera" : "Expandera"} ${title}`}
          aria-expanded={expanded}
          disabled={!loaded}
          onClick={toggleExpanded}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
        >
          {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
        </button>
      </div>
      <div hidden={!expanded} className="min-w-0 px-2 pb-2 sm:px-3 sm:pb-3">
        {children}
      </div>
    </div>
  );
}

type SummaryItem = { cost_sek?: number | null; reference?: string | null; booking_reference?: string | null };
type TravelSummary = {
  transport: SummaryItem[];
  accommodation: SummaryItem[];
  activities: SummaryItem[];
  budget: { target_sek: number | null; totals: { transport: number; accommodation: number; activity: number } } | null;
};

function NextTripPlanning({ tripId }: { tripId: string }) {
  const [summary, setSummary] = useState<TravelSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const paths = ["transports", "accommodations", "activities", "budget"] as const;
      const responses = await Promise.all(paths.map((path) =>
        fetch(`/api/resor/${path}?tripId=${encodeURIComponent(tripId)}`, { cache: "no-store" })
      ));
      const results = await Promise.all(responses.map(async (response) => {
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || "Kunde inte läsa reseplaneringen.");
        return json;
      }));
      setSummary({
        transport: results[0].transports ?? [],
        accommodation: results[1].accommodations ?? [],
        activities: results[2].activities ?? [],
        budget: results[3],
      });
    } catch (cause) {
      setSummary(null);
      setError(cause instanceof Error ? cause.message : "Kunde inte läsa reseplaneringen.");
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void refresh();
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  if (loading) return <p className="mt-4 flex items-center gap-2 text-sm text-slate-300"><LoaderCircle size={16} className="animate-spin"/> Hämtar planeringsstatus…</p>;
  if (error || !summary) return <div className="mt-4 text-sm text-amber-200">{error || "Planeringsstatus saknas."} <button type="button" className="underline" onClick={() => void refresh()}>Försök igen</button></div>;

  const groups = [
    { label: "Transport", count: summary.transport.length, icon: Plane },
    { label: "Boende", count: summary.accommodation.length, icon: BedDouble },
    { label: "Aktiviteter", count: summary.activities.length, icon: Compass },
  ];
  const bookedTransport = summary.transport.filter((item) => Boolean(item.reference?.trim())).length;
  const bookedAccommodation = summary.accommodation.filter((item) => Boolean(item.booking_reference?.trim())).length;
  const total = summary.budget?.totals
    ? summary.budget.totals.transport + summary.budget.totals.accommodation + summary.budget.totals.activity
    : null;
  const money = (value: number) => new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(value);

  return <div className="mt-5 space-y-3">
    <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
      <h3 className="text-sm font-semibold text-slate-100">Planeringsstatus</h3>
      <p className="mt-1 text-xs text-slate-400">Antal registrerade poster – inte automatiskt bekräftade bokningar.</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {groups.map(({ label, count, icon: Icon }) => <div key={label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
          <Icon size={18} className="mx-auto text-blue-300"/>
          <p className="mt-2 text-xl font-bold tabular-nums">{count}</p>
          <p className="text-xs text-slate-400">{label}</p>
        </div>)}
      </div>
      <p className="mt-3 text-xs text-slate-400">Bokningsreferens angiven: {bookedTransport} transporter och {bookedAccommodation} boenden. Referens betyder inte att bokningen har verifierats.</p>
    </div>
    <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 className="flex items-center gap-2 text-sm font-semibold"><Wallet size={17} className="text-blue-300"/> Resekostnader</h3><p className="mt-1 text-xs text-slate-400">Summering av registrerade kostnader</p></div>
        <p className="text-lg font-bold tabular-nums">{total === null ? "Ej tillgängligt" : money(total)}</p>
      </div>
      {summary.budget?.target_sek != null && <p className="mt-2 text-xs text-slate-300">Budgetmål: {money(summary.budget.target_sek)} · Kvar: {money(summary.budget.target_sek - (total ?? 0))}</p>}
      <p className="mt-2 text-xs text-slate-500">Kostnader utan angivet belopp ingår inte i summan.</p>
    </div>
  </div>;
}

type Status = "upcoming" | "idea" | "past";
type Trip = {
  id: string; title: string; destination: string; start_date: string | null;
  end_date: string | null; description: string; status: Status; created_at: string;
};
type Draft = {
  title: string; destination: string; start_date: string; end_date: string;
  description: string; status: Status;
};
const EMPTY: Draft = { title: "", destination: "", start_date: "", end_date: "", description: "", status: "idea" };
const sections = [
  { status: "upcoming", title: "Kommande resor", icon: CalendarDays, empty: "Inga kommande resor ännu." },
  { status: "idea", title: "Reseidéer", icon: Lightbulb, empty: "Inga reseidéer ännu." },
  { status: "past", title: "Tidigare resor", icon: CheckCircle2, empty: "Inga tidigare resor ännu." },
] as const;
const statusLabels: Record<Status, string> = { upcoming: "Kommande resa", idea: "Reseidé", past: "Tidigare resa" };
const field = "w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-400";
const button = "inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}
function dateText(trip: Trip): string {
  if (!trip.start_date) return "Datum ej bestämt";
  return trip.end_date && trip.end_date !== trip.start_date
    ? `${formatDate(trip.start_date)} – ${formatDate(trip.end_date)}`
    : formatDate(trip.start_date);
}
function daysUntil(start: string | null): number | null {
  if (!start) return null;
  const [year, month, day] = start.split("-").map(Number);
  const today = new Date();
  const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((Date.UTC(year, month - 1, day) - todayUTC) / 86400000);
}

export default function ResorDashboard() {
  const [panelSettings, setPanelSettings] = useState<WidgetSetting[]>([]);
  useEffect(() => { let live = true; getWidgetSettings().then(rows => { if (live) setPanelSettings(rows); }).catch(error => console.error("Kunde inte hämta resewidgetar:", error)); return () => { live = false; }; }, []);
  const visiblePanel = (id: string) => panelSettings.find(row => row.widgetId === `resor-${id}`)?.isVisible ?? true;
  const panelSize = (id: string) => panelSettings.find(row => row.widgetId === `resor-${id}`)?.size ?? "half";
  const panelOrder = (id: string, fallback: number) => panelSettings.find(row => row.widgetId === `resor-${id}`)?.sortOrder ?? fallback;

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<Trip | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/resor/trips", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Kunde inte läsa resor.");
      setTrips(json.trips ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ett fel uppstod.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const openCreate = () => { setDraft({ ...EMPTY }); setEditingId(null); setFormOpen(true); setError(""); };
  const openEdit = (t: Trip) => {
    setDraft({ title: t.title, destination: t.destination, start_date: t.start_date ?? "", end_date: t.end_date ?? "", description: t.description, status: t.status });
    setEditingId(t.id); setFormOpen(true); setError("");
  };
  const change = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((previous) => ({ ...previous, [key]: value }));
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError("");
    if (draft.start_date && draft.end_date && draft.end_date < draft.start_date) { setError("Slutdatum kan inte vara före startdatum."); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/resor/trips", {
        method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, id: editingId, start_date: draft.start_date || null, end_date: draft.end_date || null }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Kunde inte spara resan.");
      setTrips((previous) => editingId ? previous.map((t) => t.id === editingId ? json.trip : t) : [json.trip, ...previous]);
      setFormOpen(false); setEditingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ett fel uppstod.");
    } finally { setSaving(false); }
  };
  const remove = async () => {
    if (!deleteTarget) return;
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/resor/trips", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Kunde inte ta bort resan.");
      setTrips((previous) => previous.filter((t) => t.id !== deleteTarget.id));
      if (selectedId === deleteTarget.id) setSelectedId(null);
      setDeleteTarget(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ett fel uppstod.");
    } finally { setSaving(false); }
  };

  const selectedTrip = trips.find((t) => t.id === selectedId);
  // Visa alltid en registrerad kommande resa, även när avresedatum saknas.
  // Prioritera pågående resor, därefter framtida avresor, därefter odaterade resor.
  const upcomingTrips = trips.filter((trip) => trip.status === "upcoming");
  const activeOrFutureTrips = upcomingTrips.filter((trip) =>
    (trip.start_date && (daysUntil(trip.start_date) ?? -1) >= 0) ||
    (trip.end_date && (daysUntil(trip.end_date) ?? -1) >= 0)
  );
  const nextTrip = [...(activeOrFutureTrips.length ? activeOrFutureTrips : upcomingTrips)]
    .sort((a, b) => {
      const aDays = a.start_date ? daysUntil(a.start_date) : null;
      const bDays = b.start_date ? daysUntil(b.start_date) : null;
      const aRank = aDays !== null && aDays >= 0 ? 0 : a.end_date && (daysUntil(a.end_date) ?? -1) >= 0 ? 1 : aDays === null ? 2 : 3;
      const bRank = bDays !== null && bDays >= 0 ? 0 : b.end_date && (daysUntil(b.end_date) ?? -1) >= 0 ? 1 : bDays === null ? 2 : 3;
      if (aRank !== bRank) return aRank - bRank;
      if (aRank === 0) return (aDays ?? 0) - (bDays ?? 0);
      return (a.start_date ?? "").localeCompare(b.start_date ?? "");
    })[0];
  const nextTripDays = nextTrip ? daysUntil(nextTrip.start_date) : null;
  const isOngoingTrip = !!nextTrip && nextTripDays !== null && nextTripDays < 0 &&
    !!nextTrip.end_date && (daysUntil(nextTrip.end_date) ?? -1) >= 0;
  const planning: { title: string; subtitle: string; icon: typeof Wallet }[] = [];

  return <div className="w-full min-w-0 space-y-5 text-white">
    {selectedTrip ? <>
      <button type="button" onClick={() => setSelectedId(null)} className={button}><ArrowLeft size={17}/> Alla resor</button>
      <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-blue-500/20 via-white/[0.07] to-cyan-500/10 p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-300">{statusLabels[selectedTrip.status]}</p>
            <h1 className="mt-2 break-words text-2xl font-bold sm:text-3xl">{selectedTrip.title}</h1>
            <p className="mt-3 flex items-center gap-2 text-sm text-slate-200"><MapPin size={16}/>{selectedTrip.destination}</p>
            <p className="mt-2 flex items-center gap-2 text-sm text-slate-300"><CalendarDays size={16}/>{dateText(selectedTrip)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => openEdit(selectedTrip)} className={button}><Edit3 size={16}/> Redigera</button>
            <button type="button" onClick={() => setDeleteTarget(selectedTrip)} className={`${button} text-red-200`}><Trash2 size={16}/> Ta bort</button>
          </div>
        </div>
        {selectedTrip.status === "upcoming" && selectedTrip.start_date && (() => {
          const days = daysUntil(selectedTrip.start_date);
          return days !== null && days >= 0 ? <div className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-blue-300/20 bg-blue-400/10 px-4 py-3 text-sm text-blue-100"><Clock3 size={18}/>{days === 0 ? "Resan börjar idag!" : `${days} ${days === 1 ? "dag" : "dagar"} kvar till avresa`}</div> : null;
        })()}
      </header>
      <section className="rounded-3xl border border-white/10 bg-white/[0.05] p-5 sm:p-6">
        <h2 className="text-lg font-bold">Översikt</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4"><p className="text-xs text-slate-400">Resmål</p><p className="mt-1 font-semibold">{selectedTrip.destination}</p></div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4"><p className="text-xs text-slate-400">Datum</p><p className="mt-1 font-semibold">{dateText(selectedTrip)}</p></div>
        </div>
        <h3 className="mt-5 text-sm font-semibold text-slate-200">Beskrivning</h3>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-300">{selectedTrip.description || "Ingen beskrivning tillagd ännu."}</p>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-bold">Planera resan</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {visiblePanel("itinerary") && <div className={panelSize("itinerary") === "full" ? "sm:col-span-2 min-w-0" : "min-w-0"} style={{ order: panelOrder("itinerary", 10) }}><TravelPanel key={`resplan-panel-${selectedTrip.id}`} tripId={selectedTrip.id} panelId="itinerary" title="Resplan"><ItinerarySection key={`resplan-${selectedTrip.id}`} tripId={selectedTrip.id} startDate={selectedTrip.start_date} endDate={selectedTrip.end_date}/></TravelPanel></div>}
          {visiblePanel("transport") && <div className={panelSize("transport") === "full" ? "sm:col-span-2 min-w-0" : "min-w-0"} style={{ order: panelOrder("transport", 20) }}><TravelPanel key={`transport-panel-${selectedTrip.id}`} tripId={selectedTrip.id} panelId="transport" title="Transport"><TransportSection key={selectedTrip.id} tripId={selectedTrip.id}/></TravelPanel></div>}
          {visiblePanel("accommodation") && <div className={panelSize("accommodation") === "full" ? "sm:col-span-2 min-w-0" : "min-w-0"} style={{ order: panelOrder("accommodation", 30) }}><TravelPanel key={`boende-panel-${selectedTrip.id}`} tripId={selectedTrip.id} panelId="accommodation" title="Boende"><AccommodationSection key={`boende-${selectedTrip.id}`} tripId={selectedTrip.id}/></TravelPanel></div>}
          {visiblePanel("activities") && <div className={panelSize("activities") === "full" ? "sm:col-span-2 min-w-0" : "min-w-0"} style={{ order: panelOrder("activities", 40) }}><TravelPanel key={`aktivitet-panel-${selectedTrip.id}`} tripId={selectedTrip.id} panelId="activities" title="Aktiviteter"><ActivitySection key={`aktivitet-${selectedTrip.id}`} tripId={selectedTrip.id}/></TravelPanel></div>}
          {visiblePanel("budget") && <div className={panelSize("budget") === "full" ? "sm:col-span-2 min-w-0" : "min-w-0"} style={{ order: panelOrder("budget", 50) }}><TravelPanel key={`budget-panel-${selectedTrip.id}`} tripId={selectedTrip.id} panelId="budget" title="Budget"><BudgetSection key={`budget-${selectedTrip.id}`} tripId={selectedTrip.id}/></TravelPanel></div>}
{planning.map(({ title, subtitle, icon: Icon }) =>
          <div className="min-w-0" style={{ order: 1000 }}><TravelPanel key={`${selectedTrip.id}-${title}`} tripId={selectedTrip.id} panelId={title} title={title}><div className="p-3">
            <div className="flex items-center gap-3"><span className="rounded-xl bg-blue-500/15 p-2.5 text-blue-300"><Icon size={21}/></span><h3 className="font-semibold">{title}</h3></div>
            <p className="mt-3 text-sm text-slate-400">{subtitle}</p>
            <p className="mt-4 text-xs text-slate-500">Kommer i ett senare steg</p>
          </div></TravelPanel></div>
        )}</div>
      </section>
    </> : <>
      <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-blue-500/20 via-white/[0.07] to-cyan-500/10 p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-start gap-3"><span className="rounded-2xl bg-blue-400/15 p-3 text-blue-200"><Plane size={25}/></span><div><p className="text-xs font-semibold uppercase tracking-widest text-blue-300">Familjens reseplanering</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">Resor</h1><p className="mt-2 text-sm text-slate-300">Samla idéer, planera resor och spara era minnen.</p></div></div><button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold hover:bg-blue-400"><Plus size={17}/> Ny resa</button></div>
        <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">{sections.map((s) => { const Icon = s.icon; return <div key={s.status} className="rounded-2xl border border-white/10 bg-slate-950/25 p-3 sm:p-4"><Icon size={18} className="text-blue-300"/><p className="mt-2 text-2xl font-bold">{trips.filter((t) => t.status === s.status).length}</p><p className="mt-1 text-xs text-slate-400">{s.title}</p></div>; })}</div>
      </header>
      {!loading && nextTrip && (
        <section aria-label="Nästa resa" className="rounded-3xl border border-blue-300/20 bg-gradient-to-br from-blue-500/15 via-white/[0.04] to-cyan-500/10 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-blue-300"><Plane size={16}/> Nästa resa</p>
              <h2 className="mt-3 break-words text-2xl font-bold">{nextTrip.title}</h2>
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-200"><MapPin size={16}/>{nextTrip.destination}</p>
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-300"><CalendarDays size={16}/>{dateText(nextTrip)}</p>
            </div>
            {nextTripDays !== null && nextTripDays >= 0 && (
              <div className="rounded-2xl border border-blue-300/20 bg-blue-400/10 px-5 py-3 text-center">
                <p className="text-3xl font-bold tabular-nums text-blue-100">{nextTripDays}</p>
                <p className="text-xs text-blue-200">{nextTripDays === 0 ? "Avresa idag!" : nextTripDays === 1 ? "dag kvar" : "dagar kvar"}</p>
              </div>
            )}
          </div>
          {isOngoingTrip && <p className="mt-3 text-sm text-blue-200">Resan pågår.</p>}
          {nextTripDays === null && <p className="mt-3 text-sm text-slate-300">Avresedatum är inte bestämt ännu. Lägg till ett datum för att visa nedräkningen.</p>}
          {nextTripDays !== null && nextTripDays < 0 && !isOngoingTrip && <p className="mt-3 text-sm text-slate-300">Resans avresedatum har passerat. Kontrollera datum eller flytta resan till Tidigare resor.</p>}
          <NextTripPlanning tripId={nextTrip.id}/>
          <button type="button" onClick={() => setSelectedId(nextTrip.id)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-400">
            Öppna nästa resa <ChevronRight size={17}/>
          </button>
        </section>
      )}
      {!loading && !nextTrip && (
        <section aria-label="Nästa resa" className="rounded-2xl border border-dashed border-white/15 px-5 py-4 text-sm text-slate-400">
          Inga resor är markerade som Kommande resor ännu. Skapa en resa eller ändra status för en befintlig resa.
        </section>
      )}
      {!loading && <div className="grid gap-3 sm:grid-cols-2">
         {sections.map((s, index) => {
           const Icon = s.icon;
           const items = trips.filter((t) => t.status === s.status);
           const widgetId = `overview-${s.status}`;
           if (!visiblePanel(widgetId)) return null;
           return (
             <div
               key={s.status}
               className={panelSize(widgetId) === "full" ? "min-w-0 sm:col-span-2" : "min-w-0"}
               style={{ order: panelOrder(widgetId, (index + 1) * 10) }}
             >
               <TravelPanel title={`${s.title} (${items.length})`} tripId="overview" panelId={widgetId}>
                 <div className="mb-4 flex items-center gap-3 px-2 pt-2">
                   <span className="rounded-xl bg-blue-500/15 p-2.5 text-blue-300"><Icon size={20}/></span>
                   <span className="text-sm text-slate-300">{s.title}</span>
                 </div>
                 {items.length ? (
                   <div className="grid gap-3 md:grid-cols-2">
                     {items.map((t) => (
                       <article key={t.id} className="rounded-2xl border border-white/10 bg-slate-950/20 p-4">
                         <h3 className="font-semibold">{t.title}</h3>
                         <p className="mt-2 flex items-center gap-2 text-sm text-slate-300"><MapPin size={15}/>{t.destination}</p>
                         <p className="mt-1 flex items-center gap-2 text-sm text-slate-400"><Clock3 size={15}/>{dateText(t)}</p>
                         {t.description && <p className="mt-3 line-clamp-3 whitespace-pre-wrap break-words text-sm text-slate-300">{t.description}</p>}
                         <div className="mt-4 flex flex-wrap gap-2">
                           <button type="button" onClick={() => setSelectedId(t.id)} className="inline-flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-2 text-xs font-semibold hover:bg-blue-400">Öppna resa <ChevronRight size={14}/></button>
                           <button type="button" onClick={() => openEdit(t)} className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs hover:bg-white/10"><Edit3 size={14}/> Redigera</button>
                           <button type="button" onClick={() => setDeleteTarget(t)} className="inline-flex items-center gap-2 rounded-lg border border-red-300/20 px-3 py-2 text-xs text-red-200 hover:bg-red-400/10"><Trash2 size={14}/> Ta bort</button>
                         </div>
                       </article>
                     ))}
                   </div>
                 ) : <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-400">{s.empty}</p>}
               </TravelPanel>
             </div>
           );
         })}
       </div>}
    </>}
    {error && !formOpen && !deleteTarget && <div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error} <button type="button" onClick={() => void load()} className="ml-2 underline">Försök igen</button></div>}
    {loading && <div className="flex items-center gap-2 p-8 text-sm text-slate-300"><LoaderCircle className="animate-spin" size={18}/> Hämtar resor…</div>}
    {formOpen && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={editingId ? "Redigera resa" : "Ny resa"}><form onSubmit={(e) => void save(e)} className="my-auto w-full max-w-lg space-y-4 rounded-3xl border border-white/15 bg-slate-900 p-5 shadow-2xl sm:p-7"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">{editingId ? "Redigera resa" : "Skapa en resa"}</h2><button type="button" onClick={() => setFormOpen(false)} aria-label="Stäng"><X size={20}/></button></div><label className="block space-y-1 text-sm">Namn på resan<input required maxLength={120} className={field} value={draft.title} onChange={(e) => change("title", e.target.value)} placeholder="Exempel: Sommarsemester"/></label><label className="block space-y-1 text-sm">Resmål<input required maxLength={120} className={field} value={draft.destination} onChange={(e) => change("destination", e.target.value)} placeholder="Exempel: Färöarna"/></label><label className="block space-y-1 text-sm">Status<select className={field} value={draft.status} onChange={(e) => change("status", e.target.value as Status)}><option value="idea">Reseidé</option><option value="upcoming">Kommande resa</option><option value="past">Tidigare resa</option></select></label><div className="grid grid-cols-2 gap-3"><label className="block space-y-1 text-sm">Från<input type="date" className={field} value={draft.start_date} onChange={(e) => change("start_date", e.target.value)}/></label><label className="block space-y-1 text-sm">Till<input type="date" className={field} value={draft.end_date} onChange={(e) => change("end_date", e.target.value)}/></label></div><label className="block space-y-1 text-sm">Beskrivning<textarea rows={4} maxLength={2000} className={field} value={draft.description} onChange={(e) => change("description", e.target.value)} placeholder="Vad vill ni göra på resan?"/></label>{error && <p role="alert" className="text-sm text-red-300">{error}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={() => setFormOpen(false)} className="rounded-xl border border-white/15 px-4 py-2 text-sm">Avbryt</button><button disabled={saving} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold disabled:opacity-50"><Save size={16}/>{saving ? "Sparar…" : "Spara resa"}</button></div></form></div>}
    {deleteTarget && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" role="dialog" aria-modal="true" aria-label="Bekräfta borttagning"><div className="w-full max-w-md rounded-3xl border border-white/15 bg-slate-900 p-6"><h2 className="text-xl font-bold">Ta bort resa?</h2><p className="mt-3 text-sm text-slate-300">Vill du ta bort ”{deleteTarget.title}”? Detta kan inte ångras.</p>{error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setDeleteTarget(null)} className="rounded-xl border border-white/15 px-4 py-2 text-sm">Avbryt</button><button type="button" disabled={saving} onClick={() => void remove()} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold disabled:opacity-50">{saving ? "Tar bort…" : "Ta bort"}</button></div></div></div>}
  </div>;
}
