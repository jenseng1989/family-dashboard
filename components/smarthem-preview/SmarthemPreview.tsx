"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Home, Lightbulb, Tv, Shield, Zap, Thermometer, Menu, RotateCcw, Box, Map, X, CloudSun, Activity, Settings, Plus, Pencil, Trash2, MapPin, Save, Speaker, Play, Pause, Square, Volume2, VolumeX, LockKeyhole, UnlockKeyhole } from "lucide-react";
import type { Device, LightState, Room } from "@/components/smarthem-preview/ApartmentModel";

const ApartmentModel = dynamic(() => import("@/components/smarthem-preview/ApartmentModel"), { ssr: false, loading: () => <div className="flex h-[440px] items-center justify-center rounded-2xl bg-slate-900 text-slate-300">Laddar bostadsmodellen…</div> });
type Overview = {
  weather: null | { temperature: number; apparentTemperature: number | null; description: string; isDay: boolean; hours: { time: string; temperature: number; precipitationProbability: number; description: string }[] };
  electricity: null | { area: string; currentOrePerKwh: number | null; averageOrePerKwh: number; hours: { time: string; orePerKwh: number }[] };
  errors: { weather: string | null; electricity: string | null };
};
const formatNumber = (value: number, digits = 0) => value.toLocaleString("sv-SE", { minimumFractionDigits: digits, maximumFractionDigits: digits });
type Category = "Smarthem" | "Belysning" | "Media" | "Övervakning" | "El" | "Klimat" | "Administration";
const menu = [
  { name: "Smarthem", icon: Home }, { name: "Belysning", icon: Lightbulb },
  { name: "Media", icon: Tv }, { name: "Övervakning", icon: Shield },
  { name: "El", icon: Zap }, { name: "Klimat", icon: Thermometer },
  { name: "Administration", icon: Settings },
] as const;
const ROOMS = "family-dashboard:hemmet3d:rooms:v1";
const DEVICES = "family-dashboard:hemmet3d:devices:v1";
const LIGHTS = "family-dashboard:hemmet3d:demo-lights:v1";
const SCENES = "family-dashboard:hemmet3d:light-scenes:v1";
const SECURITY_STATES = "family-dashboard:smarthem-preview:security-states:v1";
const SECURITY_EVENTS = "family-dashboard:smarthem-preview:security-events:v1";
type SecurityState = { active: boolean };
type SecurityEvent = { id: string; deviceId: string; deviceName: string; message: string; timestamp: string };
const CLIMATE_STATES = "family-dashboard:smarthem-preview:climate-states:v1";
const CLIMATE_HISTORY = "family-dashboard:smarthem-preview:climate-history:v1";
type ClimateState = { temperature: number; humidity: number; target: number };
type ClimateReading = { timestamp: string; temperature: number; humidity: number };
const DEFAULT_CLIMATE: ClimateState = { temperature: 21, humidity: 45, target: 21 };
const climateNumber = (n: unknown, low: number, high: number): n is number => typeof n === "number" && Number.isFinite(n) && n >= low && n <= high;
const validClimate = (v: unknown): v is ClimateState => !!v && typeof v === "object" && climateNumber((v as ClimateState).temperature,-30,60) && climateNumber((v as ClimateState).humidity,0,100) && climateNumber((v as ClimateState).target,16,30);
const validReading = (v: unknown): v is ClimateReading => !!v && typeof v === "object" && typeof (v as ClimateReading).timestamp === "string" && climateNumber((v as ClimateReading).temperature,-30,60) && climateNumber((v as ClimateReading).humidity,0,100);
const MEDIA_STATES = "family-dashboard:smarthem-preview:media-states:v1";
type MediaState = { playing: boolean; volume: number; muted: boolean };
const defaultMediaState: MediaState = { playing: false, volume: 45, muted: false };
function isMediaState(value: unknown): value is MediaState {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<MediaState>;
  return typeof v.playing === "boolean" && typeof v.muted === "boolean" &&
    typeof v.volume === "number" && Number.isFinite(v.volume) && v.volume >= 0 && v.volume <= 100;
}
const DEVICE_TYPES = [
  { value: "light", label: "Belysning – Lampa" }, { value: "dimmer", label: "Belysning – Dimmer" },
  { value: "switch", label: "Belysning – Strömbrytare" }, { value: "speaker", label: "Media – Högtalare" },
  { value: "tv", label: "Media – TV" }, { value: "media_player", label: "Media – Mediaspelare" },
  { value: "camera", label: "Övervakning – Kamera" }, { value: "sensor", label: "Övervakning – Sensor" },
  { value: "motion", label: "Övervakning – Rörelsesensor" }, { value: "lock", label: "Övervakning – Lås" },
  { value: "alarm", label: "Övervakning – Larm" }, { value: "energy", label: "El – Energimätare" },
  { value: "power", label: "El – Effektmätare" }, { value: "meter", label: "El – Mätare" },
  { value: "thermostat", label: "Klimat – Termostat" }, { value: "temperature", label: "Klimat – Temperatursensor" },
  { value: "humidity", label: "Klimat – Fuktsensor" }, { value: "climate", label: "Klimat – Klimatenhet" },
] as const;
const LIGHT_TYPES = new Set(["light", "dimmer", "switch"]);
type Scene = { id: string; name: string; lights: Record<string, LightState> };
function readArray<T>(key: string, valid: (item: unknown) => item is T): T[] {
  try { const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]"); return Array.isArray(value) ? value.filter(valid) : []; } catch { return []; }
}
function isRoom(value: unknown): value is Room { return !!value && typeof value === "object" && typeof (value as Room).id === "string" && typeof (value as Room).x === "number" && typeof (value as Room).z === "number"; }
function isDevice(value: unknown): value is Device { return !!value && typeof value === "object" && typeof (value as Device).id === "string" && typeof (value as Device).name === "string" && typeof (value as Device).type === "string" && typeof (value as Device).x === "number" && typeof (value as Device).z === "number"; }
function isScene(value: unknown): value is Scene { return !!value && typeof value === "object" && typeof (value as Scene).id === "string" && typeof (value as Scene).name === "string" && !!(value as Scene).lights && typeof (value as Scene).lights === "object"; }
function categoryOf(type: string): Category | null {
  const t = type.toLowerCase();
  if (["light", "dimmer", "switch"].includes(t)) return "Belysning";
  if (["media", "speaker", "tv", "media_player"].includes(t)) return "Media";
  if (["camera", "sensor", "motion", "alarm", "lock", "binary_sensor"].includes(t)) return "Övervakning";
  if (["energy", "power", "electricity", "meter"].includes(t)) return "El";
  if (["climate", "thermostat", "temperature", "humidity"].includes(t)) return "Klimat";
  return null;
}
export default function SmarthemPreviewPage({ embedded = false, selectedCategory }: { embedded?: boolean; selectedCategory?: Category }) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [overviewError, setOverviewError] = useState(false);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [category, setCategory] = useState<Category>("Smarthem");
  const [view, setView] = useState<"2d" | "3d">("2d");
  const [reset, setReset] = useState(0);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [lights, setLights] = useState<Record<string, LightState>>({});
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [mediaStates, setMediaStates] = useState<Record<string, MediaState>>({});
  const [climateStates, setClimateStates] = useState<Record<string, ClimateState>>({});
  const [climateHistory, setClimateHistory] = useState<Record<string, ClimateReading[]>>({});
  const [securityStates, setSecurityStates] = useState<Record<string, SecurityState>>({});
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState("");
  const [roomArea, setRoomArea] = useState("");
  const [roomNotes, setRoomNotes] = useState("");
  const [placingRoomId, setPlacingRoomId] = useState<string | null>(null);
  const [roomError, setRoomError] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState("");
  const [deviceType, setDeviceType] = useState("light");
  const [deviceRoomId, setDeviceRoomId] = useState("");
  const [deviceManufacturer, setDeviceManufacturer] = useState("");
  const [deviceEntityId, setDeviceEntityId] = useState("");
  const [placingDeviceId, setPlacingDeviceId] = useState<string | null>(null);
  const [deviceError, setDeviceError] = useState("");
  const [confirmDeviceDeleteId, setConfirmDeviceDeleteId] = useState<string | null>(null);
  useEffect(() => {
    setRooms(readArray(ROOMS, isRoom));
    setDevices(readArray(DEVICES, isDevice));
    setScenes(readArray(SCENES, isScene));
    try { const raw: unknown = JSON.parse(localStorage.getItem(CLIMATE_STATES) ?? "{}"); if (raw && typeof raw === "object" && !Array.isArray(raw)) setClimateStates(Object.fromEntries(Object.entries(raw).filter(([,v]) => validClimate(v)))); } catch { /* Inga sparade klimatvärden */ }
    try { const raw: unknown = JSON.parse(localStorage.getItem(CLIMATE_HISTORY) ?? "{}"); if (raw && typeof raw === "object" && !Array.isArray(raw)) setClimateHistory(Object.fromEntries(Object.entries(raw).filter(([,v]) => Array.isArray(v)).map(([k,v]) => [k,(v as unknown[]).filter(validReading).slice(-30)]))); } catch { /* Ingen sparad historik */ }

    try { const data: unknown = JSON.parse(localStorage.getItem(SECURITY_STATES) ?? "{}"); if (data && typeof data === "object" && !Array.isArray(data)) setSecurityStates(Object.fromEntries(Object.entries(data).filter(([, v]) => !!v && typeof v === "object" && typeof (v as SecurityState).active === "boolean")) as Record<string, SecurityState>); } catch { /* Tomt demoläge */ }
    setSecurityEvents(readArray(SECURITY_EVENTS, (value): value is SecurityEvent => !!value && typeof value === "object" && typeof (value as SecurityEvent).id === "string" && typeof (value as SecurityEvent).deviceId === "string" && typeof (value as SecurityEvent).timestamp === "string" && typeof (value as SecurityEvent).message === "string" && typeof (value as SecurityEvent).deviceName === "string"));
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(MEDIA_STATES) ?? "{}");
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        setMediaStates(Object.fromEntries(Object.entries(raw).filter((entry): entry is [string, MediaState] => isMediaState(entry[1]))));
      }
    } catch { /* Saknade eller felaktiga demoinställningar */ }
    try { const parsed: unknown = JSON.parse(localStorage.getItem(LIGHTS) ?? "{}"); if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) setLights(parsed as Record<string, LightState>); } catch { /* Behåll tomt demoläge */ }
    setLoaded(true);
  }, []);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/smarthem-preview/overview", { cache: "no-store" });
        if (!response.ok) throw new Error("Kunde inte hämta översikten");
        const data = await response.json() as Overview;
        if (active) { setOverview(data); setOverviewError(false); }
      } catch {
        if (active) setOverviewError(true);
      } finally {
        if (active) setOverviewLoading(false);
      }
    };
    void load();
    const timer = window.setInterval(() => { void load(); }, 15 * 60 * 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  const currentCategory = embedded && selectedCategory ? selectedCategory : category;
  const visible = useMemo(() => currentCategory === "Administration" ? devices : devices.filter(device => categoryOf(device.type) === currentCategory), [devices, currentCategory]);
  const selected = visible.find(device => device.id === selectedId);
  const lightDevices = devices.filter(device => LIGHT_TYPES.has(device.type.toLowerCase()));
  const onCount = lightDevices.filter(device => lights[device.id]?.on).length;
  function choose(next: Category) { setCategory(next); setSelectedId(null); setPlacingRoomId(null); setPlacingDeviceId(null); setMobileMenu(false); }
  function changeSecurity(device: Device, active: boolean) {
    const nextStates = { ...securityStates, [device.id]: { active } };
    setSecurityStates(nextStates);
    try { localStorage.setItem(SECURITY_STATES, JSON.stringify(nextStates)); } catch { /* Lokal lagring kan vara blockerad */ }
    const type = device.type.toLowerCase();
    const action = type === "lock" ? (active ? "låstes upp" : "låstes") :
      type === "motion" ? (active ? "upptäckte rörelse" : "återgick till ingen rörelse") :
      type === "camera" ? (active ? "aktiverades" : "inaktiverades") :
      type === "alarm" ? (active ? "aktiverades" : "inaktiverades") :
      (active ? "öppnades / aktiverades" : "stängdes / återställdes");
    const entry: SecurityEvent = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, deviceId: device.id, deviceName: device.name, message: `${device.name} ${action}`, timestamp: new Date().toISOString() };
    const nextEvents = [entry, ...securityEvents].slice(0, 100);
    setSecurityEvents(nextEvents);
    try { localStorage.setItem(SECURITY_EVENTS, JSON.stringify(nextEvents)); } catch { /* Lokal lagring kan vara blockerad */ }
  }
  function changeClimate(id: string, patch: Partial<ClimateState>, record = false) {
    const nextValue = { ...(climateStates[id] ?? DEFAULT_CLIMATE), ...patch };
    if (!validClimate(nextValue)) return;
    const next = { ...climateStates, [id]: nextValue };
    setClimateStates(next);
    try { localStorage.setItem(CLIMATE_STATES, JSON.stringify(next)); } catch { /* Lagring är valfri */ }
    if (record) {
      const history = { ...climateHistory, [id]: [...(climateHistory[id] ?? []), { timestamp: new Date().toISOString(), temperature: nextValue.temperature, humidity: nextValue.humidity }].slice(-30) };
      setClimateHistory(history);
      try { localStorage.setItem(CLIMATE_HISTORY, JSON.stringify(history)); } catch { /* Lagring är valfri */ }
    }
  }
  function changeMedia(id: string, patch: Partial<MediaState>) {
    setMediaStates(previous => {
      const updated = { ...previous, [id]: { ...(previous[id] ?? defaultMediaState), ...patch } };
      try { localStorage.setItem(MEDIA_STATES, JSON.stringify(updated)); } catch { /* Demoläge fungerar även utan lagring */ }
      return updated;
    });
  }
  function changeLight(id: string, patch: Partial<LightState>) {
    setActiveSceneId(null);
    setLights(previous => {
      const updated = { ...previous, [id]: { on: previous[id]?.on ?? false, brightness: previous[id]?.brightness ?? 65, ...patch } };
      try { localStorage.setItem(LIGHTS, JSON.stringify(updated)); } catch { /* Lokalt lagringsfel */ }
      return updated;
    });
  }
  function setAll(on: boolean) {
    setActiveSceneId(null);
    setLights(previous => {
      const updated = { ...previous };
      for (const device of lightDevices) updated[device.id] = { on, brightness: previous[device.id]?.brightness ?? 65 };
      try { localStorage.setItem(LIGHTS, JSON.stringify(updated)); } catch { /* Lokalt lagringsfel */ }
      return updated;
    });
  }
  function activateScene(scene: Scene) {
    setActiveSceneId(scene.id);
    setLights(previous => {
      const updated = { ...previous };
      for (const device of lightDevices) {
        const value = scene.lights[device.id];
        if (value && typeof value.on === "boolean" && Number.isFinite(value.brightness)) updated[device.id] = { on: value.on, brightness: Math.max(1, Math.min(100, value.brightness)) };
      }
      try { localStorage.setItem(LIGHTS, JSON.stringify(updated)); } catch { /* Lokalt lagringsfel */ }
      return updated;
    });
  }
  function persistDevices(next: Device[]) {
    try {
      localStorage.setItem(DEVICES, JSON.stringify(next));
      setDevices(next);
      setDeviceError("");
      return true;
    } catch {
      setDeviceError("Kunde inte spara enheterna i webbläsaren.");
      return false;
    }
  }
  function editDevice(device?: Device) {
    setEditingDeviceId(device?.id ?? "new");
    setDeviceName(device?.name ?? "");
    setDeviceType(device?.type ?? "light");
    setDeviceRoomId(device?.roomId ?? rooms[0]?.id ?? "");
    setDeviceManufacturer(device?.manufacturer ?? "");
    setDeviceEntityId(device?.entityId ?? "");
    setPlacingDeviceId(null);
    setPlacingRoomId(null);
    setConfirmDeviceDeleteId(null);
    setSelectedId(device?.id ?? null);
    setDeviceError("");
  }
  function saveDevice() {
    const name = deviceName.trim();
    if (!name) { setDeviceError("Ange ett namn för enheten."); return; }
    if (!rooms.some(room => room.id === deviceRoomId)) { setDeviceError("Välj ett befintligt rum."); return; }
    if (!deviceType) { setDeviceError("Välj en enhetstyp."); return; }
    const patch = { name, type: deviceType, roomId: deviceRoomId, manufacturer: deviceManufacturer.trim(), entityId: deviceEntityId.trim() };
    if (editingDeviceId === "new") {
      const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `enhet-${Date.now()}`;
      const room = rooms.find(room => room.id === deviceRoomId)!;
      const device: Device = { id, ...patch, x: room.x, z: room.z };
      if (persistDevices([...devices, device])) {
        setEditingDeviceId(null);
        setSelectedId(id);
        setPlacingDeviceId(id);
        setView("2d");
      }
    } else if (editingDeviceId) {
      if (persistDevices(devices.map(device => device.id === editingDeviceId ? { ...device, ...patch } : device))) {
        setSelectedId(editingDeviceId);
        setEditingDeviceId(null);
      }
    }
  }
  function placeDevice(x: number, z: number) {
    if (!placingDeviceId) return;
    const next = devices.map(device => device.id === placingDeviceId ? { ...device, x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100 } : device);
    if (persistDevices(next)) { setSelectedId(placingDeviceId); setPlacingDeviceId(null); }
  }
  function deleteDevice(id: string) {
    if (!persistDevices(devices.filter(device => device.id !== id))) return;
    setConfirmDeviceDeleteId(null);
    if (selectedId === id) setSelectedId(null);
    if (placingDeviceId === id) setPlacingDeviceId(null);
    if (editingDeviceId === id) setEditingDeviceId(null);
    const nextSecurity = { ...securityStates };
    delete nextSecurity[id];
    setSecurityStates(nextSecurity);
    try { localStorage.setItem(SECURITY_STATES, JSON.stringify(nextSecurity)); } catch { /* Lokal lagring kan vara blockerad */ }
    // Behåll tidigare händelser som historik, även om enheten tagits bort.
    // Rensa inte sceners sparade inställningar för andra enheter.
    const nextLights = { ...lights };
    delete nextLights[id];
    setLights(nextLights);
    try { localStorage.setItem(LIGHTS, JSON.stringify(nextLights)); } catch { /* Lagring kan vara blockerad */ }
    const nextMedia = { ...mediaStates };
    delete nextMedia[id];
    setMediaStates(nextMedia);
    try { localStorage.setItem(MEDIA_STATES, JSON.stringify(nextMedia)); } catch { /* Lagring kan vara blockerad */ }
  }
  function persistRooms(next: Room[]) {
    try {
      localStorage.setItem(ROOMS, JSON.stringify(next));
      setRooms(next);
      setRoomError("");
      return true;
    } catch {
      setRoomError("Kunde inte spara rummen i webbläsaren.");
      return false;
    }
  }
  function editRoom(room?: Room) {
    setEditingRoomId(room?.id ?? "new");
    setRoomName(room?.name ?? "");
    setRoomArea(room?.area ?? "");
    setRoomNotes(room?.notes ?? "");
    setSelectedRoomId(room?.id ?? null);
    setPlacingRoomId(null);
    setPlacingDeviceId(null);
    setConfirmDeleteId(null);
    setRoomError("");
  }
  function saveRoom() {
    const name = roomName.trim();
    if (!name) { setRoomError("Ange ett namn för rummet."); return; }
    const area = roomArea.trim().replace(",", ".");
    if (area && (!Number.isFinite(Number(area)) || Number(area) <= 0)) {
      setRoomError("Ytan måste vara ett positivt tal."); return;
    }
    if (editingRoomId === "new") {
      const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `rum-${Date.now()}`;
      const room: Room = { id, name, x: 0, z: 0, area: area || undefined, notes: roomNotes.trim() };
      if (persistRooms([...rooms, room])) {
        setEditingRoomId(null);
        setSelectedRoomId(id);
        setPlacingRoomId(id);
        setView("2d");
      }
    } else {
      const next = rooms.map(room => room.id === editingRoomId ? { ...room, name, area: area || undefined, notes: roomNotes.trim() } : room);
      if (persistRooms(next)) { setEditingRoomId(null); setSelectedRoomId(editingRoomId); }
    }
  }
  function placeRoom(x: number, z: number) {
    if (!placingRoomId) return;
    const next = rooms.map(room => room.id === placingRoomId ? { ...room, x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100 } : room);
    if (persistRooms(next)) { setSelectedRoomId(placingRoomId); setPlacingRoomId(null); }
  }
  function deleteRoom(id: string) {
    if (devices.some(device => device.roomId === id)) {
      setRoomError("Rummet har kopplade enheter och kan inte tas bort. Flytta eller ta bort enheterna först.");
      setConfirmDeleteId(null);
      return;
    }
    if (persistRooms(rooms.filter(room => room.id !== id))) {
      setConfirmDeleteId(null);
      if (selectedRoomId === id) setSelectedRoomId(null);
      if (placingRoomId === id) setPlacingRoomId(null);
      if (editingRoomId === id) setEditingRoomId(null);
    }
  }
  const panel = "rounded-2xl border border-white/10 bg-slate-900/80 p-4 sm:p-6";
  return <div className={`${embedded ? "w-full min-w-0" : "min-h-screen lg:flex"} bg-[#0b1220] text-slate-100`}>
    {!embedded && mobileMenu && <button aria-label="Stäng meny" className="fixed inset-0 z-30 bg-black/70 lg:hidden" onClick={() => setMobileMenu(false)} />}
    {!embedded && <aside className={`fixed inset-y-0 left-0 z-40 w-60 border-r border-white/10 bg-[#111d30] p-4 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${mobileMenu ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="mb-7 flex items-center justify-between px-2 pt-3"><div><div className="text-xl font-bold">Smarthem</div><div className="mt-1 text-[10px] font-semibold tracking-[.22em] text-cyan-300">KONTROLLCENTER</div></div><button className="lg:hidden" onClick={() => setMobileMenu(false)} aria-label="Stäng meny"><X size={20} /></button></div>
      <nav className="space-y-1" aria-label="Smarthem meny">{menu.map(item => { const Icon = item.icon; return <button key={item.name} onClick={() => choose(item.name)} aria-current={currentCategory === item.name ? "page" : undefined} className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-medium transition ${currentCategory === item.name ? "bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-400/20" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}><Icon size={19} />{item.name}</button>; })}</nav>
      <p className="mt-10 px-3 text-xs leading-5 text-slate-400">Fristående förhandsversion. Styrning är endast demo.</p>
    </aside>}
    <main className={embedded ? "min-w-0 w-full p-0" : "min-w-0 flex-1 p-3 sm:p-6 xl:p-9"}>
      <header className="mb-5 flex items-center gap-3"><button onClick={() => setMobileMenu(true)} className={`${embedded ? "hidden" : ""} rounded-lg border border-white/15 bg-slate-800 p-2 lg:hidden`} aria-label="Öppna meny"><Menu size={21} /></button><div className="min-w-0 flex-1"><h1 className="text-2xl font-bold sm:text-3xl">{currentCategory}</h1><p className="mt-1 text-xs text-slate-400">Din bostad – 2D och 3D</p></div><span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-200">Demoläge</span></header>
      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(220px,260px)] 2xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
      <section className={`${panel} mb-5`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Interaktiv planritning</h2><p className="text-xs text-slate-400">{currentCategory === "Smarthem" ? "Välj kategori för att visa enhetsmarkörer" : currentCategory === "Administration" ? (placingRoomId || placingDeviceId ? "Klicka i 2D-planritningen för att placera markören" : "Välj ett rum eller en enhet för att markera eller flytta") : `${visible.length} enheter i kategorin ${currentCategory.toLowerCase()}`}</p></div><div className="flex gap-2"><button onClick={() => setView("2d")} aria-pressed={view === "2d"} className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm ${view === "2d" ? "bg-cyan-700 text-white" : "bg-slate-800 text-slate-300"}`}><Map size={16}/>2D</button><button onClick={() => setView("3d")} aria-pressed={view === "3d"} className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm ${view === "3d" ? "bg-cyan-700 text-white" : "bg-slate-800 text-slate-300"}`}><Box size={16}/>3D</button><button onClick={() => setReset(n => n + 1)} title="Återställ vy" aria-label="Återställ vy" className="rounded-lg bg-slate-800 px-3 py-2"><RotateCcw size={16}/></button></div></div>
        <ApartmentModel view={view} rooms={rooms} devices={visible} lights={lights} securityStates={securityStates} selectedId={selectedId} onSelect={(id) => { setSelectedId(id); if (currentCategory === "Administration") { setPlacingDeviceId(null); setPlacingRoomId(null); } }} onClearSelection={() => setSelectedId(null)} reset={reset} selectedRoomId={currentCategory === "Administration" ? selectedRoomId : null} onSelectRoom={currentCategory === "Administration" ? (id) => { setSelectedRoomId(id); setPlacingRoomId(null); setPlacingDeviceId(null); } : undefined} placingRoom={currentCategory === "Administration" && !!placingRoomId && view === "2d"} onPlaceRoom={placeRoom} placingDevice={currentCategory === "Administration" && !!placingDeviceId && view === "2d"} onPlaceDevice={placeDevice}/>
        <p className="mt-3 text-xs text-slate-400">Modellen läses från /public/hemmet3d/. Röd markör = rum, gul/grå = lampa, blå = annan enhet. Dra för att navigera och zooma med mus eller fingrar. Vid placering: klicka i 2D-vyn.</p>
      </section>
      <section className={panel} aria-live="polite"><h2 className="mb-4 text-lg font-semibold">{currentCategory === "Smarthem" ? "Hemöversikt" : category}</h2>
        {!loaded && <p className="text-sm text-slate-400">Läser sparade enheter…</p>}
        {loaded && currentCategory === "Smarthem" && <div className="space-y-2 text-sm text-slate-300"><p>{rooms.length} rum och {devices.length} registrerade enheter hittades i denna webbläsare.</p><p>Välj en kategori i menyn. Planritningen ligger kvar överst och visar bara den kategorins enheter.</p><p className="text-xs text-slate-400">Enheter och rum är lokalt sparade i webbläsaren, inte hämtade från Home Assistant.</p></div>}
        {loaded && currentCategory === "Belysning" && <div className="space-y-5">
           <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/15 bg-amber-400/5 p-4">
             <div><div className="flex items-center gap-2 font-semibold"><Lightbulb size={18} className="text-amber-300" />{onCount} av {lightDevices.length} lampor tända</div><p className="mt-1 text-xs text-slate-400">Endast lokal teststyrning – inga fysiska lampor påverkas</p></div>
             <div className="flex flex-wrap gap-2"><button type="button" disabled={!lightDevices.length} onClick={() => setAll(true)} className="min-h-10 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40">Tänd alla</button><button type="button" disabled={!lightDevices.length} onClick={() => setAll(false)} className="min-h-10 rounded-lg bg-slate-700 px-4 py-2 text-sm disabled:opacity-40">Släck alla</button></div>
           </div>
           {selected && <section className="rounded-xl border border-cyan-400/40 bg-cyan-400/5 p-4" aria-label="Vald enhet">
             <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">Vald i planritningen</p><h3 className="mt-1 font-semibold">{selected.name}</h3><p className="text-xs text-slate-400">{rooms.find(room => room.id === selected.roomId)?.name ?? "Utan rum"}</p></div><button type="button" onClick={() => setSelectedId(null)} aria-label="Stäng vald enhet" className="rounded-lg border border-white/15 p-2"><X size={16}/></button></div>
             {selected.type === "light" && (() => { const state = lights[selected.id] ?? {on:false,brightness:65}; return <div className="mt-4 flex flex-wrap items-center gap-4"><button type="button" aria-pressed={state.on} onClick={() => changeLight(selected.id,{on:!state.on})} className={`min-h-10 rounded-lg px-4 py-2 text-sm font-semibold ${state.on ? "bg-amber-400 text-slate-950" : "bg-slate-700"}`}>{state.on ? "Släck" : "Tänd"}</button><label className="min-w-44 flex-1 text-xs text-slate-300"><span className="mb-2 flex justify-between"><span>Ljusstyrka</span><span>{state.brightness} %</span></span><input type="range" min={1} max={100} value={state.brightness} disabled={!state.on} onChange={event => changeLight(selected.id,{brightness:Number(event.target.value)})} className="w-full accent-amber-400 disabled:opacity-40" /></label></div>; })()}
           </section>}
           {lightDevices.length === 0 ? <p className="text-sm text-slate-400">Inga lampor registrerade i denna webbläsare.</p> : <div className="space-y-4">{Array.from(new Set(lightDevices.map(device => device.roomId || ""))).map(roomId => { const room = rooms.find(item => item.id === roomId); const group = lightDevices.filter(device => (device.roomId || "") === roomId); const groupOn = group.filter(device => lights[device.id]?.on).length; return <section key={roomId || "unassigned"} className="rounded-xl border border-white/10 bg-slate-800/30 p-3 sm:p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{room?.name ?? "Utan rum"} <span className="ml-1 text-xs font-normal text-slate-400">{groupOn}/{group.length} tända</span></h3><div className="flex gap-2"><button type="button" onClick={() => {setActiveSceneId(null);group.forEach(device => changeLight(device.id,{on:true}));}} className="rounded-lg border border-amber-400/30 px-3 py-1.5 text-xs text-amber-200">Tänd rummet</button><button type="button" onClick={() => {setActiveSceneId(null);group.forEach(device => changeLight(device.id,{on:false}));}} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs">Släck rummet</button></div></div><div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">{group.map(device => { const state = lights[device.id] ?? {on:false,brightness:65}; return <article key={device.id} className={`rounded-xl border p-3 ${selectedId === device.id ? "border-amber-400/60 bg-amber-400/5" : "border-white/10 bg-slate-900/70"}`}><div className="flex items-center justify-between gap-2"><button type="button" onClick={() => setSelectedId(device.id)} className="min-w-0 truncate text-left text-sm font-medium"><Lightbulb size={16} className={`mr-2 inline ${state.on ? "text-amber-300" : "text-slate-500"}`}/>{device.name}</button><button type="button" aria-pressed={state.on} onClick={() => changeLight(device.id,{on:!state.on})} className={`min-h-9 rounded-lg px-3 text-xs font-semibold ${state.on ? "bg-amber-400 text-slate-950" : "bg-slate-700"}`}>{state.on ? "Tänd" : "Släckt"}</button></div><label className="mt-4 block text-xs text-slate-300"><span className="mb-1 flex justify-between"><span>Ljusstyrka</span><span>{state.brightness} %</span></span><input className="w-full accent-amber-400 disabled:opacity-40" type="range" min={1} max={100} value={state.brightness} disabled={!state.on} onChange={event => changeLight(device.id,{brightness:Number(event.target.value)})}/></label></article>;})}</div></section>; })}</div>}
           <section className="rounded-xl border border-white/10 bg-slate-800/40 p-4"><h3 className="mb-1 font-semibold">Ljusscener</h3><p className="mb-3 text-xs text-slate-400">Återanvänder scenerna från gamla Smarthem. Endast demo.</p>{scenes.length ? <div className="flex flex-wrap gap-2">{scenes.map(scene => <button type="button" key={scene.id} onClick={() => activateScene(scene)} aria-pressed={activeSceneId === scene.id} className={`min-h-10 rounded-lg border px-4 py-2 text-sm ${activeSceneId === scene.id ? "border-amber-400 bg-amber-400/15 text-amber-100" : "border-white/15 bg-slate-900 hover:bg-slate-700"}`}>{scene.name}</button>)}</div> : <p className="text-sm text-slate-400">Inga sparade ljusscener ännu.</p>}</section>
         </div>}
        {loaded && currentCategory === "Administration" && <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="font-semibold">Rum och rumsinformation</h3><p className="mt-1 text-xs text-slate-400">Sparas i samma lokala rumregister som tidigare Smarthem.</p></div>
            <button type="button" onClick={() => editRoom()} className="flex min-h-10 items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold hover:bg-cyan-600"><Plus size={16}/> Lägg till rum</button>
          </div>
          {roomError && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{roomError}</p>}
          {placingRoomId && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-3 text-sm text-cyan-100"><span><MapPin size={16} className="mr-2 inline"/>Klicka i 2D-planritningen för att placera <strong>{rooms.find(room => room.id === placingRoomId)?.name}</strong>.</span><button type="button" className="rounded-lg bg-slate-700 px-3 py-2" onClick={() => setPlacingRoomId(null)}>Avbryt placering</button></div>}
          {editingRoomId && <div className="space-y-3 rounded-xl border border-cyan-400/30 bg-slate-800/70 p-4">
            <h3 className="font-semibold">{editingRoomId === "new" ? "Nytt rum" : "Redigera rum"}</h3>
            <label className="block text-sm">Namn<input autoFocus maxLength={80} value={roomName} onChange={event => setRoomName(event.target.value)} placeholder="Exempel: Vardagsrum" className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 p-2.5 outline-none focus:border-cyan-400"/></label>
            <label className="block text-sm">Yta i m² (valfritt)<input inputMode="decimal" value={roomArea} onChange={event => setRoomArea(event.target.value)} placeholder="Exempel: 24,5" className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 p-2.5 outline-none focus:border-cyan-400"/></label>
            <label className="block text-sm">Anteckningar (valfritt)<textarea rows={3} maxLength={1000} value={roomNotes} onChange={event => setRoomNotes(event.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 p-2.5 outline-none focus:border-cyan-400"/></label>
            <div className="flex flex-wrap gap-2"><button type="button" onClick={saveRoom} className="flex min-h-10 items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold"><Save size={16}/> Spara rum</button><button type="button" onClick={() => {setEditingRoomId(null);setRoomError("");}} className="rounded-lg bg-slate-700 px-4 py-2 text-sm">Avbryt</button></div>
          </div>}
          {rooms.length === 0 && <p className="rounded-xl border border-white/10 bg-slate-800/40 p-4 text-sm text-slate-400">Inga rum registrerade ännu. Lägg till ditt första rum.</p>}
          <div className="grid gap-3 md:grid-cols-2">{rooms.map(room => {const linked = devices.filter(device => device.roomId === room.id).length;return <article key={room.id} className={`rounded-xl border p-4 ${selectedRoomId === room.id ? "border-red-400/60 bg-red-400/5" : "border-white/10 bg-slate-800/50"}`}>
            <button type="button" onClick={() => {setSelectedRoomId(room.id);setPlacingRoomId(null);}} className="flex w-full items-start gap-2 text-left"><MapPin size={18} className="mt-0.5 shrink-0 text-red-400"/><span className="min-w-0"><strong className="block truncate">{room.name}</strong><span className="text-xs text-slate-400">{room.area ? `${room.area} m² · ` : ""}{linked} kopplade enheter</span></span></button>
            {room.notes && <p className="mt-2 text-xs text-slate-400">{room.notes}</p>}
            <p className="mt-2 text-xs text-slate-500">Position: {room.x.toFixed(2)}, {room.z.toFixed(2)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => editRoom(room)} className="flex items-center gap-1 rounded-lg bg-slate-700 px-3 py-2 text-xs"><Pencil size={14}/> Redigera</button>
              <button type="button" onClick={() => {setView("2d");setSelectedRoomId(room.id);setPlacingRoomId(room.id);setPlacingDeviceId(null);setEditingRoomId(null);}} className="flex items-center gap-1 rounded-lg bg-cyan-700/30 px-3 py-2 text-xs text-cyan-200"><MapPin size={14}/> Flytta markör</button>
              <button type="button" onClick={() => {setConfirmDeleteId(room.id);setRoomError("");}} className="flex items-center gap-1 rounded-lg border border-rose-500/20 px-3 py-2 text-xs text-rose-200"><Trash2 size={14}/> Ta bort</button>
            </div>
            {confirmDeleteId === room.id && <div className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-xs"><p>{linked ? `Rummet har ${linked} kopplade enheter och kan inte tas bort.` : `Vill du ta bort ${room.name}?`}</p><div className="mt-2 flex gap-2"><button type="button" disabled={linked > 0} onClick={() => deleteRoom(room.id)} className="rounded bg-rose-700 px-3 py-2 disabled:opacity-40">Bekräfta borttagning</button><button type="button" onClick={() => setConfirmDeleteId(null)} className="rounded bg-slate-700 px-3 py-2">Avbryt</button></div></div>}
          </article>;})}</div>
          <p className="text-xs text-slate-400">Markörerna är klickbara i både 2D och 3D. Placering och flytt görs i 2D för bättre precision. Rum med kopplade enheter skyddas från borttagning.</p>
          <section className="space-y-4 border-t border-white/10 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h3 className="font-semibold">Smarta enheter</h3><p className="mt-1 text-xs text-slate-400">Hantera belysning, media, övervakning, el och klimat på samma ställe.</p></div>
              <button type="button" onClick={() => editDevice()} className="flex min-h-10 items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold hover:bg-cyan-600"><Plus size={16}/> Lägg till enhet</button>
            </div>
            {deviceError && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{deviceError}</p>}
            {placingDeviceId && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-3 text-sm text-cyan-100">
              <span><MapPin size={16} className="mr-2 inline"/>Klicka i 2D-planritningen för att placera <strong>{devices.find(device => device.id === placingDeviceId)?.name}</strong>.</span>
              <button type="button" className="rounded-lg bg-slate-700 px-3 py-2" onClick={() => setPlacingDeviceId(null)}>Avbryt placering</button>
            </div>}
            {editingDeviceId && <div className="space-y-3 rounded-xl border border-cyan-400/30 bg-slate-800/70 p-4">
              <h4 className="font-semibold">{editingDeviceId === "new" ? "Ny smart enhet" : "Redigera smart enhet"}</h4>
              <label className="block text-sm">Namn<input maxLength={80} value={deviceName} onChange={event => setDeviceName(event.target.value)} placeholder="Exempel: Google Nest Vardagsrum" className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 p-2.5 outline-none focus:border-cyan-400"/></label>
              <label className="block text-sm">Typ av enhet
                <select value={deviceType} onChange={event => setDeviceType(event.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 p-2.5">
                  {!DEVICE_TYPES.some(item => item.value === deviceType) && <option value={deviceType}>Befintlig typ: {deviceType}</option>}
                  {DEVICE_TYPES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label className="block text-sm">Rum
                <select value={deviceRoomId} onChange={event => setDeviceRoomId(event.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 p-2.5">
                  {rooms.length === 0 && <option value="">Lägg till ett rum först</option>}
                  {rooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}
                </select>
              </label>
              <label className="block text-sm">Tillverkare (valfritt)<input maxLength={100} value={deviceManufacturer} onChange={event => setDeviceManufacturer(event.target.value)} placeholder="IKEA, Google, Philips…" className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 p-2.5"/></label>
              <label className="block text-sm">Home Assistant Entity ID (valfritt)<input maxLength={200} value={deviceEntityId} onChange={event => setDeviceEntityId(event.target.value)} placeholder="light.vardagsrum" className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 p-2.5"/></label>
              <div className="flex flex-wrap gap-2"><button type="button" onClick={saveDevice} className="flex min-h-10 items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold"><Save size={16}/> Spara enhet</button><button type="button" onClick={() => {setEditingDeviceId(null);setDeviceError("");}} className="rounded-lg bg-slate-700 px-4 py-2 text-sm">Avbryt</button></div>
              <p className="text-xs text-slate-400">När en ny enhet sparas får du placera den i 2D-planritningen.</p>
            </div>}
            {devices.length === 0 && <p className="rounded-xl border border-white/10 bg-slate-800/40 p-4 text-sm text-slate-400">Inga enheter registrerade. Lägg till din första smarta enhet.</p>}
            <div className="grid gap-3 md:grid-cols-2">{devices.map(device => {
              const selectedDevice = selectedId === device.id;
              return <article key={device.id} className={`rounded-xl border p-4 ${selectedDevice ? "border-cyan-400/60 bg-cyan-400/5" : "border-white/10 bg-slate-800/50"}`}>
                <button type="button" onClick={() => {setSelectedId(device.id);setPlacingDeviceId(null);}} className="flex w-full items-start gap-2 text-left">
                  <Zap size={18} className="mt-0.5 shrink-0 text-cyan-300"/>
                  <span className="min-w-0"><strong className="block truncate">{device.name}</strong><span className="text-xs text-slate-400">{categoryOf(device.type) ?? "Annan"} · {rooms.find(room => room.id === device.roomId)?.name ?? "Utan rum"} · {device.type}</span></span>
                </button>
                {device.manufacturer && <p className="mt-2 text-xs text-slate-400">Tillverkare: {device.manufacturer}</p>}
                {device.entityId && <p className="mt-1 break-all text-xs text-slate-400">Entity ID: {device.entityId}</p>}
                <p className="mt-2 text-xs text-slate-500">Position: {device.x.toFixed(2)}, {device.z.toFixed(2)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => editDevice(device)} className="flex items-center gap-1 rounded-lg bg-slate-700 px-3 py-2 text-xs"><Pencil size={14}/> Redigera</button>
                  <button type="button" onClick={() => {setView("2d");setSelectedId(device.id);setPlacingDeviceId(device.id);setPlacingRoomId(null);setEditingDeviceId(null);}} className="flex items-center gap-1 rounded-lg bg-cyan-700/30 px-3 py-2 text-xs text-cyan-200"><MapPin size={14}/> Flytta markör</button>
                  <button type="button" onClick={() => {setConfirmDeviceDeleteId(device.id);setDeviceError("");}} className="flex items-center gap-1 rounded-lg border border-rose-500/20 px-3 py-2 text-xs text-rose-200"><Trash2 size={14}/> Ta bort</button>
                </div>
                {confirmDeviceDeleteId === device.id && <div className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-xs"><p>Vill du ta bort {device.name}? Enheten försvinner från alla kategorier.</p><div className="mt-2 flex gap-2"><button type="button" onClick={() => deleteDevice(device.id)} className="rounded bg-rose-700 px-3 py-2">Bekräfta borttagning</button><button type="button" onClick={() => setConfirmDeviceDeleteId(null)} className="rounded bg-slate-700 px-3 py-2">Avbryt</button></div></div>}
              </article>;
            })}</div>
            <p className="text-xs text-slate-400">Alla enheter sparas i samma lokala register som tidigare Smarthem. Kontrollerna är fortfarande i demoläge.</p>
          </section>
        </div>}
        {loaded && currentCategory === "El" && <div className="space-y-3 text-sm text-slate-300"><p>Aktuella spotpriser för SE3 visas i informationspanelen till höger.</p><p className="rounded-xl border border-white/10 bg-slate-800/50 p-4 text-slate-400">Elpriserna hämtas från dashboardens befintliga elprisfunktion. Förbrukning kräver fortfarande en mätkälla.</p>{visible.length > 0 && <p>{visible.length} registrerade elrelaterade enheter.</p>}</div>}
        {loaded && currentCategory === "Media" && <div className="space-y-5">
          <p className="text-xs text-slate-400">Uppspelning och volym är endast lokala demovärden. Inga riktiga högtalare eller TV-apparater styrs.</p>
          {visible.length === 0 && <div className="rounded-xl border border-white/10 bg-slate-800/50 p-5 text-sm text-slate-300">Inga medieenheter registrerade i denna webbläsare. Registrerade enheter av typen media, speaker, tv eller media_player visas här automatiskt.</div>}
          {rooms.concat([{id:"__other__",name:"Utan rum",x:0,z:0}]).map(room => {
            const roomDevices = visible.filter(device => room.id === "__other__" ? !rooms.some(r => r.id === device.roomId) : device.roomId === room.id);
            if (!roomDevices.length) return null;
            return <section key={room.id} className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-200"><Speaker size={16} className="text-cyan-300"/>{room.name} <span className="text-xs font-normal text-slate-400">({roomDevices.length})</span></h3>
              <div className="grid gap-3 lg:grid-cols-2">{roomDevices.map(device => {
                const state = mediaStates[device.id] ?? defaultMediaState;
                const selectedMedia = selectedId === device.id;
                return <article key={device.id} className={`rounded-xl border p-4 ${selectedMedia ? "border-cyan-400/70 bg-cyan-400/5" : "border-white/10 bg-slate-800/60"}`}>
                  <button type="button" onClick={() => setSelectedId(device.id)} aria-pressed={selectedMedia} className="flex w-full items-center gap-3 text-left">
                    <span className="rounded-lg bg-slate-700 p-2 text-cyan-200">{device.type.toLowerCase() === "tv" ? <Tv size={20}/> : <Speaker size={20}/>}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{device.name}</span><span className="text-xs text-slate-400">{state.playing ? "Spelar – demo" : "Stoppad – demo"}</span></span>
                    <span className="text-xs text-cyan-200">{selectedMedia ? "Vald" : "Välj"}</span>
                  </button>
                  {selectedMedia && <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button type="button" onClick={() => changeMedia(device.id, { playing: !state.playing })} className="flex min-h-10 items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold hover:bg-cyan-600">{state.playing ? <Pause size={16}/> : <Play size={16}/>} {state.playing ? "Pausa" : "Spela"}</button>
                      <button type="button" onClick={() => changeMedia(device.id, { playing: false })} className="flex min-h-10 items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm"><Square size={14}/> Stoppa</button>
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="button" aria-label={state.muted ? "Slå på ljud" : "Stäng av ljud"} onClick={() => changeMedia(device.id, { muted: !state.muted })} className="rounded-lg bg-slate-700 p-2">{state.muted || state.volume === 0 ? <VolumeX size={18}/> : <Volume2 size={18}/>}</button>
                      <label className="min-w-0 flex-1 text-xs text-slate-300"><span className="mb-1 flex justify-between"><span>Volym</span><span>{state.muted ? "Tyst" : `${state.volume}%`}</span></span><input aria-label={`Volym för ${device.name}`} type="range" min="0" max="100" value={state.volume} onChange={event => changeMedia(device.id, { volume: Number(event.target.value), muted: false })} className="w-full accent-cyan-400"/></label>
                    </div>
                    <p className="text-xs text-slate-500">Simulerad kontroll. Ingen anslutning till Google Cast eller Home Assistant.</p>
                  </div>}
                </article>;
              })}</div>
            </section>;
          })}
          {selected && <p className="text-xs text-cyan-200">Vald i planritningen: {selected.name}. Välj en annan markör eller enhet för att byta kontrollpanel.</p>}
        </div>}
        {loaded && currentCategory === "Övervakning" && <div className="space-y-5">
          <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-100">Endast demo: värdena simuleras manuellt. Ingen verklig kamera, dörrsensor, larm eller låsenhet är ansluten. Använd inte panelen för faktisk säkerhetsövervakning.</p>
          {visible.length === 0 && <p className="rounded-xl border border-white/10 bg-slate-800/50 p-4 text-sm text-slate-300">Inga övervakningsenheter registrerade. Lägg till en kamera, sensor, ett lås eller larm under Administration.</p>}
          {Array.from(new Set(visible.map(device => device.roomId))).map(roomId => {
            const room = rooms.find(item => item.id === roomId);
            return <section key={roomId || "utan-rum"} className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-200">{room?.name ?? "Utan rum"}</h3>
              <div className="grid gap-3 md:grid-cols-2">{visible.filter(device => device.roomId === roomId).map(device => {
                const active = securityStates[device.id]?.active ?? false;
                const type = device.type.toLowerCase();
                const status = type === "lock" ? (active ? "Upplåst (demo)" : "Låst (demo)") : type === "motion" ? (active ? "Rörelse upptäckt (demo)" : "Ingen rörelse (demo)") : type === "camera" ? (active ? "Aktiv (demo)" : "Inaktiv (demo)") : type === "alarm" ? (active ? "Aktiverat (demo)" : "Avaktiverat (demo)") : (active ? "Öppen / aktiv (demo)" : "Stängd / inaktiv (demo)");
                return <article key={device.id} className={`rounded-xl border p-4 ${selectedId === device.id ? "border-cyan-400/70 bg-cyan-400/5" : "border-white/10 bg-slate-800/50"}`}>
                  <button type="button" onClick={() => setSelectedId(device.id)} aria-pressed={selectedId === device.id} className="flex w-full items-center gap-2 text-left"><Shield size={18} className="shrink-0 text-cyan-300"/><span className="min-w-0 flex-1 truncate font-medium">{device.name}</span><span className="text-xs text-cyan-200">{selectedId === device.id ? "Vald" : "Välj"}</span></button>
                  {type === "lock" ? <div role="status" aria-live="polite" className={`mt-3 flex items-center gap-3 rounded-xl border px-4 py-3 ${active ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-200" : "border-red-400/50 bg-red-500/15 text-red-200"}`}>
                    {active ? <UnlockKeyhole size={24} className="shrink-0"/> : <LockKeyhole size={24} className="shrink-0"/>}
                    <span className="text-base font-bold">{active ? "OLÅST" : "LÅST"}</span>
                    <span className="ml-auto text-xs font-medium">DEMO</span>
                  </div> : <p className="mt-2 text-xs text-slate-300" aria-live="polite">{status}</p>}
                  {selectedId === device.id && <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                    <button type="button" aria-pressed={!active} onClick={() => changeSecurity(device, false)} className={`rounded-lg px-3 py-2 text-xs ${!active ? (type === "lock" ? "bg-red-700 text-white" : "bg-cyan-700 text-white") : "bg-slate-700 text-slate-200"}`}>{type === "lock" ? "Lås" : type === "motion" ? "Ingen rörelse" : type === "camera" || type === "alarm" ? "Inaktivera" : "Stäng / återställ"}</button>
                    <button type="button" aria-pressed={active} onClick={() => changeSecurity(device, true)} className={`rounded-lg px-3 py-2 text-xs ${active ? (type === "lock" ? "bg-emerald-700 text-white" : "bg-cyan-700 text-white") : "bg-slate-700 text-slate-200"}`}>{type === "lock" ? "Lås upp" : type === "motion" ? "Simulera rörelse" : type === "camera" || type === "alarm" ? "Aktivera" : "Öppna / aktivera"}</button>
                  </div>}
                </article>;
              })}</div>
            </section>;
          })}
          <section className="space-y-3 border-t border-white/10 pt-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Händelsehistorik (demo)</h3><span className="text-xs text-slate-400">Senaste 100 händelserna</span></div>
            {securityEvents.length === 0 ? <p className="text-sm text-slate-400">Inga simulerade händelser ännu.</p> : <ol className="max-h-72 space-y-2 overflow-y-auto">{securityEvents.map(event => <li key={event.id} className="rounded-lg border border-white/10 bg-slate-800/40 p-3 text-sm"><span className="block text-xs text-slate-400">{new Date(event.timestamp).toLocaleString("sv-SE")}</span>{event.message}</li>)}</ol>}
            {securityEvents.length > 0 && <button type="button" onClick={() => { if (!window.confirm("Vill du radera den lokala demohistoriken?")) return; setSecurityEvents([]); try { localStorage.removeItem(SECURITY_EVENTS); } catch { /* Lokal lagring kan vara blockerad */ } }} className="rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-300">Rensa historik</button>}
          </section>
        </div>}
        {loaded && currentCategory === "Klimat" && <div className="space-y-5">
          <p className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-100">Demoläge: Temperatur och luftfuktighet är manuellt simulerade värden, inte verkliga mätningar. Termostatstyrningen påverkar ingen fysisk enhet.</p>
          {visible.length === 0 && <p className="rounded-xl border border-white/10 bg-slate-800/50 p-4 text-sm text-slate-300">Inga klimatenheter registrerade. Lägg till termostat, temperatursensor eller fuktsensor under Administration.</p>}
          {rooms.concat([{id:"__other__",name:"Utan rum",x:0,z:0}]).map(room => {
            const group = visible.filter(device => room.id === "__other__" ? !rooms.some(r => r.id === device.roomId) : device.roomId === room.id);
            if (!group.length) return null;
            return <section key={room.id} className="space-y-3"><h3 className="flex items-center gap-2 font-semibold text-slate-200"><Thermometer size={18} className="text-cyan-300"/>{room.name}</h3>
              <div className="grid gap-3 lg:grid-cols-2">{group.map(device => {
                const state = climateStates[device.id] ?? DEFAULT_CLIMATE;
                const history = climateHistory[device.id] ?? [];
                const selectedClimate = selectedId === device.id;
                const kind = device.type.toLowerCase();
                const thermostat = kind === "thermostat" || kind === "climate";
                const tempSensor = thermostat || kind === "temperature";
                const humiditySensor = thermostat || kind === "humidity";
                const chartPoints = history.slice(-20);
                const graph = chartPoints.map((reading,i) => `${chartPoints.length === 1 ? 50 : 5 + i*90/(chartPoints.length-1)},${90-(reading.temperature+10)/70*80}`).join(" ");
                return <article key={device.id} className={`rounded-xl border p-4 ${selectedClimate ? "border-cyan-400/70 bg-cyan-400/5" : "border-white/10 bg-slate-800/60"}`}>
                  <button type="button" onClick={() => setSelectedId(device.id)} className="flex w-full items-center justify-between gap-2 text-left"><span className="font-semibold">{device.name}</span><span className="text-xs text-cyan-200">{selectedClimate ? "Vald" : "Visa kontroller"}</span></button>
                  <p className="mt-1 text-xs text-slate-400">{thermostat ? "Termostat" : kind === "humidity" ? "Fuktsensor" : "Temperatursensor"} · Simulerat</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">{(tempSensor || kind === "temperature") && <div className="rounded-lg bg-slate-950/50 p-3"><p className="text-xs text-slate-400">Temperatur</p><p className="mt-1 text-xl font-semibold">{formatNumber(state.temperature,1)} °C</p></div>}{(humiditySensor || kind === "humidity") && <div className="rounded-lg bg-slate-950/50 p-3"><p className="text-xs text-slate-400">Luftfuktighet</p><p className="mt-1 text-xl font-semibold">{formatNumber(state.humidity)} %</p></div>}</div>
                  {selectedClimate && <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
                    {thermostat && <div><p className="mb-2 text-sm text-slate-200">Önskad temperatur</p><div className="flex items-center justify-center gap-3"><button type="button" aria-label="Sänk måltemperatur" onClick={() => changeClimate(device.id,{target:Math.max(16,Math.round((state.target-.5)*2)/2)})} className="rounded-lg bg-slate-700 px-4 py-2 text-xl">−</button><span className="min-w-24 text-center text-2xl font-semibold text-cyan-200">{formatNumber(state.target,1)} °C</span><button type="button" aria-label="Höj måltemperatur" onClick={() => changeClimate(device.id,{target:Math.min(30,Math.round((state.target+.5)*2)/2)})} className="rounded-lg bg-slate-700 px-4 py-2 text-xl">+</button></div><input type="range" min="16" max="30" step="0.5" aria-label={`Önskad temperatur för ${device.name}`} value={state.target} onChange={event => changeClimate(device.id,{target:Number(event.target.value)})} className="mt-3 w-full accent-cyan-400"/></div>}
                    <div className="space-y-3"><p className="text-sm font-semibold">Simulera mätvärde</p>{kind !== "humidity" && <label className="block text-xs text-slate-300">Temperatur: {formatNumber(state.temperature,1)} °C<input type="range" min="-10" max="40" step="0.5" value={state.temperature} onChange={event => changeClimate(device.id,{temperature:Number(event.target.value)})} className="mt-2 w-full accent-cyan-400"/></label>}{kind !== "temperature" && <label className="block text-xs text-slate-300">Luftfuktighet: {formatNumber(state.humidity)} %<input type="range" min="0" max="100" step="1" value={state.humidity} onChange={event => changeClimate(device.id,{humidity:Number(event.target.value)})} className="mt-2 w-full accent-cyan-400"/></label>}<button type="button" onClick={() => changeClimate(device.id,{},true)} className="rounded-lg bg-cyan-700 px-3 py-2 text-xs font-semibold">Spara simulerad mätning i historiken</button></div>
                    <div className="space-y-2"><p className="text-sm font-semibold">Temperaturhistorik <span className="text-xs font-normal text-slate-400">({history.length} mätningar)</span></p>{chartPoints.length > 0 ? <><svg viewBox="0 0 100 100" role="img" aria-label="Temperaturhistorik för enheten" className="h-28 w-full rounded-lg bg-slate-950/50" preserveAspectRatio="none"><line x1="5" y1="90" x2="95" y2="90" stroke="#475569" strokeWidth="0.5"/><polyline fill="none" stroke="#67e8f9" strokeWidth="1.5" points={graph}/>{chartPoints.map((reading,i) => <circle key={`${reading.timestamp}-${i}`} cx={chartPoints.length === 1 ? 50 : 5+i*90/(chartPoints.length-1)} cy={90-(reading.temperature+10)/70*80} r="1.4" fill="#67e8f9"/>)}</svg><p className="text-xs text-slate-400">Senast sparat: {new Date(history[history.length-1].timestamp).toLocaleString("sv-SE")} · {formatNumber(history[history.length-1].temperature,1)} °C</p></> : <p className="text-xs text-slate-400">Ingen historik ännu. Spara en simulerad mätning för att börja.</p>}</div>
                  </div>}
                </article>;
              })}</div>
            </section>;
          })}
        </div>}
      </section>
        </div>
        <aside className="min-w-0 xl:sticky xl:top-5" aria-label="Alltid synlig väder- och elinformation">
      <section aria-label="Aktuellt väder och el" className="grid grid-cols-1 gap-3">
        <article className="min-w-0 rounded-2xl border border-white/10 bg-gradient-to-br from-sky-500/10 via-slate-900 to-slate-900 p-4 sm:p-5">
          <div className="flex items-center gap-2 text-sky-200"><CloudSun size={21} /><h2 className="text-base font-semibold">Aktuellt väder</h2></div>
          <p className="mt-1 text-xs text-slate-400">Göteborg · nu och kommande timmar</p>
          {overview?.weather ? <div className="mt-4 space-y-4">
            <div><div className="text-4xl font-semibold tracking-tight">{formatNumber(overview.weather.temperature)}°</div><div className="mt-1 text-sm text-slate-200">{overview.weather.description}</div><div className="mt-1 text-xs text-slate-400">Känns som {formatNumber(overview.weather.apparentTemperature ?? overview.weather.temperature)}°</div></div>
            <div className="space-y-2 border-t border-white/10 pt-3"><h3 className="text-xs font-semibold text-slate-300">Kommande timmar</h3>{overview.weather.hours.map((hour, index) => <div key={`${hour.time}-${index}`} className="flex items-center justify-between gap-2 text-xs"><span className="text-slate-400">{hour.time}</span><span className="truncate text-slate-300" title={hour.description}>{hour.description}</span><span className="shrink-0 font-semibold">{formatNumber(hour.temperature)}°</span></div>)}</div>
          </div> : <p className="mt-4 rounded-xl border border-white/10 bg-slate-950/35 p-3 text-xs text-slate-300">{overviewLoading ? "Hämtar väder…" : overview?.errors.weather ?? (overviewError ? "Kunde inte nå datatjänsten." : "Väderdata saknas.")}</p>}
        </article>
        <article className="min-w-0 rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900 p-4 sm:p-5">
          <div className="flex items-center gap-2 text-amber-200"><Activity size={21} /><h2 className="text-base font-semibold">El och förbrukning</h2></div>
          <div className="mt-4 grid grid-cols-1 gap-2">
            <div className="rounded-xl border border-white/10 bg-slate-950/35 p-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400"><Zap size={14} /> Aktuellt elpris</div>
              {overview?.electricity ? <><p className="mt-2 text-2xl font-semibold text-amber-100">{overview.electricity.currentOrePerKwh === null ? "Saknas" : `${formatNumber(overview.electricity.currentOrePerKwh, 1)} öre/kWh`}</p><p className="mt-1 text-[11px] text-slate-400">Spotpris {overview.electricity.area}, exkl. skatt, nätavgift och påslag</p><p className="mt-2 text-xs text-slate-300">Dagens snitt: {formatNumber(overview.electricity.averageOrePerKwh, 1)} öre/kWh</p>{overview.electricity.hours.length > 0 && <div className="mt-3 space-y-1 border-t border-white/10 pt-2">{overview.electricity.hours.map((hour, index) => <div key={`${hour.time}-${index}`} className="flex justify-between text-xs"><span className="text-slate-400">{hour.time}</span><span>{formatNumber(hour.orePerKwh, 1)} öre</span></div>)}</div>}</> : <p className="mt-3 text-xs text-slate-300">{overviewLoading ? "Hämtar elpris…" : overview?.errors.electricity ?? (overviewError ? "Kunde inte nå datatjänsten." : "Elpris saknas.")}</p>}
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/35 p-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400"><Activity size={14} /> Elförbrukning</div>
              <p className="mt-3 text-sm font-semibold text-slate-200">Ej tillgänglig</p>
              <p className="mt-1 text-[11px] leading-4 text-slate-400">Kräver mätdata från hemmet</p>
            </div>
          </div>
        </article>
      </section>
          <div className="mt-3 hidden min-h-40 rounded-2xl border border-white/10 bg-slate-900/40 xl:block" aria-hidden="true" />
        </aside>
      </div>
    </main>
  </div>;
}
