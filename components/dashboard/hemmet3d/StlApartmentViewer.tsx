"use client";

import { Suspense, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { createHemmet3DBackup, parseHemmet3DBackup } from "@/lib/hemmet3d/backup";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { DoubleSide, OrthographicCamera } from "three";
import { tryControl, demoLightController, DEVICE_TYPES, DEMO_CONTROL_STATUS, ENTITY_MAPPING_LABELS, getEntityMappingStatus, validateHomeAssistantEntityId, inspectEntityMappings, createEntityMappingExport } from "@/lib/hemmet3d/device-control";
import type { DeviceType, LightScene, LightState, LightStates, LightUpdate, SmartDevice } from "@/lib/hemmet3d/device-control";

type PartName = "vaggar" | "dorrar" | "fonster" | "balkong" | "golv";
type Room = { id: string; name: string; x: number; z: number; area: string; notes: string };
const KEY = "family-dashboard:hemmet3d:rooms:v1";
const DEVICES_KEY = "family-dashboard:hemmet3d:devices:v1";
const SCENES_KEY = "family-dashboard:hemmet3d:light-scenes:v1";
const DEMO_LIGHTS_KEY = "family-dashboard:hemmet3d:demo-lights:v1";
// STL-filerna är konverterade till samma meterbaserade koordinatsystem som H1.8.
// Nya AutoCAD-modellen har golv 0–10 mm och övriga byggnadsdelar förskjutna +10 mm.
const PARTS: { key: PartName; title: string; file: string; color: string; opacity: number }[] = [
  { key: "vaggar", title: "Väggar", file: "/hemmet3d/vaggar.stl", color: "#d9e2e9", opacity: 1 },
  { key: "dorrar", title: "Dörrar", file: "/hemmet3d/dorrar.stl", color: "#c67b62", opacity: 1 },
  { key: "fonster", title: "Fönster", file: "/hemmet3d/fonster.stl", color: "#73c9ef", opacity: 0.55 },
  { key: "balkong", title: "Balkong", file: "/hemmet3d/balkong.stl", color: "#e8c55a", opacity: 0.85 },
  { key: "golv", title: "Golv", file: "/hemmet3d/golv.stl", color: "#a69b8a", opacity: 1 },
];

function ModelPart({ file, color, opacity }: { file: string; color: string; opacity: number }) {
  const geometry = useLoader(STLLoader, file);
  return <mesh geometry={geometry}>
    <meshStandardMaterial color={color} transparent={opacity < 1} opacity={opacity} side={DoubleSide} roughness={0.7} depthWrite={opacity === 1} />
  </mesh>;
}

// Kompakta markörer: etikett visas bara för markerat objekt.
function RoomMarker({ room, selected, onSelect, controlOpen, lights, onAllLights, onDimLights, onClose }: {
  room: Room; selected: boolean; onSelect: (id: string) => void; controlOpen: boolean;
  lights: { id: string; on: boolean; brightness: number }[];
  onAllLights: (roomId: string, on: boolean) => void;
  onDimLights: (roomId: string, brightness: number) => void;
  onClose: () => void;
}) {
  const lit = lights.filter(light => light.on).length;
  const brightness = lights.length ? Math.round(lights.reduce((sum, light) => sum + light.brightness, 0) / lights.length) : 65;
  return <group position={[room.x, 0.045, room.z]}>
    <mesh onClick={event => { event.stopPropagation(); onSelect(room.id); }}>
      <cylinderGeometry args={[0.34, 0.34, 0.045, 24]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
    {selected && <mesh position={[0, 0.035, 0]} raycast={() => {}}>
      <cylinderGeometry args={[0.28, 0.28, 0.012, 32]} />
      <meshBasicMaterial color="#fecaca" transparent opacity={0.75} depthTest={false} />
    </mesh>}
    <mesh onClick={event => { event.stopPropagation(); onSelect(room.id); }}>
      <cylinderGeometry args={[0.21, 0.21, 0.025, 24]} />
      <meshStandardMaterial color="#ef4444" depthTest={false} />
    </mesh>
    {controlOpen ? <Html center position={[0, 0.42, 0]} zIndexRange={[100, 0]}>
      <div onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()} onWheel={event => event.stopPropagation()} className="w-56 rounded-xl border border-red-400/40 bg-slate-950/95 p-3 text-white shadow-2xl sm:w-64" role="dialog" aria-label={`Rumskontroll för ${room.name}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0"><div className="truncate text-sm font-semibold">🏠 {room.name}</div><div className="text-xs text-slate-400">{lit} av {lights.length} lampor tända</div></div>
          <button type="button" onClick={onClose} aria-label="Stäng rumskontrollen" className="rounded-md border border-white/20 px-2 text-sm">×</button>
        </div>
        {lights.length ? <div className="mt-3 space-y-3">
          <div className="flex gap-2">
            <button type="button" onClick={() => onAllLights(room.id, true)} className="flex-1 rounded-lg bg-amber-400 px-2 py-1.5 text-xs font-semibold text-slate-950">Tänd alla</button>
            <button type="button" onClick={() => onAllLights(room.id, false)} className="flex-1 rounded-lg bg-slate-700 px-2 py-1.5 text-xs font-semibold">Släck alla</button>
          </div>
          <label className="block text-xs"><span className="mb-1 flex justify-between"><span>Gemensam ljusstyrka</span><span>{brightness} %</span></span>
            <input type="range" min={1} max={100} step={1} value={brightness} onChange={event => onDimLights(room.id, Number(event.target.value))} className="w-full accent-amber-400" />
          </label>
          <p className="text-[10px] text-slate-400">Dimring ändrar alla lampors nivå, även släckta lampor. Släckta lampor förblir släckta.</p>
        </div> : <p className="mt-3 text-xs text-slate-400">Inga lampor är kopplade till rummet. Välj rum för lamporna under Administrera Smarthem.</p>}
        <p className="mt-2 text-[10px] text-slate-400">Demo – ingen fysisk styrning</p>
      </div>
    </Html> : selected && <Html center position={[0, 0.19, 0]} style={{ pointerEvents: "none" }}>
      <span className="whitespace-nowrap rounded-md bg-red-500 px-1.5 py-0.5 text-[11px] font-semibold text-white shadow">{room.name}</span>
    </Html>}
  </group>;
}

function DeviceMarker({ device, selected, onSelect, lightOn, lightBrightness, onLightChange, onClose, roomName }: {
  device: SmartDevice; selected: boolean; onSelect: (id: string) => void;
  lightOn: boolean; lightBrightness: number;
  onLightChange: (id: string, update: LightUpdate) => void;
  onClose: () => void; roomName: string;
}) {
  const symbol = DEVICE_TYPES.find(item => item.value === device.type)?.symbol || "⌂";
  const isOffLight = device.type === "light" && !lightOn;
  return <group position={[device.x, 0.09, device.z]}>
    {/* Visuell demoindikator: ingen verklig ljuskälla eller fysisk styrning. */}
    {device.type === "light" && lightOn && <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.055, 0]} raycast={() => {}}>
        <ringGeometry args={[0.25, 0.30 + (lightBrightness / 100) * 0.35, 48]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.12 + (lightBrightness / 100) * 0.28} depthWrite={false} depthTest={false} side={DoubleSide}/>
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.058, 0]} raycast={() => {}}>
        <circleGeometry args={[0.28 + (lightBrightness / 100) * 0.34, 48]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.035 + (lightBrightness / 100) * 0.075} depthWrite={false} depthTest={false} side={DoubleSide}/>
      </mesh>
    </group>}
    <mesh onClick={event => { event.stopPropagation(); onSelect(device.id); }}>
      <cylinderGeometry args={[0.35, 0.35, 0.055, 24]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
    {selected && <mesh position={[0, 0.04, 0]} raycast={() => {}}>
      <cylinderGeometry args={[0.30, 0.30, 0.012, 32]} />
      <meshBasicMaterial color="#fde68a" transparent opacity={0.85} depthTest={false} />
    </mesh>}
    <mesh onClick={event => { event.stopPropagation(); onSelect(device.id); }}>
      <cylinderGeometry args={[0.23, 0.23, 0.035, 24]} />
      <meshStandardMaterial color={isOffLight ? "#94a3b8" : "#fbbf24"} depthTest={false}/>
    </mesh>
    {selected && <Html position={[0, 0.42, 0]} center zIndexRange={[100, 0]}>
      <div onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()} onWheel={event => event.stopPropagation()} className="w-56 rounded-xl border border-amber-400/40 bg-slate-950/95 p-3 text-white shadow-2xl sm:w-64" role="dialog" aria-label={`Demokontroll för ${device.name}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0"><div className="truncate text-sm font-semibold">{symbol} {device.name}</div><div className="truncate text-xs text-slate-400">{roomName}</div></div>
          <button type="button" onClick={onClose} aria-label="Stäng kontrollpanelen" className="rounded-md border border-white/20 px-2 text-sm">×</button>
        </div>
        {device.type === "light" ? <div className="mt-3 space-y-3">
          <div className="flex gap-2">
            <button type="button" aria-pressed={lightOn} onClick={() => onLightChange(device.id, { on: true })} className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold ${lightOn ? "bg-amber-400 text-slate-950" : "bg-slate-700"}`}>Tänd</button>
            <button type="button" aria-pressed={!lightOn} onClick={() => onLightChange(device.id, { on: false })} className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold ${!lightOn ? "bg-amber-400 text-slate-950" : "bg-slate-700"}`}>Släck</button>
          </div>
          <label className="block text-xs"><span className="mb-1 flex justify-between"><span>Ljusstyrka</span><span>{lightBrightness} %</span></span>
            <input type="range" min={1} max={100} step={1} value={lightBrightness} disabled={!lightOn} onChange={event => onLightChange(device.id, { brightness: Number(event.target.value) })} className="w-full accent-amber-400 disabled:opacity-40" />
          </label>
          <p className="text-[10px] text-slate-400">Demo – ingen fysisk styrning</p>
        </div> : <p className="mt-3 text-xs text-slate-400">Inga demoreglage för denna enhetstyp.</p>}
      </div>
    </Html>}
  </group>;
}

// Anpassar 2D-kameran till modellens hela utbredning, även på mobil.
function FitTopCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    if (!(camera instanceof OrthographicCamera) || !size.width || !size.height) return;
    const aspect = size.width / size.height;
    const halfHeight = Math.max(7.8, 5.2 / aspect);
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.zoom = 1;
    camera.position.set(0, 22, 0.001);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
}

