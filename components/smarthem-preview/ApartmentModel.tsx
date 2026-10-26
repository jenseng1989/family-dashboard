"use client";

import { Suspense, useEffect } from "react";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { DoubleSide, OrthographicCamera } from "three";

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
export default function ApartmentModel({ view, rooms, devices, lights, securityStates, selectedId, onSelect, reset, onClearSelection, selectedRoomId, onSelectRoom, placingRoom, onPlaceRoom, placingDevice, onPlaceDevice }: {
  view: "2d" | "3d"; rooms: Room[]; devices: Device[];
  lights: Record<string, LightState>; securityStates?: Record<string, { active: boolean }>; selectedId: string | null;
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
        {selectedRoomId === room.id && <mesh raycast={() => null} position={[0,.03,0]}><cylinderGeometry args={[.32,.32,.02,32]}/><meshBasicMaterial color="#fca5a5" depthTest={false}/></mesh>}
        <mesh onClick={event => { if (!placingRoom && !placingDevice) { event.stopPropagation(); onSelectRoom?.(room.id); } }}><cylinderGeometry args={[.20,.20,.04,24]} /><meshStandardMaterial color="#ef4444" depthTest={false} /></mesh>
        <mesh onClick={event => { if (!placingRoom && !placingDevice) { event.stopPropagation(); onSelectRoom?.(room.id); } }}><cylinderGeometry args={[.34,.34,.06,24]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
      </group>)}
      {devices.map(device => {
        const light = ["light", "dimmer", "switch"].includes(device.type.toLowerCase());
        const on = lights[device.id]?.on ?? false;
        const isLock = device.type.toLowerCase() === "lock";
        const type = device.type.toLowerCase();
        const securityActive = securityStates?.[device.id]?.active ?? false;
        const markerColor = light ? (on ? "#fbbf24" : "#94a3b8")
          : isLock ? (securityActive ? "#22c55e" : "#ef4444")
          : ["media", "speaker", "tv", "media_player"].includes(type) ? "#a855f7"
          : ["climate", "thermostat", "temperature", "humidity"].includes(type) ? "#06b6d4"
          : ["camera", "sensor", "motion", "alarm", "binary_sensor"].includes(type) ? "#f97316"
          : ["energy", "power", "electricity", "meter"].includes(type) ? "#3b82f6"
          : "#64748b";
        const selected = device.id === selectedId;
        return <group key={device.id} position={[device.x,.09,device.z]}>
          {selected && <mesh position={[0,.035,0]} raycast={() => null}><cylinderGeometry args={[.31,.31,.012,32]} /><meshBasicMaterial color="#fde68a" depthTest={false} /></mesh>}
          <mesh onClick={event => { if (!placingDevice && !placingRoom) { event.stopPropagation(); onSelect(device.id); } }}>
            <cylinderGeometry args={[.26,.26,.04,24]} />
            <meshStandardMaterial color={markerColor} depthTest={false} />
          </mesh>
          <mesh onClick={event => { if (!placingDevice && !placingRoom) { event.stopPropagation(); onSelect(device.id); } }}>
            <cylinderGeometry args={[.38,.38,.07,24]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>;
      })}
      <OrbitControls makeDefault target={[0,.8,0]} enableDamping minDistance={3} maxDistance={35} maxPolarAngle={top ? .001 : Math.PI / 2.05} enableRotate={!top} />
    </Canvas>
  </div>;
}
