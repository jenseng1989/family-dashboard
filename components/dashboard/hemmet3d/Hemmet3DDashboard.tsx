"use client";

import { Home } from "lucide-react";
import { useEffect, useState } from "react";
import { getWidgetSettings, type WidgetSetting } from "@/lib/widget-settings";
import dynamic from "next/dynamic";

const ApartmentViewer = dynamic(() => import("./StlApartmentViewer"), {
  ssr: false,
  loading: () => <div className="flex h-[460px] items-center justify-center text-slate-300">Laddar 3D-modellen…</div>,
});

export default function Hemmet3DDashboard() {
  const [setting, setSetting] = useState<WidgetSetting | null>(null);
  useEffect(() => { let live = true; getWidgetSettings().then(rows => { if (live) setSetting(rows.find(row => row.widgetId === "hemmet3d-viewer") ?? null); }).catch(error => console.error("Kunde inte hämta smarthemwidget:", error)); return () => { live = false; }; }, []);
  return (
    <section className="w-full min-w-0 space-y-5 text-white">
      <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/15 to-slate-900 p-5 sm:p-7">
        <div className="flex items-center gap-3"><Home className="text-cyan-300" size={26}/><div><p className="text-xs uppercase tracking-widest text-cyan-300">Smarthem</p><h1 className="text-2xl font-bold">Smarthem</h1></div></div>
        <p className="mt-3 text-sm text-slate-300">Hantera smarta enheter.</p>
      </header>
      {(setting?.isVisible ?? true) && <div className={setting?.size === "half" ? "w-full xl:w-1/2" : "w-full"}><ApartmentViewer /></div>}
    </section>
  );
}