function Scene({ shown, topView, rooms, selectedId, placing, onPlace, onSelect, devices, showDevices, selectedDeviceId, onSelectDevice, devicePlacing, onPlaceDevice, demoLights, controlDeviceId, onLightChange, onCloseControl, roomNames, controlRoomId, onAllRoomLights, onDimRoomLights, onCloseRoom }: {
  shown: Record<PartName, boolean>; topView: boolean; rooms: Room[]; selectedId: string | null;
  placing: boolean; onPlace: (x: number, z: number) => void; onSelect: (id: string) => void;
  devices: SmartDevice[]; showDevices: boolean; selectedDeviceId: string | null;
  onSelectDevice: (id: string) => void; devicePlacing: boolean; onPlaceDevice: (x: number, z: number) => void;
  demoLights: LightStates;
  controlDeviceId: string | null; onLightChange: (id: string, update: LightUpdate) => void; onCloseControl: () => void; roomNames: Record<string, string>;
  controlRoomId: string | null; onAllRoomLights: (roomId: string, on: boolean) => void; onDimRoomLights: (roomId: string, brightness: number) => void; onCloseRoom: () => void;
}) {
  return <>
    {topView && <FitTopCamera/>}
    <color attach="background" args={["#101b2d"]}/>
    <ambientLight intensity={1.35}/>
    <directionalLight position={[6, 14, 7]} intensity={2.2}/>

    <gridHelper args={[20, 20, "#334155", "#1e293b"]} position={[0, -0.025, 0]}/>
    <Suspense fallback={null}>
      {PARTS.filter(part => shown[part.key]).map(part => <ModelPart key={part.key} file={part.file} color={part.color} opacity={part.opacity}/>)}
    </Suspense>
    {rooms.map(room => <RoomMarker key={room.id} room={room} selected={selectedId === room.id} onSelect={onSelect} controlOpen={controlRoomId === room.id} lights={devices.filter(device => device.type === "light" && device.roomId === room.id).map(device => ({ id: device.id, on: demoLights[device.id]?.on ?? false, brightness: demoLights[device.id]?.brightness ?? 65 }))} onAllLights={onAllRoomLights} onDimLights={onDimRoomLights} onClose={onCloseRoom}/>)}
    {showDevices && devices.map(device => <DeviceMarker key={device.id} device={device} selected={device.id === controlDeviceId} onSelect={onSelectDevice} lightOn={demoLights[device.id]?.on ?? false} lightBrightness={demoLights[device.id]?.brightness ?? 65} onLightChange={onLightChange} onClose={onCloseControl} roomName={roomNames[device.roomId] || "Inget rum valt"}/>)}
    {devicePlacing && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onPlaceDevice(event.point.x, event.point.z); }}>
      <planeGeometry args={[9.0, 13.0]}/>
      <meshBasicMaterial transparent opacity={0.12} color="#fbbf24" side={DoubleSide} depthWrite={false}/>
    </mesh>}
    {placing && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.022, 0]} onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onPlace(event.point.x, event.point.z); }}>
      <planeGeometry args={[9.0, 13.0]}/>
      <meshBasicMaterial transparent opacity={0.10} color="#22d3ee" side={DoubleSide} depthWrite={false}/>
    </mesh>}
    <OrbitControls makeDefault target={[0, 0.8, 0]} enableDamping minDistance={3} maxDistance={35} maxPolarAngle={topView ? 0.001 : Math.PI / 2.05} enableRotate={!topView}/>
  </>;
}

