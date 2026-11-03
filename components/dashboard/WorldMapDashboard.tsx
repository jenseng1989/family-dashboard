"use client";

import { Canvas, ThreeEvent, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Html, OrbitControls, Stars } from "@react-three/drei";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Activity, AlertCircle, Clock3, ExternalLink, Flame, Globe2, LoaderCircle, MousePointer2, RotateCcw, ZoomIn, ListFilter, MapPin, X } from "lucide-react";
import * as THREE from "three";

const EARTH_TEXTURE = "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg";
const USGS_FEED = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";
const REFRESH_MS = 5 * 60 * 1000;

type Quake = { id: string; magnitude: number; place: string; time: number; longitude: number; latitude: number; depth: number; url: string };
type Volcano = { name: string; country: string; latitude: number; longitude: number; eruptionStart: string; lastKnownActivity: string; eruptionType: string; url: string };
type VolcanoResponse = { volcanoes?: Volcano[]; source?: string; sourceUrl?: string; total?: number; stale?: boolean };
type Feature = { id?: string; properties?: { mag?: number | null; place?: string; time?: number; url?: string }; geometry?: { coordinates?: number[] } };

function parseQuakes(value: unknown): Quake[] {
  if (!value || typeof value !== "object" || !("features" in value)) throw new Error("Ogiltigt svar från USGS");
  const features = (value as { features?: unknown }).features;
  if (!Array.isArray(features)) throw new Error("USGS skickade ingen händelselista");
  return (features as Feature[]).flatMap((feature) => {
    const p = feature.properties;
    const c = feature.geometry?.coordinates;
    if (!feature.id || !p || !c || c.length < 3 || !Number.isFinite(p.mag) || !Number.isFinite(c[0]) || !Number.isFinite(c[1]) || !Number.isFinite(p.time)) return [];
    return [{ id: feature.id, magnitude: p.mag as number, place: p.place || "Okänd plats", time: p.time as number, longitude: c[0], latitude: c[1], depth: c[2], url: p.url || "" }];
  }).sort((a, b) => b.time - a.time);
}

function coordinates(lat: number, lon: number, radius = 2.035): [number, number, number] {
  const latitude = THREE.MathUtils.degToRad(lat);
  const longitude = THREE.MathUtils.degToRad(lon);
  return [radius * Math.cos(latitude) * Math.cos(longitude), radius * Math.sin(latitude), -radius * Math.cos(latitude) * Math.sin(longitude)];
}

