"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, ArrowRight, Globe2, LoaderCircle, Mountain, RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";
import OrderedWidgetGroup from "@/components/dashboard/OrderedWidgetGroup";
import WidgetGate from "@/components/dashboard/WidgetGate";
import type { EarthData, VolcanoData } from "@/lib/earth-dashboard-types";

const TonightGothenburgWidget = dynamic(
  () => import("@/components/dashboard/TonightGothenburgWidget"),
  { loading: () => <div className="rounded-2xl border border-white/10 p-6 text-slate-400">Laddar Idag över Göteborg…</div> }
);

function goToEarth() {
  window.dispatchEvent(new CustomEvent("family-dashboard:navigate", {
    detail: { tab: "fun", child: "earth" },
  }));
}

export default function ExploreOverviewDashboard() {
  const [earth, setEarth] = useState<EarthData | null>(null);
  const [volcanoes, setVolcanoes] = useState<VolcanoData | null>(null);
  const [earthError, setEarthError] = useState(false);
  const [volcanoError, setVolcanoError] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      fetch("/api/earth").then(async r => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<EarthData>; }),
      fetch("/api/volcanoes").then(async r => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<VolcanoData>; }),
    ]);
    if (results[0].status === "fulfilled") { setEarth(results[0].value); setEarthError(false); }
    else setEarthError(true);
    if (results[1].status === "fulfilled") { setVolcanoes(results[1].value); setVolcanoError(false); }
    else setVolcanoError(true);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return (
    <section className="min-w-0 space-y-5 rounded-[2rem] border border-cyan-300/10 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/60 p-4 shadow-2xl sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
        <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-cyan-300">Utforska</p><h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Översikt</h2><p className="mt-2 text-sm text-slate-400">Det händer på himlen och jorden just nu.</p></div>
        <button type="button" onClick={() => void refresh()} disabled={loading} className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-200 hover:bg-white/10 disabled:opacity-50"><RefreshCw size={16} className={loading ? "animate-spin" : ""}/>Uppdatera</button>
      </header>
      <OrderedWidgetGroup wrapperClassName="grid w-full min-w-0 grid-cols-12 gap-5" itemComponent={WidgetGate} widgets={[{ id: "space-tonight", className: "col-span-12 min-w-0", content: <TonightGothenburgWidget /> }]} />
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-3xl border border-emerald-300/15 bg-emerald-400/[0.05] p-5">
          <div className="flex items-center gap-2 text-emerald-200"><Activity size={20}/><h3 className="text-lg font-bold">Jordbävningar</h3></div>
          {earth ? <div className="mt-4 space-y-2"><p className="text-3xl font-bold text-white">{earth.summary.totalEarthquakes}</p><p className="text-sm text-slate-400">Registrerade skalv senaste {earth.periodHours} timmarna</p><p className="text-sm text-slate-200">{earth.summary.largest ? `Kraftigast: M ${earth.summary.largest.magnitude.toFixed(1)} · ${earth.summary.largest.place}` : "Inget kraftigaste skalv rapporterat."}</p></div> : <p className="mt-4 text-sm text-slate-400">{loading ? "Hämtar jordbävningar…" : "Jordbävningsdata saknas för tillfället."}</p>}
          {earthError && <p className="mt-3 flex items-center gap-2 text-xs text-amber-200"><AlertTriangle size={14}/>Kunde inte uppdatera jordbävningar.</p>}
          <button type="button" onClick={goToEarth} className="mt-5 flex items-center gap-2 text-sm font-semibold text-emerald-200 hover:text-white">Visa jordbävningar <ArrowRight size={16}/></button>
        </article>
        <article className="rounded-3xl border border-orange-300/15 bg-orange-400/[0.05] p-5">
          <div className="flex items-center gap-2 text-orange-200"><Mountain size={20}/><h3 className="text-lg font-bold">Vulkanutbrott</h3></div>
          {volcanoes ? <div className="mt-4 space-y-2"><p className="text-3xl font-bold text-white">{volcanoes.total}</p><p className="text-sm text-slate-400">Vulkaner i den aktuella rapporteringen{volcanoes.statusDate ? ` · ${volcanoes.statusDate}` : ""}</p><p className="text-sm text-slate-200">{volcanoes.volcanoes.length ? `${volcanoes.volcanoes[0].name} · ${volcanoes.volcanoes[0].country}` : "Inga vulkaner i den hämtade listan."}</p></div> : <p className="mt-4 text-sm text-slate-400">{loading ? "Hämtar vulkaninformation…" : "Vulkaninformation saknas för tillfället."}</p>}
          {volcanoError && <p className="mt-3 flex items-center gap-2 text-xs text-amber-200"><AlertTriangle size={14}/>Kunde inte uppdatera vulkaninformation.</p>}
          <button type="button" onClick={goToEarth} className="mt-5 flex items-center gap-2 text-sm font-semibold text-orange-200 hover:text-white">Visa vulkaner <ArrowRight size={16}/></button>
        </article>
      </div>
    </section>
  );
}
