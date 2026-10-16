import type { LightScene, SmartDevice } from "./device-control";

export type SavedRoom = { id: string; name: string; x: number; z: number; area: string; notes: string };
export type Hemmet3DBackup = {
  format: "family-dashboard-hemmet3d-backup";
  version: 1;
  exportedAt: string;
  rooms: SavedRoom[];
  devices: SmartDevice[];
  scenes: LightScene[];
};

export function createHemmet3DBackup(rooms: SavedRoom[], devices: SmartDevice[], scenes: LightScene[]): Hemmet3DBackup {
  return { format: "family-dashboard-hemmet3d-backup", version: 1, exportedAt: new Date().toISOString(), rooms, devices, scenes };
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function uniqueIds(items: { id: string }[]): boolean {
  return new Set(items.map(item => item.id)).size === items.length;
}

export function parseHemmet3DBackup(text: string): Hemmet3DBackup {
  const raw: unknown = JSON.parse(text);
  if (!record(raw) || raw.format !== "family-dashboard-hemmet3d-backup" || raw.version !== 1 ||
      typeof raw.exportedAt !== "string" || !Array.isArray(raw.rooms) || !Array.isArray(raw.devices) || !Array.isArray(raw.scenes)) {
    throw new Error("Filen är inte en säkerhetskopia av Hemmet 3D (version 1).");
  }
  if (raw.rooms.length > 500 || raw.devices.length > 2000 || raw.scenes.length > 500) {
    throw new Error("Säkerhetskopian innehåller orimligt många poster.");
  }
  const rooms: SavedRoom[] = [];
  for (const item of raw.rooms) {
    if (!record(item) || typeof item.id !== "string" || !item.id || typeof item.name !== "string" ||
      typeof item.x !== "number" || !Number.isFinite(item.x) || typeof item.z !== "number" || !Number.isFinite(item.z) ||
      typeof item.area !== "string" || typeof item.notes !== "string") throw new Error("Säkerhetskopian innehåller ett ogiltigt rum.");
    rooms.push(item as SavedRoom);
  }
  const devices: SmartDevice[] = [];
  for (const item of raw.devices) {
    if (!record(item) || typeof item.id !== "string" || !item.id || typeof item.name !== "string" ||
      !["light", "sensor", "speaker", "other"].includes(String(item.type)) ||
      typeof item.roomId !== "string" || typeof item.manufacturer !== "string" || typeof item.entityId !== "string" ||
      typeof item.x !== "number" || !Number.isFinite(item.x) || typeof item.z !== "number" || !Number.isFinite(item.z)) {
      throw new Error("Säkerhetskopian innehåller en ogiltig enhet.");
    }
    devices.push(item as SmartDevice);
  }
  const scenes: LightScene[] = [];
  for (const item of raw.scenes) {
    if (!record(item) || typeof item.id !== "string" || !item.id || typeof item.name !== "string" || !record(item.lights)) {
      throw new Error("Säkerhetskopian innehåller en ogiltig ljusscen.");
    }
    for (const state of Object.values(item.lights)) {
      if (!record(state) || typeof state.on !== "boolean" || typeof state.brightness !== "number" ||
        !Number.isFinite(state.brightness) || state.brightness < 1 || state.brightness > 100) {
        throw new Error("Säkerhetskopian innehåller ett ogiltigt lamptillstånd.");
      }
    }
    scenes.push(item as LightScene);
  }
  if (!uniqueIds(rooms) || !uniqueIds(devices) || !uniqueIds(scenes)) throw new Error("Säkerhetskopian innehåller dubbla ID:n.");
  return { format: "family-dashboard-hemmet3d-backup", version: 1, exportedAt: raw.exportedAt, rooms, devices, scenes };
}