function magnitudeColor(magnitude: number) { return magnitude >= 5 ? "#ef4444" : magnitude >= 3 ? "#fb923c" : "#facc15"; }
function dateTime(value: number) { return new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium", timeStyle: "short" }).format(value); }

function MapPopup({ quake, volcano, onClose }: { quake: Quake | null; volcano: Volcano | null; onClose: () => void }) {
  return (
    <div onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()} className="w-[min(210px,calc(100vw-64px))] rounded-xl border border-cyan-400/40 bg-[#0b172b]/95 p-2.5 text-left text-slate-200 shadow-[0_8px_24px_rgba(0,0,0,0.55)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-xs font-bold text-white">{quake ? "Jordbävning" : "Vulkan"}</h3>
        <button type="button" onClick={onClose} aria-label="Stäng information" className="-mr-1 -mt-1 rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"><X size={14} /></button>
      </div>
      {quake && <div className="mt-1.5 space-y-1 text-[11px] leading-snug">
        <p className="text-lg font-bold" style={{ color: magnitudeColor(quake.magnitude) }}>M {quake.magnitude.toFixed(1)}</p>
        <p className="text-xs font-semibold text-white">{quake.place}</p>
        <p>Tid: {dateTime(quake.time)}</p>
        <p>Djup: {quake.depth.toFixed(1)} km</p>
        <p className="text-slate-400">{quake.latitude.toFixed(3)}°, {quake.longitude.toFixed(3)}°</p>
        {quake.url.startsWith("https://earthquake.usgs.gov/") && <a href={quake.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-cyan-300 hover:underline">Visa hos USGS <ExternalLink size={12} /></a>}
      </div>}
      {volcano && <div className="mt-1.5 space-y-1 text-[11px] leading-snug">
        <p className="text-sm font-bold text-rose-300">{volcano.name}</p>
        <p className="font-semibold text-white">{volcano.country}</p>
        {volcano.lastKnownActivity && <p>Rapporterad aktivitet: {volcano.lastKnownActivity}</p>}
        {volcano.eruptionStart && <p>Rapporterad start: {volcano.eruptionStart}</p>}
        {volcano.eruptionType && <p>Typ: {volcano.eruptionType}</p>}
        <p className="text-slate-400">{volcano.latitude.toFixed(3)}°, {volcano.longitude.toFixed(3)}°</p>
        <p className="text-slate-400">Rapporterad aktivitet innebär inte nödvändigtvis ett pågående utbrott.</p>
        {volcano.url?.startsWith("https://") && <a href={volcano.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-cyan-300 hover:underline">Mer information <ExternalLink size={12} /></a>}
      </div>}
    </div>
  );
}

// Håller markörernas synliga storlek under kontroll vid inzoomning.
// När kameran kommer närmare krymper markörernas faktiska 3D-storlek.
function ZoomAwareMarker({ position, children, onClick }: {
  position: [number, number, number];
  children: ReactNode;
  onClick: (event: ThreeEvent<MouseEvent>) => void;
}) {
  const marker = useRef<THREE.Group>(null);
  const { camera } = useThree();
  useFrame(() => {
    if (!marker.current) return;
    const distance = camera.position.length();
    // Vid standardavstånd (6,6) används ursprunglig storlek.
    // När man zoomar in minskar storleken tydligt, utan att markören försvinner.
    const scale = THREE.MathUtils.clamp(Math.pow(distance / 6.6, 1.7), 0.28, 1);
    marker.current.scale.setScalar(scale);
  });
  return <group ref={marker} position={position} onClick={onClick}>{children}</group>;
}

function Earth({ quakes, volcanoes, selectedId, selectedVolcano, onSelect, onSelectVolcano, onClose }: { quakes: Quake[]; volcanoes: Volcano[]; selectedId: string | null; selectedVolcano: string | null; onSelect: (id: string) => void; onSelectVolcano: (id: string) => void; onClose: () => void }) {
  const map = useLoader(THREE.TextureLoader, EARTH_TEXTURE);
  const group = useRef<THREE.Group>(null);
  const earthMesh = useRef<THREE.Mesh>(null);
  const activeQuake = quakes.find(q => q.id === selectedId) ?? null;
  const activeVolcano = volcanoes.find(v => `${v.name}-${v.country}` === selectedVolcano) ?? null;
  useFrame((_, delta) => { if (group.current && !activeQuake && !activeVolcano) group.current.rotation.y += delta * 0.012; });
  return (
    <group ref={group}>
      <mesh ref={earthMesh}><sphereGeometry args={[2, 96, 64]} /><meshStandardMaterial map={map} roughness={0.94} metalness={0} /></mesh>
      <mesh><sphereGeometry args={[2.04, 96, 64]} /><meshBasicMaterial color="#4da7ff" transparent opacity={0.055} side={THREE.BackSide} depthWrite={false} /></mesh>
      {volcanoes.map((volcano) => {
        const key = `${volcano.name}-${volcano.country}`;
        const selected = selectedVolcano === key;
        return <ZoomAwareMarker key={`volcano-${key}`} position={coordinates(volcano.latitude, volcano.longitude)} onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onSelectVolcano(key); }}>
          <mesh>
          <coneGeometry args={[selected ? 0.085 : 0.06, selected ? 0.17 : 0.12, 10]} />
          <meshBasicMaterial color={selected ? "#ffffff" : "#f43f5e"} depthTest />
          </mesh>
        </ZoomAwareMarker>;
      })}
      {(activeQuake || activeVolcano) && (
        <Html
          position={coordinates((activeQuake?.latitude ?? activeVolcano!.latitude), (activeQuake?.longitude ?? activeVolcano!.longitude), 2.23)}
          center
          distanceFactor={3}
          occlude={earthMesh.current ? [earthMesh] : undefined}
          zIndexRange={[30, 0]}
        >
          <MapPopup quake={activeQuake} volcano={activeVolcano} onClose={onClose} />
        </Html>
      )}
      {quakes.map((quake) => {
        const selected = quake.id === selectedId;
        const size = selected ? 0.064 : Math.max(0.024, Math.min(0.055, 0.018 + Math.max(0, quake.magnitude) * 0.006));
        return (
          <ZoomAwareMarker key={quake.id} position={coordinates(quake.latitude, quake.longitude)} onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onSelect(quake.id); }}>
            <mesh>
            <sphereGeometry args={[size, 10, 10]} />
            <meshBasicMaterial color={selected ? "#ffffff" : magnitudeColor(quake.magnitude)} depthTest={true} />
            </mesh>
          </ZoomAwareMarker>
        );
      })}
    </group>
  );
}

