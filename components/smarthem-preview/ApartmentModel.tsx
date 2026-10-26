"use client";

import { Suspense, useEffect, useMemo } from "react";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Lightbulb, Plug, Thermometer, Droplets, PersonStanding, LockKeyhole, UnlockKeyhole, Tv, Speaker, DoorOpen, DoorClosed, Camera, ShieldAlert, Zap, Radio, CircleHelp, SlidersHorizontal } from "lucide-react";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { CanvasTexture, DoubleSide, OrthographicCamera, SRGBColorSpace } from "three";

export type Room = { id: string; name: string; x: number; z: number; area?: string; notes?: string };
export type Device = { id: string; name: string; type: string; roomId: string; x: number; z: number; manufacturer?: string; entityId?: string };
export type LightState = { on: boolean; brightness: number };

const parts = [
  { file: "/hemmet3d/vaggar.stl", color: "#d9e2e9", opacity: 1 },
  { file: "/hemmet3d/dorrar.stl", color: "#c67b62", opacity: 1 },
  { file: "/hemmet3d/fonster.stl", color: "#73c9ef", opacity: .55 },
  { file: "/hemmet3d/balkong.stl", color: "#e8c55a", opacity: .85 },
  { file: "/hemmet3d/golv.stl", color: "#a69b8a", opacity: 1 },
];
function Part({ file, color, opacity }: (typeof parts)[number]) {
  const geometry = useLoader(STLLoader, file);
  return <mesh geometry={geometry}><meshStandardMaterial color={color} transparent={opacity < 1} opacity={opacity} side={DoubleSide} roughness={.7} depthWrite={opacity === 1} /></mesh>;
}
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
    camera.position.set(0, 22, .001);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
}
type ModelMediaState = { playing: boolean };
type ModelClimateState = { temperature: number; humidity: number };
type ModelElectricState = { watts: number };

