"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, CalendarDays, Check, Compass, GraduationCap, Hourglass, RefreshCw, ShoppingCart, Users, Zap, Plus, Trash2 } from "lucide-react";
import { getFamilyMembersFromDatabase } from "@/lib/family-db";
import { createUpcomingFamilyEvents, type FamilyEvent } from "@/lib/family";
import { formatPrice, type ElectricityData } from "@/lib/electricity";

type CalendarEvent = { id: string; title: string; startTime: string | null; endTime: string | null; allDay: boolean };
type CalendarResponse = { connected?: boolean; events?: CalendarEvent[] };
type Weather = { location: string; temperature: number; apparentTemperature: number; description: string; weatherCode: number; hourlyForecast: { time: string; temperature: number; weatherCode: number; precipitationProbability: number }[] };
type Countdown = { id: string; title: string; event_date: string };
type Task = { id: string; title: string; done: boolean };
const ZONE = "Europe/Stockholm";
const card = "rounded-xl border border-white/10 bg-[#0c293c]/95 shadow-[0_10px_35px_rgba(0,0,0,.12)]";
const nav = (tab: string, child?: string, anchor?: string) => `/?${new URLSearchParams({ tab, ...(child ? { child } : {}), ...(anchor ? { anchor } : {}) }).toString()}`;
// På Start är flikarna redan monterade: byt flik via dashboardens händelse
// i stället för att navigera till samma URL med nya query-parametrar.
function DashboardLink(props: React.ComponentProps<typeof Link>) {
  const { onClick, href, ...rest } = props;
  return (
    <Link
      {...rest}
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const destination = new URL(String(href), window.location.origin);
        if (window.location.pathname !== "/" || destination.pathname !== "/") return;
        const tab = destination.searchParams.get("tab");
        if (!tab) return;
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("family-dashboard:navigate", {
          detail: {
            tab,
            child: destination.searchParams.get("child") ?? undefined,
            anchor: destination.searchParams.get("anchor") ?? undefined,
          },
        }));
      }}
    />
  );
}