export default function StlApartmentViewer() {
  const [shown, setShown] = useState<Record<PartName, boolean>>({ vaggar: true, dorrar: true, fonster: true, balkong: true, golv: true });
  const [topView, setTopView] = useState(true);
  const [cameraReset, setCameraReset] = useState(0);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [adminExpanded, setAdminExpanded] = useState(false);
  const [roomsExpanded, setRoomsExpanded] = useState(true);
  const [devicesExpanded, setDevicesExpanded] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftArea, setDraftArea] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [devices, setDevices] = useState<SmartDevice[]>([]);
  const [showDevices, setShowDevices] = useState(true);
  const [placingDevice, setPlacingDevice] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState("");
  const [deviceType, setDeviceType] = useState<DeviceType>("light");
  const [deviceRoom, setDeviceRoom] = useState("");
  const [deviceManufacturer, setDeviceManufacturer] = useState("");
  const [deviceEntityId, setDeviceEntityId] = useState("");
  const [deviceSearch, setDeviceSearch] = useState("");
  const [deviceRoomFilter, setDeviceRoomFilter] = useState("all");
  // Endast demonstrationsläge: tillstånden lagras i minnet och skickas aldrig till lampor.
  const [demoLights, setDemoLights] = useState<LightStates>({});
  const [controlError, setControlError] = useState<string | null>(null);
  const [controlDeviceId, setControlDeviceId] = useState<string | null>(null);
  const [controlRoomId, setControlRoomId] = useState<string | null>(null);
  const [scenes, setScenes] = useState<LightScene[]>([]);
  const [sceneName, setSceneName] = useState("");
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [scenesLoaded, setScenesLoaded] = useState(false);
  const [demoLightsLoaded, setDemoLightsLoaded] = useState(false);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const lightDevices = devices.filter(device => device.type === "light");
  function saveScene() {
    const name = sceneName.trim();
    if (!name || !lightDevices.length) return;
    const lights: Record<string, LightState> = {};
    for (const device of lightDevices) lights[device.id] = { ...(demoLights[device.id] ?? { on: false, brightness: 65 }) };
    const scene: LightScene = { id: crypto.randomUUID(), name, lights };
    setScenes(previous => [...previous, scene]);
    setSceneName("");
    setActiveSceneId(scene.id);
  }
  // Gemensam styrfunktion. Inga nätverksanrop görs i demoläget.
  function runLightCommand(command: (current: LightStates) => LightStates) {
    setControlError(null);
    setDemoLights(previous => {
      const result = tryControl(previous, () => command(previous));
      if (!result.ok) console.error("Hemmet 3D – styrfel:", result.error);
      return result.lights;
    });
  }

  function updateAllLights(on: boolean) {
    if (!lightDevices.length) return;
    setActiveSceneId(null);
    runLightCommand(previous => demoLightController.updateRoom(previous, lightDevices.map(device => device.id), { on }));
  }

  function activateScene(scene: LightScene) {
    if (!scene.lights || typeof scene.lights !== "object") {
      setControlError("Ljusscenen har ogiltiga uppgifter och kunde inte aktiveras.");
      return;
    }
    setActiveSceneId(null);
    runLightCommand(previous => demoLightController.applyScene(
      previous, lightDevices.map(device => device.id), scene.lights
    ));
    setActiveSceneId(scene.id);
    setControlDeviceId(null);
    setControlRoomId(null);
  }
  function deleteScene(id: string) {
    setScenes(previous => previous.filter(scene => scene.id !== id));
    if (activeSceneId === id) setActiveSceneId(null);
  }
  function updateRoomLights(roomId: string, update: LightUpdate) {
    setActiveSceneId(null);
    const ids = devices.filter(device => device.type === "light" && device.roomId === roomId).map(device => device.id);
    if (!ids.length) {
      setControlError("Det finns inga lampor att styra i det valda rummet.");
      return;
    }
    runLightCommand(previous => demoLightController.updateRoom(previous, ids, update));
  }
  function updateDemoLight(id: string, update: LightUpdate) {
    setActiveSceneId(null);
    if (!devices.some(device => device.id === id && device.type === "light")) {
      setControlError("Lampan kunde inte hittas. Kontrollera enhetslistan.");
      return;
    }
    runLightCommand(previous => demoLightController.updateLight(previous, id, update));
  }

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(KEY) || "[]");
      if (Array.isArray(stored)) setRooms(stored.filter((item: Room) => item && typeof item.id === "string" && typeof item.x === "number" && typeof item.z === "number"));
    } catch { /* Keep an empty room list when saved data is invalid. */ }
    try {
      const stored = JSON.parse(window.localStorage.getItem(DEVICES_KEY) || "[]");
      if (Array.isArray(stored)) setDevices(stored.filter((item: SmartDevice) => item && typeof item.id === "string" && typeof item.x === "number" && typeof item.z === "number" && typeof item.name === "string"));
    } catch { /* Invalid device data: leave empty. */ }
    try {
      const stored = JSON.parse(window.localStorage.getItem(SCENES_KEY) || "[]");
      if (Array.isArray(stored)) setScenes(stored.filter((item: LightScene) => item && typeof item.id === "string" && typeof item.name === "string" && item.lights && typeof item.lights === "object"));
    } catch { /* Ogiltiga ljusscener ignoreras. */ }
    try {
      const stored: unknown = JSON.parse(window.localStorage.getItem(DEMO_LIGHTS_KEY) || "{}");
      if (stored && typeof stored === "object" && !Array.isArray(stored)) {
        const valid: LightStates = {};
        for (const [id, raw] of Object.entries(stored)) {
          if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
          const value = raw as Record<string, unknown>;
          if (typeof value.on !== "boolean" || typeof value.brightness !== "number" || !Number.isFinite(value.brightness)) continue;
          valid[id] = { on: value.on, brightness: Math.max(1, Math.min(100, Math.round(value.brightness))) };
        }
        setDemoLights(valid);
      }
    } catch { /* Ogiltig sparad lampstatus ignoreras. */ }
    setDemoLightsLoaded(true);
    setScenesLoaded(true);
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) window.localStorage.setItem(KEY, JSON.stringify(rooms)); }, [rooms, loaded]);
  useEffect(() => { if (loaded) window.localStorage.setItem(DEVICES_KEY, JSON.stringify(devices)); }, [devices, loaded]);
  useEffect(() => { if (scenesLoaded) window.localStorage.setItem(SCENES_KEY, JSON.stringify(scenes)); }, [scenes, scenesLoaded]);
  useEffect(() => {
    if (!demoLightsLoaded) return;
    try { window.localStorage.setItem(DEMO_LIGHTS_KEY, JSON.stringify(demoLights)); }
    catch (error) { console.error("Hemmet 3D – kunde inte spara demolampornas status:", error); }
  }, [demoLights, demoLightsLoaded]);
  const filteredDevices = devices.filter(device => {
    const matchesRoom = deviceRoomFilter === "all" || (deviceRoomFilter === "unassigned" ? !device.roomId || !rooms.some(room => room.id === device.roomId) : device.roomId === deviceRoomFilter);
    const query = deviceSearch.trim().toLocaleLowerCase("sv");
    return matchesRoom && (!query || [device.name, device.manufacturer, device.entityId, rooms.find(room => room.id === device.roomId)?.name ?? ""].some(value => (value ?? "").toLocaleLowerCase("sv").includes(query)));
  }).sort((a, b) => {
    const aRoom = rooms.find(room => room.id === a.roomId)?.name ?? "Övriga";
    const bRoom = rooms.find(room => room.id === b.roomId)?.name ?? "Övriga";
    return aRoom.localeCompare(bRoom, "sv") || a.name.localeCompare(b.name, "sv");
  });
  const normalizedEntityId = deviceEntityId.trim();
  const duplicateEntityId = Boolean(normalizedEntityId && devices.some(device => device.id !== selectedDeviceId && device.entityId?.trim().toLocaleLowerCase("sv") === normalizedEntityId.toLocaleLowerCase("sv")));
  const entityIdError = validateHomeAssistantEntityId(normalizedEntityId, deviceType);
  const invalidEntityId = Boolean(entityIdError);
  const selectedDevice = devices.find(device => device.id === selectedDeviceId) || null;
  const preparedMappings = devices.filter(device => getEntityMappingStatus(device) === "prepared").length;
  function selectDevice(id: string) {
    const device = devices.find(item => item.id === id);
    if (!device) return;
    setControlRoomId(null);
    setSelectedDeviceId(id);
    setDeviceName(device.name); setDeviceType(device.type); setDeviceRoom(device.roomId);
    setDeviceManufacturer(device.manufacturer ?? ""); setDeviceEntityId(device.entityId ?? "");
    setPlacingDevice(false); setPlacing(false);
    setControlDeviceId(id);
  }
  function placeDevice(x: number, z: number) {
    if (selectedDeviceId && devices.some(item => item.id === selectedDeviceId)) {
      setDevices(prev => prev.map(item => item.id === selectedDeviceId ? { ...item, x, z } : item));
    } else {
      const device: SmartDevice = { id: crypto.randomUUID(), name: `Enhet ${devices.length + 1}`, type: "light", roomId: "", manufacturer: "", entityId: "", x, z };
      setDevices(prev => [...prev, device]);
      setSelectedDeviceId(device.id); setControlDeviceId(device.id); setDeviceName(device.name); setDeviceType(device.type);
      setDeviceRoom(""); setDeviceManufacturer(""); setDeviceEntityId("");
    }
    setPlacingDevice(false);
    setActiveSceneId(null);
  }
  function saveDevice() {
    if (!selectedDevice || !deviceName.trim() || duplicateEntityId || invalidEntityId) return;
    setDevices(prev => prev.map(item => item.id === selectedDevice.id ? {
      ...item, name: deviceName.trim(), type: deviceType, roomId: deviceRoom,
      manufacturer: deviceManufacturer.trim(), entityId: deviceEntityId.trim()
    } : item));
  }
  function deleteDevice() {
    if (!selectedDevice) return;
    setDevices(prev => prev.filter(item => item.id !== selectedDevice.id));
    setSelectedDeviceId(null);
    setControlDeviceId(null);
    setActiveSceneId(null);
  }
  const selected = rooms.find(room => room.id === selectedId) || null;
  function selectRoom(id: string) {
    const room = rooms.find(item => item.id === id);
    if (!room) return;
    setControlDeviceId(null); setControlRoomId(id); setSelectedId(id); setDraftName(room.name); setDraftArea(room.area); setDraftNotes(room.notes); setPlacing(false); setPlacingDevice(false);
  }
  function placeRoom(x: number, z: number) {
    if (selectedId && rooms.some(room => room.id === selectedId)) {
      setRooms(previous => previous.map(room => room.id === selectedId ? { ...room, x, z } : room));
      setPlacing(false);
      return;
    }
    const id = crypto.randomUUID();
    const room = { id, name: `Rum ${rooms.length + 1}`, x, z, area: "", notes: "" };
    setRooms(prev => [...prev, room]); setControlRoomId(id); setSelectedId(id); setDraftName(room.name); setDraftArea(""); setDraftNotes(""); setPlacing(false);
  }
  function saveRoom() {
    if (!selected || !draftName.trim()) return;
    setRooms(prev => prev.map(room => room.id === selected.id ? { ...room, name: draftName.trim(), area: draftArea.trim(), notes: draftNotes.trim() } : room));
  }
  function deleteRoom() {
    if (!selected) return;
    setRooms(prev => prev.filter(room => room.id !== selected.id));
    setDevices(prev => prev.map(device => device.roomId === selected.id ? { ...device, roomId: "" } : device));
    setSelectedId(null); setControlRoomId(null);
  }
  const mappingIssues = inspectEntityMappings(devices);
  const mappedCount = devices.filter(device => getEntityMappingStatus(device) === "prepared").length;
  function exportMappings() {
    const payload = JSON.stringify(createEntityMappingExport(devices), null, 2);
    const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "hemmet3d-ha-kopplingar.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportBackup() {
    const backup = createHemmet3DBackup(rooms, devices, scenes);
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hemmet3d-sakerhetskopia-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setBackupError(null);
    setBackupMessage("Säkerhetskopian har skapats. Förvara filen på en säker plats.");
  }
  async function importBackup(file: File | undefined) {
    if (!file) return;
    setBackupMessage(null);
    setBackupError(null);
    try {
      if (file.size > 5_000_000) throw new Error("Filen är för stor (max 5 MB).");
      const backup = parseHemmet3DBackup(await file.text());
      const accepted = window.confirm(`Återställa ${backup.rooms.length} rum, ${backup.devices.length} enheter och ${backup.scenes.length} ljusscener? Detta ERSÄTTER alla nuvarande sparade uppgifter i Smarthem. Exportera gärna en säkerhetskopia först.`);
      if (!accepted) return;
      // Skriv alla tre lagringsnycklar direkt innan React uppdateras.
      // Samma nycklar som tidigare versioner används, utan migrering.
      window.localStorage.setItem(KEY, JSON.stringify(backup.rooms));
      window.localStorage.setItem(DEVICES_KEY, JSON.stringify(backup.devices));
      window.localStorage.setItem(SCENES_KEY, JSON.stringify(backup.scenes));
      setRooms(backup.rooms);
      setDevices(backup.devices);
      setScenes(backup.scenes);
      setSelectedId(null);
      setSelectedDeviceId(null);
      setControlDeviceId(null);
      setControlRoomId(null);
      setActiveSceneId(null);
      setDemoLights({});
      window.localStorage.removeItem(DEMO_LIGHTS_KEY);
      setBackupMessage("Säkerhetskopian har återställts. Rum, enheter och scener är inlästa. Demolampornas tillstånd återställs inte.");
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : "Det gick inte att läsa säkerhetskopian.");
    }
  }
  return <div className="space-y-3 rounded-3xl border border-white/10 bg-slate-950/70 p-3 sm:p-5">
    <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-100">
      <span className="font-semibold">● {DEMO_CONTROL_STATUS.label}</span>
      <span>Endast lokal teststyrning – inga fysiska enheter är anslutna. {preparedMappings} av {devices.length} enheter har förberett HA-ID.</span>
    </div>
    {controlError && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">
      <span>{controlError}</span>
      <button type="button" onClick={() => setControlError(null)} className="rounded border border-red-300/30 px-2 py-1 text-xs" aria-label="Stäng felmeddelande">Stäng</button>
    </div>}
    <div className="flex flex-wrap gap-2 sm:gap-2.5">
      <button type="button" onClick={() => { setControlDeviceId(null); setControlRoomId(null); setTopView(v => !v); }} className="min-h-11 rounded-xl bg-cyan-700 px-4 py-2 text-sm font-medium">{topView ? "Visa 3D" : "Visa ovanifrån (2D)"}</button>
      <button type="button" onClick={() => { setControlDeviceId(null); setControlRoomId(null); setCameraReset(value => value + 1); }} className="min-h-11 rounded-xl border border-white/20 bg-slate-700 px-4 py-2 text-sm font-medium" title="Återställ kamerans läge och zoom">Återställ vy</button>
      <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm"><input type="checkbox" checked={showDevices} onChange={e => setShowDevices(e.target.checked)} className="accent-cyan-400"/>Visa smarta enheter</label>
      {PARTS.map(part => <label key={part.key} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm"><input type="checkbox" checked={shown[part.key]} onChange={event => setShown(prev => ({...prev, [part.key]: event.target.checked}))} className="accent-cyan-400"/>{part.title}</label>)}
    </div>
    {placing && <p className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-3 text-sm text-cyan-100">Planvyn visar nu hela lägenheten när du placerar ett rum. Klicka där markören ska placeras. Klicka sedan på rummets namn nedan för att redigera det.</p>}
    {placingDevice && <p className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-100">Klicka i planvyn för att placera enheten. Det här registrerar bara en position, ingen fysisk anslutning.</p>}
    <div className="h-[min(58svh,540px)] min-h-[310px] overflow-hidden rounded-2xl border border-white/10 sm:h-[600px]">
      <Canvas key={`${topView ? "top" : "perspective"}-${cameraReset}`} orthographic={topView} camera={topView ? { position: [0, 22, 0.001], zoom: 1, near: 0.1, far: 100 } : { position: [12, 15, 17], fov: 48, near: 0.1, far: 100 }} gl={{ antialias: true }} onPointerMissed={() => { setControlDeviceId(null); setControlRoomId(null); }}>
        <Scene shown={shown} topView={topView} rooms={rooms} selectedId={selectedId} placing={placing} onPlace={placeRoom} onSelect={selectRoom} devices={devices} showDevices={showDevices} selectedDeviceId={selectedDeviceId} onSelectDevice={selectDevice} devicePlacing={placingDevice} onPlaceDevice={placeDevice} demoLights={demoLights} controlDeviceId={controlDeviceId} onLightChange={updateDemoLight} onCloseControl={() => setControlDeviceId(null)} roomNames={Object.fromEntries(rooms.map(room => [room.id, room.name]))} controlRoomId={controlRoomId} onAllRoomLights={(roomId, on) => updateRoomLights(roomId, { on })} onDimRoomLights={(roomId, brightness) => updateRoomLights(roomId, { brightness })} onCloseRoom={() => setControlRoomId(null)}/>
      </Canvas>
    </div>
    {/* Mobil: alternativ till små 3D-markörer. Samma demotillstånd och styrfunktioner. */}
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-3 sm:hidden" aria-label="Mobilstyrning av lampor">
      <h3 className="text-sm font-semibold text-white">Lampor i hemmet</h3>
      <p className="mt-1 text-xs text-slate-400">Styr lamporna här om markörerna är svåra att trycka på. Dra med ett finger för att flytta modellen och nyp för att zooma.</p>
      {lightDevices.length === 0 ? <p className="mt-3 text-sm text-slate-400">Inga lampor har lagts till ännu.</p> :
        <div className="mt-3 max-h-80 space-y-2 overflow-y-auto overscroll-contain">
          {lightDevices.map(device => {
            const state = demoLights[device.id] ?? { on: false, brightness: 65 };
            const roomName = rooms.find(room => room.id === device.roomId)?.name ?? "Utan rum";
            return <div key={device.id} className="rounded-xl border border-white/10 bg-slate-800/70 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="min-w-0"><p className="truncate text-sm font-medium">💡 {device.name}</p><p className="truncate text-xs text-slate-400">{roomName} · {state.on ? "Tänd" : "Släckt"}</p></div>
                <button type="button" aria-label={`${state.on ? "Släck" : "Tänd"} ${device.name}`} aria-pressed={state.on} onClick={() => updateDemoLight(device.id, { on: !state.on })} className={`min-h-11 min-w-20 rounded-lg px-3 py-2 text-sm font-semibold ${state.on ? "bg-amber-400 text-slate-950" : "bg-slate-700 text-white"}`}>{state.on ? "Släck" : "Tänd"}</button>
              </div>
              <label className="block text-xs text-slate-300"><span className="mb-1 flex justify-between"><span>Ljusstyrka</span><span>{state.brightness} %</span></span>
                <input type="range" min={1} max={100} value={state.brightness} disabled={!state.on} onChange={event => updateDemoLight(device.id, { brightness: Number(event.target.value) })} className="h-8 w-full accent-amber-400 disabled:opacity-40" />
              </label>
            </div>;
          })}
        </div>}
    </section>
    <section className="rounded-2xl border border-amber-400/20 bg-slate-900/60 p-3 sm:p-4" aria-label="Snabbkontroll för hela hemmet">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="font-semibold">💡 Snabbkontroll – hela hemmet</h3><p className="text-xs text-slate-400">{lightDevices.filter(device => demoLights[device.id]?.on).length} av {lightDevices.length} lampor tända · Demoläge</p></div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!lightDevices.length} onClick={() => updateAllLights(true)} className="min-h-11 rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40">Tänd alla</button>
          <button type="button" disabled={!lightDevices.length} onClick={() => updateAllLights(false)} className="min-h-11 rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">Släck alla</button>
        </div>
      </div>
      {scenes.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2"><span className="text-xs text-slate-400">Ljusscener:</span>{scenes.map(scene => <button key={scene.id} type="button" disabled={!lightDevices.some(device => scene.lights?.[device.id])} onClick={() => activateScene(scene)} className={`min-h-10 rounded-lg border px-3 py-2 text-xs disabled:opacity-40 ${activeSceneId === scene.id ? "border-amber-400 bg-amber-400/10" : "border-white/20 bg-slate-800"}`}>{scene.name}</button>)}</div>}
    </section>
    <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
      <button type="button" onClick={() => setAdminExpanded(value => !value)} aria-expanded={adminExpanded} aria-controls="hemmet3d-admin-panel" className="flex w-full items-center justify-between gap-3 text-left">
        <span className="text-base font-semibold">Administrera Smarthem</span>
        <ChevronDown aria-hidden="true" className={`h-5 w-5 shrink-0 text-slate-300 transition-transform duration-200 ${adminExpanded ? "rotate-180" : ""}`} />
      </button>
      {adminExpanded && <div id="hemmet3d-admin-panel" className="mt-4">
        <div className="grid items-start gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
        <button type="button" onClick={() => setRoomsExpanded(value => !value)} aria-expanded={roomsExpanded} aria-controls="hemmet3d-rooms-panel" className="flex w-full items-center justify-between gap-3 text-left">
          <span className="font-semibold">Rum och rumsinformation ({rooms.length})</span>
          <ChevronDown aria-hidden="true" className={`h-5 w-5 shrink-0 text-slate-300 transition-transform duration-200 ${roomsExpanded ? "rotate-180" : ""}`} />
        </button>
        {roomsExpanded && <div id="hemmet3d-rooms-panel" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => { setSelectedId(null); setControlRoomId(null); setPlacing(v => !v); setPlacingDevice(false); setControlDeviceId(null); setTopView(true); }} className={`rounded-xl px-4 py-2 text-sm font-medium ${placing ? "bg-amber-400 text-slate-950" : "bg-slate-700"}`}>{placing ? "Avbryt placering" : "+ Lägg till rum"}</button>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-200">Rum</h3>
            {rooms.length === 0 ? <p className="text-sm text-slate-400">Inga rum ännu. Välj ”Lägg till rum” och klicka i planvyn.</p> : <div className="flex flex-wrap gap-2">{rooms.map(room => <button key={room.id} type="button" onClick={() => selectRoom(room.id)} className={`rounded-lg border px-3 py-2 text-sm ${selectedId === room.id ? "border-red-400 bg-red-400/15" : "border-white/15 bg-slate-800"}`}>{room.name}</button>)}</div>}
          </div>
          <div className="border-t border-white/10 pt-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-200">Rumsinformation</h3>
            {selected ? <div className="space-y-3">
              <label className="block text-sm">Rumsnamn<input className="mt-1 w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2" value={draftName} onChange={e => setDraftName(e.target.value)} /></label>
              <label className="block text-sm">Golvyta (m²) – valfri uppgift<input className="mt-1 w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2" value={draftArea} onChange={e => setDraftArea(e.target.value)} placeholder="Ange uppmätt yta" /></label>
              <label className="block text-sm">Anteckningar<textarea rows={2} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2" value={draftNotes} onChange={e => setDraftNotes(e.target.value)} /></label>
              <div className="flex flex-wrap gap-2"><button type="button" onClick={saveRoom} disabled={!draftName.trim()} className="rounded-lg bg-cyan-700 px-4 py-2 text-sm disabled:opacity-50">Spara rum</button><button type="button" onClick={() => { setPlacing(true); setPlacingDevice(false); setControlRoomId(null); setTopView(true); }} className="rounded-lg bg-slate-700 px-4 py-2 text-sm">Flytta markör</button><button type="button" onClick={deleteRoom} className="rounded-lg border border-red-400/40 px-4 py-2 text-sm text-red-300">Ta bort</button></div>
            </div> : <p className="text-sm text-slate-400">Välj ett rum för att se eller ändra dess information.</p>}
          </div>
        </div>}
      </section>
      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
        <button type="button" onClick={() => setDevicesExpanded(value => !value)} aria-expanded={devicesExpanded} aria-controls="hemmet3d-devices-panel" className="flex w-full items-center justify-between gap-3 text-left">
          <span className="font-semibold">Smarta enheter och enhetsinformation ({devices.length})</span>
          <ChevronDown aria-hidden="true" className={`h-5 w-5 shrink-0 text-slate-300 transition-transform duration-200 ${devicesExpanded ? "rotate-180" : ""}`} />
        </button>
        {devicesExpanded && <div id="hemmet3d-devices-panel" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => { setPlacingDevice(v => !v); setSelectedDeviceId(null); setControlDeviceId(null); setControlRoomId(null); setPlacing(false); setTopView(true); setShowDevices(true); }} className={`rounded-xl px-4 py-2 text-sm font-medium ${placingDevice ? "bg-amber-400 text-slate-950" : "bg-slate-700"}`}>{placingDevice ? "Avbryt enhetsplacering" : "+ Lägg till smart enhet"}</button>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-200">Smarta enheter</h3>
            <div className="mb-3 grid gap-2 sm:grid-cols-2">
              <label className="block text-xs text-slate-300">Sök enhet
                <input type="search" value={deviceSearch} onChange={e => setDeviceSearch(e.target.value)} placeholder="Namn, tillverkare eller ID" className="mt-1 w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs text-slate-300">Filtrera på rum
                <select value={deviceRoomFilter} onChange={e => setDeviceRoomFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2 text-sm">
                  <option value="all">Alla rum</option><option value="unassigned">Utan rum</option>
                  {rooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}
                </select>
              </label>
            </div>
            <p className="mb-2 text-xs text-slate-400">Visar {filteredDevices.length} av {devices.length} enheter.</p>
            {devices.length === 0 ? <p className="text-sm text-slate-400">Inga enheter registrerade. Välj ”Lägg till smart enhet” och klicka i planvyn.</p> :
              filteredDevices.length === 0 ? <p className="text-sm text-slate-400">Inga enheter matchar sökningen.</p> :
              <div className="flex flex-col gap-2">{filteredDevices.map(device => {
                const room = rooms.find(item => item.id === device.roomId);
                return <button key={device.id} type="button" onClick={() => { selectDevice(device.id); setShowDevices(true); }} className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm ${selectedDeviceId === device.id ? "border-amber-300 bg-amber-300/15" : "border-white/15 bg-slate-800"}`}>
                  <span className="min-w-0 truncate">{DEVICE_TYPES.find(item => item.value === device.type)?.symbol} {device.name}</span>
                  <span className="flex shrink-0 flex-col items-end gap-0.5 text-xs">
                    <span className={room ? "text-slate-400" : "text-amber-300"}>{room?.name ?? "Utan rum"}</span>
                    <span className={getEntityMappingStatus(device) === "invalid" ? "text-red-300" : getEntityMappingStatus(device) === "prepared" ? "text-emerald-300" : "text-slate-500"}>{ENTITY_MAPPING_LABELS[getEntityMappingStatus(device)]}</span>
                  </span>
                </button>;
              })}</div>}
            <p className="mt-3 text-xs text-slate-400">Registrerade enheter är inte anslutna och visar ingen verklig status. Ett förberett HA-ID innebär inte att enheten är online.</p>
          </div>
          <div className="border-t border-white/10 pt-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-200">Enhetsinformation</h3>
            {selectedDevice ? <div className="space-y-3">
              <label className="block text-sm">Namn<input value={deviceName} onChange={e => setDeviceName(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2"/></label>
              <label className="block text-sm">Typ<select value={deviceType} onChange={e => setDeviceType(e.target.value as DeviceType)} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2">{DEVICE_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
              <label className="block text-sm">Rum<select value={deviceRoom} onChange={e => setDeviceRoom(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2"><option value="">Inget rum valt</option>{rooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label>
              <label className="block text-sm">Tillverkare (valfritt)<input value={deviceManufacturer} onChange={e => setDeviceManufacturer(e.target.value)} placeholder="Exempel: IKEA" className="mt-1 w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2"/></label>
              <label className="block text-sm">Framtida Home Assistant-ID (valfritt)<input value={deviceEntityId} onChange={e => setDeviceEntityId(e.target.value)} placeholder="Exempel: light.vardagsrum" className="mt-1 w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2"/></label>
              {duplicateEntityId && <p role="alert" className="text-xs text-red-300">Detta Home Assistant-ID används redan av en annan enhet.</p>}
              {invalidEntityId && <p role="alert" className="text-xs text-red-300">{entityIdError}</p>}
              {!duplicateEntityId && !invalidEntityId && normalizedEntityId && <p className="text-xs text-slate-400">HA-ID förberett. ID sparas bara lokalt; ingen Home Assistant-anslutning görs.</p>}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={saveDevice} disabled={!deviceName.trim() || duplicateEntityId || invalidEntityId} className="rounded-lg bg-cyan-700 px-4 py-2 text-sm disabled:opacity-50">Spara enhet</button>
                <button type="button" onClick={() => { setPlacingDevice(true); setPlacing(false); setControlDeviceId(null); setTopView(true); }} className="rounded-lg bg-slate-700 px-4 py-2 text-sm">Flytta markör</button>
                <button type="button" onClick={deleteDevice} className="rounded-lg border border-red-400/40 px-4 py-2 text-sm text-red-300">Ta bort</button>
              </div>
            </div> : <p className="text-sm text-slate-400">Välj en enhet för att redigera namn, typ, rum och framtida integrations-ID.</p>}
          </div>
        </div>}
      </section>
        </div>
        <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
    <details className="group rounded-xl border border-white/10 bg-slate-900/60 p-3 text-sm" aria-label="Ljusscener">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-slate-100 [&::-webkit-details-marker]:hidden">
        <span>Ljusscener ({scenes.length} sparade)</span>
        <ChevronDown aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-300 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <p className="mt-2 mb-3 text-xs text-slate-400">Spara lampornas nuvarande läge och återställ det med ett klick. Endast demo.</p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-[170px] flex-1 text-xs text-slate-300">Namn på ny scen
          <input value={sceneName} maxLength={60} onChange={event => setSceneName(event.target.value)} onKeyDown={event => { if (event.key === "Enter") saveScene(); }} placeholder="T.ex. Myskväll" className="mt-1 w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2 text-sm text-white" />
        </label>
        <button type="button" onClick={saveScene} disabled={!sceneName.trim() || !lightDevices.length} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">Spara nuvarande ljus</button>
      </div>
      {!lightDevices.length && <p className="mt-2 text-xs text-slate-400">Lägg till en lampa för att kunna skapa ljusscener.</p>}
      {scenes.length > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {scenes.map(scene => {
          const available = lightDevices.filter(device => scene.lights[device.id]);
          const lit = available.filter(device => scene.lights[device.id].on).length;
          return <div key={scene.id} className={`flex items-center gap-2 rounded-xl border p-2 ${activeSceneId === scene.id ? "border-amber-400/70 bg-amber-400/10" : "border-white/10 bg-slate-800/70"}`}>
            <button type="button" onClick={() => activateScene(scene)} disabled={!available.length} className="min-w-0 flex-1 rounded-lg px-2 py-1 text-left disabled:opacity-40" title={`Aktivera ${scene.name}`}>
              <span className="block truncate text-sm font-medium">💡 {scene.name}</span>
              <span className="block text-xs text-slate-400">{lit} av {available.length} lampor tända{available.length < Object.keys(scene.lights).length ? " · vissa lampor saknas" : ""}</span>
            </button>
            <button type="button" onClick={() => deleteScene(scene.id)} aria-label={`Ta bort scenen ${scene.name}`} title="Ta bort scen" className="rounded-lg border border-white/15 px-2 py-1 text-slate-300 hover:border-red-400 hover:text-red-300">×</button>
          </div>;
        })}
      </div>}
      <p className="mt-3 text-[11px] text-slate-400">Scenerna sparas i denna webbläsare. Nya lampor påverkas inte av äldre scener och ingen fysisk enhet styrs.</p>
    </details>

    <details className="group rounded-xl border border-white/10 bg-slate-900/60 p-3 text-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-slate-100 [&::-webkit-details-marker]:hidden">
        <span>Home Assistant – integrationskontroll ({mappedCount}/{devices.length} förberedda)</span>
        <ChevronDown aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-300 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <p className="mt-2 text-xs text-slate-400">Detta kontrollerar bara sparade ID:n. Ingen anslutning eller verifiering mot Home Assistant görs.</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="text-xs text-slate-300">{mappingIssues.length === 0 ? "Inga lokala kopplingsproblem hittades." : `${mappingIssues.length} uppgifter behöver ses över.`}</span>
        <button type="button" onClick={exportMappings} className="rounded-lg border border-cyan-400/30 bg-cyan-900/40 px-3 py-2 text-xs font-semibold text-cyan-100">Exportera HA-kopplingar (JSON)</button>
      </div>
      {mappingIssues.length > 0 && <ul className="mt-3 max-h-44 space-y-1 overflow-y-auto text-xs text-amber-200">
        {mappingIssues.map((issue, index) => <li key={`${issue.deviceId}-${index}`}>• {issue.deviceName}: {issue.message}</li>)}
      </ul>}
    </details>
    <details className="group rounded-xl border border-white/10 bg-slate-900/60 p-3 text-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-slate-100 [&::-webkit-details-marker]:hidden">
        <span>Säkerhetskopiera och återställ Smarthem</span>
        <ChevronDown aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-300 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <p className="mt-2 text-xs text-slate-400">Spara rum, enheter, placeringar, HA-ID:n och ljusscener i en JSON-fil. Fungerar även vid byte av webbläsare eller dator. Demolampornas aktuella läge ingår inte.</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={exportBackup} disabled={!loaded || !scenesLoaded} className="rounded-lg border border-cyan-400/30 bg-cyan-900/40 px-3 py-2 text-xs font-semibold text-cyan-100 disabled:opacity-40">Ladda ner säkerhetskopia</button>
        <label className="cursor-pointer rounded-lg border border-white/20 bg-slate-800 px-3 py-2 text-xs font-semibold text-white">Återställ från fil (ersätter nuvarande)
          <input type="file" accept=".json,application/json" className="sr-only" disabled={!loaded || !scenesLoaded} onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; void importBackup(file); }} />
        </label>
      </div>
      {backupError && <p role="alert" className="mt-2 text-xs text-red-300">{backupError}</p>}
      {backupMessage && <p role="status" className="mt-2 text-xs text-emerald-300">{backupMessage}</p>}
    </details>
        </div>
      </div>}
    </section>
    <p className="text-xs text-slate-400">Rummen sparas lokalt i den här webbläsaren. Markörerna anger rumspunkter, inte automatiskt beräknade rumsgränser. Golvytor fylls i manuellt tills rumsgränser har definierats. Byggnadsdelarna kommer från den uppdaterade CAD-modellen, inklusive golv.</p>
  </div>;
}