function DeviceMarker({ device, lights, securityStates, mediaStates, climateStates, electricStates, selected, disabled, onSelect }: {
  device: Device; lights: Record<string, LightState>;
  securityStates?: Record<string, { active: boolean }>;
  mediaStates?: Record<string, ModelMediaState>;
  climateStates?: Record<string, ModelClimateState>;
  electricStates?: Record<string, ModelElectricState>;
  selected: boolean; disabled: boolean; onSelect: (id: string) => void;
}) {
  const kind = device.type.toLowerCase();
  const isLight = ["light", "dimmer", "switch"].includes(kind);
  const isOn = lights[device.id]?.on ?? false;
  const brightness = Math.max(0, Math.min(100, lights[device.id]?.brightness ?? 100));
  const active = securityStates?.[device.id]?.active ?? false;
  const playing = mediaStates?.[device.id]?.playing ?? false;
  const watts = electricStates?.[device.id]?.watts;
  const climate = climateStates?.[device.id];
  const icon = isLight ? "bulb"
    : ["plug", "outlet", "socket"].includes(kind) ? "plug"
    : kind === "lock" ? "lock"
    : ["door", "contact", "door_sensor"].includes(kind) ? "door"
    : ["media", "speaker", "tv", "media_player"].includes(kind) ? "media"
    : ["temperature", "thermostat", "climate"].includes(kind) ? "temp"
    : kind === "humidity" ? "humidity"
    : ["motion", "binary_sensor"].includes(kind) ? "motion"
    : kind === "camera" ? "camera"
    : kind === "alarm" ? "alarm"
    : ["energy", "power", "electricity", "meter"].includes(kind) ? "energy"
    : "sensor";
  const color = isLight ? (isOn ? "#facc15" : "#94a3b8")
    : icon === "lock" || icon === "door" ? (active ? "#fb923c" : "#4ade80")
    : icon === "media" ? (playing ? "#c084fc" : "#94a3b8")
    : icon === "temp" || icon === "humidity" ? "#22d3ee"
    : icon === "energy" ? "#60a5fa"
    : active ? "#fb923c" : "#94a3b8";
  const caption = icon === "temp" && climate ? `${climate.temperature.toFixed(1)}°`
    : icon === "humidity" && climate ? `${Math.round(climate.humidity)}%`
    : icon === "energy" && typeof watts === "number" ? `${Math.round(watts)}W`
    : "";
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 160; canvas.height = 176;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const cx = 80, cy = 75;
    if (isLight && isOn) {
      const glow = ctx.createRadialGradient(cx, cy, 12, cx, cy, 70);
      glow.addColorStop(0, `rgba(250,204,21,${Math.max(.15, brightness / 140)})`);
      glow.addColorStop(1, "rgba(250,204,21,0)");
      ctx.fillStyle = glow; ctx.fillRect(0, 0, 160, 160);
    }
    ctx.beginPath(); ctx.arc(cx, cy, 43, 0, Math.PI * 2);
    ctx.fillStyle = selected ? "#475569" : "#0f172a"; ctx.fill();
    ctx.lineWidth = selected ? 6 : 3;
    ctx.strokeStyle = selected ? "#fde68a" : "#64748b"; ctx.stroke();
    ctx.save(); ctx.translate(cx, cy);
    ctx.strokeStyle = color; ctx.fillStyle = color;
    ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.lineJoin = "round";
    const line = (...points: number[]) => {
      ctx.beginPath(); ctx.moveTo(points[0], points[1]);
      for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i+1]);
      ctx.stroke();
    };
    const rect = (x:number,y:number,w:number,h:number) => { ctx.beginPath(); ctx.roundRect(x,y,w,h,4); ctx.stroke(); };
    if (icon === "bulb") {
      ctx.beginPath(); ctx.arc(0,-9,18,Math.PI,0); ctx.lineTo(14,7);
      ctx.lineTo(9,15); ctx.lineTo(-9,15); ctx.lineTo(-14,7); ctx.closePath(); ctx.stroke();
      line(-8,23,8,23); line(-5,30,5,30);
    } else if (icon === "media") {
      rect(-25,-19,50,34); line(-12,25,12,25); line(0,15,0,25);
      if (playing) { ctx.beginPath(); ctx.moveTo(-5,-11); ctx.lineTo(9,-2); ctx.lineTo(-5,7); ctx.closePath(); ctx.fill(); }
    } else if (icon === "plug") {
      line(-11,-25,-11,-8); line(11,-25,11,-8); rect(-19,-8,38,26); line(0,18,0,29);
    } else if (icon === "lock") {
      rect(-19,-3,38,31); ctx.beginPath();
      ctx.arc(0,-3,13,Math.PI,0); ctx.stroke();
      if (active) line(13,-3,13,-12);
    } else if (icon === "door") {
      rect(-20,-27,40,54); ctx.beginPath(); ctx.arc(10,3,3,0,Math.PI*2); ctx.fill();
    } else if (icon === "temp") {
      rect(-7,-26,14,39); ctx.beginPath(); ctx.arc(0,20,12,0,Math.PI*2); ctx.stroke();
      line(0,-13,0,20);
    } else if (icon === "humidity") {
      ctx.beginPath(); ctx.moveTo(0,-27); ctx.bezierCurveTo(-28,6,-22,25,0,27);
      ctx.bezierCurveTo(22,25,28,6,0,-27); ctx.stroke();
    } else if (icon === "energy") {
      line(7,-29,-13,1,2,1,-7,29,16,-5,1,-5,7,-29);
    } else if (icon === "camera") {
      rect(-25,-15,34,30); line(9,-8,25,-18,25,18,9,8);
    } else if (icon === "motion") {
      ctx.beginPath(); ctx.arc(0,-21,6,0,Math.PI*2); ctx.fill();
      line(0,-13,0,6,-15,21); line(0,6,15,23); line(-17,-5,0,-13,18,-3);
    } else if (icon === "alarm") {
      ctx.beginPath(); ctx.moveTo(0,-27); ctx.lineTo(26,22); ctx.lineTo(-26,22); ctx.closePath(); ctx.stroke();
      line(0,-10,0,7); ctx.beginPath(); ctx.arc(0,14,2,0,Math.PI*2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(0,0,18,0,Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0,0,5,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
    if (caption) {
      ctx.font = "bold 20px sans-serif"; ctx.textAlign = "center";
      ctx.fillStyle = "#fff"; ctx.fillText(caption,80,154);
    }
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    return result;
  }, [icon, color, caption, selected, isLight, isOn, brightness, playing, active]);
  useEffect(() => () => { texture?.dispose(); }, [texture]);
  if (!texture) return null;
  return <sprite position={[0,.44,0]} scale={[.85,.94,1]}
    onClick={event => { event.stopPropagation(); if (!disabled) onSelect(device.id); }}>
    <spriteMaterial map={texture} transparent depthTest={false} depthWrite={false} />
  </sprite>;
}

