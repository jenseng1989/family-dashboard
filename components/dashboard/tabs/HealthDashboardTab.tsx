"use client";

import { Activity, CalendarDays, Clock3, RefreshCw, Footprints } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getFamilyMembersFromDatabase } from "@/lib/family-db";

type Person = "Jens" | "Lenita";
type StepDay = { date: string; steps: number; source: string; updated_at: string };
const GOAL = 10000;
const numberFormat = new Intl.NumberFormat("sv-SE");

function stockholmDay(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
}
function dayOffset(iso: string, offset: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}
function weekday(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", { weekday: "short", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
}
function formatSync(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "Okänd" : d.toLocaleString("sv-SE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Stockholm" });
}

export default function HealthDashboardTab({ selectedLabel = "Jens" }: { selectedLabel?: Person }) {
  const [days, setDays] = useState<StepDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [today, setToday] = useState(() => stockholmDay(new Date()));

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const current = stockholmDay(new Date());
      setToday(current);
      const members = await getFamilyMembersFromDatabase();
      const member = members.find(m => m.isActive && m.memberType === "adult" && m.displayName.trim().toLocaleLowerCase("sv-SE") === selectedLabel.toLocaleLowerCase("sv-SE"));
      if (!member) throw new Error(`Hittade inte ${selectedLabel} bland aktiva familjemedlemmar.`);
      const params = new URLSearchParams({ memberId: member.id, from: dayOffset(current, -6), to: current });
      const response = await fetch(`/api/health/steps?${params}`, { credentials: "same-origin", cache: "no-store" });
      const result: { days?: StepDay[]; error?: string } = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Kunde inte hämta stegdata.");
      setDays(Array.isArray(result.days) ? result.days : []);
    } catch (e) {
      setDays([]);
      setError(e instanceof Error ? e.message : "Ett okänt fel uppstod.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedLabel]);

  useEffect(() => { void load(); }, [load]);
  const week = useMemo(() => {
    const totals = new Map<string, { steps: number; updated_at: string }>();
    for (const item of days) {
      if (!Number.isFinite(item.steps) || item.steps < 0) continue;
      const existing = totals.get(item.date);
      // En källa används för närvarande. Om flera källor finns, välj den senaste
      // i stället för att addera potentiellt överlappande steg.
      if (!existing || item.updated_at > existing.updated_at) totals.set(item.date, item);
    }
    return Array.from({ length: 7 }, (_, index) => {
      const date = dayOffset(today, index - 6);
      return { date, steps: totals.get(date)?.steps ?? null, updated_at: totals.get(date)?.updated_at ?? null };
    });
  }, [days, today]);
  const current = week[6];
  const steps = current.steps;
  const percentage = steps === null ? 0 : Math.min(100, Math.round(steps / GOAL * 100));
  const recorded = week.filter(d => d.steps !== null);
  const average = recorded.length ? Math.round(recorded.reduce((sum, d) => sum + (d.steps ?? 0), 0) / recorded.length) : null;
  const max = Math.max(GOAL, ...week.map(d => d.steps ?? 0));

  return (
    <section className="w-full min-w-0 space-y-5 text-slate-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-300">Hälsa och Träning</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{selectedLabel}</h1>
          <p className="mt-1 text-sm text-slate-400">Steg från Health Connect via Family Dashboard</p>
        </div>
        <button type="button" onClick={() => void load(true)} disabled={loading || refreshing}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-semibold hover:bg-white/10 disabled:opacity-50">
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> Uppdatera
        </button>
      </div>
      {error ? <div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}
      {loading ? <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-slate-400">Hämtar stegdata…</div> : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-[#15263d] p-6 lg:col-span-2">
              <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-cyan-200"><Footprints size={18}/> Dagens steg</div>
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-around">
                <div className="relative grid h-48 w-48 shrink-0 place-items-center rounded-full"
                  style={{ background: `conic-gradient(#22d3ee ${percentage}%, #334155 ${percentage}% 100%)` }}>
                  <div className="grid h-40 w-40 place-content-center rounded-full bg-[#15263d] text-center">
                    <span className="text-3xl font-bold tabular-nums">{steps === null ? "–" : numberFormat.format(steps)}</span>
                    <span className="mt-1 text-xs text-slate-400">av {numberFormat.format(GOAL)} steg</span>
                  </div>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-3xl font-bold text-cyan-300">{steps === null ? "–" : `${percentage} %`}</p>
                  <p className="mt-2 text-sm text-slate-400">{steps === null ? "Inga steg har synkroniserats idag." : steps >= GOAL ? "Dagens stegmål är uppnått!" : `${numberFormat.format(GOAL - steps)} steg kvar till målet.`}</p>
                  <p className="mt-3 text-xs text-slate-500">Stegmål: {numberFormat.format(GOAL)} per dag</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-3xl border border-white/10 bg-[#15263d] p-5">
                <div className="flex items-center gap-2 text-sm text-slate-400"><Activity size={17}/> Snitt per registrerad dag</div>
                <p className="mt-3 text-3xl font-bold tabular-nums">{average === null ? "–" : numberFormat.format(average)}</p>
                <p className="mt-1 text-xs text-slate-500">Senaste 7 dagarna · {recorded.length} dagar med data</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-[#15263d] p-5">
                <div className="flex items-center gap-2 text-sm text-slate-400"><Clock3 size={17}/> Senaste synkronisering idag</div>
                <p className="mt-3 text-sm font-semibold">{current.updated_at ? formatSync(current.updated_at) : "Ingen synkronisering idag"}</p>
                <p className="mt-2 text-xs text-slate-500">Synkronisera från Android-appen för nya värden.</p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#15263d] p-5 sm:p-6">
            <div className="mb-6 flex items-center gap-2 font-semibold"><CalendarDays size={19} className="text-cyan-300"/> Senaste 7 dagarna</div>
            <div className="grid grid-cols-7 gap-2 sm:gap-4">
              {week.map(day => (
                <div key={day.date} className="flex min-w-0 flex-col items-center gap-2">
                  <div className="flex h-40 w-full items-end justify-center rounded-lg bg-white/[0.03] p-1 sm:p-2" title={`${day.date}: ${day.steps === null ? "Ingen data" : `${numberFormat.format(day.steps)} steg`}`}>
                    <div className="w-full max-w-14 rounded-t-md bg-gradient-to-t from-cyan-700 to-cyan-300 transition-all"
                      style={{ height: day.steps === null ? "0%" : `${Math.max(day.steps > 0 ? 3 : 0, day.steps / max * 100)}%` }} />
                  </div>
                  <span className="text-xs capitalize text-slate-400">{weekday(day.date)}</span>
                  <span className="text-[10px] tabular-nums text-slate-300 sm:text-xs">{day.steps === null ? "–" : numberFormat.format(day.steps)}</span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs text-slate-500">– betyder att ingen data finns för dagen, inte att du gått noll steg.</p>
          </div>
        </>
      )}
    </section>
  );
}
