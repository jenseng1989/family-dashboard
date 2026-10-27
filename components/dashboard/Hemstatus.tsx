"use client";

import { useEffect, useState } from "react";
import { HousePlug, Lightbulb, Thermometer, Shield, Zap, ArrowUpRight } from "lucide-react";

type Device = { id: string; type: string };
type Snapshot = {
  lights: string;
  climate: string;
  security: string;
  electricity: string;
};
const KEYS = {
  devices: "family-dashboard:hemmet3d:devices:v1",
  lights: "family-dashboard:hemmet3d:demo-lights:v1",
  climate: "family-dashboard:smarthem-preview:climate-states:v1",
  security: "family-dashboard:smarthem-preview:security-states:v1",
  electric: "family-dashboard:smarthem-preview:electric-states:v1",
};
function readJson(key: string): unknown {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as unknown : null; }
  catch { return null; }
}
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function readSnapshot(): Snapshot {
  const rawDevices = readJson(KEYS.devices);
  const devices: Device[] = Array.isArray(rawDevices)
    ? rawDevices.filter((d): d is Device => !!d && typeof d === "object" && typeof d.id === "string" && typeof d.type === "string")
    : [];
  const lightStates = record(readJson(KEYS.lights));
  const lights = devices.filter(d => ["light", "lamp", "bulb", "dimmer"].includes(d.type.toLowerCase()));
  const on = lights.filter(d => record(lightStates[d.id]).on === true).length;
  const climates = record(readJson(KEYS.climate));
  const climate = devices.map(d => record(climates[d.id])).find(s => typeof s.temperature === "number" && Number.isFinite(s.temperature));
  const security = record(readJson(KEYS.security));
  const securityCount = devices.filter(d => Object.prototype.hasOwnProperty.call(security, d.id)).length;
  const active = devices.filter(d => record(security[d.id]).active === true).length;
  const electric = record(readJson(KEYS.electric));
  const watts = devices.reduce((sum, d) => {
    const value = record(electric[d.id]).watts;
    return sum + (typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0);
  }, 0);
  const electricCount = devices.filter(d => typeof record(electric[d.id]).watts === "number").length;
  return {
    lights: lights.length ? `${on} av ${lights.length} tända` : "Inga lampor registrerade",
    climate: climate ? `${(climate.temperature as number).toLocaleString("sv-SE", { maximumFractionDigits: 1 })} °C` : "Ingen temperatur registrerad",
    security: securityCount ? `${active} av ${securityCount} aktiva` : "Ingen status registrerad",
    electricity: electricCount ? `${Math.round(watts).toLocaleString("sv-SE")} W` : "Ingen effekt registrerad",
  };
}
export default function Hemstatus() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  useEffect(() => {
    const refresh = () => setSnapshot(readSnapshot());
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("pageshow", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, []);
  const items = [
    { label: "Belysning", value: snapshot?.lights ?? "Laddar…", Icon: Lightbulb },
    { label: "Klimat", value: snapshot?.climate ?? "Laddar…", Icon: Thermometer },
    { label: "Säkerhet", value: snapshot?.security ?? "Laddar…", Icon: Shield },
    { label: "El", value: snapshot?.electricity ?? "Laddar…", Icon: Zap },
  ];
  return <section aria-label="Hemstatus" className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2"><HousePlug size={20} className="text-cyan-300"/><h2 className="text-lg font-semibold text-white">Hemstatus</h2></div>
      <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("family-dashboard:navigate", { detail: { tab: "hemmet3d", child: "Översikt" } }))} className="flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-white/10">Öppna Smarthem <ArrowUpRight size={14}/></button>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{items.map(({label,value,Icon}) => <div key={label} className="rounded-2xl border border-white/10 bg-slate-900/40 p-3"><div className="mb-2 flex items-center gap-2 text-xs text-slate-400"><Icon size={16}/>{label}</div><p className="text-sm font-semibold text-slate-100">{value}</p></div>)}</div>
    <p className="mt-3 text-xs text-slate-500">Visar lokalt sparade uppgifter från Smarthem i den här webbläsaren (demoläge, inte livevärden).</p>
  </section>;
}