function RoomMarker({ room, selected, disabled, onSelect }: {
  room: Room; selected: boolean; disabled: boolean; onSelect?: (id: string) => void;
}) {
  // A map pin is drawn directly on a Three.js sprite, avoiding nested React roots.
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 176;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (selected) {
      const glow = ctx.createRadialGradient(80, 76, 10, 80, 76, 67);
      glow.addColorStop(0, "rgba(251,191,36,.55)");
      glow.addColorStop(1, "rgba(251,191,36,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 160, 160);
    }
    // Filled location pin with a circular cutout.
    ctx.beginPath();
    ctx.moveTo(80, 132);
    ctx.bezierCurveTo(68, 113, 43, 89, 43, 67);
    ctx.bezierCurveTo(43, 15, 117, 15, 117, 67);
    ctx.bezierCurveTo(117, 89, 92, 113, 80, 132);
    ctx.closePath();
    ctx.fillStyle = selected ? "#fbbf24" : "#ef4444";
    ctx.fill();
    ctx.strokeStyle = selected ? "#fff7ed" : "#fecaca";
    ctx.lineWidth = selected ? 6 : 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(80, 65, 14, 0, Math.PI * 2);
    ctx.fillStyle = "#101b2d";
    ctx.fill();
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    return result;
  }, [selected]);
  useEffect(() => () => { texture?.dispose(); }, [texture]);
  if (!texture) return null;
  return <sprite position={[0, .49, 0]} scale={[.76, .84, 1]}
    onClick={event => { event.stopPropagation(); if (!disabled) onSelect?.(room.id); }}>
    <spriteMaterial map={texture} transparent depthTest={false} depthWrite={false} />
  </sprite>;
}

export default function ApartmentModel({ view, rooms, devices, lights, securityStates, mediaStates, climateStates, electricStates, selectedId, onSelect, reset, onClearSelection, selectedRoomId, onSelectRoom, placingRoom, onPlaceRoom, placingDevice, onPlaceDevice }: {
  view: "2d" | "3d"; rooms: Room[]; devices: Device[];
  lights: Record<string, LightState>; securityStates?: Record<string, { active: boolean }>; mediaStates?: Record<string, ModelMediaState>; climateStates?: Record<string, ModelClimateState>; electricStates?: Record<string, ModelElectricState>; selectedId: string | null;
  onSelect: (id: string) => void; reset: number; onClearSelection?: () => void;
  selectedRoomId?: string | null; onSelectRoom?: (id: string) => void; placingRoom?: boolean; onPlaceRoom?: (x: number, z: number) => void; placingDevice?: boolean; onPlaceDevice?: (x: number, z: number) => void;
}) {
  const top = view === "2d";
  return <div className="h-[min(65svh,650px)] min-h-[320px] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#101b2d]">
    <Canvas key={`${view}-${reset}`} orthographic={top} camera={top ? { position: [0,22,.001], zoom: 1, near: .1, far: 100 } : { position: [12,15,17], fov: 48, near: .1, far: 100 }} gl={{ antialias: true }} onPointerMissed={() => { if (!placingRoom && !placingDevice) onClearSelection?.(); }}>
      {top && <FitTopCamera />}
      <color attach="background" args={["#101b2d"]} />
      <ambientLight intensity={1.35} />
      <directionalLight position={[6,14,7]} intensity={2.2} />
      <gridHelper args={[20,20,"#334155","#1e293b"]} position={[0,-.025,0]} />
      <Suspense fallback={null}>{parts.map(part => <Part key={part.file} {...part} />)}</Suspense>
      {placingRoom && top && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0,.16,0]} onClick={event => { event.stopPropagation(); onPlaceRoom?.(event.point.x, event.point.z); }}>
        <planeGeometry args={[200,200]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={DoubleSide} />
      </mesh>}
      {placingDevice && top && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0,.24,0]} onClick={event => { event.stopPropagation(); onPlaceDevice?.(event.point.x, event.point.z); }}>
        <planeGeometry args={[200,200]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={DoubleSide} />
      </mesh>}
      {rooms.map(room => <group key={room.id} position={[room.x,.19,room.z]}>
        <RoomMarker room={room} selected={selectedRoomId === room.id}
          disabled={!!(placingRoom || placingDevice)} onSelect={onSelectRoom} />
      </group>)}
      {devices.map(device => {
        const selected = device.id === selectedId;
        return <group key={device.id} position={[device.x,.09,device.z]}>
          {selected && <mesh position={[0,.035,0]} raycast={() => null}><cylinderGeometry args={[.31,.31,.012,32]} /><meshBasicMaterial color="#fde68a" depthTest={false} /></mesh>}
          <DeviceMarker device={device} lights={lights} securityStates={securityStates} mediaStates={mediaStates} climateStates={climateStates} electricStates={electricStates} selected={selected} disabled={!!(placingDevice || placingRoom)} onSelect={onSelect} />
        </group>;
      })}
      <OrbitControls makeDefault target={[0,.8,0]} enableDamping minDistance={3} maxDistance={35} maxPolarAngle={top ? .001 : Math.PI / 2.05} enableRotate={!top} />
    </Canvas>
  </div>;
}
