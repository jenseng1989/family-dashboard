"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Home, Lightbulb, Tv, Shield, Zap, Thermometer, Menu, RotateCcw, Box, Map, X, CloudSun, Activity, Settings, Plus, Pencil, Trash2, MapPin, Save, Speaker, Play, Pause, Square, Volume2, VolumeX, LockKeyhole, UnlockKeyhole, Search, WandSparkles, Bell, BellOff, AlertTriangle, Star, FolderPlus } from "lucide-react";
import type { Device, LightState, Room } from "@/components/smarthem-preview/ApartmentModel";

const ApartmentModel = dynamic(() => import("@/components/smarthem-preview/ApartmentModel"), { ssr: false, loading: () => <div className="flex h-[440px] items-center justify-center rounded-2xl bg-slate-900 text-slate-300">Laddar bostadsmodellen…</div> });
type Overview = {
  weather: null | { temperature: number; apparentTemperature: number | null; description: string; isDay: boolean; hours: { time: string; temperature: number; precipitationProbability: number; description: string }[] };
  electricity: null | { area: string; currentOrePerKwh: number | null; averageOrePerKwh: number; hours: { time: string; orePerKwh: number }[] };
  errors: { weather: string | null; electricity: string | null };
};
const formatNumber = (value: number, digits = 0) => value.toLocaleString("sv-SE", { minimumFractionDigits: digits, maximumFractionDigits: digits });
type Category = "Översikt" | "Belysning" | "Media" | "Övervakning" | "El" | "Klimat" | "Administration";
const menu = [
  { name: "Översikt", icon: Home }, { name: "Belysning", icon: Lightbulb },
  { name: "Media", icon: Tv }, { name: "Övervakning", icon: Shield },
  { name: "El", icon: Zap }, { name: "Klimat", icon: Thermometer },
  { name: "Administration", icon: Settings },
] as const;
const ROOMS = "family-dashboard:hemmet3d:rooms:v1";
const DEVICES = "family-dashboard:hemmet3d:devices:v1";
// Förberedelse för framtida Home Assistant: inga nätverksanrop eller hemligheter lagras.
const HA_ENTITY_ID = /^[a-z][a-z0-9_]*\.[a-z0-9_]+$/;
function haEntityStatus(value: string | undefined): "missing" | "invalid" | "ready" {
  if (!value?.trim()) return "missing";
  return HA_ENTITY_ID.test(value.trim()) ? "ready" : "invalid";
}
function exportHaMapping(devices: Device[], rooms: Room[]) {
  const payload = {
    schemaVersion: 1,
    purpose: "Home Assistant entity mapping (förberedelse, ingen aktiv anslutning)",
    exportedAt: new Date().toISOString(),
    rooms: rooms.map(room => ({ id: room.id, name: room.name })),
    devices: devices.map(device => ({
      id: device.id, name: device.name, type: device.type, roomId: device.roomId,
      manufacturer: device.manufacturer ?? "", entityId: device.entityId ?? "",
      mappingStatus: haEntityStatus(device.entityId),
    })),
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "smarthem-home-assistant-mappning.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
// Fullständig lokal säkerhetskopia – separat från Home Assistant-mappningen.
const BACKUP_KEYS = [
  "family-dashboard:hemmet3d:rooms:v1",
  "family-dashboard:hemmet3d:devices:v1",
  "family-dashboard:hemmet3d:demo-lights:v1",
  "family-dashboard:hemmet3d:light-scenes:v1",
  "family-dashboard:smarthem-preview:device-prefs:v1",
  "family-dashboard:smarthem-preview:routines:v1",
  "family-dashboard:smarthem-preview:security-states:v1",
  "family-dashboard:smarthem-preview:security-events:v1",
  "family-dashboard:smarthem-preview:climate-states:v1",
  "family-dashboard:smarthem-preview:climate-history:v1",
  "family-dashboard:smarthem-preview:electric-states:v1",
  "family-dashboard:smarthem-preview:electric-history:v1",
  "family-dashboard:smarthem-preview:media-states:v1",
  "family-dashboard:smarthem-preview:alert-settings:v1",
  "family-dashboard:smarthem-preview:alert-dismissed:v1",
] as const;
type BackupPayload = {
  format: "family-dashboard-smarthem-backup";
  schemaVersion: 1;
  exportedAt: string;
  data: Record<string, unknown>;
};
function downloadJson(data: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type: "application/json"}));
  const link = document.createElement("a");
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportSmarthemBackup() {
  const data: Record<string, unknown> = {};
  for (const key of BACKUP_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw !== null) data[key] = JSON.parse(raw) as unknown;
  }
  downloadJson({format: "family-dashboard-smarthem-backup", schemaVersion: 1,
    exportedAt: new Date().toISOString(), data} satisfies BackupPayload,
    `smarthem-sakerhetskopia-${new Date().toISOString().slice(0,10)}.json`);
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function parseSmarthemBackup(value: unknown): { data: Record<string, unknown>; rooms: number; devices: number; hasPositions: boolean; legacy: boolean } {
  if (!isRecord(value)) throw new Error("Filen innehåller inte ett giltigt JSON-objekt.");
  if (value.format === "family-dashboard-smarthem-backup" && value.schemaVersion === 1 && isRecord(value.data)) {
    const data = value.data;
    if (Object.keys(data).some(key => !BACKUP_KEYS.includes(key as typeof BACKUP_KEYS[number]))) throw new Error("Filen innehåller okända lagringsnycklar.");
    const rooms = data[ROOMS], devices = data[DEVICES];
    if (!Array.isArray(rooms) || !rooms.every(isRoom) || !Array.isArray(devices) || !devices.every(isDevice)) throw new Error("Säkerhetskopian saknar giltiga rum eller enheter med positioner.");
    for (const [key, entry] of Object.entries(data)) {
      if (key === ROOMS || key === DEVICES || key === SCENES || key === ROUTINES_KEY || key === SECURITY_EVENTS || key === ALERT_DISMISSED_KEY) {
        if (!Array.isArray(entry)) throw new Error(`Felaktigt innehåll för ${key}.`);
      } else if (!isRecord(entry)) throw new Error(`Felaktigt innehåll för ${key}.`);
    }
    return {data, rooms: rooms.length, devices: devices.length, hasPositions: true, legacy: false};
  }
  // Äldre Home Assistant-export: behåll redan existerande positioner för matchande ID.
  if (value.schemaVersion === 1 && typeof value.purpose === "string" && value.purpose.startsWith("Home Assistant entity mapping") && Array.isArray(value.rooms) && Array.isArray(value.devices)) {
    const rooms = value.rooms, devices = value.devices;
    if (!rooms.every(room => isRecord(room) && typeof room.id === "string" && typeof room.name === "string") ||
        !devices.every(device => isRecord(device) && typeof device.id === "string" && typeof device.name === "string" && typeof device.type === "string" && typeof device.roomId === "string")) {
      throw new Error("Home Assistant-exporten innehåller ogiltiga rum eller enheter.");
    }
    const existingRooms = JSON.parse(localStorage.getItem(ROOMS) ?? "[]") as unknown;
    const existingDevices = JSON.parse(localStorage.getItem(DEVICES) ?? "[]") as unknown;
    const roomById = new Map((Array.isArray(existingRooms) ? existingRooms.filter(isRoom) : []).map(r => [r.id, r]));
    const deviceById = new Map((Array.isArray(existingDevices) ? existingDevices.filter(isDevice) : []).map(d => [d.id, d]));
    const restoredRooms = rooms.map((r: Record<string, unknown>) => ({...(roomById.get(r.id as string) ?? {x:0,z:0}), id:r.id, name:r.name}));
    const restoredDevices = devices.map((d: Record<string, unknown>) => ({...(deviceById.get(d.id as string) ?? {x:0,z:0}), id:d.id, name:d.name, type:d.type, roomId:d.roomId, manufacturer: typeof d.manufacturer === "string" ? d.manufacturer : "", entityId: typeof d.entityId === "string" ? d.entityId : ""}));
    return {data:{[ROOMS]:restoredRooms,[DEVICES]:restoredDevices}, rooms:rooms.length, devices:devices.length, hasPositions:false, legacy:true};
  }
  throw new Error("Okänt filformat. Välj en Smarthem-säkerhetskopia eller Home Assistant-mappning.");
}
const DEVICE_PREFS = "family-dashboard:smarthem-preview:device-prefs:v1";
type DevicePrefs = { favorites: string[]; groups: Record<string,string> };
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
const ELECTRIC_STATES = "family-dashboard:smarthem-preview:electric-states:v1";
const ELECTRIC_HISTORY = "family-dashboard:smarthem-preview:electric-history:v1";
type ElectricState = { watts: number; kwh: number };
type ElectricReading = { timestamp: string; watts: number; kwh: number };
const DEFAULT_ELECTRIC: ElectricState = { watts: 0, kwh: 0 };
function validElectric(value: unknown): value is ElectricState {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<ElectricState>;
  return typeof v.watts === "number" && Number.isFinite(v.watts) && v.watts >= 0 && v.watts <= 100000 &&
    typeof v.kwh === "number" && Number.isFinite(v.kwh) && v.kwh >= 0 && v.kwh <= 10000000;
}
function validElectricReading(value: unknown): value is ElectricReading {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<ElectricReading>;
  return typeof v.timestamp === "string" && Number.isFinite(Date.parse(v.timestamp)) && validElectric(value);
}
function ElectricChart({ readings }: { readings: ElectricReading[] }) {
  const points = readings.slice(-30);
  if (!points.length) return <p className="text-xs text-slate-400">Ingen historik ännu. Spara en simulerad mätning för att börja.</p>;
  const min = Math.min(...points.map(p => p.kwh));
  const max = Math.max(...points.map(p => p.kwh));
  const range = Math.max(0.1, max - min);
  const xy = points.map((p,i) => `${points.length === 1 ? 50 : 5 + i*90/(points.length-1)},${85 - (p.kwh-min)/range*70}`).join(" ");
  return <div className="space-y-2"><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Historik över registrerad energi i kilowattimmar" className="h-32 w-full rounded-lg bg-slate-950/50"><line x1="5" y1="85" x2="95" y2="85" stroke="#475569" strokeWidth=".5"/><polyline points={xy} fill="none" stroke="#60a5fa" strokeWidth="1.5" />{points.map((p,i) => <circle key={`${p.timestamp}-${i}`} cx={points.length===1 ? 50 : 5+i*90/(points.length-1)} cy={85-(p.kwh-min)/range*70} r="1.5" fill="#93c5fd" />)}</svg><div className="flex justify-between gap-2 text-xs text-slate-400"><span>{formatNumber(min,2)} kWh</span><span>{formatNumber(max,2)} kWh</span></div><p className="text-xs text-slate-400">Senast registrerat: {new Date(points[points.length-1].timestamp).toLocaleString("sv-SE")}</p></div>;
}
const ALERT_SETTINGS_KEY = "family-dashboard:smarthem-preview:alert-settings:v1";
const ALERT_DISMISSED_KEY = "family-dashboard:smarthem-preview:alert-dismissed:v1";
type AlertSettings = { enabled: boolean; powerEnabled: boolean; powerLimit: number; coldEnabled: boolean; minTemperature: number; hotEnabled: boolean; maxTemperature: number; securityEnabled: boolean };
const DEFAULT_ALERT_SETTINGS: AlertSettings = { enabled: true, powerEnabled: true, powerLimit: 3000, coldEnabled: true, minTemperature: 18, hotEnabled: true, maxTemperature: 28, securityEnabled: true };
function isAlertSettings(value: unknown): value is AlertSettings {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<AlertSettings>;
  return [v.enabled,v.powerEnabled,v.coldEnabled,v.hotEnabled,v.securityEnabled].every(x => typeof x === "boolean") &&
    typeof v.powerLimit === "number" && Number.isFinite(v.powerLimit) && v.powerLimit >= 0 && v.powerLimit <= 100000 &&
    typeof v.minTemperature === "number" && Number.isFinite(v.minTemperature) && v.minTemperature >= -30 && v.minTemperature <= 60 &&
    typeof v.maxTemperature === "number" && Number.isFinite(v.maxTemperature) && v.maxTemperature >= -30 && v.maxTemperature <= 60;
}
type SmartAlert = { id: string; title: string; detail: string; kind: "el" | "klimat" | "övervakning" };
const ROUTINES_KEY = "family-dashboard:smarthem-preview:routines:v1";
type RoutineAction = { deviceId: string; operation: "light_on" | "light_off" | "media_play" | "media_stop" | "lock" | "unlock"; brightness?: number };
type Routine = { id: string; name: string; actions: RoutineAction[] };
function validRoutine(value: unknown): value is Routine {
  if (!value || typeof value !== "object") return false;
  const r = value as Partial<Routine>;
  const operations = ["light_on", "light_off", "media_play", "media_stop", "lock", "unlock"];
  return typeof r.id === "string" && typeof r.name === "string" && Array.isArray(r.actions) &&
    r.actions.every(a => a && typeof a.deviceId === "string" && operations.includes(a.operation) &&
      (a.brightness === undefined || (Number.isInteger(a.brightness) && a.brightness >= 1 && a.brightness <= 100)));
}
const operationLabels: Record<RoutineAction["operation"], string> = {
  light_on: "Tänd", light_off: "Släck", media_play: "Spela", media_stop: "Stoppa", lock: "Lås", unlock: "Lås upp",
};
function allowedOperations(type: string): RoutineAction["operation"][] {
  const t = type.toLowerCase();
  if (LIGHT_TYPES.has(t)) return ["light_on", "light_off"];
  if (["speaker", "tv", "media_player", "media"].includes(t)) return ["media_play", "media_stop"];
  if (t === "lock") return ["lock", "unlock"];
  return [];
}
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
  const [category, setCategory] = useState<Category>("Översikt");
  const [view, setView] = useState<"2d" | "3d">("2d");
  const [reset, setReset] = useState(0);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [lights, setLights] = useState<Record<string, LightState>>({});
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [deviceSearch, setDeviceSearch] = useState("");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [deviceSort, setDeviceSort] = useState<"name"|"room"|"type"|"favorites">("name");
  const [deviceGroupFilter, setDeviceGroupFilter] = useState("all");
  const [devicePrefs, setDevicePrefs] = useState<DevicePrefs>({favorites:[],groups:{}});
  const [newGroupName, setNewGroupName] = useState("");
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [routineName, setRoutineName] = useState("");
  const [routineActions, setRoutineActions] = useState<RoutineAction[]>([]);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [routineError, setRoutineError] = useState("");
  const [routineNotice, setRoutineNotice] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [mediaStates, setMediaStates] = useState<Record<string, MediaState>>({});
  const [electricStates, setElectricStates] = useState<Record<string, ElectricState>>({});
  const [electricHistory, setElectricHistory] = useState<Record<string, ElectricReading[]>>({});
  const [climateStates, setClimateStates] = useState<Record<string, ClimateState>>({});
  const [climateHistory, setClimateHistory] = useState<Record<string, ClimateReading[]>>({});
  const [securityStates, setSecurityStates] = useState<Record<string, SecurityState>>({});
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [alertSettings, setAlertSettings] = useState<AlertSettings>(DEFAULT_ALERT_SETTINGS);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [historyFilter, setHistoryFilter] = useState<"alla" | "säkerhet" | "klimat" | "el">("alla");
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
  const [backupPreview, setBackupPreview] = useState<ReturnType<typeof parseSmarthemBackup> | null>(null);
  const [backupMessage, setBackupMessage] = useState("");
  async function selectBackupFile(event: ChangeEvent<HTMLInputElement>) {
    setBackupPreview(null); setBackupMessage("");
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 5_000_000) { setBackupMessage("Filen är för stor (max 5 MB)."); return; }
    try {
      const parsed: unknown = JSON.parse(await file.text());
      setBackupPreview(parseSmarthemBackup(parsed));
    } catch (error) { setBackupMessage(error instanceof Error ? error.message : "Kunde inte läsa JSON-filen."); }
  }
  function restoreBackup() {
    if (!backupPreview) return;
    const warning = backupPreview.legacy
      ? "Detta är en begränsad Home Assistant-mappning. Nya enheter placeras vid koordinat 0,0. Befintliga rum och enheter ersätts. Fortsätta?"
      : "Detta ersätter dina lokalt sparade Smarthem-uppgifter i den här webbläsaren. Fortsätta?";
    if (!window.confirm(warning)) return;
    const previous = new Map<string, string | null>();
    try {
      for (const key of Object.keys(backupPreview.data)) previous.set(key, localStorage.getItem(key));
      for (const [key, value] of Object.entries(backupPreview.data)) localStorage.setItem(key, JSON.stringify(value));
      window.location.reload();
    } catch {
      for (const [key, value] of previous) {
        try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* Kan inte återställa lagring */ }
      }
      setBackupMessage("Återställningen misslyckades. Tidigare uppgifter har återställts där det var möjligt.");
    }
  }

  useEffect(() => {
    try { const saved: unknown = JSON.parse(localStorage.getItem(ALERT_SETTINGS_KEY) ?? "null"); if (isAlertSettings(saved)) setAlertSettings(saved); } catch { /* Standardinställningar */ }
    try { const saved: unknown = JSON.parse(localStorage.getItem(ALERT_DISMISSED_KEY) ?? "[]"); if (Array.isArray(saved)) setDismissedAlerts(saved.filter((v): v is string => typeof v === "string").slice(-200)); } catch { /* Inga kvitterade varningar */ }
    setRooms(readArray(ROOMS, isRoom));
    setDevices(readArray(DEVICES, isDevice));
    try { const v: unknown = JSON.parse(localStorage.getItem(DEVICE_PREFS) ?? "null"); if(v && typeof v === "object") { const p=v as Partial<DevicePrefs>; setDevicePrefs({favorites:Array.isArray(p.favorites)?p.favorites.filter((x):x is string=>typeof x==="string"):[],groups:p.groups && typeof p.groups==="object" && !Array.isArray(p.groups)?Object.fromEntries(Object.entries(p.groups).filter(([,x])=>typeof x==="string")): {}}); } } catch { /* Inga favoriter eller grupper */ }
    setScenes(readArray(SCENES, isScene));
    setRoutines(readArray(ROUTINES_KEY, validRoutine));
    try { const data: unknown = JSON.parse(localStorage.getItem(ELECTRIC_STATES) ?? "{}"); if (data && typeof data === "object" && !Array.isArray(data)) setElectricStates(Object.fromEntries(Object.entries(data).filter(([,value]) => validElectric(value)))); } catch { /* Inga sparade elvärden */ }
    try { const data: unknown = JSON.parse(localStorage.getItem(ELECTRIC_HISTORY) ?? "{}"); if (data && typeof data === "object" && !Array.isArray(data)) setElectricHistory(Object.fromEntries(Object.entries(data).filter(([,value]) => Array.isArray(value)).map(([id,value]) => [id,(value as unknown[]).filter(validElectricReading).slice(-30)]))); } catch { /* Ingen sparad elhistorik */ }
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
  const visible = useMemo(() => (currentCategory === "Administration" || currentCategory === "Översikt") ? devices : devices.filter(device => categoryOf(device.type) === currentCategory), [devices, currentCategory]);
  const selected = visible.find(device => device.id === selectedId);
  const combinedHistory = useMemo(() => {
    const events: { key: string; category: "säkerhet" | "klimat" | "el"; timestamp: string; title: string; detail: string }[] = [];
    for (const event of securityEvents) {
      events.push({ key: `security-${event.id}`, category: "säkerhet", timestamp: event.timestamp, title: event.deviceName, detail: event.message });
    }
    for (const [id, readings] of Object.entries(climateHistory)) {
      const name = devices.find(device => device.id === id)?.name ?? "Tidigare klimatenhet";
      for (const [index, reading] of readings.entries()) {
        events.push({ key: `climate-${id}-${index}-${reading.timestamp}`, category: "klimat", timestamp: reading.timestamp, title: name, detail: `${formatNumber(reading.temperature, 1)} °C · ${formatNumber(reading.humidity)} % luftfuktighet` });
      }
    }
    for (const [id, readings] of Object.entries(electricHistory)) {
      const name = devices.find(device => device.id === id)?.name ?? "Tidigare elmätare";
      for (const [index, reading] of readings.entries()) {
        events.push({ key: `electric-${id}-${index}-${reading.timestamp}`, category: "el", timestamp: reading.timestamp, title: name, detail: `${formatNumber(reading.watts)} W · ${formatNumber(reading.kwh, 2)} kWh` });
      }
    }
    return events.filter(event => Number.isFinite(Date.parse(event.timestamp)))
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  }, [securityEvents, climateHistory, electricHistory, devices]);
  const filteredHistory = combinedHistory.filter(event => historyFilter === "alla" || event.category === historyFilter).slice(0, 100);
  const lightDevices = devices.filter(device => LIGHT_TYPES.has(device.type.toLowerCase()));
  const onCount = lightDevices.filter(device => lights[device.id]?.on).length;
  const electricDevices = devices.filter(device => categoryOf(device.type) === "El");
  const totalWatts = electricDevices.reduce((sum, device) => sum + (electricStates[device.id]?.watts ?? 0), 0);
  const totalKwh = electricDevices.reduce((sum, device) => sum + (electricStates[device.id]?.kwh ?? 0), 0);
  const currentSpotOre = overview?.electricity?.currentOrePerKwh;
  const activeAlerts = useMemo<SmartAlert[]>(() => {
    if (!alertSettings.enabled) return [];
    const result: SmartAlert[] = [];
    const electricDevices = devices.filter(d => categoryOf(d.type) === "El");
    const watts = electricDevices.reduce((sum,d) => sum + (electricStates[d.id]?.watts ?? 0),0);
    if (alertSettings.powerEnabled && electricDevices.length && watts > alertSettings.powerLimit) result.push({ id: `power:${alertSettings.powerLimit}`, title: "Hög effektförbrukning", detail: `${formatNumber(watts)} W överstiger gränsen ${formatNumber(alertSettings.powerLimit)} W.`, kind: "el" });
    for (const device of devices.filter(d => categoryOf(d.type) === "Klimat" && d.type.toLowerCase() !== "humidity")) {
      const state = climateStates[device.id];
      if (!state) continue;
      if (alertSettings.coldEnabled && state.temperature < alertSettings.minTemperature) result.push({ id: `cold:${device.id}:${alertSettings.minTemperature}`, title: `Låg temperatur: ${device.name}`, detail: `${formatNumber(state.temperature,1)} °C är under ${formatNumber(alertSettings.minTemperature,1)} °C.`, kind: "klimat" });
      if (alertSettings.hotEnabled && state.temperature > alertSettings.maxTemperature) result.push({ id: `hot:${device.id}:${alertSettings.maxTemperature}`, title: `Hög temperatur: ${device.name}`, detail: `${formatNumber(state.temperature,1)} °C är över ${formatNumber(alertSettings.maxTemperature,1)} °C.`, kind: "klimat" });
    }
    if (alertSettings.securityEnabled) for (const device of devices.filter(d => d.type.toLowerCase() === "lock")) {
      if (securityStates[device.id]?.active === true) result.push({ id: `unlocked:${device.id}`, title: `Olåst dörr: ${device.name}`, detail: "Låset är markerat som upplåst i demoläget.", kind: "övervakning" });
    }
    return result;
  }, [alertSettings, devices, electricStates, climateStates, securityStates]);
  const visibleAlerts = activeAlerts.filter(a => !dismissedAlerts.includes(a.id));
  function updateAlertSettings(patch: Partial<AlertSettings>) {
    const next = { ...alertSettings, ...patch };
    if (!isAlertSettings(next)) return;
    setAlertSettings(next);
    setDismissedAlerts([]);
    try { localStorage.setItem(ALERT_SETTINGS_KEY, JSON.stringify(next)); localStorage.removeItem(ALERT_DISMISSED_KEY); } catch { /* Lokal lagring är valfri */ }
  }
  function dismissAlert(id: string) {
    const next = [...new Set([...dismissedAlerts,id])].slice(-200);
    setDismissedAlerts(next);
    try { localStorage.setItem(ALERT_DISMISSED_KEY, JSON.stringify(next)); } catch { /* Lokal lagring är valfri */ }
  }
  function resetDismissedAlerts() { setDismissedAlerts([]); try { localStorage.removeItem(ALERT_DISMISSED_KEY); } catch { /* Lokal lagring är valfri */ } }

  const totalSpotCost = currentSpotOre == null ? null : totalKwh * currentSpotOre / 100;
  const knownGroups = [...new Set(Object.values(devicePrefs.groups).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"sv"));
  const filteredAdminDevices = devices.filter(device => {
    const query = deviceSearch.trim().toLocaleLowerCase("sv-SE");
    const matchesSearch = !query || [device.name, device.manufacturer ?? "", device.type, rooms.find(room => room.id === device.roomId)?.name ?? "", device.entityId ?? "",devicePrefs.groups[device.id] ?? ""].some(v => v.toLocaleLowerCase("sv-SE").includes(query));
    return matchesSearch && (deviceFilter === "all" || (deviceFilter === "favorites" ? devicePrefs.favorites.includes(device.id) : categoryOf(device.type) === deviceFilter)) && (deviceGroupFilter === "all" || (deviceGroupFilter === "ungrouped" ? !devicePrefs.groups[device.id] : devicePrefs.groups[device.id] === deviceGroupFilter));
  }).sort((a,b)=>{
    if (deviceSort === "favorites") { const diff=Number(devicePrefs.favorites.includes(b.id))-Number(devicePrefs.favorites.includes(a.id)); if(diff) return diff; }
    const label = (d:Device) => deviceSort === "room" ? rooms.find(r=>r.id===d.roomId)?.name ?? "" : deviceSort === "type" ? categoryOf(d.type) ?? "" : d.name;
    return label(a).localeCompare(label(b),"sv") || a.name.localeCompare(b.name,"sv");
  });
  function saveDevicePrefs(next:DevicePrefs) {
    setDevicePrefs(next);
    try { localStorage.setItem(DEVICE_PREFS,JSON.stringify(next)); } catch { setDeviceError("Kunde inte spara favoriter och grupper lokalt."); }
  }
  function toggleFavorite(id:string) {
    saveDevicePrefs({...devicePrefs,favorites:devicePrefs.favorites.includes(id)?devicePrefs.favorites.filter(x=>x!==id):[...devicePrefs.favorites,id]});
  }
  function assignGroup(id:string,group:string) {
    const groups={...devicePrefs.groups}; if(group) groups[id]=group; else delete groups[id];
    saveDevicePrefs({...devicePrefs,groups});
  }
  const favoriteDevices = devices.filter(d=>devicePrefs.favorites.includes(d.id));
  function saveRoutines(next: Routine[]) {
    try { localStorage.setItem(ROUTINES_KEY, JSON.stringify(next)); setRoutines(next); setRoutineError(""); return true; }
    catch { setRoutineError("Kunde inte spara rutiner i webbläsaren."); return false; }
  }
  function editRoutine(routine?: Routine) {
    setEditingRoutineId(routine?.id ?? "new");
    setRoutineName(routine?.name ?? "");
    setRoutineActions(routine?.actions ?? []);
    setRoutineError(""); setRoutineNotice("");
  }
  function persistRoutine() {
    const name = routineName.trim();
    if (!name) { setRoutineError("Ange ett namn på rutinen."); return; }
    if (!routineActions.length) { setRoutineError("Lägg till minst en åtgärd."); return; }
    if (routineActions.some(a => !devices.some(d => d.id === a.deviceId && allowedOperations(d.type).includes(a.operation)))) {
      setRoutineError("En åtgärd gäller en borttagen eller inkompatibel enhet. Kontrollera rutinen."); return;
    }
    const id = editingRoutineId === "new" ? (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `rutin-${Date.now()}`) : editingRoutineId;
    if (!id) return;
    const routine: Routine = { id, name, actions: routineActions };
    const next = editingRoutineId === "new" ? [...routines, routine] : routines.map(r => r.id === id ? routine : r);
    if (saveRoutines(next)) { setEditingRoutineId(null); setRoutineActions([]); setRoutineName(""); }
  }
  function runRoutine(routine: Routine) {
    const unavailable = routine.actions.filter(a => !devices.some(d => d.id === a.deviceId && allowedOperations(d.type).includes(a.operation)));
    if (unavailable.length) { setRoutineNotice(`Rutinen ${routine.name} kan inte köras: ${unavailable.length} åtgärd(er) saknar en kompatibel enhet.`); return; }
    const nextLights = { ...lights };
    const nextMedia = { ...mediaStates };
    const nextSecurity = { ...securityStates };
    for (const action of routine.actions) {
      if (action.operation === "light_on" || action.operation === "light_off") {
        const prev = nextLights[action.deviceId];
        nextLights[action.deviceId] = { on: action.operation === "light_on", brightness: action.brightness ?? prev?.brightness ?? 65 };
      } else if (action.operation === "media_play" || action.operation === "media_stop") {
        nextMedia[action.deviceId] = { ...(nextMedia[action.deviceId] ?? defaultMediaState), playing: action.operation === "media_play" };
      } else {
        nextSecurity[action.deviceId] = { active: action.operation === "unlock" };
      }
    }
    setLights(nextLights); setMediaStates(nextMedia); setSecurityStates(nextSecurity); setActiveSceneId(null);
    try {
      localStorage.setItem(LIGHTS, JSON.stringify(nextLights));
      localStorage.setItem(MEDIA_STATES, JSON.stringify(nextMedia));
      localStorage.setItem(SECURITY_STATES, JSON.stringify(nextSecurity));
      setRoutineNotice(`Rutinen ”${routine.name}” kördes i demoläge (${routine.actions.length} åtgärder).`);
    } catch { setRoutineNotice("Rutinen kördes i demoläge, men kunde inte sparas lokalt."); }
  }
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
  function changeElectric(id: string, patch: Partial<ElectricState>, record = false) {
    const value = { ...(electricStates[id] ?? DEFAULT_ELECTRIC), ...patch };
    if (!validElectric(value)) return;
    const updated = { ...electricStates, [id]: value };
    setElectricStates(updated);
    try { localStorage.setItem(ELECTRIC_STATES, JSON.stringify(updated)); } catch { /* Lagring kan vara blockerad */ }
    if (record) {
      const history = { ...electricHistory, [id]: [...(electricHistory[id] ?? []), { ...value, timestamp: new Date().toISOString() }].slice(-30) };
      setElectricHistory(history);
      try { localStorage.setItem(ELECTRIC_HISTORY, JSON.stringify(history)); } catch { /* Lagring kan vara blockerad */ }
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
    // Formuläret ligger ovanför enhetslistan. Flytta vyn dit när det öppnas.
    window.setTimeout(() => {
      document.getElementById("smarthem-device-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
      document.getElementById("smarthem-device-name")?.focus({ preventScroll: true });
    }, 50);
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
  return <div className={`${embedded ? "w-full min-w-0" : "min-h-screen lg:flex"} smarthem-mobile bg-[#0b1220] text-slate-100`}>
    {!embedded && mobileMenu && <button aria-label="Stäng meny" className="fixed inset-0 z-30 bg-black/70 lg:hidden" onClick={() => setMobileMenu(false)} />}
    {!embedded && <aside className={`fixed inset-y-0 left-0 z-40 w-60 border-r border-white/10 bg-[#111d30] p-4 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${mobileMenu ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="mb-7 flex items-center justify-between px-2 pt-3"><div><div className="text-xl font-bold">Smarthem</div><div className="mt-1 text-[10px] font-semibold tracking-[.22em] text-cyan-300">KONTROLLCENTER</div></div><button className="lg:hidden" onClick={() => setMobileMenu(false)} aria-label="Stäng meny"><X size={20} /></button></div>
      <nav className="space-y-1" aria-label="Smarthem meny">{menu.map(item => { const Icon = item.icon; return <button key={item.name} onClick={() => choose(item.name)} aria-current={currentCategory === item.name ? "page" : undefined} className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-medium transition ${currentCategory === item.name ? "bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-400/20" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}><Icon size={19} />{item.name}</button>; })}</nav>
      <p className="mt-10 px-3 text-xs leading-5 text-slate-400">Fristående förhandsversion. Styrning är endast demo.</p>
    </aside>}
    <main className={embedded ? "min-w-0 w-full p-0" : "min-w-0 flex-1 p-3 sm:p-6 xl:p-9"}>
      {/* Mobil snabbnavigering – även när Smarthem visas inuti DashboardTabs. */}
      <nav aria-label="Smarthem – snabbnavigering" className={`${embedded ? "hidden" : "flex"} -mx-1 mb-4 snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-2 lg:hidden`} style={{ WebkitOverflowScrolling: "touch" }}>
        {menu.map(item => { const Icon = item.icon; const active = currentCategory === item.name; return <button key={item.name} type="button" onClick={() => choose(item.name)} aria-current={active ? "page" : undefined} className={`flex min-h-11 shrink-0 snap-start items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium ${active ? "border-cyan-400/40 bg-cyan-500/20 text-cyan-100" : "border-white/10 bg-slate-800 text-slate-300"}`}><Icon size={17}/>{item.name}</button>; })}
      </nav>
      <header className="mb-5 flex items-center gap-3"><button onClick={() => setMobileMenu(true)} className={`${embedded ? "hidden" : ""} rounded-lg border border-white/15 bg-slate-800 p-2 lg:hidden`} aria-label="Öppna meny"><Menu size={21} /></button><div className="min-w-0 flex-1"><h1 className="text-2xl font-bold sm:text-3xl">{currentCategory}</h1><p className="mt-1 text-xs text-slate-400">Din bostad – 2D och 3D</p></div><span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-200">Demoläge</span></header>
      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(220px,260px)] 2xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
      <section className={`${panel} mb-5`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Interaktiv planritning</h2><p className="text-xs text-slate-400">{currentCategory === "Översikt" ? "Alla registrerade enheter visas i planritningen" : currentCategory === "Administration" ? (placingRoomId || placingDeviceId ? "Klicka i 2D-planritningen för att placera markören" : "Välj ett rum eller en enhet för att markera eller flytta") : `${visible.length} enheter i kategorin ${currentCategory.toLowerCase()}`}</p></div><div className="flex w-full justify-end gap-2 sm:w-auto"><button onClick={() => setView("2d")} aria-pressed={view === "2d"} className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm ${view === "2d" ? "bg-cyan-700 text-white" : "bg-slate-800 text-slate-300"}`}><Map size={16}/>2D</button><button onClick={() => setView("3d")} aria-pressed={view === "3d"} className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm ${view === "3d" ? "bg-cyan-700 text-white" : "bg-slate-800 text-slate-300"}`}><Box size={16}/>3D</button><button onClick={() => setReset(n => n + 1)} title="Återställ vy" aria-label="Återställ vy" className="rounded-lg bg-slate-800 px-3 py-2"><RotateCcw size={16}/></button></div></div>
        <div className="smarthem-model min-w-0 overflow-hidden rounded-xl"><ApartmentModel view={view} rooms={rooms} devices={visible} lights={lights} securityStates={securityStates} mediaStates={mediaStates} climateStates={climateStates} electricStates={electricStates} selectedId={selectedId} onSelect={(id) => { setSelectedId(id); if (currentCategory === "Administration") { setPlacingDeviceId(null); setPlacingRoomId(null); } }} onClearSelection={() => setSelectedId(null)} reset={reset} selectedRoomId={currentCategory === "Administration" ? selectedRoomId : null} onSelectRoom={currentCategory === "Administration" ? (id) => { setSelectedRoomId(id); setPlacingRoomId(null); setPlacingDeviceId(null); } : undefined} placingRoom={currentCategory === "Administration" && !!placingRoomId && view === "2d"} onPlaceRoom={placeRoom} placingDevice={currentCategory === "Administration" && !!placingDeviceId && view === "2d"} onPlaceDevice={placeDevice}/></div>
        <p className="mt-3 text-xs text-slate-400">Modellen läses från /public/hemmet3d/. Röd markör = rum, gul/grå = belysning, lila = media, turkos = klimat, orange = övervakning, blå = el. Lås: röd = låst, grön = olåst. Dra för att navigera och zooma med mus eller fingrar. Vid placering: klicka i 2D-vyn.</p>
      </section>
      <section className={panel} aria-live="polite"><h2 className="mb-4 text-lg font-semibold">{currentCategory === "Översikt" ? "Översikt" : currentCategory}</h2>
        {!loaded && <p className="text-sm text-slate-400">Läser sparade enheter…</p>}
        {loaded && currentCategory === "Översikt" && <div className="space-y-4 text-sm text-slate-300"><p>{rooms.length} rum och {devices.length} registrerade enheter hittades i denna webbläsare.</p><p>Välj en kategori i menyn för att visa dess enheter. Här på Översikt visas samtliga enheter.</p><p className="text-xs text-slate-400">Enheter och rum är lokalt sparade i webbläsaren, inte hämtade från Home Assistant.</p>
          <section className="border-t border-white/10 pt-4" aria-label="Notiser och varningar">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h3 className="flex items-center gap-2 font-semibold text-white"><Bell size={18} className="text-amber-300"/> Notiser och varningar {visibleAlerts.length > 0 && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-200">{visibleAlerts.length}</span>}</h3><span className="text-xs text-slate-400">Lokala demovarningar</span></div>
            {!alertSettings.enabled ? <p className="rounded-xl bg-slate-800/40 p-3 text-xs text-slate-400">Varningar är pausade. Aktivera dem under Administration.</p> : visibleAlerts.length === 0 ? <p className="rounded-xl bg-slate-800/40 p-3 text-xs text-slate-400">Inga okvitterade varningar. Inställningar finns under Administration.</p> : <div className="space-y-2">{visibleAlerts.map(alert => <article key={alert.id} role="status" className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3"><div className="flex min-w-0 flex-1 items-start gap-2"><AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-300"/><div><p className="font-semibold text-amber-100">{alert.title}</p><p className="mt-1 text-xs text-slate-300">{alert.detail}</p><p className="mt-1 text-[11px] text-slate-400">{alert.kind} · simulerat värde</p></div></div><button type="button" onClick={() => dismissAlert(alert.id)} className="rounded-lg border border-white/15 px-3 py-2 text-xs">Kvittera</button></article>)}</div>}
            <p className="mt-2 text-[11px] text-slate-500">Kvitterade varningar döljs tills gränsen ändras eller varningarna återställs. Inga pushnotiser skickas.</p>
          </section>
          <section className="border-t border-white/10 pt-4"><h3 className="mb-3 flex items-center gap-2 font-semibold text-white"><WandSparkles size={18} className="text-cyan-300"/> Smarta rutiner</h3>
            {routineNotice && <p role="status" className="mb-3 rounded-lg border border-cyan-400/25 bg-cyan-400/10 p-3 text-xs text-cyan-100">{routineNotice}</p>}
            {routines.length ? <div className="grid gap-3 sm:grid-cols-2">{routines.map(routine => <article key={routine.id} className="rounded-xl border border-white/10 bg-slate-800/50 p-4"><p className="font-semibold">{routine.name}</p><p className="mt-1 text-xs text-slate-400">{routine.actions.length} åtgärder · demo</p><button type="button" onClick={() => runRoutine(routine)} className="mt-3 rounded-lg bg-cyan-700 px-4 py-2 text-xs font-semibold hover:bg-cyan-600">Aktivera rutin</button></article>)}</div> : <p className="text-xs text-slate-400">Inga rutiner ännu. Skapa en under Smarthem → Administration.</p>}
          </section>
          <section className="border-t border-white/10 pt-4" aria-label="Historik">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div><h3 className="flex items-center gap-2 font-semibold text-white"><Activity size={18} className="text-cyan-300"/> Händelsehistorik</h3><p className="mt-1 text-xs text-slate-400">Tidigare sparade händelser och mätningar i demoläget. Ingen statistik.</p></div>
              <label className="flex items-center gap-2 text-xs text-slate-300">Visa
                <select value={historyFilter} onChange={event => setHistoryFilter(event.target.value as typeof historyFilter)} className="rounded-lg border border-white/15 bg-slate-800 px-3 py-2 text-sm text-white">
                  <option value="alla">Alla händelser</option><option value="säkerhet">Övervakning</option><option value="klimat">Klimat</option><option value="el">El</option>
                </select>
              </label>
            </div>
            {filteredHistory.length === 0 ? <p className="rounded-xl border border-white/10 bg-slate-800/40 p-4 text-xs text-slate-400">Ingen sparad historik för detta filter. Simulera en händelse under Övervakning eller spara en mätning under Klimat eller El.</p> :
              <ol className="max-h-96 space-y-2 overflow-y-auto pr-1">{filteredHistory.map(event => <li key={event.key} className="rounded-xl border border-white/10 bg-slate-800/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium text-white">{event.title}</span><time dateTime={event.timestamp} className="text-xs text-slate-400">{new Date(event.timestamp).toLocaleString("sv-SE")}</time></div>
                <p className="mt-1 text-xs text-slate-300">{event.detail}</p><span className="mt-2 inline-block rounded bg-slate-700/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">{event.category}</span>
              </li>)}</ol>}
            <p className="mt-3 text-xs text-slate-500">Visar högst 100 poster. Befintliga mätningar sparas lokalt per enhet (högst 30 per enhet), och övervakningshändelser högst 100. Ingen automatisk datainsamling.</p>
          </section></div>}
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
        {loaded && currentCategory === "Översikt" && favoriteDevices.length > 0 && <section className={`${panel} mb-5`} aria-label="Favoritenheter"><h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Star size={19} className="text-amber-300"/>Favoritenheter</h2><div className="grid gap-2 sm:grid-cols-2">{favoriteDevices.map(device=><div key={device.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-800/40 p-3"><button type="button" onClick={()=>setSelectedId(device.id)} className="min-w-0 flex-1 text-left"><span className="block truncate text-sm font-medium">{device.name}</span><span className="text-xs text-slate-400">{rooms.find(r=>r.id===device.roomId)?.name??"Utan rum"}</span></button>{LIGHT_TYPES.has(device.type.toLowerCase()) && <button type="button" onClick={()=>changeLight(device.id,{on:!lights[device.id]?.on})} className="rounded-lg bg-amber-500/20 px-3 py-2 text-xs text-amber-100">{lights[device.id]?.on?"Släck":"Tänd"}</button>}<button type="button" onClick={()=>toggleFavorite(device.id)} title="Ta bort favorit" aria-label={`Ta bort ${device.name} från favoriter`} className="p-2 text-amber-300"><Star size={16} fill="currentColor"/></button></div>)}</div><p className="mt-2 text-xs text-slate-400">Favoriter väljs under Administration. Snabbkontrollerna använder demoläget.</p></section>}
        {loaded && currentCategory === "Administration" && <div className="space-y-5">
          <section className="space-y-4 rounded-xl border border-cyan-400/20 bg-slate-900/70 p-4" aria-label="Home Assistant – integrationsförberedelser">
            <div><h3 className="flex items-center gap-2 text-base font-semibold"><Home size={18} className="text-cyan-300"/> Home Assistant – förberedelser</h3>
              <p className="mt-1 text-xs text-slate-400">Steg 22: kontrollera enhetsmappning inför en framtida anslutning. Ingen anslutning eller styrning sker här. Vercel och Supabase påverkas inte.</p></div>
            {(() => {
              const mapped = devices.filter(d => haEntityStatus(d.entityId) === "ready");
              const invalid = devices.filter(d => haEntityStatus(d.entityId) === "invalid");
              const missing = devices.filter(d => haEntityStatus(d.entityId) === "missing");
              const duplicates = new Set(mapped.map(d => d.entityId!.trim()).filter((id, i, all) => all.indexOf(id) !== i));
              return <>
                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <div className="rounded-lg bg-slate-800/70 p-3"><strong className="block text-lg text-white">{devices.length}</strong>Enheter</div>
                  <div className="rounded-lg bg-slate-800/70 p-3"><strong className="block text-lg text-emerald-300">{mapped.length}</strong>Giltiga Entity ID</div>
                  <div className="rounded-lg bg-slate-800/70 p-3"><strong className="block text-lg text-amber-300">{missing.length}</strong>Saknar Entity ID</div>
                  <div className="rounded-lg bg-slate-800/70 p-3"><strong className="block text-lg text-rose-300">{invalid.length + duplicates.size}</strong>Fel / dubbletter</div>
                </div>
                <p className="text-xs text-slate-400">Ett Entity ID ska exempelvis skrivas <code className="text-cyan-200">light.vardagsrum</code> eller <code className="text-cyan-200">sensor.hall_temperatur</code>. Giltigt format betyder inte att enheten finns i Home Assistant.</p>
                {(invalid.length > 0 || duplicates.size > 0) && <div className="space-y-1 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-100" role="status">
                  {invalid.map(d => <p key={d.id}>Ogiltigt Entity ID för {d.name}: {d.entityId}</p>)}
                  {[...duplicates].map(id => <p key={id}>Entity ID används av flera enheter: {id}</p>)}
                </div>}
                <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={() => exportHaMapping(devices, rooms)} className="rounded-lg bg-cyan-700 px-4 py-2 text-xs font-semibold hover:bg-cyan-600">Exportera enhetsmappning (JSON)</button><span className="text-xs text-slate-400">Innehåller namn, rum och Entity ID – inga lösenord eller åtkomstnycklar.</span></div>
              </>;
            })()}
            <p className="text-xs text-slate-400">För en framtida riktig anslutning behövs en säker serverintegration och autentisering. Spara aldrig Home Assistant-token i webbläsarens lokala lagring eller klientkod.</p>
          </section>
          <section className="mb-5 space-y-3 rounded-xl border border-cyan-400/20 bg-slate-900/60 p-4" aria-label="Säkerhetskopiera och återställ Smarthem">
            <h3 className="text-base font-semibold">Säkerhetskopiera / återställ Smarthem</h3>
            <p className="text-xs text-slate-400">Flytta rum, enheter, placeringar, favoriter, grupper, rutiner och sparade demolägen mellan localhost och Vercel. Filen sparas på din dator och skickas inte till någon server.</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => { try { exportSmarthemBackup(); setBackupMessage("Säkerhetskopian har laddats ner."); } catch { setBackupMessage("Kunde inte exportera. Kontrollera webbläsarens lagring."); } }} className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold hover:bg-cyan-600">Exportera fullständig säkerhetskopia</button>
              <label className="cursor-pointer rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10">Välj JSON för import
                <input type="file" accept=".json,application/json" onChange={selectBackupFile} className="sr-only" />
              </label>
            </div>
            {backupPreview && <div className="space-y-2 rounded-lg border border-amber-300/30 bg-amber-400/5 p-3 text-sm">
              <p><strong>Förhandsgranskning:</strong> {backupPreview.rooms} rum och {backupPreview.devices} enheter.</p>
              <p className="text-xs text-amber-100">{backupPreview.hasPositions ? "Fullständig säkerhetskopia med enheternas positioner och övriga sparade inställningar." : "Begränsad Home Assistant-mappning: positioner saknas i filen. Befintliga positioner återanvänds där ID matchar, övriga enheter placeras vid 0,0. Andra inställningar återställs inte."}</p>
              <button type="button" onClick={restoreBackup} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500">Bekräfta och importera</button>
              <button type="button" onClick={() => setBackupPreview(null)} className="ml-2 rounded-lg border border-white/20 px-4 py-2 text-sm">Avbryt</button>
            </div>}
            {backupMessage && <p role="status" className="text-xs text-amber-200">{backupMessage}</p>}
          </section>
          <section className="mb-5 rounded-xl border border-amber-400/20 bg-slate-900/60 p-4" aria-label="Inställningar för varningar">
            <h3 className="mb-2 flex items-center gap-2 text-base font-semibold"><Bell size={18} className="text-amber-300"/> Notiser och varningar</h3>
            <p className="mb-4 text-xs text-slate-400">Steg 18: gränsvärdesvarningar baserade på manuellt simulerade värden. Endast i den här webbläsaren, inga pushnotiser.</p>
            <label className="mb-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={alertSettings.enabled} onChange={e => updateAlertSettings({enabled:e.target.checked})}/> Aktivera varningar</label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="rounded-lg bg-slate-950/40 p-3 text-xs"><span className="flex items-center gap-2"><input type="checkbox" checked={alertSettings.powerEnabled} onChange={e=>updateAlertSettings({powerEnabled:e.target.checked})}/> Hög effekt (W)</span><input type="number" min="0" max="100000" step="100" value={alertSettings.powerLimit} onChange={e=>updateAlertSettings({powerLimit:Number(e.target.value)})} className="mt-2 w-full rounded-lg border border-white/15 bg-slate-800 p-2 text-sm"/></label>
              <label className="rounded-lg bg-slate-950/40 p-3 text-xs"><span className="flex items-center gap-2"><input type="checkbox" checked={alertSettings.coldEnabled} onChange={e=>updateAlertSettings({coldEnabled:e.target.checked})}/> Låg temperatur (°C)</span><input type="number" min="-30" max="60" step="0.5" value={alertSettings.minTemperature} onChange={e=>updateAlertSettings({minTemperature:Number(e.target.value)})} className="mt-2 w-full rounded-lg border border-white/15 bg-slate-800 p-2 text-sm"/></label>
              <label className="rounded-lg bg-slate-950/40 p-3 text-xs"><span className="flex items-center gap-2"><input type="checkbox" checked={alertSettings.hotEnabled} onChange={e=>updateAlertSettings({hotEnabled:e.target.checked})}/> Hög temperatur (°C)</span><input type="number" min="-30" max="60" step="0.5" value={alertSettings.maxTemperature} onChange={e=>updateAlertSettings({maxTemperature:Number(e.target.value)})} className="mt-2 w-full rounded-lg border border-white/15 bg-slate-800 p-2 text-sm"/></label>
              <label className="flex items-center gap-2 rounded-lg bg-slate-950/40 p-3 text-xs"><input type="checkbox" checked={alertSettings.securityEnabled} onChange={e=>updateAlertSettings({securityEnabled:e.target.checked})}/> Varna för upplåsta dörrlås</label>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" onClick={resetDismissedAlerts} className="rounded-lg border border-white/15 px-3 py-2 text-xs">Återställ kvitterade varningar</button><span className="text-xs text-slate-400">{activeAlerts.length} aktiva · {visibleAlerts.length} okvitterade</span></div>
          </section>

           <section className="space-y-4 rounded-xl border border-white/10 bg-slate-800/30 p-4">
             <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="flex items-center gap-2 font-semibold"><WandSparkles size={18} className="text-cyan-300"/> Smarta rutiner</h3><p className="mt-1 text-xs text-slate-400">Styr flera registrerade enheter samtidigt i demoläge.</p></div><button type="button" onClick={() => editRoutine()} className="flex items-center gap-2 rounded-lg bg-cyan-700 px-3 py-2 text-xs font-semibold"><Plus size={15}/> Ny rutin</button></div>
             {routineError && <p role="alert" className="rounded-lg bg-rose-500/10 p-3 text-xs text-rose-200">{routineError}</p>}
             {routineNotice && <p role="status" className="rounded-lg bg-cyan-500/10 p-3 text-xs text-cyan-200">{routineNotice}</p>}
             {editingRoutineId && <div className="space-y-3 rounded-xl border border-cyan-400/30 bg-slate-900/70 p-3"><label className="block text-xs">Namn på rutin<input maxLength={80} value={routineName} onChange={e => setRoutineName(e.target.value)} placeholder="Exempel: God natt" className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 p-2.5"/></label>
               {routineActions.map((action,index) => { const device = devices.find(d => d.id === action.deviceId); const options = device ? allowedOperations(device.type) : []; return <div key={index} className="space-y-2 rounded-lg border border-white/10 p-3"><div className="flex gap-2"><select aria-label="Enhet" value={action.deviceId} onChange={e => { const d = devices.find(d => d.id === e.target.value); setRoutineActions(prev => prev.map((a,i) => i === index ? {deviceId:e.target.value,operation:allowedOperations(d?.type ?? "")[0] ?? "light_on"} : a)); }} className="min-w-0 flex-1 rounded-lg bg-slate-950 p-2 text-xs">{!device && <option value={action.deviceId}>Enhet saknas</option>}{devices.filter(d => allowedOperations(d.type).length).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select><button type="button" aria-label="Ta bort åtgärd" onClick={() => setRoutineActions(prev => prev.filter((_,i) => i !== index))} className="rounded-lg bg-rose-900/50 p-2"><Trash2 size={15}/></button></div><select aria-label="Åtgärd" value={action.operation} onChange={e => setRoutineActions(prev => prev.map((a,i) => i === index ? {...a,operation:e.target.value as RoutineAction["operation"]} : a))} className="w-full rounded-lg bg-slate-950 p-2 text-xs">{!options.includes(action.operation) && <option value={action.operation}>Ogiltig åtgärd</option>}{options.map(op => <option key={op} value={op}>{operationLabels[op]}</option>)}</select>{action.operation === "light_on" && <label className="block text-xs text-slate-300">Ljusstyrka: {action.brightness ?? 65} %<input type="range" min={1} max={100} value={action.brightness ?? 65} onChange={e => setRoutineActions(prev => prev.map((a,i) => i === index ? {...a,brightness:Number(e.target.value)} : a))} className="mt-2 w-full accent-cyan-400"/></label>}</div>; })}
               <button type="button" disabled={!devices.some(d => allowedOperations(d.type).length)} onClick={() => { const d = devices.find(d => allowedOperations(d.type).length); if(d) setRoutineActions(prev => [...prev,{deviceId:d.id,operation:allowedOperations(d.type)[0]}]); }} className="rounded-lg border border-white/20 px-3 py-2 text-xs disabled:opacity-40"><Plus size={14} className="mr-1 inline"/> Lägg till åtgärd</button><div className="flex flex-wrap gap-2"><button type="button" onClick={persistRoutine} className="rounded-lg bg-cyan-700 px-4 py-2 text-xs font-semibold">Spara rutin</button><button type="button" onClick={() => {setEditingRoutineId(null);setRoutineError("");}} className="rounded-lg bg-slate-700 px-4 py-2 text-xs">Avbryt</button></div></div>}
             {routines.length === 0 && <p className="text-xs text-slate-400">Inga rutiner skapade ännu.</p>}
             {routines.map(routine => <div key={routine.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-slate-900/60 p-3"><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{routine.name}</p><p className="text-xs text-slate-400">{routine.actions.length} åtgärder</p></div><button type="button" onClick={() => runRoutine(routine)} className="rounded-lg bg-cyan-700 px-3 py-2 text-xs">Kör</button><button type="button" onClick={() => editRoutine(routine)} className="rounded-lg bg-slate-700 p-2" aria-label={`Redigera ${routine.name}`}><Pencil size={15}/></button><button type="button" onClick={() => { if(window.confirm(`Ta bort rutinen ”${routine.name}”?`)) saveRoutines(routines.filter(r => r.id !== routine.id)); }} className="rounded-lg bg-rose-900/40 p-2" aria-label={`Ta bort ${routine.name}`}><Trash2 size={15}/></button></div>)}
           </section>
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
            {editingDeviceId && <div id="smarthem-device-editor" className="scroll-mt-6 space-y-3 rounded-xl border border-cyan-400/30 bg-slate-800/70 p-4">
              <h4 className="font-semibold">{editingDeviceId === "new" ? "Ny smart enhet" : "Redigera smart enhet"}</h4>
              <label className="block text-sm">Namn<input id="smarthem-device-name" maxLength={80} value={deviceName} onChange={event => setDeviceName(event.target.value)} placeholder="Exempel: Google Nest Vardagsrum" className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 p-2.5 outline-none focus:border-cyan-400"/></label>
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
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-slate-800/40 p-3">
              <FolderPlus size={17} className="text-cyan-300"/><label className="text-xs text-slate-300" htmlFor="new-smarthem-group">Ny enhetsgrupp</label>
              <input id="new-smarthem-group" maxLength={50} value={newGroupName} onChange={e=>setNewGroupName(e.target.value)} placeholder="Exempel: Vardagsrum TV" className="min-w-0 flex-1 rounded-lg border border-white/15 bg-slate-950 p-2 text-sm"/>
              <button type="button" disabled={!newGroupName.trim()} onClick={()=>{ const group=newGroupName.trim(); if(!group)return; setDeviceGroupFilter(group); setNewGroupName(""); }} className="rounded-lg bg-cyan-700 px-3 py-2 text-xs disabled:opacity-40">Välj grupp</button>
              <p className="w-full text-xs text-slate-400">En grupp sparas när du tilldelar minst en enhet till den. Grupper organiserar enheter, men styr dem inte gemensamt.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row"><label className="relative min-w-0 flex-1"><Search size={16} className="absolute left-3 top-3 text-slate-400"/><input type="search" value={deviceSearch} onChange={e => setDeviceSearch(e.target.value)} placeholder="Sök namn, rum, typ eller tillverkare…" aria-label="Sök smarta enheter" className="w-full rounded-lg border border-white/15 bg-slate-950 py-2.5 pl-9 pr-3 text-sm"/></label><select aria-label="Filtrera enhetskategori" value={deviceFilter} onChange={e => setDeviceFilter(e.target.value)} className="rounded-lg border border-white/15 bg-slate-950 px-3 py-2.5 text-sm"><option value="all">Alla typer</option><option value="favorites">Favoriter</option>{["Belysning","Media","Övervakning","El","Klimat"].map(c => <option key={c} value={c}>{c}</option>)}</select></div>
             <div className="flex flex-wrap gap-2"><select aria-label="Filtrera enhetsgrupp" value={deviceGroupFilter} onChange={e=>setDeviceGroupFilter(e.target.value)} className="rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm"><option value="all">Alla grupper</option><option value="ungrouped">Utan grupp</option>{knownGroups.map(g=><option key={g} value={g}>{g}</option>)}{deviceGroupFilter!=="all" && deviceGroupFilter!=="ungrouped" && !knownGroups.includes(deviceGroupFilter) && <option value={deviceGroupFilter}>{deviceGroupFilter} (ny)</option>}</select><select aria-label="Sortera smarta enheter" value={deviceSort} onChange={e=>setDeviceSort(e.target.value as typeof deviceSort)} className="rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm"><option value="name">Sortera: namn</option><option value="room">Sortera: rum</option><option value="type">Sortera: typ</option><option value="favorites">Sortera: favoriter först</option></select><button type="button" onClick={()=>setDeviceFilter(deviceFilter==="favorites"?"all":"favorites")} aria-pressed={deviceFilter==="favorites"} className="flex items-center gap-1 rounded-lg border border-amber-400/30 px-3 py-2 text-xs text-amber-200"><Star size={14}/> {deviceFilter==="favorites"?"Visa alla":"Endast favoriter"}</button></div>
             <p className="text-xs text-slate-400">Visar {filteredAdminDevices.length} av {devices.length} enheter</p>
             {devices.length > 0 && filteredAdminDevices.length === 0 && <p className="rounded-lg border border-white/10 p-3 text-sm text-slate-400">Inga enheter matchar sökningen eller filtret.</p>}
             <div className="grid gap-3 md:grid-cols-2">{filteredAdminDevices.map(device => {
              const selectedDevice = selectedId === device.id;
              return <article key={device.id} className={`rounded-xl border p-4 ${selectedDevice ? "border-cyan-400/60 bg-cyan-400/5" : "border-white/10 bg-slate-800/50"}`}>
                <button type="button" onClick={() => {setSelectedId(device.id);setPlacingDeviceId(null);}} className="flex w-full items-start gap-2 text-left">
                  <Zap size={18} className="mt-0.5 shrink-0 text-cyan-300"/>
                  <span className="min-w-0"><strong className="block truncate">{device.name}</strong><span className="text-xs text-slate-400">{categoryOf(device.type) ?? "Annan"} · {rooms.find(room => room.id === device.roomId)?.name ?? "Utan rum"} · {device.type}</span></span>
                </button>
                <div className="mt-3 flex flex-wrap items-center gap-2"><button type="button" onClick={()=>toggleFavorite(device.id)} aria-pressed={devicePrefs.favorites.includes(device.id)} className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs ${devicePrefs.favorites.includes(device.id)?"border-amber-400/50 text-amber-200":"border-white/15 text-slate-300"}`}><Star size={14} fill={devicePrefs.favorites.includes(device.id)?"currentColor":"none"}/>{devicePrefs.favorites.includes(device.id)?"Favorit":"Lägg till favorit"}</button><label className="text-xs text-slate-400">Grupp <select aria-label={`Grupp för ${device.name}`} value={devicePrefs.groups[device.id]??""} onChange={e=>assignGroup(device.id,e.target.value)} className="ml-1 rounded-lg border border-white/15 bg-slate-950 px-2 py-1.5 text-xs"><option value="">Ingen grupp</option>{knownGroups.map(g=><option key={g} value={g}>{g}</option>)}{deviceGroupFilter!=="all" && deviceGroupFilter!=="ungrouped" && !knownGroups.includes(deviceGroupFilter) && <option value={deviceGroupFilter}>{deviceGroupFilter}</option>}</select></label></div>
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
        {loaded && currentCategory === "El" && <div className="space-y-5">
          <section className="space-y-4 rounded-2xl border border-amber-400/20 bg-slate-900/70 p-4 sm:p-5" aria-label="Energiöversikt 2.0">
            <div><h2 className="flex items-center gap-2 text-lg font-semibold"><Zap size={20} className="text-amber-300"/>Energiöversikt 2.0</h2><p className="mt-1 text-xs text-slate-400">Sammanställning av manuellt angivna demovärden. Ingen automatisk mätning eller periodiserad förbrukning.</p></div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-xl bg-slate-950/60 p-3"><p className="text-xs text-slate-400">Sammanlagd effekt</p><p className="mt-1 text-xl font-semibold">{formatNumber(totalWatts)} W</p></div>
              <div className="rounded-xl bg-slate-950/60 p-3"><p className="text-xs text-slate-400">Registrerad energi</p><p className="mt-1 text-xl font-semibold">{formatNumber(totalKwh,2)} kWh</p></div>
              <div className="rounded-xl bg-slate-950/60 p-3"><p className="text-xs text-slate-400">Spotpris just nu</p><p className="mt-1 text-xl font-semibold">{currentSpotOre == null ? "Saknas" : `${formatNumber(currentSpotOre,1)} öre/kWh`}</p></div>
              <div className="rounded-xl bg-slate-950/60 p-3"><p className="text-xs text-slate-400">Effekt under en timme¹</p><p className="mt-1 text-xl font-semibold">{currentSpotOre == null ? "Saknas" : `${formatNumber(totalWatts / 1000 * currentSpotOre / 100,2)} kr`}</p></div>
            </div>
            <p className="text-[11px] text-slate-400">¹ Räkneexempel: nuvarande effekt antas vara konstant i en timme och aktuellt spotpris oförändrat. Exklusive moms, elskatt, nätavgifter och påslag.</p>
            {electricDevices.length > 0 && <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-slate-950/30 p-4"><h3 className="mb-3 text-sm font-semibold">Effekt per rum</h3><div className="space-y-3">{Array.from(new Set(electricDevices.map(d => d.roomId || ""))).map(roomId => { const group = electricDevices.filter(d => (d.roomId || "") === roomId); const watts = group.reduce((sum,d) => sum + (electricStates[d.id]?.watts ?? 0),0); const max = Math.max(1,totalWatts); return <div key={roomId || "other"}><div className="mb-1 flex justify-between gap-3 text-xs"><span>{rooms.find(r => r.id === roomId)?.name ?? "Utan rum"}</span><span>{formatNumber(watts)} W</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-700"><div className="h-full rounded-full bg-amber-400" style={{width:`${watts/max*100}%`}}/></div></div>; })}</div></div>
              <div className="rounded-xl border border-white/10 bg-slate-950/30 p-4"><h3 className="mb-3 text-sm font-semibold">Enheter efter aktuell effekt</h3><div className="space-y-2">{[...electricDevices].sort((a,b) => (electricStates[b.id]?.watts ?? 0) - (electricStates[a.id]?.watts ?? 0)).map(device => <div key={device.id} className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 text-xs"><span className="min-w-0 truncate">{device.name}<span className="ml-2 text-slate-500">{rooms.find(r=>r.id===device.roomId)?.name ?? "Utan rum"}</span></span><strong className="shrink-0">{formatNumber(electricStates[device.id]?.watts ?? 0)} W</strong></div>)}</div></div>
            </div>}
          </section>
          <p className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-xs text-amber-100">Demoläge: effekt och energi anges manuellt och är inte verkliga mätningar. Spotpriset för SE3 hämtas separat. Beräknad kostnad avser endast energi multiplicerad med aktuellt spotpris, exklusive moms, skatt, nätavgifter och påslag.</p>
          {visible.length === 0 && <p className="rounded-xl border border-white/10 bg-slate-800/50 p-4 text-sm text-slate-300">Inga elmätare registrerade. Lägg till en energimätare eller effektmätare under Smarthem → Administration.</p>}
          {Array.from(new Set(visible.map(device => device.roomId))).map(roomId => {
            const group = visible.filter(device => device.roomId === roomId);
            const room = rooms.find(item => item.id === roomId);
            return <section key={roomId || "utan-rum"} className="space-y-3"><h3 className="flex items-center gap-2 font-semibold"><Zap size={18} className="text-blue-300" />{room?.name ?? "Utan rum"}</h3>
              <div className="grid gap-3 lg:grid-cols-2">{group.map(device => {
                const state = electricStates[device.id] ?? DEFAULT_ELECTRIC;
                const history = electricHistory[device.id] ?? [];
                const isSelected = selectedId === device.id;
                const spot = overview?.electricity?.currentOrePerKwh;
                const cost = spot != null && Number.isFinite(spot) ? state.kwh * spot / 100 : null;
                const isPowerOnly = device.type.toLowerCase() === "power";
                return <article key={device.id} className={`rounded-xl border p-4 ${isSelected ? "border-blue-400/70 bg-blue-400/5" : "border-white/10 bg-slate-800/60"}`}>
                  <button type="button" onClick={() => setSelectedId(device.id)} aria-pressed={isSelected} className="flex w-full items-center justify-between gap-2 text-left"><span className="min-w-0 truncate font-semibold">{device.name}</span><span className="shrink-0 text-xs text-blue-200">{isSelected ? "Vald" : "Visa kontroller"}</span></button>
                  <p className="mt-1 text-xs text-slate-400">{isPowerOnly ? "Effektmätare" : "Energimätare"} · Demo</p>
                  <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-lg bg-slate-950/50 p-3"><p className="text-xs text-slate-400">Aktuell effekt</p><p className="mt-1 text-xl font-semibold">{formatNumber(state.watts)} W</p></div><div className="rounded-lg bg-slate-950/50 p-3"><p className="text-xs text-slate-400">Registrerad energi</p><p className="mt-1 text-xl font-semibold">{formatNumber(state.kwh,2)} kWh</p></div></div>
                  <div className="mt-3 rounded-lg border border-blue-400/15 bg-blue-400/5 p-3"><p className="text-xs text-slate-300">Uppskattad spotpriskostnad för registrerad energi</p><p className="mt-1 text-lg font-semibold text-blue-200">{cost === null ? "Elpris saknas" : `${formatNumber(cost,2)} kr`}</p><p className="mt-1 text-[11px] text-slate-400">{spot === null || spot === undefined ? "Aktuellt spotpris är inte tillgängligt." : `${formatNumber(spot,1)} öre/kWh · SE3 · enbart spotpris`}</p><p className="mt-1 text-[11px] text-slate-400">Inte en faktisk fakturakostnad eller historisk avräkning.</p></div>
                  {isSelected && <div className="mt-4 space-y-4 border-t border-white/10 pt-4"><p className="text-sm font-semibold">Simulera mätvärden</p>
                    <label className="block text-xs text-slate-300">Effekt (W)<input type="number" min="0" max="100000" step="10" value={state.watts} onChange={event => { const v=event.currentTarget.valueAsNumber; if (Number.isFinite(v)) changeElectric(device.id,{watts:v}); }} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 p-2.5"/></label>
                    <label className="block text-xs text-slate-300">Energi (kWh)<input type="number" min="0" max="10000000" step="0.1" value={state.kwh} onChange={event => { const v=event.currentTarget.valueAsNumber; if (Number.isFinite(v)) changeElectric(device.id,{kwh:v}); }} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950 p-2.5"/></label>
                    <button type="button" onClick={() => changeElectric(device.id,{},true)} className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold hover:bg-blue-600">Spara simulerad mätning</button>
                    <div><p className="mb-2 text-sm font-semibold">Energihistorik <span className="text-xs font-normal text-slate-400">({history.length} mätningar)</span></p><ElectricChart readings={history}/></div>
                  </div>}
                </article>;
              })}</div>
            </section>;
          })}
        </div>}
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
              {electricDevices.length === 0 ? <>
                <p className="mt-3 text-sm font-semibold text-slate-200">Inga elmätare registrerade</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-400">Lägg till elmätare under Smarthem → Administration.</p>
              </> : <>
                <p className="mt-3 text-2xl font-semibold text-blue-200">{formatNumber(totalKwh, 2)} kWh</p>
                <p className="mt-1 text-xs text-slate-300">Sammanlagd registrerad energi · {electricDevices.length} {electricDevices.length === 1 ? "mätare" : "mätare"}</p>
                <div className="mt-3 border-t border-white/10 pt-3">
                  <p className="text-xs text-slate-400">Sammanlagd aktuell effekt</p>
                  <p className="mt-1 text-lg font-semibold text-slate-100">{formatNumber(totalWatts)} W</p>
                </div>
                <div className="mt-3 border-t border-white/10 pt-3">
                  <p className="text-xs text-slate-400">Uppskattad kostnad vid aktuellt spotpris</p>
                  <p className="mt-1 text-lg font-semibold text-amber-100">{totalSpotCost === null ? "Elpris saknas" : `${formatNumber(totalSpotCost, 2)} kr`}</p>
                </div>
                <p className="mt-2 text-[11px] leading-4 text-slate-400">Demovärden från registrerade elmätare. Kostnaden bygger på aktuellt spotpris, exkl. skatt, nätavgift och påslag. Inte en faktisk fakturakostnad.</p>
              </>}
            </div>
          </div>
        </article>
      </section>
        </aside>
      </div>
    </main>
    <style jsx global>{`
      @media (max-width: 639px) {
        .smarthem-mobile { max-width: 100%; overflow-x: clip; }
        .smarthem-mobile button, .smarthem-mobile select { touch-action: manipulation; }
        .smarthem-mobile input:not([type="range"]):not([type="checkbox"]),
        .smarthem-mobile select, .smarthem-mobile textarea { font-size: 16px; max-width: 100%; }
        .smarthem-mobile .smarthem-model > * { max-width: 100%; }
        .smarthem-mobile .smarthem-model canvas { max-width: 100%; touch-action: pan-y; }
        .smarthem-mobile section { min-width: 0; }
      }
    `}</style>
  </div>;
}