const symbol = (code: number) => code === 0 ? "☀️" : [1, 2].includes(code) ? "🌤️" : code === 3 ? "☁️" : [45,48].includes(code) ? "🌫️" : [51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code) ? "🌧️" : [71,73,75,77,85,86].includes(code) ? "🌨️" : code >= 95 ? "⛈️" : "🌥️";
const localDateKey = (date: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
const time = (value: string) => new Intl.DateTimeFormat("sv-SE", { timeZone: ZONE, hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const daysUntil = (date: string, now: Date) => {
  const today = localDateKey(now);
  const a = Date.parse(`${today}T12:00:00Z`);
  const b = Date.parse(`${date.slice(0,10)}T12:00:00Z`);
  return Math.round((b-a)/86400000);
};
const dayText = (n: number) => n === 0 ? "Idag" : n === 1 ? "Imorgon" : `Om ${n} dagar`;


type PricePoint = { time_start: string; SEK_per_kWh: number };

function ElectricityDayChart({ prices, now }: { prices: PricePoint[]; now: Date | null }) {
  const today = now ? localDateKey(now) : localDateKey(new Date());
  const dayPrices = prices
    .filter(p => localDateKey(new Date(p.time_start)) === today && Number.isFinite(p.SEK_per_kWh))
    .sort((a, b) => Date.parse(a.time_start) - Date.parse(b.time_start));
  if (!dayPrices.length) return <p className="mt-4 text-xs text-slate-400">Ingen prisgraf tillgänglig för idag.</p>;

  const W = 800, H = 200, left = 42, right = 12, top = 18, bottom = 28;
  const plotW = W - left - right, plotH = H - top - bottom;
  const values = dayPrices.map(p => p.SEK_per_kWh);
  const min = Math.min(0, ...values);
  const max = Math.max(...values);
  const upper = max > min ? max + (max - min) * 0.1 : max + 0.5;
  const lower = min < 0 ? min - (upper - min) * 0.06 : 0;
  const x = (minutes: number) => left + plotW * minutes / 1440;
  const y = (value: number) => top + plotH * (upper - value) / (upper - lower);
  const minuteOfDay = (date: Date) => {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(date);
    const hour = Number(parts.find(p => p.type === "hour")?.value ?? 0);
    const minute = Number(parts.find(p => p.type === "minute")?.value ?? 0);
    return hour * 60 + minute;
  };
  const points = dayPrices.map(p => ({ x: x(minuteOfDay(new Date(p.time_start))), y: y(p.SEK_per_kWh) }));
  const line = points.length === 1
    ? `M ${points[0].x} ${points[0].y} L ${x(1440)} ${points[0].y}`
    : points.reduce((path, point, i) => {
        if (i === 0) return `M ${point.x} ${point.y}`;
        const previous = points[i - 1];
        const middle = (previous.x + point.x) / 2;
        return `${path} C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`;
      }, "");
  const area = `${line} L ${points[points.length - 1].x} ${top + plotH} L ${points[0].x} ${top + plotH} Z`;
  const nowX = now ? x(minuteOfDay(now)) : null;
  const ticks = Array.from({ length: 5 }, (_, i) => lower + (upper - lower) * i / 4);

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold text-slate-200">Pris under dagen</p>
      <p className="mt-0.5 text-[11px] text-slate-400">Timpris i kronor per kWh</p>
      <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-[#222839] px-1 py-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Linjediagram över dagens elpriser med markering för aktuell tid">
          <defs>
            <linearGradient id="familjetavla-electricity-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5d9fff" stopOpacity="0.15"/>
              <stop offset="100%" stopColor="#5d9fff" stopOpacity="0"/>
            </linearGradient>
          </defs>
          {ticks.map((tick, i) => (
            <g key={i}>
              <line x1={left} x2={W - right} y1={y(tick)} y2={y(tick)} stroke="#7d859a" strokeOpacity=".2" strokeDasharray="2 3"/>
              <text x={left - 7} y={y(tick) + 3} textAnchor="end" fontSize="9" fill="#a9b2c6">{tick.toFixed(1).replace(".", ",")}</text>
            </g>
          ))}
          {nowX !== null && <rect x={Math.max(left, nowX - 12)} y={top} width="24" height={plotH} fill="#4b9d8b" opacity=".13"/>}
          <path d={area} fill="url(#familjetavla-electricity-fill)"/>
          <path d={line} fill="none" stroke="#67a5ff" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round"/>
          {nowX !== null && <>
            <line x1={nowX} x2={nowX} y1={top} y2={top + plotH} stroke="#e4ebf5" strokeWidth="1.2" strokeDasharray="2 3"/>
            <text x={nowX} y={top - 5} textAnchor="middle" fontSize="10" fontWeight="700" fill="#e4ebf5">NU</text>
          </>}
          {[0, 3, 6, 9, 12, 15, 18, 21].map(hour => (
            <text key={hour} x={x(hour * 60)} y={H - 9} textAnchor="middle" fontSize="9" fill="#a9b2c6">{String(hour).padStart(2, "0")}:00</text>
          ))}
        </svg>
      </div>
    </div>
  );
}

export default function Familjetavlan({ embedded = false }: { embedded?: boolean }) {
  const [now, setNow] = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [electricity, setElectricity] = useState<ElectricityData | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [schoolEvents, setSchoolEvents] = useState<CalendarEvent[]>([]);
  const [family, setFamily] = useState<FamilyEvent[]>([]);
  const [countdowns, setCountdowns] = useState<Countdown[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskText, setTaskText] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksSaving, setTasksSaving] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      const response = await fetch("/api/family-tasks", { cache: "no-store" });
      if (!response.ok) throw new Error("Kunde inte läsa uppgifterna.");
      let current = ((await response.json()) as { tasks: Task[] }).tasks;
      const raw = window.localStorage.getItem("familjetavla-tasks-v1");
      if (raw) {
        let old: Task[] = [];
        try {
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(parsed)) old = parsed.filter((t): t is Task =>
            typeof t === "object" && t !== null &&
            typeof t.id === "string" && /^[a-zA-Z0-9_.-]{1,100}$/.test(t.id) &&
            typeof t.title === "string" && t.title.trim().length > 0 && t.title.length <= 250 &&
            typeof t.done === "boolean");
        } catch { /* Låt skadad lokal data ligga kvar. */ }
        if (old.length > 0 && old.length <= 200) {
          const imported = await fetch("/api/family-tasks", {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tasks: old }),
          });
          if (!imported.ok) throw new Error("Importen av lokala uppgifter misslyckades.");
          const updated = await fetch("/api/family-tasks", { cache: "no-store" });
          if (!updated.ok) throw new Error("Kunde inte läsa importerade uppgifter.");
          current = ((await updated.json()) as { tasks: Task[] }).tasks;
          window.localStorage.removeItem("familjetavla-tasks-v1");
        }
      }
      setTasks(current);
      setTaskError(null);
    } catch (error) {
      console.error("Familjetavlan: uppgifter", error);
      setTaskError("Uppgifterna kunde inte synkroniseras. Försök uppdatera sidan.");
    } finally { setTasksLoading(false); }
  }, []);

  useEffect(() => { void loadTasks(); }, [loadTasks]);
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") void loadTasks(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadTasks]);

  const taskRequest = async (method: "POST" | "PATCH" | "DELETE", body: object) => {
    if (tasksSaving || tasksLoading) return false;
    setTasksSaving(true);
    setTaskError(null);
    try {
      const response = await fetch("/api/family-tasks", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("Databasen kunde inte uppdateras.");
      const latest = await fetch("/api/family-tasks", { cache: "no-store" });
      if (!latest.ok) throw new Error("Kunde inte läsa uppdaterade uppgifter.");
      setTasks(((await latest.json()) as { tasks: Task[] }).tasks);
      return true;
    } catch (error) {
      console.error("Familjetavlan: spara uppgift", error);
      setTaskError("Kunde inte spara ändringen. Försök igen.");
      return false;
    } finally { setTasksSaving(false); }
  };

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    const failures: string[] = [];
    const get = async <T,>(url: string, label: string): Promise<T | null> => {
      try { const r = await fetch(url, { cache: "no-store", signal }); if (!r.ok) throw Error(String(r.status)); return await r.json() as T; }
      catch (e) { if (!signal?.aborted) { console.error(`Familjetavlan: ${label}`, e); failures.push(label); } return null; }
    };
    const [w, el, cal, school, cd, fam] = await Promise.all([
      get<Weather>("/api/everyday-weather", "Väder"),
      get<ElectricityData>("/api/electricity", "Elpris"),
      get<CalendarResponse>("/api/google-calendar", "Kalender"),
      get<CalendarResponse>("/api/google-school-calendar", "Skola"),
      get<{ events: Countdown[] }>("/api/countdowns?upcoming=true", "Nedräkningar"),
      getFamilyMembersFromDatabase().then(m => createUpcomingFamilyEvents(m)).catch(e => { console.error("Familjetavlan: Familjen", e); failures.push("Familjen"); return null; }),
    ]);
    if (signal?.aborted) return;
    if (w) setWeather(w);
    if (el && Array.isArray(el.prices)) setElectricity(el);
    if (cal?.connected) setEvents(cal.events ?? []); else if (cal) failures.push("Kalender");
    if (school?.connected) setSchoolEvents(school.events ?? []); else if (school) failures.push("Skola");
    if (cd) setCountdowns(cd.events ?? []);
    if (fam) setFamily(fam);
    setErrors([...new Set(failures)]);
    setLoading(false);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    const interval = window.setInterval(() => { if (document.visibilityState === "visible" && navigator.onLine) void refresh(controller.signal); }, 15 * 60 * 1000);
    return () => { controller.abort(); window.clearInterval(interval); };
  }, [refresh]);

  const dateKey = now ? localDateKey(now) : "";
  const clock = now ? new Intl.DateTimeFormat("sv-SE", { hour: "2-digit", minute: "2-digit", timeZone: ZONE }).format(now) : "--:--";
  const dateLabel = now ? new Intl.DateTimeFormat("sv-SE", { weekday: "long", day: "numeric", month: "long", timeZone: ZONE }).format(now) : "Laddar datum…";
  const monthName = now ? new Intl.DateTimeFormat("sv-SE", { month: "long", year: "numeric", timeZone: ZONE }).format(now) : "Kalender";
  const monthDays = useMemo(() => {
    if (!now) return [];
    const [year, month] = localDateKey(now).split("-").map(Number);
    const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const offset = (firstDay + 6) % 7;
    const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return [...Array.from({ length: offset }, () => 0), ...Array.from({ length: days }, (_, i) => i + 1)];
  }, [now?.getMonth(), now?.getFullYear()]);
  const currentDay = dateKey ? Number(dateKey.split("-")[2]) : 0;
  const activeDate = selectedDate ?? dateKey;
  const sortedEvents = useMemo(() => {
    if (!activeDate) return [];
    return [...events, ...schoolEvents]
      .filter(event => {
        if (!event.startTime) return false;
        const startDay = localDateKey(new Date(event.startTime));
        if (startDay > activeDate) return false;
        if (!event.endTime) return startDay === activeDate;
        const end = new Date(event.endTime);
        // Kalenderhändelsers slutdatum är exklusivt vid heldag och vid midnatt.
        const lastMoment = new Date(end.getTime() - 1);
        return localDateKey(lastMoment) >= activeDate;
      })
      .sort((a, b) => new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime());
  }, [events, schoolEvents, activeDate]);
  const selectedDateLabel = activeDate
    ? new Intl.DateTimeFormat("sv-SE", { weekday: "long", day: "numeric", month: "long", timeZone: ZONE }).format(new Date(`${activeDate}T12:00:00Z`))
    : "";
  const upcomingFamily = useMemo(() => [...family].filter(e => e.daysUntil >= 0).sort((a,b) => a.daysUntil - b.daysUntil).slice(0, 3), [family]);
  const upcomingCountdowns = useMemo(() => now ? countdowns.map(c => ({...c, days: daysUntil(c.event_date, now)})).filter(c => c.days >= 0).sort((a,b) => a.days-b.days).slice(0, 4) : [], [countdowns, dateKey]);
  const forecast = weather?.hourlyForecast?.slice(0, 12) ?? [];
  const links = [
    { label: "Inköp", sub: "Handlingslista och ekonomi", href: nav("home", "shopping"), icon: ShoppingCart, tone: "text-emerald-300" },
    { label: "Familjen", sub: "Familjens översikt", href: nav("family", "Gemensam"), icon: Users, tone: "text-violet-300" },
    { label: "Utforska", sub: "Upptäck mer", href: nav("fun", "overview"), icon: Compass, tone: "text-amber-300" },
    { label: "Skola", sub: "Skolkalendern", href: nav("home", "school"), icon: GraduationCap, tone: "text-sky-300" },
  ];

  return (
    <main className={embedded ? "min-w-0 text-white" : "min-h-screen bg-[#071522] px-3 py-5 text-white sm:px-6 lg:px-8"}>
      <div className="mx-auto max-w-[1600px] space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-[.22em] text-sky-300">Family Dashboard</p><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Familjetavlan</h1></div>
          <div className="flex items-center gap-2">{!embedded && <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-semibold hover:bg-white/10"><ArrowLeft size={17}/> Tillbaka till Start</Link>}<button onClick={() => void refresh()} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 text-sm hover:bg-white/10 disabled:opacity-50" aria-label="Uppdatera data"><RefreshCw size={17} className={loading ? "animate-spin" : ""}/></button></div>
        </header>
        {errors.length > 0 && <p role="status" className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">Vissa uppgifter kunde inte uppdateras: {errors.join(", ")}. Senast hämtade uppgifter visas där de finns.</p>}

        {/* Samma tredelade disposition som inspirationsbilden. */}
        <section aria-label="Familjetavlans huvudvy" className="grid gap-3 rounded-2xl border border-sky-300/10 bg-[#061e30] p-3 shadow-2xl lg:grid-cols-[minmax(210px,1fr)_minmax(0,2fr)_minmax(240px,1.15fr)] lg:gap-4 lg:p-5">
          <div className="flex flex-col gap-5 p-2 lg:py-5">
            <div><p className="text-6xl font-light tracking-tighter tabular-nums sm:text-7xl xl:text-[5.5rem]">{clock}</p><p className="mt-2 text-lg capitalize text-slate-200">{dateLabel}</p></div>
            <div className="mt-4"><h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-sky-200">Att göra</h2>
              <div className="space-y-2">{tasks.map(task => <div key={task.id} className="flex items-center gap-2 text-sm"><button disabled={tasksSaving || tasksLoading} aria-label={`Markera ${task.title}`} onClick={() => void taskRequest("PATCH", { id: task.id, done: !task.done })} className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border disabled:opacity-50 ${task.done ? "border-emerald-400 bg-emerald-500/20" : "border-slate-400"}`}>{task.done && <Check size={13}/>}</button><span className={`min-w-0 flex-1 break-words ${task.done ? "text-slate-500 line-through" : "text-slate-200"}`}>{task.title}</span><button disabled={tasksSaving || tasksLoading} aria-label={`Ta bort ${task.title}`} onClick={() => void taskRequest("DELETE", { id: task.id })} className="text-slate-500 hover:text-rose-300 disabled:opacity-50"><Trash2 size={14}/></button></div>)}{tasksLoading && <p className="text-sm text-slate-400">Hämtar uppgifter…</p>}{!tasksLoading && tasks.length === 0 && <p className="text-sm text-slate-400">Inga uppgifter tillagda.</p>}</div>
              <form className="mt-4 flex gap-2" onSubmit={async e => { e.preventDefault(); const title = taskText.trim(); if (!title || tasksSaving || tasksLoading) return; if (await taskRequest("POST", { title })) setTaskText(""); }}><input aria-label="Ny uppgift" maxLength={250} disabled={tasksSaving || tasksLoading} value={taskText} onChange={e => setTaskText(e.target.value)} placeholder="Ny uppgift…" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-sky-400 disabled:opacity-50"/><button disabled={tasksSaving || tasksLoading || !taskText.trim()} aria-label="Lägg till uppgift" className="rounded-lg bg-sky-500/20 px-3 text-sky-200 hover:bg-sky-500/30 disabled:opacity-50"><Plus size={18}/></button></form>{taskError && <p role="alert" className="mt-2 text-xs text-rose-300">{taskError}</p>}</div>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <div className="relative min-h-[240px] flex-1 overflow-hidden rounded-xl bg-[#163a55] sm:min-h-[310px]"><div className="absolute inset-0 bg-[url('/images/goteborg-skyline.png')] bg-cover bg-center"/><div className="absolute inset-0 bg-gradient-to-t from-[#071b2b]/80 via-transparent to-transparent"/><div className="absolute bottom-5 left-5"><p className="text-xs font-semibold uppercase tracking-[.2em] text-sky-200">Dagens utsikt</p><p className="mt-1 text-2xl font-semibold">Göteborg</p></div></div>
            <DashboardLink href={nav("weather")} className={`${card} block p-4 transition hover:border-sky-400/40`}><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="text-5xl">{weather ? symbol(weather.weatherCode) : "🌤️"}</span><div><p className="text-4xl font-semibold">{weather ? `${Math.round(weather.temperature)}°` : "--°"}</p><p className="text-sm text-slate-300">{weather?.description ?? "Vädret laddas…"}</p></div></div><div className="text-right text-sm text-slate-300"><p>{weather?.location ?? "Göteborg"}</p><p>Känns som {weather ? `${Math.round(weather.apparentTemperature)}°` : "–"}</p></div></div></DashboardLink>
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">{forecast.map(h => <div key={h.time} className="rounded-lg bg-[#102d42] p-2 text-center"><p className="text-[11px] text-slate-300">{time(h.time)}</p><p className="my-1 text-xl">{symbol(h.weatherCode)}</p><p className="text-sm font-semibold">{Math.round(h.temperature)}°</p></div>)}{forecast.length === 0 && <p className="col-span-full py-5 text-center text-sm text-slate-400">Timprognosen laddas…</p>}</div>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <div className={`${card} p-4`}><h2 className="mb-3 text-base font-semibold capitalize">{monthName}</h2><div className="grid grid-cols-7 gap-1 text-center">{["M","T","O","T","F","L","S"].map((d,i) => <span key={i} className="pb-1 text-xs text-slate-400">{d}</span>)}{monthDays.map((day,i) => {
              if (!day) return <span key={i} aria-hidden="true" />;
              const dayKey = `${dateKey.slice(0, 7)}-${String(day).padStart(2, "0")}`;
              const isSelected = activeDate === dayKey;
              const isToday = day === currentDay;
              return <button key={i} type="button" onClick={() => setSelectedDate(dayKey)} aria-label={`Visa aktiviteter ${dayKey}`} aria-pressed={isSelected} className={`flex aspect-square items-center justify-center rounded-full text-xs transition hover:bg-sky-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 ${isSelected ? "bg-rose-600 font-bold text-white" : isToday ? "border border-rose-400 font-semibold text-white" : "text-slate-200"}`}>{day}</button>;
            })}</div></div>
            <div className={`${card} flex-1 p-4`}><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-sky-200"><CalendarDays size={16}/> Kommande aktiviteter</h2>{activeDate !== dateKey && <button type="button" onClick={() => setSelectedDate(null)} className="rounded-md border border-white/15 px-2 py-1 text-xs text-sky-200 hover:bg-white/10">Visa idag</button>}</div><p className="mb-3 text-xs capitalize text-slate-400">{selectedDateLabel}</p><div className="space-y-2">{sortedEvents.map((e,i) => <div key={`${e.id}-${i}`} className={`flex items-center gap-2 rounded-md px-2 py-2 ${["bg-cyan-700/70","bg-emerald-700/70","bg-amber-700/70","bg-violet-700/70"][i%4]}`}><span className="min-w-0 flex-1 truncate text-xs font-medium">{e.title}</span><span className="shrink-0 text-[11px]">{e.allDay ? "Heldag" : e.startTime ? time(e.startTime) : "–"}</span></div>)}{sortedEvents.length === 0 && <p className="text-sm text-slate-400">Inga aktiviteter denna dag.</p>}</div></div>
          </div>
        </section>

        <section aria-label="Genvägar"><h2 className="mb-3 text-lg font-bold">Genvägar</h2><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{links.map(l => <DashboardLink key={l.label} href={l.href} className={`${card} group flex min-h-24 items-center gap-3 p-4 transition hover:border-sky-400/40 hover:bg-[#12354d]`}><l.icon className={`shrink-0 ${l.tone}`} size={27}/><span className="min-w-0 flex-1"><span className="block font-semibold">{l.label}</span><span className="mt-1 hidden text-xs text-slate-400 sm:block">{l.sub}</span></span><ArrowUpRight size={16} className="shrink-0 text-slate-400 group-hover:text-white"/></DashboardLink>)}</div></section>

        <section aria-label="Familjens aktuella information" className="grid gap-3 lg:grid-cols-2">
          <DashboardLink href={nav("home", "shopping")} className={`${card} block p-5 transition hover:border-sky-400/40`}><h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Zap size={21} className="text-cyan-300"/> Elpris just nu <ArrowUpRight size={16} className="ml-auto text-slate-400"/></h2><p className="text-4xl font-bold">{electricity?.currentPrice ? formatPrice(electricity.currentPrice.SEK_per_kWh) : "–"}<span className="ml-2 text-sm font-normal text-slate-300">kr/kWh</span></p><p className="mt-3 text-sm text-slate-300">Dagens snitt: {electricity ? formatPrice(electricity.averagePrice) : "–"} kr/kWh</p>{electricity?.prices?.length ? <ElectricityDayChart prices={electricity.prices} now={now}/> : null}</DashboardLink>
          <DashboardLink href={nav("family", "Gemensam")} className={`${card} block p-5 transition hover:border-sky-400/40`}><h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Users size={21} className="text-violet-300"/> Familjens händelser <ArrowUpRight size={16} className="ml-auto text-slate-400"/></h2><div className="space-y-3">{upcomingFamily.map((e,i) => <div key={`${e.title}-${i}`} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-3"><span className="min-w-0 text-sm font-medium">{e.title}</span><span className="shrink-0 text-xs text-violet-200">{dayText(e.daysUntil)}</span></div>)}{upcomingFamily.length === 0 && <p className="text-sm text-slate-400">Inga kommande familjehändelser.</p>}</div></DashboardLink>
        </section>
        <DashboardLink href={nav("home", "home")} className={`${card} block p-5 transition hover:border-sky-400/40`}><h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Hourglass size={21} className="text-rose-300"/> Viktiga nedräkningar <ArrowUpRight size={16} className="ml-auto text-slate-400"/></h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{upcomingCountdowns.map(c => <div key={c.id} className="rounded-lg bg-white/5 p-4"><p className="truncate text-sm font-semibold">{c.title}</p><p className="mt-2 text-3xl font-bold">{c.days} <span className="text-sm font-normal text-slate-400">dagar</span></p></div>)}{upcomingCountdowns.length === 0 && <p className="text-sm text-slate-400">Inga aktiva nedräkningar.</p>}</div></DashboardLink>
        
      </div>
    </main>
  );
}