function CameraReset({ resetKey }: { resetKey: number }) {
  const { camera, controls } = useThree();
  const last = useRef(resetKey);
  useFrame(() => {
    if (last.current !== resetKey) {
      camera.position.set(0, 0.4, 6.6);
      camera.lookAt(0, 0, 0);
      if (controls && "reset" in controls && typeof controls.reset === "function") controls.reset();
      last.current = resetKey;
    }
  });
  return null;
}

export default function WorldMapDashboard() {
  const [resetKey, setResetKey] = useState(0);
  const [quakes, setQuakes] = useState<Quake[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [minimumMagnitude, setMinimumMagnitude] = useState(2.5);
  const [showQuakes, setShowQuakes] = useState(true);
  const [showVolcanoes, setShowVolcanoes] = useState(true);
  const [volcanoes, setVolcanoes] = useState<Volcano[]>([]);
  const [volcanoTotal, setVolcanoTotal] = useState<number | null>(null);
  const [volcanoSource, setVolcanoSource] = useState<string | null>(null);
  const [volcanoSourceUrl, setVolcanoSourceUrl] = useState<string | null>(null);
  const [volcanoError, setVolcanoError] = useState<string | null>(null);
  const [volcanoLoading, setVolcanoLoading] = useState(true);
  const [volcanoStale, setVolcanoStale] = useState(false);
  const [selectedVolcano, setSelectedVolcano] = useState<string | null>(null);
  const [eventKind, setEventKind] = useState<"all" | "quake" | "volcano">("all");
  const [eventSearch, setEventSearch] = useState("");
  const [volcanoActivityOnly, setVolcanoActivityOnly] = useState(false);


  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(USGS_FEED, { signal, cache: "no-store" });
      if (!response.ok) throw new Error(`USGS svarade med HTTP ${response.status}`);
      const parsed = parseQuakes(await response.json());
      if (signal?.aborted) return;
      setQuakes(parsed);
      setUpdatedAt(Date.now());
      setError(null);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : "Det gick inte att hämta jordbävningar");
    } finally { if (!signal?.aborted) setLoading(false); }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const interval = window.setInterval(() => void load(controller.signal), REFRESH_MS);
    return () => { controller.abort(); window.clearInterval(interval); };
  }, [load]);

  useEffect(() => {
    const controller = new AbortController();
    const loadVolcanoes = async () => {
      try {
        const response = await fetch("/api/volcanoes", { signal: controller.signal });
        if (!response.ok) throw new Error(`Vulkankällan svarade med HTTP ${response.status}`);
        const data: VolcanoResponse = await response.json();
        if (!Array.isArray(data.volcanoes)) throw new Error("Vulkankällan returnerade ingen lista");
        if (controller.signal.aborted) return;
        setVolcanoes(data.volcanoes.filter(v => Number.isFinite(v.latitude) && Number.isFinite(v.longitude)));
        setVolcanoTotal(typeof data.total === "number" ? data.total : null);
        setVolcanoSource(data.source ?? null);
        setVolcanoSourceUrl(data.sourceUrl ?? null);
        setVolcanoStale(Boolean(data.stale));
        setVolcanoError(null);
      } catch (err) {
        if (!controller.signal.aborted) setVolcanoError(err instanceof Error ? err.message : "Kunde inte hämta vulkaner");
      } finally { if (!controller.signal.aborted) setVolcanoLoading(false); }
    };
    void loadVolcanoes();
    const interval = window.setInterval(() => void loadVolcanoes(), 60 * 60 * 1000);
    return () => { controller.abort(); window.clearInterval(interval); };
  }, []);

  const visibleQuakes = useMemo(() => quakes.filter(q => q.magnitude >= minimumMagnitude), [quakes, minimumMagnitude]);
  const visibleVolcanoes = useMemo(() => volcanoes.filter(v => !volcanoActivityOnly || Boolean(v.lastKnownActivity?.trim() || v.eruptionStart?.trim())), [volcanoes, volcanoActivityOnly]);
  const eventList = useMemo(() => {
    const term = eventSearch.trim().toLocaleLowerCase("sv-SE");
    const earthquakeEvents = showQuakes && eventKind !== "volcano" ? visibleQuakes.map(q => ({ kind: "quake" as const, key: q.id, label: q.place, detail: `M ${q.magnitude.toFixed(1)} · ${dateTime(q.time)}`, time: q.time, magnitude: q.magnitude })) : [];
    const volcanoEvents = showVolcanoes && eventKind !== "quake" ? visibleVolcanoes.map(v => ({ kind: "volcano" as const, key: `${v.name}-${v.country}`, label: v.name, detail: `${v.country}${v.lastKnownActivity ? ` · ${v.lastKnownActivity}` : ""}`, time: 0, magnitude: 0 })) : [];
    return [...earthquakeEvents, ...volcanoEvents]
      .filter(item => !term || `${item.label} ${item.detail}`.toLocaleLowerCase("sv-SE").includes(term))
      .sort((a, b) => b.time - a.time || a.label.localeCompare(b.label, "sv-SE"));
  }, [eventSearch, eventKind, showQuakes, showVolcanoes, visibleQuakes, visibleVolcanoes]);
  const strongest = useMemo(() => quakes.reduce<Quake | null>((best, q) => !best || q.magnitude > best.magnitude ? q : best, null), [quakes]);

  return (
    <section className="w-full min-w-0 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300"><Globe2 size={16} /> Utforska världen</div>
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Världskarta</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">Aktuella jordbävningar och rapporterad vulkanaktivitet på en interaktiv jordglob.</p>
        </div>
        <button type="button" onClick={() => setResetKey(v => v + 1)} className="flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-semibold text-slate-200 hover:bg-white/10"><RotateCcw size={16} /> Återställ vy</button>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="relative h-[min(72vh,720px)] min-h-[420px] min-w-0 overflow-hidden rounded-[1.75rem] border border-cyan-300/15 bg-[#030b19] shadow-2xl shadow-black/30">
          <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(3,11,25,.38)_100%)]" />
          <Canvas camera={{ position: [0, 0.4, 6.6], fov: 44 }} dpr={[1, 1.8]} gl={{ antialias: true }}>
            <color attach="background" args={["#030b19"]} />
            <ambientLight intensity={1.25} />
            <directionalLight position={[5, 3, 5]} intensity={2.3} color="#ffffff" />
            <directionalLight position={[-4, -1, -3]} intensity={0.5} color="#3a84ff" />
            <Stars radius={75} depth={40} count={1700} factor={3} saturation={0} fade speed={0.25} />
            <Suspense fallback={<mesh><sphereGeometry args={[2, 48, 32]} /><meshStandardMaterial color="#16436a" /></mesh>}>
              <Earth quakes={showQuakes ? visibleQuakes : []} volcanoes={showVolcanoes ? visibleVolcanoes : []} selectedId={selectedId} selectedVolcano={selectedVolcano} onSelect={(id) => { setSelectedId(id); setSelectedVolcano(null); }} onSelectVolcano={(id) => { setSelectedVolcano(id); setSelectedId(null); }} onClose={() => { setSelectedId(null); setSelectedVolcano(null); }} />
            </Suspense>
            <OrbitControls makeDefault enablePan={false} minDistance={3.1} maxDistance={12} enableDamping dampingFactor={0.07} rotateSpeed={0.6} zoomSpeed={0.8} />
            <CameraReset resetKey={resetKey} />
          </Canvas>
          <div className="pointer-events-none absolute bottom-4 left-4 z-20 flex flex-wrap gap-2 text-xs text-slate-200">
            <span className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0b172b]/85 px-3 py-2 backdrop-blur"><MousePointer2 size={14} /> Dra för att rotera</span>
            <span className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0b172b]/85 px-3 py-2 backdrop-blur"><ZoomIn size={14} /> Zooma för att utforska</span>
          </div>
          <div className="pointer-events-none absolute left-4 top-4 z-20 rounded-xl border border-white/10 bg-[#0b172b]/90 px-3 py-2 text-xs text-slate-200 backdrop-blur">
            <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Jordbävningar: senaste 24 h · Vulkaner: rapporterad aktivitet</span>
          </div>
        </div>

        <aside className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-[#0b172b] p-4 text-slate-200">
            <div className="mb-3 flex items-center gap-2 font-semibold text-cyan-300"><Activity size={17} /> Jordbävningar</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-white/5 p-3"><div className="text-xs text-slate-400">Senaste dygnet</div><div className="mt-1 text-2xl font-bold text-white">{loading ? "…" : quakes.length}</div></div>
              <div className="rounded-xl bg-white/5 p-3"><div className="text-xs text-slate-400">Största magnitud</div><div className="mt-1 text-2xl font-bold text-white">{strongest ? strongest.magnitude.toFixed(1) : "–"}</div></div>
            </div>
            <label className="mt-4 block text-xs font-semibold text-slate-300" htmlFor="quake-filter">Minsta magnitud</label>
            <select id="quake-filter" value={minimumMagnitude} onChange={e => { setMinimumMagnitude(Number(e.target.value)); setSelectedId(null); }} className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-[#15243a] px-3 text-sm text-white">
              <option value={0}>Alla (M 0+)</option><option value={2.5}>M 2,5+</option><option value={4}>M 4,0+</option><option value={5}>M 5,0+</option>
            </select>
            <div className="mt-3 text-xs text-slate-400">{showQuakes ? visibleQuakes.length : 0} jordbävningsmarkörer på globen</div>
            {loading && <p className="mt-3 flex items-center gap-2 text-xs text-slate-400"><LoaderCircle size={14} className="animate-spin" /> Hämtar aktuella händelser…</p>}
            {error && <p role="alert" className="mt-3 flex items-start gap-2 text-xs text-amber-300"><AlertCircle size={15} className="shrink-0" /> {error}. {quakes.length > 0 ? "Visar senast hämtade data." : "Försök igen senare."}</p>}
            {updatedAt && <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><Clock3 size={13} /> Hämtat {dateTime(updatedAt)}</p>}
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0b172b] p-4 text-slate-200">
            <div className="mb-3 flex items-center gap-2 font-semibold text-rose-300"><Flame size={17} /> Vulkaner</div>
            <p className="text-sm text-slate-300">{volcanoLoading ? "Hämtar vulkaner…" : `${volcanoes.length} markörer · ${volcanoTotal ?? "–"} rapporterade i källan`}</p>
            <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs text-slate-300"><input type="checkbox" className="mt-0.5" checked={volcanoActivityOnly} onChange={e => { setVolcanoActivityOnly(e.target.checked); setSelectedVolcano(null); }} /> Endast vulkaner med angiven aktivitetsinformation</label>
            <p className="mt-2 text-xs text-slate-500">{showVolcanoes ? visibleVolcanoes.length : 0} vulkanmarkörer på globen.</p>
            <p className="mt-1 text-xs text-slate-500">Appens befintliga vulkan-API visar högst 12 vulkaner, utvalda efter avstånd från Göteborg. Kartan är därför inte en komplett global vulkanöversikt.</p>
            {volcanoSource && <p className="mt-2 text-xs text-slate-400">Källa: {volcanoSource}{volcanoStale ? " (sparade uppgifter)" : ""}</p>}
            {volcanoSourceUrl?.startsWith("https://") && <a href={volcanoSourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-cyan-300 hover:underline">Visa källa <ExternalLink size={12} /></a>}
            {volcanoError && <p role="alert" className="mt-2 text-xs text-amber-300">{volcanoError}</p>}
            <div className="mt-4 space-y-2 border-t border-white/10 pt-3 text-sm">
              <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={showQuakes} onChange={e => { setShowQuakes(e.target.checked); setSelectedId(null); }} /> Visa jordbävningar</label>
              <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={showVolcanoes} onChange={e => { setShowVolcanoes(e.target.checked); setSelectedVolcano(null); }} /> Visa vulkaner</label>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0b172b] p-4 text-slate-200">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-semibold text-white"><ListFilter size={17} className="text-cyan-300" /> Händelser</h3>
              <span className="text-xs text-slate-400">{eventList.length} träffar</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-white/5 p-1" aria-label="Typ av händelse">
              {([ ["all", "Alla"], ["quake", "Skalv"], ["volcano", "Vulkaner"] ] as const).map(([kind, label]) => (
                <button key={kind} type="button" aria-pressed={eventKind === kind} onClick={() => setEventKind(kind)} className={`min-h-9 rounded-lg px-1 text-xs font-semibold transition ${eventKind === kind ? "bg-cyan-500/20 text-cyan-200" : "text-slate-400 hover:bg-white/10"}`}>{label}</button>
              ))}
            </div>
            <label htmlFor="world-events-search" className="sr-only">Sök händelser</label>
            <input id="world-events-search" value={eventSearch} onChange={e => setEventSearch(e.target.value)} placeholder="Sök plats, land eller vulkan…" className="mt-3 min-h-10 w-full rounded-xl border border-white/15 bg-[#15243a] px-3 text-sm text-white placeholder:text-slate-500" />
            <div className="mt-3 max-h-[340px] space-y-2 overflow-y-auto pr-1">
              {eventList.slice(0, 50).map(item => {
                const active = item.kind === "quake" ? selectedId === item.key : selectedVolcano === item.key;
                return <button type="button" key={`${item.kind}-${item.key}`} aria-pressed={active} onClick={() => { if (item.kind === "quake") { setSelectedId(item.key); setSelectedVolcano(null); } else { setSelectedVolcano(item.key); setSelectedId(null); } }} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${active ? "border-cyan-400/60 bg-cyan-400/10" : "border-transparent bg-white/5 hover:bg-white/10"}`}>
                  <span className="mt-0.5 shrink-0"><MapPin size={17} color={item.kind === "quake" ? magnitudeColor(item.magnitude) : "#fb7185"} /></span>
                  <span className="min-w-0"><span className="block text-sm font-medium text-white">{item.label}</span><span className="mt-1 block text-xs text-slate-400">{item.detail}</span></span>
                </button>;
              })}
              {eventList.length > 50 && <p className="py-2 text-center text-xs text-slate-500">Visar de första 50 av {eventList.length} träffar.</p>}
              {!loading && !volcanoLoading && eventList.length === 0 && <p className="text-sm text-slate-400">Inga händelser matchar dina filter.</p>}
            </div>
          </div>

        </aside>
      </div>
      <p className="text-xs text-slate-500">U4 · Klicka på en markör för information direkt på kartan. Jordbävningar: USGS (var femte minut). Vulkaner: befintligt /api/volcanoes (hämtas varje timme; källa och urval kan variera). Markörer visar epicentrum, inte skakningarnas utbredning. Karttextur: Three.js exempelresurser.</p>
    </section>
  );
}
